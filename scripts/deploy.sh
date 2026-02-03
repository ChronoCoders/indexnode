#!/bin/bash 
set -e 
 
echo "🚀 IndexNode Production Deployment" 
 
# Check prerequisites 
command -v docker >/dev/null 2>&1 || { echo "Docker required"; exit 1; } 
command -v git >/dev/null 2>&1 || { echo "Git required"; exit 1; } 
 
# Load environment variables 
if [ ! -f .env.production ]; then 
    echo "❌ .env.production not found" 
    exit 1 
fi 
 
source .env.production 
 
# Backup database 
echo "📦 Backing up database..." 
./scripts/backup_db.sh 
 
# Pull latest code 
echo "📥 Pulling latest code..." 
git pull origin main 
 
# Run migrations 
echo "🔄 Running database migrations..." 
docker compose -f deploy/docker-compose.yml run --rm api sqlx migrate run 
 
# Build and deploy 
echo "🏗️ Building containers..." 
docker compose -f deploy/docker-compose.yml build 
 
echo "🔄 Deploying services..." 
docker compose -f deploy/docker-compose.yml up -d 
 
# Health check 
echo "🏥 Running health checks..." 
sleep 10 
curl -f http://localhost:8080/health || { echo "❌ Health check failed"; exit 1; } 
 
echo "✅ Deployment complete!" 
echo "📊 Metrics: http://localhost:8080/metrics" 
echo "🎮 GraphQL: http://localhost:8080/graphql/playground" 
