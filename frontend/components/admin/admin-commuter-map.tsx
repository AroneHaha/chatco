// components/admin/admin-commuter-map.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { User, Hand } from "lucide-react";
import "leaflet/dist/leaflet.css";

const ROUTE_COORDS: [number, number][] = [
  [14.925460996033356, 120.76512235423647], [14.92420402124189, 120.76528787872712],
  [14.920152600670095, 120.76571706129354], [14.915220582966443, 120.76619717003261],
  [14.901323759501945, 120.7719224852731], [14.886458903875173, 120.78596796657541],
  [14.874990764897628, 120.79618423260841], [14.87207763773181, 120.79878589058617],
  [14.865745283697539, 120.80435407290116], [14.860501402001871, 120.80901802051571],
  [14.85778433148678, 120.81163478600241], [14.855388331987022, 120.81368996254061],
  [14.852693386081329, 120.81600207219617], [14.851497406805521, 120.81765988586791],
  [14.849417900874624, 120.8235248577769], [14.845945790029823, 120.83422329239757],
  [14.844320234352493, 120.83905948176812], [14.842383282603786, 120.84506982184078], [14.841893283760905, 120.84698408093634], [14.840375174197046, 120.85413496987503], [14.839623777400517, 120.85750998638694], [14.838634008132473, 120.86201040680506], [14.8371385749864, 120.86297382674883], [14.83612807323988, 120.86333412418747], [14.835254069547146, 120.86366551171416], [14.833295288398967, 120.8661891975047], [14.8324975199314, 120.86740282879738], [14.831810284552892, 120.86868877790535], [14.83035944532852, 120.87094580599025], [14.828506904517909, 120.87400904071411], [14.828161518510791, 120.87659402671414], [14.828232464378223, 120.88095495481001], [14.828293590064265, 120.88426507598852], [14.828333307002257, 120.886565917288], [14.827864597760719, 120.89053477186802], [14.827464358080183, 120.89241460779954], [14.826703652032982, 120.89503763480697], [14.826129391774803, 120.89676317509107], [14.824720294651351, 120.89902058487867], [14.822990488146456, 120.90083394930517], [14.820845909007058, 120.90316146076532], [14.819825636767673, 120.90421208848784], [14.818163498638592, 120.90600984388941], [14.81713926187142, 120.90792339416925], [14.817003259236085, 120.90825980129833], [14.815860883789151, 120.90986972578348], [14.815234108397684, 120.91047524129526], [14.81440037604567, 120.91144161960287], [14.813099510668458, 120.91283614016609], [14.811588723108294, 120.91413585780512], [14.809543338082284, 120.9159455873501], [14.806525108118892, 120.91850689602882], [14.801946360221512, 120.92201682737273], [14.800215165075755, 120.9231979150914], [14.798804712598924, 120.92456195413324], [14.798451222604799, 120.92693781063585], [14.797677687963592, 120.92897276863408], [14.79630282892156, 120.92974647714638], [14.794082971006238, 120.9309174591896], [14.792193992873402, 120.9319309517239], [14.789984757130886, 120.93194351724061], [14.786542900321203, 120.93179853039794], [14.782758056853037, 120.93416554556896], [14.78116722012781, 120.93525425025881], [14.778139275650638, 120.93709526206992], [14.773104742636574, 120.93960422042926], [14.766525006702839, 120.94320546363049], [14.765525492192376, 120.94401383576125], [14.76072862621141, 120.94974045073359], [14.757057921030993, 120.95282600874056], [14.754092913022339, 120.95430633290394], [14.749614776242218, 120.95648776807238], [14.743004859115217, 120.95912082860627], [14.738243986091819, 120.96064278809952], [14.73118850798765, 120.96137476925526], [14.729202256905156, 120.96135109408412], [14.725646764905104, 120.9604838112117]
];

const rawBounds = L.latLngBounds(ROUTE_COORDS);
const routeBounds = rawBounds.pad(0.008); 
const mapBounds = L.latLngBounds(
  [rawBounds.getSouth() - 0.04, rawBounds.getWest() - 0.10],
  [rawBounds.getNorth() + 0.015, rawBounds.getEast() + 0.10]
);

const mapBoundsArray: [[number, number], [number, number]] = [
  [mapBounds.getSouth(), mapBounds.getWest()],
  [mapBounds.getNorth(), mapBounds.getEast()]
];
const MAP_CENTER: L.LatLngTuple = [rawBounds.getCenter().lat, rawBounds.getCenter().lng];

// --- NEW: Define a type for the hailer data for better type safety ---
interface HailerData {
  id: number;
  name: string;
  latlng: [number, number]; // Explicitly define as a tuple
  status: string;
}

// --- NEW: Mock data for hailing commuters with the correct type ---
const HAILER_DATA: HailerData[] = [
  { id: 1, name: 'Ana', latlng: [14.9013, 120.7719], status: 'Waiting' },
  { id: 2, name: 'Ben', latlng: [14.8282, 120.8809], status: 'Waiting' },
  { id: 3, name: 'Cris', latlng: [14.7963, 120.9297], status: 'Waiting' },
  { id: 4, name: 'Diana', latlng: [14.8208, 120.9042], status: 'Waiting' },
  { id: 5, name: 'Erik', latlng: [14.8605, 120.8090], status: 'Waiting' },
  { id: 6, name: 'Frank', latlng: [14.8749, 120.7961], status: 'Waiting' },
  { id: 7, name: 'Grace', latlng: [14.8152, 120.8136], status: 'Waiting' },
  { id: 8, name: 'Henry', latlng: [14.8459, 120.8342], status: 'Waiting' },
];

function getBearing(start: [number, number], end: [number, number]): number {
  const startLat = start[0] * Math.PI / 180;
  const endLat = end[0] * Math.PI / 180;
  const dLng = (end[1] - start[1]) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function LocationFinder({ 
  isDesktop,
  userLocationRef,
  setUserActualLocation, 
  setShowMapPin,
  setArrowPos
}: { 
  isDesktop: boolean;
  userLocationRef: React.MutableRefObject<[number, number] | null>;
  setUserActualLocation: (loc: [number, number] | null) => void;
  setShowMapPin: (val: boolean) => void;
  setArrowPos: (pos: { x: number; y: number; angle: number } | null) => void;
}) {
  const map = useMap();

  useMapEvents({
    locationfound(e) {
      const { lat, lng } = e.latlng;
      const userCoords: [number, number] = [lat, lng];
      setUserActualLocation(userCoords);
      userLocationRef.current = userCoords;
      
      const userLatLng = L.latLng(lat, lng);
      if (routeBounds.contains(userLatLng)) {
        setShowMapPin(true);
        setArrowPos(null); 
        map.flyTo([lat, lng], 16, { duration: 1.5 });
      } else {
        setShowMapPin(false);
      }
    },
    move() {
      const userCoords = userLocationRef.current;
      if (!userCoords) return;

      const userLatLng = L.latLng(userCoords[0], userCoords[1]);
      const bounds = map.getBounds();
      
      if (bounds.contains(userLatLng)) {
        setArrowPos(null);
        return;
      }

      const center = map.getCenter();
      const angle = getBearing([center.lat, center.lng], userCoords);

      const dx = Math.sin(angle * Math.PI / 180);
      const dy = -Math.cos(angle * Math.PI / 180);

      const safeMinX = 5;
      const safeMaxX = 95;
      const safeMinY = 15;
      const safeMaxY = 75;

      let tX = Infinity;
      let tY = Infinity;

      if (dx > 0) tX = (safeMaxX - 50) / dx;
      else if (dx < 0) tX = (safeMinX - 50) / dx;

      if (dy > 0) tY = (safeMaxY - 50) / dy;
      else if (dy < 0) tY = (safeMinY - 50) / dy;

      const t = Math.min(tX, tY);

      setArrowPos({
        x: 50 + (t * dx),
        y: 50 + (t * dy),
        angle: angle
      });
    },
    dragstart() {
      map.closePopup();
    }
  });

  useEffect(() => {
    map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true, timeout: 10000 });
  }, [map]);

  return null;
}

export default function AdminCommuterMap({ isDesktop = false }: { isDesktop?: boolean }) {
  const [isDomReady, setIsDomReady] = useState(false);
  const [userActualLocation, setUserActualLocation] = useState<[number, number] | null>(null);
  const [showMapPin, setShowMapPin] = useState(false);
  const [arrowPos, setArrowPos] = useState<{ x: number; y: number; angle: number } | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsDomReady(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const commuterIcon = useMemo(() => new L.DivIcon({
    className: "custom-commuter-icon",
    html: `<div style="position: relative; width: 20px; height: 20px;">
              <div style="position: absolute; inset: 0; background: #1A5FB4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(26,95,180,0.6); z-index: 2;"></div>
              <div style="position: absolute; inset: -5px; background: rgba(26,95,180,0.3); border-radius: 50%; animation: pulse 2s infinite; z-index: 1;"></div>
            </div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  }), []);

  const jeepneyIcon = useMemo(() => new L.DivIcon({
    className: "custom-jeepney-icon",
    html: `<div style="width: 44px; height: 44px; background: #071A2E; border-radius: 50%; border: 2px solid #62A0EA; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#62A0EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-10.5H6.375c-.621 0-1.125.504-1.125 1.125v6.75m12-6.75h-3.375c-.621 0-1.125.504-1.125 1.125v6.75m0 0H5.625m12-6.75h-1.5m-1.5 0h-1.5" />
              </svg>
            </div>`,
    iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -25],
  }), []);

  const hailingCommuterIcon = useMemo(() => new L.DivIcon({
    className: "custom-hailing-icon",
    html: `
      <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; animation: wave 2s ease-in-out infinite;">
        <div style="font-size: 20px; color: #FCD34D;">👋</div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  }), []);

  if (!isDomReady) return <div className="absolute inset-0 bg-[#050F1A]" />;

  return (
    <>
      {arrowPos && (
        <div 
          className="absolute z-[1000] flex flex-col items-center pointer-events-none select-none"
          style={{
            left: `${arrowPos.x}%`,
            top: `${arrowPos.y}%`,
            transform: `translate(-50%, -50%)`
          }}
        >
          <svg 
            className="w-8 h-8 text-[#62A0EA] drop-shadow-lg animate-pulse" 
            style={{ transform: `rotate(${arrowPos.angle}deg)` }} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          
          <span className="mt-1 text-[9px] font-bold text-white bg-[#071A2E]/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-lg border border-white/20">
            You
          </span>
        </div>
      )}

      <MapContainer
        center={MAP_CENTER}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ background: '#050F1A' }}
        maxBounds={mapBoundsArray}
        maxBoundsViscosity={1.0}
        minZoom={isDesktop ? 13 : 11}
      >
        <LocationFinder 
          isDesktop={isDesktop}
          userLocationRef={userLocationRef}
          setUserActualLocation={setUserActualLocation}
          setShowMapPin={setShowMapPin}
          setArrowPos={setArrowPos}
        />

        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }} />
        <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 4, opacity: 0.9, dashArray: '10 10', lineCap: 'round', lineJoin: 'round' }} />

        {showMapPin && userActualLocation && (
          <Marker position={userActualLocation} icon={commuterIcon}>
            <Popup>
              <div className="font-bold text-[#071A2E]">You are here</div>
              <div className="text-xs text-gray-500">Live GPS Location</div>
            </Popup>
          </Marker>
        )}

        <Marker position={ROUTE_COORDS[8]} icon={jeepneyIcon}>
          <Popup>
            <div className="font-bold text-[#071A2E]">Jeep 01 - Malolos</div>
            <div className="text-xs text-gray-500">Available • Heading to Meycauayan</div>
          </Popup>
        </Marker>

        <Marker position={ROUTE_COORDS[42]} icon={jeepneyIcon}>
          <Popup>
            <div className="font-bold text-[#071A2E]">Jeep 02 - Guiguinto</div>
            <div className="text-xs text-gray-500">Available • Heading to Calumpit</div>
          </Popup>
        </Marker>
        
        <Marker position={ROUTE_COORDS[68]} icon={jeepneyIcon}>
          <Popup>
            <div className="font-bold text-[#071A2E]">Jeep 03 - Marilao</div>
            <div className="text-xs text-gray-500">Available • Heading to Meycauayan</div>
          </Popup>
        </Marker>

        {HAILER_DATA.map((hailer) => (
          <Marker key={hailer.id} position={hailer.latlng as [number, number]} icon={hailingCommuterIcon}>
            <Popup>
              <div className="font-bold text-[#071A2E]">Hailing Commuter</div>
              <div className="text-xs text-gray-300">Name: {hailer.name}</div>
              <div className="text-xs text-gray-500">Status: {hailer.status}</div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      <style jsx global>{`
        .custom-commuter-icon, .custom-jeepney-icon, .custom-hailing-icon { background: transparent !important; border: none !important; }
        .leaflet-container { background: #050F1A !important; font-family: inherit !important; }
        .leaflet-popup-content-wrapper { background: white !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 12px 16px !important; color: #071A2E !important; line-height: 1.4 !important; }
        .leaflet-popup-tip { background: white !important; }
        .leaflet-popup-close-button { color: #071A2E !important; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes wave { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
      `}</style>
    </>
  );
}