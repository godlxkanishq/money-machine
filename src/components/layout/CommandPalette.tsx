import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  UserPlus,
  Server,
  Moon,
  Sun,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { useTheme } from "@/lib/theme";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (to: string) => {
    navigate(to);
    onOpenChange(false);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-background/55 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-[12vh] w-full max-w-[560px]"
          >
            <Command
              loop
              className="overflow-hidden rounded-lg border border-border bg-elevated shadow-pop"
            >
              <div className="flex items-center gap-2.5 border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  autoFocus
                  placeholder="Type a command or search…"
                  className="h-12 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 outline-none"
                />
              </div>
              <Command.List className="max-h-[360px] overflow-y-auto p-1.5">
                <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation">
                  {ALL_NAV_ITEMS.map((item) => (
                    <Command.Item
                      key={item.to}
                      value={`go ${item.label}`}
                      onSelect={() => go(item.to)}
                      className="flex cursor-pointer items-center gap-3 rounded-[7px] px-2.5 h-9 text-sm aria-selected:bg-muted text-foreground"
                    >
                      <item.icon className="h-4 w-4 opacity-80" />
                      <span className="flex-1">{item.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 aria-selected:opacity-100" />
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions">
                  <Command.Item
                    value="new mint task create"
                    onSelect={() => go("/tasks?new=1")}
                    className="flex cursor-pointer items-center gap-3 rounded-[7px] px-2.5 h-9 text-sm aria-selected:bg-muted"
                  >
                    <Plus className="h-4 w-4 opacity-80" />
                    <span className="flex-1">New mint task</span>
                  </Command.Item>
                  <Command.Item
                    value="add wallet import create"
                    onSelect={() => go("/wallets?add=1")}
                    className="flex cursor-pointer items-center gap-3 rounded-[7px] px-2.5 h-9 text-sm aria-selected:bg-muted"
                  >
                    <UserPlus className="h-4 w-4 opacity-80" />
                    <span className="flex-1">Add wallet</span>
                  </Command.Item>
                  <Command.Item
                    value="add rpc endpoint"
                    onSelect={() => go("/rpc")}
                    className="flex cursor-pointer items-center gap-3 rounded-[7px] px-2.5 h-9 text-sm aria-selected:bg-muted"
                  >
                    <Server className="h-4 w-4 opacity-80" />
                    <span className="flex-1">Add RPC endpoint</span>
                  </Command.Item>
                  <Command.Item
                    value="toggle theme dark light appearance"
                    onSelect={() => {
                      toggle();
                      onOpenChange(false);
                    }}
                    className="flex cursor-pointer items-center gap-3 rounded-[7px] px-2.5 h-9 text-sm aria-selected:bg-muted"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4 opacity-80" />
                    ) : (
                      <Moon className="h-4 w-4 opacity-80" />
                    )}
                    <span className="flex-1">
                      Switch to {theme === "dark" ? "light" : "dark"} mode
                    </span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
