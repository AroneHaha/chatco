// lib/commuter/group-voucher-plan.ts
//
// Preview of how vouchers apply to a group GCash payment, for the scan modal's
// voucher picker. Mirrors TransactionService::planGroupVouchers() on the
// backend, which stays the authority: the redeem response carries the real
// amount to charge.
//
// Rule: one voucher per seat. Free-ride vouchers cover whole seats, dearest
// first (the earlier seat, i.e. the payer, wins a tie). Discount vouchers,
// largest first, then come off what is left; one larger than its seat's
// fare carries over to the other seats, so it reduces the group total.

import type { GroupSeat, VoucherOption } from "@/lib/commuter/services/payment.service";

export interface GroupVoucherPlan {
  /** What each seat pays afterwards, keyed by seat position. */
  fares: Map<number, number>;
  /** Total still charged by GCash. */
  remaining: number;
  /** Seats a free-ride voucher covers in full. */
  freeSeats: GroupSeat[];
  /** Total taken off by discount vouchers. */
  discountTotal: number;
  /** Vouchers that would reduce nothing; the backend refuses these. */
  unused: string[];
}

const round = (value: number) => Math.round(value * 100) / 100;

export function planGroupVouchers(seats: GroupSeat[], vouchers: VoucherOption[]): GroupVoucherPlan {
  const fares = new Map(seats.map((seat) => [seat.position, round(Math.max(0, seat.fare))]));
  const held = new Set<number>();
  const unused: string[] = [];
  const freeSeats: GroupSeat[] = [];
  let discountTotal = 0;

  const byFare = () =>
    [...fares.keys()].sort((a, b) => (fares.get(b)! - fares.get(a)!) || a - b);
  const openSeat = () => byFare().find((position) => fares.get(position)! > 0 && !held.has(position));

  for (const voucher of vouchers.filter((v) => v.type !== "DISCOUNT")) {
    const seat = openSeat();
    if (seat === undefined) {
      unused.push(voucher.id);
      continue;
    }
    held.add(seat);
    fares.set(seat, 0);
    freeSeats.push(seats.find((s) => s.position === seat)!);
  }

  const discounts = vouchers
    .filter((v) => v.type === "DISCOUNT")
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  for (const voucher of discounts) {
    const seat = openSeat();
    let left = round(Math.max(0, voucher.amount ?? 0));
    if (seat === undefined || left <= 0) {
      unused.push(voucher.id);
      continue;
    }
    held.add(seat);
    for (const position of [seat, ...byFare().filter((p) => p !== seat)]) {
      if (left <= 0) break;
      const take = Math.min(fares.get(position)!, left);
      fares.set(position, round(fares.get(position)! - take));
      left = round(left - take);
      discountTotal = round(discountTotal + take);
    }
  }

  const remaining = round([...fares.values()].reduce((sum, fare) => sum + fare, 0));
  return { fares, remaining, freeSeats, discountTotal, unused };
}
