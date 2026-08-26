use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::errors::BridgeError;

#[derive(Debug, Deserialize)]
pub struct Request {
    pub id: String,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct Response {
    pub id: String,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ErrorBody>,
}

impl Response {
    pub fn ok(id: impl Into<String>, result: Value) -> Self {
        Self {
            id: id.into(),
            ok: true,
            result: Some(result),
            error: None,
        }
    }

    pub fn err(id: impl Into<String>, error: &BridgeError) -> Self {
        Self {
            id: id.into(),
            ok: false,
            result: None,
            error: Some(ErrorBody {
                code: error.code.to_string(),
                message: error.message.clone(),
            }),
        }
    }
}

pub fn parse_request(line: &str) -> Result<Request, BridgeError> {
    serde_json::from_str(line.trim()).map_err(|error| {
        BridgeError::new("PARSE_ERROR", format!("Invalid NDJSON request: {error}"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_version_request() {
        let request =
            parse_request(r#"{"id":"req_1","method":"bridge.version","params":{}}"#).unwrap();
        assert_eq!(request.id, "req_1");
        assert_eq!(request.method, "bridge.version");
    }

    #[test]
    fn reject_invalid_json() {
        let error = parse_request("not-json").unwrap_err();
        assert_eq!(error.code, "PARSE_ERROR");
    }

    #[test]
    fn success_response_serializes() {
        let json = serde_json::to_string(&Response::ok(
            "req_1",
            serde_json::json!({"version":"0.1.0"}),
        ))
        .unwrap();
        assert!(json.contains(r#""ok":true"#));
        assert!(json.contains(r#""id":"req_1""#));
    }
}
