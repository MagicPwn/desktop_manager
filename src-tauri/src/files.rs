use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use uuid::Uuid;

use crate::{model::DesktopItem, AppError, AppResult};

pub fn item_from_path(path: &Path) -> AppResult<DesktopItem> {
    let metadata = fs::metadata(path)?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_owned();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_lowercase);
    let kind = if metadata.is_dir() {
        "folder"
    } else if extension.as_deref() == Some("lnk") {
        "shortcut"
    } else {
        "file"
    };
    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis() as u64);
    Ok(DesktopItem {
        id: format!("item-{}", Uuid::new_v4()),
        name,
        path: path.to_string_lossy().into_owned(),
        kind: kind.to_owned(),
        extension,
        modified_at,
        icon_hint: None,
    })
}

pub fn list_folder(path: &Path) -> AppResult<Vec<DesktopItem>> {
    let mut items = fs::read_dir(path)?
        .filter_map(Result::ok)
        .filter_map(|entry| item_from_path(&entry.path()).ok())
        .collect::<Vec<_>>();
    items.sort_by(|left, right| {
        let left_folder = left.kind == "folder";
        let right_folder = right.kind == "folder";
        right_folder
            .cmp(&left_folder)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(items)
}

pub fn unique_target(folder: &Path, name: &str) -> PathBuf {
    let candidate = folder.join(name);
    if !candidate.exists() {
        return candidate;
    }
    let path = Path::new(name);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("item");
    let extension = path.extension().and_then(|value| value.to_str());
    for index in 2..10_000 {
        let suffix = match extension {
            Some(extension) => format!("{stem} ({index}).{extension}"),
            None => format!("{stem} ({index})"),
        };
        let candidate = folder.join(suffix);
        if !candidate.exists() {
            return candidate;
        }
    }
    folder.join(format!("{stem}-{}", Uuid::new_v4()))
}

pub fn move_path(source: &Path, destination: &Path) -> AppResult<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    match fs::rename(source, destination) {
        Ok(()) => Ok(()),
        Err(_) if source.is_dir() => {
            copy_dir(source, destination)?;
            fs::remove_dir_all(source)?;
            Ok(())
        }
        Err(_) => {
            fs::copy(source, destination)?;
            fs::remove_file(source)?;
            Ok(())
        }
    }
}

fn copy_dir(source: &Path, destination: &Path) -> AppResult<()> {
    fs::create_dir_all(destination)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let target = destination.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

pub fn ensure_source(source: &Path) -> AppResult<()> {
    if !source.exists() {
        return Err(AppError::Message(format!(
            "路径不存在：{}",
            source.display()
        )));
    }
    Ok(())
}
