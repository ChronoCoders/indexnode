use spider::website::Website;
use anyhow::Result;

pub struct Crawler;

impl Crawler {
    pub fn new() -> Self {
        Self
    }

    pub async fn crawl(&self, url: &str, max_pages: usize) -> Result<Vec<String>> {
        let mut website = Website::new(url);
        website.configuration.respect_robots_txt = true;
        website.crawl().await;

        let links: Vec<String> = website
            .get_links()
            .iter()
            .take(max_pages)
            .map(|link| link.as_ref().to_string())
            .collect();

        Ok(links)
    }
}
