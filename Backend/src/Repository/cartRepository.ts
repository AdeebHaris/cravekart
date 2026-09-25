import pool from '../db'

export const addToCart = async (userId: number, menuItemId: number, restaurantId:number, quantity: number, price:number)=>{
    try{
        const result = await pool.query(
            `INSERT INTO cart_items (user_id, menu_item_id, restaurant_id, quantity, price)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, menu_item_id, restaurant_id)
            DO UPDATE SET quantity = cart_items.quantity + $4, price = $5, updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [userId, menuItemId, restaurantId, quantity, price]

        );
        return result.rows[0];
    }catch(error){
        console.error('Database error adding to cart', error);
        throw error;
        
    }
}

export const getCartItems = async (userId:number)=>{
    try{
        const result = await pool.query(
            `SELECT ci.id, ci.user_id, ci.menu_item_id, ci.restaurant_id,
            ci.quantity, ci.price,
            mi.name as item_name, mi.description, mi.veg, mi.is_available,
            r.id as restaurant_id_detail, r.name as restaurant_name, r.address as restaurant_address,
            (ci.quantity * ci.price) as subtotal,
            ci.created_at, ci.updated_at
            FROM cart_items ci
            JOIN menu_items mi ON ci.menu_item_id = mi.id
            JOIN restaurants r ON ci.restaurant_id = r.id
            WHERE ci.user_id = $1
            ORDER BY ci.restaurant_id, ci.created_at DESC`,
            [userId]
        );
        return result.rows;
    
    }catch(error){
        console.error('Database error getting cart items:',error);
        throw error;
        
    }


}

export const getCartItem = async (cartItemId: number) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cart_items WHERE id = $1',
      [cartItemId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database error getting cart item:', error);
    throw error;
  }
};

export const updateCartItemQuantity = async (cartItemId: number, quantity: number) => {
  try {
    if (quantity <= 0) {
      return await removeFromCart(cartItemId);
    }

    const result = await pool.query(
      `UPDATE cart_items 
       SET quantity = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [quantity, cartItemId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database error updating cart quantity:', error);
    throw error;
  }
};

export const removeFromCart = async (cartItemId:number)=>{
    try{
        const result = await pool.query(
            `DELETE FROM cart_items WHERE id = $1`,
            [cartItemId]
        );
        return result.rowCount;
    }catch(error){
        console.error('Database error removing from cart', error);
        throw error;
        
    }
}
export const clearCart = async(userId: number)=>{
    try{
        const result = await pool.query(
            `DELETE FROM cart_items WHERE user_id = $1`,
            [userId]
        );
        return result.rowCount;
    }catch(error){
        console.error('Database error clearing cart', error);
        throw error;
        
    }

}


