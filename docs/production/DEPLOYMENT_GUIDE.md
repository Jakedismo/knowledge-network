# Production Deployment Guide
# Knowledge Network React Application

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Architecture](#infrastructure-architecture)
3. [Deployment Process](#deployment-process)
4. [Monitoring & Observability](#monitoring--observability)
5. [Scaling & Performance](#scaling--performance)
6. [Backup & Disaster Recovery](#backup--disaster-recovery)
7. [Security Configuration](#security-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance Procedures](#maintenance-procedures)

## Overview

This guide provides comprehensive documentation for deploying and maintaining the Knowledge Network application in production environments.

### Key Components

- **Frontend**: Next.js 15+ React application
- **API**: GraphQL API with TypeScript
- **WebSocket**: Real-time collaboration server
- **Database**: Aurora PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis cluster
- **Search**: Amazon Elasticsearch
- **Container Orchestration**: Amazon EKS
- **CDN**: CloudFront global distribution

## Infrastructure Architecture

### AWS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CloudFront CDN                      │
│                    (Global Edge Locations)                  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Application Load Balancer                │
│                         (Multi-AZ)                           │
└────────────────┬───────────┴───────────┬────────────────────┘
                 │                        │
     ┌───────────▼───────────┐ ┌─────────▼─────────┐
     │     EKS Cluster       │ │   EKS Cluster     │
     │    (Primary - AZ1)    │ │  (Secondary - AZ2) │
     └───────────┬───────────┘ └─────────┬─────────┘
                 │                        │
     ┌───────────▼───────────────────────▼─────────┐
     │           Aurora PostgreSQL Cluster          │
     │         (Multi-AZ with Read Replicas)        │
     └──────────────────────────────────────────────┘
```

### Kubernetes Architecture

```yaml
Namespaces:
  knowledge-network:
    Deployments:
      - frontend (3-50 replicas)
      - api (3-30 replicas)
      - websocket (2-20 replicas)
    Services:
      - ClusterIP for internal communication
      - ALB Ingress for external access
    ConfigMaps:
      - app-config
      - prometheus-config
    Secrets:
      - database-secret
      - app-secrets
      - tls-certificates
```

## Deployment Process

### Prerequisites

1. **Tools Required**:
   ```bash
   # Install required tools
   brew install awscli kubectl helm terraform

   # Configure AWS CLI
   aws configure

   # Verify installations
   aws --version
   kubectl version
   terraform version
   ```

2. **Access Requirements**:
   - AWS IAM role with appropriate permissions
   - Kubernetes cluster access
   - GitHub repository access
   - Secrets Manager access

### Automated Deployment

The production deployment is fully automated through GitHub Actions:

1. **Trigger Deployment**:
   ```bash
   # Push to main branch triggers automatic deployment
   git push origin main

   # Or manually trigger via GitHub UI
   # Actions -> Production Deployment -> Run workflow
   ```

2. **Deployment Stages**:
   - Security scanning
   - Build and test
   - Performance testing
   - Docker build and push to ECR
   - Database migrations
   - Kubernetes deployment
   - Health checks
   - Monitoring setup

### Manual Deployment

For emergency deployments or troubleshooting:

```bash
# 1. Deploy infrastructure
cd infrastructure/scripts
./deploy.sh production

# 2. Build and push Docker images
docker build -t knowledge-network:latest -f Dockerfile.production .
docker tag knowledge-network:latest $ECR_REPOSITORY:latest
docker push $ECR_REPOSITORY:latest

# 3. Deploy to Kubernetes
kubectl apply -k infrastructure/kubernetes/overlays/production

# 4. Verify deployment
kubectl get pods -n knowledge-network
kubectl logs -f deployment/knowledge-network-frontend -n knowledge-network
```

### Blue-Green Deployment

```bash
# 1. Deploy to green environment
kubectl apply -f infrastructure/kubernetes/green/

# 2. Test green environment
./scripts/test-green.sh

# 3. Switch traffic (gradual rollout)
kubectl patch ingress knowledge-network-ingress \
  -n knowledge-network \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "knowledge-network-green"}]'

# 4. Monitor metrics
kubectl top pods -n knowledge-network

# 5. Complete switchover or rollback
./scripts/complete-switchover.sh
# OR
./scripts/rollback.sh
```

## Monitoring & Observability

### Metrics Stack

1. **Prometheus**:
   - Application metrics
   - Infrastructure metrics
   - Custom business metrics
   - Alert rules

2. **Grafana Dashboards**:
   - Application performance
   - Infrastructure health
   - Business KPIs
   - User analytics

3. **CloudWatch**:
   - AWS service metrics
   - Log aggregation
   - Alarms and notifications

### Key Metrics to Monitor

```yaml
Application Metrics:
  - Request rate (req/sec)
  - Response time (P50, P95, P99)
  - Error rate (4xx, 5xx)
  - Active users
  - WebSocket connections

Infrastructure Metrics:
  - CPU utilization
  - Memory usage
  - Disk I/O
  - Network throughput
  - Pod restarts

Database Metrics:
  - Connection pool usage
  - Query performance
  - Replication lag
  - Lock waits
  - Cache hit ratio

Business Metrics:
  - User registrations
  - Content created
  - Search queries
  - Collaboration sessions
  - API usage
```

### Logging

```bash
# View application logs
kubectl logs -f deployment/knowledge-network-frontend -n knowledge-network

# View logs for all pods
kubectl logs -l app=knowledge-network -n knowledge-network --tail=100

# Search logs in CloudWatch
aws logs filter-log-events \
  --log-group-name /aws/eks/knowledge-network \
  --filter-pattern "ERROR"
```

### Alerts

Critical alerts configured:
- High CPU usage (>80%)
- High memory usage (>90%)
- Pod restarts (>3 in 15 min)
- High error rate (>5%)
- API response time (>1s P95)
- Database connection exhaustion
- Disk space (<10%)

## Scaling & Performance

### Auto-Scaling Configuration

1. **Horizontal Pod Autoscaler (HPA)**:
   ```yaml
   Frontend:
     Min: 3 replicas
     Max: 50 replicas
     Target CPU: 70%
     Target Memory: 80%

   API:
     Min: 3 replicas
     Max: 30 replicas
     Target CPU: 70%
     Target Memory: 80%

   WebSocket:
     Min: 2 replicas
     Max: 20 replicas
     Target CPU: 60%
     Target Memory: 70%
   ```

2. **Cluster Autoscaler**:
   ```yaml
   Node Groups:
     Primary (On-Demand):
       Min: 2 nodes
       Max: 10 nodes

     Spot:
       Min: 0 nodes
       Max: 20 nodes
   ```

### Performance Optimization

1. **CDN Caching**:
   - Static assets: 1 year
   - API responses: 1 hour (where applicable)
   - HTML pages: 1 hour

2. **Database Optimization**:
   - Connection pooling (PgBouncer)
   - Read replicas for queries
   - Query optimization
   - Index management

3. **Application Optimization**:
   - Code splitting
   - Lazy loading
   - Image optimization
   - Bundle size monitoring

## Backup & Disaster Recovery

### Backup Strategy

1. **Database Backups**:
   - Automated daily backups (30-day retention)
   - Point-in-time recovery
   - Cross-region replication
   - Manual snapshots before major changes

2. **Application Backups**:
   - Container images in ECR
   - Infrastructure as Code in Git
   - Secrets in AWS Secrets Manager
   - Configuration in Parameter Store

### Disaster Recovery Procedures

```bash
# 1. Database Recovery
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier knowledge-network-restore \
  --snapshot-identifier <snapshot-id>

# 2. Application Recovery
kubectl apply -f infrastructure/kubernetes/disaster-recovery/

# 3. Data Verification
./scripts/verify-data-integrity.sh

# 4. DNS Failover
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://dns-failover.json
```

### RTO/RPO Targets

- **RTO (Recovery Time Objective)**: 1 hour
- **RPO (Recovery Point Objective)**: 5 minutes

## Security Configuration

### Network Security

1. **VPC Configuration**:
   - Private subnets for application
   - Public subnets for load balancers
   - NAT gateways for outbound traffic
   - VPC flow logs enabled

2. **Security Groups**:
   - Least privilege access
   - Specific port allowlisting
   - Regular audit and review

### Application Security

1. **Authentication & Authorization**:
   - JWT tokens (15 min expiry)
   - Refresh tokens (7 days)
   - RBAC implementation
   - MFA for admin accounts

2. **Data Encryption**:
   - TLS 1.3 in transit
   - AES-256 at rest
   - KMS key rotation
   - Secrets encryption

### Compliance

- SOC2 Type II compliance
- GDPR compliance
- CCPA compliance
- Regular security audits
- Penetration testing quarterly

## Troubleshooting

### Common Issues

1. **Pods Not Starting**:
   ```bash
   # Check pod status
   kubectl describe pod <pod-name> -n knowledge-network

   # Check events
   kubectl get events -n knowledge-network --sort-by='.lastTimestamp'

   # Check resource limits
   kubectl top pods -n knowledge-network
   ```

2. **Database Connection Issues**:
   ```bash
   # Check connection pool
   kubectl exec -it deployment/knowledge-network-api -n knowledge-network -- \
     psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

   # Check network connectivity
   kubectl run test-db --image=postgres:15 --rm -it --restart=Never -- \
     psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **High Latency**:
   ```bash
   # Check pod distribution
   kubectl get pods -o wide -n knowledge-network

   # Check node resources
   kubectl top nodes

   # Trace requests
   kubectl exec -it deployment/knowledge-network-frontend -n knowledge-network -- \
     curl -w "@curl-format.txt" -o /dev/null -s http://knowledge-network-api:4000/health
   ```

## Maintenance Procedures

### Regular Maintenance

1. **Weekly Tasks**:
   - Review monitoring dashboards
   - Check backup integrity
   - Review security alerts
   - Update dependencies (security patches)

2. **Monthly Tasks**:
   - Performance analysis
   - Cost optimization review
   - Capacity planning
   - Security audit

3. **Quarterly Tasks**:
   - Disaster recovery drill
   - Penetration testing
   - Architecture review
   - Documentation update

### Update Procedures

```bash
# 1. Update application
kubectl set image deployment/knowledge-network-frontend \
  frontend=knowledge-network:v2.0.0 \
  -n knowledge-network

# 2. Monitor rollout
kubectl rollout status deployment/knowledge-network-frontend -n knowledge-network

# 3. Verify health
kubectl get pods -n knowledge-network
curl https://knowledge-network.app/api/health

# 4. Rollback if needed
kubectl rollout undo deployment/knowledge-network-frontend -n knowledge-network
```

## Support & Contacts

### Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Platform team lead
3. **Level 3**: Architecture team
4. **Level 4**: CTO/VP Engineering

### Important Links

- **Production Site**: https://knowledge-network.app
- **API Endpoint**: https://api.knowledge-network.app
- **Monitoring Dashboard**: https://grafana.knowledge-network.app
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch
- **Runbook**: https://wiki.internal/knowledge-network-runbook

### Emergency Procedures

```bash
# Emergency shutdown
kubectl scale deployment --all --replicas=0 -n knowledge-network

# Emergency restore
./scripts/emergency-restore.sh

# Incident response
./scripts/incident-response.sh --severity=critical
```

## Appendix

### Environment Variables

```yaml
Required:
  NODE_ENV: production
  DATABASE_URL: PostgreSQL connection string
  REDIS_URL: Redis connection string
  JWT_SECRET: JWT signing secret
  AWS_REGION: AWS region

Optional:
  LOG_LEVEL: debug|info|warn|error
  SENTRY_DSN: Error tracking
  DD_API_KEY: DataDog API key
  SLACK_WEBHOOK: Notifications
```

### Resource Limits

```yaml
Frontend:
  CPU: 250m-1000m
  Memory: 512Mi-1Gi

API:
  CPU: 500m-2000m
  Memory: 1Gi-2Gi

WebSocket:
  CPU: 250m-1000m
  Memory: 512Mi-1Gi
```

---

Last Updated: 2025-09-18
Version: 1.0.0
Author: Swarm 6C Production Team