"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Modal } from "@/components/admin/ui/modal";

interface QrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  conductorName: string;
  plateNumber: string;
}

export default function QrPaymentModal({ isOpen, onClose, conductorName, plateNumber }: QrPaymentModalProps) {
  const [amount, setAmount] = useState("");

  const qrData = JSON.stringify({
    action: "PAY_CONDUCTOR",
    to: plateNumber,
    conductor: conductorName,
    amount: amount || "0",
  });

  const handleDownloadQR = () => {
    const canvas = document.querySelector("#conductor-qr-canvas canvas") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${plateNumber}-qr.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5 p-2">
        <h2 className="text-xl font-bold text-white">Generate Payment QR</h2>
        
        {/* Conductor Info Display */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
            {conductorName[0]}
          </div>
          <div>
            <p className="text-white font-bold text-base">{conductorName}</p>
            <p className="text-white/50 text-sm font-medium">Unit: {plateNumber}</p>
            <p className="text-[#62A0EA] text-xs font-semibold bg-[#62A0EA]/10 px-2 py-0.5 rounded-full mt-1 inline-block">Active Conductor</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Amount to Receive</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-[#1A5FB4]"
          />
        </div>

        <div id="conductor-qr-canvas" className="flex justify-center p-4 bg-white rounded-2xl">
          <QRCodeCanvas value={qrData} size={200} level={"H"} />
        </div>

        <button
          onClick={handleDownloadQR}
          className="w-full border border-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Download QR Image
        </button>
      </div>
    </Modal>
  );
}