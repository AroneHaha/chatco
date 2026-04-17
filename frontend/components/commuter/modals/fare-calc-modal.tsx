"use client";

import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import SuccessPaymentModal from "./success-payment-modal";

// --- 1. CONSTANTS & ROUTE DATA ---
const ROUTE_COORDS: L.LatLngTuple[] = [
  [14.925460996033356, 120.76512235423647], [14.92420402124189, 120.76528787872712],
  [14.920152600670095, 120.76571706129354], [14.915220582966443, 120.76619717003261],
  [14.901323759501945, 120.7719224852731], [14.886458903875173, 120.78596796657541],
  [14.874990764897628, 120.79618423260841], [14.87207763773181, 120.79878589058617],
  [14.865745283697539, 120.80435407290116], [14.860501402001871, 120.80901802051571],
  [14.85778433148678, 120.81163478600241], [14.855388331987022, 120.81368996254061],
  [14.852693386081329, 120.81600207219617], [14.851497406805521, 120.81765988586791],
  [14.849417900874624, 120.8235248577769], [14.845945790029823, 120.83422329239757],
  [14.844320234352493, 120.83905948176812], [14.842383282603786, 120.84506982184078],
  [14.841893283760905, 120.84698408093634], [14.840375174197046, 120.85413496987503],
  [14.839623777400517, 120.85750998638694], [14.838634008132473, 120.86201040680506],
  [14.8371385749864, 120.86297382674883], [14.83612807323988, 120.86333412418747],
  [14.835254069547146, 120.86366551171416], [14.833295288398967, 120.8661891975047],
  [14.8324975199314, 120.86740282879738], [14.831810284552892, 120.86868877790535],
  [14.83035944532852, 120.87094580599025], [14.828506904517909, 120.87400904071411],
  [14.828161518510791, 120.87659402671414], [14.828232464378223, 120.88095495481001],
  [14.828293590064265, 120.88426507598852], [14.828333307002257, 120.886565917288],
  [14.827864597760719, 120.89053477186802], [14.827464358080183, 120.89241460779954],
  [14.826703652032982, 120.89503763480697], [14.826129391774803, 120.89676317509107],
  [14.824720294651351, 120.89902058487867], [14.822990488146456, 120.90083394930517],
  [14.820845909007058, 120.90316146076532], [14.819825636767673, 120.90421208848784],
  [14.818163498638592, 120.90600984388941], [14.81713926187142, 120.90792339416925],
  [14.817003259236085, 120.90825980129833], [14.815860883789151, 120.90986972578348],
  [14.815234108397684, 120.91047524129526], [14.81440037604567, 120.91144161960287],
  [14.813099510668458, 120.91283614016609], [14.811588723108294, 120.91413585780512],
  [14.809543338082284, 120.9159455873501], [14.806525108118892, 120.91850689602882],
  [14.801946360221512, 120.92201682737273], [14.800215165075755, 120.9231979150914],
  [14.798804712598924, 120.92456195413324], [14.798451222604799, 120.92693781063585],
  [14.797677687963592, 120.92897276863408], [14.79630282892156, 120.92974647714638],
  [14.794082971006238, 120.9309174591896], [14.792193992873402, 120.9319309517239],
  [14.789984757130886, 120.93194351724061], [14.786542900321203, 120.93179853039794],
  [14.782758056853037, 120.93416554556896], [14.78116722012781, 120.93525425025881],
  [14.778139275650638, 120.93709526206992], [14.773104742636574, 120.93960422042926],
  [14.766525006702839, 120.94320546363049], [14.765525492192376, 120.94401383576125],
  [14.76072862621141, 120.94974045073359], [14.757057921030993, 120.95282600874056],
  [14.754092913022339, 120.95430633290394], [14.749614776242218, 120.95648776807238],
  [14.743004859115217, 120.95912082860627], [14.738243986091819, 120.96064278809952],
  [14.73118850798765, 120.96137476925526], [14.729202256905156, 120.96135109408412],
  [14.725646764905104, 120.9604838112117]
];

const BASE_FARE = 18.00;
const BASE_DISTANCE_KM = 4.0;
const SUCCEEDING_RATE_PER_KM = 2.00;
const DISCOUNT_PERCENTAGE = 0.20; 
const MAX_CLICK_DISTANCE_METERS = 500; 

// --- 2. MOCK API FUNCTION (BACKEND PROOFING) ---
interface PaymentResponse {
  success: boolean;
  finalFare: number;
  transactionId: string;
  unitId: string;
  message?: string;
}

// ADDED unitId parameter. In the real world, the backend uses this to assign the fare to the correct driver.
const processPaymentApi = async (routeIndex: number, commuterType: string, unitId: string): Promise<PaymentResponse> => {
  await new Promise(resolve => setTimeout(resolve, 800));

  // --- START: LOGIC THAT WILL BE REPLACED BY BACKEND API ---
  let distanceInKm = BASE_DISTANCE_KM;
  if (routeIndex > 0) {
    let totalMeters = 0;
    for (let i = 0; i < routeIndex; i++) {
      totalMeters += L.latLng(ROUTE_COORDS[i]).distanceTo(L.latLng(ROUTE_COORDS[i + 1]));
    }
    distanceInKm = totalMeters / 1000;
  }

  let baseFare = BASE_FARE;
  if (distanceInKm > BASE_DISTANCE_KM) {
    baseFare += (distanceInKm - BASE_DISTANCE_KM) * SUCCEEDING_RATE_PER_KM;
  }

  const hasDiscount = commuterType === "STUDENT" || commuterType === "SENIOR_CITIZEN" || commuterType === "PWD";
  const discountAmount = hasDiscount ? baseFare * DISCOUNT_PERCENTAGE : 0;
  const finalFare = baseFare - discountAmount;
  // --- END: LOGIC THAT WILL BE REPLACED BY BACKEND API ---

  return {
    success: true,
    finalFare: finalFare,
    transactionId: `TXN-${Date.now()}`,
    unitId: unitId // Return it to show on success
  };
};


// --- 3. CUSTOM MAP CLICK HANDLER ---
function MapClickHandler({ onRouteClick }: { onRouteClick: (latlng: L.LatLng, index: number) => void }) {
  useMapEvents({
    async click(e) {
      const clickPoint = e.latlng;
      try {
        const GeoUtil = await import("leaflet-geometryutil");
        const routePolyline = L.polyline(ROUTE_COORDS);
        const rawClosestPoint = GeoUtil.closest(e.target, routePolyline, clickPoint, true);

        if (rawClosestPoint) {
          const closestPoint = L.latLng(rawClosestPoint.lat, rawClosestPoint.lng);
          const distanceToRoute = clickPoint.distanceTo(closestPoint);
          
          if (distanceToRoute > MAX_CLICK_DISTANCE_METERS) return;

          let closestIndex = 0;
          let minDist = Infinity;
          for (let i = 0; i < ROUTE_COORDS.length; i++) {
            const dist = closestPoint.distanceTo(L.latLng(ROUTE_COORDS[i]));
            if (dist < minDist) {
              minDist = dist;
              closestIndex = i;
            }
          }
          onRouteClick(closestPoint, closestIndex);
        }
      } catch (error) {
        console.error("Failed to load geometry util or calculate distance", error);
      }
    },
  });
  return null;
}

// --- 4. MAIN MODAL COMPONENT ---
export default function FareCalcModal({ onClose }: { onClose: () => void }) {
  const [destination, setDestination] = useState<L.LatLng | null>(null);
  const [destRouteIndex, setDestRouteIndex] = useState<number>(0);
  
  const [showScanner, setShowScanner] = useState(false); // New state for Scanner
  const [isProcessing, setIsProcessing] = useState(false); 
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [validatedPayment, setValidatedPayment] = useState<PaymentResponse | null>(null);

  const commuterType = "STUDENT"; 
  const hasDiscount = commuterType === "STUDENT" || commuterType === "SENIOR_CITIZEN" || commuterType === "PWD";

  const localEstimation = useMemo(() => {
    let distanceInKm = BASE_DISTANCE_KM;
    if (destination && destRouteIndex > 0) {
      let totalMeters = 0;
      for (let i = 0; i < destRouteIndex; i++) {
        totalMeters += L.latLng(ROUTE_COORDS[i]).distanceTo(L.latLng(ROUTE_COORDS[i + 1]));
      }
      distanceInKm = totalMeters / 1000;
    }

    let baseFare = BASE_FARE;
    if (distanceInKm > BASE_DISTANCE_KM) {
      baseFare += (distanceInKm - BASE_DISTANCE_KM) * SUCCEEDING_RATE_PER_KM;
    }
    const discountAmount = hasDiscount ? baseFare * DISCOUNT_PERCENTAGE : 0;
    const finalFare = baseFare - discountAmount;

    return { distanceInKm, baseFare, discountAmount, finalFare };
  }, [destination, destRouteIndex, hasDiscount]);

  const handleMapClick = (latlng: L.LatLng, index: number) => {
    setDestination(latlng);
    setDestRouteIndex(index);
  };

  // Handles the actual payment processing after scan
  const handleProcessPayment = async (scannedUnitId: string) => {
    setIsProcessing(true);
    try {
      const response = await processPaymentApi(destRouteIndex, commuterType, scannedUnitId);
      if (response.success) {
        setValidatedPayment(response);
        setShowScanner(false);
        setShowSuccess(true);
      } else {
        alert(response.message || "Payment failed. Please try again.");
        setShowScanner(false);
      }
    } catch (error) {
      alert("Network error. Please try again.");
      setShowScanner(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock Scanner Logic: Simulates finding a QR code after 3 seconds
  useEffect(() => {
    if (!showScanner) return;

    const mockScannedUnitId = "UNIT-042"; // This would come from the real QR scanner library

    const timer = setTimeout(() => {
      handleProcessPayment(mockScannedUnitId);
    }, 3000);

    return () => clearTimeout(timer); // Cleanup if modal closes before 3s
  }, [showScanner]);


  const destinationIcon = L.divIcon({
    className: "custom-dest-icon",
    html: `<div style="background: #FF6D3A; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">B</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <>
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#050F1A]">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-[#071A2E] border-b border-white/10 z-20">
          <div>
            <h2 className="text-white font-bold text-lg">Set Destination</h2>
            <p className="text-white/40 text-[10px] mt-0.5">Tap on the route to pin your drop-off</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative z-0">
          <MapContainer center={[14.81, 120.87]} zoom={12} zoomControl={false} attributionControl={false} className="w-full h-full" style={{ background: '#050F1A' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 8, opacity: 0.2, lineCap: 'round' }} />
            <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 4, opacity: 0.9, dashArray: '10 10', lineCap: 'round' }} />
            <MapClickHandler onRouteClick={handleMapClick} />
            {destination && (
              <Marker position={destination} icon={destinationIcon}>
                <Popup>
                  <div className="font-bold text-[#071A2E]">Drop-off Point</div>
                  <div className="text-xs text-gray-500">{localEstimation.distanceInKm.toFixed(2)} km from start</div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Breakdown Sheet */}
        <div className="flex-shrink-0 bg-[#071A2E] border-t border-white/10 p-5 pb-6 shadow-2xl z-20">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3">
            {destination ? "Estimated Breakdown" : "Minimum Fare (Base)"}
          </h3>
          
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Distance</span>
              <span className="font-semibold text-white">{localEstimation.distanceInKm.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Base Fare (first {BASE_DISTANCE_KM}km)</span>
              <span className="font-semibold text-white">₱ {BASE_FARE.toFixed(2)}</span>
            </div>
            {localEstimation.distanceInKm > BASE_DISTANCE_KM && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Succeeding ({(localEstimation.distanceInKm - BASE_DISTANCE_KM).toFixed(2)} km x ₱{SUCCEEDING_RATE_PER_KM})</span>
                <span className="font-semibold text-white">₱ {((localEstimation.distanceInKm - BASE_DISTANCE_KM) * SUCCEEDING_RATE_PER_KM).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-dashed border-white/10 my-2" />
            
            {hasDiscount && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Discount ({(DISCOUNT_PERCENTAGE * 100)}% - {commuterType})</span>
                <span className="font-semibold text-emerald-400">- ₱ {localEstimation.discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-white text-base">Total Fare</span>
              <div className="text-right">
                {hasDiscount && <p className="text-white/30 text-xs line-through">₱{localEstimation.baseFare.toFixed(2)}</p>}
                <span className="font-extrabold text-[#62A0EA] text-2xl">₱ {localEstimation.finalFare.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={destination ? () => { setDestination(null); setDestRouteIndex(0); } : onClose} 
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
            >
              {destination ? "Reset Pin" : "Cancel"}
            </button>
            <button 
              onClick={() => setShowScanner(true)} // Opens the scanner UI
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" /></svg>
              Scan to Pay
            </button>
          </div>
        </div>
      </div>

      {/* --- QR SCANNER MODAL --- */}
      {showScanner && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
          
          {/* Fake Camera Viewfinder UI */}
          <div className="relative w-64 h-64 border-2 border-white/30 rounded-2xl overflow-hidden shadow-2xl">
            {/* Scanning Laser Line Animation */}
            <div className="absolute left-0 right-0 h-0.5 bg-[#62A0EA] shadow-[0_0_10px_#62A0EA] animate-scan-line z-10" />
            
            {/* Corner Cutouts */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#62A0EA] rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#62A0EA] rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#62A0EA] rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#62A0EA] rounded-br-xl" />
            
            {/* Background Mock */}
            <div className="absolute inset-0 bg-[#071A2E]/50 flex items-center justify-center">
              <svg className="w-16 h-16 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" /></svg>
            </div>
          </div>

          <p className="text-white font-bold text-lg mt-6">
            {isProcessing ? "Processing Payment..." : "Scanning Unit QR..."}
          </p>
          <p className="text-white/40 text-sm mt-1">
            Align the QR code inside the frame
          </p>

          <button 
            onClick={() => { setShowScanner(false); setIsProcessing(false); }} 
            className="mt-8 px-6 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
          >
            Cancel Scan
          </button>
        </div>
      )}

      {/* --- SUCCESS MODAL OVERLAY --- */}
      {showSuccess && validatedPayment && (
        <SuccessPaymentModal 
          transactionId={validatedPayment.transactionId}
          amount={validatedPayment.finalFare}
          route={`Start to Drop-off`}
          onClose={() => {
            setShowSuccess(false);
            onClose(); 
          }}
        />
      )}

      <style jsx global>{`
        .custom-dest-icon { background: transparent !important; border: none !important; }
        .leaflet-container { background: #050F1A !important; font-family: inherit !important; }
        .leaflet-popup-content-wrapper { background: #071A2E !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; padding: 0 !important; border: 1px solid rgba(255,255,255,0.1) !important;}
        .leaflet-popup-content { margin: 12px 16px !important; color: white !important; line-height: 1.4 !important; }
        .leaflet-popup-tip { background: #071A2E !important; }
        .leaflet-popup-close-button { color: white !important; }
        
        @keyframes scan-line {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}