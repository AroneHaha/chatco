"use client";

import { useState, useEffect } from "react";

// --- BACKEND CONTEXT & TYPES ---
// Maps to: EmergencyAlert table (Adapted for Commuter instead of Conductor)
// Real-time flow: 
// 1. Frontend sends SOS ping via WebSocket/REST.
// 2. Frontend listens to WebSocket channel `commuter_sos_status_{commuterId}`.
// 3. When Admin clicks "Respond" on their web portal, backend emits status change.
// 4. Frontend receives event -> sets status to 'responded'.

interface SosModalProps {
  commuterId: string;
  commuterName: string;
  onClose: () => void;
}

export default function SosModal({ commuterId, commuterName, onClose }: SosModalProps) {
  const [status, setStatus] = useState<'confirming' | 'active' | 'responded'>('confirming');
  const [activeSeconds, setActiveSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let adminTimeout: NodeJS.Timeout;

    if (status === 'active') {
      // 1. Timer visual
      interval = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
        
        // --- FUTURE BACKEND INTEGRATION ---
        // const coords = await getCurrentPosition();
        // socket.emit('commuter_sos_ping', { commuterId, lat: coords.latitude, lng: coords.longitude });
      }, 1000);

      // 2. PROTOTYPE SIMULATION: Auto-resolve after 5 seconds
      adminTimeout = setTimeout(() => {
        setStatus('responded');
        // --- FUTURE BACKEND INTEGRATION ---
        // In real app, this state change is triggered by:
        // socket.on(`admin_responded_${commuterId}`, () => setStatus('responded'));
      }, 5000); 
    }

    return () => {
      clearInterval(interval);
      clearTimeout(adminTimeout);
    };
  }, [status, commuterId]);

  const handleActivate = () => {
    setStatus('active');
    // --- FUTURE BACKEND INTEGRATION ---
    // POST /api/commuter/emergency/sos
    // Body: { commuterId, initialLat, initialLng, timestamp }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop - Red when active, normal when confirming/responded. Cannot click to close when active! */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm transition-colors duration-500 ${
          status === 'active' ? 'bg-red-900/60' : 'bg-black/60'
        }`} 
        // Notice: No onClick={onClose} here when active, locking the screen
        onClick={status === 'confirming' ? onClose : undefined} 
      />
      
      {/* Modal Card */}
      <div className={`relative sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-slide-in-from-bottom duration-300 pb-safe border-2 transition-colors duration-300 ${
        status === 'active' ? 'bg-white border-red-500' : 'bg-white border-transparent'
      }`}>
        
        {status === 'confirming' && (
          /* --- CONFIRMATION STATE --- */
          <div className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 border-2 border-red-100">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-extrabold text-[#071A2E] mb-2">Send Emergency SOS?</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              This will immediately share your <span className="font-bold text-[#071A2E]">real-time live location</span> with the CHATCO Admin team. 
              <br/><br/>
              <span className="text-red-500 font-semibold">Only use this in actual emergencies.</span>
            </p>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleActivate} className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                Send SOS
              </button>
            </div>
          </div>
        )}

        {status === 'active' && (
          /* --- ACTIVE/TRACKING STATE (LOCKED SCREEN) --- */
          <div className="p-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
              <div className="absolute inset-4 rounded-full bg-red-500/30 animate-ping [animation-delay:0.5s]" />
              <div className="relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl shadow-red-600/50 z-10">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-red-600 mb-1">SOS IS ACTIVE</h2>
            <p className="text-sm text-gray-500 mb-4">Admin is tracking your live location</p>
            
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 font-mono text-2xl font-extrabold px-6 py-2 rounded-lg border border-red-200 mb-6">
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>
              {formatTimer(activeSeconds)}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed max-w-[250px] mx-auto">
              Please keep the app open. This screen will automatically update once the admin responds.
            </p>
          </div>
        )}

        {status === 'responded' && (
          /* --- RESPONDED STATE --- */
          <div className="p-6 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-5 border-2 border-green-100">
              <svg className="w-10 h-10 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-extrabold text-[#071A2E] mb-2">Signal Received</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8">
              The CHATCO Admin team has successfully received your distress signal. 
              <br /><br />
              <span className="font-semibold text-[#071A2E]">Respondents are being dispatched to your location. Please stay calm and keep your location services turned on.</span>
            </p>

            <button 
              onClick={onClose}
              className="w-full px-4 py-3.5 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 mb-2"
            >
              Understood
            </button>
          </div>
        )}
      </div>
    </div>
  );
}