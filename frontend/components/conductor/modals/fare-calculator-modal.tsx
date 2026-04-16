"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Modal } from "@/components/admin/ui/modal";

interface FareCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  conductorName: string;
  unitNumber: string;
  driverName: string;
}

const LOCATIONS = ["meycauayan", "marilao", "bocaue", "balagtas", "guiguinto", "tikay", "malolos", "calumpit"];
const DISTANCE_MAP: Record<string, number> = { meycauayan: 0, marilao: 4, bocaue: 9, balagtas: 13, guiguinto: 16, tikay: 19, malolos: 22, calumpit: 34 };
const BASE_FARE = 13.0;
const BASE_KM = 1;
const ADDITIONAL_RATE = 1.5;
const DISCOUNT_PERCENT = 0.20;

export default function FareCalculatorModal({ isOpen, onClose, conductorName, unitNumber, driverName }: FareCalculatorModalProps) {
  const [step, setStep] = useState<'scanning' | 'details' | 'review' | 'success'>('scanning');
  const [passenger, setPassenger] = useState<{ name: string; id: string; role: string } | null>(null);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'CHATCO Wallet' | 'GCash'>('CHATCO Wallet');
  const [receiptId, setReceiptId] = useState("");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Scanner Logic
  useEffect(() => {
    if (isOpen && step === 'scanning') {
      const scanner = new Html5Qrcode("fare-scanner");
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.userId && data.name) {
              setPassenger({ name: data.name, id: data.userId, role: data.role || "Regular" });
              setStep('details');
              scanner.stop();
            }
          } catch (e) { console.log("Invalid QR"); }
        },
        () => {}
      ).catch(err => console.error(err));
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, [isOpen, step]);

  // Calculations
  const distance = fromLocation && toLocation && fromLocation !== toLocation ? Math.abs(DISTANCE_MAP[toLocation] - DISTANCE_MAP[fromLocation]) : 0;
  const succeedingKm = distance > BASE_KM ? distance - BASE_KM : 0;
  const succeedingFare = succeedingKm * ADDITIONAL_RATE;
  const grossFare = BASE_FARE + succeedingFare;
  const hasDiscount = passenger?.role !== "Regular";
  const discountAmount = hasDiscount ? grossFare * DISCOUNT_PERCENT : 0;
  const totalFare = grossFare - discountAmount;

  const handleConfirmPayment = () => {
    const txId = `TXN-${Date.now()}`;
    setReceiptId(txId);
    // Removed Database Save Logic Here
    setStep('success');
  };

  const handleClose = () => {
    setStep('scanning'); setPassenger(null); setFromLocation(""); setToLocation(""); setPaymentMethod('CHATCO Wallet');
    onClose();
  };

  // --- STEP RENDERERS ---
  const renderScanning = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Scan Passenger QR</h2>
      <p className="text-white/50 text-sm text-center">Align the QR code within the frame</p>
      <div id="fare-scanner" className="w-full rounded-xl overflow-hidden" style={{ minHeight: "250px" }} />
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Trip Details</h2>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-1">
        <p className="text-white font-semibold">{passenger?.name}</p>
        <div className="flex justify-between text-xs text-white/50">
          <span>ID: {passenger?.id}</span>
          <span className={`font-semibold px-2 py-0.5 rounded ${hasDiscount ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{passenger?.role}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">From</label>
          <select value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1A5FB4] appearance-none capitalize">
            <option value="" className="bg-gray-800">Select</option>
            {LOCATIONS.map(l => <option key={l} value={l} className="bg-gray-800 capitalize">{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">To</label>
          <select value={toLocation} onChange={(e) => setToLocation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1A5FB4] appearance-none capitalize">
            <option value="" className="bg-gray-800">Select</option>
            {LOCATIONS.map(l => <option key={l} value={l} className="bg-gray-800 capitalize">{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Payment Method</label>
        <div className="grid grid-cols-2 gap-2">
          {(['CHATCO Wallet', 'GCash'] as const).map(m => (
            <button key={m} onClick={() => setPaymentMethod(m)} className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${paymentMethod === m ? 'bg-[#1A5FB4] text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => distance > 0 ? setStep('review') : alert("Select valid locations")} disabled={distance === 0} className="w-full py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] disabled:bg-gray-700 text-white mt-2">Calculate & Review</button>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Review Payment</h2>
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">Passenger</span><span className="text-white font-medium">{passenger?.name}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Route</span><span className="text-white font-medium capitalize">{fromLocation} → {toLocation}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Distance</span><span className="text-white font-medium">{distance} km</span></div>
        <div className="border-t border-white/10 pt-2 flex justify-between"><span className="text-gray-400">First Kilometer</span><span className="text-white">₱ {BASE_FARE.toFixed(2)}</span></div>
        {succeedingKm > 0 && <div className="flex justify-between"><span className="text-gray-400">Succeeding ({succeedingKm} km x ₱{ADDITIONAL_RATE})</span><span className="text-white">₱ {succeedingFare.toFixed(2)}</span></div>}
        {hasDiscount && <div className="flex justify-between text-green-400"><span>Discount (Auto - 20%)</span><span>- ₱ {discountAmount.toFixed(2)}</span></div>}
        <div className="border-t border-white/10 pt-2 flex justify-between items-center">
          <span className="text-white font-bold">Total</span>
          <span className="text-2xl font-extrabold text-[#62A0EA]">₱ {totalFare.toFixed(2)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setStep('details')} className="py-3 rounded-xl text-sm font-semibold border border-white/10 text-gray-300">Back</button>
        <button onClick={handleConfirmPayment} className="py-3 rounded-xl text-sm font-bold bg-green-600 text-white">Confirm Payment</button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
      </div>
      <h2 className="text-xl font-bold text-white">Payment Successful</h2>
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-left text-xs space-y-2 font-mono">
        <p className="text-center text-white/40 border-b border-dashed border-white/10 pb-2">RECEIPT</p>
        <div className="flex justify-between"><span className="text-gray-400">Txn ID:</span><span className="text-white">{receiptId}</span></div>
        <div className="flex justify-between"><span className="text-gray-400">Date:</span><span className="text-white">{new Date().toLocaleString()}</span></div>
        <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
          <p className="text-white/50 font-bold uppercase text-[10px] mt-1">Passenger</p>
          <div className="flex justify-between"><span className="text-gray-400">Name:</span><span className="text-white">{passenger?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">ID:</span><span className="text-white">{passenger?.id}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Role:</span><span className="text-white">{passenger?.role}</span></div>
        </div>
        <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
          <p className="text-white/50 font-bold uppercase text-[10px] mt-1">Route & Fare</p>
          <div className="flex justify-between"><span className="text-gray-400">Route:</span><span className="text-white capitalize">{fromLocation} → {toLocation}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">First Km:</span><span className="text-white">₱{BASE_FARE.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Succeeding ({succeedingKm}km):</span><span className="text-white">₱{succeedingFare.toFixed(2)}</span></div>
          {hasDiscount && <div className="flex justify-between text-green-400"><span>Discount:</span><span>-₱{discountAmount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-base text-[#62A0EA] border-t border-white/10 pt-2"><span>Total Paid:</span><span>₱{totalFare.toFixed(2)}</span></div>
        </div>
        <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
          <p className="text-white/50 font-bold uppercase text-[10px] mt-1">Unit Info</p>
          <div className="flex justify-between"><span className="text-gray-400">Conductor:</span><span className="text-white">{conductorName}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Driver:</span><span className="text-white">{driverName}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Unit No:</span><span className="text-white">{unitNumber}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Method:</span><span className="text-white">{paymentMethod}</span></div>
        </div>
      </div>
      <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white">Done</button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="p-2">
        {step === 'scanning' && renderScanning()}
        {step === 'details' && renderDetails()}
        {step === 'review' && renderReview()}
        {step === 'success' && renderSuccess()}
      </div>
    </Modal>
  );
}