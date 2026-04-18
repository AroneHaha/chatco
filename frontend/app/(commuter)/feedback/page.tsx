"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Added for routing
import { useFeedback } from "./use-feedback";

export default function FeedbackPage() {
  const router = useRouter(); // Initialize router
  
  const {
    isScanning, driver, rating, hoverRating, setHoverRating, handleSetRating,
    activeTags, selectedTags, toggleTag, comment, setComment,
    isSubmitting, isSubmitted, resetForNewScan, submitFeedback
  } = useFeedback();

  const displayRating = hoverRating || rating;

  // --- COUNTDOWN & AUTO-CLOSE LOGIC ---
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Only run the timer if the feedback was successfully submitted
    if (!isSubmitted) return;

    // If countdown hits 0, go back to dashboard
    if (countdown === 0) {
      router.push("/dashboard");
      return;
    }

    // Decrease countdown every 1 second
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    // Cleanup timer if component unmounts or if they click "Scan another"
    return () => clearTimeout(timer);
  }, [isSubmitted, countdown, router]);

  const handleScanAnother = () => {
    setCountdown(3); // Reset countdown for next time
    resetForNewScan(); // Reset the hook states
  };

  // --- 1. SCANNING STATE ---
  if (isScanning) {
    return (
      <div className="h-full w-full bg-[#050F1A] flex flex-col items-center justify-center p-6">
        <div className="relative w-64 h-64 border-2 border-white/30 rounded-2xl overflow-hidden shadow-2xl mb-8">
          <div className="absolute left-0 right-0 h-0.5 bg-[#62A0EA] shadow-[0_0_10px_#62A0EA] animate-scan-line z-10" />
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#62A0EA] rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#62A0EA] rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#62A0EA] rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#62A0EA] rounded-br-xl" />
          <div className="absolute inset-0 bg-[#071A2E]/50 flex items-center justify-center">
            <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75Z" /></svg>
          </div>
        </div>

        <p className="text-white font-bold text-lg animate-pulse">Scanning Unit QR...</p>
        <p className="text-white/40 text-sm mt-1">Align the QR code inside the frame</p>

        <style jsx global>{`
          @keyframes scan-line {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          .animate-scan-line {
            animation: scan-line 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // --- 2. SUCCESS STATE ---
  if (isSubmitted) {
    return (
      <div className="h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8 flex items-center justify-center">
        <div className="max-w-sm w-full bg-[#071A2E] border border-emerald-500/30 rounded-2xl p-8 flex flex-col items-center text-center space-y-5 animate-fade-in mx-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-white font-bold text-xl">Thank You!</h3>
          <p className="text-white/50 text-sm max-w-xs">Your feedback has been recorded and will help us improve our service.</p>
          
          {/* Circular Countdown Timer */}
          <div className="relative w-24 h-24 flex items-center justify-center mt-2">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              {/* Animated Depleting Ring */}
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke="#62A0EA" 
                strokeWidth="6" 
                strokeLinecap="round"
                strokeDasharray="251.3" // 2 * π * 40
                className="countdown-ring"
              />
            </svg>
            {/* Number in the center */}
            <span className="text-3xl font-extrabold text-white">{countdown}</span>
          </div>
          
          <p className="text-white/30 text-xs font-medium">Returning to Home...</p>

          <button onClick={handleScanAnother} className="mt-2 text-sm font-semibold text-[#62A0EA] hover:text-white transition-colors">
            Scan another unit
          </button>
        </div>

        {/* CSS for the circular depletion animation */}
        <style jsx global>{`
          @keyframes circle-deplete {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 251.3; }
          }
          .countdown-ring {
            animation: circle-deplete 3s linear forwards;
          }
        `}</style>
      </div>
    );
  }

  // --- 3. FEEDBACK FORM STATE ---
  // (This part remains exactly the same as your current working code)
  return (
    <div className="h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8">
      <div className="max-w-2xl mx-auto p-6 lg:p-8 space-y-6">
        
        <div>
          <h1 className="text-white font-bold text-2xl">Driver Feedback</h1>
          <p className="text-white/40 text-sm mt-1">Help us improve our service. Your reviews are anonymous to drivers.</p>
        </div>

        {/* Driver Card */}
        {driver && (
          <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-5 shadow-lg animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-xl flex-shrink-0 border-2 border-white/10">
                {driver.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg truncate">{driver.name}</h3>
                <p className="text-white/40 text-xs mt-0.5">Driver • Plate: {driver.plateNumber}</p>
                <p className="text-[#62A0EA] text-xs font-medium mt-0.5">Route: {driver.route}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          
          {/* Star Rating */}
          <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-6 flex flex-col items-center">
            <h3 className="text-white/70 text-sm font-semibold mb-4">How was your ride?</h3>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleSetRating(star)}
                  className="transition-transform duration-150 hover:scale-110 focus:outline-none"
                >
                  <svg className={`w-10 h-10 transition-colors duration-150 ${star <= displayRating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" : "text-white/10"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                  </svg>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-white/40 text-xs mt-3 font-medium animate-pulse">
                {rating === 1 && "Terrible"}
                {rating === 2 && "Poor"}
                {rating === 3 && "Average"}
                {rating === 4 && "Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Dynamic Tags */}
          {rating > 0 && (
            <div className="animate-fade-in">
              <h3 className="text-white/70 text-sm font-semibold mb-3">
                {rating >= 4 ? "What went well?" : "What could be improved?"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const isPositive = rating >= 4;
                  
                  return (
                    <button 
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                        isSelected 
                          ? (isPositive ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10")
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment Box */}
          {rating > 0 && selectedTags.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-white/70 text-sm font-semibold">Additional Comments (Optional)</h3>
              <textarea 
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="w-full bg-[#071A2E] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors resize-none"
              />
            </div>
          )}

          {/* Submit Button */}
          {rating > 0 && (
            <button 
              onClick={submitFeedback}
              disabled={isSubmitting || selectedTags.length === 0}
              className="w-full py-4 rounded-xl text-base font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : "Submit Feedback"}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}