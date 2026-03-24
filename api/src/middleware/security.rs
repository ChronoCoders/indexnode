use axum::{
    extract::Request,
    http::{header, HeaderValue, StatusCode},
    middleware::Next,
    response::Response,
};

pub async fn validate_request_security(req: Request, next: Next) -> Result<Response, StatusCode> {
    let uri = req.uri().path();

    if uri.len() > 2048 {
        return Err(StatusCode::URI_TOO_LONG);
    }

    if let Some(content_type) = req.headers().get("content-type") {
        let ct_str = content_type.to_str().unwrap_or("");
        if !ct_str.starts_with("application/json")
            && !ct_str.starts_with("application/graphql")
            && !ct_str.starts_with("multipart/form-data")
            && !ct_str.starts_with("text/html")
        {
            return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE);
        }
    }

    let mut response = next.run(req).await;
    let headers = response.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("default-src 'self'"),
    );
    // Prevent browsers from caching sensitive API responses
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));

    Ok(response)
}
