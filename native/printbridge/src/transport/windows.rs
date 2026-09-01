#![cfg(target_os = "windows")]

use std::ptr;

use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::{BOOL, HANDLE};
use windows::Win32::Graphics::Printing::{
    ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, OpenPrinterW, StartDocPrinterW,
    StartPagePrinter, WritePrinter, DOC_INFO_1W, PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL,
    PRINTER_INFO_2W,
};

use crate::errors::BridgeError;
use crate::printers::PrinterInfo;

use super::PrintConfig;

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn from_wide(ptr: *const u16) -> Option<String> {
    if ptr.is_null() {
        return None;
    }
    let mut len = 0usize;
    while unsafe { *ptr.add(len) } != 0 {
        len += 1;
    }
    Some(String::from_utf16_lossy(unsafe {
        std::slice::from_raw_parts(ptr, len)
    }))
}

pub fn list_printers() -> Result<Vec<PrinterInfo>, BridgeError> {
    let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
    let mut needed: u32 = 0;
    let mut returned: u32 = 0;

    unsafe {
        let _ = EnumPrintersW(flags, PCWSTR::null(), 2, None, &mut needed, &mut returned);
    }

    if needed == 0 {
        return Ok(Vec::new());
    }

    let mut buffer = vec![0u8; needed as usize];
    let ok = unsafe {
        EnumPrintersW(
            flags,
            PCWSTR::null(),
            2,
            Some(&mut buffer),
            &mut needed,
            &mut returned,
        )
    };
    if !ok.as_bool() {
        return Err(BridgeError::new(
            "PRINTER_NOT_FOUND",
            "EnumPrintersW failed",
        ));
    }

    let info_size = std::mem::size_of::<PRINTER_INFO_2W>();
    let count = returned as usize;
    let mut printers = Vec::new();
    for index in 0..count {
        let info = unsafe { &*(buffer.as_ptr().add(index * info_size) as *const PRINTER_INFO_2W) };
        let Some(name) = from_wide(info.pPrinterName.0) else {
            continue;
        };
        printers.push(PrinterInfo {
            id: format!("winspool:{name}"),
            name: name.clone(),
            system_name: name,
            is_default: false,
            status: if info.Status == 0 {
                "ready".into()
            } else {
                "unknown".into()
            },
            backend: "windows-spooler".into(),
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
    Ok(printers)
}

pub fn send(config: &PrintConfig, bytes: &[u8]) -> Result<(), BridgeError> {
    let queue = config
        .system_name
        .clone()
        .or_else(|| config.printer_id.clone())
        .ok_or_else(|| {
            BridgeError::new("NO_PRINTER_SELECTED", "No Windows printer was selected")
        })?;
    let queue = queue.strip_prefix("winspool:").unwrap_or(&queue);
    let mut name = wide(queue);
    let mut doc_name = wide(&config.job_name);
    let mut datatype = wide("RAW");

    let mut handle = HANDLE::default();
    let opened = unsafe { OpenPrinterW(PCWSTR(name.as_mut_ptr()), &mut handle, None) };
    if !opened.as_bool() {
        return Err(BridgeError::new(
            "PRINTER_NOT_FOUND",
            format!("OpenPrinterW failed for {queue}"),
        ));
    }

    let result = write_raw(handle, &mut doc_name, &mut datatype, bytes);
    unsafe {
        let _ = ClosePrinter(handle);
    }
    result
}

fn write_raw(
    handle: HANDLE,
    doc_name: &mut [u16],
    datatype: &mut [u16],
    bytes: &[u8],
) -> Result<(), BridgeError> {
    let doc = DOC_INFO_1W {
        pDocName: PWSTR(doc_name.as_mut_ptr()),
        pOutputFile: PWSTR(ptr::null_mut()),
        pDatatype: PWSTR(datatype.as_mut_ptr()),
    };

    let job_id = unsafe { StartDocPrinterW(handle, 1, &doc) };
    if job_id == 0 {
        return Err(BridgeError::new(
            "RAW_PRINT_UNSUPPORTED",
            "StartDocPrinterW failed. The queue may not accept RAW jobs.",
        ));
    }

    let page_started = unsafe { StartPagePrinter(handle) };
    if !BOOL(page_started).as_bool() && page_started == 0 {
        unsafe {
            let _ = EndDocPrinter(handle);
        }
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            "StartPagePrinter failed",
        ));
    }

    let mut written: u32 = 0;
    let ok = unsafe {
        WritePrinter(
            handle,
            bytes.as_ptr() as *const _,
            bytes.len() as u32,
            &mut written,
        )
    };
    unsafe {
        let _ = EndPagePrinter(handle);
        let _ = EndDocPrinter(handle);
    }

    if !ok.as_bool() || written as usize != bytes.len() {
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("WritePrinter wrote {written} of {} bytes", bytes.len()),
        ));
    }
    Ok(())
}
