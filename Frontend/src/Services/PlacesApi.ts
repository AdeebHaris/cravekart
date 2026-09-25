/// <reference types="@types/google.maps" />
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"

export interface Restaurant {
  place_id: string
  name: string
  vicinity: string
  rating: number
  lat: number
  lng: number
  photo : string | null
}
setOptions({
  key: import.meta.env.VITE_GOOGLE_PLACES_KEY
})

export const fetchRestaurants = async (lat: number, lng: number): Promise<Restaurant[]> => {
  const { PlacesService } = await importLibrary("places")

  const map = new google.maps.Map(document.createElement("div"))
  const service = new PlacesService(map)

  return new Promise((resolve, reject) => {
    
    const allResults: Restaurant[] = []
    const callback = (
      results: google.maps.places.PlaceResult[] | null,
      status: google.maps.places.PlacesServiceStatus,
      pagination: google.maps.places.PlaceSearchPagination | null
    ) => {
      if (status !== 'OK' || !results) {
        reject(status)
        return
      }

      allResults.push(
        ...results.map((r) => ({
          place_id: r.place_id ?? "",
          name: r.name ?? "",
          vicinity: r.vicinity ?? "",
          rating: r.rating ?? 0,
          lat: r.geometry?.location?.lat() ?? 0,
          lng: r.geometry?.location?.lng() ?? 0,
          photo: r.photos?.[0] ? getPhotoUrl(r.photos[0]) : null,
        }))
      )

      if (pagination?.hasNextPage) {
      
        setTimeout(() => pagination.nextPage(), 2000)
      } else {
        resolve(allResults)
      }
    }

    service.nearbySearch(
      {
        location: { lat, lng },
        radius: 3000,
        type: "restaurant",
      },
      callback
    )
})
}
function getPhotoUrl(photo: google.maps.places.PlacePhoto): string {
  return photo.getUrl({ maxWidth: 400, maxHeight: 150 })
}