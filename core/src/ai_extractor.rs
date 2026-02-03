use anyhow::{Context, Result}; 
use reqwest::Client; 
use serde::{Deserialize, Serialize}; 
 
const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages"; 
 
#[derive(Serialize)] 
struct ClaudeRequest { 
    model: String, 
    max_tokens: u32, 
    messages: Vec<Message>, 
} 
 
#[derive(Serialize, Deserialize)] 
struct Message { 
    role: String, 
    content: String, 
} 
 
#[derive(Deserialize)] 
struct ClaudeResponse { 
    content: Vec<ContentBlock>, 
} 
 
#[derive(Deserialize)] 
struct ContentBlock { 
    text: String, 
} 
 
pub struct AIExtractor { 
    client: Client, 
    api_key: String, 
} 
 
impl AIExtractor { 
    pub fn new(api_key: String) -> Result<Self> { 
        let client = Client::builder() 
            .timeout(std::time::Duration::from_secs(60)) 
            .build() 
            .context("Failed to create HTTP client")?; 
        Ok(Self { client, api_key }) 
    } 
 
    pub async fn extract_structured_data(&self, raw_content: &str, schema: &str) -> Result<serde_json::Value> { 
        let prompt = format!( 
            "Extract structured data from the following content according to this schema:\n\nSchema:\n{}\n\nContent:\n{}\n\nReturn only valid JSON matching the schema.", 
            schema, raw_content 
        ); 
 
        let request = ClaudeRequest { 
            model: "claude-sonnet-4-20250514".to_string(), 
            max_tokens: 4096, 
            messages: vec![Message { 
                role: "user".to_string(), 
                content: prompt, 
            }], 
        }; 
 
        let response = self.client 
            .post(ANTHROPIC_API_URL) 
            .header("x-api-key", &self.api_key) 
            .header("anthropic-version", "2023-06-01") 
            .header("content-type", "application/json") 
            .json(&request) 
            .send() 
            .await 
            .context("Failed to send request to Claude API")?; 
 
        if !response.status().is_success() { 
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string()); 
            anyhow::bail!("Claude API error: {}", error_text); 
        } 
 
        let claude_response: ClaudeResponse = response.json().await 
            .context("Failed to parse Claude API response")?; 
 
        let extracted_text = claude_response.content 
            .first() 
            .context("No content in Claude response")? 
            .text.clone(); 
 
        let json_value = serde_json::from_str(&extracted_text) 
            .context("Failed to parse extracted JSON")?; 
 
        Ok(json_value) 
    } 
 
    pub async fn summarize_content(&self, content: &str, max_length: usize) -> Result<String> { 
        let prompt = format!( 
            "Summarize the following content in {} words or less:\n\n{}", 
            max_length, content 
        ); 
 
        let request = ClaudeRequest { 
            model: "claude-sonnet-4-20250514".to_string(), 
            max_tokens: 1024, 
            messages: vec![Message { 
                role: "user".to_string(), 
                content: prompt, 
            }], 
        }; 
 
        let response = self.client 
            .post(ANTHROPIC_API_URL) 
            .header("x-api-key", &self.api_key) 
            .header("anthropic-version", "2023-06-01") 
            .header("content-type", "application/json") 
            .json(&request) 
            .send() 
            .await 
            .context("Failed to send summarization request")?; 
 
        let claude_response: ClaudeResponse = response.json().await 
            .context("Failed to parse summarization response")?; 
 
        let summary = claude_response.content 
            .first() 
            .context("No summary in response")? 
            .text.clone(); 
 
        Ok(summary) 
    } 
 
    pub async fn classify_content(&self, content: &str, categories: &[String]) -> Result<String> { 
        let categories_str = categories.join(", "); 
        let prompt = format!( 
            "Classify the following content into one of these categories: {}.\n\nContent:\n{}\n\nReturn only the category name.", 
            categories_str, content 
        ); 
 
        let request = ClaudeRequest { 
            model: "claude-sonnet-4-20250514".to_string(), 
            max_tokens: 100, 
            messages: vec![Message { 
                role: "user".to_string(), 
                content: prompt, 
            }], 
        }; 
 
        let response = self.client 
            .post(ANTHROPIC_API_URL) 
            .header("x-api-key", &self.api_key) 
            .header("anthropic-version", "2023-06-01") 
            .header("content-type", "application/json") 
            .json(&request) 
            .send() 
            .await 
            .context("Failed to send classification request")?; 
 
        let claude_response: ClaudeResponse = response.json().await 
            .context("Failed to parse classification response")?; 
 
        let category = claude_response.content 
            .first() 
            .context("No classification in response")? 
            .text.trim().to_string(); 
 
        Ok(category) 
    } 
} 
 
#[cfg(test)] 
mod tests { 
    use super::*; 
 
    #[tokio::test] 
    async fn test_ai_extractor_init() -> Result<()> { 
        let extractor = AIExtractor::new("test-key".to_string())?; 
        assert!(!extractor.api_key.is_empty()); 
        Ok(()) 
    } 
} 
