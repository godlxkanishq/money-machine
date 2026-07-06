// Ed25519 keypair + opaque signed session tokens.
// The PRIVATE key never leaves the server. The client never verifies tokens
// itself — the server validates every request — so the public key isn't shipped.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = path.join(__dirname, "..", "data", "keys.json");

let _keys;
export function getKeys() {
  if (_keys) return _keys;
  if (fs.existsSync(KEYS_PATH)) {
    const { privateKey, publicKey } = JSON.parse(fs.readFileSync(KEYS_PATH, "utf8"));
    _keys = {
      privateKey: crypto.createPrivateKey(privateKey),
      publicKey: crypto.createPublicKey(publicKey),
    };
  } else {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    fs.mkdirSync(path.dirname(KEYS_PATH), { recursive: true });
    fs.writeFileSync(
      KEYS_PATH,
      JSON.stringify(
        {
          privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
          publicKey: publicKey.export({ type: "spki", format: "pem" }),
        },
        null,
        2,
      ),
    );
    _keys = { privateKey, publicKey };
    console.log("🔑 Generated new Ed25519 signing keypair → data/keys.json");
  }
  return _keys;
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const fromB64url = (s) => Buffer.from(s, "base64url");

export function signToken(payload) {
  const { privateKey } = getKeys();
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.sign(null, Buffer.from(body), privateKey);
  return `${body}.${b64url(sig)}`;
}

export function verifyToken(token) {
  try {
    const { publicKey } = getKeys();
    const [body, sig] = String(token).split(".");
    if (!body || !sig) return null;
    const ok = crypto.verify(null, Buffer.from(body), publicKey, fromB64url(sig));
    if (!ok) return null;
    const payload = JSON.parse(fromB64url(body).toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
