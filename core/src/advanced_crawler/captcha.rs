use anyhow::{Context, Result}; 
use reqwest::Client; 
use serde::{Deserialize, Serialize}; 
use std::time::Duration; 
use tokio::time::sleep; 
  
#[derive(Serialize)] 
struct CaptchaRequest { 
    key: String, 
    method: String, 
    googlekey: String, 
    pageurl: String, 
} 
  
#[derive(Deserialize)] 
struct CaptchaResponse { 
    status: i32, 
    request: String, 
} 
  
pub struct CaptchaSolver { 
    client: Client, 
    api_key: String, 
} 
  
impl CaptchaSolver { 
    pub fn new(api_key: String) -> Result<Self> { 
        let client = Client::builder() 
            .timeout(Duration::from_secs(120)) 
            .build() 
            .context("Failed to create HTTP client")?; 
        Ok(Self { client, api_key }) 
    } 
  
    pub async fn solve_recaptcha_v2(&self, site_key: &str, page_url: &str) -> Result<String> { 
        let request = CaptchaRequest { 
            key: self.api_key.clone(), 
            method: "userrecaptcha".to_string(), 
            googlekey: site_key.to_string(), 
            pageurl: page_url.to_string(), 
        }; 
          
        let response = self.client 
            .post("http://2captcha.com/in.php") 
            .form(&request) 
            .send() 
            .await 
            .context("Failed to submit CAPTCHA")?; 
          
        let captcha_response: CaptchaResponse = response.json().await 
            .context("Failed to parse CAPTCHA response")?; 
          
        if captcha_response.status != 1 { 
            anyhow::bail!("CAPTCHA submission failed: {}", captcha_response.request); 
        } 
          
        let captcha_id = captcha_response.request; 
          
        for _ in 0..30 { 
            sleep(Duration::from_secs(5)).await; 
              
            let result = self.get_captcha_result(&captcha_id).await?; 
            if !result.is_empty() { 
                return Ok(result); 
            } 
        } 
          
        anyhow::bail!("CAPTCHA solving timeout") 
    } 
  
    async fn get_captcha_result(&self, captcha_id: &str) -> Result<String> { 
        let url = format!( 
            "http://2captcha.com/res.php?key={}&action=get&id={}", 
            self.api_key, captcha_id 
        ); 
          
        let response = self.client.get(&url).send().await?; 
        let text = response.text().await?; 
          
        if text.starts_with("OK|") { 
            Ok(text.strip_prefix("OK|").unwrap_or("").to_string()) 
        } else if text == "CAPCHA_NOT_READY" {
            Ok(String::new())
        } else { 
            anyhow::bail!("CAPTCHA solving error: {}", text);
        } 
    } 
} 
