# Deployment Guide - AI Conversation Capture System

This guide covers deploying the AI Conversation Capture system to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Extension Publishing](#extension-publishing)
7. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 16+ with pgvector extension
- Redis 7+
- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)

### Cloud Services (Production)
- Database: AWS RDS PostgreSQL / Google Cloud SQL / DigitalOcean Managed Database
- Cache/Queue: AWS ElastiCache Redis / Google Cloud Memorystore
- Compute: AWS ECS / Google Cloud Run / DigitalOcean App Platform
- Storage: AWS S3 / Google Cloud Storage (for backups)

## Local Development

### 1. Clone Repository
```bash
git clone <repository-url>
cd docex
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your local configuration
```

### 3. Start Services
```bash
docker-compose up -d
```

This starts:
- PostgreSQL with pgvector on port 5432
- Redis on port 6379
- FastAPI backend on port 8000
- Celery worker for background tasks

### 4. Initialize Database
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Or use the SQL schema directly
docker-compose exec postgres psql -U postgres -d ai_conversations -f /docker-entrypoint-initdb.d/01-schema.sql
```

### 5. Load Extension
- Open Chrome: `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select `extension/` directory

### 6. Verify Setup
```bash
# Check backend health
curl http://localhost:8000/health

# Check API docs
open http://localhost:8000/api/docs
```

## Production Deployment

### Architecture Overview

```
Internet
    ↓
Load Balancer (Nginx/CloudFlare)
    ↓
API Gateway
    ↓
Backend Services (FastAPI)
    ↓
Database (PostgreSQL + pgvector)
Cache/Queue (Redis)
```

### Option 1: Docker Compose (Simple VPS)

**Best for**: Small-medium deployments, single server

1. **Provision Server**
   - Ubuntu 22.04 LTS
   - 4GB RAM minimum (8GB recommended)
   - 50GB SSD storage

2. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin
```

3. **Clone and Configure**
```bash
git clone <repository-url>
cd docex
cp .env.example .env
nano .env  # Configure production settings
```

4. **Production Environment Variables**
```bash
# .env
DATABASE_URL=postgresql://user:password@postgres:5432/ai_conversations
REDIS_URL=redis://redis:6379/0
JWT_SECRET=<generate-strong-secret>
DEBUG=false
CORS_ORIGINS=https://yourdomain.com,chrome-extension://*
```

5. **Deploy**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

6. **Set Up Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/ai-capture
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

7. **SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option 2: Kubernetes (Scalable)

**Best for**: Large deployments, high availability

See `k8s/` directory for Kubernetes manifests.

### Option 3: Cloud Platform (Managed)

#### AWS Deployment

**Services Used**:
- ECS Fargate (Backend)
- RDS PostgreSQL (Database)
- ElastiCache Redis (Cache/Queue)
- ALB (Load Balancer)
- S3 (Backups)

**Steps**:
1. Create RDS PostgreSQL instance with pgvector
2. Create ElastiCache Redis cluster
3. Build and push Docker images to ECR
4. Create ECS task definitions
5. Set up ALB and target groups
6. Configure auto-scaling

#### Google Cloud Deployment

**Services Used**:
- Cloud Run (Backend)
- Cloud SQL PostgreSQL (Database)
- Memorystore Redis (Cache/Queue)
- Cloud Load Balancing
- Cloud Storage (Backups)

#### DigitalOcean Deployment

**Services Used**:
- App Platform (Backend)
- Managed Database PostgreSQL (Database)
- Managed Redis (Cache/Queue)
- Spaces (Backups)

## Database Setup

### PostgreSQL with pgvector

1. **Install pgvector Extension**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

2. **Run Migrations**
```bash
# Using Alembic
alembic upgrade head

# Or run schema directly
psql -U postgres -d ai_conversations -f backend/db/schema.sql
```

3. **Create Indexes**
```sql
-- HNSW index for vector search (already in schema)
CREATE INDEX idx_embeddings_vector ON embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

4. **Backup Strategy**
```bash
# Daily backups
0 2 * * * pg_dump -U postgres ai_conversations | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Retention: keep 30 days
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

## Environment Configuration

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/ai_conversations

# Redis
REDIS_URL=redis://host:6379/0

# JWT
JWT_SECRET=<generate-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# CORS
CORS_ORIGINS=https://dashboard.yourdomain.com,chrome-extension://*

# Embedding
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Celery
CELERY_BROKER_URL=redis://host:6379/0
CELERY_RESULT_BACKEND=redis://host:6379/0

# App
DEBUG=false
LOG_LEVEL=INFO
```

### Extension Configuration

Update `extension/background/api-client.js`:
```javascript
this.baseURL = 'https://api.yourdomain.com';
```

## Extension Publishing

### Chrome Web Store

1. **Prepare for Submission**
   - Create promotional images (128x128, 440x280, 1400x560)
   - Write detailed description
   - Create privacy policy page
   - Prepare screenshots

2. **Build Extension**
```bash
cd extension
zip -r extension.zip . -x "*.git*" -x "node_modules/*"
```

3. **Submit to Chrome Web Store**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay one-time $5 developer fee
   - Upload extension.zip
   - Fill in store listing
   - Submit for review (typically 1-3 days)

4. **Privacy Policy Requirements**
   - Explain what data is collected
   - How data is used
   - Where data is stored
   - User rights (export, delete)

### Firefox Add-ons (Optional)

Similar process for Firefox AMO (addons.mozilla.org)

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl https://api.yourdomain.com/health

# Database connection
docker-compose exec postgres pg_isready

# Redis connection
docker-compose exec redis redis-cli ping
```

### Logging

**Backend Logs**:
```bash
# Docker
docker-compose logs -f backend

# Production
journalctl -u ai-capture-backend -f
```

**Celery Worker Logs**:
```bash
docker-compose logs -f celery_worker
```

### Metrics to Monitor

1. **API Performance**
   - Request latency (p50, p95, p99)
   - Error rate
   - Requests per second

2. **Database**
   - Connection pool usage
   - Query performance
   - Disk usage

3. **Embedding Pipeline**
   - Queue size
   - Processing time
   - Success/failure rate

4. **Extension**
   - Active users
   - Capture success rate
   - Sync failures

### Recommended Tools

- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Error Tracking**: Sentry
- **Uptime**: UptimeRobot, Pingdom

### Scaling Considerations

**Database**:
- Read replicas for search queries
- Connection pooling (PgBouncer)
- Partitioning for large tables

**Backend**:
- Horizontal scaling with load balancer
- Caching frequently accessed data
- CDN for static assets

**Embedding Pipeline**:
- Multiple Celery workers
- GPU instances for faster encoding
- Batch processing optimization

### Security Checklist

- [ ] HTTPS/TLS enabled
- [ ] Strong JWT secrets
- [ ] Database credentials rotated
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection protection
- [ ] XSS prevention
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access logs enabled

## Troubleshooting

### Common Issues

**1. Extension can't connect to backend**
- Check CORS configuration
- Verify API URL in extension settings
- Check network/firewall rules

**2. Embeddings not generating**
- Check Celery worker logs
- Verify Redis connection
- Check model download (first run takes time)

**3. Slow search queries**
- Verify HNSW index exists
- Check query complexity
- Consider read replicas

**4. Database connection errors**
- Check connection pool settings
- Verify credentials
- Check network connectivity

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: <docs-url>
- Email: support@yourdomain.com
