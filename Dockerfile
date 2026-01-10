FROM rust:1.84-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY api ./api
COPY core ./core
COPY migrations ./migrations

RUN cargo build --release --bin indexnode-api

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/indexnode-api /usr/local/bin/indexnode-api
COPY --from=builder /app/migrations /app/migrations

ENV RUST_LOG=info

EXPOSE 3000

CMD ["indexnode-api"]
