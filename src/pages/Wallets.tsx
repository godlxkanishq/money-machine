import { useMemo, useState } from "react";
import {
  Copy, ExternalLink, Send as SendIcon, KeyRound, Trash2, Plus, Download,
  Loader2, RefreshCw, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { type MenuItem } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { WALLET_GROUPS, NETWORK_OPTIONS, type Wallet } from "@/lib/data";
import { shortAddress, formatEth, timeAgo, cn } from "@/lib/utils";

const statusTone = { active: "success", idle: "neutral", low: "warning" } as const;

interface ExportedKey { address: string; privateKey: string; mnemonic: string | null; }

export function Wallets() {
  const { toast } = useToast();
  const {
    wallets, network, addWallets, importWallets, removeWallet,
    refreshBalances, sendEth, exportWallet, setNetwork,
  } = useData();

  const [group, setGroup] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [count, setCount] = useState("5");
  const [importText, setImportText] = useState("");
  const [newGroup, setNewGroup] = useState<string>(WALLET_GROUPS[0]);
  const [method, setMethod] = useState<"generate" | "import">("generate");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Send dialog
  const [sendWallet, setSendWallet] = useState<Wallet | null>(null);
  const [sendTo, setSendTo] = useState("");
  const [sendAmt, setSendAmt] = useState("");
  const [sending, setSending] = useState(false);

  // Export dialog
  const [exported, setExported] = useState<ExportedKey | null>(null);
  const [reveal, setReveal] = useState(false);

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard?.writeText(text);
    toast({ tone: "success", title: label });
  };

  const data = useMemo(
    () => (group === "all" ? wallets : wallets.filter((w) => w.group === group)),
    [group, wallets],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalances();
      toast({ tone: "success", title: "Balances updated", description: network?.name });
    } catch {
      toast({ tone: "danger", title: "Could not reach the network", description: "Check the RPC / your connection." });
    } finally {
      setRefreshing(false);
    }
  };

  const onNetwork = async (key: string) => {
    try {
      await setNetwork(key);
      toast({ tone: "info", title: "Network switched" });
    } catch {
      toast({ tone: "danger", title: "Could not switch network" });
    }
  };

  const onCreate = async () => {
    setSubmitting(true);
    try {
      if (method === "generate") {
        const n = Number(count) || 1;
        await addWallets(n, newGroup);
        toast({ tone: "success", title: `Generated ${n} real wallet${n === 1 ? "" : "s"}`, description: `Group ‘${newGroup}’` });
      } else {
        const r = await importWallets(importText, newGroup);
        if (r.created.length === 0) {
          toast({ tone: "danger", title: "No valid keys found", description: `${r.failed} line(s) could not be parsed.` });
          setSubmitting(false);
          return;
        }
        toast({
          tone: "success",
          title: `Imported ${r.created.length} wallet${r.created.length === 1 ? "" : "s"}`,
          description: r.failed ? `${r.failed} line(s) failed.` : undefined,
        });
      }
      setAddOpen(false);
      setImportText("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "wallet_limit") {
        toast({ tone: "danger", title: "Wallet limit reached", description: `Your plan allows ${err.data?.maxWallets}.` });
      } else {
        toast({ tone: "danger", title: "Could not add wallets" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (w: Wallet) => {
    try {
      await removeWallet(w.id);
      toast({ tone: "danger", title: "Wallet deleted", description: w.alias });
    } catch {
      toast({ tone: "danger", title: "Could not delete wallet" });
    }
  };

  const openSend = (w: Wallet) => {
    setSendWallet(w);
    setSendTo("");
    setSendAmt("");
  };

  const doSend = async () => {
    if (!sendWallet) return;
    setSending(true);
    try {
      const r = await sendEth(sendWallet.id, sendTo.trim(), sendAmt.trim());
      setSendWallet(null);
      toast({ tone: "success", title: "Transaction sent", description: shortAddress(r.hash, 10, 8) });
      if (network) window.open(r.explorer, "_blank", "noopener");
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.code : "Send failed";
      toast({ tone: "danger", title: "Send failed", description: String(msg) });
    } finally {
      setSending(false);
    }
  };

  const openExport = async (w: Wallet) => {
    try {
      const e = (await exportWallet(w.id)) as ExportedKey;
      setReveal(false);
      setExported(e);
    } catch {
      toast({ tone: "danger", title: "Could not export key" });
    }
  };

  const viewExplorer = (w: Wallet) => {
    if (network) window.open(`${network.explorer}/address/${w.address}`, "_blank", "noopener");
  };

  const rowMenu = (w: Wallet): MenuItem[] => [
    { label: "Copy address", icon: Copy, onSelect: () => copy(w.address, "Address copied") },
    { label: "View on explorer", icon: ExternalLink, onSelect: () => viewExplorer(w) },
    { label: "Send ETH", icon: SendIcon, onSelect: () => openSend(w) },
    { label: "Export private key", icon: KeyRound, danger: true, onSelect: () => openExport(w) },
    { type: "separator" },
    { label: "Delete wallet", icon: Trash2, danger: true, onSelect: () => onDelete(w) },
  ];

  const columns: Column<Wallet>[] = [
    {
      id: "wallet", header: "Wallet", sortable: true, sortValue: (w) => w.alias,
      cell: (w) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {w.alias.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{w.alias}</span>
              {w.imported && <Badge tone="neutral" className="h-4 px-1.5 text-[10px]">imported</Badge>}
            </div>
            <button
              onClick={() => copy(w.address, "Address copied")}
              className="group/addr flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {shortAddress(w.address)}
              <Copy className="h-3 w-3 opacity-0 group-hover/addr:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      ),
    },
    { id: "group", header: "Group", sortable: true, sortValue: (w) => w.group, cell: (w) => <Badge tone="neutral">{w.group}</Badge> },
    {
      id: "balance", header: "Balance", align: "right", sortable: true, sortValue: (w) => w.balanceEth,
      cell: (w) => (
        <div>
          <div className="font-medium tabular-nums">{formatEth(w.balanceEth)}</div>
          <div className="text-xs text-muted-foreground">{network?.currency ?? "ETH"}</div>
        </div>
      ),
    },
    { id: "status", header: "Status", sortable: true, sortValue: (w) => w.status, cell: (w) => <Badge tone={statusTone[w.status]} dot>{w.status}</Badge> },
    { id: "tx", header: "Txns", align: "right", sortable: true, sortValue: (w) => w.txCount, cell: (w) => <span className="tabular-nums text-muted-foreground">{w.txCount}</span> },
    { id: "last", header: "Updated", align: "right", sortable: true, sortValue: (w) => w.lastUsed.getTime(), cell: (w) => <span className="text-muted-foreground">{timeAgo(w.lastUsed)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Wallets"
        description="Real EVM wallets. Balances read live from the selected network."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Select value={network?.key ?? "sepolia"} onChange={(e) => onNetwork(e.target.value)} className="h-9 w-[168px] text-sm">
                {NETWORK_OPTIONS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
              </Select>
              {network?.testnet && <Badge tone="warning">testnet</Badge>}
            </div>
            <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add wallet
            </Button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        getRowId={(w) => w.id}
        selectable
        searchValue={(w) => `${w.alias} ${w.address} ${w.group}`}
        searchPlaceholder="Search wallets…"
        emptyLabel="No wallets yet — generate or import some to get started."
        rowMenu={rowMenu}
        toolbarRight={
          <Select value={group} onChange={(e) => setGroup(e.target.value)} className="h-8 w-[160px] text-sm">
            <option value="all">All groups</option>
            {WALLET_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        }
        bulkBar={(selected, clear) => (
          <Button
            size="sm"
            variant="danger"
            onClick={async () => {
              const n = selected.length;
              for (const w of selected) await removeWallet(w.id);
              toast({ tone: "danger", title: `Deleted ${n} wallets` });
              clear();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      />

      {/* Add / import */}
      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add wallets"
        description="Generate brand-new keypairs, or import existing private keys / seed phrases."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={submitting} onClick={onCreate}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {method === "generate" ? "Generate" : "Import"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/40 p-1">
            {(["generate", "import"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  "h-8 rounded-sm text-sm font-medium capitalize transition-colors",
                  method === m ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {method === "generate" ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Number of wallets (max 50)</label>
              <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} min={1} max={50} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Private keys or seed phrases</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"0xabc123...   (private key)\nword word word ... (12/24-word seed phrase)\none per line"}
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-card px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-ring/25"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Group</label>
            <Select value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
              {WALLET_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </div>
        </div>
      </Dialog>

      {/* Send */}
      <Dialog
        open={!!sendWallet}
        onOpenChange={(v) => !v && setSendWallet(null)}
        title="Send ETH"
        description={network ? `On ${network.name}${network.testnet ? " (testnet)" : ""}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendWallet(null)}>Cancel</Button>
            <Button variant="primary" disabled={sending || !sendTo || !sendAmt} onClick={doSend}>
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send
            </Button>
          </>
        }
      >
        {sendWallet && (
          <div className="space-y-4 pb-2">
            <div className="rounded-md border border-border bg-muted/40 px-3.5 py-2.5">
              <div className="text-xs text-muted-foreground">From</div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-sm font-medium">{sendWallet.alias}</span>
                <span className="font-mono text-xs text-muted-foreground">{shortAddress(sendWallet.address)}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Balance {formatEth(sendWallet.balanceEth)} {network?.currency ?? "ETH"}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">To address</label>
              <Input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="0x…" className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount ({network?.currency ?? "ETH"})</label>
              <Input type="number" value={sendAmt} onChange={(e) => setSendAmt(e.target.value)} placeholder="0.01" step="0.0001" />
            </div>
            {!network?.testnet && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This is a live main network. This will move real funds and cannot be undone.
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Export */}
      <Dialog
        open={!!exported}
        onOpenChange={(v) => !v && setExported(null)}
        title="Export wallet secret"
        footer={<Button variant="primary" onClick={() => setExported(null)}>Done</Button>}
      >
        {exported && (
          <div className="space-y-3 pb-2">
            <div className="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Anyone with this private key or seed phrase has full control of the wallet and its funds. Never share it.
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Address</label>
              <Input readOnly value={exported.address} className="font-mono text-xs"
                trailing={<button onClick={() => copy(exported.address, "Address copied")} className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Private key</label>
              <Input readOnly value={reveal ? exported.privateKey : "•".repeat(24)} className="font-mono text-xs"
                trailing={
                  <span className="flex items-center gap-1.5">
                    <button onClick={() => setReveal((r) => !r)} className="text-muted-foreground hover:text-foreground">
                      {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => copy(exported.privateKey, "Private key copied")} className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                  </span>
                } />
            </div>
            {exported.mnemonic && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Seed phrase</label>
                <div className="relative">
                  <div className={cn("rounded-md border border-input bg-card px-3.5 py-2.5 text-sm font-mono", !reveal && "blur-sm select-none")}>
                    {exported.mnemonic}
                  </div>
                  <button onClick={() => copy(exported.mnemonic!, "Seed phrase copied")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
