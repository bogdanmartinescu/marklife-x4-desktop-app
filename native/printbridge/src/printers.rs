use serde::Serialize;
use serde_json::{json, Value};

use crate::errors::BridgeError;
use crate::transport::{self, PrintConfig};

#[derive(Debug, Serialize)]
pub struct PrinterInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "systemName")]
    pub system_name: String,
    #[serde(rename = "isDefault")]
    pub is_default: bool,
    pub status: String,
    pub backend: String,
    #[serde(rename = "tcpHost", skip_serializing_if = "Option::is_none")]
    pub tcp_host: Option<String>,
    #[serde(rename = "tcpPort", skip_serializing_if = "Option::is_none")]
    pub tcp_port: Option<u16>,
    #[serde(rename = "usbVidPid", skip_serializing_if = "Option::is_none")]
    pub usb_vid_pid: Option<String>,
    #[serde(rename = "usbInterface", skip_serializing_if = "Option::is_none")]
    pub usb_interface: Option<u8>,
    #[serde(rename = "serialPort", skip_serializing_if = "Option::is_none")]
    pub serial_port: Option<String>,
    #[serde(rename = "btAddress", skip_serializing_if = "Option::is_none")]
    pub bt_address: Option<String>,
    #[serde(rename = "btServiceUuid", skip_serializing_if = "Option::is_none")]
    pub bt_service_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rssi: Option<i16>,
}

pub fn list_os_printers() -> Result<Vec<PrinterInfo>, BridgeError> {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        crate::transport::cups::list_printers()
    }
    #[cfg(target_os = "windows")]
    {
        crate::transport::windows::list_printers()
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Ok(Vec::new())
    }
}

pub fn list_usb_printers() -> Result<Vec<PrinterInfo>, BridgeError> {
    crate::transport::usb::list_devices()
}

pub fn list_bluetooth_spp() -> Result<Vec<PrinterInfo>, BridgeError> {
    crate::transport::serial::list_bluetooth_ports()
}

pub async fn scan_ble(duration_ms: u64) -> Result<Vec<PrinterInfo>, BridgeError> {
    crate::transport::ble::scan(duration_ms).await
}

pub fn print_config_from_params(params: &Value) -> Result<PrintConfig, BridgeError> {
    let backend = params
        .get("backend")
        .and_then(Value::as_str)
        .unwrap_or("cups")
        .to_string();

    Ok(PrintConfig {
        backend,
        printer_id: optional_string(params, "printerId"),
        system_name: optional_string(params, "systemName"),
        job_name: optional_string(params, "jobName")
            .unwrap_or_else(|| "ThermalBridge Label".into()),
        tcp_host: optional_string(params, "tcpHost"),
        tcp_port: params
            .get("tcpPort")
            .and_then(Value::as_u64)
            .map(|port| port as u16),
        usb_vid_pid: optional_string(params, "usbVidPid"),
        usb_interface: params
            .get("usbInterface")
            .and_then(Value::as_u64)
            .map(|value| value as u8),
        usb_out_endpoint: params
            .get("usbOutEndpoint")
            .and_then(Value::as_u64)
            .map(|value| value as u8),
        serial_port: optional_string(params, "serialPort"),
        bt_address: optional_string(params, "btAddress"),
        bt_service_uuid: optional_string(params, "btServiceUuid"),
        bt_tx_char_uuid: optional_string(params, "btTxCharUuid"),
        bt_write_mode: optional_string(params, "btWriteMode"),
        bt_local_name: optional_string(params, "btLocalName"),
        raw_job: params
            .get("rawJob")
            .and_then(Value::as_bool)
            .unwrap_or(true),
        cups_media: optional_string(params, "cupsMedia"),
    })
}

pub async fn print_raw_file(params: &Value) -> Result<Value, BridgeError> {
    let file_path = params
        .get("filePath")
        .and_then(Value::as_str)
        .ok_or_else(|| BridgeError::new("PARSE_ERROR", "printRawFile requires filePath"))?;
    let config = print_config_from_params(params)?;
    transport::send_raw_file(&config, file_path).await?;
    Ok(json!({ "ok": true }))
}

fn optional_string(params: &Value, key: &str) -> Option<String> {
    params
        .get(key)
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
}
