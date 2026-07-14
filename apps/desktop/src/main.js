const { invoke } = window.__TAURI__.core;

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const refreshBtn = document.getElementById("refresh-btn");

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
    badge.className = "badge" + (inst.healthy ? "" : " warn");
    badge.textContent = inst.healthy ? "healthy" : "pid only";
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
// Auto-refresh while waiting for Pi to start
setInterval(refresh, 4000);
