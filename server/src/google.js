// Verifies a Google ID token (the JWT returned by Sign in with Google) against
// Google's public keys. Requires GOOGLE_CLIENT_ID to be set — without it the
// server runs in demo mode and this verifier is not used.
import { OAuth2Client } from "google-auth-library";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const client = new OAuth2Client(CLIENT_ID);

export const googleConfigured = () => !!CLIENT_ID;

export async function verifyGoogleToken(credential) {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: CLIENT_ID,
  });
  const p = ticket.getPayload();
  if (!p?.email) throw new Error("no_email");
  return {
    email: p.email.toLowerCase(),
    name: p.name || p.email,
    picture: p.picture || null,
    googleId: p.sub,
    emailVerified: !!p.email_verified,
  };
}
