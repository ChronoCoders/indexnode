# CLAUDE.md — IndexNode

Project context for Claude Code. Keep this up to date as the project evolves.

## What this is

Trustless blockchain intelligence platform. Indexes blockchain events, crawls web content, stores data on IPFS, and provides cryptographic proof of existence via a GraphQL/REST API.

Core capabilities: blockchain event indexing, HTTP/headless-browser crawling, IPFS storage, on-chain timestamp registry, data marketplace, ERC-20 credit system (INC token).

## Codebase layout

```
api/        — Axum HTTP server, GraphQL schema, auth, middleware, embedded worker
core/       — Crawler, blockchain client, IPFS, marketplace, Merkle, job queue
cli/        — CLI entry point
contracts/  — Solidity contracts (Foundry project)
frontend/   — Static HTML/JS frontend
deploy/     — docker-compose
```

Single binary (`indexnode-api`). HTTP server and job worker run as concurrent components of the same process — worker in a dedicated OS thread sharing the Postgres pool.

## Tech stack

- **Backend**: Rust, Axum, async-graphql, sqlx (Postgres), ethers-rs, tokio
- **Frontend**: Static HTML + Tailwind (local build) + vanilla JS. No framework.
- **Contracts**: Solidity 0.8, OpenZeppelin upgradeable, UUPS proxy pattern
- **Toolchain**: Foundry (canonical — compile, test, deploy). Hardhat was added in a previous session but nothing consumes its artifacts; it should be removed.

## Contracts

| Contract | Purpose |
|---|---|
| `CreditToken` (INC) | ERC-20, 1B fixed supply, burn-on-spend, deflationary |
| `DataMarketplace` | UUPS upgradeable, SafeERC20, nonReentrant, 5% platform fee |
| `TimestampRegistry` | UUPS upgradeable, permissionless hash commitment (by design) |

All upgradeable contracts have a `uint256[50] private __gap` storage gap.

ABI JSON files live in `contracts/` and are read directly by the Rust backend via ethers-rs `abigen!`. Foundry outputs to `out/`. **Do not use hardhat-artifacts — they are unused and stale.**

## Auth model

- JWT issued on login, stored as **HttpOnly cookie** (`auth_token`). Not in localStorage.
- `auth_present=1` is a non-HttpOnly cookie used as a JS-readable auth signal.
- `user_id` in localStorage is non-sensitive (display only).
- REST middleware (`require_auth`) checks Bearer header first, then falls back to the `auth_token` cookie.
- GraphQL endpoint (`/graphql`) has **no auth middleware** by design — subscriptions and playground need public access. Auth is enforced per-resolver via `ctx.data_opt::<Uuid>()`.
- Frontend `gql()` uses `credentials: 'include'` (no Authorization header) so the HttpOnly cookie is sent automatically.

## Credit system

- 50 credits per job (both REST HttpCrawl and GraphQL BlockchainIndex).
- Credit check and job creation are **atomic** — single transaction: `UPDATE user_credits SET credit_balance = credit_balance - 50 WHERE user_id = $1 AND credit_balance >= 50`, then INSERT job.
- On-chain spend (`spend_credits`) runs in the worker after job completion. DB balance is only decremented **after** a confirmed on-chain spend.

## Known decisions / constraints

- `TimestampRegistry.commitHash` is permissionless — intentional, public timestamping use case.
- GraphQL job query (`Query::job`) is scoped to the authenticated user (`AND user_id = $2`).
- REST `get_job` is scoped to the authenticated user (`AND user_id = $2`).
- SSRF protection resolves hostnames via `tokio::net::lookup_host` and rejects private/loopback/link-local ranges for both IPv4 and IPv6.

## Git / commits

- Author: ChronoCoders <altug@bytus.io>
- Never add Claude as co-author or in commit messages.

## Hardhat situation

`hardhat.config.js` and `hardhat-artifacts/` exist but are unused. Added in a previous session with no clear purpose — Foundry is the canonical toolchain. These should be removed and `package.json` reverted to drop the hardhat devDependencies.
