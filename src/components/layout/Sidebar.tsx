import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeft, ShieldCheck } from "lucide-react";
import { NAV } from "@/lib/nav";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
      <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
        <path
          d="M9 22V10.5L16 17l7-6.5V22"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { stats, license } = useData();
  const maxWallets = license?.maxWallets ?? 100;
  const tier = license?.tier ? license.tier[0].toUpperCase() + license.tier.slice(1) : "Pro";
  const pct = maxWallets ? Math.round((stats.totalWallets / maxWallets) * 100) : 0;
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[244px]",
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <Logo />
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight">
            Money Machine
          </span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7 inline-flex items-center justify-center rounded-sm transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV.map((section, si) => (
          <div key={si} className="mb-4">
            {!collapsed && section.label && (
              <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group relative flex items-center gap-3 rounded-md h-9 px-2.5 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent"
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        />
                      )}
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* License footer */}
      <div className="p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">{tier} license</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats.totalWallets} / {maxWallets} wallets
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
