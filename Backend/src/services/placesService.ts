import dotenv from "dotenv";

dotenv.config();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchRestaurants = async (
  lat: number,
  lng: number
) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  let allResults: any[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const MAX_PAGES = 3;

  do {
    const url = nextPageToken
      ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=restaurant&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();
    

    console.log(`[PlacesAPI] Page ${pageCount + 1} status: ${data.status}, results: ${(data.results || []).length}`);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[PlacesAPI] Error:', data.status, data.error_message);
      break;
    }

    allResults = allResults.concat(data.results || []);
    nextPageToken = data.next_page_token;
    pageCount++;

    if (nextPageToken && pageCount < MAX_PAGES) {
      await delay(2000);
    }
  } while (nextPageToken && pageCount < MAX_PAGES);

  console.log(`[PlacesAPI] Total restaurants fetched: ${allResults.length}`);
  return { results: allResults };
};

export const getPhotoUrl = (photoReference: string, maxWidth = 400): string => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
};