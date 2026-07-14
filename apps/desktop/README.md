# Tau Desktop

Native window for the Tau web UI (Tauri 2 + WebView2 on Windows).

**Product repo only** ([gzjggg/tau](https://github.com/gzjggg/tau)) — desktop changes are **not** pushed to `tau-pr` / upstream.

## Architecture (D2)

| Layer | Role |
|-------|------|
| Bundled `public/` | UI assets inside the desktop app (`frontendDist`) |
| Pi + Tau extension | HTTP/WS on `127.0.0.1:<port>` |
| Desktop shell | Discovers port via `~/.pi/tau-instances`, custom titlebar, taskbar icon |

The window loads the **same** `public/` UI as the browser. API/WebSocket traffic goes to loopback using `window.__TAU_ENDPOINT__` / `get_active_port` (see `public/tau-endpoint.js`).

Closing the desktop window **does not** exit Pi.

## Prerequisites

- Rust (rustup) + MSVC build tools (Windows)
- WebView2 Runtime (Windows 11 usually included)
- Node.js 18+

## Build

```bash
cd apps/desktop
npm install
npm run build
```

Outputs:

- Exe: `src-tauri/target/release/tau-desktop.exe`
- Installer (NSIS): `src-tauri/target/release/bundle/nsis/Tau_*_x64-setup.exe`

Dev:

```bash
npm run dev
```

## Launch from Pi

Default `client: "desktop"`:

1. Extension finds `tau-desktop.exe`
2. Runs `tau-desktop --port <port>`
3. If missing → browser fallback (`desktopFallback: "browser"`)

Search paths: `TAU_DESKTOP_PATH` → `settings.tau.desktopPath` → package `apps/desktop/.../release/tau-desktop.exe` → `%LOCALAPPDATA%\Programs\Tau\`.

```json
{
  "tau": {
    "client": "desktop",
    "desktopFallback": "browser",
    "desktopPath": "C:/Users/you/projects/tau/apps/desktop/src-tauri/target/release/tau-desktop.exe"
  }
}
```

- Browser only: `"client": "browser"` or `TAU_CLIENT=browser`
- No auto-open: `"autoOpenBrowser": false` or `TAU_AUTO_OPEN=0`

## Chrome notes

- Frameless window + themed titlebar (follows Tau UI theme)
- Taskbar Pi glyph follows **Windows system** light/dark (not app theme)
- Maximize button toggles to dual rounded restore glyph

## Phases

| Phase | Status |
|-------|--------|
| D1 loopback shell + launcher | Done |
| D2 bundled `public/` + endpoint | Done (this tree) |
| D3 signed store distribution | Optional later |
