"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAP_CENTER: L.LatLngTuple = [14.5995, 120.9842];

export default function CommuterMap() {
  const [isDomReady, setIsDomReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDomReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // 1. MOVED HOOKS UP HERE
  const commuterIcon = useMemo(() => new L.DivIcon({
    className: "custom-commuter-icon",
    html: `
      <div style="position: relative; width: 20px; height: 20px;">
        <div style="position: absolute; inset: 0; background: #1A5FB4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(26,95,180,0.6); z-index: 2;"></div>
        <div style="position: absolute; inset: -5px; background: rgba(26,95,180,0.3); border-radius: 50%; animation: pulse 2s infinite; z-index: 1;"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), []);

  const jeepneyIcon = useMemo(() => new L.DivIcon({
    className: "custom-jeepney-icon",
    html: `
      <div style="width: 44px; height: 44px; background: #071A2E; border-radius: 50%; border: 2px solid #62A0EA; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#62A0EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-10.5H6.375c-.621 0-1.125.504-1.125 1.125v6.75m12-6.75h-3.375c-.621 0-1.125.504-1.125 1.125v6.75m0 0H5.625m12-6.75h-1.5m-1.5 0h-1.5" />
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  }), []);

  // 2. THE CHECK GOES DOWN HERE (After all hooks)
  if (!isDomReady) {
    return <div className="absolute inset-0 bg-[#050F1A]" />;
  }

  return (
    <>
      <MapContainer
        center={MAP_CENTER}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ background: '#050F1A' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        <Marker position={[14.5995, 120.9842]} icon={commuterIcon}>
          <Popup>You are here</Popup>
        </Marker>

        <Marker position={[14.6010, 120.9860]} icon={jeepneyIcon}>
          <Popup>
            <div className="font-bold text-[#071A2E]">Jeep 01 - Cubao</div>
            <div className="text-xs text-gray-500">Available • 3 min away</div>
          </Popup>
        </Marker>

        <Marker position={[14.5970, 120.9810]} icon={jeepneyIcon}>
          <Popup>
            <div className="font-bold text-[#071A2E]">Jeep 02 - QC</div>
            <div className="text-xs text-gray-500">Available • 7 min away</div>
          </Popup>
        </Marker>
      </MapContainer>

      <style jsx global>{`
        .custom-commuter-icon, .custom-jeepney-icon {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          background: #050F1A !important;
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
          color: #071A2E !important;
          line-height: 1.4 !important;
        }
        .leaflet-popup-tip {
          background: white !important;
        }
        .leaflet-popup-close-button {
          color: #071A2E !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </>
  );
}