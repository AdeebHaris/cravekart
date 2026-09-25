import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware'
import { authorize } from '../middlewares/roleMiddleware';
import { getAvailable, pickUpOrder, getPartnerDeliveries, deliverOrder } from '../controllers/deliveryController';

const router = express.Router();

router.use(verifyToken);
router.use(authorize(['delivery_partner']));

router.get('/available', getAvailable);
router.get('/my-deliveries', getPartnerDeliveries);
router.patch('/:id/pick', pickUpOrder);
router.patch('/:id/deliver', deliverOrder);

export default router;