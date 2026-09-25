import express from 'express';
import {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCartItems
} from '../controllers/cartController.ts';
import { verifyToken } from '../middlewares/authMiddleware.ts';

const router = express.Router();

router.use(verifyToken);

router.get('/',getCart)

router.post('/add', addToCart);

router.put('/:cartItemId', updateCartItemQuantity);

router.delete('/clear',clearCartItems);

router.delete('/:cartItemId', removeFromCart);


export default router;