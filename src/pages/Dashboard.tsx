import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Wallet as WalletIcon,
  Coins,
  CheckCircle2,
  Crosshair,
  ScrollText,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useData } from "@/lib/store";
import { ethPrice } from "@/lib/data";
import { formatEth, formatUsd, formatNumber, timeAgo, cn } from "@/lib/utils";

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } },
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div variants={item}>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>
      </Card>
    </motion.div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[140px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function Dashboard() {
  const { stats, tasks, activity } = useData();
  const running = tasks.filter((t) => t.status === "running" || t.status === "queued");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your wallets, tasks, and mint performance."
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total balance"
          value={`${formatEth(stats.totalEth, 2)} Ξ`}
          sub={formatUsd(stats.totalEth * ethPrice)}
          icon={Coins}
        />
        <StatCard
          label="Wallets"
          value={formatNumber(stats.totalWallets)}
          sub={stats.totalWallets ? "in your pool" : "no wallets yet"}
          icon={WalletIcon}
        />
        <StatCard
          label="Successful mints"
          value={formatNumber(stats.successfulMints)}
          sub="all time"
          icon={CheckCircle2}
        />
        <StatCard
          label="Active tasks"
          value={formatNumber(stats.activeTasks)}
          sub="running now"
          icon={Crosshair}
        />
      </motion.div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Mint volume</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Last 30 days</p>
            </div>
            <div className="text-2xl font-semibold tabular-nums">0.0 Ξ</div>
          </div>
          <div className="mt-5">
            <ChartEmpty label="No mint volume yet" />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-semibold tracking-tight">Mints / day</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Last 14 days</p>
          <div className="mt-5">
            <ChartEmpty label="No mints yet" />
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-base font-semibold tracking-tight">Active tasks</h3>
          {running.length > 0 ? (
            <div className="mt-4 space-y-3">
              {running.map((t) => (
                <div key={t.id} className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-base font-medium">{t.name}</span>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.chain} · {t.module} · {t.strategy} · {t.walletCount} wallets
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Crosshair}
              title="No active tasks"
              description="Create a mint task to start automating."
              action={
                <Link to="/tasks?new=1">
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4" />
                    New task
                  </Button>
                </Link>
              }
            />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-semibold tracking-tight">Recent activity</h3>
          {activity.length > 0 ? (
            <div className="mt-4 space-y-3.5">
              {activity.slice(0, 6).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      a.level === "success" && "bg-success",
                      a.level === "info" && "bg-accent",
                      a.level === "warn" && "bg-warning",
                      a.level === "error" && "bg-danger",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-foreground/90">{a.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.source} · {timeAgo(a.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ScrollText} title="No activity yet" />
          )}
        </Card>
      </div>
    </div>
  );
}
