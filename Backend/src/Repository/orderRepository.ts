import pool from '../db';

export interface OrderItemInput {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  restaurant_id: number;
  restaurant_name: string;
}

export const createOrder = async (
  userId: number,
  customerName: string,
  address: string,
  totalPrice: number,
  paymentId: string,
  items: OrderItemInput[],
  phoneNumber?: string
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const restaurantId = items[0]?.restaurant_id ?? null;
    const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

    const orderResult = await client.query(
      `INSERT INTO orders
        (user_id, restaurant_id, customer_name, items_count, total_price, address, payment_id, phone_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'preparing')
       RETURNING *`,
      [userId, restaurantId, customerName, itemsCount, totalPrice, address, paymentId, phoneNumber || null]
    );

    const order = orderResult.rows[0];

    // Insert each line item
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
          (order_id, menu_item_id, restaurant_id, restaurant_name, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, item.menu_item_id, item.restaurant_id, item.restaurant_name, item.name, item.price, item.quantity]
      );
    }

    if (userId && phoneNumber) {
      await client.query(
        `UPDATE users SET phone_number = $1 WHERE id = $2 AND (phone_number IS NULL OR phone_number = '')`,
        [phoneNumber, userId]
      );
    }

    await client.query('COMMIT');
    return order;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getUserOrders = async (userId: number) => {
  const ordersResult = await pool.query(
    `SELECT o.*, r.name as restaurant_name
     FROM orders o
     LEFT JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
  const orders = ordersResult.rows;

  for (const order of orders) {
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
      [order.id]
    );
    order.items = itemsResult.rows;
  }

  return orders;
};


export const getAvailableOrders = async () => {
  const ordersResult = await pool.query(
    `SELECT o.*, COALESCE(o.phone_number, u.phone_number) as phone_number, u.username as customer_username, r.name as restaurant_name
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     LEFT JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.status = 'ready_to_deliver' AND o.delivery_partner_id IS NULL
     ORDER BY o.created_at ASC`
  );
  const orders = ordersResult.rows;

  for (const order of orders) {
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
      [order.id]
    );
    order.items = itemsResult.rows;
  }
  return orders;
}

export const pickOrder = async (orderId: number, deliveryPartnerId: number) => {
  const result = await pool.query(
    `UPDATE orders
     SET status = 'out_for_delivery',
         delivery_partner_id = $1,
         picked_at = CURRENT_TIMESTAMP
     WHERE id = $2
       AND status = 'ready_to_deliver'
       AND delivery_partner_id IS NULL
     RETURNING *`,
    [deliveryPartnerId, orderId]
  );
  return result.rows[0] || null;
};

export const getMyDeliveries = async (deliveryPartnerId: number) => {
  const ordersResult = await pool.query(
    `SELECT o.*, COALESCE(o.phone_number, u.phone_number) as phone_number, u.username as customer_username, r.name as restaurant_name
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     LEFT JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.delivery_partner_id = $1
     ORDER BY o.picked_at DESC`,
    [deliveryPartnerId]
  );
  const orders = ordersResult.rows;

  for (const order of orders){
    const itemsresult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
      [order.id]
    );
    order.items = itemsresult.rows;
  }
  return orders;
};

export const markOrderDelivered = async (orderId: number, deliveryPartnerId: number) => {
  const result = await pool.query(
    `UPDATE orders
     SET status = 'delivered',
         delivered_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND delivery_partner_id = $2
       AND status = 'out_for_delivery'
     RETURNING *`,
    [orderId, deliveryPartnerId]
  );
  return result.rows[0] || null;
};


export const getRestaurantOwnerOrders = async (userId: number) => {
  const ordersResult = await pool.query(
    `SELECT o.*, u.username as customer_username, r.name as restaurant_name
     FROM orders o
     JOIN restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
     LEFT JOIN users u ON o.user_id = u.id
     LEFT JOIN restaurants r ON o.restaurant_id = r.id
     WHERE ro.user_id = $1 AND ro.is_active = TRUE
     ORDER BY o.created_at DESC`,
    [userId]
  );
  const orders = ordersResult.rows;
  for (const order of orders) {
    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC`,
      [order.id]
    );
    order.items = itemsResult.rows;
  }
  return orders;
};
export const updateOrderStatusByOwner = async (orderId: number, userId: number) => {
  const result = await pool.query(
    `UPDATE orders
     SET status = 'ready_to_deliver'
     WHERE id = $1
       AND status = 'preparing'
       AND EXISTS (
         SELECT 1 FROM restaurant_owners ro
         WHERE ro.restaurant_id = orders.restaurant_id
           AND ro.user_id = $2
           AND ro.is_active = TRUE
       )
     RETURNING *`,
    [orderId, userId]
  );
  return result.rows[0] || null;
};
