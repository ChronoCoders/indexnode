pub struct Sanitizer;

impl Sanitizer {
    pub fn sanitize_text(input: &str) -> String {
        input
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
            .collect()
    }

    pub fn remove_null_bytes(input: &str) -> String {
        input.replace('\0', "")
    }
}
