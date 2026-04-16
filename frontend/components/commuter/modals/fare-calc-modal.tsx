"use client";

import { useState, useMemo } from "react";
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
// When backend is ready, you replace the logic inside this function with a fetch() call.
// The input/output contract remains exactly the same.
interface PaymentResponse {
  success: boolean;
  finalFare: number;
  transactionId: string;
  message?: string;
}

const processPaymentApi = async (routeIndex: number, commuterType: string): Promise<PaymentResponse> => {
  // Simulate network delay
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
    transactionId: `TXN-${Date.now()}`
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
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Added for API loading state
  const [showSuccess, setShowSuccess] = useState(false);
  
  // State to hold the final backend-validated fare
  const [validatedPayment, setValidatedPayment] = useState<PaymentResponse | null>(null);

  const commuterType = "STUDENT"; 
  const hasDiscount = commuterType === "STUDENT" || commuterType === "SENIOR_CITIZEN" || commuterType === "PWD";

  // LOCAL ESTIMATION: For instant UI updates when clicking the map
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

  // NEW: Handles the actual payment processing
  const handleConfirmPay = async () => {
    setIsProcessing(true);
    try {
      // Send RAW data (routeIndex) to the mock API, not the calculated price
      const response = await processPaymentApi(destRouteIndex, commuterType);
      if (response.success) {
        setValidatedPayment(response);
        setShowConfirmation(false);
        setShowSuccess(true);
      } else {
        alert(response.message || "Payment failed. Please try again.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

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

        {/* Breakdown Sheet (Uses Local Estimation for instant UI) */}
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
              onClick={() => setShowConfirmation(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30"
            >
              Pay ₱{localEstimation.finalFare.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#071A2E] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            <div className="p-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              </div>
            </div>
            
            <div className="px-6 pb-4 text-center">
              <h2 className="text-white font-bold text-xl mb-2">Confirm Payment</h2>
              <p className="text-white/50 text-sm">Are you sure about your destination and want to proceed with this fare?</p>
              <div className="mt-4 bg-[#050F1A] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase font-semibold">Total Amount</p>
                {/* Still shows local estimation here for context, but backend validates the real charge */}
                <p className="text-3xl font-extrabold text-[#62A0EA] mt-1">₱ {localEstimation.finalFare.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <button 
                onClick={() => setShowConfirmation(false)}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmPay}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS MODAL OVERLAY (Now uses Backend Validated Data) --- */}
      {showSuccess && validatedPayment && (
        <SuccessPaymentModal 
          transactionId={validatedPayment.transactionId}
          amount={validatedPayment.finalFare} // Uses the server's calculated fare, not the local one
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
      `}</style>
    </>
  );
}