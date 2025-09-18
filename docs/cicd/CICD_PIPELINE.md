# CI/CD Pipeline Design - Knowledge Network React Application

## Overview

This document outlines the comprehensive CI/CD pipeline design for the Knowledge Network React Application, featuring automated testing, security scanning, quality gates, and multi-environment deployment with progressive delivery strategies.

## Pipeline Architecture

### Pipeline Flow Diagram

```mermaid
graph LR
    A[Source Control] --> B[Build Stage]
    B --> C[Test Stage]
    C --> D[Security Stage]
    D --> E[Quality Gates]
    E --> F[Staging Deploy]
    F --> G[Production Deploy]

    B --> B1[Compile TypeScript]
    B --> B2[Bundle Assets]
    B --> B3[Container Build]

    C --> C1[Unit Tests]
    C --> C2[Integration Tests]
    C --> C3[E2E Tests]
    C --> C4[Performance Tests]

    D --> D1[SAST Scan]
    D --> D2[Dependency Scan]
    D --> D3[Container Scan]
    D --> D4[Secrets Scan]

    F --> F1[Blue-Green Deploy]
    F --> F2[Smoke Tests]
    F --> F3[Health Checks]

    G --> G1[Canary Deploy]
    G --> G2[Full Rollout]
    G --> G3[Monitoring]
```

### Pipeline Stages Overview

| Stage | Duration | Quality Gate | Failure Action |
|-------|----------|--------------|----------------|
| Build | 3-5 min | Build Success | Stop Pipeline |
| Test | 8-12 min | 80% Coverage | Stop Pipeline |
| Security | 5-8 min | No Critical | Stop Pipeline |
| Quality | 2-3 min | 8.5/10 Score | Stop Pipeline |
| Staging | 10-15 min | Health Checks | Stop Pipeline |
| Production | 20-30 min | Business Metrics | Auto Rollback |

## Source Control Integration

### GitHub Actions Workflow

#### Main Workflow (.github/workflows/main.yml)
```yaml
name: Knowledge Network CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      deployment_type:
        description: 'Deployment type'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production-canary
          - production-full

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  NODE_VERSION: '20'
  BUN_VERSION: '1.0.0'

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      has-app-changes: ${{ steps.changes.outputs.app }}
      has-infra-changes: ${{ steps.changes.outputs.infra }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            app:
              - 'apps/**'
              - 'packages/**'
              - 'package.json'
              - 'bun.lockb'
            infra:
              - 'infrastructure/**'
              - '.github/workflows/**'

  build:
    needs: detect-changes
    if: needs.detect-changes.outputs.has-app-changes == 'true'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bun run type-check

      - name: Lint code
        run: bun run lint

      - name: Build application
        run: bun run build
        env:
          NODE_ENV: production
          NEXT_TELEMETRY_DISABLED: 1

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            .next/
            public/
          retention-days: 7

  test:
    needs: [detect-changes, build]
    if: needs.detect-changes.outputs.has-app-changes == 'true'
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: knowledge_network_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run unit tests
        run: bun run test --coverage
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/knowledge_network_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: bun run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/knowledge_network_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  e2e-tests:
    needs: [detect-changes, build]
    if: needs.detect-changes.outputs.has-app-changes == 'true'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts

      - name: Install Playwright
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          CI: true

      - name: Upload E2E results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  security-scan:
    needs: detect-changes
    if: needs.detect-changes.outputs.has-app-changes == 'true'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript, javascript

  quality-gates:
    needs: [build, test, e2e-tests, security-scan]
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: SonarQube quality gate check
        uses: sonarqube-quality-gate-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.12.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Bundle size check
        run: |
          bun run analyze
          node scripts/check-bundle-size.js

  build-and-push-image:
    needs: [quality-gates]
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  deploy-staging:
    needs: [build-and-push-image]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to staging
        run: |
          aws ecs update-service \
            --cluster knowledge-network-staging \
            --service knowledge-network-staging-service \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster knowledge-network-staging \
            --services knowledge-network-staging-service

      - name: Run smoke tests
        run: |
          bun run test:smoke
        env:
          TEST_URL: https://staging.knowledgenetwork.com

  deploy-production:
    needs: [build-and-push-image]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Blue-Green deployment
        run: |
          python scripts/blue-green-deploy.py \
            --image ${{ needs.build-and-push-image.outputs.image-tag }} \
            --cluster knowledge-network-production

      - name: Run production smoke tests
        run: |
          bun run test:smoke:production
        env:
          TEST_URL: https://app.knowledgenetwork.com

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Build Optimization

### Multi-Stage Dockerfile

```dockerfile
# Build stage
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production=false

# Build application
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js application
RUN bun run build

# Production image
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["bun", "server.js"]
```

### Build Optimization Scripts

#### Bundle Size Monitoring
```javascript
// scripts/check-bundle-size.js
const fs = require('fs')
const path = require('path')
const { gzipSize } = require('gzip-size')

const BUNDLE_SIZE_LIMITS = {
  'pages/_app.js': 250 * 1024, // 250KB
  'pages/index.js': 100 * 1024, // 100KB
  'chunks/framework.js': 200 * 1024, // 200KB
  'chunks/commons.js': 150 * 1024, // 150KB
}

async function checkBundleSize() {
  const buildDir = path.join(process.cwd(), '.next/static')
  const chunks = fs.readdirSync(buildDir, { recursive: true })

  const violations = []

  for (const chunk of chunks) {
    if (chunk.endsWith('.js')) {
      const filePath = path.join(buildDir, chunk)
      const size = await gzipSize(fs.readFileSync(filePath))
      const limit = BUNDLE_SIZE_LIMITS[chunk] || 500 * 1024 // Default 500KB

      if (size > limit) {
        violations.push({
          file: chunk,
          size: Math.round(size / 1024),
          limit: Math.round(limit / 1024),
          overage: Math.round((size - limit) / 1024)
        })
      }
    }
  }

  if (violations.length > 0) {
    console.error('❌ Bundle size violations:')
    violations.forEach(v => {
      console.error(`  ${v.file}: ${v.size}KB (limit: ${v.limit}KB, over by ${v.overage}KB)`)
    })
    process.exit(1)
  }

  console.log('✅ All bundles within size limits')
}

checkBundleSize().catch(console.error)
```

## Testing Pipeline

### Test Configuration

#### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '.next/',
        'coverage/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

#### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ['github']
  ],

  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],

  webServer: process.env.CI ? undefined : {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true
  }
})
```

### Performance Testing

#### Lighthouse CI Configuration
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

#### Load Testing Script
```javascript
// scripts/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 200 }, // Spike
    { duration: '5m', target: 200 }, // High load
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
    errors: ['rate<0.01']
  }
}

export default function () {
  const response = http.get('https://staging.knowledgenetwork.com')

  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })

  errorRate.add(!result)
  sleep(1)
}
```

## Security Pipeline

### SAST Integration

#### SonarQube Configuration
```yaml
# sonar-project.properties
sonar.projectKey=knowledge-network
sonar.organization=your-org
sonar.host.url=https://sonarcloud.io

# Source code configuration
sonar.sources=src,pages,components
sonar.tests=src,e2e
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx

# Coverage configuration
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=test-results/junit.xml

# Security configuration
sonar.security.hotspots.auto-assign=true
sonar.security.review.category=SECURITY

# Quality gate
sonar.qualitygate.wait=true
```

#### Snyk Configuration
```yaml
# .snyk
version: v1.0.0

ignore:
  'SNYK-JS-LODASH-567746':
    - '*':
        reason: Low severity, fix planned for next sprint
        expires: '2024-10-01T00:00:00.000Z'

patch: {}

language-settings:
  javascript:
    packageManagers:
      - bun
    ignoreDevDependencies: false

exclude:
  global:
    - test/**
    - e2e/**
    - coverage/**
```

### Container Security

#### Trivy Scanner Configuration
```yaml
# .trivyignore
# Ignore low severity vulnerabilities in development dependencies
CVE-2021-44906

# Security scanning configuration
scan:
  security-checks: vuln,config,secret
  severity: HIGH,CRITICAL
  exit-code: 1
  format: sarif
  output: trivy-results.sarif
```

## Deployment Strategies

### Blue-Green Deployment

#### Blue-Green Deployment Script
```python
#!/usr/bin/env python3
# scripts/blue-green-deploy.py

import boto3
import time
import sys
import argparse
import json

class BlueGreenDeployer:
    def __init__(self, cluster_name, service_name):
        self.ecs = boto3.client('ecs')
        self.elbv2 = boto3.client('elbv2')
        self.cluster_name = cluster_name
        self.service_name = service_name

    def get_current_deployment(self):
        """Get current active deployment color"""
        response = self.ecs.describe_services(
            cluster=self.cluster_name,
            services=[self.service_name]
        )

        tags = response['services'][0].get('tags', [])
        for tag in tags:
            if tag['key'] == 'deployment-color':
                return tag['value']
        return 'blue'  # Default to blue if no tag found

    def deploy_new_version(self, image_uri, target_color):
        """Deploy new version to standby environment"""
        standby_service = f"{self.service_name}-{target_color}"

        # Update task definition
        task_def_response = self.ecs.describe_task_definition(
            taskDefinition=f"{self.service_name}-{target_color}"
        )

        task_def = task_def_response['taskDefinition']
        task_def['containerDefinitions'][0]['image'] = image_uri

        # Register new task definition
        new_task_def = self.ecs.register_task_definition(
            family=task_def['family'],
            taskRoleArn=task_def.get('taskRoleArn'),
            executionRoleArn=task_def.get('executionRoleArn'),
            networkMode=task_def.get('networkMode'),
            requiresCompatibilities=task_def.get('requiresCompatibilities'),
            cpu=task_def.get('cpu'),
            memory=task_def.get('memory'),
            containerDefinitions=task_def['containerDefinitions']
        )

        # Update service
        self.ecs.update_service(
            cluster=self.cluster_name,
            service=standby_service,
            taskDefinition=new_task_def['taskDefinition']['taskDefinitionArn']
        )

        # Wait for deployment to stabilize
        waiter = self.ecs.get_waiter('services_stable')
        waiter.wait(
            cluster=self.cluster_name,
            services=[standby_service],
            WaiterConfig={'delay': 15, 'maxAttempts': 40}
        )

        return True

    def run_health_checks(self, target_color):
        """Run health checks on new deployment"""
        import requests

        # Get target group ARN for standby environment
        target_group_arn = f"arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kn-{target_color}/1234567890abcdef"

        # Get target group health
        response = self.elbv2.describe_target_health(
            TargetGroupArn=target_group_arn
        )

        healthy_targets = [
            target for target in response['TargetHealthDescriptions']
            if target['TargetHealth']['State'] == 'healthy'
        ]

        if len(healthy_targets) == 0:
            raise Exception("No healthy targets found")

        # Run application health checks
        health_url = f"https://{target_color}.knowledgenetwork.com/api/health"

        for _ in range(5):
            try:
                response = requests.get(health_url, timeout=10)
                if response.status_code == 200:
                    health_data = response.json()
                    if health_data.get('status') == 'healthy':
                        return True
            except Exception as e:
                print(f"Health check failed: {e}")
                time.sleep(10)

        return False

    def switch_traffic(self, target_color):
        """Switch traffic to new deployment"""
        listener_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/kn-alb/1234567890abcdef/0123456789abcdef"
        target_group_arn = f"arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/kn-{target_color}/1234567890abcdef"

        # Update listener rule to point to new target group
        self.elbv2.modify_listener(
            ListenerArn=listener_arn,
            DefaultActions=[
                {
                    'Type': 'forward',
                    'TargetGroupArn': target_group_arn
                }
            ]
        )

        return True

    def deploy(self, image_uri):
        """Execute complete blue-green deployment"""
        current_color = self.get_current_deployment()
        target_color = 'green' if current_color == 'blue' else 'blue'

        print(f"Current deployment: {current_color}")
        print(f"Deploying to: {target_color}")

        try:
            # Deploy to standby environment
            print("Deploying new version...")
            self.deploy_new_version(image_uri, target_color)

            # Run health checks
            print("Running health checks...")
            if not self.run_health_checks(target_color):
                raise Exception("Health checks failed")

            # Switch traffic
            print("Switching traffic...")
            self.switch_traffic(target_color)

            # Update service tags
            self.ecs.tag_resource(
                resourceArn=f"arn:aws:ecs:us-east-1:123456789012:service/{self.cluster_name}/{self.service_name}",
                tags=[
                    {'key': 'deployment-color', 'value': target_color}
                ]
            )

            print(f"Deployment successful! Active color: {target_color}")
            return True

        except Exception as e:
            print(f"Deployment failed: {e}")
            return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Blue-Green Deployment')
    parser.add_argument('--image', required=True, help='Docker image URI')
    parser.add_argument('--cluster', required=True, help='ECS cluster name')

    args = parser.parse_args()

    deployer = BlueGreenDeployer(args.cluster, 'knowledge-network')
    success = deployer.deploy(args.image)

    sys.exit(0 if success else 1)
```

### Canary Deployment

#### Canary Deployment Configuration
```yaml
# canary-deployment.yml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: knowledge-network-rollout
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {duration: 10m}
      - setWeight: 50
      - pause: {duration: 15m}
      - setWeight: 75
      - pause: {duration: 10m}

      analysis:
        templates:
        - templateName: success-rate
        args:
        - name: service-name
          value: knowledge-network

      trafficRouting:
        alb:
          ingress: knowledge-network-ingress
          servicePort: 80
          rootService: knowledge-network-root
          canaryService: knowledge-network-canary

  selector:
    matchLabels:
      app: knowledge-network

  template:
    metadata:
      labels:
        app: knowledge-network
    spec:
      containers:
      - name: knowledge-network
        image: ghcr.io/org/knowledge-network:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring & Observability

### Pipeline Metrics

#### GitHub Actions Metrics
```yaml
# .github/workflows/metrics.yml
name: Pipeline Metrics

on:
  workflow_run:
    workflows: ["Knowledge Network CI/CD Pipeline"]
    types: [completed]

jobs:
  collect-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Collect pipeline metrics
        run: |
          # Calculate pipeline duration
          START_TIME=$(gh api repos/${{ github.repository }}/actions/runs/${{ github.event.workflow_run.id }} --jq '.created_at')
          END_TIME=$(gh api repos/${{ github.repository }}/actions/runs/${{ github.event.workflow_run.id }} --jq '.updated_at')

          DURATION=$(($(date -d "$END_TIME" +%s) - $(date -d "$START_TIME" +%s)))

          # Send metrics to monitoring service
          curl -X POST "${{ secrets.METRICS_ENDPOINT }}" \
            -H "Content-Type: application/json" \
            -d "{
              \"metric\": \"pipeline.duration\",
              \"value\": $DURATION,
              \"tags\": {
                \"status\": \"${{ github.event.workflow_run.conclusion }}\",
                \"branch\": \"${{ github.event.workflow_run.head_branch }}\"
              }
            }"
```

#### Deployment Success Tracking
```javascript
// scripts/track-deployment.js
const { DatadogMetrics } = require('@datadog/metrics')

const metrics = new DatadogMetrics({
  apiKey: process.env.DATADOG_API_KEY,
  prefix: 'knowledge_network.deployment.'
})

function trackDeployment(status, environment, duration) {
  // Track deployment count
  metrics.increment('count', 1, {
    status,
    environment
  })

  // Track deployment duration
  metrics.histogram('duration', duration, {
    status,
    environment
  })

  // Track deployment frequency
  metrics.gauge('frequency', Date.now(), {
    environment
  })
}

// Usage
trackDeployment(
  process.env.DEPLOYMENT_STATUS,
  process.env.ENVIRONMENT,
  parseInt(process.env.DEPLOYMENT_DURATION)
)
```

### Alerting Configuration

#### Deployment Alerts
```yaml
deployment_alerts:
  critical:
    - deployment_failure_rate > 10%
    - rollback_triggered
    - health_check_failures > 3
    - security_scan_critical_issues > 0

  warning:
    - deployment_duration > 30_minutes
    - test_failure_rate > 5%
    - build_queue_time > 10_minutes
    - coverage_decrease > 5%

notification_channels:
  slack: "#deployments"
  email: "engineering@company.com"
  pagerduty: "deployment-issues"

escalation_policy:
  level_1: slack_notification
  level_2: email_notification
  level_3: pagerduty_alert
```

## Rollback Strategy

### Automated Rollback

#### Rollback Decision Engine
```python
# scripts/rollback-engine.py
import boto3
import requests
import time
from datadog import initialize, api

class RollbackEngine:
    def __init__(self):
        self.ecs = boto3.client('ecs')
        self.cloudwatch = boto3.client('cloudwatch')
        initialize(api_key=os.environ['DATADOG_API_KEY'])

    def check_health_metrics(self, deployment_time):
        """Check if current deployment is healthy"""
        end_time = time.time()
        start_time = deployment_time

        # Check error rate
        error_rate = self.get_metric_value(
            'aws.applicationelb.target_response_time',
            start_time, end_time
        )

        if error_rate > 0.05:  # 5% error rate threshold
            return False, f"Error rate too high: {error_rate:.2%}"

        # Check response time
        avg_response_time = self.get_metric_value(
            'aws.applicationelb.target_response_time',
            start_time, end_time
        )

        if avg_response_time > 2000:  # 2 second threshold
            return False, f"Response time too high: {avg_response_time}ms"

        # Check business metrics
        user_satisfaction = self.get_business_metric('user.satisfaction', start_time, end_time)

        if user_satisfaction < 0.8:  # 80% satisfaction threshold
            return False, f"User satisfaction too low: {user_satisfaction:.1%}"

        return True, "All metrics healthy"

    def execute_rollback(self, previous_version):
        """Execute rollback to previous version"""
        try:
            # Switch load balancer back to previous version
            self.switch_load_balancer_target(previous_version)

            # Update ECS service to previous task definition
            self.ecs.update_service(
                cluster='knowledge-network-production',
                service='knowledge-network-service',
                taskDefinition=previous_version
            )

            # Wait for rollback to complete
            waiter = self.ecs.get_waiter('services_stable')
            waiter.wait(
                cluster='knowledge-network-production',
                services=['knowledge-network-service']
            )

            return True

        except Exception as e:
            print(f"Rollback failed: {e}")
            return False

    def monitor_and_rollback(self, deployment_time, previous_version):
        """Monitor deployment and rollback if needed"""
        monitoring_duration = 1800  # 30 minutes
        check_interval = 300       # 5 minutes

        for elapsed in range(0, monitoring_duration, check_interval):
            time.sleep(check_interval)

            healthy, reason = self.check_health_metrics(deployment_time)

            if not healthy:
                print(f"Unhealthy deployment detected: {reason}")
                print("Initiating rollback...")

                if self.execute_rollback(previous_version):
                    print("Rollback successful")
                    self.notify_rollback(reason)
                    return False
                else:
                    print("Rollback failed - manual intervention required")
                    self.notify_rollback_failure(reason)
                    return False

        print("Deployment monitoring complete - deployment stable")
        return True

if __name__ == "__main__":
    engine = RollbackEngine()

    deployment_time = float(sys.argv[1])
    previous_version = sys.argv[2]

    success = engine.monitor_and_rollback(deployment_time, previous_version)
    sys.exit(0 if success else 1)
```

## Environment Management

### Environment Configuration

#### Development Environment
```yaml
# environments/development.yml
environment: development
domain: dev.knowledgenetwork.com
replicas: 1
resources:
  cpu: 256
  memory: 512
database:
  instance_class: db.t3.micro
  storage: 20
monitoring:
  enabled: true
  retention: 7_days
features:
  debug_mode: true
  mock_services: true
  hot_reload: true
```

#### Staging Environment
```yaml
# environments/staging.yml
environment: staging
domain: staging.knowledgenetwork.com
replicas: 2
resources:
  cpu: 512
  memory: 1024
database:
  instance_class: db.t3.small
  storage: 100
monitoring:
  enabled: true
  retention: 30_days
features:
  debug_mode: false
  mock_services: false
  performance_testing: true
```

#### Production Environment
```yaml
# environments/production.yml
environment: production
domain: app.knowledgenetwork.com
replicas: 5
resources:
  cpu: 1024
  memory: 2048
database:
  instance_class: db.r6g.large
  storage: 500
  backup_retention: 30
monitoring:
  enabled: true
  retention: 90_days
features:
  debug_mode: false
  mock_services: false
  performance_monitoring: true
  error_tracking: true
```

## Success Metrics

### Pipeline Performance KPIs

```yaml
pipeline_metrics:
  build_performance:
    - build_time: <5_minutes
    - test_execution: <10_minutes
    - deployment_time: <15_minutes
    - pipeline_total_time: <30_minutes

  quality_metrics:
    - build_success_rate: >98%
    - test_pass_rate: >95%
    - security_scan_pass_rate: 100%
    - deployment_success_rate: >99%

  reliability_metrics:
    - pipeline_availability: >99.9%
    - mean_time_to_recovery: <15_minutes
    - false_positive_rate: <2%
    - rollback_success_rate: 100%

  developer_experience:
    - feedback_time: <5_minutes
    - queue_wait_time: <2_minutes
    - developer_satisfaction: >8/10
    - pipeline_complexity_score: <5/10
```

### Business Impact Metrics

```yaml
business_metrics:
  delivery_performance:
    - deployment_frequency: >1_per_day
    - lead_time_for_changes: <2_hours
    - change_failure_rate: <5%
    - mean_time_to_restore: <30_minutes

  quality_impact:
    - production_incidents: <2_per_month
    - customer_reported_bugs: <5_per_month
    - user_satisfaction_score: >90%
    - feature_adoption_rate: >75%

  operational_efficiency:
    - infrastructure_cost_per_deployment: optimized
    - developer_productivity_score: improved
    - time_to_market: reduced_by_50%
    - operational_overhead: minimized
```

## Conclusion

This comprehensive CI/CD pipeline design provides:

1. **Automated Quality Assurance**: Multi-layered testing and security scanning
2. **Progressive Deployment**: Blue-green and canary deployment strategies
3. **Intelligent Monitoring**: Real-time metrics and automated rollback
4. **Developer Experience**: Fast feedback loops and clear error reporting
5. **Production Readiness**: Enterprise-grade reliability and scalability

The pipeline supports the Knowledge Network React Application's requirements for rapid iteration while maintaining the 8.5/10 quality threshold and ensuring production stability.