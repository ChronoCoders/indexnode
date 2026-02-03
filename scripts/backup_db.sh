#!/bin/bash 
set -e 
 
BACKUP_DIR="./backups" 
TIMESTAMP=$(date +%Y%m%d_%H%M%S) 
BACKUP_FILE="$BACKUP_DIR/indexnode_$TIMESTAMP.sql" 
 
mkdir -p $BACKUP_DIR 
 
echo "📦 Creating database backup..." 
 
docker compose -f deploy/docker-compose.yml exec -T postgres \ 
    pg_dump -U indexnode indexnode > $BACKUP_FILE 
 
gzip $BACKUP_FILE 
 
echo "✅ Backup created: $BACKUP_FILE.gz" 
 
# Keep only last 7 days of backups 
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete 
