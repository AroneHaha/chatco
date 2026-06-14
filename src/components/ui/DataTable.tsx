"use client";

import { ReactNode } from "react";

export interface Column {
  key: string;
  label: string;
  /** Tailwind width class — e.g. "w-[180px]" or "w-1/4" */
  width?: string;
  /** Defaults to "left" */
  align?: "left" | "center" | "right";
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, ReactNode>[];
  /** Render a custom cell. Return null to fall back to default. */
  renderCell?: (key: string, value: ReactNode, row: Record<string, ReactNode>, index: number) => ReactNode;
  /** Optional fixed-width actions column on the right */
  actions?: (row: Record<string, ReactNode>, index: number) => ReactNode;
  /** Row-level class — receives the row data and index */
  rowClass?: (row: Record<string, ReactNode>, index: number) => string;
  actionsWidth?: string;
  emptyMessage?: string;
}

export default function DataTable({
  columns,
  data,
  renderCell,
  actions,
  rowClass,
  actionsWidth = "w-[100px]",
  emptyMessage = "No data found.",
}: DataTableProps) {
  const alignMap = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[600px] border-collapse">
        {/* ── Header ── */}
        <thead>
          <tr className="bg-white/[0.04]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 whitespace-nowrap ${col.width ?? ""} ${alignMap[col.align ?? "left"]}`}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 whitespace-nowrap text-center ${actionsWidth}`}>
                Actions
              </th>
            )}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-4 py-12 text-center text-sm text-white/30"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className={`border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors ${rowClass?.(row, idx) ?? ""}`}
              >
                {columns.map((col) => {
                  const custom = renderCell?.(col.key, row[col.key], row, idx);
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-white/70 whitespace-nowrap ${col.width ?? ""} ${alignMap[col.align ?? "left"]}`}
                    >
                      {custom !== undefined && custom !== null ? custom : (row[col.key] as ReactNode)}
                    </td>
                  );
                })}
                {actions && (
                  <td className={`px-4 py-3 text-center ${actionsWidth}`}>
                    {actions(row, idx)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}