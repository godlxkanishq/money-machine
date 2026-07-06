import { Search, Bell, Plus, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Kbd } from "@/components/ui/Kbd";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/Menu";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

function initialsOf(name?: string | null) {
  const parts = (name || "Money Machine").split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "M").concat(parts[1]?.[0] || "").toUpperCase();
}

export function Topbar({
  onOpenCommand,
  onOpenMobile,
}: {
  onOpenCommand: () => void;
  onOpenMobile: () => void;
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onOpenMobile}
        className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onOpenCommand}
        className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:bg-muted/40"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="primary" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/tasks?new=1")}>
          <Plus className="h-4 w-4" />
          New task
        </Button>
        <button className="relative h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <ThemeToggle />

        <DropdownMenu
          align="end"
          trigger={
            <button className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent/80 to-accent text-xs font-semibold text-accent-foreground ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-ring/40">
              {user?.picture ? (
                <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initialsOf(user?.name || user?.email)
              )}
            </button>
          }
          items={[
            { type: "label", label: user?.name || "Signed in" },
            ...(user?.email ? [{ type: "label" as const, label: user.email }] : []),
            { type: "separator" },
            { label: "Sign out", icon: LogOut, danger: true, onSelect: signOut },
          ]}
        />
      </div>
    </header>
  );
}
