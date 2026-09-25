import { 
  saveMultipleRestaurants, 
  saveRestaurant,
  getAllRestaurants as getAllRestaurantsDB,
  getRestaurantById as getRestaurantByIdDB,
  searchRestaurants as searchRestaurantsDB,
  deleteRestaurant as deleteRestaurantDB,
  updateRestaurant as updateRestaurantDB  
} from '../Repository/restaurantRepository.ts';
import { getRestaurantsByOwner } from '../Repository/userRepository.ts';
import { fetchRestaurants, getPhotoUrl } from '../services/placesService.ts';
import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.ts';
import { broadcastRestaurantEvent } from '../services/sseService.ts';

export const seedRestaurants = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = req.body;

    console.log(`[Seed] Received coordinates: lat=${lat}, lng=${lng}`);

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required in the request body' });
    }

    const data = await fetchRestaurants(lat, lng);
    const restaurants = data.results;

    console.log(`[Seed] Google Places API returned ${restaurants.length} restaurants`);

    if (restaurants.length === 0) {
      return res.json({ 
        message: 'No restaurants found from Google Places API. Check your API key or try different coordinates.',
        count: 0
      });
    }

    const restaurantsToSave = restaurants.map((restaurant) => ({
      place_id: restaurant.place_id,
      name: restaurant.name,
      rating: restaurant.rating ?? null,
      address: restaurant.vicinity ?? '',
      latitude: restaurant.geometry.location.lat,
      longitude: restaurant.geometry.location.lng,
      is_open: restaurant.opening_hours?.open_now ?? null,
      photo_url: restaurant.photos?.[0]?.photo_reference 
        ? getPhotoUrl(restaurant.photos[0].photo_reference) 
        : null,
    }));

    console.log(`[Seed] Saving ${restaurantsToSave.length} restaurants to DB...`);
    await saveMultipleRestaurants(restaurantsToSave);

    res.json({ 
      message: 'Restaurants seeded successfully',
      count: restaurantsToSave.length,
      sample: restaurantsToSave.slice(0, 3).map(r => ({ name: r.name, place_id: r.place_id }))
    });
  } catch (error) {
    console.error('[Seed] Error:', error);
    res.status(500).json({ error: 'Failed to seed restaurants' });
  }
};

export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const { name, rating, address, latitude, longitude, is_open, photo_url, place_id } = req.body;

    
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, latitude, longitude' 
      });
    }

    const restaurant = {
      place_id: place_id || `custom_${Date.now()}`, 
      name,
      rating: rating || null,
      address: address || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      is_open: is_open ?? null,
      photo_url: photo_url || null,
    };

    const createdRes = await saveRestaurant(restaurant);
    broadcastRestaurantEvent({ type: 'RESTAURANT_CREATED', restaurant: createdRes || restaurant });
    res.status(201).json({ message: 'Restaurant created successfully', restaurant: createdRes || restaurant });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
};

export const getAllRestaurants = async (req: Request, res: Response) => {
  try {
    const restaurants = await getAllRestaurantsDB(); 
    res.json(restaurants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
};

export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restaurant = await getRestaurantByIdDB(Number(id));  
    
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json(restaurant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
};

export const searchRestaurants = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const restaurants = await searchRestaurantsDB(String(q));  
    res.json(restaurants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const deleteRestaurant = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.restaurantId;
    const restaurantId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
      return res.status(400).json({ error: 'Restaurant ID required' });
    }

    const deleted = await deleteRestaurantDB(restaurantId);

    if (deleted === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    broadcastRestaurantEvent({ type: 'RESTAURANT_DELETED', restaurantId: Number(restaurantId) || (restaurantId as any) });

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
};


export const updateRestaurant = async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { name, rating, address, is_open, photo_url } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID required' });
    }

    const restaurant = await getRestaurantByIdDB(Number(restaurantId));

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!name && rating === undefined && !address && is_open === undefined && !photo_url) {
      return res.status(400).json({ 
        error: 'At least one field required to update' 
      });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (rating !== undefined) updates.rating = Number(rating);
    if (address !== undefined) updates.address = address;
    if (is_open !== undefined) updates.is_open = is_open;
    if (photo_url !== undefined) updates.photo_url = photo_url;

    const updatedRestaurant = await updateRestaurantDB(Number(restaurantId), updates);

    broadcastRestaurantEvent({ type: 'RESTAURANT_UPDATED', restaurant: updatedRestaurant });

    res.json({
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
};

export const getMyRestaurants = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const restaurants = await getRestaurantsByOwner(req.user.id);
    res.json({ restaurants });
  } catch (error) {
    console.error('Error fetching owner restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch your restaurants' });
  }
};
