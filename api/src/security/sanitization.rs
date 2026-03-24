pub struct Sanitizer;

impl Sanitizer {
    /// Strips control characters (except newline and tab) from user-supplied text.
    pub fn sanitize_text(input: &str) -> String {
        input
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
            .collect()
    }

    /// Removes null bytes that could cause truncation issues in some systems.
    pub fn remove_null_bytes(input: &str) -> String {
        input.replace('\0', "")
    }
}
