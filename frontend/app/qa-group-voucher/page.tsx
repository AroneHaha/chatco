"use client";

// TEMPORARY visual QA harness — deleted after screenshots.
import { GroupVoucherPicker } from "@/components/commuter/modals/group-voucher-picker";
import type { ClaimResult } from "@/lib/commuter/services/payment.service";

const claim: ClaimResult = {
  transactionId: "QA", checkoutUrl: null, amount: 61.2, regularAmount: 68, discountAmount: 6.8,
  passengerRole: "REGULAR", pickupName: "Calumpit", dropoffName: "Malolos",
  voucherAvailable: true, availableVoucher: null, isGroup: true,
  availableVouchers: [
    { id: "a", type: "REWARD", amount: null, expiresAt: "2026-10-27T10:00:00+08:00" },
    { id: "b", type: "FREE_RIDE", amount: null, expiresAt: null },
    { id: "c", type: "DISCOUNT", amount: 5, expiresAt: "2026-10-31T10:00:00+08:00" },
  ],
  seats: [
    { position: 1, passengerType: "REGULAR", fare: 17, isPayer: true },
    { position: 2, passengerType: "REGULAR", fare: 17, isPayer: false },
    { position: 3, passengerType: "STUDENT", fare: 13.6, isPayer: false },
    { position: 4, passengerType: "STUDENT", fare: 13.6, isPayer: false },
  ],
};

export default function Page() {
  return (
    <div className="fixed inset-0 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="w-full overflow-y-auto rounded-t-2xl border border-[#1C3350] bg-[#071A2E] shadow-2xl sm:max-w-sm sm:rounded-2xl">
        <GroupVoucherPicker claim={claim} onUse={() => {}} onPayInstead={() => {}} />
      </div>
    </div>
  );
}
