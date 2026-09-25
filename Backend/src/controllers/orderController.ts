import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.ts';
import { createOrder as createOrderDB, getUserOrders as getUserOrdersDB, getRestaurantOwnerOrders, updateOrderStatusByOwner} from '../Repository/orderRepository.ts';
import { getMenuItemById } from '../Repository/menuRepository.ts';
import { broadcastOrderEvent } from '../services/sseService.ts';

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { address, items, totalPrice, paymentId, phone_number, phoneNumber, phone } = req.body;
    const contactPhone = phone_number || phoneNumber || phone;

    if (!address || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'address and items are required' });
    }

    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({ error: 'Invalid total price' });
    }

    for (const item of items) {
      const menuItemId = item.menu_item_id || item.menuItemId || item.id;
      if (menuItemId) {
        const menuItem = await getMenuItemById(Number(menuItemId));
        if (menuItem && menuItem.is_available === false) {
          return res.status(400).json({
            error: `"${menuItem.name}" is currently out of stock. Please remove it from your cart to proceed.`
          });
        }
      }
    }

    const customerName = req.user.username;

    const order = await createOrderDB(
      req.user.id,
      customerName,
      address,
      totalPrice,
      paymentId || 'demo_payment',
      items,
      contactPhone
    );

    broadcastOrderEvent({ type: 'ORDER_CREATED', order });

    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const orders = await getUserOrdersDB(req.user.id);

    res.json({
      message: 'Orders retrieved successfully',
      orders,
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const getOwnerOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const orders = await getRestaurantOwnerOrders(req.user.id);
    res.json({ message: 'Owner orders fetched', orders });
  } catch (error) {
    console.error('Get owner orders error:', error);
    res.status(500).json({ error: 'Failed to fetch owner orders' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const orderId = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const order = await updateOrderStatusByOwner(orderId, req.user.id);
    if (!order) {
      return res.status(403).json({ error: 'Order not found or unauthorized' });
    }
    res.json({ message: 'Order status updated successfully', order });
    broadcastOrderEvent({ type: 'ORDER_STATUS_UPDATED', order });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
