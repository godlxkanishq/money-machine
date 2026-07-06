import { useState } from "react";
import { Activity, Pencil, Power, Trash2, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { type MenuItem } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { CHAINS, type RpcEndpoint, type RpcStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

const statusTone: Record<RpcStatus, "success" | "warning" | "danger"> = {
  active: "success",
  degraded: "warning",
  down: "danger",
};
const dotColor: Record<RpcStatus, string> = {
  active: "bg-success",
  degraded: "bg-warning",
  down: "bg-danger",
};

export function Rpc() {
  const { toast } = useToast();
  const { rpcEndpoints, addRpc } = useData();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", chain: "Ethereum", priority: "1" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onCreate = async () => {
    setSubmitting(true);
    try {
      await addRpc({
        name: form.name || "New endpoint",
        url: form.url,
        chain: form.chain,
        priority: Number(form.priority) || 1,
      });
      setOpen(false);
      setForm({ name: "", url: "", chain: "Ethereum", priority: "1" });
      toast({ tone: "success", title: "Endpoint added" });
    } catch {
      toast({ tone: "danger", title: "Couldn’t add endpoint" });
    } finally {
      setSubmitting(false);
    }
  };

  const testConn = async (r: RpcEndpoint) => {
    toast({ tone: "info", title: "Testing…", description: r.name });
    try {
      const res = await api.testRpc(r.url);
      toast({ tone: "success", title: `${res.latencyMs} ms`, description: `chain ${res.chainId} · block ${res.block.toLocaleString()}` });
    } catch (e) {
      const msg = e instanceof ApiError ? e.data?.message || e.code : "unreachable";
      toast({ tone: "danger", title: "Test failed", description: String(msg) });
    }
  };

  const rowMenu = (r: RpcEndpoint): MenuItem[] => [
    { label: "Test connection", icon: Activity, onSelect: () => testConn(r) },
    { label: "Edit", icon: Pencil, onSelect: () => toast({ tone: "info", title: "Edit endpoint" }) },
    { label: "Disable", icon: Power, onSelect: () => toast({ tone: "warning", title: "Endpoint disabled", description: r.name }) },
    { type: "separator" },
    { label: "Delete", icon: Trash2, danger: true, onSelect: () => toast({ tone: "danger", title: "Endpoint removed", description: r.name }) },
  ];

  const columns: Column<RpcEndpoint>[] = [
    { id: "name", header: "Name", sortable: true, sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: "chain", header: "Chain", cell: (r) => <Badge tone="neutral">{r.chain}</Badge> },
    { id: "url", header: "Endpoint", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.url}</span> },
    {
      id: "latency",
      header: "Latency",
      align: "right",
      sortable: true,
      sortValue: (r) => r.latencyMs,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[r.status])} />
          {r.latencyMs} ms
        </span>
      ),
    },
    { id: "priority", header: "Priority", align: "right", sortable: true, sortValue: (r) => r.priority, cell: (r) => <span className="tabular-nums text-muted-foreground">P{r.priority}</span> },
    { id: "rps", header: "Rate", align: "right", cell: (r) => <span className="tabular-nums text-muted-foreground">{r.rps}/s</span> },
    { id: "status", header: "Status", cell: (r) => <Badge tone={statusTone[r.status]} dot>{r.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="RPC Endpoints"
        description="Manage RPC providers, priorities, and rate limits."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add endpoint
          </Button>
        }
      />

      <DataTable
        data={rpcEndpoints}
        columns={columns}
        getRowId={(r) => r.id}
        searchValue={(r) => `${r.name} ${r.url} ${r.chain}`}
        searchPlaceholder="Search endpoints…"
        emptyLabel="No RPC endpoints yet — add one to connect."
        rowMenu={rowMenu}
      />

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add RPC endpoint"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={submitting} onClick={onCreate}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add endpoint
            </Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Alchemy — Mainnet" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL</label>
            <Input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Chain</label>
              <Select value={form.chain} onChange={(e) => set("chain", e.target.value)}>
                {CHAINS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <Input type="number" value={form.priority} onChange={(e) => set("priority", e.target.value)} min={1} />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
