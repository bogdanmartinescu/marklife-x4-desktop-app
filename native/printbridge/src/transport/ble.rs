use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Duration;

use btleplug::api::{
    Central, CentralEvent, CharPropFlags, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::Manager;
use futures::StreamExt;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::errors::BridgeError;
use crate::printers::PrinterInfo;

use super::PrintConfig;

/// GATT service UUID for Marklife BLE profile A (Android app V3.8.0 / thermoprint).
pub const PROFILE_A_SERVICE_UUID: &str = "0000ff00-0000-1000-8000-00805f9b34fb";

/// Read / RX characteristic for Marklife BLE profile A.
pub const PROFILE_A_RX_CHAR_UUID: &str = "0000ff01-0000-1000-8000-00805f9b34fb";

/// Write / TX characteristic for Marklife BLE profile A.
pub const PROFILE_A_TX_CHAR_UUID: &str = "0000ff02-0000-1000-8000-00805f9b34fb";

/// Control characteristic used for credit/flow-control notifications.
pub const PROFILE_A_CONTROL_CHAR_UUID: &str = "0000ff03-0000-1000-8000-00805f9b34fb";

/// Second observed Marklife BLE profile (ISS C / profile B).
pub const PROFILE_B_SERVICE_UUID: &str = "49535343-fe7d-4ae5-8fa9-9fafd205e455";

const DEFAULT_CHUNK: usize = 20;

/// Advertised-name prefixes used the same way as thermoprint `findDeviceByName`.
const BLE_NAME_PREFIXES: &[&str] = &[
    "Marklife", "X4", "D210", "P50", "P80", "P15R", "P15S", "P15", "P12", "P7", "M60", "P1s",
    "LP15", "S15", "S12", "U4", "D100", "D200", "210",
];

fn adapter_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

pub fn advertised_name_matches(name: &str) -> bool {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return false;
    }
    let lowered = trimmed.to_lowercase();
    BLE_NAME_PREFIXES
        .iter()
        .any(|prefix| lowered.starts_with(&prefix.to_lowercase()))
}

pub fn advertised_service_uuid(services: &[Uuid]) -> Option<String> {
    let profile_a = Uuid::parse_str(PROFILE_A_SERVICE_UUID).ok()?;
    let profile_b = Uuid::parse_str(PROFILE_B_SERVICE_UUID).ok()?;
    if services.iter().any(|uuid| *uuid == profile_a) {
        return Some(PROFILE_A_SERVICE_UUID.to_string());
    }
    if services.iter().any(|uuid| *uuid == profile_b) {
        return Some(PROFILE_B_SERVICE_UUID.to_string());
    }
    None
}

pub fn include_ble_device(name: &str, services: &[Uuid]) -> bool {
    advertised_name_matches(name) || advertised_service_uuid(services).is_some()
}

pub async fn scan(duration_ms: u64) -> Result<Vec<PrinterInfo>, BridgeError> {
    let _guard = adapter_lock().lock().await;
    let manager = Manager::new().await.map_err(|error| {
        BridgeError::new(
            "BLUETOOTH_SCAN_FAILED",
            format!("Failed to create BLE manager: {error}"),
        )
    })?;
    let adapters = manager.adapters().await.map_err(|error| {
        BridgeError::new(
            "BLUETOOTH_SCAN_FAILED",
            format!("Failed to list BLE adapters: {error}"),
        )
    })?;
    let adapter = adapters
        .into_iter()
        .next()
        .ok_or_else(|| BridgeError::new("BLUETOOTH_SCAN_FAILED", "No Bluetooth adapter found"))?;

    let mut events = adapter.events().await.map_err(|error| {
        BridgeError::new(
            "BLUETOOTH_SCAN_FAILED",
            format!("Failed to subscribe to BLE events: {error}"),
        )
    })?;
    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|error| {
            BridgeError::new("BLUETOOTH_SCAN_FAILED", format!("BLE scan failed: {error}"))
        })?;

    let mut found: HashMap<String, PrinterInfo> = HashMap::new();
    let deadline = tokio::time::Instant::now() + Duration::from_millis(duration_ms.max(500));
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        match tokio::time::timeout(remaining, events.next()).await {
            Ok(Some(event)) => {
                let id = match event {
                    CentralEvent::DeviceDiscovered(id)
                    | CentralEvent::DeviceUpdated(id)
                    | CentralEvent::DeviceConnected(id) => id,
                    _ => continue,
                };
                let peripheral = match adapter.peripheral(&id).await {
                    Ok(peripheral) => peripheral,
                    Err(_) => continue,
                };
                if let Some(info) = peripheral_to_printer(&peripheral).await {
                    found.insert(info.id.clone(), info);
                }
            }
            Ok(None) | Err(_) => break,
        }
    }
    let _ = adapter.stop_scan().await;
    let mut printers: Vec<PrinterInfo> = found.into_values().collect();
    printers.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(printers)
}

async fn peripheral_to_printer(peripheral: &btleplug::platform::Peripheral) -> Option<PrinterInfo> {
    let props = peripheral.properties().await.ok().flatten()?;
    let address = props.address.to_string();
    let name = props.local_name.unwrap_or_default();
    let services: Vec<Uuid> = props.services.into_iter().collect();
    if !include_ble_device(&name, &services) {
        return None;
    }
    let display = if name.trim().is_empty() {
        format!("BLE {address}")
    } else {
        name
    };
    eprintln!(
        "printbridge BLE device address={address} name={display} rssi={:?}",
        props.rssi
    );
    Some(PrinterInfo {
        id: format!("bt-ble:{address}"),
        name: display,
        system_name: address.clone(),
        is_default: false,
        status: "ready".into(),
        backend: "bluetooth-ble".into(),
        tcp_host: None,
        tcp_port: None,
        usb_vid_pid: None,
        usb_interface: None,
        serial_port: None,
        bt_address: Some(address),
        bt_service_uuid: advertised_service_uuid(&services),
    })
}

pub async fn send(config: &PrintConfig, bytes: &[u8]) -> Result<(), BridgeError> {
    let _guard = adapter_lock().lock().await;
    let address = config
        .bt_address
        .as_deref()
        .ok_or_else(|| BridgeError::new("PRINTER_NOT_FOUND", "Bluetooth address is required"))?;
    let service_uuid = parse_uuid(
        config
            .bt_service_uuid
            .as_deref()
            .unwrap_or(PROFILE_A_SERVICE_UUID),
    )?;
    let tx_uuid = parse_uuid(
        config
            .bt_tx_char_uuid
            .as_deref()
            .unwrap_or(PROFILE_A_TX_CHAR_UUID),
    )?;

    let manager = Manager::new().await.map_err(|error| {
        BridgeError::new("PRINT_WRITE_FAILED", format!("BLE manager failed: {error}"))
    })?;
    let adapters = manager.adapters().await.map_err(|error| {
        BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("BLE adapters failed: {error}"),
        )
    })?;
    let adapter = adapters
        .into_iter()
        .next()
        .ok_or_else(|| BridgeError::new("PRINT_WRITE_FAILED", "No Bluetooth adapter found"))?;

    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?;
    tokio::time::sleep(Duration::from_secs(2)).await;
    let peripherals = adapter
        .peripherals()
        .await
        .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?;
    let _ = adapter.stop_scan().await;

    let mut target = None;
    for peripheral in peripherals {
        let props = peripheral
            .properties()
            .await
            .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?;
        if let Some(props) = props {
            if props.address.to_string().eq_ignore_ascii_case(address) {
                target = Some(peripheral);
                break;
            }
        }
    }

    let peripheral = target.ok_or_else(|| {
        BridgeError::new(
            "PRINTER_NOT_FOUND",
            format!("BLE peripheral {address} was not found"),
        )
    })?;

    peripheral
        .connect()
        .await
        .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", format!("BLE connect: {error}")))?;
    peripheral.discover_services().await.map_err(|error| {
        BridgeError::new("PRINT_WRITE_FAILED", format!("BLE discover: {error}"))
    })?;

    for service in peripheral.services() {
        eprintln!("printbridge BLE service uuid={}", service.uuid);
        for characteristic in &service.characteristics {
            eprintln!(
                "printbridge BLE characteristic uuid={} props={:?}",
                characteristic.uuid, characteristic.properties
            );
        }
    }

    let characteristic = peripheral
        .characteristics()
        .into_iter()
        .find(|item| item.uuid == tx_uuid || item.service_uuid == service_uuid)
        .or_else(|| {
            peripheral.characteristics().into_iter().find(|item| {
                item.properties.contains(CharPropFlags::WRITE)
                    || item
                        .properties
                        .contains(CharPropFlags::WRITE_WITHOUT_RESPONSE)
            })
        })
        .ok_or_else(|| {
            BridgeError::new(
                "PRINT_WRITE_FAILED",
                "No writable BLE characteristic was found. Discovered UUIDs were logged to stderr.",
            )
        })?;

    for chunk in bytes.chunks(DEFAULT_CHUNK) {
        peripheral
            .write(&characteristic, chunk, WriteType::WithoutResponse)
            .await
            .map_err(|error| {
                BridgeError::new("PRINT_WRITE_FAILED", format!("BLE write failed: {error}"))
            })?;
    }

    let _ = peripheral.disconnect().await;
    Ok(())
}

fn parse_uuid(value: &str) -> Result<Uuid, BridgeError> {
    Uuid::parse_str(value).map_err(|error| {
        BridgeError::new("PARSE_ERROR", format!("Invalid BLE UUID {value}: {error}"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn profile_a_write_characteristic_is_not_the_read_characteristic() {
        assert!(PROFILE_A_TX_CHAR_UUID.contains("ff02"));
        assert!(PROFILE_A_RX_CHAR_UUID.contains("ff01"));
        assert!(PROFILE_A_CONTROL_CHAR_UUID.contains("ff03"));
        assert_ne!(PROFILE_A_TX_CHAR_UUID, PROFILE_A_RX_CHAR_UUID);
    }

    #[test]
    fn matches_thermoprint_style_advertised_names() {
        assert!(advertised_name_matches("P15"));
        assert!(advertised_name_matches("P15R-ABCD"));
        assert!(advertised_name_matches("X4"));
        assert!(advertised_name_matches("Marklife X4"));
        assert!(!advertised_name_matches("AirPods Pro"));
        assert!(!advertised_name_matches(""));
    }

    #[test]
    fn includes_devices_that_advertise_profile_a_without_a_name() {
        let service = Uuid::parse_str(PROFILE_A_SERVICE_UUID).expect("uuid");
        assert!(include_ble_device("", &[service]));
        assert!(!include_ble_device("", &[]));
    }

    #[test]
    fn records_profile_a_service_uuid_from_the_advertisement() {
        let service = Uuid::parse_str(PROFILE_A_SERVICE_UUID).expect("uuid");
        assert_eq!(
            advertised_service_uuid(&[service]).as_deref(),
            Some(PROFILE_A_SERVICE_UUID)
        );
        assert_eq!(advertised_service_uuid(&[]), None);
    }
}
