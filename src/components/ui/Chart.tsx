import { useId } from "react";

/** Minimal area chart — single muted accent, no animation, no axes clutter. */
export function AreaChart({
  data,
  height = 64,
  className,
}: {
  data: number[];
  height?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const w = 300;
  const h = height;
  const max = Math.max(...data, 0.0001);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 4;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path
        d={line}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Minimal stacked bars — neutral base + accent, generous gaps. */
export function BarChart({
  data,
  height = 180,
}: {
  data: { success: number; fail: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.success + d.fail), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const total = d.success + d.fail;
        const th = (total / max) * (height - 8);
        const sh = total ? (d.success / total) * th : 0;
        const fh = th - sh;
        return (
          <div
            key={i}
            className="group relative flex-1 flex flex-col justify-end"
            title={`${d.success} ok · ${d.fail} fail`}
          >
            <div
              className="w-full rounded-t-[4px] bg-danger/40"
              style={{ height: fh }}
            />
            <div
              className="w-full bg-accent/85 first:rounded-t-[4px]"
              style={{ height: sh, borderRadius: fh ? 0 : "4px 4px 0 0" }}
            />
          </div>
        );
      })}
    </div>
  );
}
