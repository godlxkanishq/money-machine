// Tiny JSON-file store. In production this would be Postgres/SQLite.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "db.json");

const empty = () => ({
  licenses: {},
  users: {},
  settings: {},
  app: { wallets: [], tasks: [], rpcEndpoints: [], proxyGroups: [], activity: [] },
});

let db;
export function load() {
  if (db) return db;
  if (fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } else {
    db = empty();
    save();
  }
  db.licenses ||= {};
  db.users ||= {};
  db.settings ||= {};
  db.app ||= {};
  db.app.wallets ||= [];
  db.app.tasks ||= [];
  db.app.rpcEndpoints ||= [];
  db.app.proxyGroups ||= [];
  db.app.activity ||= [];
  return db;
}

export function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
