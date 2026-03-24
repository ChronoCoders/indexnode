# IndexNode

Trustless blockchain intelligence platform. Indexes blockchain events, crawls web content, stores data on IPFS, and provides cryptographic proof of existence — all queryable via a GraphQL API.

## What it does

- **Blockchain indexing** — subscribes to EVM contract events and stores them with Merkle-verified content hashes
- **Web crawling** — HTTP and headless-browser crawls with AI-powered data extraction
- **IPFS storage** — content-addressed storage for crawl results and indexed datasets
- **Timestamp registry** — commits content hashes on-chain for provable existence proofs
- **Data marketplace** — buy and sell indexed datasets using on-chain credit tokens
- **Credit system** — ERC-20 token (`INC`) gates API usage; crawl jobs cost 100 credits, event indexing costs 50

## Architecture

```
┌─────────────────┐     GraphQL / REST      ┌──────────────────┐
│   Client / UI   │ ──────────────────────► │   indexnode-api  │
└─────────────────┘                          └────────┬─────────┘
                                                      │ PostgreSQL job queue
                                             ┌────────▼─────────┐
                                             │ indexnode-worker  │
                                             └────────┬─────────┘
                                    ┌─────────────────┼─────────────────┐
                                    ▼                 ▼                 ▼
                              Ethereum RPC         IPFS node      Anthropic API
```

**Crates**

| Crate | Description |
|---|---|
| `indexnode-core` | Crawler, blockchain client, IPFS, marketplace, Merkle, job queue |
| `indexnode-api` | Axum HTTP server, GraphQL schema, auth, middleware |

**Infrastructure**

| Service | Role |
|---|---|
| PostgreSQL | Primary store — jobs, events, crawl results, users, audit log |
| Redis | Rate limiter state, distributed worker coordination |
| IPFS | Content-addressed dataset storage |
| Ethereum RPC | Event indexing and on-chain hash commits |

## Prerequisites

- Rust 1.75+
- PostgreSQL 15+
- Redis 7+
- An Ethereum RPC endpoint (e.g. Alchemy, Infura, or local node)
- An IPFS node (local or Infura IPFS)
- Anthropic API key (for AI extraction)

## Setup

### 1. Environment variables

Copy and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `ETHEREUM_RPC_URL` | EVM-compatible WebSocket RPC URL |
| `CREDIT_CONTRACT_ADDRESS` | Deployed `CreditToken` contract address |
| `CREDIT_PRIVATE_KEY` | Private key of the contract owner wallet |
| `MARKETPLACE_CONTRACT_ADDRESS` | Deployed `DataMarketplace` contract address |
| `ANTHROPIC_API_KEY` | Claude API key for AI extraction |
| `IPFS_API_URL` | IPFS HTTP API (default: `http://127.0.0.1:5001`) |
| `ALLOWED_ORIGIN` | CORS origin (e.g. `https://app.example.com`) |
| `SERVE_FRONTEND` | Set to `true` to serve the `frontend/` directory |
| `CRAWL_TIMEOUT_SECS` | Crawl timeout in seconds (default: `120`) |
| `AI_TIMEOUT_SECS` | AI extraction timeout in seconds (default: `30`) |
| `BROWSER_DISABLE_SANDBOX` | Set to `1` only in Docker environments that lack user namespaces |

### 2. Database migrations

```bash
sqlx migrate run
```

Migrations live in `migrations/` and are numbered sequentially (`001` through `012`).

### 3. Run locally

```bash
# API server
cargo run --bin indexnode-api

# Worker (separate terminal)
cargo run --bin indexnode-worker
```

### 4. Docker (production)

```bash
docker compose -f deploy/docker-compose.yml up -d
```

Or use the deploy script (requires `.env.production`):

```bash
./scripts/deploy.sh
```

## API

### Authentication

```
POST /api/v1/auth/register   { "email": "...", "password": "..." }
POST /api/v1/auth/login      { "email": "...", "password": "..." }
```

Returns a JWT. Include it on subsequent requests:

```
Authorization: Bearer <token>
```

Password requirements: 12+ characters, uppercase, lowercase, digit, special character.

### REST endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/jobs` | Create an HTTP crawl job |
| `GET` | `/api/v1/jobs/:id` | Get job status |
| `POST` | `/api/v1/verify` | Verify a content hash against on-chain commits |
| `GET` | `/metrics` | Prometheus metrics |

### GraphQL

```
POST /graphql
GET  /graphql/playground
```

**Key queries**

```graphql
query {
  blockchainEvents(contractAddress: "0x...", eventName: "Transfer") {
    id transactionHash blockNumber contentHash
  }
  myJobs { id status createdAt }
  systemMetrics { totalJobs activeWorkers }   # admin only
}
```

**Key mutations**

```graphql
mutation {
  createBlockchainJob(contractAddress: "0x...", eventNames: ["Transfer"], chain: "ethereum") { id }
  purchaseCredits(amount: 1000) { balance }
  createMarketplaceListing(datasetName: "...", priceCredits: 500, ipfsCid: "Qm...") { id }
  purchaseDataset(listingId: "...") { ipfsCid }
}
```

**Subscriptions** — delivered via PostgreSQL `LISTEN/NOTIFY`:

```graphql
subscription {
  blockchainEventStream(contractAddress: "0x...") {
    eventName transactionHash blockNumber
  }
}
```

## Smart contracts

Source in `contracts/`. Deployed with Foundry (`foundry.toml`).

| Contract | Description |
|---|---|
| `CreditToken.sol` | ERC-20 `INC` token; `purchaseCredits` / `spendCredits` |
| `TimestampRegistry.sol` | `commitHash` / `verifyHash` for on-chain existence proofs |
| `DataMarketplace.sol` | Peer-to-peer dataset listings and purchases |

## Security

- JWT authentication with role-based access control (`user` / `admin`)
- Per-IP rate limiting (10 req/s, burst 20) and per-user rate limiting on GraphQL (5 req/s)
- Input validation and HTML sanitization on all user-supplied strings
- Ethereum address and IPFS CID format validation
- Private keys zeroed from memory after use (`zeroize`)
- Audit log for all sensitive operations (login, job creation, purchases)
- Docker containers run as non-root (`appuser`)
- Security response headers (CSP, X-Frame-Options, Referrer-Policy)

## License

MIT
