// app/(conductor)/conductor-dashboard/end-of-day/helpers.ts
export const fmt = (n: number | undefined | null) => `₱${(n ?? 0).toFixed(2)}`;

export const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const fmtDateTime = () =>
  new Date().toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const methodConfig: Record<string, { label: string; color: string; dot: string }> = {
  GCash_Scanned: { label: "GCash (Scanned)", color: "text-[#62A0EA]", dot: "bg-[#62A0EA]" },
  GCash_Direct: { label: "GCash (Direct)", color: "text-blue-300", dot: "bg-blue-300" },
  Voucher: { label: "Voucher (Free Ride)", color: "text-amber-400", dot: "bg-amber-400" },
  Cash: { label: "Cash", color: "text-green-400", dot: "bg-green-400" },
};
