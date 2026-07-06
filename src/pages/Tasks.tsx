import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Play, ScrollText, Trash2, Plus, Loader2, ExternalLink } from "lucide-react";
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
import { CHAINS, WALLET_GROUPS, type Task, type TaskStatus, type MintRun } from "@/lib/data";
import { shortAddress, timeAgo } from "@/lib/utils";

const statusTone: Record<TaskStatus, "accent" | "neutral" | "success" | "danger" | "warning"> = {
  running: "accent", queued: "neutral", success: "success", failed: "danger", paused: "warning",
};
const MODULES = ["OpenSea", "Manual", "Merkle", "Generic", "GenesisPad"];
const STRATEGIES = ["Direct", "Spam", "Private (MEV)", "Trigger"];

export function Tasks() {
  const { toast } = useToast();
  const { tasks, network, addTask, runTask, removeTask } = useData();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<MintRun | null>(null);

  const [form, setForm] = useState({
    name: "", contract: "",
    functionSig: "mint(uint256)", argsJson: "[1]", valueEth: "0",
    group: "all", walletCount: "1",
    chain: "Ethereum", module: "OpenSea", strategy: "Direct",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async () => {
    setSubmitting(true);
    try {
      await addTask({
        name: form.name || "Untitled task",
        contract: form.contract,
        functionSig: form.functionSig,
        argsJson: form.argsJson,
        valueEth: Number(form.valueEth) || 0,
        group: form.group,
        walletCount: Number(form.walletCount) || 1,
        chain: form.chain, module: form.module, strategy: form.strategy,
      });
      setOpen(false);
      toast({ tone: "success", title: "Task created", description: "Ready to run" });
    } catch {
      toast({ tone: "danger", title: "Couldn’t create task" });
    } finally {
      setSubmitting(false);
    }
  };

  const onRun = async (t: Task) => {
    setRunningId(t.id);
    toast({ tone: "info", title: "Minting…", description: "Signing and broadcasting on-chain" });
    try {
      const r = await runTask(t.id);
      const res: MintRun = r.result;
      setRunResult(res);
      toast({
        tone: res.failed === 0 ? "success" : res.success > 0 ? "warning" : "danger",
        title: `Mint: ${res.success}/${res.total} succeeded`,
        description: res.network,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.data?.message || err.code : "Mint failed";
      toast({ tone: "danger", title: "Mint failed", description: String(msg) });
    } finally {
      setRunningId(null);
    }
  };

  const onDelete = async (t: Task) => {
    try { await removeTask(t.id); toast({ tone: "danger", title: "Task deleted", description: t.name }); }
    catch { toast({ tone: "danger", title: "Couldn’t delete task" }); }
  };

  const rowMenu = (t: Task): MenuItem[] => [
    { label: runningId === t.id ? "Minting…" : "Run mint", icon: Play, disabled: runningId === t.id, onSelect: () => onRun(t) },
    ...(t.lastRun ? [{ label: "View last run", icon: ScrollText, onSelect: () => setRunResult(t.lastRun!) }] : []),
    { type: "separator" as const },
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => onDelete(t) },
  ];

  const columns: Column<Task>[] = [
    {
      id: "name", header: "Task", sortable: true, sortValue: (t) => t.name,
      cell: (t) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{t.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{t.contract ? shortAddress(t.contract) : "no contract"}</div>
        </div>
      ),
    },
    { id: "method", header: "Method", cell: (t) => <span className="font-mono text-xs text-muted-foreground">{t.functionSig || "—"}</span> },
    { id: "value", header: "Value", align: "right", cell: (t) => <span className="tabular-nums text-muted-foreground">{t.valueEth ?? 0} ETH</span> },
    { id: "wallets", header: "Wallets", align: "right", sortable: true, sortValue: (t) => t.walletCount, cell: (t) => <span className="tabular-nums">{t.walletCount}</span> },
    { id: "status", header: "Status", sortable: true, sortValue: (t) => t.status, cell: (t) => <Badge tone={statusTone[t.status]} dot>{t.status}</Badge> },
    {
      id: "progress", header: "Progress", width: "120px",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${t.progress}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground w-8">{t.progress}%</span>
        </div>
      ),
    },
    { id: "created", header: "Created", align: "right", sortable: true, sortValue: (t) => t.createdAt.getTime(), cell: (t) => <span className="text-muted-foreground">{timeAgo(t.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Mint Tasks"
        description={`Real on-chain mints. Runs on ${network ? network.name : "the selected network"}${network?.testnet ? " (testnet)" : ""}.`}
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        }
      />

      <DataTable
        data={tasks}
        columns={columns}
        getRowId={(t) => t.id}
        searchValue={(t) => `${t.name} ${t.contract} ${t.functionSig}`}
        searchPlaceholder="Search tasks…"
        emptyLabel="No tasks yet — create one to mint."
        rowMenu={rowMenu}
      />

      {/* New task */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New mint task"
        description="Define the contract, the mint function, and which wallets mint."
        className="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={submitting} onClick={onCreate}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create task
            </Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Task name</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Cool Cats mint" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contract address</label>
            <Input value={form.contract} onChange={(e) => set("contract", e.target.value)} placeholder="0x… (the NFT / mint contract)" className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mint function</label>
              <Input value={form.functionSig} onChange={(e) => set("functionSig", e.target.value)} placeholder="mint(uint256)" className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Arguments (JSON)</label>
              <Input value={form.argsJson} onChange={(e) => set("argsJson", e.target.value)} placeholder="[1]" className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Value per mint (ETH)</label>
              <Input type="number" value={form.valueEth} onChange={(e) => set("valueEth", e.target.value)} step="0.0001" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Wallets to use</label>
              <Input type="number" value={form.walletCount} onChange={(e) => set("walletCount", e.target.value)} min={1} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">From group</label>
              <Select value={form.group} onChange={(e) => set("group", e.target.value)}>
                <option value="all">Any group</option>
                {WALLET_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Module</label>
              <Select value={form.module} onChange={(e) => set("module", e.target.value)}>
                {MODULES.map((m) => <option key={m}>{m}</option>)}
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: leave <span className="font-mono">mint(uint256)</span> / <span className="font-mono">[1]</span> for the common “mint 1” drop.
            The task mints on the network selected on the Wallets page.
          </p>
        </div>
      </Dialog>

      {/* Run results */}
      <Dialog
        open={!!runResult}
        onOpenChange={(v) => !v && setRunResult(null)}
        title="Mint results"
        description={runResult ? `${runResult.success}/${runResult.total} succeeded on ${runResult.network}` : undefined}
        footer={<Button variant="primary" onClick={() => setRunResult(null)}>Done</Button>}
      >
        {runResult && (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pb-2">
            {runResult.results.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-mono text-xs">{shortAddress(r.address)}</div>
                  {r.error && <div className="truncate text-xs text-danger">{r.error}</div>}
                  {r.hash && <div className="font-mono text-[11px] text-muted-foreground">{shortAddress(r.hash, 10, 8)}</div>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={r.status === "success" ? "success" : "danger"} dot>{r.status}</Badge>
                  {r.hash && r.explorer && (
                    <a href={r.explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      tx <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
