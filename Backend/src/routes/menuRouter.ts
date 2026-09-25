import express from 'express';
import { getMenu, addMenuItem, deleteMenuItem, searchMenuItems, updateMenuItem, toggleMenuItemAvailability, suggestItemDescriptions, bulkUpdateMenuDiscount  } from '../controllers/menuController';
import { verifyToken } from '../middlewares/authMiddleware.ts';
import { authorize } from '../middlewares/roleMiddleware.ts';
import { isRestaurantOwnerOf } from '../middlewares/restaurantOwnerMiddleware.ts';
import { aiSearchMenuItems } from '../controllers/menuController'

const router = express.Router();

router.get('/search', searchMenuItems);
router.patch(
  '/:restaurantId/items/discount-all',
  verifyToken,
  authorize(['restaurant_owner']),
  isRestaurantOwnerOf,
  bulkUpdateMenuDiscount
);

router.get('/:restaurantName', getMenu);  



router.post(
  '/items/:restaurantId',
  verifyToken,
  authorize(['restaurant_owner']),
  isRestaurantOwnerOf,
  addMenuItem
);  

router.post(
  '/ai/suggest-description',
  verifyToken,
  authorize(['restaurant_owner', 'admin', 'super_admin']),
  suggestItemDescriptions
);

router.post('/ai-search', aiSearchMenuItems);

router.put(
  '/:restaurantId/items/:itemId',
  verifyToken,
  authorize(['admin','restaurant_owner']),
  isRestaurantOwnerOf,
  updateMenuItem
);

router.patch(
  '/:restaurantId/items/:itemId/availability',
  verifyToken,
  authorize(['restaurant_owner']),
  isRestaurantOwnerOf,
  toggleMenuItemAvailability
);

router.delete(
  '/items/:restaurantId/:itemId',
  verifyToken,
  authorize(['restaurant_owner']),
  isRestaurantOwnerOf,
  deleteMenuItem
);








export default router;
