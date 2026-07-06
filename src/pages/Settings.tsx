import { useState, type ReactNode } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { CHAINS } from "@/lib/data";
import { cn, shortAddress } from "@/lib/utils";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="px-5 pt-5 pb-1">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </Card>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { license, deviceId, user, signOut } = useAuth();
  const { stats } = useData();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [publicFallback, setPublicFallback] = useState(true);
  const [notifySuccess, setNotifySuccess] = useState(true);
  const [notifyError, setNotifyError] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);

  const maxWallets = license?.maxWallets ?? 0;
  const pct = maxWallets ? Math.round((stats.totalWallets / maxWallets) * 100) : 0;
  const expiry = license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : "—";
  const tier = license?.tier ? license.tier[0].toUpperCase() + license.tier.slice(1) : "—";

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your license, appearance, and preferences." />

      <div className="space-y-5">
        {/* Account */}
        {user && (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent/80 to-accent text-sm font-semibold text-accent-foreground">
                    {(user.name || user.email).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">Google</Badge>
                <Button variant="secondary" size="sm" onClick={signOut}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* License */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight">License</h3>
                  <Badge tone="accent">{tier}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Verified server-side · {license?.expiresAt ? `expires ${expiry}` : "no expiry"}
                </p>
              </div>
            </div>
            {!user && (
              <Button variant="secondary" size="sm" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Device ID</label>
              <Input readOnly value={shortAddress(deviceId, 10, 6)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Plan</label>
              <Input readOnly value={`${tier} · ${maxWallets} wallets`} />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wallet usage</span>
              <span className="font-medium tabular-nums">{stats.totalWallets} / {maxWallets}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Section title="Appearance" description="Customize how Money Machine looks.">
          <Row label="Theme" description="Switch between light and dark.">
            <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "h-7 rounded-sm px-3 text-sm font-medium capitalize transition-colors",
                    theme === t ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Reduce motion" description="Minimize animations and transitions.">
            <Switch checked={reduceMotion} onChange={setReduceMotion} />
          </Row>
        </Section>

        {/* Network */}
        <Section title="Network" description="Defaults applied to new tasks.">
          <Row label="Default chain">
            <Select defaultValue="Ethereum" className="w-44">
              {CHAINS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Row>
          <Row label="Gas multiplier" description="Applied to suggested priority fee.">
            <Input type="number" defaultValue={1.1} step={0.1} className="w-44 text-right" />
          </Row>
          <Row label="Public RPC fallback" description="Use public nodes if private endpoints fail.">
            <Switch checked={publicFallback} onChange={setPublicFallback} />
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Stay informed about task outcomes.">
          <Row label="Discord webhook">
            <Input placeholder="https://discord.com/api/webhooks/…" className="w-72 font-mono text-xs" />
          </Row>
          <Row label="Notify on success">
            <Switch checked={notifySuccess} onChange={setNotifySuccess} />
          </Row>
          <Row label="Notify on errors">
            <Switch checked={notifyError} onChange={setNotifyError} />
          </Row>
        </Section>

        {/* Security */}
        <Section title="Security">
          <Row label="Auto-lock" description="Lock the app after 15 minutes idle.">
            <Switch checked={autoLock} onChange={setAutoLock} />
          </Row>
          <Row label="Require auth to export keys" description="Re-authenticate before exporting private keys.">
            <Switch checked={requireAuth} onChange={setRequireAuth} />
          </Row>
        </Section>

        {/* Danger zone */}
        <Card className="border-danger/25 p-5">
          <h3 className="text-base font-semibold tracking-tight text-danger">Danger zone</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">These actions are irreversible.</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button variant="danger" onClick={() => toast({ tone: "warning", title: "Settings reset" })}>
              Reset settings
            </Button>
            <Button variant="danger" onClick={() => toast({ tone: "danger", title: "Database cleared" })}>
              Clear local database
            </Button>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" onClick={() => toast({ tone: "success", title: "Settings saved" })}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
