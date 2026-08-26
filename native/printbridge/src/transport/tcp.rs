use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use crate::errors::BridgeError;

use super::PrintConfig;

pub fn send(config: &PrintConfig, bytes: &[u8]) -> Result<(), BridgeError> {
    let host = config
        .tcp_host
        .as_deref()
        .ok_or_else(|| BridgeError::new("TCP_CONNECTION_FAILED", "TCP host is required"))?;
    let port = config.tcp_port.unwrap_or(9100);
    let target = format!("{host}:{port}");
    let mut addrs = target.to_socket_addrs().map_err(|error| {
        BridgeError::new(
            "TCP_CONNECTION_FAILED",
            format!("Failed to resolve {target}: {error}"),
        )
    })?;
    let addr = addrs.next().ok_or_else(|| {
        BridgeError::new(
            "TCP_CONNECTION_FAILED",
            format!("No addresses resolved for {target}"),
        )
    })?;

    let mut stream =
        TcpStream::connect_timeout(&addr, Duration::from_secs(5)).map_err(|error| {
            BridgeError::new(
                "TCP_CONNECTION_FAILED",
                format!("Failed to connect to {target}: {error}"),
            )
        })?;
    stream
        .set_write_timeout(Some(Duration::from_secs(30)))
        .map_err(|error| BridgeError::new("TCP_CONNECTION_FAILED", error.to_string()))?;
    stream
        .write_all(bytes)
        .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?;
    stream
        .flush()
        .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?;
    Ok(())
}
