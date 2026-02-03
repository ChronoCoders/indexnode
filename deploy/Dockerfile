FROM rust:1.75-slim as builder 
 
RUN apt-get update && apt-get install -y \ 
    pkg-config \ 
    libssl-dev \ 
    && rm -rf /var/lib/apt/lists/* 
 
WORKDIR /app 
 
COPY Cargo.toml Cargo.lock ./ 
COPY api ./api 
COPY core ./core 
COPY cli ./cli 
COPY migrations ./migrations 
 
RUN cargo install sqlx-cli --no-default-features --features postgres
RUN cargo build --release --bin indexnode-api 
 
FROM debian:bookworm-slim 
 
RUN apt-get update && apt-get install -y \ 
    ca-certificates \ 
    libssl3 \ 
    curl \
    && rm -rf /var/lib/apt/lists/* 
 
WORKDIR /app 
 
COPY --from=builder /usr/local/cargo/bin/sqlx /usr/local/bin/
COPY --from=builder /app/target/release/indexnode-api . 
COPY migrations ./migrations 
 
ENV RUST_LOG=info 
EXPOSE 8080 
 
CMD ["./indexnode-api"] 
