import { useState } from "react";
import { motion } from "framer-motion";
import { Fuel, Split, Download, Coins, ChevronRight, Loader2, ExternalLink, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { ethPrice } from "@/lib/data";
import { formatUsd, formatEth, shortAddress } from "@/lib/utils";

interface Tool { key: string; icon: LucideIcon; title: string; desc: string; }
const TOOLS: Tool[] = [
  { key: "gas", icon: Fuel, title: "Gas Calculator", desc: "Estimate a transaction's cost in ETH and USD." },
  { key: "disperse", icon: Split, title: "Disperse", desc: "Send ETH from one wallet to many, in one batch." },
  { key: "collect", icon: Download, title: "Collect (Sweep)", desc: "Drain many wallets' balances into one address." },
  { key: "token", icon: Coins, title: "Token Balance", desc: "Read any ERC-20 balance for any address." },
];

export function Tools() {
  const { toast } = useToast();
  const { wallets, network, refreshBalances } = useData();
  const [active, setActive] = useState<Tool | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // gas
  const [limit, setLimit] = useState("120000");
  const [gwei, setGwei] = useState("18");
  const gasEth = (Number(limit) * Number(gwei)) / 1e9 || 0;

  // disperse
  const [fromId, setFromId] = useState("");
  const [recips, setRecips] = useState("");

  // collect
  const [dest, setDest] = useState("");

  // token
  const [token, setToken] = useState("");
  const [holder, setHolder] = useState("");

  const open = (t: Tool) => { setActive(t); setResult(null); };
  const err = (e: unknown) => (e instanceof ApiError ? e.data?.message || e.code : "Failed");

  const runDisperse = async () => {
    const recipients = recips
      .split("\n").map((l) => l.trim()).filter(Boolean)
      .map((l) => { const [a, amt] = l.split(/[,\s]+/); return { address: a, amountEth: amt }; })
      .filter((r) => r.address && r.amountEth);
    if (!fromId || !recipients.length) { toast({ tone: "danger", title: "Pick a wallet and add recipients" }); return; }
    setBusy(true);
    try {
      const r = await api.disperse(fromId, recipients);
      setResult(r);
      await refreshBalances().catch(() => {});
      toast({ tone: r.sent === r.total ? "success" : "warning", title: `Sent to ${r.sent}/${r.total}` });
    } catch (e) { toast({ tone: "danger", title: "Disperse failed", description: String(err(e)) }); }
    finally { setBusy(false); }
  };

  const runCollect = async () => {
    if (!dest) { toast({ tone: "danger", title: "Enter a destination address" }); return; }
    setBusy(true);
    try {
      const r = await api.collect(dest);
      setResult(r);
      await refreshBalances().catch(() => {});
      toast({ tone: r.sent > 0 ? "success" : "warning", title: `Swept ${r.sent}/${r.total} wallets` });
    } catch (e) { toast({ tone: "danger", title: "Collect failed", description: String(err(e)) }); }
    finally { setBusy(false); }
  };

  const runToken = async () => {
    if (!token || !holder) { toast({ tone: "danger", title: "Enter token and address" }); return; }
    setBusy(true);
    try { setResult(await api.tokenBalance(token, holder)); }
    catch (e) { toast({ tone: "danger", title: "Lookup failed", description: String(err(e)) }); }
    finally { setBusy(false); }
  };

  const withKey = wallets.filter((w) => w.hasKey);

  return (
    <div>
      <PageHeader title="Tools" description={`Real on-chain utilities. Running on ${network?.name ?? "the selected network"}.`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t, i) => (
          <motion.button
            key={t.key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => open(t)}
            className="group flex flex-col items-start rounded-lg border border-border bg-card p-5 text-left shadow-soft transition-all hover:border-muted-foreground/25 hover:shadow-elevated active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-accent/10 group-hover:text-accent">
              <t.icon className="h-5 w-5" />
            </span>
            <div className="mt-4 flex w-full items-center justify-between">
              <h3 className="font-semibold tracking-tight">{t.title}</h3>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </motion.button>
        ))}
      </div>

      <Dialog
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        title={active?.title}
        description={active?.desc}
        className={active?.key === "disperse" || active?.key === "collect" ? "max-w-lg" : undefined}
        footer={
          active && active.key !== "gas" ? (
            <>
              <Button variant="ghost" onClick={() => setActive(null)}>Close</Button>
              <Button
                variant="primary" disabled={busy}
                onClick={active.key === "disperse" ? runDisperse : active.key === "collect" ? runCollect : runToken}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {active.key === "disperse" ? "Send" : active.key === "collect" ? "Sweep" : "Look up"}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setActive(null)}>Done</Button>
          )
        }
      >
        {active?.key === "gas" && (
          <div className="space-y-4 pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-sm font-medium">Gas limit</label><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Gas price (gwei)</label><Input type="number" value={gwei} onChange={(e) => setGwei(e.target.value)} /></div>
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-4">
              <div className="flex items-baseline justify-between"><span className="text-sm text-muted-foreground">Estimated cost</span><span className="text-2xl font-semibold tabular-nums">{gasEth.toFixed(6)} ETH</span></div>
              <div className="mt-1 text-right text-sm text-muted-foreground tabular-nums">{formatUsd(gasEth * ethPrice)}</div>
            </div>
          </div>
        )}

        {active?.key === "disperse" && (
          <div className="space-y-4 pb-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">From wallet</label>
              <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">Select a wallet…</option>
                {withKey.map((w) => <option key={w.id} value={w.id}>{w.alias} · {shortAddress(w.address)} · {formatEth(w.balanceEth)} ETH</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Recipients</label>
              <textarea value={recips} onChange={(e) => setRecips(e.target.value)} rows={5}
                placeholder={"0xRecipient, 0.01\n0xAnother, 0.02\n(address, amount per line)"}
                className="w-full resize-none rounded-md border border-input bg-card px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-ring/25" />
            </div>
            <Results result={result} />
          </div>
        )}

        {active?.key === "collect" && (
          <div className="space-y-4 pb-2">
            <p className="text-sm text-muted-foreground">Sweeps the full balance (minus gas) of all {withKey.length} key-holding wallets into one address.</p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Destination address</label>
              <Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="0x…" className="font-mono text-sm" />
            </div>
            <Results result={result} />
          </div>
        )}

        {active?.key === "token" && (
          <div className="space-y-4 pb-2">
            <div className="space-y-1.5"><label className="text-sm font-medium">Token contract</label><Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x… (ERC-20)" className="font-mono text-sm" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Holder address</label><Input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="0x…" className="font-mono text-sm" /></div>
            {result && (
              <div className="rounded-md border border-border bg-muted/40 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">{result.name || result.symbol}</span>
                  <span className="text-2xl font-semibold tabular-nums">{Number(result.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {result.symbol}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Results({ result }: { result: any }) {
  if (!result?.results) return null;
  return (
    <div className="max-h-[200px] space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
      {result.results.map((r: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
          <span className="font-mono">{shortAddress(r.address)}{r.amountEth ? ` · ${Number(r.amountEth).toFixed(4)}` : ""}</span>
          <span className="flex items-center gap-2">
            <Badge tone={r.status === "sent" ? "success" : r.status === "skipped" ? "warning" : "danger"} dot>{r.status}</Badge>
            {r.explorer && <a href={r.explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">tx<ExternalLink className="h-3 w-3" /></a>}
          </span>
        </div>
      ))}
    </div>
  );
}
