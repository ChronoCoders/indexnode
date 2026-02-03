use axum::{extract::Request, middleware::Next, response::Response, http::StatusCode}; 
#[allow(unused_imports)]
use crate::security::{InputValidator, Sanitizer}; 
 
pub async fn validate_request_security(req: Request, next: Next) -> Result<Response, StatusCode> { 
    let uri = req.uri().path(); 
    
    if uri.len() > 2048 { 
        return Err(StatusCode::URI_TOO_LONG); 
    } 
    
    if let Some(content_type) = req.headers().get("content-type") { 
        let ct_str = content_type.to_str().unwrap_or(""); 
        if !ct_str.starts_with("application/json") 
            && !ct_str.starts_with("application/graphql") 
            && !ct_str.starts_with("multipart/form-data") { 
            return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE); 
        } 
    } 
    
    Ok(next.run(req).await) 
} 
