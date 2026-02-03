use ammonia::clean; 
 
#[allow(dead_code)]
pub struct Sanitizer; 
 
impl Sanitizer { 
    #[allow(dead_code)]
    pub fn sanitize_html(input: &str) -> String { 
        clean(input) 
    } 
 
    pub fn sanitize_text(input: &str) -> String { 
        input 
            .chars() 
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\t') 
            .collect() 
    } 
 
    #[allow(dead_code)]
    pub fn escape_sql_like(input: &str) -> String { 
        input.replace('%', "\\%").replace('_', "\\_") 
    } 
 
    #[allow(dead_code)]
    pub fn remove_null_bytes(input: &str) -> String { 
        input.replace('\0', "") 
    } 
} 
