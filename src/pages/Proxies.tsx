import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, MoreHorizontal, Activity, Pencil, Eraser, Trash2, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { DropdownMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/lib/store";
import { type RpcStatus } from "@/lib/data";

const statusTone: Record<RpcStatus, "success" | "warning" | "danger"> = {
  active: "success",
  degraded: "warning",
  down: "danger",
};

export function Proxies() {
  const { toast } = useToast();
  const { proxyGroups, addProxy } = useData();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", list: "" });

  const onCreate = async () => {
    setSubmitting(true);
    try {
      await addProxy({ name: form.name || "New group", list: form.list });
      setOpen(false);
      setForm({ name: "", list: "" });
      toast({ tone: "success", title: "Proxy group added" });
    } catch {
      toast({ tone: "danger", title: "Couldn’t add proxy group" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Proxies"
        description="Rotate requests across proxy pools to avoid rate limits."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add proxy group
          </Button>
        }
      />

      {proxyGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="No proxy groups"
            description="Add a proxy group to rotate requests and avoid rate limits."
            action={
              <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Add proxy group
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proxyGroups.map((p, i) => {
            const pct = p.count ? Math.round((p.active / p.count) * 100) : 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-lg border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Globe className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <Badge tone={statusTone[p.status]} dot className="mt-1">{p.status}</Badge>
                    </div>
                  </div>
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                    items={[
                      { label: "Test all", icon: Activity, onSelect: () => toast({ tone: "info", title: "Health check started" }) },
                      { label: "Edit list", icon: Pencil, onSelect: () => toast({ tone: "info", title: "Edit proxies" }) },
                      { label: "Clear failed", icon: Eraser, onSelect: () => toast({ tone: "warning", title: "Cleared failed proxies" }) },
                      { type: "separator" },
                      { label: "Delete group", icon: Trash2, danger: true, onSelect: () => toast({ tone: "danger", title: "Group deleted", description: p.name }) },
                    ]}
                  />
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">{p.active}</div>
                    <div className="text-xs text-muted-foreground">of {p.count} active</div>
                  </div>
                  <div className="text-sm font-medium tabular-nums text-muted-foreground">{pct}%</div>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add proxy group"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={submitting} onClick={onCreate}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add group
            </Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Group name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Residential — US" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Proxies</label>
            <textarea
              value={form.list}
              onChange={(e) => setForm((f) => ({ ...f, list: e.target.value }))}
              rows={5}
              placeholder="host:port:user:pass — one per line"
              className="w-full resize-none rounded-md border border-input bg-card px-3.5 py-2.5 text-base font-mono text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-ring/25"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
