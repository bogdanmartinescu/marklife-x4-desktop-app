use std::fmt::{Display, Formatter};

#[derive(Debug)]
pub struct BridgeError {
    pub code: &'static str,
    pub message: String,
}

impl BridgeError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl Display for BridgeError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for BridgeError {}

impl From<std::io::Error> for BridgeError {
    fn from(error: std::io::Error) -> Self {
        Self::new("PRINT_WRITE_FAILED", error.to_string())
    }
}

impl From<serde_json::Error> for BridgeError {
    fn from(error: serde_json::Error) -> Self {
        Self::new("PARSE_ERROR", error.to_string())
    }
}

impl From<rusb::Error> for BridgeError {
    fn from(error: rusb::Error) -> Self {
        Self::new("PRINT_WRITE_FAILED", format!("USB error: {error}"))
    }
}
