use axum::{ 
    extract::Request, 
    middleware::Next, 
    response::Response, 
}; 
use std::time::Instant; 

pub async fn track_metrics(req: Request, next: Next) -> Response { 
    let method = req.method().to_string(); 
    let path = req.uri().path().to_string(); 
    let start = Instant::now(); 
    
    let response = next.run(req).await; 
    
    let duration = start.elapsed().as_secs_f64(); 
    let status = response.status().as_u16(); 
    
    crate::metrics::record_http_request(&method, &path, status, duration); 
    
    response 
} 
