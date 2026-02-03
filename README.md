# IndexNode - Blockchain-Native Web Crawler 
 
**"Web data you can prove"** 
 
IndexNode is a production-grade blockchain infrastructure platform for indexing, verifying, and monetizing on-chain data. 
 
## Features 
 
- ✅ **Blockchain Event Indexing** - Real-time indexing of smart contract events 
- ✅ **On-Chain Timestamping** - Cryptographic proof of data existence 
- ✅ **IPFS Storage** - Decentralized content persistence 
- ✅ **AI-Powered Extraction** - Claude API integration for intelligent data parsing 
- ✅ **Token Credits System** - ERC-20 payment infrastructure 
- ✅ **Distributed Workers** - Horizontal scaling with Redis 
- ✅ **Advanced Crawler** - Chrome headless with CAPTCHA solving 
- ✅ **Data Marketplace** - Buy/sell indexed datasets with escrow 
- ✅ **GraphQL API** - Modern developer experience with WebSocket subscriptions 
- ✅ **Prometheus Metrics** - Production observability 
 
## Architecture 
 
``` 
┌─────────────┐     ┌──────────────┐     ┌─────────────┐ 
│   GraphQL   │────▶│  API Server  │────▶│  PostgreSQL │ 
│  Endpoint   │     │   (Axum)     │     │             │ 
└─────────────┘     └──────────────┘     └─────────────┘ 
                           │ 
                           ▼ 
                    ┌──────────────┐ 
                    │    Redis     │ 
                    │ (Job Queue)  │ 
                    └──────────────┘ 
                           │ 
                           ▼ 
                    ┌──────────────┐ 
                    │   Workers    │ 
                    │ (Distributed)│ 
                    └──────────────┘ 
                           │ 
            ┌──────────────┼──────────────┐ 
            ▼              ▼              ▼ 
    ┌──────────┐   ┌──────────┐   ┌──────────┐ 
    │Ethereum  │   │   IPFS   │   │ Claude   │ 
    │   RPC    │   │          │   │   API    │ 
    └──────────┘   └──────────┘   └──────────┘ 
``` 
 
## Quick Start 
 
### Prerequisites 
 
- Rust 1.75+ 
- Docker & Docker Compose 
- PostgreSQL 15+ 
- Redis 7+ 
 
### Installation 
 
```bash 
git clone https://github.com/ChronoCoders/indexnode.git  
cd indexnode 
 
# Copy environment template 
cp .env.example .env 
 
# Configure your environment variables 
# - Database credentials 
# - Ethereum RPC endpoints 
# - API keys (Anthropic, Pinata, 2captcha) 
 
# Run migrations 
sqlx migrate run 
 
# Start services 
cargo run --bin indexnode-api 
``` 
 
### Docker Deployment 
 
```bash 
cd deploy 
docker-compose up -d 
``` 
 
## API Documentation 
 
### GraphQL Endpoint 
 
``` 
http://localhost:8080/graphql 
``` 
 
**Example Query:** 
```graphql 
query { 
  blockchainEvents(contractAddress: "0x...", limit: 10) { 
    id 
    eventName 
    blockNumber 
    transactionHash 
  } 
} 
``` 
 
**Example Mutation:** 
```graphql 
mutation { 
  createBlockchainJob(input: { 
    chain: "ethereum" 
    contractAddress: "0x..." 
    events: ["Transfer", "Swap"] 
    fromBlock: 18000000 
  }) { 
    id 
    status 
  } 
} 
``` 
 
### REST Endpoints 
 
- `GET /health` - Health check 
- `POST /api/v1/verify` - Verify content hash 
- `GET /metrics` - Prometheus metrics 
 
## Production Deployment 
 
See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide. 
 
## Security 
 
- Argon2 password hashing 
- Rate limiting (10 req/s) 
- Input validation on all endpoints 
- SQL injection prevention 
- Account lockout after failed attempts 
 
## Monitoring 
 
Prometheus metrics available at `/metrics`: 
- `http_requests_total` 
- `blockchain_events_indexed` 
- `ai_extractions_performed` 
- `active_workers` 
- `queue_depth` 
 
## License 
 
MIT License - see [LICENSE](./LICENSE) 
 
## Support 
 
- Documentation: https://docs.indexnode.io  
- GitHub Issues: https://github.com/ChronoCoders/indexnode/issues  
- Email: support@indexnode.io 
