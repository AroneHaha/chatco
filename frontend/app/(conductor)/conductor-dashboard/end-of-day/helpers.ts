// app/(conductor)/conductor-dashboard/end-of-day/helpers.ts
export const fmt = (n: number) => `₱${n.toFixed(2)}`;

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
  Wallet_Scanned: { label: "QR Scanned", color: "text-[#62A0EA]", dot: "bg-[#62A0EA]" },
  Wallet_Prepay: { label: "Prepaid", color: "text-emerald-400", dot: "bg-emerald-400" },
  Voucher: { label: "Voucher", color: "text-amber-400", dot: "bg-amber-400" },
};