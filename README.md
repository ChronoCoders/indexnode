# IndexNode

Verifiable Web Crawling Infrastructure

## Quick Start

### Prerequisites
- Rust 1.83+
- PostgreSQL 16+
- Docker (optional)

### Setup

1. Copy environment file:
```powershell
Copy-Item .env.example .env
```

2. Update DATABASE_URL in .env with your PostgreSQL connection

3. Build the project:
```powershell
cargo build --release
```

4. Run migrations:
```powershell
cargo install sqlx-cli
sqlx migrate run
```

5. Start API server:
```powershell
cargo run --bin indexnode-api
```

### Docker Deployment

```powershell
cd docker
docker-compose up -d
```

### CLI Usage

```powershell
cargo run --bin indexnode crawl --url https://example.com --max-pages 100
cargo run --bin indexnode status --job-id <job-id>
```

## API Endpoints

- POST /api/v1/auth/register - Register user
- POST /api/v1/auth/login - Login
- POST /api/v1/jobs - Create crawl job
- GET /api/v1/jobs/:id - Get job status

## Environment Variables

- DATABASE_URL - PostgreSQL connection string
- JWT_SECRET - Secret for JWT tokens
- RUST_LOG - Log level (info, debug, trace)
- API_URL - API base URL for CLI

## License

MIT
