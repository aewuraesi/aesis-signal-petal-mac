// Local-first cloud sync.
//
// The workspace stays the source of truth in localStorage; this layer mirrors it to
// the D1-backed /api/state endpoint so the same data follows you across devices.
// Strategy is last-write-wins: on load, server data newer than the last sync is
// applied (with a reload to re-hydrate); otherwise local is pushed up. Changes are
// pushed on a short interval and when the page is hidden, so writes are never lost.

const PREFIX = "signal-petal-";
const DEVICE_KEY = "signal-petal-device-id";
const LAST_SYNC_KEY = "signal-petal-last-sync";
// Per-device keys that must never travel to the cloud.
const EXCLUDE = new Set([
  DEVICE_KEY,
  LAST_SYNC_KEY,
  "signal-petal-task-reminder-day",
  "signal-petal-check-in-day",
]);

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function collectState(): string {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX) && !EXCLUDE.has(key)) {
      snapshot[key] = localStorage.getItem(key) ?? "";
    }
  }
  return JSON.stringify(snapshot);
}

function applyState(data: string): void {
  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith(PREFIX) && !EXCLUDE.has(key)) localStorage.setItem(key, value);
  }
}

async function fetchState(): Promise<{ data: string | null; updatedAt: number }> {
  const res = await fetch("/api/state", { headers: { "x-device-id": getDeviceId() } });
  if (!res.ok) return { data: null, updatedAt: 0 };
  return (await res.json()) as { data: string | null; updatedAt: number };
}

async function pushState(data: string, updatedAt: number): Promise<void> {
  await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-id": getDeviceId() },
    body: JSON.stringify({ data, updatedAt }),
  });
}

export async function initSync(): Promise<void> {
  const server = await fetchState().catch(() => ({ data: null, updatedAt: 0 }));
  const hasLocalData = Boolean(localStorage.getItem("signal-petal-issues"));
  const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY)) || 0;
  const isFirstSync = lastSync === 0;

  // Server is newer than our last sync → pull it in (and reload to re-hydrate).
  // On a first sync we only pull if this device is empty, so existing local data
  // is never clobbered by stale cloud state the first time sync is enabled.
  if (server.data && !isFirstSync && server.updatedAt > lastSync) {
    applyState(server.data);
    localStorage.setItem(LAST_SYNC_KEY, String(server.updatedAt));
    window.location.reload();
    return;
  }
  if (server.data && isFirstSync && !hasLocalData) {
    applyState(server.data);
    localStorage.setItem(LAST_SYNC_KEY, String(server.updatedAt));
    window.location.reload();
    return;
  }

  // Local is authoritative (or the cloud is empty): push it up now.
  if (hasLocalData) {
    const updatedAt = Date.now();
    await pushState(collectState(), updatedAt).catch(() => undefined);
    localStorage.setItem(LAST_SYNC_KEY, String(updatedAt));
  }

  // Mirror subsequent writes.
  let lastSnapshot = collectState();
  const flush = async () => {
    const snapshot = collectState();
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    const updatedAt = Date.now();
    await pushState(snapshot, updatedAt).catch(() => undefined);
    localStorage.setItem(LAST_SYNC_KEY, String(updatedAt));
  };
  window.setInterval(() => {
    if (document.visibilityState !== "hidden") void flush();
  }, 5000);
  window.addEventListener("pagehide", () => void flush());
}
