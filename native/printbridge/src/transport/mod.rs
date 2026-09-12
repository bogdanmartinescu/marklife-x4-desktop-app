use std::env;
use std::path::{Path, PathBuf};

use crate::errors::BridgeError;

pub mod ble;
pub mod serial;
pub mod tcp;
pub mod usb;

#[cfg(any(target_os = "macos", target_os = "linux"))]
pub mod cups;

#[cfg(target_os = "windows")]
pub mod windows;

#[derive(Debug, Clone)]
pub struct PrintConfig {
    pub backend: String,
    pub printer_id: Option<String>,
    pub system_name: Option<String>,
    pub job_name: String,
    pub tcp_host: Option<String>,
    pub tcp_port: Option<u16>,
    pub usb_vid_pid: Option<String>,
    pub usb_interface: Option<u8>,
    pub usb_out_endpoint: Option<u8>,
    pub serial_port: Option<String>,
    pub bt_address: Option<String>,
    pub bt_service_uuid: Option<String>,
    pub bt_tx_char_uuid: Option<String>,
    pub bt_write_mode: Option<String>,
    pub bt_local_name: Option<String>,
    /// When true (default), CUPS submits a raw thermal payload. Document printers must be false.
    pub raw_job: bool,
    pub cups_media: Option<String>,
}

pub fn validate_job_path(path: &Path) -> Result<PathBuf, BridgeError> {
    let requested = if path.is_absolute() {
        path.to_path_buf()
    } else {
        env::current_dir()
            .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?
            .join(path)
    };

    if !requested.exists() {
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("Print job file does not exist: {}", requested.display()),
        ));
    }

    if is_dev_mode() {
        return Ok(requested);
    }

    let Some(allowed) = env::var_os("THERMALBRIDGE_JOB_DIR") else {
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            "Job path rejected: THERMALBRIDGE_JOB_DIR is not set",
        ));
    };

    let allowed_path = PathBuf::from(allowed);
    let canonical = requested
        .canonicalize()
        .map_err(|error| BridgeError::new("PRINT_WRITE_FAILED", error.to_string()))?;
    let allowed_canonical = allowed_path.canonicalize().map_err(|error| {
        BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("Invalid THERMALBRIDGE_JOB_DIR: {error}"),
        )
    })?;

    if !canonical.starts_with(&allowed_canonical) {
        return Err(BridgeError::new(
            "PRINT_WRITE_FAILED",
            "Job path is outside the configured temp directory",
        ));
    }

    Ok(canonical)
}

pub fn is_dev_mode() -> bool {
    matches!(env::var("THERMALBRIDGE_DEV"), Ok(value) if value == "1")
}

pub async fn send_raw_file(config: &PrintConfig, path: &str) -> Result<(), BridgeError> {
    let validated = validate_job_path(Path::new(path))?;
    let bytes = std::fs::read(&validated).map_err(|error| {
        BridgeError::new(
            "PRINT_WRITE_FAILED",
            format!("Failed to read job file: {error}"),
        )
    })?;

    match config.backend.as_str() {
        "tcp" => tcp::send(config, &bytes),
        "usb" => usb::send(config, &bytes),
        "bluetooth-spp" => serial::send(config, &bytes),
        "bluetooth-ble" => ble::send(config, &bytes).await,
        "cups" => {
            #[cfg(any(target_os = "macos", target_os = "linux"))]
            {
                cups::send(config, &validated)
            }
            #[cfg(not(any(target_os = "macos", target_os = "linux")))]
            {
                Err(BridgeError::new(
                    "RAW_PRINT_UNSUPPORTED",
                    "CUPS is not available on this platform",
                ))
            }
        }
        "windows-spooler" => {
            #[cfg(target_os = "windows")]
            {
                windows::send(config, &bytes)
            }
            #[cfg(not(target_os = "windows"))]
            {
                Err(BridgeError::new(
                    "RAW_PRINT_UNSUPPORTED",
                    "Windows spooler is not available on this platform",
                ))
            }
        }
        other => Err(BridgeError::new(
            "RAW_PRINT_UNSUPPORTED",
            format!("Unknown printer backend: {other}"),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn rejects_missing_file() {
        let error = validate_job_path(Path::new("/tmp/thermalbridge-missing-job.prn")).unwrap_err();
        assert_eq!(error.code, "PRINT_WRITE_FAILED");
    }

    #[test]
    fn accepts_existing_file_in_dev_mode() {
        env::set_var("THERMALBRIDGE_DEV", "1");
        let dir = env::temp_dir();
        let path = dir.join("thermalbridge-dev-job.prn");
        let mut file = std::fs::File::create(&path).unwrap();
        file.write_all(b"SIZE 100 mm,150 mm\r\n").unwrap();
        let validated = validate_job_path(&path).unwrap();
        assert!(validated.exists());
        env::remove_var("THERMALBRIDGE_DEV");
        let _ = std::fs::remove_file(path);
    }
}
