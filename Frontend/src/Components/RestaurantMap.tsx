import { useEffect, useRef } from 'react'
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"

interface MapProps {
  lat: number
  lng: number
  name: string
}

setOptions({
  key: import.meta.env.VITE_GOOGLE_PLACES_KEY
})

export default function RestaurantMap({ lat, lng, name }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return

    const initMap = async () => {
      try {
        await importLibrary("maps")
        
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current!, {
            zoom: 15,
            center: { lat, lng },
          })
        }

        new google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: name,
        })
      } catch (error) {
        console.error('Failed to load map:', error)
      }
    }

    initMap()
  }, [lat, lng, name])

  const openGoogleMaps = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="relative group cursor-pointer">
      <div 
        ref={mapRef} 
        className="w-full h-48 sm:h-64 md:h-[300px] rounded-xl overflow-hidden shadow-md"
      />
      <div className="absolute top-3 right-3 z-10 bg-gray-900/95 light:bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-700 light:border-gray-200 text-xs font-bold text-gray-100 light:text-gray-800 flex items-center gap-1.5 shadow-md group-hover:scale-105 group-hover:bg-orange-500 group-hover:text-white transition-all">
        <span title="Click to open exact location in Google Maps" onClick={openGoogleMaps}>Open in Google Maps</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </div>
  )
}