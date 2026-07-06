import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Search,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { type LogLevel } from "@/lib/data";
import { useData } from "@/lib/store";
import { timeAgo, cn } from "@/lib/utils";

const meta: Record<LogLevel, { icon: LucideIcon; color: string }> = {
  success: { icon: CheckCircle2, color: "text-success" },
  info: { icon: Info, color: "text-accent" },
  warn: { icon: AlertTriangle, color: "text-warning" },
  error: { icon: XCircle, color: "text-danger" },
};

const FILTERS: { key: "all" | LogLevel; label: string }[] = [
  { key: "all", label: "All" },
  { key: "success", label: "Success" },
  { key: "info", label: "Info" },
  { key: "warn", label: "Warnings" },
  { key: "error", label: "Errors" },
];

export function Activity() {
  const { activity } = useData();
  const [filter, setFilter] = useState<"all" | LogLevel>("all");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    return activity
      .filter((a) => (filter === "all" ? true : a.level === filter))
      .filter((a) =>
        q ? `${a.message} ${a.source}`.toLowerCase().includes(q.toLowerCase()) : true,
      )
      .sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [filter, q, activity]);

  return (
    <div>
      <PageHeader title="Activity" description="A live log of every action across your tasks and wallets." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-7 rounded-sm px-3 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto sm:w-64">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activity…"
            icon={<Search />}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft divide-y divide-border/60">
        {items.map((a, i) => {
          const M = meta[a.level];
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
              className="flex items-start gap-3.5 px-4 py-3.5"
            >
              <span className={cn("mt-0.5", M.color)}>
                <M.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{a.message}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="neutral" className="h-5 px-2 text-[11px]">
                    {a.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(a.time)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        {items.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {activity.length === 0
              ? "No activity yet — it'll show up here as your tasks run."
              : "No activity matches your filter."}
          </div>
        )}
      </div>
    </div>
  );
}
