import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getAvailableOrders, pickOrder, getMyDeliveries, markOrderDelivered } from '../Repository/orderRepository';
import { broadcastOrderEvent } from '../services/sseService';

export const getAvailable = async (req: AuthRequest, res: Response)=>{
    try{
        if(!req.user){
            return res.status(401).json({ error: 'Not authenticated'});
        }

        const orders = await getAvailableOrders();
        res.json({message: 'Available orders fetched', orders});
    }catch(error){
        console.error('Get available orders error:', error);
        res.status(500).json({error: 'Failed to fetch available orders'});  
    }
};

export const pickUpOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const orderId = parseInt(req.params.id as string, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    const order = await pickOrder(orderId, req.user.id);
    if (!order) {
      return res.status(409).json({
        error: 'Order is no longer available. It may have already been picked up.'
      });
    }
    broadcastOrderEvent({ type: 'ORDER_STATUS_UPDATED', order });
    res.json({ message: 'Order picked up successfully', order });
  } catch (error) {
    console.error('Pick order error:', error);
    res.status(500).json({ error: 'Failed to pick up order' });
  }
};

export const getPartnerDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const orders = await getMyDeliveries(req.user.id);
    res.json({ message: 'Your deliveries fetched', orders });
  } catch (error) {
    console.error('Get partner deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
};

export const deliverOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const orderId = parseInt(req.params.id as string, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const order = await markOrderDelivered(orderId, req.user.id);
    if (!order) {
      return res.status(403).json({
        error: 'Cannot mark this order as delivered. Either it does not belong to you, or it is not in the correct state.'
      });
    }
    broadcastOrderEvent({ type: 'ORDER_STATUS_UPDATED', order });
    
    res.json({ message: 'Order marked as delivered', order });
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({ error: 'Failed to mark order as delivered' });
  }
};