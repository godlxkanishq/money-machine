// Real EVM wallets. Uses ethers for genuine secp256k1 keypairs, real address
// derivation, live balance reads, and transaction signing/broadcast.
// Private keys are AES-256-GCM encrypted at rest (scrypt-derived key from a
// server master secret) and NEVER sent to the client except via an explicit,
// authenticated export.
import * as ethers from "ethers";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, save } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECRET_PATH = path.join(__dirname, "..", "data", "secret.key");

// ---- Master secret ---------------------------------------------------------
let _master;
export function getMaster() {
  if (_master) return _master;
  if (process.env.MM_MASTER_SECRET) return (_master = process.env.MM_MASTER_SECRET);
  if (fs.existsSync(SECRET_PATH)) {
    _master = fs.readFileSync(SECRET_PATH, "utf8").trim();
  } else {
    _master = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
    fs.writeFileSync(SECRET_PATH, _master, { mode: 0o600 });
    console.log("🔐 Generated wallet master secret → data/secret.key (keep it safe & secret)");
  }
  return _master;
}

// ---- Encryption (AES-256-GCM, scrypt KDF) ----------------------------------
function enc(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(getMaster(), salt, 32);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return {
    v: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: c.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  };
}
function dec(blob) {
  const salt = Buffer.from(blob.salt, "base64");
  const key = crypto.scryptSync(getMaster(), salt, 32);
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  d.setAuthTag(Buffer.from(blob.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(blob.ct, "base64")), d.final()]).toString("utf8");
}

// ---- Wallet creation / import ----------------------------------------------
export function createWallet() {
  const w = ethers.Wallet.createRandom();
  return { address: w.address, key: enc(w.privateKey), phrase: w.mnemonic ? enc(w.mnemonic.phrase) : null };
}

export function importSecret(secret) {
  const s = String(secret).trim();
  if (!s) throw new Error("empty");
  let w;
  let phrase = null;
  if (s.split(/\s+/).length >= 12) {
    w = ethers.Wallet.fromPhrase(s); // real BIP-39 mnemonic
    phrase = s;
  } else {
    w = new ethers.Wallet(s.startsWith("0x") ? s : "0x" + s); // real private key
  }
  return { address: w.address, key: enc(w.privateKey), phrase: phrase ? enc(phrase) : null };
}

export function exportWallet(w) {
  return {
    address: w.address,
    privateKey: dec(w.key),
    mnemonic: w.phrase ? dec(w.phrase) : null,
  };
}

// Public shape — strips all secret material before it leaves the server.
export function publicWallet(w) {
  const { key, phrase, ...pub } = w;
  return { ...pub, hasKey: !!key };
}

// ---- Networks --------------------------------------------------------------
export const NETWORKS = {
  sepolia: { key: "sepolia", name: "Sepolia", chainId: 11155111, rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io", currency: "ETH", testnet: true },
  mainnet: { key: "mainnet", name: "Ethereum", chainId: 1, rpcUrl: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io", currency: "ETH", testnet: false },
  base: { key: "base", name: "Base", chainId: 8453, rpcUrl: "https://base-rpc.publicnode.com", explorer: "https://basescan.org", currency: "ETH", testnet: false },
  "base-sepolia": { key: "base-sepolia", name: "Base Sepolia", chainId: 84532, rpcUrl: "https://base-sepolia-rpc.publicnode.com", explorer: "https://sepolia.basescan.org", currency: "ETH", testnet: true },
  arbitrum: { key: "arbitrum", name: "Arbitrum", chainId: 42161, rpcUrl: "https://arbitrum-one-rpc.publicnode.com", explorer: "https://arbiscan.io", currency: "ETH", testnet: false },
  optimism: { key: "optimism", name: "Optimism", chainId: 10, rpcUrl: "https://optimism-rpc.publicnode.com", explorer: "https://optimistic.etherscan.io", currency: "ETH", testnet: false },
};

export function getNetwork() {
  const db = load();
  return (db.settings && db.settings.network) || NETWORKS.sepolia;
}

export function setNetwork(key) {
  const n = NETWORKS[key];
  if (!n) throw new Error("unknown_network");
  const db = load();
  db.settings = db.settings || {};
  db.settings.network = n;
  save();
  _providers = {};
  return n;
}

let _providers = {};
function provider() {
  const net = getNetwork();
  if (!_providers[net.rpcUrl]) {
    _providers[net.rpcUrl] = new ethers.JsonRpcProvider(net.rpcUrl, net.chainId, { staticNetwork: true });
  }
  return _providers[net.rpcUrl];
}

// ---- Live chain reads / writes ---------------------------------------------
export async function refreshBalances(wallets) {
  const p = provider();
  await Promise.allSettled(
    wallets.map(async (w) => {
      const [bal, nonce] = await Promise.all([p.getBalance(w.address), p.getTransactionCount(w.address)]);
      w.balanceEth = Number(ethers.formatEther(bal));
      w.txCount = nonce;
      w.status = w.balanceEth > 0 ? "active" : "idle";
      w.lastUsed = new Date().toISOString();
    }),
  );
}

export async function sendEth(w, to, amountEth) {
  if (!ethers.isAddress(to)) throw new Error("invalid_recipient");
  const p = provider();
  const signer = new ethers.Wallet(dec(w.key), p);
  const tx = await signer.sendTransaction({ to, value: ethers.parseEther(String(amountEth)) });
  return { hash: tx.hash };
}

export async function getGas() {
  const f = await provider().getFeeData();
  const g = (v) => (v != null ? Number(ethers.formatUnits(v, "gwei")) : null);
  return { gasPriceGwei: g(f.gasPrice), maxFeeGwei: g(f.maxFeePerGas), maxPriorityGwei: g(f.maxPriorityFeePerGas) };
}

// Exposed for the mint engine (mint.js).
export function decKey(blob) {
  return dec(blob);
}
export function providerFor() {
  return provider();
}
