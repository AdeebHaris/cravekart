import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.ts';
import { getRestaurantOwner } from '../Repository/userRepository.ts';


export const isRestaurantOwnerOf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { restaurantId } = req.params;

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId required' });
    }

    const ownership = await getRestaurantOwner(req.user.id, Number(restaurantId));

    

    if (!ownership) {
      return res.status(403).json({ 
        error: 'You are not the owner of this restaurant' 
      });
    }

    req.restaurantId = Number(restaurantId);
    next();
  } catch (error) {
    console.error('Restaurant ownership check error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};