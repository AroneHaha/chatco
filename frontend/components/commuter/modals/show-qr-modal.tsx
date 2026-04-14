"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { User } from "@/app/types/user.types";

interface ShowQRModalProps {
  user: User;
  onClose: () => void;
}

export default function ShowQRModal({ user, onClose }: ShowQRModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // The data encoded inside the QR code (Backend will read this string)
  const qrData = `chatco-commuter-id-${user.id}`;

  const handleDownload = async () => {
    if (!qrRef.current) return;
    
    // Find the SVG element inside our container
    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) return;

    // Convert SVG to a data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    // Draw it onto a Canvas to turn it into a PNG
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800; // High res
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 100, 50, 600, 600); // Draw QR in center

      // Add text below QR
      ctx.fillStyle = "#071A2E";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CHATCO Commuter Pass", canvas.width / 2, 710);
      
      ctx.fillStyle = "#64748B";
      ctx.font = "20px sans-serif";
      ctx.fillText(`${user.firstName} ${user.surname} (${user.commuterType})`, canvas.width / 2, 750);

      // Trigger download
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `CHATCO-QR-${user.firstName}.png`;
      link.href = pngUrl;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1A5FB4]/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-[#1A5FB4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            </svg>
          </div>

          <h2 className="text-lg font-bold text-[#071A2E]">Your Commuter QR Code</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">Present this to the conductor for scanning</p>

          {/* The QR Code Container */}
          <div ref={qrRef} className="bg-white p-4 rounded-2xl border-2 border-dashed border-[#1A5FB4]/20 inline-block">
            <QRCodeSVG
              value={qrData}
              size={220}
              bgColor="#ffffff"
              fgColor="#071A2E"
              level="H" // High error correction so it scans even if dirty
              includeMargin={false}
            />
          </div>

          <div className="mt-4 mb-2">
            <span className="text-xs font-semibold text-[#1A5FB4] bg-[#1A5FB4]/10 px-3 py-1 rounded-full uppercase tracking-wider">
              {user.commuterType}
            </span>
          </div>
          <p className="text-sm font-semibold text-[#071A2E]">
            {user.firstName} {user.surname}
          </p>
          <p className="text-xs text-gray-400">
            ID: {user.id}
          </p>

          {/* Action Buttons */}
          <div className="w-full mt-6 space-y-3">
            <button 
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m9 0 9 9M3 3l9 9" /></svg>
              Download as Image
            </button>
            <button 
              onClick={onClose}
              className="w-full px-5 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}