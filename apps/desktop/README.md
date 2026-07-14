# Tau Desktop (D1)

Native window shell for the Tau web UI (Tauri 2 + WebView2 on Windows).

## What it does

1. Reads `~/.pi/tau-instances/*.json` written by the Tau extension.
2. Checks `http://127.0.0.1:<port>/api/health`.
3. Opens a window on the **loopback** Tau UI (same pages as the browser).
4. If Pi is not running, shows a chooser / empty state — **does not** spawn Pi.

Closing the desktop window **does not** exit Pi.

## Prerequisites

- Rust (rustup) + MSVC build tools (Windows)
- WebView2 Runtime (included on Windows 11)
- Node.js 18+

## Build

```bash
cd apps/desktop
npm install
npm run build
```

Outputs:

- Exe: `src-tauri/target/release/tau-desktop.exe`
- Installer (NSIS): `src-tauri/target/release/bundle/nsis/Tau_0.1.0_x64-setup.exe`

Dev loop:

```bash
npm run dev
```

## Launch from Pi / Tau extension

With default settings (`client: "desktop"`), when the mirror server starts it:

1. Looks for `tau-desktop.exe` (see search paths below).
2. Runs `tau-desktop --port <port>`.
3. If not found, falls back to the system browser (`desktopFallback: "browser"`).

Search order:

1. `TAU_DESKTOP_PATH` / `settings.tau.desktopPath`
2. `<package>/apps/desktop/src-tauri/target/release/tau-desktop.exe`
3. `debug` build of the same
4. `%LOCALAPPDATA%\Programs\Tau\tau-desktop.exe`

Example `~/.pi/agent/settings.json`:

```json
{
  "tau": {
    "client": "desktop",
    "desktopFallback": "browser",
    "desktopPath": "C:/Users/you/projects/tau/apps/desktop/src-tauri/target/release/tau-desktop.exe"
  }
}
```

Force browser only: `"client": "browser"` or `TAU_CLIENT=browser`.  
Disable auto-open: `"autoOpenBrowser": false` or `TAU_AUTO_OPEN=0`.

## Scope

- **Product repo only** ([gzjggg/tau](https://github.com/gzjggg/tau)) — not synced to `tau-pr` / upstream.
- D1 = thin loopback shell. Bundled offline UI is a later phase (D2).
