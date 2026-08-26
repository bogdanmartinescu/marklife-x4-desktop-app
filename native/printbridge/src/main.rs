use serde_json::json;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use printbridge::errors::BridgeError;
use printbridge::printers;
use printbridge::protocol::{parse_request, Response};

#[tokio::main]
async fn main() {
    if let Err(error) = run().await {
        eprintln!("printbridge fatal: {error}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), BridgeError> {
    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin);
    let mut stdout = tokio::io::stdout();
    let mut line = String::new();

    loop {
        line.clear();
        let read = reader
            .read_line(&mut line)
            .await
            .map_err(|error| BridgeError::new("PARSE_ERROR", error.to_string()))?;
        if read == 0 {
            break;
        }
        if line.trim().is_empty() {
            continue;
        }

        let response = match parse_request(&line) {
            Ok(request) => match dispatch(&request.method, &request.params).await {
                Ok(result) => Response::ok(&request.id, result),
                Err(error) => Response::err(&request.id, &error),
            },
            Err(error) => Response::err("unknown", &error),
        };

        let mut encoded = serde_json::to_string(&response)?;
        encoded.push('\n');
        stdout
            .write_all(encoded.as_bytes())
            .await
            .map_err(|error| BridgeError::new("PRINTBRIDGE_PROTOCOL_ERROR", error.to_string()))?;
        stdout
            .flush()
            .await
            .map_err(|error| BridgeError::new("PRINTBRIDGE_PROTOCOL_ERROR", error.to_string()))?;
    }

    Ok(())
}

async fn dispatch(
    method: &str,
    params: &serde_json::Value,
) -> Result<serde_json::Value, BridgeError> {
    match method {
        "bridge.version" => Ok(json!({
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
        })),
        "printers.list" => Ok(serde_json::to_value(printers::list_os_printers()?)?),
        "printers.listUsb" => Ok(serde_json::to_value(printers::list_usb_printers()?)?),
        "printers.listBluetoothSpp" => Ok(serde_json::to_value(printers::list_bluetooth_spp()?)?),
        "printers.scanBle" => {
            let duration_ms = params
                .get("durationMs")
                .and_then(serde_json::Value::as_u64)
                .unwrap_or(10_000);
            Ok(serde_json::to_value(
                printers::scan_ble(duration_ms).await?,
            )?)
        }
        "printer.printRawFile" => printers::print_raw_file(params).await,
        "printer.printTcpFile" => {
            let mut merged = params.clone();
            if let Some(object) = merged.as_object_mut() {
                object.insert("backend".into(), json!("tcp"));
            }
            printers::print_raw_file(&merged).await
        }
        "diagnostics.system" => Ok(json!({
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
        })),
        _ => Err(BridgeError::new(
            "METHOD_NOT_FOUND",
            format!("Unknown method: {method}"),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn version_method() {
        let result = dispatch("bridge.version", &json!({})).await.unwrap();
        assert_eq!(result["version"], "0.1.0");
        assert_eq!(result["platform"], std::env::consts::OS);
    }

    #[tokio::test]
    async fn unknown_method() {
        let error = dispatch("nope", &json!({})).await.unwrap_err();
        assert_eq!(error.code, "METHOD_NOT_FOUND");
    }
}
