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

/// Additional Phomemo advertisement UUIDs (M02 / other families).
pub const PHOMEMO_FFE0_SERVICE_UUID: &str = "0000ffe0-0000-1000-8000-00805f9b34fb";
pub const PHOMEMO_AE30_SERVICE_UUID: &str = "0000ae30-0000-1000-8000-00805f9b34fb";

const DEFAULT_CHUNK: usize = 20;
const PHOMEMO_CHUNK: usize = 128;

/// Advertised-name prefixes used the same way as thermoprint `findDeviceByName`.
const BLE_NAME_PREFIXES: &[&str] = &[
    "Marklife", "X4", "D210", "P50", "P80", "P15R", "P15S", "P15", "P12", "P7", "M60", "P1s",
    "LP15", "S15", "S12", "U4", "D100", "D200", "210", "Phomemo", "M110", "M120", "M220", "M200",
];

fn adapter_lock() -> &'static Mutex<()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

pub fn is_null_ble_address(address: &str) -> bool {
    let normalized = address.trim().replace('-', ":");
    if normalized.is_empty() {
        return true;
    }
    normalized
        .split(':')
        .filter(|part| !part.is_empty())
        .all(|part| part.chars().all(|ch| ch == '0'))
}

pub fn ble_device_key(address: &str, peripheral_id: &str) -> String {
    if is_null_ble_address(address) {
        peripheral_id.to_string()
    } else {
        address.to_string()
    }
}

pub struct BleSighting {
    pub address: String,
    pub peripheral_id: String,
    pub local_name: Option<String>,
}

pub fn ble_peripheral_matches(
    sighting: &BleSighting,
    bt_address: Option<&str>,
    bt_local_name: Option<&str>,
) -> bool {
    if let Some(address) = bt_address {
        if !is_null_ble_address(address) && sighting.address.eq_ignore_ascii_case(address) {
            return true;
        }
        if sighting.peripheral_id.eq_ignore_ascii_case(address) {
            return true;
        }
    }
    if let Some(name) = bt_local_name {
        let trimmed = name.trim();
        if !trimmed.is_empty()
            && sighting
                .local_name
                .as_deref()
                .is_some_and(|local| local.eq_ignore_ascii_case(trimmed))
        {
            return true;
        }
    }
    false
}

pub fn advertised_name_matches(name: &str) -> bool {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return false;
    }
    if looks_like_phomemo_serial(trimmed) {
        return true;
    }
    let lowered = trimmed.to_lowercase();
    BLE_NAME_PREFIXES
        .iter()
        .any(|prefix| lowered.starts_with(&prefix.to_lowercase()))
}

pub fn looks_like_phomemo_serial(name: &str) -> bool {
    let trimmed = name.trim();
    if !(10..=18).contains(&trimmed.len()) {
        return false;
    }
    if trimmed != trimmed.to_ascii_uppercase() {
        return false;
    }
    let mut has_letter = false;
    let mut has_digit = false;
    for ch in trimmed.chars() {
        if ch.is_ascii_uppercase() {
            has_letter = true;
        } else if ch.is_ascii_digit() {
            has_digit = true;
        } else {
            return false;
        }
    }
    has_letter && has_digit
}

pub fn advertised_service_uuid(services: &[Uuid]) -> Option<String> {
    const KNOWN: &[(&str, &str)] = &[
        (PROFILE_A_SERVICE_UUID, PROFILE_A_SERVICE_UUID),
        (PROFILE_B_SERVICE_UUID, PROFILE_B_SERVICE_UUID),
        (PHOMEMO_FFE0_SERVICE_UUID, PHOMEMO_FFE0_SERVICE_UUID),
        (PHOMEMO_AE30_SERVICE_UUID, PHOMEMO_AE30_SERVICE_UUID),
    ];
    for (value, reported) in KNOWN {
        let parsed = Uuid::parse_str(value).ok()?;
        if services.iter().any(|uuid| *uuid == parsed) {
            return Some((*reported).to_string());
        }
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
    let peripheral_id = peripheral.id().to_string();
    let key = ble_device_key(&address, &peripheral_id);
    let name = props.local_name.unwrap_or_default();
    let services: Vec<Uuid> = props.services.into_iter().collect();
    if !include_ble_device(&name, &services) {
        return None;
    }
    let display = if name.trim().is_empty() {
        format!("BLE {key}")
    } else {
        name
    };
    eprintln!(
        "printbridge BLE device address={address} id={peripheral_id} key={key} name={display} rssi={:?}",
        props.rssi
    );
    Some(PrinterInfo {
        id: format!("bt-ble:{key}"),
        name: display,
        system_name: key.clone(),
        is_default: false,
        status: "ready".into(),
        backend: "bluetooth-ble".into(),
        tcp_host: None,
        tcp_port: None,
        usb_vid_pid: None,
        usb_interface: None,
        serial_port: None,
        bt_address: Some(key),
        bt_service_uuid: advertised_service_uuid(&services),
        rssi: props.rssi,
    })
}

pub async fn send(config: &PrintConfig, bytes: &[u8]) -> Result<(), BridgeError> {
    let _guard = adapter_lock().lock().await;
    let address = config
        .bt_address
        .as_deref()
        .filter(|value| !is_null_ble_address(value));
    let local_name = config
        .bt_local_name
        .as_deref()
        .filter(|name| !name.is_empty() && !is_null_ble_address(name));
    if address.is_none() && local_name.is_none() {
        return Err(BridgeError::new(
            "PRINTER_NOT_FOUND",
            "Bluetooth address or advertised name is required",
        ));
    }
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
    tokio::time::sleep(Duration::from_secs(4)).await;
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
            let sighting = BleSighting {
                address: props.address.to_string(),
                peripheral_id: peripheral.id().to_string(),
                local_name: props.local_name.clone(),
            };
            if ble_peripheral_matches(&sighting, address, local_name) {
                eprintln!(
                    "printbridge BLE connect id={} name={:?} address={}",
                    sighting.peripheral_id, sighting.local_name, sighting.address
                );
                target = Some(peripheral);
                break;
            }
        }
    }

    let peripheral = target.ok_or_else(|| {
        BridgeError::new(
            "PRINTER_NOT_FOUND",
            format!(
                "BLE printer {} was not found. On macOS the MAC is hidden; reconnect after a scan so the printer UUID/name is stored.",
                local_name.or(address).unwrap_or("unknown")
            ),
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

    let phomemo = config.bt_write_mode.as_deref() == Some("phomemo-m110");
    let characteristic = find_write_characteristic(&peripheral, tx_uuid, service_uuid, phomemo)?;

    if phomemo {
        subscribe_phomemo_notify(&peripheral).await;
        // Let CoreBluetooth finish MTU negotiation before the first write.
        tokio::time::sleep(Duration::from_millis(200)).await;
    }

    let write_type = if characteristic
        .properties
        .contains(CharPropFlags::WRITE_WITHOUT_RESPONSE)
    {
        WriteType::WithoutResponse
    } else {
        WriteType::WithResponse
    };

    if phomemo {
        write_phomemo_paced(&peripheral, &characteristic, bytes).await?;
        let flush_ms = phomemo_flush_ms(bytes.len());
        eprintln!("printbridge BLE phomemo flush {flush_ms}ms before disconnect");
        tokio::time::sleep(Duration::from_millis(flush_ms)).await;
    } else {
        for chunk in bytes.chunks(DEFAULT_CHUNK) {
            peripheral
                .write(&characteristic, chunk, write_type)
                .await
                .map_err(|error| {
                    BridgeError::new("PRINT_WRITE_FAILED", format!("BLE write failed: {error}"))
                })?;
        }
    }

    let _ = peripheral.disconnect().await;
    Ok(())
}

const PHOMEMO_INIT_LEN: usize = 11;
const PHOMEMO_RASTER_HEADER_LEN: usize = 8;
const PHOMEMO_FOOTER_LEN: usize = 8;

fn phomemo_gatt_frames(payload: &[u8]) -> Vec<Vec<u8>> {
    if payload.len() < PHOMEMO_INIT_LEN + PHOMEMO_RASTER_HEADER_LEN + PHOMEMO_FOOTER_LEN
        || payload.get(0..2) != Some(&[0x1b, 0x4e])
        || payload.get(11..15) != Some(&[0x1d, 0x76, 0x30, 0x00])
    {
        return payload.chunks(PHOMEMO_CHUNK).map(<[u8]>::to_vec).collect();
    }
    let mut frames = Vec::new();
    frames.push(payload[0..4].to_vec());
    frames.push(payload[4..8].to_vec());
    frames.push(payload[8..11].to_vec());
    // Firmware treats each GATT write as a command boundary. The GS v 0 header
    // must be its own write; merging it with raster bytes makes the M110 discard the job.
    frames.push(payload[11..19].to_vec());
    let body_end = payload.len() - PHOMEMO_FOOTER_LEN;
    for chunk in payload[19..body_end].chunks(PHOMEMO_CHUNK) {
        frames.push(chunk.to_vec());
    }
    frames.push(payload[body_end..].to_vec());
    frames
}

fn phomemo_chunk_write_type(properties: &CharPropFlags, is_command: bool) -> WriteType {
    // Init/footer must land (WithResponse). Raster must keep the print buffer fed;
    // acknowledged 128-byte writes are too slow and the M110 aborts mid-label.
    if is_command && properties.contains(CharPropFlags::WRITE) {
        WriteType::WithResponse
    } else if properties.contains(CharPropFlags::WRITE_WITHOUT_RESPONSE) {
        WriteType::WithoutResponse
    } else {
        WriteType::WithResponse
    }
}

fn phomemo_flush_ms(payload_len: usize) -> u64 {
    // Disconnecting while the head is still moving cancels the rest of the label.
    (3_000 + payload_len as u64 / 6).clamp(4_000, 15_000)
}

async fn subscribe_phomemo_notify(peripheral: &btleplug::platform::Peripheral) {
    let Ok(notify_uuid) = Uuid::parse_str(PROFILE_A_CONTROL_CHAR_UUID) else {
        return;
    };
    let Some(characteristic) = peripheral
        .characteristics()
        .into_iter()
        .find(|item| item.uuid == notify_uuid && item.properties.contains(CharPropFlags::NOTIFY))
    else {
        return;
    };
    if let Err(error) = peripheral.subscribe(&characteristic).await {
        eprintln!("printbridge BLE notify subscribe failed: {error}");
    }
}

async fn write_phomemo_paced(
    peripheral: &btleplug::platform::Peripheral,
    characteristic: &btleplug::api::Characteristic,
    bytes: &[u8],
) -> Result<(), BridgeError> {
    let frames = phomemo_gatt_frames(bytes);
    let last = frames.len().saturating_sub(1);
    eprintln!(
        "printbridge BLE phomemo write bytes={} frames={} char={}",
        bytes.len(),
        frames.len(),
        characteristic.uuid
    );
    for (index, frame) in frames.iter().enumerate() {
        let is_command = index < 4 || index == last;
        let write_type = phomemo_chunk_write_type(&characteristic.properties, is_command);
        if index == last && last > 0 {
            tokio::time::sleep(Duration::from_millis(300)).await;
        }
        peripheral
            .write(characteristic, frame, write_type)
            .await
            .map_err(|error| {
                BridgeError::new(
                    "PRINT_WRITE_FAILED",
                    format!(
                        "BLE write failed at frame {index}/{}: {error}",
                        frames.len()
                    ),
                )
            })?;
        if index < 4 {
            tokio::time::sleep(Duration::from_millis(30)).await;
        } else if index < last {
            tokio::time::sleep(Duration::from_millis(12)).await;
        } else {
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        if index == 0 || index == last || (index + 1) % 50 == 0 {
            eprintln!(
                "printbridge BLE phomemo wrote frame {}/{} ({} bytes) {write_type:?}",
                index + 1,
                frames.len(),
                frame.len()
            );
        }
    }
    Ok(())
}

fn find_write_characteristic(
    peripheral: &btleplug::platform::Peripheral,
    tx_uuid: Uuid,
    service_uuid: Uuid,
    require_known_profile: bool,
) -> Result<btleplug::api::Characteristic, BridgeError> {
    let characteristics = peripheral.characteristics();
    if let Some(item) = characteristics.iter().find(|item| item.uuid == tx_uuid) {
        return Ok(item.clone());
    }
    if let Some(item) = characteristics.iter().find(|item| {
        item.service_uuid == service_uuid
            && (item.properties.contains(CharPropFlags::WRITE)
                || item
                    .properties
                    .contains(CharPropFlags::WRITE_WITHOUT_RESPONSE))
    }) {
        return Ok(item.clone());
    }
    if require_known_profile {
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            "Phomemo write characteristic ff02 was not found. The connected BLE device is not the M110 GATT profile.",
        ));
    }
    characteristics
        .into_iter()
        .find(|item| {
            item.properties.contains(CharPropFlags::WRITE)
                || item
                    .properties
                    .contains(CharPropFlags::WRITE_WITHOUT_RESPONSE)
        })
        .ok_or_else(|| {
            BridgeError::new(
                "PRINT_WRITE_FAILED",
                "No writable BLE characteristic was found. Discovered UUIDs were logged to stderr.",
            )
        })
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
    fn mac_all_zeros_is_not_a_usable_ble_address() {
        assert!(is_null_ble_address("00:00:00:00:00:00"));
        assert!(is_null_ble_address("00-00-00-00-00-00"));
        assert!(!is_null_ble_address("AA:BB:CC:DD:EE:FF"));
        assert_eq!(
            ble_device_key("00:00:00:00:00:00", "ADE3D529-C784-4F63-A987-EB69F70EE816"),
            "ADE3D529-C784-4F63-A987-EB69F70EE816"
        );
    }

    #[test]
    fn does_not_match_every_macos_device_by_the_zero_mac() {
        let other = BleSighting {
            address: "00:00:00:00:00:00".into(),
            peripheral_id: "11111111-1111-1111-1111-111111111111".into(),
            local_name: Some("AirPods".into()),
        };
        let printer = BleSighting {
            address: "00:00:00:00:00:00".into(),
            peripheral_id: "22222222-2222-2222-2222-222222222222".into(),
            local_name: Some("Q199E4BC7300007".into()),
        };
        assert!(!ble_peripheral_matches(
            &other,
            Some("00:00:00:00:00:00"),
            Some("Q199E4BC7300007"),
        ));
        assert!(ble_peripheral_matches(
            &printer,
            Some("00:00:00:00:00:00"),
            Some("Q199E4BC7300007"),
        ));
        assert!(ble_peripheral_matches(
            &printer,
            Some("22222222-2222-2222-2222-222222222222"),
            None,
        ));
    }

    #[test]
    fn matches_thermoprint_style_advertised_names() {
        assert!(advertised_name_matches("P15"));
        assert!(advertised_name_matches("P15R-ABCD"));
        assert!(advertised_name_matches("X4"));
        assert!(advertised_name_matches("Marklife X4"));
        assert!(advertised_name_matches("M110"));
        assert!(advertised_name_matches("Phomemo M110"));
        assert!(advertised_name_matches("Q002E0CP0670069"));
        assert!(!advertised_name_matches("AirPods Pro"));
        assert!(!advertised_name_matches(""));
    }

    #[test]
    fn splits_phomemo_init_commands_before_chunking_raster() {
        let mut payload = vec![
            0x1b, 0x4e, 0x0d, 0x05, 0x1b, 0x4e, 0x04, 0x0f, 0x1f, 0x11, 0x0a,
        ];
        payload.extend_from_slice(&[0x1d, 0x76, 0x30, 0x00, 0x30, 0x00, 0x01, 0x00]);
        payload.extend(std::iter::repeat(0u8).take(48));
        payload.extend_from_slice(&[0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00]);
        let frames = phomemo_gatt_frames(&payload);
        assert_eq!(frames[0], vec![0x1b, 0x4e, 0x0d, 0x05]);
        assert_eq!(frames[1], vec![0x1b, 0x4e, 0x04, 0x0f]);
        assert_eq!(frames[2], vec![0x1f, 0x11, 0x0a]);
        assert_eq!(
            frames[3],
            vec![0x1d, 0x76, 0x30, 0x00, 0x30, 0x00, 0x01, 0x00]
        );
        assert_eq!(frames[4], vec![0u8; 48]);
        assert_eq!(
            frames.last().map(Vec::as_slice),
            Some(&[0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00][..])
        );
    }

    #[test]
    fn phomemo_raster_header_is_not_merged_into_the_first_bitmap_chunk() {
        let mut payload = vec![
            0x1b, 0x4e, 0x0d, 0x05, 0x1b, 0x4e, 0x04, 0x0f, 0x1f, 0x11, 0x0a,
        ];
        payload.extend_from_slice(&[0x1d, 0x76, 0x30, 0x00, 0x30, 0x00, 0x04, 0x00]);
        payload.extend(std::iter::repeat(0xaau8).take(PHOMEMO_CHUNK + 16));
        payload.extend_from_slice(&[0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00]);
        let frames = phomemo_gatt_frames(&payload);
        assert_eq!(frames[3].len(), PHOMEMO_RASTER_HEADER_LEN);
        assert_eq!(frames[4].len(), PHOMEMO_CHUNK);
        assert_eq!(frames[5].len(), 16);
    }

    #[test]
    fn phomemo_uses_acknowledged_writes_only_for_command_frames() {
        let both = CharPropFlags::WRITE | CharPropFlags::WRITE_WITHOUT_RESPONSE;
        assert_eq!(
            phomemo_chunk_write_type(&both, true),
            WriteType::WithResponse
        );
        assert_eq!(
            phomemo_chunk_write_type(&both, false),
            WriteType::WithoutResponse
        );
        assert_eq!(
            phomemo_chunk_write_type(&CharPropFlags::WRITE_WITHOUT_RESPONSE, true),
            WriteType::WithoutResponse
        );
    }

    #[test]
    fn phomemo_flush_waits_longer_for_larger_jobs() {
        assert_eq!(phomemo_flush_ms(100), 4_000);
        assert!(phomemo_flush_ms(60_000) > phomemo_flush_ms(20_000));
        assert_eq!(phomemo_flush_ms(200_000), 15_000);
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
