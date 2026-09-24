use std::{path::Path, process::Command};

use tauri::WebviewWindow;

use crate::{AppError, AppResult};

pub fn cover_virtual_desktop(window: &WebviewWindow) -> AppResult<()> {
    let monitors = window
        .available_monitors()
        .map_err(|error| AppError::Message(error.to_string()))?;
    if monitors.is_empty() {
        return Ok(());
    }
    let left = monitors
        .iter()
        .map(|monitor| monitor.position().x)
        .min()
        .unwrap_or(0);
    let top = monitors
        .iter()
        .map(|monitor| monitor.position().y)
        .min()
        .unwrap_or(0);
    let right = monitors
        .iter()
        .map(|monitor| monitor.position().x + monitor.size().width as i32)
        .max()
        .unwrap_or(1280);
    let bottom = monitors
        .iter()
        .map(|monitor| monitor.position().y + monitor.size().height as i32)
        .max()
        .unwrap_or(720);
    window
        .set_position(tauri::PhysicalPosition::new(left, top))
        .map_err(|error| AppError::Message(error.to_string()))?;
    window
        .set_size(tauri::PhysicalSize::new(
            (right - left) as u32,
            (bottom - top) as u32,
        ))
        .map_err(|error| AppError::Message(error.to_string()))?;
    Ok(())
}

pub fn open_path(path: &Path) -> AppResult<()> {
    #[cfg(windows)]
    Command::new("explorer.exe").arg(path).spawn()?;
    #[cfg(target_os = "linux")]
    Command::new("xdg-open").arg(path).spawn()?;
    #[cfg(target_os = "macos")]
    Command::new("open").arg(path).spawn()?;
    Ok(())
}

#[cfg(windows)]
pub fn attach_to_desktop(window: &WebviewWindow) -> AppResult<()> {
    use windows::core::w;
    use windows::Win32::{
        Foundation::{HWND, LPARAM, WPARAM},
        UI::WindowsAndMessaging::{
            EnumWindows, FindWindowExW, FindWindowW, SendMessageTimeoutW, SetParent, SMTO_NORMAL,
        },
    };

    unsafe {
        let progman = FindWindowW(w!("Progman"), None)
            .map_err(|error| AppError::Message(error.to_string()))?;
        let mut result = 0usize;
        let _ = SendMessageTimeoutW(
            progman,
            0x052C,
            WPARAM(0),
            LPARAM(0),
            SMTO_NORMAL,
            1000,
            Some(&mut result),
        );
        unsafe extern "system" fn find_worker(hwnd: HWND, lparam: LPARAM) -> windows_core::BOOL {
            if FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), None).is_ok() {
                if let Ok(worker) = FindWindowExW(None, Some(hwnd), w!("WorkerW"), None) {
                    *(lparam.0 as *mut HWND) = worker;
                    return windows_core::BOOL(0);
                }
            }
            windows_core::BOOL(1)
        }
        let mut worker = HWND::default();
        let _ = EnumWindows(
            Some(find_worker),
            LPARAM((&mut worker as *mut HWND) as isize),
        );
        if worker.0.is_null() {
            return Err(AppError::Message("无法找到 Windows 桌面 WorkerW".into()));
        }
        use raw_window_handle::{HasWindowHandle, RawWindowHandle};
        let handle = window
            .window_handle()
            .map_err(|error| AppError::Message(error.to_string()))?;
        let hwnd = match handle.as_raw() {
            RawWindowHandle::Win32(handle) => HWND(handle.hwnd.get() as *mut _),
            _ => return Err(AppError::Message("窗口句柄不是 Win32 类型".into())),
        };
        SetParent(hwnd, Some(worker)).map_err(|error| AppError::Message(error.to_string()))?;
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn attach_to_desktop(_window: &WebviewWindow) -> AppResult<()> {
    Ok(())
}

#[cfg(windows)]
pub fn set_start_with_windows(enabled: bool, executable: &Path) -> AppResult<()> {
    use windows::{
        core::{w, HSTRING},
        Win32::System::Registry::{
            RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegSetValueExW, HKEY_CURRENT_USER,
            KEY_SET_VALUE, REG_SZ,
        },
    };
    let value = HSTRING::from("DesktopManager");
    unsafe {
        let mut key = Default::default();
        let status = RegOpenKeyExW(
            HKEY_CURRENT_USER,
            w!("Software\\Microsoft\\Windows\\CurrentVersion\\Run"),
            None,
            KEY_SET_VALUE,
            &mut key,
        );
        if status.0 != 0 {
            return Err(AppError::Message(format!(
                "无法打开 Windows 启动项注册表：{}",
                status.0
            )));
        }
        if enabled {
            let command = format!("\"{}\"", executable.display());
            let bytes = command
                .encode_utf16()
                .chain(Some(0))
                .flat_map(u16::to_le_bytes)
                .collect::<Vec<_>>();
            let status = RegSetValueExW(key, &value, None, REG_SZ, Some(&bytes));
            if status.0 != 0 {
                let _ = RegCloseKey(key);
                return Err(AppError::Message(format!(
                    "无法写入 Windows 启动项：{}",
                    status.0
                )));
            }
        } else {
            let _ = RegDeleteValueW(key, &value);
        }
        let _ = RegCloseKey(key);
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn set_start_with_windows(_enabled: bool, _executable: &Path) -> AppResult<()> {
    Err(AppError::Message("开机启动只在 Windows 中可用".into()))
}
