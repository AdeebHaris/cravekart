import express from 'express';
import { createOrder, getUserOrders, getOwnerOrders, updateOrderStatus  } from '../controllers/orderController.ts';
import { verifyToken } from '../middlewares/authMiddleware.ts';
import { authorize } from '../middlewares/roleMiddleware.ts';
import { subscribeSSE } from '../services/sseService.ts';

const router = express.Router();

router.use(verifyToken);

router.get('/events', subscribeSSE)
router.post('/', createOrder);
router.get('/my', getUserOrders);
router.get('/owner', verifyToken, authorize(['restaurant_owner']), getOwnerOrders);
router.patch('/:id/status', verifyToken, authorize(['restaurant_owner']), updateOrderStatus);

export default router;
