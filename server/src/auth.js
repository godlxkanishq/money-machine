import { verifyToken } from "./crypto.js";
import { load } from "./store.js";

// Resolves the caller's identity + entitlement from the bearer token.
// Two kinds of session:
//   - "user"    → signed in with Google; entitlement from the users table
//   - "license" → activated with a license key; entitlement from the license
// Either way the request is validated against the live DB on every call.
export function requireSession(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: "invalid_session" });

  const db = load();
  const kind = payload.kind || "license";

  if (kind === "user") {
    const u = db.users[payload.sub];
    if (!u || u.disabled) return res.status(401).json({ error: "unknown_user" });
    req.identity = {
      sub: u.email,
      kind: "user",
      deviceId: payload.did,
      tier: u.tier,
      maxWallets: u.maxWallets,
      expiresAt: null,
      user: { email: u.email, name: u.name, picture: u.picture },
    };
    return next();
  }

  const lic = db.licenses[payload.sub];
  if (!lic || lic.revoked) return res.status(401).json({ error: "revoked" });
  if (lic.expiresAt && Date.now() > lic.expiresAt)
    return res.status(401).json({ error: "expired" });
  if (!lic.activations.some((a) => a.deviceId === payload.did))
    return res.status(401).json({ error: "device_unbound" });
  req.identity = {
    sub: lic.key,
    kind: "license",
    deviceId: payload.did,
    tier: lic.tier,
    maxWallets: lic.maxWallets,
    expiresAt: lic.expiresAt,
    devices: lic.activations.length,
    user: null,
  };
  next();
}
