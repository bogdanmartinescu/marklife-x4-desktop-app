use std::time::Duration;

use rusb::{Direction, TransferType};

use crate::errors::BridgeError;
use crate::printers::PrinterInfo;

use super::PrintConfig;

const PRINTER_CLASS: u8 = 0x07;
const VENDOR_CLASS: u8 = 0xFF;

pub fn list_devices() -> Result<Vec<PrinterInfo>, BridgeError> {
    let mut printers = Vec::new();
    let devices = rusb::DeviceList::new().map_err(BridgeError::from)?;

    for device in devices.iter() {
        let desc = match device.device_descriptor() {
            Ok(desc) => desc,
            Err(_) => continue,
        };
        let vid_pid = format!("{:04x}:{:04x}", desc.vendor_id(), desc.product_id());
        let mut matched_interface: Option<u8> = None;

        if desc.class_code() == PRINTER_CLASS || desc.class_code() == VENDOR_CLASS {
            matched_interface = Some(0);
        }

        if let Ok(config) = device.config_descriptor(0) {
            for interface in config.interfaces() {
                for descriptor in interface.descriptors() {
                    if descriptor.class_code() == PRINTER_CLASS
                        || descriptor.class_code() == VENDOR_CLASS
                    {
                        matched_interface = Some(descriptor.interface_number());
                    }
                }
            }
        }

        if let Some(iface) = matched_interface {
            let name = format!("USB {vid_pid}");
            printers.push(PrinterInfo {
                id: format!("usb:{vid_pid}:{iface}"),
                name: name.clone(),
                system_name: vid_pid.clone(),
                is_default: false,
                status: "ready".into(),
                backend: "usb".into(),
                tcp_host: None,
                tcp_port: None,
                usb_vid_pid: Some(vid_pid),
                usb_interface: Some(iface),
                serial_port: None,
                bt_address: None,
                bt_service_uuid: None,
                rssi: None,
            });
        }
    }

    Ok(printers)
}

pub fn send(config: &PrintConfig, bytes: &[u8]) -> Result<(), BridgeError> {
    let vid_pid = config
        .usb_vid_pid
        .as_deref()
        .ok_or_else(|| BridgeError::new("PRINTER_NOT_FOUND", "USB VID:PID is required"))?;
    let (vid, pid) = parse_vid_pid(vid_pid)?;
    let iface = config.usb_interface.unwrap_or(0);

    let handle = rusb::open_device_with_vid_pid(vid, pid).ok_or_else(|| {
        BridgeError::new(
            "PRINTER_NOT_FOUND",
            format!("USB device {vid_pid} was not found"),
        )
    })?;

    #[cfg(not(target_os = "windows"))]
    {
        if handle.kernel_driver_active(iface).unwrap_or(false) {
            return Err(BridgeError::new(
                "USB_DRIVER_CONFLICT",
                "A kernel driver is bound to this USB interface. ThermalBridge will not detach it. Use the OS Queue backend instead.",
            ));
        }
    }

    if let Err(error) = handle.claim_interface(iface) {
        #[cfg(target_os = "windows")]
        {
            let _ = error;
            return Err(BridgeError::new(
                "USB_DRIVER_CONFLICT",
                "Could not claim the USB interface. A standard printer driver is likely bound to this device. Use the OS Queue backend instead.",
            ));
        }
        #[cfg(not(target_os = "windows"))]
        {
            return Err(BridgeError::new(
                "PRINT_WRITE_FAILED",
                format!("Failed to claim USB interface {iface}: {error}"),
            ));
        }
    }

    let endpoint = match config.usb_out_endpoint {
        Some(value) => value,
        None => find_bulk_out_endpoint(vid, pid, iface)?,
    };

    let timeout = Duration::from_secs(30);
    let mut offset = 0;
    while offset < bytes.len() {
        let written = handle
            .write_bulk(endpoint, &bytes[offset..], timeout)
            .map_err(|error| {
                BridgeError::new(
                    "PRINT_WRITE_FAILED",
                    format!("USB bulk write failed: {error}"),
                )
            })?;
        if written == 0 {
            return Err(BridgeError::new(
                "PRINT_WRITE_FAILED",
                "USB bulk write returned 0 bytes",
            ));
        }
        offset += written;
    }

    let _ = handle.release_interface(iface);
    Ok(())
}

fn parse_vid_pid(value: &str) -> Result<(u16, u16), BridgeError> {
    let mut parts = value.split(':');
    let vid = u16::from_str_radix(parts.next().unwrap_or(""), 16)
        .map_err(|_| BridgeError::new("PARSE_ERROR", format!("Invalid USB VID:PID: {value}")))?;
    let pid = u16::from_str_radix(parts.next().unwrap_or(""), 16)
        .map_err(|_| BridgeError::new("PARSE_ERROR", format!("Invalid USB VID:PID: {value}")))?;
    Ok((vid, pid))
}

fn find_bulk_out_endpoint(vid: u16, pid: u16, iface: u8) -> Result<u8, BridgeError> {
    let devices = rusb::DeviceList::new().map_err(BridgeError::from)?;
    for device in devices.iter() {
        let desc = match device.device_descriptor() {
            Ok(desc) => desc,
            Err(_) => continue,
        };
        if desc.vendor_id() != vid || desc.product_id() != pid {
            continue;
        }
        if let Ok(config) = device.config_descriptor(0) {
            for interface in config.interfaces() {
                for descriptor in interface.descriptors() {
                    if descriptor.interface_number() != iface {
                        continue;
                    }
                    for endpoint in descriptor.endpoint_descriptors() {
                        if endpoint.direction() == Direction::Out
                            && endpoint.transfer_type() == TransferType::Bulk
                        {
                            return Ok(endpoint.address());
                        }
                    }
                }
            }
        }
    }

    Err(BridgeError::new(
        "PRINT_WRITE_FAILED",
        "No USB bulk OUT endpoint was found",
    ))
}
