use anyhow::{Context, Result};
use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::Page;
use futures::StreamExt;
use std::sync::Arc;
use tokio::sync::Semaphore;

pub struct BrowserPool {
    browser: Browser,
    semaphore: Arc<Semaphore>,
}

impl BrowserPool {
    pub async fn new(max_concurrent: usize) -> Result<Self> {
        let mut config_builder = BrowserConfig::builder();
        // Sandbox must be enabled for security. Only disable in isolated container
        // environments where the kernel provides process-level isolation instead
        // (e.g., Docker with a restrictive seccomp profile). Never disable in
        // environments where the crawler processes untrusted URLs from end-users.
        if std::env::var("BROWSER_DISABLE_SANDBOX").as_deref() == Ok("1") {
            config_builder = config_builder.no_sandbox();
        }
        let (browser, mut handler) = Browser::launch(
            config_builder
                .args(vec![
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-background-networking",
                ])
                .build()
                .map_err(|e| anyhow::anyhow!(e))
                .context("Failed to build browser config")?,
        )
        .await
        .context("Failed to launch browser")?;

        tokio::spawn(async move {
            while let Some(event) = handler.next().await {
                if let Err(e) = event {
                    tracing::error!("Browser event error: {}", e);
                }
            }
        });

        Ok(Self {
            browser,
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
        })
    }

    pub async fn get_session(&self) -> Result<BrowserSession> {
        let permit = self
            .semaphore
            .clone()
            .acquire_owned()
            .await
            .context("Failed to acquire session permit")?;

        let page = self
            .browser
            .new_page("about:blank")
            .await
            .context("Failed to create new page")?;

        Ok(BrowserSession {
            page,
            _permit: permit,
        })
    }
}

pub struct BrowserSession {
    page: Page,
    _permit: tokio::sync::OwnedSemaphorePermit,
}

impl BrowserSession {
    pub async fn navigate(&mut self, url: &str) -> Result<()> {
        self.page.goto(url).await.context("Failed to navigate")?;

        self.page
            .wait_for_navigation()
            .await
            .context("Failed to wait for navigation")?;

        Ok(())
    }

    pub async fn get_html(&self) -> Result<String> {
        let html = self
            .page
            .content()
            .await
            .context("Failed to get page content")?;
        Ok(html)
    }

    pub async fn execute_js(&self, script: &str) -> Result<serde_json::Value> {
        let result = self
            .page
            .evaluate(script)
            .await
            .context("Failed to execute JavaScript")?;

        let value = result
            .into_value()
            .context("Failed to extract value from JS result")?;

        Ok(value)
    }

    pub async fn screenshot(&self) -> Result<Vec<u8>> {
        let screenshot = self
            .page
            .screenshot(
                chromiumoxide::page::ScreenshotParams::builder()
                    .full_page(true)
                    .build(),
            )
            .await
            .context("Failed to take screenshot")?;

        Ok(screenshot)
    }

    pub async fn wait_for_selector(&mut self, selector: &str) -> Result<()> {
        self.page
            .find_element(selector)
            .await
            .context("Failed to find element")?;
        Ok(())
    }
}
