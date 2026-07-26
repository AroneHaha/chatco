"use client";

// components/admin/analytics/daily-revenue-chart.tsx
//
// Stacked daily revenue over a real horizontal time axis.
//
// Replaces the previous implementation, which laid each day out as a
// horizontal row inside a 400px scroll box. That shape does not survive a
// 90-day window (90 rows of vertical scrolling), gave no value scale to read
// bar lengths against, and exposed its numbers only through `title`
// attributes — a ~1s hover delay, unreachable by keyboard or touch.

import { useMemo, useState, useId } from "react";
import {
  formatPeso,
  formatPesoCompact,
  formatShortDate,
  type AnalyticsDailyPoint,
} from "@/lib/admin/services/analytics.service";

interface Props {
  data: AnalyticsDailyPoint[];
  /** Window of the trailing average overlay, in days. */
  averageWindow?: number;
}

const PAD = { top: 12, right: 8, bottom: 22, left: 46 };
const HEIGHT = 260;

export function DailyRevenueChart({ data, averageWindow = 7 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  // Trailing mean of `total`. Smooths day-to-day noise so the underlying
  // trend is visible; only defined once enough days have accumulated, so the
  // line starts partway in rather than ramping up from a partial window.
  const movingAvg = useMemo(() => {
    return data.map((_, i) => {
      if (i < averageWindow - 1) return null;
      const slice = data.slice(i - averageWindow + 1, i + 1);
      return slice.reduce((s, p) => s + p.total, 0) / averageWindow;
    });
  }, [data, averageWindow]);

  const maxTotal = useMemo(
    () => Math.max(...data.map(d => d.total), 1),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-slate-600 text-sm">
        No transaction data in this date range.
      </div>
    );
  }

  // Nice-ish rounded ceiling so the y-axis ticks land on readable numbers.
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxTotal)));
  const yMax = Math.ceil(maxTotal / magnitude) * magnitude;

  const plotW = 1000 - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const bandW = plotW / data.length;
  const barW = Math.max(1, Math.min(bandW * 0.7, 28));

  const yFor = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const xFor = (i: number) => PAD.left + i * bandW + bandW / 2;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * yMax);

  // Label every Nth day so the axis never collides with itself.
  const labelStride = Math.max(1, Math.ceil(data.length / 10));

  const avgPath = movingAvg
    .map((v, i) => (v === null ? null : `${xFor(i)},${yFor(v)}`))
    .filter((p): p is string => p !== null)
    .join(" ");

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 1000 ${HEIGHT}`}
        className="w-full h-[260px] overflow-visible"
        role="img"
        aria-label={`Daily revenue from ${data[0].date} to ${data[data.length - 1].date}. Peak ${formatPeso(maxTotal)}.`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Y grid + ticks */}
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="#1E2D45"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              className="fill-slate-500"
              style={{ fontSize: 9 }}
            >
              {formatPesoCompact(t)}
            </text>
          </g>
        ))}

        {/* Bars — cash stacked under gcash */}
        <g clipPath={`url(#${clipId})`}>
          {data.map((d, i) => {
            const cashH = (d.cash / yMax) * plotH;
            const gcashH = (d.gcash / yMax) * plotH;
            const x = xFor(i) - barW / 2;
            const isHover = hover === i;
            return (
              <g key={d.date}>
                {/* Full-band hit area: hovering anywhere in the column works,
                    including on zero-revenue days that have no visible bar. */}
                <rect
                  x={PAD.left + i * bandW}
                  y={PAD.top}
                  width={bandW}
                  height={plotH}
                  fill={isHover ? "#62A0EA" : "transparent"}
                  fillOpacity={isHover ? 0.07 : 0}
                  onMouseEnter={() => setHover(i)}
                />
                <rect
                  x={x}
                  y={PAD.top + plotH - cashH}
                  width={barW}
                  height={cashH}
                  fill="#10b981"
                  fillOpacity={isHover ? 1 : 0.75}
                  pointerEvents="none"
                />
                <rect
                  x={x}
                  y={PAD.top + plotH - cashH - gcashH}
                  width={barW}
                  height={gcashH}
                  fill="#3b82f6"
                  fillOpacity={isHover ? 1 : 0.75}
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {/* Trailing average overlay */}
          {avgPath && (
            <polyline
              points={avgPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}
        </g>

        {/* X axis */}
        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="#1E2D45"
        />
        {data.map((d, i) =>
          i % labelStride === 0 ? (
            <text
              key={d.date}
              x={xFor(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-slate-500"
              style={{ fontSize: 9 }}
            >
              {formatShortDate(d.date)}
            </text>
          ) : null
        )}
      </svg>

      {/* Readout. Replaces title-attribute tooltips — always visible, no
          hover delay, and it reserves its own space so the chart doesn't
          shift when values appear. */}
      <div className="mt-2 h-9 flex items-center justify-between rounded-md bg-[#0E1628] border border-[#1E2D45] px-3 text-xs">
        {active ? (
          <>
            <span className="text-slate-300 font-medium">{formatShortDate(active.date)}</span>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-emerald-400">{formatPeso(active.cash)}</span>
              <span className="text-blue-400">{formatPeso(active.gcash)}</span>
              <span className="text-white font-bold">{formatPeso(active.total)}</span>
              <span className="text-slate-500">{active.count} fares</span>
            </div>
          </>
        ) : (
          <span className="text-slate-600">Hover a day for its breakdown</span>
        )}
      </div>

      {/* Keyboard/screen-reader accessible equivalent of the same data. */}
      <details className="mt-2">
        <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300">
          View as table
        </summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-[#131C2E]">
              <tr className="text-slate-500 text-left">
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium text-right">Cash</th>
                <th className="py-1 font-medium text-right">GCash</th>
                <th className="py-1 font-medium text-right">Total</th>
                <th className="py-1 font-medium text-right">Fares</th>
              </tr>
            </thead>
            <tbody className="text-slate-400 font-mono">
              {data.map(d => (
                <tr key={d.date} className="border-t border-[#1E2D45]">
                  <td className="py-1 font-sans">{formatShortDate(d.date)}</td>
                  <td className="py-1 text-right">{formatPeso(d.cash)}</td>
                  <td className="py-1 text-right">{formatPeso(d.gcash)}</td>
                  <td className="py-1 text-right text-slate-300">{formatPeso(d.total)}</td>
                  <td className="py-1 text-right">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
