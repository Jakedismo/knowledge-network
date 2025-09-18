#!/bin/bash

# Knowledge Network Production Deployment Script
# This script handles the complete deployment process to production

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="knowledge-network-${ENVIRONMENT}"
NAMESPACE="knowledge-network"
DEPLOYMENT_TIMEOUT="600s"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required tools
    for tool in aws kubectl helm terraform; do
        if ! command -v $tool &> /dev/null; then
            log_error "$tool is not installed"
            exit 1
        fi
    done

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."

    cd infrastructure/terraform/environments/${ENVIRONMENT}

    # Initialize Terraform
    terraform init -backend=true

    # Plan deployment
    terraform plan -out=tfplan

    # Apply changes
    terraform apply tfplan

    # Save outputs
    terraform output -json > outputs.json

    cd -
    log_info "Infrastructure deployment complete"
}

configure_kubernetes() {
    log_info "Configuring Kubernetes access..."

    # Update kubeconfig
    aws eks update-kubeconfig \
        --region ${AWS_REGION} \
        --name ${CLUSTER_NAME}

    # Verify connection
    kubectl cluster-info

    log_info "Kubernetes configured successfully"
}

create_namespace() {
    log_info "Creating namespace and RBAC..."

    kubectl apply -f infrastructure/kubernetes/base/namespace.yaml
    kubectl apply -f infrastructure/kubernetes/base/rbac.yaml

    log_info "Namespace created"
}

deploy_secrets() {
    log_info "Deploying secrets..."

    # Get database credentials from AWS Secrets Manager
    DB_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id knowledge-network-${ENVIRONMENT}-db-master-password \
        --query SecretString \
        --output text)

    # Create Kubernetes secret
    kubectl create secret generic database-secret \
        --from-literal=connection-string="$(echo $DB_SECRET | jq -r '.connection_string')" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    # Create app secrets
    kubectl create secret generic app-secrets \
        --from-literal=jwt-secret="$(openssl rand -hex 32)" \
        --from-literal=encryption-key="$(openssl rand -hex 32)" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    log_info "Secrets deployed"
}

deploy_configmaps() {
    log_info "Deploying ConfigMaps..."

    # Get infrastructure outputs
    OUTPUTS=$(cat infrastructure/terraform/environments/${ENVIRONMENT}/outputs.json)

    # Create ConfigMap
    kubectl create configmap app-config \
        --from-literal=environment=${ENVIRONMENT} \
        --from-literal=graphql.endpoint="https://api.knowledge-network.app/graphql" \
        --from-literal=websocket.endpoint="wss://ws.knowledge-network.app" \
        --from-literal=elasticsearch.url="$(echo $OUTPUTS | jq -r '.elasticsearch_endpoint.value')" \
        --from-literal=redis.url="$(echo $OUTPUTS | jq -r '.redis_endpoint.value')" \
        --from-literal=s3.bucket="$(echo $OUTPUTS | jq -r '.s3_bucket.value')" \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -

    log_info "ConfigMaps deployed"
}

deploy_application() {
    log_info "Deploying application..."

    # Apply Kubernetes manifests
    kubectl apply -f infrastructure/kubernetes/base/deployment.yaml
    kubectl apply -f infrastructure/kubernetes/base/service.yaml
    kubectl apply -f infrastructure/kubernetes/base/ingress.yaml
    kubectl apply -f infrastructure/kubernetes/base/hpa.yaml

    # Apply production overlays
    kubectl apply -k infrastructure/kubernetes/overlays/${ENVIRONMENT}

    log_info "Application deployment initiated"
}

deploy_monitoring() {
    log_info "Deploying monitoring stack..."

    # Deploy Prometheus
    kubectl apply -f infrastructure/monitoring/prometheus-config.yaml
    kubectl apply -f infrastructure/monitoring/prometheus-deployment.yaml

    # Deploy Grafana
    kubectl apply -f infrastructure/monitoring/grafana-config.yaml
    kubectl apply -f infrastructure/monitoring/grafana-deployment.yaml

    # Deploy Loki for log aggregation
    kubectl apply -f infrastructure/monitoring/loki-config.yaml

    log_info "Monitoring stack deployed"
}

wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."

    # Wait for deployments
    kubectl rollout status deployment/knowledge-network-frontend \
        -n ${NAMESPACE} \
        --timeout=${DEPLOYMENT_TIMEOUT}

    kubectl rollout status deployment/knowledge-network-api \
        -n ${NAMESPACE} \
        --timeout=${DEPLOYMENT_TIMEOUT}

    kubectl rollout status deployment/knowledge-network-websocket \
        -n ${NAMESPACE} \
        --timeout=${DEPLOYMENT_TIMEOUT}

    log_info "All deployments are ready"
}

run_health_checks() {
    log_info "Running health checks..."

    # Get ingress URL
    INGRESS_URL=$(kubectl get ingress knowledge-network-ingress \
        -n ${NAMESPACE} \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

    # Check frontend health
    if curl -f "https://${INGRESS_URL}/api/health" > /dev/null 2>&1; then
        log_info "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        exit 1
    fi

    # Check API health
    if curl -f "https://api.${INGRESS_URL}/health" > /dev/null 2>&1; then
        log_info "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi

    log_info "All health checks passed"
}

run_smoke_tests() {
    log_info "Running smoke tests..."

    # Run basic smoke tests
    kubectl run smoke-test \
        --image=node:20-alpine \
        --rm -i --restart=Never \
        --namespace=${NAMESPACE} \
        -- node -e "
            const https = require('https');
            const test = (url) => new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    if (res.statusCode === 200) resolve();
                    else reject(new Error('Status: ' + res.statusCode));
                }).on('error', reject);
            });

            Promise.all([
                test('https://knowledge-network-frontend/api/health'),
                test('https://knowledge-network-api:4000/health')
            ]).then(() => {
                console.log('Smoke tests passed');
                process.exit(0);
            }).catch(err => {
                console.error('Smoke tests failed:', err);
                process.exit(1);
            });
        "

    log_info "Smoke tests completed"
}

setup_backups() {
    log_info "Setting up backup jobs..."

    # Create backup CronJob for database
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
  namespace: ${NAMESPACE}
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dump \$DATABASE_URL | gzip > /backup/db-\$(date +%Y%m%d-%H%M%S).sql.gz
              aws s3 cp /backup/*.gz s3://knowledge-network-backups/${ENVIRONMENT}/database/
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-secret
                  key: connection-string
          restartPolicy: OnFailure
EOF

    log_info "Backup jobs configured"
}

print_summary() {
    echo ""
    echo "======================================="
    echo "   DEPLOYMENT SUMMARY"
    echo "======================================="
    echo ""
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Cluster: ${CLUSTER_NAME}"
    log_info "Namespace: ${NAMESPACE}"
    echo ""

    # Get deployment info
    kubectl get deployments -n ${NAMESPACE}
    echo ""
    kubectl get pods -n ${NAMESPACE}
    echo ""
    kubectl get ingress -n ${NAMESPACE}
    echo ""

    log_info "Deployment completed successfully!"
    echo ""
    echo "Access the application at:"
    echo "  - Frontend: https://knowledge-network.app"
    echo "  - API: https://api.knowledge-network.app"
    echo "  - WebSocket: wss://ws.knowledge-network.app"
    echo ""
}

# Main deployment flow
main() {
    log_info "Starting deployment to ${ENVIRONMENT}..."

    check_prerequisites
    deploy_infrastructure
    configure_kubernetes
    create_namespace
    deploy_secrets
    deploy_configmaps
    deploy_application
    deploy_monitoring
    wait_for_deployment
    run_health_checks
    run_smoke_tests
    setup_backups
    print_summary

    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"