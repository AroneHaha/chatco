"use client";

import { useState, useEffect } from "react";

// --- BACKEND CONTEXT & TYPES ---
interface TopUpModalProps {
  currentBalance: number;
  onClose: () => void;
}

interface TopUpSuccessModalProps {
  amountAdded: number;
  newBalance: number;
  referenceId: string;
  onClose: () => void;
}

// --- SUCCESS MODAL COMPONENT ---
function TopUpSuccessModal({ amountAdded, newBalance, referenceId, onClose }: TopUpSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 pb-safe">
        <div className="w-full bg-[#F0FDF4] py-8 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#22C55E] flex items-center justify-center shadow-lg shadow-green-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#166534]">Wallet Top Up Successful!</h2>
          <p className="text-gray-600 text-sm">Your CHATCO Wallet has been credited.</p>
        </div>
        <div className="px-6 pb-10">
          <div className="border-t border-dashed border-gray-200 my-4" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Reference ID</span>
              <span className="text-[#1A5FB4] font-mono text-xs">{referenceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount Added</span>
              <span className="font-bold text-[#166534]">+ ₱ {amountAdded.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method</span>
              <span className="text-[#071A2E] font-semibold flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-[#0066FF] flex items-center justify-center"><span className="text-white text-[8px] font-bold">G</span></div>
                GCash
              </span>
            </div>
            <div className="border-t border-dashed border-gray-200 my-2" />
            <div className="flex justify-between text-base">
              <span className="font-bold text-[#071A2E]">New Balance</span>
              <span className="font-extrabold text-[#1A5FB4] text-xl">₱ {newBalance.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-full mt-6 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 mb-2">
            Back to Map
          </button>
        </div>
      </div>
    </div>
  );
}

// --- GCASH SIMULATOR FLOW COMPONENT ---
function GcashSimulator({ amount, onSimulationSuccess, onCancel }: { amount: number; onSimulationSuccess: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<'mpin' | 'otp' | 'processing'>('mpin');
  const [mpin, setMpin] = useState("");
  const [otp, setOtp] = useState("");
  const dummyPhone = "0917-***-4567"; // Mocked masked phone number

  // Auto-advance when 6 digits are typed
  useEffect(() => {
    if (mpin.length === 6 && step === 'mpin') {
      const timer = setTimeout(() => setStep('otp'), 500);
      return () => clearTimeout(timer);
    }
    if (otp.length === 6 && step === 'otp') {
      const timer = setTimeout(() => {
        setStep('processing');
        // Simulate backend verification
        setTimeout(() => onSimulationSuccess(), 1500);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mpin, otp, step, onSimulationSuccess]);

  const pinInputStyle = "w-full text-center text-3xl font-bold tracking-[0.5em] bg-transparent border-b-2 border-gray-300 focus:border-[#0066FF] outline-none py-4 text-[#071A2E] transition-colors";

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden animate-slide-in-from-bottom duration-300 pb-safe">
        
        {/* GCash Header */}
        <div className="bg-[#0066FF] p-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-black">G</div>
          <div>
            <h3 className="font-bold">GCash Payment</h3>
            <p className="text-xs text-white/80">Sandbox Environment</p>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* Step 1: MPIN */}
          {step === 'mpin' && (
            <div className="w-full animate-in fade-in duration-200">
              <div className="text-center mb-8">
                <p className="text-sm text-gray-500 mb-2">Amount to Pay</p>
                <h2 className="text-4xl font-extrabold text-[#071A2E]">₱ {amount.toFixed(2)}</h2>
              </div>
              
              <label className="block text-sm font-semibold text-[#071A2E] mb-2 text-center">Enter your 6-digit MPIN</label>
              <input 
                type="password" 
                maxLength={6}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))} // Numbers only
                className={pinInputStyle}
                autoFocus
              />
              <p className="text-[10px] text-gray-400 text-center mt-3">Type any 6 digits to simulate</p>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div className="w-full animate-in fade-in duration-200">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#F0F7FF] flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#0066FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                </div>
                <p className="text-sm text-gray-500">Enter the OTP sent to</p>
                <p className="font-bold text-[#071A2E]">{dummyPhone}</p>
              </div>
              
              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numbers only
                className={`${pinInputStyle} -webkit-text-security-disc`}
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                autoFocus
              />
              <p className="text-[10px] text-gray-400 text-center mt-3">Type any 6 digits to simulate</p>
              
              <button className="w-full mt-6 text-[#0066FF] text-sm font-semibold hover:underline">
                Resend Code via SMS
              </button>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="w-full py-10 flex flex-col items-center animate-in fade-in duration-200">
              <svg className="animate-spin h-12 w-12 text-[#0066FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 font-semibold text-[#071A2E]">Processing Payment...</p>
              <p className="text-xs text-gray-400 mt-1">Please do not close this window</p>
            </div>
          )}

          {/* Cancel Button (Hidden during processing) */}
          {step !== 'processing' && (
            <button 
              onClick={onCancel}
              className="w-full mt-8 py-3 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel Transaction
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MAIN TOP UP MODAL COMPONENT ---
export default function TopUpModal({ currentBalance, onClose }: TopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [showGcashSimulator, setShowGcashSimulator] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [topUpResult, setTopUpResult] = useState<{ amountAdded: number; newBalance: number; referenceId: string } | null>(null);

  const quickAmounts = [50, 100, 200, 500];
  const numericAmount = parseFloat(amount) || 0;
  const isValid = numericAmount >= 50;

  const handleQuickSelect = (val: number) => setAmount(val.toString());

  const handleProceedToGcash = () => {
    if (!isValid) return;
    setShowGcashSimulator(true);
  };

  const handleSimulationSuccess = () => {
    setShowGcashSimulator(false);
    const newBal = currentBalance + numericAmount;
    setTopUpResult({
      amountAdded: numericAmount,
      newBalance: newBal,
      referenceId: `PM-${Date.now()}`
    });
    setShowSuccess(true);
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-2xl font-bold text-[#071A2E] focus:outline-none focus:ring-2 focus:ring-[#1A5FB4]/20 focus:border-[#1A5FB4] transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:text-base";

  return (
    <>
      {/* --- MODAL 1: TOP UP MENU --- */}
      {!showGcashSimulator && !showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-in-from-bottom duration-300 pb-safe">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#071A2E]">Top Up Wallet</h2>
                <p className="text-xs text-gray-500 mt-0.5">Powered by GCash (Sandbox)</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-[#F0F7FF] rounded-xl p-4 border border-[#DAEEFF] flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Current Balance</p>
                <span className="text-xl font-extrabold text-[#071A2E]">₱ {currentBalance.toLocaleString()}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Enter Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">₱</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="50" className={`${inputClasses} pl-10`} />
                </div>
                {amount && !isValid && (
                  <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                    Minimum top up amount is ₱50.00
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((val) => (
                    <button key={val} onClick={() => handleQuickSelect(val)} className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${parseFloat(amount) === val ? "bg-[#1A5FB4] text-white border-[#1A5FB4] shadow-sm" : "bg-[#F8FAFC] text-[#071A2E] border-gray-200 hover:border-[#1A5FB4]/50 hover:bg-[#F0F7FF]"}`}>
                      ₱{val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#F8FAFC] p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-[#0066FF] flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg font-black">G</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#071A2E]">GCash</p>
                  <p className="text-[10px] text-gray-500">You will be asked to enter MPIN & OTP</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </div>
              <button onClick={handleProceedToGcash} disabled={!isValid} className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 disabled:opacity-50 disabled:cursor-not-allowed mb-2">
                Proceed to GCash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GCASH MPIN & OTP SIMULATOR --- */}
      {showGcashSimulator && (
        <GcashSimulator 
          amount={numericAmount} 
          onSimulationSuccess={handleSimulationSuccess} 
          onCancel={() => setShowGcashSimulator(false)} 
        />
      )}

      {/* --- MODAL 3: FINAL SUCCESS --- */}
      {showSuccess && topUpResult && (
        <TopUpSuccessModal 
          amountAdded={topUpResult.amountAdded}
          newBalance={topUpResult.newBalance}
          referenceId={topUpResult.referenceId}
          onClose={() => {
            setShowSuccess(false);
            onClose();
          }}
        />
      )}
    </>
  );
}