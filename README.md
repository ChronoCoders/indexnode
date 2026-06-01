# IndexNode

Trustless blockchain intelligence platform — indexes blockchain events, crawls web content, stores data on IPFS, and provides cryptographic proof of existence via a GraphQL/REST API.

## What it does

- **Blockchain event indexing.** Watches Ethereum and Polygon contracts for configured event signatures, normalises and stores them with a content hash for each event batch.
- **Web crawling.** HTTP crawler with SSRF protection (private/loopback/link-local IPv4 and IPv6 ranges rejected after DNS resolution).
- **IPFS storage.** Every blockchain event batch is uploaded and pinned. Pinata is used when `PINATA_JWT` is configured; otherwise a local IPFS daemon (default `http://127.0.0.1:5001`).
- **On-chain timestamp registry.** Merkle root of indexed batches is committed to the `TimestampRegistry` UUPS contract, giving permissionless proof-of-existence for any indexed payload.
- **AI extraction.** Optional structured-data extraction from event payloads via the Anthropic API.
- **Data marketplace.** Sellers list datasets at a price in INC; buyers pay through the `DataMarketplace` UUPS contract; a 5% platform fee accrues to the contract for `withdrawFees`.
- **Credit system.** ERC-20 `CreditToken` (INC, 1B fixed supply). Users lock tokens as platform credits; the worker burns credits on job execution. 1000 free credits granted on signup.

## Architecture

Single Rust binary (`indexnode-api`). The HTTP server and the job worker run as concurrent components of the same process — the worker lives in a dedicated OS thread sharing the Postgres connection pool with the Axum server.

- **API layer** — Axum HTTP server, `async-graphql` for GraphQL queries / mutations / WebSocket subscriptions, JWT auth via HttpOnly cookie.
- **Worker** — pulls queued jobs from the `jobs` table, executes them (crawl or blockchain indexing), pins results to IPFS, commits Merkle roots on-chain, calls `spendCredits` on the `CreditToken` contract.
- **PostgreSQL** is the source of truth for users, credits, jobs, results, indexed events, IPFS records, API keys, webhook subscriptions, audit log, and password-reset tokens. Migrations live in `migrations/` and run automatically on API startup.
- **Frontend** — under rewrite. The previous static HTML + vanilla JS surface has been removed; a Next.js / TypeScript / Tailwind frontend will replace it. The Rust binary no longer serves any static assets — it speaks REST and GraphQL only.
- **Contracts** — three Solidity contracts deployed by `script/Deploy.s.sol`. The deploy script transfers ownership to a multisig in the same broadcast, so the deployer EOA has no upgrade authority after the transaction completes.

```
api/        Axum HTTP server, GraphQL schema, auth middleware, embedded worker
core/       Crawler, blockchain client, IPFS storage, credit / timestamp / marketplace clients, Merkle, job queue
cli/        CLI for crawl + status (out of the cargo workspace by design)
contracts/  Solidity contracts and tests (Foundry)
deploy/     docker-compose, nginx
migrations/ Postgres migrations
scripts/    Operational scripts (backup, deploy, security audit)
```

## Prerequisites

- **Rust** 1.75+
- **PostgreSQL** 15+
- **Ethereum WebSocket RPC** (mainnet, Sepolia, or a local Anvil)
- **IPFS** — Pinata account (recommended) or a local IPFS daemon
- **Foundry** for contract work (`forge`, `cast`)
- **Anthropic API key** (optional; enables AI extraction)

## Setup

### 1. Environment

Copy `.env.example` to `.env` and fill in the required values. The file documents which variables are required vs optional and explains the security-critical ones (`JWT_SECRET`, `COOKIE_SECURE`, `MULTISIG_OWNER` for deploys).

### 2. Database

```bash
createdb indexnode
sqlx migrate run
```

Migrations are also applied automatically when `indexnode-api` starts, so manual `sqlx migrate run` is optional.

### 3. Run locally

```bash
cargo run -p indexnode-api
```

The API listens on `PORT` (default 3000). It serves REST under `/api/v1/`, GraphQL under `/graphql`, and WebSocket subscriptions under `/graphql/ws`. Authentication uses an HttpOnly cookie set on `/api/v1/auth/login`; client `fetch` calls should pass `credentials: 'include'`.

### 4. Docker

```bash
docker compose -f deploy/docker-compose.yml up -d
```

This brings up Postgres, the API, and nginx with the production security headers (HSTS, CSP, X-Frame-Options, etc.).

### 5. Contracts

```bash
forge build
forge test
```

To deploy to a public network, fill in `.env.testnet` (including `MULTISIG_OWNER` and the six wallet addresses) and run:

```bash
source .env.testnet
forge script script/Deploy.s.sol --rpc-url sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY --broadcast --verify
```

## API overview

### REST

| Method | Path                          | Description                                  |
| ------ | ----------------------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/register`       | Create account, returns `user_id` (cookie auth) |
| POST   | `/api/v1/auth/login`          | Authenticate, sets `auth_token` HttpOnly cookie |
| POST   | `/api/v1/auth/logout`         | Clear auth cookies                           |
| GET    | `/api/v1/me`                  | Profile (email, role, created_at)            |
| POST   | `/api/v1/jobs`                | Submit a web crawl job (50 credits)          |
| GET    | `/api/v1/jobs/{id}`           | Job detail, scoped to caller                 |
| GET    | `/api/v1/api-keys`            | List the caller's API keys                   |
| POST   | `/api/v1/api-keys`            | Create an API key (one-time reveal)          |
| DELETE | `/api/v1/api-keys/{id}`       | Revoke an API key                            |
| GET    | `/api/v1/webhooks`            | List webhook subscriptions                   |
| POST   | `/api/v1/webhooks`            | Register a webhook                           |
| DELETE | `/api/v1/webhooks/{id}`       | Delete a webhook                             |
| GET    | `/health`                     | Liveness check                               |

### GraphQL

Endpoint: `POST /graphql`. Subscriptions: `WS /graphql/ws`. Playground: `GET /graphql/playground`.

Key queries:

- `job(id)` — single job (scoped to caller)
- `myJobs(limit)` — recent jobs for the caller
- `blockchainEvents(contractAddress, limit)` — indexed events
- `ipfsContent(cid)` — IPFS metadata for a CID
- `creditBalance` — current INC credit balance
- `walletInfo` — registered on-chain address + balance
- `aiExtractions(eventId)` — AI-extracted structured data for an event (scoped to caller)
- `marketplaceListings(activeOnly, limit)` — marketplace catalogue
- `rateLimitStatus` — caller's rate-limit window state

Key mutations:

- `createBlockchainJob(contractAddress, chain, eventName, fromBlock)` — 50 credits, atomic balance check
- `registerWallet(address)` — bind on-chain address to the account
- `syncCreditBalance` — pull on-chain locked credits into the DB view

## Smart contracts

| Contract            | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| `CreditToken` (INC) | ERC-20, 1B fixed supply, burn-on-spend, deflationary. Non-upgradeable.        |
| `DataMarketplace`   | UUPS-upgradeable marketplace with SafeERC20, nonReentrant, 5% platform fee.   |
| `TimestampRegistry` | UUPS-upgradeable permissionless hash commitment for proof-of-existence.      |

Both upgradeable contracts use a `uint256[50] private __gap` storage gap. `_authorizeUpgrade` is `onlyOwner`. The deploy script transfers ownership of all three contracts to `MULTISIG_OWNER` inside the same broadcast as `initialize`.

Contract tests live in `contracts/test/` and exercise happy paths, revert conditions, fee math, the `nonReentrant` guard (via a reentrant-token mock), UUPS upgrade authorization, and the `CreditToken` burn/balance invariant. Run with `forge test`.

## Security

- **Auth.** JWT issued only as an HttpOnly cookie (`auth_token`); never returned in the response body. `auth_present=1` is a non-HttpOnly companion cookie used by JS for UI state. `validate_token` pins the JWT algorithm to HS256 (`Validation::new(Algorithm::HS256)`), so `alg=none` and asymmetric variants are rejected.
- **CSRF.** `SameSite=Lax` on `auth_token` plus the `ALLOWED_ORIGIN` CORS allow-list. State-changing endpoints are POST/DELETE; Lax does not send the cookie on cross-site POST/DELETE.
- **Secure cookie.** `COOKIE_SECURE=1` must be set in any non-localhost deployment.
- **Rate limiting.** Two `tower_governor` layers — global IP-based (10 req/s, burst 20) applied to every route including `/graphql*`, and per-user (5 req/s, burst 20) applied to authenticated REST routes.
- **SSRF.** Hostnames are resolved with `tokio::net::lookup_host` and IPv4/IPv6 private, loopback, link-local, broadcast, and unspecified ranges are rejected before any outbound HTTP request.
- **Input validation.** Ethereum addresses, IPFS CIDs, URLs, and lengths are validated at every external boundary.
- **DOM XSS.** All user data in the dashboard is written via `textContent` or `createElement`; `innerHTML` is not used with interpolated data.
- **Audit log.** `db::audit_log` records register, login, login_failed, job creation, wallet registration, and credit-affecting actions.
- **Secret handling.** `CREDIT_PRIVATE_KEY` is wrapped in `Zeroizing` so the heap memory is wiped after the contract clients are built.

## License

Proprietary — All Rights Reserved. See [LICENSE](LICENSE).
