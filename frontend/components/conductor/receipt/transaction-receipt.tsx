import { QRCodeSVG } from "qrcode.react";
import type { CSSProperties } from "react";
import type { ReceiptSettings } from "@/lib/conductor/services/receipt-settings.service";

interface TransactionReceiptProps {
  settings: ReceiptSettings;
  transactionId?: string;
  timestamp?: number;
  unitNumber: string;
  conductorName: string;
  passengerType: string;
  from: string;
  to: string;
  baseFare: number;
  discountAmount: number;
  finalFare: number;
  paymentMethod: string;
  receiptQrToken?: string | null;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-black/60">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default function TransactionReceipt({
  settings,
  transactionId,
  timestamp,
  unitNumber,
  conductorName,
  passengerType,
  from,
  to,
  baseFare,
  discountAmount,
  finalFare,
  paymentMethod,
  receiptQrToken,
}: TransactionReceiptProps) {
  const width = settings.paperWidth === "80" ? 300 : 230;

  return (
    <section
      aria-label="Fare receipt"
      className="thermal-receipt mx-auto bg-white px-3 py-4 font-mono text-[11px] leading-snug text-black shadow-lg"
      style={{
        width,
        maxWidth: "100%",
        "--receipt-paper-width": `${settings.paperWidth}mm`,
      } as CSSProperties}
    >
      <header className="text-center">
        <p className="text-[13px] font-bold tracking-wide">
          {settings.businessName || "CHATCO"}
        </p>
        {settings.addressLine && <p className="mt-0.5 text-[10px]">{settings.addressLine}</p>}
        <p className="mt-0.5 text-[10px]">FARE RECEIPT</p>
      </header>

      <div className="my-1.5 border-t border-dashed border-black/40" />
      {settings.showDateTime && timestamp && (
        <Row label="Date" value={new Date(timestamp).toLocaleString("en-PH")} />
      )}
      {settings.showTransactionId && transactionId && (
        <Row label="Ref" value={transactionId} />
      )}
      {settings.showUnit && <Row label="Unit" value={unitNumber} />}
      {settings.showConductor && <Row label="Conductor" value={conductorName} />}
      {settings.showPassenger && <Row label="Passenger" value={passengerType} />}

      {settings.showRoute && (
        <>
          <div className="my-1.5 border-t border-dashed border-black/40" />
          <Row label="From" value={from} />
          <Row label="To" value={to} />
        </>
      )}

      {settings.showFareBreakdown && (
        <>
          <div className="my-1.5 border-t border-dashed border-black/40" />
          <Row label="Base fare" value={money(baseFare)} />
          {discountAmount > 0 && <Row label="Discount" value={`-${money(discountAmount)}`} />}
        </>
      )}

      <div className="my-1.5 border-t border-dashed border-black/40" />
      <div className="flex justify-between text-[13px] font-bold">
        <span>TOTAL</span>
        <span>{money(finalFare)}</span>
      </div>
      <Row label="Paid via" value={paymentMethod} />

      {receiptQrToken && (
        <>
          <div className="my-1.5 border-t border-dashed border-black/40" />
          <div className="mx-auto w-fit bg-white p-1">
            <QRCodeSVG value={receiptQrToken} size={112} level="M" />
          </div>
          <p className="mt-1 text-center text-[9px]">Scan in Rewards to claim this cash ride.</p>
        </>
      )}

      <div className="my-1.5 border-t border-dashed border-black/40" />
      {settings.footerNote && <p className="text-center text-[10px]">{settings.footerNote}</p>}
      <p className="mt-1 text-center text-[9px] text-black/50">
        This serves as your official receipt.
      </p>
    </section>
  );
}
