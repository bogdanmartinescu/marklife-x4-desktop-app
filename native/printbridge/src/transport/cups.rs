#![cfg(any(target_os = "macos", target_os = "linux"))]

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use std::path::Path;
use std::ptr;

use crate::errors::BridgeError;
use crate::printers::PrinterInfo;

use super::PrintConfig;

#[repr(C)]
struct CupsOption {
    name: *mut c_char,
    value: *mut c_char,
}

#[repr(C)]
struct CupsDest {
    name: *mut c_char,
    instance: *mut c_char,
    is_default: c_int,
    num_options: c_int,
    options: *mut CupsOption,
}

#[link(name = "cups")]
extern "C" {
    fn cupsGetDests(dests: *mut *mut CupsDest) -> c_int;
    fn cupsFreeDests(num_dests: c_int, dests: *mut CupsDest);
    fn cupsPrintFile(
        name: *const c_char,
        filename: *const c_char,
        title: *const c_char,
        num_options: c_int,
        options: *const CupsOption,
    ) -> c_int;
    fn cupsAddOption(
        name: *const c_char,
        value: *const c_char,
        num_options: c_int,
        options: *mut *mut CupsOption,
    ) -> c_int;
    fn cupsFreeOptions(num_options: c_int, options: *mut CupsOption);
    fn cupsLastErrorString() -> *const c_char;
}

fn cstr_to_string(ptr: *mut c_char) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    // Safety: CUPS returns NUL-terminated C strings for destination names.
    Some(
        unsafe { CStr::from_ptr(ptr) }
            .to_string_lossy()
            .into_owned(),
    )
}

fn last_cups_error() -> String {
    let ptr = unsafe { cupsLastErrorString() };
    if ptr.is_null() {
        return "Unknown CUPS error".into();
    }
    unsafe { CStr::from_ptr(ptr) }
        .to_string_lossy()
        .into_owned()
}

pub fn list_printers() -> Result<Vec<PrinterInfo>, BridgeError> {
    let mut dests: *mut CupsDest = ptr::null_mut();
    let count = unsafe { cupsGetDests(&mut dests) };
    if dests.is_null() && count > 0 {
        return Err(BridgeError::new(
            "PRINTER_NOT_FOUND",
            "CUPS returned destinations but the pointer was null",
        ));
    }

    let mut printers = Vec::new();
    if !dests.is_null() {
        let slice = unsafe { std::slice::from_raw_parts(dests, count as usize) };
        for dest in slice {
            let Some(name) = cstr_to_string(dest.name) else {
                continue;
            };
            printers.push(PrinterInfo {
                id: format!("cups:{name}"),
                name: name.clone(),
                system_name: name,
                is_default: dest.is_default != 0,
                status: "unknown".into(),
                backend: "cups".into(),
                tcp_host: None,
                tcp_port: None,
                usb_vid_pid: None,
                usb_interface: None,
                serial_port: None,
                bt_address: None,
                bt_service_uuid: None,
                rssi: None,
            });
        }
        unsafe { cupsFreeDests(count, dests) };
    }

    Ok(printers)
}

pub fn send(config: &PrintConfig, path: &Path) -> Result<(), BridgeError> {
    let queue = config
        .system_name
        .clone()
        .or_else(|| config.printer_id.clone())
        .ok_or_else(|| BridgeError::new("NO_PRINTER_SELECTED", "No CUPS queue was selected"))?;
    let queue = queue.strip_prefix("cups:").unwrap_or(&queue);

    let name = CString::new(queue)
        .map_err(|_| BridgeError::new("PARSE_ERROR", "CUPS queue name contains a NUL byte"))?;
    let filename = CString::new(path.to_string_lossy().as_bytes())
        .map_err(|_| BridgeError::new("PARSE_ERROR", "Job path contains a NUL byte"))?;
    let title = CString::new(config.job_name.as_str())
        .unwrap_or_else(|_| CString::new("ThermalBridge Label").expect("static title is valid"));
    let raw_name = CString::new("raw").expect("static option name is valid");
    let raw_value = CString::new("true").expect("static option value is valid");

    let mut options: *mut CupsOption = ptr::null_mut();
    let num_options =
        unsafe { cupsAddOption(raw_name.as_ptr(), raw_value.as_ptr(), 0, &mut options) };

    let job_id = unsafe {
        cupsPrintFile(
            name.as_ptr(),
            filename.as_ptr(),
            title.as_ptr(),
            num_options,
            options,
        )
    };
    unsafe { cupsFreeOptions(num_options, options) };

    if job_id <= 0 {
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("CUPS rejected the raw job: {}", last_cups_error()),
        ));
    }
    Ok(())
}
