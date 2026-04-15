"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAP_CENTER: L.LatLngTuple = [14.5995, 120.9842];

export default function ConductorMap() {
  const [isDomReady, setIsDomReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDomReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Conductor's Vehicle Marker (Blue, solid, authoritative)
  const vehicleIcon = useMemo(() => new L.DivIcon({
    className: "custom-vehicle-icon",
    html: `
      <div style="position: relative; width: 48px; height: 48px;">
        <div style="position: absolute; inset: 0; background: #1A5FB4; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(26,95,180,0.5); z-index: 2; display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-10.5H6.375c-.621 0-1.125.504-1.125 1.125v6.75m12-6.75h-3.375c-.621 0-1.125.504-1.125 1.125v6.75m0 0H5.625m12-6.75h-1.5m-1.5 0h-1.5" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  }), []);

  // Hailing Commuter Marker (Orange, pulsing - matches commuter's "Hail Me" button color)
  const hailingIcon = useMemo(() => new L.DivIcon({
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

  if (!isDomReady) {
    return <div className="absolute inset-0 bg-gray-100" />;
  }

  return (
    <>
      <MapContainer
        center={MAP_CENTER}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ background: '#F9FAFB' }} // Light theme background
      >
        {/* Light map tiles for outdoor visibility */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        
        {/* Conductor's Current Location */}
        <Marker position={[14.5995, 120.9842]} icon={vehicleIcon}>
          <Popup>
            <div className="font-bold text-[#1A5FB5]">RIZ 2024 (You)</div>
            <div className="text-xs text-gray-500">Status: Available</div>
          </Popup>
        </Marker>

        {/* Mock Hailing Request 1 */}
        <Marker position={[14.6010, 120.9860]} icon={hailingIcon}>
          <Popup>
            <div className="font-bold text-[#FF6D3A]">Passenger Waiting</div>
            <div className="text-xs text-gray-500">Near Jollibee • 2 min away</div>
          </Popup>
        </Marker>

        {/* Mock Hailing Request 2 */}
        <Marker position={[14.5970, 120.9810]} icon={hailingIcon}>
          <Popup>
            <div className="font-bold text-[#FF6D3A]">Passenger Waiting</div>
            <div className="text-xs text-gray-500">Corner Street • 5 min away</div>
          </Popup>
        </Marker>
      </MapContainer>

      <style jsx global>{`
        .custom-vehicle-icon, .custom-hailing-icon {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          background: #F9FAFB !important;
          font-family: inherit !important;
        }
        .leaflet-popup-content-wrapper {
          background: white !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px !important;
          color: #333333 !important;
          line-height: 1.4 !important;
        }
        .leaflet-popup-tip {
          background: white !important;
        }
        .leaflet-popup-close-button {
          color: #333333 !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </>
  );
}
