mod files;
mod model;
mod platform;

use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};

use model::{DesktopItem, FolderChange, MonitorSnapshot};
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use parking_lot::Mutex;
use serde_json::Value;
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Notify(#[from] notify::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Clone)]
struct FileOperation {
    moves: Vec<(PathBuf, PathBuf)>,
}

#[derive(Default)]
struct RuntimeState {
    watchers: Mutex<HashMap<String, RecommendedWatcher>>,
    file_history: Mutex<Vec<FileOperation>>,
}

fn state_path(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::Message(error.to_string()))?;
    fs::create_dir_all(&directory)?;
    Ok(directory.join("workspace.json"))
}

#[tauri::command]
fn load_state(app: tauri::AppHandle) -> AppResult<Option<Value>> {
    let path = state_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    Ok(Some(serde_json::from_slice(&fs::read(path)?)?))
}

#[tauri::command]
fn save_state(app: tauri::AppHandle, state: Value) -> AppResult<()> {
    let path = state_path(&app)?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, serde_json::to_vec_pretty(&state)?)?;
    if path.exists() {
        let backup = path.with_extension("json.bak");
        let _ = fs::copy(&path, backup);
        fs::remove_file(&path)?;
    }
    fs::rename(temporary, path)?;
    Ok(())
}

#[tauri::command]
fn get_monitors(window: tauri::WebviewWindow) -> AppResult<Vec<MonitorSnapshot>> {
    platform::cover_virtual_desktop(&window)?;
    let monitors = window
        .available_monitors()
        .map_err(|error| AppError::Message(error.to_string()))?;
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
    let primary_name = window
        .primary_monitor()
        .ok()
        .flatten()
        .and_then(|monitor| monitor.name().cloned());
    Ok(monitors
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            let position = monitor.position();
            let size = monitor.size();
            let name = monitor
                .name()
                .cloned()
                .unwrap_or_else(|| format!("显示器 {}", index + 1));
            MonitorSnapshot {
                id: name.clone(),
                primary: primary_name.as_ref() == Some(&name)
                    || (primary_name.is_none() && index == 0),
                name,
                x: position.x - left,
                y: position.y - top,
                width: size.width,
                height: size.height,
                scale_factor: monitor.scale_factor(),
            }
        })
        .collect())
}

#[tauri::command]
fn list_desktop_items() -> AppResult<Vec<DesktopItem>> {
    let path =
        dirs::desktop_dir().ok_or_else(|| AppError::Message("无法定位 Windows 桌面目录".into()))?;
    files::list_folder(&path)
}

#[tauri::command]
fn choose_folder(app: tauri::AppHandle) -> AppResult<Option<String>> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|value| {
            value
                .into_path()
                .map(|path| path.to_string_lossy().into_owned())
                .map_err(|error| AppError::Message(error.to_string()))
        })
        .transpose()
}

#[tauri::command]
fn list_folder(path: String) -> AppResult<Vec<DesktopItem>> {
    files::list_folder(Path::new(&path))
}

#[tauri::command]
fn open_path(path: String) -> AppResult<()> {
    platform::open_path(Path::new(&path))
}

fn move_many(paths: Vec<String>, target_folder: &Path) -> AppResult<FileOperation> {
    fs::create_dir_all(target_folder)?;
    let mut operation = FileOperation { moves: Vec::new() };
    for value in paths {
        let source = PathBuf::from(value);
        files::ensure_source(&source)?;
        let name = source
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or_else(|| AppError::Message("文件名无效".into()))?;
        let destination = files::unique_target(target_folder, name);
        files::move_path(&source, &destination)?;
        operation.moves.push((source, destination));
    }
    Ok(operation)
}

#[tauri::command]
fn move_files(
    paths: Vec<String>,
    target_folder: String,
    state: State<'_, RuntimeState>,
) -> AppResult<()> {
    let operation = move_many(paths, Path::new(&target_folder))?;
    state.file_history.lock().push(operation);
    Ok(())
}

#[tauri::command]
fn move_file(path: String, target_path: String, state: State<'_, RuntimeState>) -> AppResult<()> {
    let source = PathBuf::from(path);
    let destination = PathBuf::from(target_path);
    files::ensure_source(&source)?;
    files::move_path(&source, &destination)?;
    state.file_history.lock().push(FileOperation {
        moves: vec![(source, destination)],
    });
    Ok(())
}

#[tauri::command]
fn move_to_desktop(paths: Vec<String>, state: State<'_, RuntimeState>) -> AppResult<()> {
    let desktop =
        dirs::desktop_dir().ok_or_else(|| AppError::Message("无法定位 Windows 桌面目录".into()))?;
    let operation = move_many(paths, &desktop)?;
    state.file_history.lock().push(operation);
    Ok(())
}

#[tauri::command]
fn delete_file(
    app: tauri::AppHandle,
    path: String,
    state: State<'_, RuntimeState>,
) -> AppResult<()> {
    let source = PathBuf::from(path);
    files::ensure_source(&source)?;
    let trash = app
        .path()
        .app_data_dir()
        .map_err(|error| AppError::Message(error.to_string()))?
        .join("recycle")
        .join(Uuid::new_v4().to_string());
    fs::create_dir_all(&trash)?;
    let name = source
        .file_name()
        .ok_or_else(|| AppError::Message("文件名无效".into()))?;
    let destination = trash.join(name);
    files::move_path(&source, &destination)?;
    state.file_history.lock().push(FileOperation {
        moves: vec![(source, destination)],
    });
    Ok(())
}

#[tauri::command]
fn undo_file_operation(state: State<'_, RuntimeState>) -> AppResult<bool> {
    let operation = match state.file_history.lock().pop() {
        Some(operation) => operation,
        None => return Ok(false),
    };
    for (source, destination) in operation.moves.into_iter().rev() {
        if destination.exists() {
            if source.exists() {
                return Err(AppError::Message(format!(
                    "无法撤销，原路径已被占用：{}",
                    source.display()
                )));
            }
            files::move_path(&destination, &source)?;
        }
    }
    Ok(true)
}

#[tauri::command]
fn watch_folder(
    app: tauri::AppHandle,
    container_id: String,
    path: String,
    state: State<'_, RuntimeState>,
) -> AppResult<()> {
    let root = PathBuf::from(path);
    files::ensure_source(&root)?;
    let event_name = format!("folder-change:{container_id}");
    let event_container_id = container_id.clone();
    let app = Arc::new(app);
    let mut watcher =
        notify::recommended_watcher(move |result: Result<notify::Event, notify::Error>| {
            let event = match result {
                Ok(event) => event,
                Err(_) => return,
            };
            let mut upsert = Vec::new();
            let mut removed_paths = Vec::new();
            for path in event.paths {
                if path.exists() {
                    if let Ok(item) = files::item_from_path(&path) {
                        upsert.push(item);
                    }
                } else if matches!(event.kind, EventKind::Remove(_) | EventKind::Modify(_)) {
                    removed_paths.push(path.to_string_lossy().into_owned());
                }
            }
            let _ = app.emit(
                &event_name,
                FolderChange {
                    container_id: event_container_id.clone(),
                    upsert,
                    removed_paths,
                },
            );
        })?;
    watcher.watch(&root, RecursiveMode::NonRecursive)?;
    state.watchers.lock().insert(container_id, watcher);
    Ok(())
}

#[tauri::command]
fn unwatch_folder(container_id: String, state: State<'_, RuntimeState>) {
    state.watchers.lock().remove(&container_id);
}

#[tauri::command]
fn set_toggle_shortcut(app: tauri::AppHandle, shortcut: String) -> AppResult<()> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| AppError::Message(error.to_string()))?;
    app.global_shortcut()
        .register(shortcut.as_str())
        .map_err(|error| AppError::Message(error.to_string()))?;
    Ok(())
}

#[tauri::command]
fn set_start_with_windows(enabled: bool) -> AppResult<()> {
    let executable = std::env::current_exe()?;
    platform::set_start_with_windows(enabled, &executable)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("desktop") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        let _ = app.emit("toggle-containers", ());
                    }
                })
                .build(),
        )
        .manage(RuntimeState::default())
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            get_monitors,
            list_desktop_items,
            choose_folder,
            list_folder,
            open_path,
            move_files,
            move_file,
            move_to_desktop,
            delete_file,
            undo_file_operation,
            watch_folder,
            unwatch_folder,
            set_toggle_shortcut,
            set_start_with_windows
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("desktop") {
                platform::cover_virtual_desktop(&window)?;
                let _ = platform::attach_to_desktop(&window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run desktop manager");
}
