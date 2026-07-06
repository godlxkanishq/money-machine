import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  type?: "item" | "separator" | "label";
  label?: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

function Items({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="py-1">
      {items.map((it, i) => {
        if (it.type === "separator")
          return <div key={i} className="my-1 h-px bg-border" />;
        if (it.type === "label")
          return (
            <div
              key={i}
              className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground"
            >
              {it.label}
            </div>
          );
        const Icon = it.icon;
        return (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => {
              it.onSelect?.();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-2.5 h-8 mx-1 rounded-[7px] text-sm",
              "transition-colors duration-100 disabled:opacity-40 disabled:pointer-events-none",
              it.danger
                ? "text-danger hover:bg-danger/10"
                : "text-foreground hover:bg-muted",
            )}
            style={{ width: "calc(100% - 8px)" }}
          >
            {Icon && <Icon className="h-4 w-4 opacity-80" />}
            <span className="flex-1 text-left">{it.label}</span>
            {it.shortcut && (
              <span className="text-xs text-muted-foreground">{it.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function FloatingMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = window.innerHeight - r.height - 8;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = () => onClose();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.97, y: -2 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.13, ease: EASE }}
      style={{ left: pos.left, top: pos.top, transformOrigin: "top left" }}
      className="fixed z-[100] min-w-[200px] rounded-md border border-border bg-elevated shadow-pop"
    >
      <Items items={items} onClose={onClose} />
    </motion.div>,
    document.body,
  );
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const onOpen = () => {
    const el = wrapRef.current?.firstElementChild as HTMLElement | undefined;
    const r = (el ?? wrapRef.current)?.getBoundingClientRect();
    if (!r) return;
    setCoords({ x: align === "end" ? r.right - 204 : r.left, y: r.bottom + 6 });
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className="contents">
      <span onClick={onOpen}>{trigger}</span>
      <AnimatePresence>
        {open && (
          <FloatingMenu
            x={coords.x}
            y={coords.y}
            items={items}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
