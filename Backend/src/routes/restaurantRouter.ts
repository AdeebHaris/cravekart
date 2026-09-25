import express from 'express';
import {
  seedRestaurants,
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  searchRestaurants,
  deleteRestaurant,
  updateRestaurant,
  getMyRestaurants
} from '../controllers/restaurantController.ts';
import { verifyToken } from '../middlewares/authMiddleware.ts';
import { authorize } from '../middlewares/roleMiddleware.ts';
import { isRestaurantOwnerOf } from '../middlewares/restaurantOwnerMiddleware.ts';

const router = express.Router();

router.get('/', getAllRestaurants);
router.get('/search', searchRestaurants);

router.post('/seed',seedRestaurants)


router.put(
  '/:restaurantId/update',
  verifyToken,
  authorize(['admin','restaurant_owner']),
  updateRestaurant
);

router.post(
  '/create',
  verifyToken,
  authorize(['admin', 'restaurant_owner']),
  createRestaurant
);

router.delete(
  '/:restaurantId',
  verifyToken,
  authorize(['admin','super_admin']),
  deleteRestaurant
);   
             
router.get(
  '/my',
  verifyToken,
  authorize(['restaurant_owner']),
  getMyRestaurants
);

router.get('/:id', getRestaurantById);  



export default router;