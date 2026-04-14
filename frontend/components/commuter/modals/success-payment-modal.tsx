"use client";

import { useState } from "react";

// Backend Context: Matches Transaction schema (TransactionID, FinalAmount, PaymentMethod)
interface SuccessPaymentModalProps {
  transactionId: string;  // Transaction.TransactionID
  amount: number;         // Transaction.FinalAmount
  route: string;          // Derived from Route.RouteName
  paymentMethod?: string; // Transaction.PaymentMethod enum (Defaults to Wallet for now)
  onClose: () => void;
}

export default function SuccessPaymentModal({ 
  transactionId, 
  amount, 
  route, 
  paymentMethod = "CHATCO Wallet", // Default fallback until GCash/Voucher is implemented
  onClose 
}: SuccessPaymentModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(transactionId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 pb-safe">
        
        {/* Success Icon Checkmark */}
        <div className="w-full bg-[#F0FDF4] py-8 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#22C55E] flex items-center justify-center shadow-lg shadow-green-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#166534]">Payment Successful!</h2>
          <p className="text-gray-600">Your fare has been deducted from your wallet.</p>
        </div>

        {/* Content - Increased bottom padding to pb-10 to prevent button cut-off on small screens */}
        <div className="px-6 pb-10">
          <div className="border-t border-dashed border-gray-200 my-4" />
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <button 
                onClick={handleCopyLink}
                className="text-[#1A5FB4] font-mono text-xs hover:underline"
              >
                {isCopied ? "Copied!" : transactionId}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Route</span>
              <span className="font-semibold text-[#071A2E]">{route}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Paid</span>
              {/* Fixed Typo: changed #071A2nE to #071A2E for dark text */}
              <span className="font-bold text-[#071A2E]">₱ {amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method</span>
              {/* Fixed Typo: added missing # for hex code and ensured dark text */}
              <span className="text-[#071A2E] font-semibold flex items-center gap-1">
                <svg className="w-4 h-4 text-[#1A5FB4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" /></svg>
                {paymentMethod}
              </span>
            </div>
          </div>

          {/* Action Button - Added mb-2 for extra breathing room from the absolute bottom edge */}
          <button 
            onClick={onClose}
            className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 mb-2"
          >
            Back to Map
          </button>
        </div>
      </div>
    </div>
  );
}