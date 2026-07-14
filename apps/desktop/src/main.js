const invoke = (...args) => window.__TAURI__.core.invoke(...args);

async function appWindow() {
  const w = window.__TAURI__.window;
  if (w.getCurrentWindow) return w.getCurrentWindow();
  if (w.getCurrent) return w.getCurrent();
  throw new Error("no window api");
}

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const refreshBtn = document.getElementById("refresh-btn");
const titleIcon = document.getElementById("titlebar-icon");
const brandMark = document.getElementById("brand-mark");

const SVG_MAXIMIZE =
  '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>';
const SVG_RESTORE =
  '<svg width="10" height="10" viewBox="0 0 10 10">' +
  '<rect x="2.5" y="1.2" width="6" height="6" stroke="currentColor" stroke-width="1.15" fill="none"/>' +
  '<path d="M1.5 3.2h5.2v5.2H1.5z" stroke="currentColor" stroke-width="1.15" fill="none"/>' +
  "</svg>";

// Chooser page uses dark chrome; in-app mark = light glyph. Taskbar from OS only.
if (titleIcon) titleIcon.src = "./assets/pi-mark-dark.png";
if (brandMark) brandMark.src = "./assets/pi-mark-dark.png";

async function syncTaskbarFromOs() {
  try {
    await invoke("sync_taskbar_icon");
  } catch {
    try {
      // legacy: now ignores bool, uses OS SystemUsesLightTheme
      await invoke("set_theme_chrome", { dark: true });
    } catch (e) {
      console.warn(e);
    }
  }
}
void syncTaskbarFromOs();

async function updateMaxBtn() {
  const btn = document.getElementById("tb-max");
  if (!btn) return;
  let max = false;
  try {
    max = !!(await (await appWindow()).isMaximized());
  } catch { /* ignore */ }
  btn.innerHTML = max ? SVG_RESTORE : SVG_MAXIMIZE;
  btn.title = max ? "还原" : "最大化";
  btn.setAttribute("aria-label", max ? "Restore" : "Maximize");
}

async function winMin() {
  try {
    await (await appWindow()).minimize();
  } catch {
    try {
      await invoke("window_minimize");
    } catch (e) {
      console.warn(e);
    }
  }
}
async function winMax() {
  try {
    const win = await appWindow();
    if (win.toggleMaximize) await win.toggleMaximize();
    else if (await win.isMaximized()) await win.unmaximize();
    else await win.maximize();
  } catch {
    try {
      await invoke("window_toggle_maximize");
    } catch (e) {
      console.warn(e);
    }
  }
  setTimeout(() => void updateMaxBtn(), 50);
  setTimeout(() => void updateMaxBtn(), 200);
}
async function winClose() {
  try {
    await (await appWindow()).close();
  } catch {
    try {
      await invoke("window_close");
    } catch (e) {
      console.warn(e);
    }
  }
}

function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.webkitAppRegion = "no-drag";
  el.addEventListener("mousedown", (e) => e.stopPropagation());
  el.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  });
}
bindBtn("tb-min", () => void winMin());
bindBtn("tb-max", () => void winMax());
bindBtn("tb-close", () => void winClose());
void updateMaxBtn();
appWindow()
  .then((win) => {
    if (win.onResized) win.onResized(() => void updateMaxBtn());
  })
  .catch(() => {});

function shortPath(p) {
  if (!p) return "(unknown cwd)";
  const parts = p.replace(/\\/g, "/").split("/");
  if (parts.length <= 3) return p;
  return "…/" + parts.slice(-3).join("/");
}

async function connect(port) {
  statusEl.textContent = `正在连接 127.0.0.1:${port}…`;
  try {
    await invoke("open_instance", { port });
  } catch (e) {
    statusEl.textContent = String(e);
  }
}

function render(instances) {
  listEl.innerHTML = "";
  if (!instances.length) {
    listEl.hidden = true;
    emptyEl.hidden = false;
    statusEl.textContent = "未发现可用实例";
    return;
  }

  emptyEl.hidden = true;
  listEl.hidden = false;
  statusEl.textContent =
    instances.length === 1
      ? "发现 1 个实例（可点击连接；若已自动进入可忽略）"
      : `发现 ${instances.length} 个实例，请选择：`;

  for (const inst of instances) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    const title = document.createElement("div");
    title.className = "card-title";
    const left = document.createElement("span");
    left.textContent = `端口 ${inst.port}`;
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "healthy";
    title.append(left, badge);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${shortPath(inst.cwd)}  ·  pid ${inst.pid}`;

    btn.append(title, meta);
    btn.addEventListener("click", () => connect(inst.port));
    listEl.appendChild(btn);
  }
}

async function refresh() {
  statusEl.textContent = "正在查找本机 Tau 实例…";
  try {
    const instances = await invoke("list_tau_instances");
    render(instances || []);
  } catch (e) {
    statusEl.textContent = "扫描失败: " + String(e);
    listEl.hidden = true;
    emptyEl.hidden = false;
  }
}

refreshBtn.addEventListener("click", refresh);
refresh();
setInterval(refresh, 4000);
