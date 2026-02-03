# Production Deployment Guide 
 
## Infrastructure Requirements 
 
### Minimum Specifications 
- **API Server**: 4 CPU, 8GB RAM, 50GB SSD 
- **Worker Nodes**: 2 CPU, 4GB RAM, 20GB SSD (per worker) 
- **PostgreSQL**: 4 CPU, 16GB RAM, 200GB SSD 
- **Redis**: 2 CPU, 4GB RAM, 10GB SSD 
 
### Network Requirements 
- Ethereum RPC endpoint (Alchemy/Infura) 
- IPFS node or Pinata account 
- Outbound HTTPS (443) for API calls 
 
## Deployment Steps 
 
### 1. Server Setup 
 
```bash 
# Update system 
sudo apt update && sudo apt upgrade -y 
 
# Install Docker 
curl -fsSL https://get.docker.com -o get-docker.sh 
sudo sh get-docker.sh 
 
# Install Docker Compose 
sudo apt install docker-compose-plugin 
``` 
 
### 2. Application Deployment 
 
```bash 
# Clone repository 
git clone https://github.com/ChronoCoders/indexnode.git  
cd indexnode 
 
# Configure environment 
cp .env.example .env.production 
nano .env.production 
 
# Deploy 
./scripts/deploy.sh 
``` 
 
### 3. Database Migration 
 
```bash 
docker-compose -f deploy/docker-compose.yml exec api sqlx migrate run 
``` 
 
### 4. SSL Certificate (Let's Encrypt) 
 
```bash 
sudo apt install certbot python3-certbot-nginx 
sudo certbot --nginx -d indexnode.io -d www.indexnode.io 
``` 
 
### 5. Monitoring Setup 
 
Add Prometheus scrape config: 
 
```yaml 
scrape_configs: 
  - job_name: 'indexnode' 
    static_configs: 
      - targets: ['localhost:8080'] 
``` 
 
## Backup Strategy 
 
### Automated Backups 
 
```bash 
# Add to crontab 
0 2 * * * /path/to/indexnode/scripts/backup_db.sh 
``` 
 
### Backup Retention 
- Daily backups: 7 days 
- Weekly backups: 4 weeks 
- Monthly backups: 12 months 
 
## Scaling 
 
### Horizontal Scaling 
 
Add worker nodes: 
 
```yaml 
worker: 
  deploy: 
    replicas: 5  # Increase from 3 
``` 
 
### Database Scaling 
 
Enable read replicas: 
 
```yaml 
postgres_replica: 
  image: postgres:15-alpine 
  environment: 
    POSTGRES_REPLICATION_MODE: slave 
``` 
 
## Health Checks 
 
```bash 
# API health 
curl http://localhost:8080/health 
 
# Database health 
docker-compose exec postgres pg_isready 
 
# Redis health 
docker-compose exec redis redis-cli ping 
``` 
 
## Troubleshooting 
 
### High Memory Usage 
 
```bash 
# Check worker memory 
docker stats 
 
# Reduce worker replicas if needed 
docker-compose up -d --scale worker=2 
``` 
 
### Slow Queries 
 
```bash 
# Enable slow query log 
docker-compose exec postgres \ 
  psql -U indexnode -c "ALTER SYSTEM SET log_min_duration_statement = 1000" 
``` 
 
## Security Checklist 
 
- [ ] Firewall configured (UFW/iptables) 
- [ ] SSH key-only authentication 
- [ ] PostgreSQL password rotated 
- [ ] Redis password set 
- [ ] API rate limiting enabled 
- [ ] SSL/TLS certificate installed 
- [ ] Metrics endpoint protected 
- [ ] Regular security audits scheduled 
