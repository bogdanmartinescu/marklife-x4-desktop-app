use std::io::Write;
use std::time::Duration;

use serialport::SerialPortType;

use crate::errors::BridgeError;
use crate::printers::PrinterInfo;

use super::PrintConfig;

pub fn list_bluetooth_ports() -> Result<Vec<PrinterInfo>, BridgeError> {
    let ports = serialport::available_ports().map_err(|error| {
        BridgeError::new(
            "BLUETOOTH_SCAN_FAILED",
            format!("Failed to list serial ports: {error}"),
        )
    })?;

    let mut printers = Vec::new();
    for port in ports {
        if !is_bluetooth_serial(&port.port_name, &port.port_type) {
            continue;
        }
        printers.push(PrinterInfo {
            id: format!("bt-spp:{}", port.port_name),
            name: spp_display_name(&port.port_name),
            system_name: port.port_name.clone(),
            is_default: false,
            status: "ready".into(),
            backend: "bluetooth-spp".into(),
            tcp_host: None,
            tcp_port: None,
            usb_vid_pid: None,
            usb_interface: None,
            serial_port: Some(port.port_name),
            bt_address: None,
            bt_service_uuid: None,
            rssi: None,
        });
    }
    Ok(printers)
}

pub fn send(config: &PrintConfig, bytes: &[u8]) -> Result<(), BridgeError> {
    let port_name = config.serial_port.as_deref().ok_or_else(|| {
        BridgeError::new(
            "PRINTER_NOT_FOUND",
            "Serial port is required for Bluetooth SPP",
        )
    })?;

    let mut port = serialport::new(port_name, 115_200)
        .timeout(Duration::from_secs(10))
        .open()
        .map_err(|error| {
            BridgeError::new(
                "PRINT_WRITE_FAILED",
                format!("Failed to open serial port {port_name}: {error}"),
            )
        })?;

    port.write_all(bytes).map_err(|error| {
        BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("Serial write failed: {error}"),
        )
    })?;
    port.flush().map_err(|error| {
        BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("Serial flush failed: {error}"),
        )
    })?;
    Ok(())
}

fn is_host_incoming_port(name: &str) -> bool {
    let lowered = name.to_lowercase();
    lowered.contains("incoming-port")
        || lowered.contains("incomingport")
        || lowered.contains("bluetooth-incoming")
}

fn looks_like_printer_name(name: &str) -> bool {
    let lowered = name.to_lowercase();
    const HINTS: &[&str] = &[
        "marklife", "x4", "d210", "p50", "p80", "p15", "p12", "p7", "m60", "u4", "d100",
        "d200", "lp15",
    ];
    HINTS.iter().any(|hint| lowered.contains(hint))
}

fn is_bluetooth_serial(name: &str, port_type: &SerialPortType) -> bool {
    if is_host_incoming_port(name) {
        return false;
    }
    if matches!(port_type, SerialPortType::BluetoothPort) {
        return true;
    }
    let lowered = name.to_lowercase();
    looks_like_printer_name(name)
        || lowered.contains("bluetooth")
        || lowered.contains("rfcomm")
        || lowered.contains("-serial")
        || lowered.contains("tsp")
}

fn spp_display_name(port_name: &str) -> String {
    let leaf = port_name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(port_name);
    let leaf = leaf
        .strip_prefix("cu.")
        .or_else(|| leaf.strip_prefix("tty."))
        .unwrap_or(leaf);
    leaf.replace('-', " ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_macos_bluetooth_serial_names() {
        assert!(is_bluetooth_serial(
            "/dev/cu.Marklife-X4-Serial",
            &SerialPortType::Unknown
        ));
        assert!(is_bluetooth_serial(
            "/dev/cu.D210",
            &SerialPortType::Unknown
        ));
        assert!(is_bluetooth_serial(
            "/dev/cu.P50-Serial",
            &SerialPortType::Unknown
        ));
        assert!(is_bluetooth_serial("/dev/rfcomm0", &SerialPortType::Unknown));
        assert!(!is_bluetooth_serial(
            "/dev/cu.usbmodem14101",
            &SerialPortType::Unknown
        ));
        assert!(!is_bluetooth_serial(
            "/dev/cu.Bluetooth-Incoming-Port",
            &SerialPortType::Unknown
        ));
        assert!(!is_bluetooth_serial(
            "/dev/cu.Bluetooth-Incoming-Port",
            &SerialPortType::BluetoothPort
        ));
    }

    #[test]
    fn uses_the_device_leaf_name_for_spp_display() {
        assert_eq!(
            spp_display_name("/dev/cu.Marklife-X4-Serial"),
            "Marklife X4 Serial"
        );
        assert_eq!(spp_display_name("COM7"), "COM7");
    }
}
