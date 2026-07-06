import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";
import { FloatingMenu, type MenuItem } from "./Menu";

export interface Column<T> {
  id: string;
  header: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchValue?: (row: T) => string;
  searchPlaceholder?: string;
  selectable?: boolean;
  rowMenu?: (row: T) => MenuItem[];
  bulkBar?: (selected: T[], clear: () => void) => ReactNode;
  toolbarRight?: ReactNode;
  emptyLabel?: string;
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "flex h-[16px] w-[16px] items-center justify-center rounded-[5px] border transition-colors",
        checked || indeterminate
          ? "bg-accent border-accent text-accent-foreground"
          : "border-input bg-card hover:border-muted-foreground/50",
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      {!checked && indeterminate && (
        <span className="h-0.5 w-2 rounded bg-accent-foreground" />
      )}
    </button>
  );
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchValue,
  searchPlaceholder = "Search…",
  selectable,
  rowMenu,
  bulkBar,
  toolbarRight,
  emptyLabel = "No results.",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(
    null,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(
    null,
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (query && searchValue) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => searchValue(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      const get = col?.sortValue;
      if (get) {
        rows = [...rows].sort((a, b) => {
          const av = get(a);
          const bv = get(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, query, sort, columns, searchValue]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(getRowId(r)));
  const someSelected = filtered.some((r) => selected.has(getRowId(r)));
  const selectedRows = data.filter((r) => selected.has(getRowId(r)));

  const toggleAll = (v: boolean) => {
    const next = new Set(selected);
    filtered.forEach((r) => (v ? next.add(getRowId(r)) : next.delete(getRowId(r))));
    setSelected(next);
  };
  const toggleRow = (id: string, v: boolean) => {
    const next = new Set(selected);
    v ? next.add(id) : next.delete(id);
    setSelected(next);
  };
  const clear = () => setSelected(new Set());

  const onSort = (col: Column<T>) => {
    if (!col.sortable) return;
    setSort((prev) =>
      prev?.id === col.id
        ? prev.dir === "asc"
          ? { id: col.id, dir: "desc" }
          : null
        : { id: col.id, dir: "asc" },
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card shadow-soft overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
        <div className="w-full max-w-xs">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            icon={<Search />}
            className="h-8 text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">{toolbarRight}</div>
      </div>

      {/* Selection bar */}
      <AnimatePresence>
        {selectable && selectedRows.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-border bg-accent/[0.04]"
          >
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-sm font-medium">
                {selectedRows.length} selected
              </span>
              <button
                onClick={clear}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="ml-auto flex items-center gap-2">
                {bulkBar?.(selectedRows, clear)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {selectable && (
                <th className="w-10 pl-4 pr-2">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && someSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={cn(
                    "h-10 px-4 text-xs font-medium text-muted-foreground",
                    col.align === "right" ? "text-right" : "text-left",
                    col.align === "center" && "text-center",
                  )}
                >
                  <button
                    disabled={!col.sortable}
                    onClick={() => onSort(col)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors",
                      col.sortable && "hover:text-foreground cursor-pointer",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {col.header}
                    {col.sortable && (
                      <span className="flex flex-col -space-y-1">
                        {sort?.id === col.id ? (
                          sort.dir === "asc" ? (
                            <ChevronUp className="h-3 w-3 text-accent" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-accent" />
                          )
                        ) : (
                          <ChevronUp className="h-3 w-3 opacity-25" />
                        )}
                      </span>
                    )}
                  </button>
                </th>
              ))}
              {rowMenu && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const id = getRowId(row);
              const isSel = selected.has(id);
              return (
                <tr
                  key={id}
                  onContextMenu={(e) => {
                    if (!rowMenu) return;
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, items: rowMenu(row) });
                  }}
                  className={cn(
                    "group border-b border-border/60 last:border-0 transition-colors",
                    isSel ? "bg-accent/[0.05]" : "hover:bg-muted/40",
                  )}
                >
                  {selectable && (
                    <td className="pl-4 pr-2">
                      <Checkbox
                        checked={isSel}
                        onChange={(v) => toggleRow(id, v)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "px-4 h-[52px] text-base",
                        col.align === "right" && "text-right tabular-nums",
                        col.align === "center" && "text-center",
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                  {rowMenu && (
                    <td className="pr-3">
                      <button
                        onClick={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setMenu({ x: r.right - 204, y: r.bottom + 6, items: rowMenu(row) });
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7 inline-flex items-center justify-center rounded-sm transition-all"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>

      {/* Footer count */}
      <div className="flex items-center px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
        {filtered.length} of {data.length} rows
      </div>

      <AnimatePresence>
        {menu && (
          <FloatingMenu
            x={menu.x}
            y={menu.y}
            items={menu.items}
            onClose={() => setMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
