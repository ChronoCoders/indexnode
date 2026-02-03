use serde::{Deserialize, Serialize}; 
  
#[derive(Debug, Clone, Serialize, Deserialize)] 
pub struct StealthConfig { 
    pub user_agent: String, 
    pub viewport_width: u32, 
    pub viewport_height: u32, 
    pub locale: String, 
    pub timezone: String, 
} 
  
impl Default for StealthConfig { 
    fn default() -> Self { 
        Self { 
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string(), 
            viewport_width: 1920, 
            viewport_height: 1080, 
            locale: "en-US".to_string(), 
            timezone: "America/New_York".to_string(), 
        } 
    } 
} 
  
impl StealthConfig { 
    pub fn random_user_agent() -> String { 
        let agents = [ 
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", 
        ]; 
          
        agents[fastrand::usize(..agents.len())].to_string() 
    } 
} 
