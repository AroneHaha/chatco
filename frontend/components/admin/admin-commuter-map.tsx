"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, Circle, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- 1. BACKEND PROOFING: Types & Mock Data ---
type VehicleCapacity = "AVAILABLE" | "STANDING" | "FULL";

interface ActiveVehicle {
  id: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  routeIndex: number;
  capacity: VehicleCapacity;
}

const MOCK_ACTIVE_VEHICLES: ActiveVehicle[] = [
  { id: "v_01", plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", routeIndex: 8, capacity: "AVAILABLE" },
  { id: "v_02", plateNumber: "XYZ 5678", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", routeIndex: 42, capacity: "STANDING" },
  { id: "v_03", plateNumber: "DEF 9012", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", routeIndex: 68, capacity: "FULL" },
];

interface CommuterData {
  id: number;
  name: string;
  latlng: [number, number];
  locationDetail: string;
}

const MOCK_COMMUTERS: CommuterData[] = [
  { id: 1, name: 'Ana', latlng: [14.9013, 120.7719], locationDetail: 'Near 7-Eleven • 2 min away' },
  { id: 2, name: 'Ben', latlng: [14.8282, 120.8809], locationDetail: 'Corner Street • 5 min away' },
  { id: 3, name: 'Cris', latlng: [14.7963, 120.9297], locationDetail: 'Near Jollibee • 1 min away' },
  { id: 4, name: 'Diana', latlng: [14.8208, 120.9042], locationDetail: 'Waiting at Shed • 3 min away' },
  { id: 5, name: 'Erik', latlng: [14.8605, 120.8090], locationDetail: 'Across School • 4 min away' },
];

interface DemandZone {
  id: string;
  coords: [number, number];
  radiusMeters: number;
  commuterCount: number;
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
}

const MOCK_DEMAND_HEATMAP: DemandZone[] = [
  { id: 'zone-1', coords: [14.88645, 120.78596], radiusMeters: 400, commuterCount: 120, intensity: 'HIGH' },
  { id: 'zone-2', coords: [14.84941, 120.82352], radiusMeters: 300, commuterCount: 85, intensity: 'MEDIUM' },
  { id: 'zone-3', coords: [14.81816, 120.90600], radiusMeters: 500, commuterCount: 150, intensity: 'HIGH' },
  { id: 'zone-4', coords: [14.77813, 120.93709], radiusMeters: 250, commuterCount: 40, intensity: 'LOW' },
  { id: 'zone-5', coords: [14.74300, 120.95912], radiusMeters: 350, commuterCount: 95, intensity: 'MEDIUM' },
];

// --- 2. ROUTE DATA ---
const ROUTE_COORDS: [number, number][] = [
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

// --- 3. HELPER FUNCTIONS ---
function getBearing(start: [number, number], end: [number, number]): number {
  const startLat = start[0] * Math.PI / 180;
  const endLat = end[0] * Math.PI / 180;
  const dLng = (end[1] - start[1]) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const getCapacityConfig = (capacity: VehicleCapacity) => {
  switch (capacity) {
    case "AVAILABLE": return { color: "#22c55e", label: "Available", twBg: "bg-green-500/10", twText: "text-green-400", twBorder: "border-green-500/30" };
    case "STANDING": return { color: "#eab308", label: "Standing", twBg: "bg-yellow-500/10", twText: "text-yellow-400", twBorder: "border-yellow-500/30" };
    case "FULL": return { color: "#ef4444", label: "Full", twBg: "bg-red-500/10", twText: "text-red-400", twBorder: "border-red-500/30" };
  }
};

function LocationFinder({
  userLocationRef, setUserActualLocation, setShowMapPin, setArrowPos
}: {
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
      setShowMapPin(true);

      if (routeBounds.contains(userLatLng)) {
        setArrowPos(null);
        map.flyTo([lat, lng], 16, { duration: 1.5 });
      } else if (mapBounds.contains(userLatLng)) {
        setArrowPos(null);
        map.setView([lat, lng], 13, { animate: true });
      }
    },
    locationerror(e) {
      console.error("Location access denied:", e.message);
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

      const safeMinX = 5; const safeMaxX = 95;
      const safeMinY = 15; const safeMaxY = 75;

      let tX = Infinity; let tY = Infinity;

      if (dx > 0) tX = (safeMaxX - 50) / dx;
      else if (dx < 0) tX = (safeMinX - 50) / dx;
      if (dy > 0) tY = (safeMaxY - 50) / dy;
      else if (dy < 0) tY = (safeMinY - 50) / dy;

      const t = Math.min(tX, tY);

      setArrowPos({ x: 50 + (t * dx), y: 50 + (t * dy), angle: angle });
    },
    dragstart() { map.closePopup(); }
  });

  useEffect(() => {
    map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true, timeout: 10000, watch: true });
  }, [map]);

  return null;
}

// --- 4. MAIN COMPONENT ---
export default function AdminCommuterMap({ 
  isDesktop = false, 
  demandZones, 
  sosLocations 
}: { 
  isDesktop?: boolean;
  demandZones?: DemandZone[];
  sosLocations?: [number, number][];
}) {
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

  const getJeepneyIcon = useMemo(() => (capacity: VehicleCapacity) => {
    const config = getCapacityConfig(capacity);
    return new L.DivIcon({
      className: "custom-jeepney-icon",
      html: `<div style="width: 44px; height: 44px; background: #071A2E; border-radius: 50%; border: 2.5px solid ${config.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(0,0,0,0.5), 0 0 8px ${config.color}40;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-10.5H6.375c-.621 0-1.125.504-1.125 1.125v6.75m12-6.75h-3.375c-.621 0-1.125.504-1.125 1.125v6.75m0 0H5.625m12-6.75h-1.5m-1.5 0h-1.5" />
                </svg>
              </div>`,
      iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -25],
    });
  }, []);

  const hailingCommuterIcon = useMemo(() => new L.DivIcon({
    className: "custom-hailing-icon",
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; inset: 0; background: #FF6D3A; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(255,109,58,0.6); z-index: 2;"></div>
        <div style="position: absolute; inset: -5px; background: rgba(255,109,58,0.3); border-radius: 50%; animation: pulse 2s infinite; z-index: 1;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -15],
  }), []);

  const zonesToRender = demandZones || MOCK_DEMAND_HEATMAP;

  if (!isDomReady) return <div className="w-full h-full bg-[#050F1A] rounded-xl" />;

  return (
    <div className="admin-map-wrapper w-full h-full rounded-xl overflow-hidden">
      <MapContainer
        center={MAP_CENTER}
        zoom={12}
        zoomControl={false}
        attributionControl={false}
        className="admin-map-container"
        style={{ background: '#050F1A' }}
        maxBounds={mapBoundsArray}
        maxBoundsViscosity={1.0}
        minZoom={11}
        maxZoom={18}
        zoomSnap={1}
      >
        <LocationFinder userLocationRef={userLocationRef} setUserActualLocation={setUserActualLocation} setShowMapPin={setShowMapPin} setArrowPos={setArrowPos} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }} />
        <Polyline positions={ROUTE_COORDS} pathOptions={{ color: '#62A0EA', weight: 4, opacity: 0.9, dashArray: '10 10', lineCap: 'round', lineJoin: 'round' }} />

        {/* --- DEMAND HEATMAP CIRCLES --- */}
        {zonesToRender.map((zone) => {
          const colorMap = {
            LOW: { fill: '#22c55e', border: '#16a34a' },
            MEDIUM: { fill: '#eab308', border: '#ca8a04' },
            HIGH: { fill: '#ef4444', border: '#dc2626' }
          };
          const colors = colorMap[zone.intensity];

          return (
            <Circle
              key={zone.id}
              center={zone.coords}
              radius={zone.radiusMeters}
              pathOptions={{
                color: colors.border,
                fillColor: colors.fill,
                fillOpacity: 0.2,
                weight: 1,
                opacity: 0.5
              }}
            >
              {isDesktop ? (
                <Tooltip direction="center" permanent>
                  <div className="text-center font-semibold text-xs whitespace-nowrap">
                    <p>{zone.commuterCount}</p>
                  </div>
                </Tooltip>
              ) : (
                <Tooltip direction="top" offset={[0, -5]}>
                  <div className="text-center font-semibold text-xs whitespace-nowrap">
                    <p>{zone.commuterCount} Commuters</p>
                    <p className="font-normal text-[10px] opacity-80">{zone.intensity}</p>
                  </div>
                </Tooltip>
              )}
            </Circle>
          );
        })}

        {/* --- SOS LOCATIONS --- */}
        {sosLocations && sosLocations.map((loc, idx) => (
          <Marker key={`sos-${idx}`} position={loc} icon={new L.DivIcon({
            className: 'custom-sos-icon',
            html: `<div style="width:24px;height:24px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(239,68,68,0.8);"></div>`,
            iconSize: [24, 24], iconAnchor: [12, 12]
          })}>
            <Popup>
              <div className="font-bold text-red-600 text-sm">SOS Location</div>
              <div className="text-xs text-gray-500">Coords: {loc[0]}, {loc[1]}</div>
            </Popup>
          </Marker>
        ))}

        {showMapPin && userActualLocation && (
          <Marker position={userActualLocation} icon={commuterIcon} zIndexOffset={1000}>
            <Popup>
              <div className="font-bold text-[#071A2E]">You are here</div>
              <div className="text-xs text-gray-500">Live GPS Location</div>
            </Popup>
          </Marker>
        )}

        {MOCK_COMMUTERS.map((commuter) => (
          <Marker key={commuter.id} position={commuter.latlng} icon={hailingCommuterIcon} zIndexOffset={500}>
            <Popup>
              <div className="font-bold text-[#FF6D3A]">Passenger Waiting ({commuter.name})</div>
              <div className="text-xs text-gray-500">{commuter.locationDetail}</div>
            </Popup>
          </Marker>
        ))}

        {MOCK_ACTIVE_VEHICLES.map((vehicle) => {
          const config = getCapacityConfig(vehicle.capacity);
          return (
            <Marker key={vehicle.id} position={ROUTE_COORDS[vehicle.routeIndex]} icon={getJeepneyIcon(vehicle.capacity)} zIndexOffset={800}>
              <Popup>
                <div className="space-y-2 min-w-[180px]">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#071A2E]">{vehicle.plateNumber}</div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${config.twBg} ${config.twText} ${config.twBorder} border`}>{config.label}</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5 pt-1 border-t border-gray-100">
                    <p><span className="font-medium text-gray-700">Driver:</span> {vehicle.driverName}</p>
                    <p><span className="font-medium text-gray-700">Conductor:</span> {vehicle.conductorName}</p>
                  </div>
                  {vehicle.capacity === "FULL" && (
                    <div className="text-[10px] font-medium text-red-500 bg-red-50 p-1.5 rounded text-center border border-red-100">
                      Not accepting passengers
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style jsx global>{`
        /* 
         * SCOPED WRAPPER FIX
         * Prevents Leaflet from escaping its bounds and hijacking parent scroll 
         */
        .admin-map-wrapper {
          position: relative;
          touch-action: none; /* Forces Leaflet to handle touch, not iOS Safari */
        }

        .admin-map-container {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          isolation: isolate !important; /* Traps Leaflet's internal z-indexes */
        }

        .leaflet-container {
          background: #050F1A !important;
          font-family: inherit !important;
        }

        .custom-commuter-icon,
        .custom-jeepney-icon,
        .custom-hailing-icon,
        .custom-sos-icon {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-popup-content-wrapper {
          background: white !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
          overflow: hidden;
        }

        .leaflet-popup-content {
          margin: 10px 12px !important;
          color: #071A2E !important;
          line-height: 1.4 !important;
        }

        .leaflet-popup-tip {
          background: white !important;
        }

        .leaflet-popup-close-button {
          color: #071A2E !important;
          font-size: 18px !important;
          padding: 6px 8px 0 0 !important;
        }

        .leaflet-tooltip {
          background: #071A2E !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 4px !important;
          padding: 3px 6px !important;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important;
          font-size: 11px !important;
        }

        .leaflet-tooltip-top:before { border-top-color: #071A2E !important; }
        .leaflet-tooltip-bottom:before { border-bottom-color: #071A2E !important; }
        .leaflet-tooltip-left:before { border-left-color: #071A2E !important; }
        .leaflet-tooltip-right:before { border-right-color: #071A2E !important; }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}