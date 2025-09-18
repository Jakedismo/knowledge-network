# Installation Guide

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores (2.4GHz+)
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+, RHEL 8+, macOS 12+, Windows Server 2019+

#### Recommended Requirements
- **CPU**: 4+ cores (3.0GHz+)
- **RAM**: 16GB+
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

#### Required Software
```bash
# Node.js 20+ or Bun 1.0+
node --version  # Should output v20.x.x or higher
bun --version   # Alternative: Should output 1.x.x

# PostgreSQL 15+
psql --version  # Should output 15.x or higher

# Redis 7+
redis-server --version  # Should output 7.x.x

# Git
git --version  # Should output 2.x.x or higher
```

#### Optional Software
```bash
# Elasticsearch 8+ (for advanced search)
curl -X GET "localhost:9200"

# nginx (for reverse proxy)
nginx -v

# Docker (for containerized deployment)
docker --version

# PM2 (for process management)
pm2 --version
```

## Installation Methods

### Method 1: Quick Install (Development)

```bash
# Clone repository
git clone https://github.com/knowledge-network/app.git
cd app

# Install dependencies with Bun (recommended)
bun install

# Or with npm
npm install

# Copy environment template
cp .env.example .env.local

# Edit configuration
nano .env.local

# Run database migrations
bun run migrate

# Seed initial data (optional)
bun run seed

# Start development server
bun run dev
```

### Method 2: Production Installation

#### Step 1: System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install build essentials
sudo apt install -y build-essential curl wget git

# Create application user
sudo useradd -m -s /bin/bash knowledgenet
sudo mkdir -p /opt/knowledge-network
sudo chown knowledgenet:knowledgenet /opt/knowledge-network
```

#### Step 2: Install Node.js/Bun

```bash
# Option A: Install Bun (Recommended)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Option B: Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

#### Step 3: Install PostgreSQL

```bash
# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER knowledgenet WITH PASSWORD 'secure_password_here';
CREATE DATABASE knowledge_network OWNER knowledgenet;
GRANT ALL PRIVILEGES ON DATABASE knowledge_network TO knowledgenet;
EOF
```

#### Step 4: Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru
# Set: requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### Step 5: Install Application

```bash
# Switch to application user
sudo su - knowledgenet
cd /opt/knowledge-network

# Clone repository
git clone https://github.com/knowledge-network/app.git .

# Install dependencies
bun install --production

# Build application
bun run build
```

#### Step 6: Configure Environment

```bash
# Create production environment file
cp .env.example .env.production

# Edit configuration
nano .env.production
```

Required environment variables:
```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://knowledgenet:password@localhost:5432/knowledge_network

# Redis
REDIS_URL=redis://:password@localhost:6379

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# JWT
JWT_SECRET=generate_secure_secret
JWT_REFRESH_SECRET=generate_another_secure_secret

# Storage (S3-compatible)
S3_BUCKET=knowledge-network
S3_REGION=us-east-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=smtp_password

# Optional: Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=knowledge_network
```

#### Step 7: Database Setup

```bash
# Run migrations
bun run migrate:prod

# Seed initial data (optional)
bun run seed:prod

# Verify database
bun run db:verify
```

#### Step 8: Setup Process Manager

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'knowledge-network',
    script: 'bun',
    args: 'run start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '2G'
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### Method 3: Docker Installation

#### Step 1: Prepare Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/knowledge_network
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - uploads:/app/uploads
      - ./logs:/app/logs

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=knowledge_network
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elastic_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  elastic_data:
  uploads:
```

#### Step 2: Build and Run

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Run migrations
docker-compose exec app bun run migrate

# Check logs
docker-compose logs -f app
```

## Post-Installation Setup

### Step 1: Nginx Configuration

```nginx
# /etc/nginx/sites-available/knowledge-network
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Step 2: SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Step 3: Firewall Configuration

```bash
# Configure UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 4: Create Admin User

```bash
# Run admin creation script
bun run create-admin

# Or via CLI
bun run cli user:create \
  --email admin@example.com \
  --name "Admin User" \
  --role super_admin
```

### Step 5: Initial Configuration

1. Navigate to https://your-domain.com/admin
2. Log in with admin credentials
3. Complete setup wizard:
   - Configure workspace defaults
   - Set up authentication providers
   - Configure email settings
   - Set storage quotas
   - Enable features

## Verification

### Health Checks

```bash
# Application health
curl https://your-domain.com/api/health

# Database connectivity
bun run db:ping

# Redis connectivity
redis-cli ping

# Elasticsearch (if installed)
curl -X GET "localhost:9200/_cluster/health?pretty"
```

### Performance Test

```bash
# Run performance benchmark
bun run test:performance

# Load testing
npm install -g artillery
artillery quick --count 10 --num 100 https://your-domain.com
```

## Troubleshooting Installation

### Common Issues

#### Port Already in Use
```bash
# Find process using port
sudo lsof -i :3000
# Kill process
sudo kill -9 [PID]
```

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Check connection
psql -U knowledgenet -d knowledge_network -h localhost
```

#### Permission Errors
```bash
# Fix permissions
sudo chown -R knowledgenet:knowledgenet /opt/knowledge-network
sudo chmod -R 755 /opt/knowledge-network
```

#### Memory Issues
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
# Or in PM2
pm2 start app.js --node-args="--max-old-space-size=4096"
```

## Backup Initial State

```bash
# Backup database
pg_dump -U knowledgenet knowledge_network > initial_backup.sql

# Backup configuration
tar -czf config_backup.tar.gz .env.production nginx.conf ecosystem.config.js

# Store securely
mkdir -p /backup/initial
mv *.sql *.tar.gz /backup/initial/
```

## Next Steps

1. [Configure Security Settings](./security.md)
2. [Set Up User Management](./user-management.md)
3. [Configure Monitoring](./monitoring.md)
4. [Plan Backup Strategy](./backup-recovery.md)

---

[← Back to Admin Guide](./README.md) | [Next: Configuration →](./configuration.md)