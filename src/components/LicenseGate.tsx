import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { shortAddress } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  invalid_key: "That license key wasn’t recognized. Check it and try again.",
  expired: "This license has expired. Renew to continue.",
  device_limit: "This license is already active on the maximum number of devices.",
  missing_fields: "Please enter your license key.",
  default: "Couldn’t activate right now. Please try again.",
};

export function LicenseGate() {
  const { activate, deviceId } = useAuth();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await activate(key);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "default";
      setError(ERRORS[code] || ERRORS.default);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent text-accent-foreground">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path
                d="M9 22V10.5L16 17l7-6.5V22"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Activate Money Machine</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your license key to unlock this device.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-elevated">
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">License key</label>
              <Input
                autoFocus
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(null);
                }}
                placeholder="MNMC-XXXX-XXXX-XXXX"
                className="font-mono tracking-wide uppercase placeholder:normal-case"
                spellCheck={false}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !key.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Activating…
                </>
              ) : (
                <>
                  Activate
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>
              Verified server-side · bound to this device ({shortAddress(deviceId, 6, 4)})
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Don’t have a key? Contact your provider to get one.
        </p>
      </motion.div>
    </div>
  );
}
