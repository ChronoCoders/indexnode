use clap::{Parser, Subcommand};
use anyhow::Result;
use reqwest::Client;
use serde_json::json;

#[derive(Parser)]
#[command(name = "indexnode")]
#[command(about = "IndexNode CLI - Verifiable Web Crawling")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Crawl {
        #[arg(short, long)]
        url: String,
        #[arg(short, long, default_value = "1000")]
        max_pages: usize,
    },
    Status {
        #[arg(short, long)]
        job_id: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let cli = Cli::parse();
    let client = Client::new();
    let api_url = std::env::var("API_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());

    match cli.command {
        Commands::Crawl { url, max_pages } => {
            let response = client
                .post(format!("{}/api/v1/jobs", api_url))
                .json(&json!({
                    "url": url,
                    "max_pages": max_pages
                }))
                .send()
                .await?;

            let body: serde_json::Value = response.json().await?;
            println!("Job created: {}", serde_json::to_string_pretty(&body)?);
        }
        Commands::Status { job_id } => {
            let response = client
                .get(format!("{}/api/v1/jobs/{}", api_url, job_id))
                .send()
                .await?;

            let body: serde_json::Value = response.json().await?;
            println!("Job status: {}", serde_json::to_string_pretty(&body)?);
        }
    }

    Ok(())
}
