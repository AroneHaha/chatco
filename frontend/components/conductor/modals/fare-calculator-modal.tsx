"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { saveTransaction } from "@/lib/conductor-transactions";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- ROUTE DATA ---
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

// --- FARE CONSTANTS ---
const BASE_FARE = 13.0;
const BASE_KM = 1;
const ADDITIONAL_RATE = 1.5;
const DISCOUNT_PERCENT = 0.20;
const MAX_CLICK_DISTANCE_METERS = 500;

// --- REVERSE GEOCODING ---
const geocodeCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey)!;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data.address || {};

    const name =
      addr.city || addr.town || addr.municipality || addr.village || addr.suburb || addr.barangay || data.display_name?.split(",")[0] || "Unknown Location";

    geocodeCache.set(cacheKey, name);
    return name;
  } catch {
    return "Unknown Location";
  }
}

// --- DISTANCE CALCULATOR ---
function calcDistanceKm(fromIndex: number, toIndex: number): number {
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  let totalMeters = 0;
  for (let i = start; i < end; i++) {
    totalMeters += L.latLng(ROUTE_COORDS[i]).distanceTo(L.latLng(ROUTE_COORDS[i + 1]));
  }
  return totalMeters / 1000;
}

// --- MAP CLICK HANDLER ---
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

// --- MAIN MODAL ---
interface FareCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  conductorName: string;
  unitNumber: string;
  driverName: string;
}

const AUTO_REDIRECT_SECONDS = 3;

export default function FareCalculatorModal({ isOpen, onClose, shiftId, conductorName, unitNumber, driverName }: FareCalculatorModalProps) {
  const [step, setStep] = useState<'scanning' | 'set-locations' | 'review' | 'success'>('scanning');
  const [passenger, setPassenger] = useState<{ name: string; id: string; role: string } | null>(null);

  // Map pins
  const [boardingPoint, setBoardingPoint] = useState<L.LatLng | null>(null);
  const [boardingIndex, setBoardingIndex] = useState<number>(0);
  const [dropoffPoint, setDropoffPoint] = useState<L.LatLng | null>(null);
  const [dropoffIndex, setDropoffIndex] = useState<number>(0);
  const [pinMode, setPinMode] = useState<"boarding" | "dropoff">("boarding");

  // Location names from reverse geocoding
  const [boardingName, setBoardingName] = useState<string>("");
  const [dropoffName, setDropoffName] = useState<string>("");
  const [, setIsGeocoding] = useState(false);

  const [receiptId, setReceiptId] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningActiveRef = useRef(false);
  const autoRedirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // FARE CALCULATION
  const distance = boardingPoint && dropoffPoint ? calcDistanceKm(boardingIndex, dropoffIndex) : 0;
  const succeedingKm = distance > BASE_KM ? distance - BASE_KM : 0;
  const succeedingFare = succeedingKm * ADDITIONAL_RATE;
  const grossFare = BASE_FARE + succeedingFare;
  const hasDiscount = passenger?.role !== "Regular";
  const discountAmount = hasDiscount ? grossFare * DISCOUNT_PERCENT : 0;
  const totalFare = grossFare - discountAmount;

  // Helper: clear auto-redirect timer
  const clearAutoRedirect = useCallback(() => {
    if (autoRedirectTimerRef.current) {
      clearTimeout(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
  }, []);

  // Helper: proceed to set-locations step
  const proceedToSetLocations = useCallback((passengerData: { name: string; id: string; role: string }) => {
    isScanningActiveRef.current = false;
    setScanSuccess(true);
    clearAutoRedirect();

    // Small delay for the success animation to show
    setTimeout(() => {
      setPassenger(passengerData);
      setStep('set-locations');
    }, 400);
  }, [clearAutoRedirect]);

  // QR SCANNER
  useEffect(() => {
    let scannerInstance: Html5Qrcode | null = null;

    if (isOpen && step === 'scanning') {
      setCameraError(false);
      setScanSuccess(false);
      isScanningActiveRef.current = false;

      scannerInstance = new Html5Qrcode("fare-scanner");
      scannerRef.current = scannerInstance;

      scannerInstance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.userId && data.name) {
              proceedToSetLocations({
                name: data.name,
                id: data.userId,
                role: data.role || "Regular",
              });
              scannerInstance?.stop().catch(() => {});
            }
          } catch (e) { console.log("Invalid QR"); }
        },
        () => {}
      ).then(() => {
        isScanningActiveRef.current = true;
      }).catch(err => {
        console.error("Camera error:", err);
        isScanningActiveRef.current = false;
        if (err.toString().includes("NotAllowedError")) {
          setCameraError(true);
        }
      });
    }

    return () => {
      try {
        if (scannerInstance && isScanningActiveRef.current) {
          scannerInstance.stop().then(() => {
            try { scannerInstance.clear(); } catch (e) {}
          }).catch(() => {
            try { scannerInstance.clear(); } catch (e) {}
          });
        } else if (scannerInstance) {
          try { scannerInstance.clear(); } catch (e) {}
        }
      } catch (e) {}
      scannerRef.current = null;
      isScanningActiveRef.current = false;
    };
  }, [isOpen, step, proceedToSetLocations]);

  // AUTO-REDIRECT: Always auto-redirect after AUTO_REDIRECT_SECONDS
  useEffect(() => {
    if (!isOpen || step !== 'scanning') return;

    autoRedirectTimerRef.current = setTimeout(() => {
      proceedToSetLocations({ name: "Juan Dela Cruz", id: "USR-TEST-999", role: "Student" });
    }, AUTO_REDIRECT_SECONDS * 1000);

    return () => {
      clearAutoRedirect();
    };
  }, [isOpen, step, clearAutoRedirect, proceedToSetLocations]);

  // MAP CLICK HANDLER
  const handleRouteClick = async (latlng: L.LatLng, index: number) => {
    if (pinMode === "boarding") {
      setBoardingPoint(latlng);
      setBoardingIndex(index);
      setPinMode("dropoff");
      setIsGeocoding(true);
      const name = await reverseGeocode(latlng.lat, latlng.lng);
      setBoardingName(name);
      setIsGeocoding(false);
    } else {
      setDropoffPoint(latlng);
      setDropoffIndex(index);
      setIsGeocoding(true);
      const name = await reverseGeocode(latlng.lat, latlng.lng);
      setDropoffName(name);
      setIsGeocoding(false);
    }
  };

  const handleConfirmPayment = () => {
    const txId = `TXN-${Date.now()}`;
    setReceiptId(txId);

    saveTransaction(shiftId, {
      paymentMethod: "Wallet_Scanned" as const,
      finalAmount: totalFare,
      passengerName: passenger?.name || "Unknown",
      passengerId: passenger?.id || "",
      passengerRole: passenger?.role || "Regular",
      from: boardingName || `Point ${boardingIndex}`,
      to: dropoffName || `Point ${dropoffIndex}`,
      distance,
      baseFare: BASE_FARE,
      succeedingKm: succeedingKm,
      discountAmount: discountAmount,
      conductorName: conductorName,
      unitNumber: unitNumber,
      driverName: driverName,
    });

    setStep('success');
  };

  const handleClose = () => {
    clearAutoRedirect();
    setStep('scanning');
    setPassenger(null);
    setBoardingPoint(null);
    setDropoffPoint(null);
    setBoardingIndex(0);
    setDropoffIndex(0);
    setPinMode("boarding");
    setBoardingName("");
    setDropoffName("");
    setCameraError(false);
    setScanSuccess(false);
    onClose();
  };

  // --- CUSTOM MARKER ICONS ---
  const boardingIcon = L.divIcon({
    className: "custom-boarding-icon",
    html: `<div style="background: #4ADE80; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">A</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  const dropoffIcon = L.divIcon({
    className: "custom-dropoff-icon",
    html: `<div style="background: #FF6D3A; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">B</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  // ==================== RENDER STEPS ====================

  // --- STEP 1: QR SCANNING (Centered Card with Auto-Redirect) ---
  const renderScanning = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050F1A]/95 backdrop-blur-sm">
      <div
        className={`w-full max-w-xs mx-4 bg-[#0B1D33] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          scanSuccess ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-20"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-[#62A0EA]/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">Scan Passenger QR</h2>
            <p className="text-white/40 text-xs mt-1">Align the passenger&apos;s QR code within the frame</p>
          </div>

          {/* Scanner Area - Square container with overlay */}
          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5">
            {cameraError ? (
              /* Camera denied placeholder */
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <svg className="w-10 h-10 text-white/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                <p className="text-white/30 text-xs">Camera not available</p>
              </div>
            ) : (
              <div
                id="fare-scanner"
                className="w-full h-full"
              />
            )}

            {/* Scanning overlay with corner brackets */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-3/5 h-3/5">
                {/* Top-left corner */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#62A0EA] rounded-tl-md" />
                {/* Top-right corner */}
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#62A0EA] rounded-tr-md" />
                {/* Bottom-left corner */}
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#62A0EA] rounded-bl-md" />
                {/* Bottom-right corner */}
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#62A0EA] rounded-br-md" />
                {/* Animated scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#62A0EA] to-transparent scan-line" />
              </div>
            </div>
          </div>

          {/* Scanning status */}
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] animate-pulse" />
            <span className="text-[#62A0EA] text-xs font-medium">
              {scanSuccess ? 'Scan successful!' : 'Scanning...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // --- STEP 2: SET LOCATIONS ON MAP ---
  const renderSetLocations = () => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050F1A]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-[#071A2E] border-b border-white/10 z-20">
        <div>
          <h2 className="text-white font-bold text-lg">
            {pinMode === "boarding" ? "Set Boarding Point" : "Set Drop-off Point"}
          </h2>
          <p className="text-white/40 text-[10px] mt-0.5">
            {pinMode === "boarding"
              ? "Tap on the route to pin where the passenger boarded"
              : "Tap on the route to pin where the passenger will alight"}
          </p>
        </div>
        <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative z-0">
        <MapContainer center={[14.81, 120.87]} zoom={12} zoomControl={false} attributionControl={false} className="w-full h-full" style={{ background: '#050F1A' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 8, opacity: 0.2, lineCap: 'round' }} />
          <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 4, opacity: 0.9, dashArray: '10 10', lineCap: 'round' }} />
          <MapClickHandler onRouteClick={handleRouteClick} />
          {boardingPoint && (
            <Marker position={boardingPoint} icon={boardingIcon}>
              <Popup>
                <div className="font-bold text-[#071A2E]">Boarding (A)</div>
                <div className="text-xs text-gray-500">{boardingName || "Loading name..."}</div>
              </Popup>
            </Marker>
          )}
          {dropoffPoint && (
            <Marker position={dropoffPoint} icon={dropoffIcon}>
              <Popup>
                <div className="font-bold text-[#071A2E]">Drop-off (B)</div>
                <div className="text-xs text-gray-500">{dropoffName || "Loading name..."}</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Floating Pin Mode Toggle */}
        {boardingPoint && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setPinMode(pinMode === "boarding" ? "dropoff" : "boarding")}
              className={`px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-colors ${
                pinMode === "boarding"
                  ? "bg-green-500 text-white shadow-green-500/30"
                  : "bg-[#FF6D3A] text-white shadow-[#FF6D3A]/30"
              }`}
            >
              {pinMode === "boarding" ? "Setting: Boarding" : "Setting: Drop-off"}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sheet - Fare Breakdown */}
      <div className="flex-shrink-0 bg-[#071A2E] border-t border-white/10 p-5 pb-6 shadow-2xl z-20">
        {/* Location Chips */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${boardingPoint ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/30"}`}>
            <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold">A</span>
            {boardingPoint ? (boardingName || "Loading...") : "Tap to set"}
          </div>
          <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${dropoffPoint ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-white/30"}`}>
            <span className="w-4 h-4 rounded-full bg-[#FF6D3A] text-white flex items-center justify-center text-[9px] font-bold">B</span>
            {dropoffPoint ? (dropoffName || "Loading...") : "Tap to set"}
          </div>
        </div>

        {/* Fare Preview */}
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-3">
          {boardingPoint && dropoffPoint ? "Fare Breakdown" : "Set both points to calculate"}
        </h3>

        {boardingPoint && dropoffPoint ? (
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Distance</span>
              <span className="font-semibold text-white">{distance.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Base Fare (first {BASE_KM}km)</span>
              <span className="font-semibold text-white">₱ {BASE_FARE.toFixed(2)}</span>
            </div>
            {succeedingKm > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Succeeding ({succeedingKm.toFixed(2)} km x ₱{ADDITIONAL_RATE})</span>
                <span className="font-semibold text-white">₱ {succeedingFare.toFixed(2)}</span>
              </div>
            )}
            {hasDiscount && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Discount (20%)</span>
                <span className="font-semibold text-emerald-400">- ₱ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-dashed border-white/10 my-2" />
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-white text-base">Total Fare</span>
              <span className="font-extrabold text-[#62A0EA] text-2xl">₱ {totalFare.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-white/20 text-xs text-center py-3">
            Tap on the route to set boarding and drop-off points
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (dropoffPoint) {
                setDropoffPoint(null);
                setDropoffIndex(0);
                setDropoffName("");
                setPinMode("dropoff");
              } else if (boardingPoint) {
                setBoardingPoint(null);
                setBoardingIndex(0);
                setBoardingName("");
                setPinMode("boarding");
              } else {
                handleClose();
              }
            }}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
          >
            {dropoffPoint ? "Reset Drop-off" : boardingPoint ? "Reset Boarding" : "Cancel"}
          </button>
          <button
            onClick={() => boardingPoint && dropoffPoint ? setStep('review') : null}
            disabled={!boardingPoint || !dropoffPoint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] disabled:bg-gray-700 disabled:text-gray-500 text-white hover:bg-[#165a9f] transition-colors shadow-lg"
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );

  // --- STEP 3: REVIEW ---
  const renderReview = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative backdrop-blur-md bg-gray-900/90 border border-white/20 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="p-2 space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Review Payment</h2>

            {/* Passenger Info */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-1">
              <p className="text-white font-semibold">{passenger?.name}</p>
              <div className="flex justify-between text-xs text-white/50">
                <span>ID: {passenger?.id}</span>
                <span className={`font-semibold px-2 py-0.5 rounded ${hasDiscount ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60'}`}>{passenger?.role}</span>
              </div>
            </div>

            {/* Route */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold">A</span>
                <span className="text-white font-medium">{boardingName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#FF6D3A] text-white flex items-center justify-center text-[9px] font-bold">B</span>
                <span className="text-white font-medium">{dropoffName}</span>
              </div>
            </div>

            {/* Fare Breakdown */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Distance</span><span className="text-white font-medium">{distance.toFixed(2)} km</span></div>
              <div className="border-t border-white/10 pt-2 flex justify-between"><span className="text-gray-400">First Kilometer</span><span className="text-white">₱ {BASE_FARE.toFixed(2)}</span></div>
              {succeedingKm > 0 && <div className="flex justify-between"><span className="text-gray-400">Succeeding ({succeedingKm.toFixed(2)} km x ₱{ADDITIONAL_RATE})</span><span className="text-white">₱ {succeedingFare.toFixed(2)}</span></div>}
              {hasDiscount && <div className="flex justify-between text-green-400"><span>Discount (Auto - 20%)</span><span>- ₱ {discountAmount.toFixed(2)}</span></div>}
              <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                <span className="text-white font-bold">Total</span>
                <span className="text-2xl font-extrabold text-[#62A0EA]">₱ {totalFare.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-center text-purple-400 text-xs font-medium">Payment method: Wallet (Scanned)</p>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep('set-locations')} className="py-3 rounded-xl text-sm font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-colors">Back</button>
              <button onClick={handleConfirmPayment} className="py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- STEP 4: SUCCESS / RECEIPT ---
  const renderSuccess = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative backdrop-blur-md bg-gray-900/90 border border-white/20 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="p-2 space-y-4 text-center">
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
                <p className="text-white/50 font-bold uppercase text-[10px] mt-1">Route &amp; Fare</p>
                <div className="flex justify-between"><span className="text-gray-400">From:</span><span className="text-white">{boardingName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">To:</span><span className="text-white">{dropoffName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Distance:</span><span className="text-white">{distance.toFixed(2)} km</span></div>
                <div className="flex justify-between"><span className="text-gray-400">First Km:</span><span className="text-white">₱{BASE_FARE.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Succeeding ({succeedingKm.toFixed(2)}km):</span><span className="text-white">₱{succeedingFare.toFixed(2)}</span></div>
                {hasDiscount && <div className="flex justify-between text-green-400"><span>Discount:</span><span>-₱{discountAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-base text-[#62A0EA] border-t border-white/10 pt-2"><span>Total Paid:</span><span>₱{totalFare.toFixed(2)}</span></div>
              </div>
              <div className="border-t border-dashed border-white/10 pt-2 space-y-1">
                <p className="text-white/50 font-bold uppercase text-[10px] mt-1">Unit Info</p>
                <div className="flex justify-between"><span className="text-gray-400">Conductor:</span><span className="text-white">{conductorName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Driver:</span><span className="text-white">{driverName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Unit No:</span><span className="text-white">{unitNumber}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Method:</span><span className="text-purple-400 font-medium">Wallet (Scanned)</span></div>
              </div>
            </div>
            <button onClick={handleClose} className="w-full py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#165a9f] transition-colors">Done</button>
          </div>
        </div>
      </div>
    </div>
  );

  // --- MAIN RENDER ---
  if (!isOpen) return null;

  return (
    <>
      {step === 'scanning' && renderScanning()}
      {step === 'set-locations' && renderSetLocations()}
      {step === 'review' && renderReview()}
      {step === 'success' && renderSuccess()}

      <style jsx global>{`
        .custom-boarding-icon { background: transparent !important; border: none !important; }
        .custom-dropoff-icon { background: transparent !important; border: none !important; }
        .leaflet-container { background: #050F1A !important; font-family: inherit !important; }
        .leaflet-popup-content-wrapper { background: #071A2E !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; padding: 0 !important; border: 1px solid rgba(255,255,255,0.1) !important;}
        .leaflet-popup-content { margin: 12px 16px !important; color: white !important; line-height: 1.4 !important; }
        .leaflet-popup-tip { background: #071A2E !important; }
        .leaflet-popup-close-button { color: white !important; }

        /* ─── QR Scanner: Mobile-friendly overrides ─── */
        #fare-scanner { width: 100% !important; height: 100% !important; overflow: hidden !important; }
        #fare-scanner video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #fare-scanner img[alt="Info icon"] { display: none !important; }
        #fare-scanner > div { width: 100% !important; height: 100% !important; }
        #fare-scanner .qr-shaded-region { border-width: 3px !important; }
        /* Hide the "Info" link that html5-qrcode injects */
        #fare-scanner a[href*="info"] { display: none !important; }

        /* ─── Scan Line Animation ─── */
        @keyframes scanLine {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .scan-line {
          animation: scanLine 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
