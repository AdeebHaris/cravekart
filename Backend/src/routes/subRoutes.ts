import express from 'express';
import restaurantRouter from './restaurantRouter.ts';
import menuRouter from './menuRouter.ts'
import authRouter from './authRouter.ts'; 
import cartRouter from './cartRouter.ts';
import orderRouter from './orderRouter.ts';
import deliveryRouter from './deliveryRouter.ts';

const router = express.Router();

router.use('/restaurants', restaurantRouter);
router.use('/menu', menuRouter)
router.use('/auth', authRouter);
router.use('/cart', cartRouter);
router.use('/orders', orderRouter);
router.use('/delivery', deliveryRouter);

export default router;