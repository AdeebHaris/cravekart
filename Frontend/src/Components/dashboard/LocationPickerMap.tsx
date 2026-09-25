import { useState, useEffect, useRef } from "react";
import L from "leaflet";

if (typeof document !== "undefined" && !document.getElementById("leaflet-css")) {
  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onPositionChange,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = latitude || 9.9678;
    const initialLng = longitude || 76.3195;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: defaultIcon,
      }).addTo(map);

      marker.bindPopup("<strong>Drag pin to exact restaurant entrance</strong>").openPopup();

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onPositionChange(position.lat, position.lng);
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onPositionChange(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && latitude && longitude) {
      const currentPos = markerRef.current.getLatLng();
      const dist = Math.abs(currentPos.lat - latitude) + Math.abs(currentPos.lng - longitude);
      if (dist > 0.00001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-gray-50/80 cursor-pointer border-none text-left transition-colors group"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-bold text-gray-800">
            {isOpen ? "Hide Map Picker" : "Open Map Picker (Pinpoint Exact Location)"}
          </span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-orange-600" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className={`p-3 border-t border-gray-200 bg-white space-y-2 ${isOpen ? "block" : "hidden"}`}>
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-0.5">
          <span className="text-orange-600 font-semibold">
            Drag the pin or click on the map to pinpoint exact doorstep location
          </span>
          {latitude && longitude && (
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Google Maps</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
        <div
          ref={mapContainerRef}
          className="w-full h-[260px] rounded-xl border border-gray-300 shadow-inner z-0 overflow-hidden relative"
        />
      </div>
    </div>
  );
}
