//! Discover live Tau mirror instances from ~/.pi/tau-instances.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TauInstance {
    pub port: u16,
    pub pid: u32,
    #[serde(default)]
    pub session_file: String,
    #[serde(default)]
    pub cwd: String,
    #[serde(default)]
    pub started_at: String,
    /// true when GET /api/health on loopback succeeds
    pub healthy: bool,
}

fn instances_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".pi").join("tau-instances"))
}

fn health_ok(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{port}/api/health");
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_millis(400))
        .timeout(Duration::from_millis(1200))
        .build();
    match agent.get(&url).call() {
        Ok(resp) => resp.status() >= 200 && resp.status() < 300,
        Err(_) => false,
    }
}

/// Scan registry files; only return instances whose loopback health check passes.
pub fn list_instances() -> Vec<TauInstance> {
    let Some(dir) = instances_dir() else {
        return Vec::new();
    };
    if !dir.is_dir() {
        return Vec::new();
    }

    let mut out: Vec<TauInstance> = Vec::new();
    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return out,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let text = match fs::read_to_string(&path) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let raw: serde_json::Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let port = raw.get("port").and_then(|v| v.as_u64()).unwrap_or(0) as u16;
        if port == 0 {
            continue;
        }
        // Prefer healthy only — stale PID files are ignored
        if !health_ok(port) {
            continue;
        }

        let pid = raw.get("pid").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let session_file = raw
            .get("sessionFile")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let cwd = raw
            .get("cwd")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let started_at = raw
            .get("startedAt")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        out.push(TauInstance {
            port,
            pid,
            session_file,
            cwd,
            started_at,
            healthy: true,
        });
    }

    out.sort_by_key(|i| i.port);
    let mut seen = HashSet::new();
    out.retain(|i| seen.insert(i.port));
    out
}

pub fn port_healthy(port: u16) -> bool {
    health_ok(port)
}
