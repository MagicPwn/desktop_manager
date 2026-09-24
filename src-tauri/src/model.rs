use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub kind: String,
    pub extension: Option<String>,
    pub modified_at: Option<u64>,
    pub icon_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorSnapshot {
    pub id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub primary: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderChange {
    pub container_id: String,
    pub upsert: Vec<DesktopItem>,
    pub removed_paths: Vec<String>,
}
