use anyhow::{Context, Result};
use reqwest::Client;
use scraper::{Html, Selector};
use url::Url;

pub struct Crawler {
    client: Client,
}

impl Crawler {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("IndexNode/1.0 (https://github.com/chronocoders)")
                .timeout(std::time::Duration::from_secs(15))
                .redirect(reqwest::redirect::Policy::limited(5))
                .build()
                .expect("Failed to build HTTP client"),
        }
    }

    pub async fn crawl(&self, url: &str, max_pages: usize) -> Result<Vec<String>> {
        let base_url = Url::parse(url).context("Invalid URL provided")?;

        let response = self
            .client
            .get(url)
            .send()
            .await
            .context("Failed to fetch page")?;

        if !response.status().is_success() {
            anyhow::bail!("HTTP error: {}", response.status());
        }

        let html = response
            .text()
            .await
            .context("Failed to read response body")?;

        let document = Html::parse_document(&html);
        let selector = Selector::parse("a[href]").expect("Valid CSS selector");

        let links: Vec<String> = document
            .select(&selector)
            .filter_map(|element| element.value().attr("href"))
            .filter_map(|href| base_url.join(href).ok())
            .filter(|url| {
                let scheme = url.scheme();
                scheme == "http" || scheme == "https"
            })
            .take(max_pages)
            .map(|url| url.to_string())
            .collect();

        Ok(links)
    }
}

impl Default for Crawler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_crawler_basic() {
        let crawler = Crawler::new();
        let result = crawler.crawl("https://example.com", 10).await;
        assert!(result.is_ok());
    }
}
