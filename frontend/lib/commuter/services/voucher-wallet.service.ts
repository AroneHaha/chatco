import type { VoucherTab, WalletVoucher } from "@/app/(commuter)/rewards/types";

export interface WalletPage {
  vouchers: WalletVoucher[];
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}

/** One page of a voucher wallet tab (GET /api/commuter/vouchers). */
export async function fetchWalletPage(
  tab: VoucherTab,
  cursor: string | null,
  signal: AbortSignal,
  perPage = 15,
): Promise<WalletPage> {
  const params = new URLSearchParams({ status: tab, per_page: String(perPage) });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/commuter/vouchers?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || "Unable to load your vouchers.");
  }

  const rows: Record<string, unknown>[] = body.data?.vouchers ?? [];
  return {
    vouchers: rows.map((v) => ({
      id: String(v.id ?? ""),
      code: String(v.code ?? ""),
      type: (v.type ?? "REWARD") as WalletVoucher["type"],
      amount: v.amount == null ? null : Number(v.amount),
      status: (v.status ?? "AVAILABLE") as WalletVoucher["status"],
      expiresAt: String(v.expiresAt ?? ""),
      rideOrigin: String(v.rideOrigin ?? "Reward"),
      usedAt: v.usedAt ? String(v.usedAt) : null,
      usedRoute: v.usedRoute ? String(v.usedRoute) : null,
    })),
    nextCursor: body.data?.nextCursor ?? null,
  };
}
