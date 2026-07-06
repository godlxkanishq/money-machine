import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShieldCheck } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/55 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-0 flex h-full w-[260px] flex-col border-r border-border bg-sidebar"
          >
            <div className="flex h-14 items-center gap-2.5 px-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-accent text-accent-foreground">
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
              <span className="text-[15px] font-semibold tracking-tight">
                Money Machine
              </span>
              <button
                onClick={onClose}
                className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2">
              {NAV.map((section, si) => (
                <div key={si} className="mb-4">
                  {section.label && (
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
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-md h-9 px-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-accent/10 text-accent"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                          )
                        }
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent/15 px-1.5 text-[11px] font-semibold text-accent">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-3">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Pro license</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">0 / 100 wallets</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: "0%" }} />
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
