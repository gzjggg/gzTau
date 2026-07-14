mod instance;

use instance::{list_instances, loopback_url, port_healthy, TauInstance};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use url::Url;

/// Parse `--port N` or `--port=N` from process args (used by Tau extension launcher).
fn port_from_args() -> Option<u16> {
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        if a == "--port" {
            return args.next().and_then(|p| p.parse().ok());
        }
        if let Some(rest) = a.strip_prefix("--port=") {
            return rest.parse().ok();
        }
    }
    None
}

fn navigate_main(app: &AppHandle, port: u16) -> Result<(), String> {
    let url_str = loopback_url(port);
    let parsed = Url::parse(&url_str).map_err(|e| e.to_string())?;

    if let Some(win) = app.get_webview_window("main") {
        win.navigate(parsed).map_err(|e| e.to_string())?;
        let _ = win.set_focus();
        let _ = win.unminimize();
        let _ = win.show();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "main", WebviewUrl::External(parsed))
        .title("Tau")
        .inner_size(1280.0, 860.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_tau_instances() -> Vec<TauInstance> {
    list_instances()
}

#[tauri::command]
fn open_instance(app: AppHandle, port: u16) -> Result<(), String> {
    if port == 0 {
        return Err("invalid port".into());
    }
    if !port_healthy(port) {
        return Err(format!(
            "No healthy Tau at 127.0.0.1:{port}. Start Pi with Tau first."
        ));
    }
    navigate_main(&app, port)
}

fn focus_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let port = {
                let mut it = argv.iter().skip(1);
                let mut found = None;
                while let Some(a) = it.next() {
                    if a == "--port" {
                        found = it.next().and_then(|p| p.parse().ok());
                        break;
                    }
                    if let Some(rest) = a.strip_prefix("--port=") {
                        found = rest.parse().ok();
                        break;
                    }
                }
                found
            };
            if let Some(port) = port {
                let _ = navigate_main(app, port);
            } else {
                focus_main(app);
            }
        }))
        .invoke_handler(tauri::generate_handler![list_tau_instances, open_instance])
        .setup(|app| {
            let handle = app.handle().clone();
            let forced = port_from_args();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(250));
                if let Some(port) = forced {
                    let _ = navigate_main(&handle, port);
                    return;
                }
                let healthy = list_instances();
                if healthy.len() == 1 {
                    let _ = navigate_main(&handle, healthy[0].port);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tau desktop");
}
