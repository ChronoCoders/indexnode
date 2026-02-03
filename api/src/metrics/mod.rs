use metrics::{counter, histogram, gauge, describe_counter, describe_histogram, describe_gauge}; 
use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle}; 
use std::time::Instant; 

pub fn init_metrics() -> anyhow::Result<PrometheusHandle> { 
    let handle = PrometheusBuilder::new() 
        .set_buckets_for_metric( 
            Matcher::Full("http_request_duration_seconds".to_string()), 
            &[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0] 
        )? 
        .install_recorder()?; 
    
    describe_counter!("http_requests_total", "Total HTTP requests"); 
    describe_counter!("blockchain_events_indexed", "Total blockchain events indexed"); 
    describe_counter!("ai_extractions_performed", "Total AI extractions"); 
    describe_counter!("ipfs_uploads", "Total IPFS content uploads"); 
    describe_counter!("credit_transactions", "Total credit transactions"); 
    describe_histogram!("http_request_duration_seconds", "HTTP request duration"); 
    describe_histogram!("job_processing_duration_seconds", "Job processing duration"); 
    describe_gauge!("active_workers", "Number of active workers"); 
    describe_gauge!("queue_depth", "Number of jobs in queue"); 
    
    Ok(handle) 
} 

pub fn record_http_request(method: &str, path: &str, status: u16, duration: f64) { 
    counter!("http_requests_total", "method" => method.to_string(), "path" => path.to_string(), "status" => status.to_string()).increment(1); 
    histogram!("http_request_duration_seconds", "method" => method.to_string(), "path" => path.to_string()).record(duration); 
} 

pub fn record_blockchain_event() { 
    counter!("blockchain_events_indexed").increment(1); 
} 

pub fn record_ai_extraction() { 
    counter!("ai_extractions_performed").increment(1); 
} 

pub fn record_ipfs_upload(size_bytes: u64) { 
    counter!("ipfs_uploads").increment(1); 
    histogram!("ipfs_upload_size_bytes").record(size_bytes as f64); 
} 

pub fn update_active_workers(count: i64) { 
    gauge!("active_workers").set(count as f64); 
} 

pub fn update_queue_depth(depth: i64) { 
    gauge!("queue_depth").set(depth as f64); 
} 

pub struct TimedOperation { 
    start: Instant, 
    metric_name: String, 
} 

impl TimedOperation { 
    pub fn new(metric_name: &str) -> Self { 
        Self { 
            start: Instant::now(), 
            metric_name: metric_name.to_string(), 
        } 
    } 
} 

impl Drop for TimedOperation { 
    fn drop(&mut self) { 
        let duration = self.start.elapsed().as_secs_f64(); 
        histogram!(self.metric_name.clone()).record(duration); 
    } 
} 
