import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { load, save } from "./store.js";
import { signToken } from "./crypto.js";
import { requireSession } from "./auth.js";
import { verifyGoogleToken, googleConfigured } from "./google.js";
import * as wallet from "./wallet.js";
import { runMint } from "./mint.js";
import * as tools from "./tools.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const DEFAULT_TIER = "pro";
const DEFAULT_MAX_WALLETS = 100;

const now = () => Date.now();
const rid = (p) => `${p}_${crypto.randomBytes(6).toString("hex")}`;
const makeAddress = () => "0x" + crypto.randomBytes(20).toString("hex");

function logActivity(db, level, source, message) {
  db.app.activity.unshift({ id: rid("a"), time: new Date().toISOString(), level, source, message });
  db.app.activity = db.app.activity.slice(0, 200);
}

function publicLicense(lic) {
  return { tier: lic.tier, maxWallets: lic.maxWallets, maxDevices: lic.maxDevices, expiresAt: lic.expiresAt, devices: lic.activations.length };
}
function licFromIdentity(id) {
  return { tier: id.tier, maxWallets: id.maxWallets, expiresAt: id.expiresAt ?? null, devices: id.devices ?? null };
}

function computeStats(appData) {
  const totalEth = appData.wallets.reduce((s, w) => s + (w.balanceEth || 0), 0);
  const successfulMints = appData.tasks.filter((t) => t.status === "success").length;
  const failedMints = appData.tasks.filter((t) => t.status === "failed").length;
  return {
    totalWallets: appData.wallets.length,
    totalEth,
    successfulMints,
    failedMints,
    successRate: successfulMints + failedMints ? successfulMints / (successfulMints + failedMints) : 0,
    activeTasks: appData.tasks.filter((t) => t.status === "running").length,
  };
}

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// ---- Public config ---------------------------------------------------------
app.get("/api/auth/config", (_req, res) => res.json({ googleConfigured: googleConfigured() }));

// ---- Sign in with Google ---------------------------------------------------
app.post("/api/auth/google", async (req, res) => {
  const { credential, demo, deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "missing_device" });

  let profile;
  try {
    if (credential) profile = await verifyGoogleToken(credential);
    else if (demo && !googleConfigured()) profile = { email: "demo@gmail.com", name: "Demo User", picture: null, emailVerified: true };
    else return res.status(400).json({ error: "missing_credential" });
  } catch {
    return res.status(401).json({ error: "google_verify_failed" });
  }

  const db = load();
  const user = db.users[profile.email] || { email: profile.email, tier: DEFAULT_TIER, maxWallets: DEFAULT_MAX_WALLETS, createdAt: now() };
  user.name = profile.name;
  user.picture = profile.picture;
  user.lastLogin = now();
  db.users[profile.email] = user;
  logActivity(db, "success", "Auth", `${profile.name} signed in with Google`);
  save();

  const token = signToken({ sub: profile.email, kind: "user", did: deviceId, exp: now() + SESSION_TTL });
  res.json({
    token,
    user: { email: user.email, name: user.name, picture: user.picture, tier: user.tier },
    license: { tier: user.tier, maxWallets: user.maxWallets, expiresAt: null },
  });
});

// ---- Sign in with a license key --------------------------------------------
app.post("/api/activate", (req, res) => {
  const { key, deviceId, deviceName } = req.body || {};
  if (!key || !deviceId) return res.status(400).json({ error: "missing_fields" });

  const db = load();
  const lic = db.licenses[String(key).trim().toUpperCase()];
  if (!lic || lic.revoked) return res.status(404).json({ error: "invalid_key" });
  if (lic.expiresAt && now() > lic.expiresAt) return res.status(403).json({ error: "expired" });

  let act = lic.activations.find((a) => a.deviceId === deviceId);
  if (!act) {
    if (lic.activations.length >= lic.maxDevices) return res.status(403).json({ error: "device_limit", maxDevices: lic.maxDevices });
    act = { deviceId, deviceName: deviceName || "Unknown device", activatedAt: now() };
    lic.activations.push(act);
    logActivity(db, "success", "License", `Activated on ${act.deviceName}`);
    save();
  }

  const token = signToken({ sub: lic.key, kind: "license", did: deviceId, exp: now() + SESSION_TTL });
  res.json({ token, license: publicLicense(lic) });
});

// ---- Protected -------------------------------------------------------------
app.get("/api/session", requireSession, (req, res) => {
  const db = load();
  res.json({ identity: { kind: req.identity.kind }, user: req.identity.user, license: licFromIdentity(req.identity), walletsUsed: db.app.wallets.length });
});

app.post("/api/heartbeat", requireSession, (req, res) => {
  const token = signToken({ sub: req.identity.sub, kind: req.identity.kind, did: req.identity.deviceId, exp: now() + SESSION_TTL });
  res.json({ token });
});

app.get("/api/bootstrap", requireSession, (req, res) => {
  const db = load();
  res.json({
    ...db.app,
    wallets: db.app.wallets.map(wallet.publicWallet),
    stats: computeStats(db.app),
    network: wallet.getNetwork(),
    user: req.identity.user,
    license: { ...licFromIdentity(req.identity), walletsUsed: db.app.wallets.length },
  });
});

// ---- Network ---------------------------------------------------------------
app.get("/api/network", requireSession, (_req, res) => {
  res.json({ network: wallet.getNetwork(), available: Object.values(wallet.NETWORKS) });
});
app.post("/api/network", requireSession, (req, res) => {
  try {
    const net = wallet.setNetwork(req.body?.key);
    const db = load();
    logActivity(db, "info", "Network", `Switched network to ${net.name}`);
    save();
    res.json({ network: net });
  } catch {
    res.status(400).json({ error: "unknown_network" });
  }
});

app.get("/api/gas", requireSession, async (_req, res) => {
  try {
    res.json(await wallet.getGas());
  } catch (e) {
    res.status(502).json({ error: "rpc_unreachable", message: e.message });
  }
});

// ---- Wallets: REAL keypairs ------------------------------------------------
// Generate real secp256k1 wallets. Cap enforced server-side.
app.post("/api/wallets", requireSession, (req, res) => {
  const db = load();
  const count = Math.max(1, Math.min(parseInt(req.body?.count ?? 1, 10) || 1, 50));
  const group = req.body?.group || "Main";
  if (db.app.wallets.length + count > req.identity.maxWallets) {
    return res.status(403).json({ error: "wallet_limit", maxWallets: req.identity.maxWallets, current: db.app.wallets.length });
  }
  const created = [];
  for (let i = 0; i < count; i++) {
    const { address, key, phrase } = wallet.createWallet();
    const w = {
      id: rid("w"), address, alias: `wallet-${db.app.wallets.length + 1}`, group,
      balanceEth: 0, status: "idle", txCount: 0,
      createdAt: new Date().toISOString(), lastUsed: new Date().toISOString(),
      key, phrase,
    };
    db.app.wallets.push(w);
    created.push(wallet.publicWallet(w));
  }
  logActivity(db, "success", "Wallet", `Generated ${count} real wallet${count > 1 ? "s" : ""} in ‘${group}’`);
  save();
  res.json({ created, walletsUsed: db.app.wallets.length });
});

// Import real private keys or mnemonics (one per line).
app.post("/api/wallets/import", requireSession, (req, res) => {
  const db = load();
  const secrets = String(req.body?.secrets || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!secrets.length) return res.status(400).json({ error: "no_secrets" });
  if (db.app.wallets.length + secrets.length > req.identity.maxWallets) {
    return res.status(403).json({ error: "wallet_limit", maxWallets: req.identity.maxWallets, current: db.app.wallets.length });
  }
  const group = req.body?.group || "Main";
  const created = [];
  let failed = 0;
  for (const s of secrets) {
    try {
      const { address, key, phrase } = wallet.importSecret(s);
      if (db.app.wallets.some((w) => w.address.toLowerCase() === address.toLowerCase())) continue;
      const w = {
        id: rid("w"), address, alias: `imported-${db.app.wallets.length + 1}`, group,
        balanceEth: 0, status: "idle", txCount: 0,
        createdAt: new Date().toISOString(), lastUsed: new Date().toISOString(),
        key, phrase, imported: true,
      };
      db.app.wallets.push(w);
      created.push(wallet.publicWallet(w));
    } catch {
      failed++;
    }
  }
  logActivity(db, "success", "Wallet", `Imported ${created.length} wallet${created.length === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}`);
  save();
  res.json({ created, failed, walletsUsed: db.app.wallets.length });
});

// Read REAL on-chain balances + nonces for all wallets.
app.post("/api/wallets/refresh", requireSession, async (req, res) => {
  const db = load();
  if (!db.app.wallets.length) return res.json({ wallets: [], stats: computeStats(db.app), network: wallet.getNetwork() });
  try {
    await wallet.refreshBalances(db.app.wallets);
    save();
    res.json({ wallets: db.app.wallets.map(wallet.publicWallet), stats: computeStats(db.app), network: wallet.getNetwork() });
  } catch (e) {
    res.status(502).json({ error: "rpc_unreachable", message: e.message });
  }
});

// Export a wallet's private key + mnemonic (authenticated, logged).
app.get("/api/wallets/:id/export", requireSession, (req, res) => {
  const db = load();
  const w = db.app.wallets.find((x) => x.id === req.params.id);
  if (!w || !w.key) return res.status(404).json({ error: "not_found" });
  const secret = wallet.exportWallet(w);
  logActivity(db, "warn", "Wallet", `Exported private key for ${short(w.address)}`);
  save();
  res.json(secret);
});

// Send REAL ETH from a wallet.
app.post("/api/wallets/:id/send", requireSession, async (req, res) => {
  const db = load();
  const w = db.app.wallets.find((x) => x.id === req.params.id);
  if (!w || !w.key) return res.status(404).json({ error: "not_found" });
  const { to, amountEth } = req.body || {};
  try {
    const r = await wallet.sendEth(w, to, amountEth);
    logActivity(db, "success", "Send", `Sent ${amountEth} ETH from ${short(w.address)} to ${short(to)} · ${short(r.hash)}`);
    await wallet.refreshBalances([w]).catch(() => {});
    save();
    const net = wallet.getNetwork();
    res.json({ hash: r.hash, explorer: `${net.explorer}/tx/${r.hash}`, wallet: wallet.publicWallet(w) });
  } catch (e) {
    res.status(400).json({ error: "send_failed", message: e.shortMessage || e.message });
  }
});

app.delete("/api/wallets/:id", requireSession, (req, res) => {
  const db = load();
  const before = db.app.wallets.length;
  db.app.wallets = db.app.wallets.filter((w) => w.id !== req.params.id);
  if (db.app.wallets.length !== before) {
    logActivity(db, "warn", "Wallet", "Deleted a wallet");
    save();
  }
  res.json({ ok: true, walletsUsed: db.app.wallets.length });
});

// ---- Tasks / RPC / Proxies (unchanged) -------------------------------------
app.post("/api/tasks", requireSession, (req, res) => {
  const db = load();
  const b = req.body || {};
  const task = {
    id: rid("t"), name: b.name || "Untitled task", contract: b.contract || "",
    chain: b.chain || "Ethereum", module: b.module || "Manual", strategy: b.strategy || "Direct",
    status: "queued", walletCount: parseInt(b.walletCount ?? 1, 10) || 1,
    group: b.group || "all",
    functionSig: b.functionSig || "",
    argsJson: b.argsJson || "[]",
    rawData: b.rawData || "",
    valueEth: Number(b.valueEth ?? b.priceEth ?? 0),
    gasLimit: b.gasLimit ? parseInt(b.gasLimit, 10) : null,
    gasGwei: parseInt(b.gasGwei ?? 0, 10) || 0,
    progress: 0, lastRun: null, createdAt: new Date().toISOString(),
  };
  db.app.tasks.unshift(task);
  logActivity(db, "info", "Tasks", `Created task ‘${task.name}’`);
  save();
  res.json({ task });
});

app.delete("/api/tasks/:id", requireSession, (req, res) => {
  const db = load();
  db.app.tasks = db.app.tasks.filter((t) => t.id !== req.params.id);
  save();
  res.json({ ok: true });
});

const safeArgs = (s) => {
  try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : [v]; } catch { return []; }
};

// Execute a mint task for real: build calldata, sign per wallet, broadcast, await receipts.
app.post("/api/tasks/:id/run", requireSession, async (req, res) => {
  const db = load();
  const task = db.app.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "not_found" });
  if (!task.contract) return res.status(400).json({ error: "no_contract", message: "Set a contract address on the task." });

  let pool = db.app.wallets.filter((w) => w.key);
  if (task.group && task.group !== "all") pool = pool.filter((w) => w.group === task.group);
  const wallets = pool.slice(0, Math.max(1, task.walletCount || 1));
  if (!wallets.length) return res.status(400).json({ error: "no_wallets", message: "No wallets with keys in that group." });

  task.status = "running";
  save();
  try {
    const out = await runMint({ ...task, args: safeArgs(task.argsJson) }, wallets);
    task.status = out.success > 0 ? "success" : "failed";
    task.progress = out.total ? Math.round((out.success / out.total) * 100) : 0;
    task.executedAt = new Date().toISOString();
    task.lastRun = out;
    logActivity(
      db,
      out.failed === 0 ? "success" : out.success > 0 ? "warn" : "error",
      "Mint",
      `‘${task.name}’: ${out.success}/${out.total} minted on ${out.network}`,
    );
    save();
    res.json({ task, result: out });
  } catch (e) {
    task.status = "failed";
    task.error = e.shortMessage || e.message;
    save();
    res.status(400).json({ error: "mint_failed", message: e.shortMessage || e.message });
  }
});

app.post("/api/rpc", requireSession, (req, res) => {
  const db = load();
  const b = req.body || {};
  const ep = { id: rid("r"), name: b.name || "New endpoint", url: b.url || "", chain: b.chain || "Ethereum", latencyMs: 0, priority: parseInt(b.priority ?? 1, 10) || 1, rps: 10, status: "active" };
  db.app.rpcEndpoints.push(ep);
  logActivity(db, "info", "RPC", `Added endpoint ${ep.name}`);
  save();
  res.json({ endpoint: ep });
});

app.post("/api/proxies", requireSession, (req, res) => {
  const db = load();
  const b = req.body || {};
  const lines = String(b.list || "").split("\n").filter((l) => l.trim());
  const group = { id: rid("p"), name: b.name || "New group", count: lines.length, active: lines.length, status: lines.length ? "active" : "down" };
  db.app.proxyGroups.push(group);
  logActivity(db, "info", "Proxy", `Added group ${group.name}`);
  save();
  res.json({ group });
});

// ---- Tools: real on-chain utilities ----------------------------------------
app.post("/api/tools/disperse", requireSession, async (req, res) => {
  const db = load();
  const { fromId, recipients } = req.body || {};
  const from = db.app.wallets.find((w) => w.id === fromId && w.key);
  if (!from) return res.status(404).json({ error: "no_from" });
  if (!Array.isArray(recipients) || !recipients.length) return res.status(400).json({ error: "no_recipients" });
  try {
    const out = await tools.disperse(from, recipients);
    logActivity(db, "success", "Disperse", `Sent to ${out.sent}/${out.total} from ${short(from.address)}`);
    await wallet.refreshBalances([from]).catch(() => {});
    save();
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: "disperse_failed", message: e.shortMessage || e.message });
  }
});

app.post("/api/tools/collect", requireSession, async (req, res) => {
  const db = load();
  const { toAddress, walletIds } = req.body || {};
  let wl = db.app.wallets.filter((w) => w.key);
  if (Array.isArray(walletIds) && walletIds.length) wl = wl.filter((w) => walletIds.includes(w.id));
  if (!wl.length) return res.status(400).json({ error: "no_wallets" });
  try {
    const out = await tools.collect(wl, toAddress);
    logActivity(db, "success", "Collect", `Swept ${out.sent}/${out.total} into ${short(toAddress)}`);
    await wallet.refreshBalances(wl).catch(() => {});
    save();
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: "collect_failed", message: e.shortMessage || e.message });
  }
});

app.post("/api/tools/token-balance", requireSession, async (req, res) => {
  try {
    res.json(await tools.tokenBalance(req.body?.token, req.body?.address));
  } catch (e) {
    res.status(400).json({ error: "token_failed", message: e.shortMessage || e.message });
  }
});

app.post("/api/rpc/test", requireSession, async (req, res) => {
  try {
    res.json(await tools.testRpc(req.body?.url));
  } catch (e) {
    res.status(400).json({ error: "rpc_test_failed", message: e.shortMessage || e.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  load();
  wallet.getMaster();
  console.log(`🟢 Money Machine server on http://localhost:${PORT}`);
  console.log(`   Network: ${wallet.getNetwork().name}${wallet.getNetwork().testnet ? " (testnet)" : ""}`);
  console.log(`   Google sign-in: ${googleConfigured() ? "configured" : "DEMO mode"}`);
});
