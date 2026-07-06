// Thin API client. Holds the session token, attaches it to every request,
// and signals the app to re-lock on any 401.
const TOKEN_KEY = "mm-session";
const DEVICE_KEY = "mm-device";

export class ApiError extends Error {
  code: string;
  status: number;
  data: any;
  constructor(code: string, status: number, data?: any) {
    super(code);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getDeviceId() {
  let d = localStorage.getItem(DEVICE_KEY);
  if (!d) {
    d =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    localStorage.setItem(DEVICE_KEY, d);
  }
  return d;
}

function deviceName() {
  const ua = navigator.userAgent || "";
  const os =
    /Mac/.test(ua) ? "macOS" :
    /Windows/.test(ua) ? "Windows" :
    /Linux/.test(ua) ? "Linux" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" : "Web";
  return `${os} · ${navigator.language || "browser"}`;
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event("mm-unauthorized"));
    throw new ApiError("unauthorized", 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "request_failed", res.status, data);
  return data;
}

export const api = {
  authConfig: () => req("/auth/config"),
  googleLogin: (credential: string) =>
    req("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, deviceId: getDeviceId() }),
    }),
  demoLogin: () =>
    req("/auth/google", {
      method: "POST",
      body: JSON.stringify({ demo: true, deviceId: getDeviceId() }),
    }),
  activate: (key: string) =>
    req("/activate", {
      method: "POST",
      body: JSON.stringify({
        key: key.trim().toUpperCase(),
        deviceId: getDeviceId(),
        deviceName: deviceName(),
      }),
    }),
  session: () => req("/session"),
  bootstrap: () => req("/bootstrap"),
  createWallets: (count: number, group: string) =>
    req("/wallets", { method: "POST", body: JSON.stringify({ count, group }) }),
  deleteWallet: (id: string) => req(`/wallets/${id}`, { method: "DELETE" }),
  importWallets: (secrets: string, group: string) =>
    req("/wallets/import", { method: "POST", body: JSON.stringify({ secrets, group }) }),
  refreshWallets: () => req("/wallets/refresh", { method: "POST" }),
  exportWallet: (id: string) => req(`/wallets/${id}/export`),
  sendEth: (id: string, to: string, amountEth: string) =>
    req(`/wallets/${id}/send`, { method: "POST", body: JSON.stringify({ to, amountEth }) }),
  getNetwork: () => req("/network"),
  setNetwork: (key: string) => req("/network", { method: "POST", body: JSON.stringify({ key }) }),
  disperse: (fromId: string, recipients: { address: string; amountEth: string }[]) =>
    req("/tools/disperse", { method: "POST", body: JSON.stringify({ fromId, recipients }) }),
  collect: (toAddress: string, walletIds?: string[]) =>
    req("/tools/collect", { method: "POST", body: JSON.stringify({ toAddress, walletIds }) }),
  tokenBalance: (token: string, address: string) =>
    req("/tools/token-balance", { method: "POST", body: JSON.stringify({ token, address }) }),
  testRpc: (url: string) => req("/rpc/test", { method: "POST", body: JSON.stringify({ url }) }),
  createTask: (t: Record<string, unknown>) =>
    req("/tasks", { method: "POST", body: JSON.stringify(t) }),
  deleteTask: (id: string) => req(`/tasks/${id}`, { method: "DELETE" }),
  runTask: (id: string) => req(`/tasks/${id}/run`, { method: "POST" }),
  createRpc: (r: Record<string, unknown>) =>
    req("/rpc", { method: "POST", body: JSON.stringify(r) }),
  createProxy: (p: Record<string, unknown>) =>
    req("/proxies", { method: "POST", body: JSON.stringify(p) }),
};
