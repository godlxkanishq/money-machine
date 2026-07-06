// Admin CLI to mint license keys. Run on the server only — this is the
// "key issuer". Keys are random opaque secrets stored server-side (revocable),
// never derived on the client.
//
//   npm run keygen -- --tier pro --wallets 100 --devices 1 --days 365 --email a@b.com
//   npm run keys:list
import crypto from "node:crypto";
import { load, save } from "./store.js";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
const seg = () =>
  Array.from(crypto.randomBytes(4))
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");

const db = load();

if (process.argv.includes("--list")) {
  const rows = Object.values(db.licenses);
  if (!rows.length) {
    console.log("No licenses issued yet.");
  } else {
    for (const l of rows) {
      console.log(
        `${l.key}  ${l.tier.padEnd(10)} wallets:${l.maxWallets}  devices:${l.activations.length}/${l.maxDevices}  ${l.revoked ? "REVOKED" : "active"}  exp:${new Date(l.expiresAt).toISOString().slice(0, 10)}${l.email ? "  " + l.email : ""}`,
      );
    }
  }
  process.exit(0);
}

if (process.argv.includes("--revoke")) {
  const key = arg("revoke");
  if (db.licenses[key]) {
    db.licenses[key].revoked = true;
    save();
    console.log("Revoked", key);
  } else {
    console.log("No such key:", key);
  }
  process.exit(0);
}

const tier = arg("tier", "pro");
const maxWallets = parseInt(arg("wallets", "100"), 10);
const maxDevices = parseInt(arg("devices", "1"), 10);
const days = parseInt(arg("days", "365"), 10);
const email = arg("email", "");

const key = `MNMC-${seg()}-${seg()}-${seg()}`;
db.licenses[key] = {
  key,
  tier,
  maxWallets,
  maxDevices,
  email,
  createdAt: Date.now(),
  expiresAt: Date.now() + days * 86400000,
  revoked: false,
  activations: [],
};
save();

console.log("\n✅ Issued license\n");
console.log("   key:      " + key);
console.log("   tier:     " + tier);
console.log("   wallets:  " + maxWallets);
console.log("   devices:  " + maxDevices);
console.log("   expires:  " + new Date(db.licenses[key].expiresAt).toISOString().slice(0, 10));
if (email) console.log("   email:    " + email);
console.log("\nGive this key to the user to activate.\n");
