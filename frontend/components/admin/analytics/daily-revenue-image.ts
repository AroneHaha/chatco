// components/admin/analytics/daily-revenue-image.ts
//
// The Daily Revenue chart drawn on a canvas as a PNG, for the Overview export
// (PDF and Word). Same encoding as the on-screen DailyRevenueChart, in its
// light-theme colours for a white page: stacked bars (cash slate, GCash
// CHATCO Blue), a 7-day trailing average line, rounded y-axis ticks.

import { formatPesoCompact, formatShortDate, type AnalyticsDailyPoint } from "@/lib/admin/services/analytics.service";
import type { ExportImage } from "@/lib/utils/export-report";

const WIDTH = 1600;
const HEIGHT = 640;
const PAD = { top: 70, right: 30, bottom: 60, left: 110 };
const CASH = "#94A3B8";
const GCASH = "#1A5FB4";
const AVERAGE = "#334155";
const GRID = "#E2E8F0";
const TEXT = "#475569";
const AVERAGE_WINDOW = 7;

/** Returns null when no day earned anything (nothing to plot). */
export function renderDailyRevenueImage(data: AnalyticsDailyPoint[]): ExportImage | null {
  if (!data.some((day) => day.total > 0)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.font = "22px Poppins, system-ui, sans-serif";

  // Same rounded ceiling as the on-screen chart, so ticks are readable.
  const maxTotal = Math.max(...data.map((day) => day.total), 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxTotal)));
  const yMax = Math.ceil(maxTotal / magnitude) * magnitude;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const bandW = plotW / data.length;
  const barW = Math.max(2, Math.min(bandW * 0.7, 44));
  const yFor = (value: number) => PAD.top + plotH - (value / yMax) * plotH;
  const xFor = (i: number) => PAD.left + i * bandW + bandW / 2;

  // Grid and y-axis labels.
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
    const y = yFor(fraction * yMax);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(WIDTH - PAD.right, y);
    ctx.stroke();
    ctx.fillStyle = TEXT;
    ctx.fillText(formatPesoCompact(fraction * yMax), PAD.left - 14, y);
  }

  // Stacked bars: cash at the base, GCash on top.
  data.forEach((day, i) => {
    const x = xFor(i) - barW / 2;
    ctx.fillStyle = CASH;
    ctx.fillRect(x, yFor(day.cash), barW, yFor(0) - yFor(day.cash));
    ctx.fillStyle = GCASH;
    ctx.fillRect(x, yFor(day.cash + day.gcash), barW, yFor(day.cash) - yFor(day.cash + day.gcash));
  });

  // 7-day trailing average, once a full window exists.
  ctx.strokeStyle = AVERAGE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  data.forEach((_, i) => {
    if (i < AVERAGE_WINDOW - 1) return;
    const average = data.slice(i - AVERAGE_WINDOW + 1, i + 1).reduce((sum, day) => sum + day.total, 0) / AVERAGE_WINDOW;
    if (started) ctx.lineTo(xFor(i), yFor(average));
    else { ctx.moveTo(xFor(i), yFor(average)); started = true; }
  });
  if (started) ctx.stroke();

  // X-axis: every Nth day so labels never collide.
  ctx.fillStyle = TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const stride = Math.max(1, Math.ceil(data.length / 10));
  data.forEach((day, i) => {
    if (i % stride === 0 || i === data.length - 1) ctx.fillText(formatShortDate(day.date), xFor(i), PAD.top + plotH + 14);
  });

  // Legend.
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let legendX = PAD.left;
  for (const [label, colour, line] of [["Cash", CASH, false], ["GCash", GCASH, false], ["7-day avg", AVERAGE, true]] as const) {
    ctx.fillStyle = colour;
    if (line) ctx.fillRect(legendX, 31, 30, 4);
    else ctx.fillRect(legendX, 23, 20, 20);
    legendX += line ? 40 : 30;
    ctx.fillStyle = TEXT;
    ctx.fillText(label, legendX, 33);
    legendX += ctx.measureText(label).width + 36;
  }

  return { dataUrl: canvas.toDataURL("image/png"), width: WIDTH, height: HEIGHT };
}
