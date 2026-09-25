import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.ts';
import {
  addToCart as addToCartDB,
  getCartItems as getCartItemsDB,
  getCartItem as getCartItemDB,
  updateCartItemQuantity as updateCartItemQuantityDB,
  removeFromCart as removeFromCartDB,
  clearCart as clearCartDB
} from '../Repository/cartRepository.ts';
import { getMenuItemById } from '../Repository/menuRepository.ts';
import { getRestaurantById } from '../Repository/restaurantRepository.ts';


export const addToCart = async (req: AuthRequest, res: Response)=>{
    try{
        if(!req.user){
            return res.status(401).json({error:'Not Authenticated'});
        }
        

        const menuItemId = Number(req.body.menuItemId);
        const restaurantId = Number(req.body.restaurantId);
        const quantity = Number(req.body.quantity);
        
        if (!menuItemId || !restaurantId || !quantity) {
            return res.status(400).json({ 
                error: 'menuItemId, restaurantId, and quantity required' 
            });
        }
        if (quantity <= 0) {
            return res.status(400).json({ error: 'Quantity must be greater than 0' });
        }

        const menuItem = await getMenuItemById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        const restaurant = await getRestaurantById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }
        if (menuItem.restaurant_id !== restaurantId) {
            return res.status(400).json({ 
                error: 'Menu item does not belong to this restaurant' 
            });
        }
        const discountVal = Number(menuItem.discount || 0);
        const effectivePrice = discountVal > 0
            ? Math.round(Number(menuItem.price) * (1 - discountVal / 100))
            : Number(menuItem.price);

        const cartItem = await addToCartDB(
            req.user.id,
            menuItemId,
            restaurantId,
            quantity,
            effectivePrice
        );
        res.status(201).json({
            message: 'Item added to cart successfully',
            cartItem
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
}

export const getCart = async (req:AuthRequest, res: Response)=>{
    try{
        if(!req.user){
            return res.status(401).json({error: 'Not authenticated'});
        }

        const cartItems = await getCartItemsDB(req.user.id);
        
        res.json({
            message: 'Cart retrieved successfully',
            items: cartItems
        });
    }catch(error){
        console.error('Get cart error', error);
        res.status(500).json({error:'Failed to get cart'});
        
    }
};

export const updateCartItemQuantity = async (req: AuthRequest, res: Response) =>{
    try{
        if(!req.user){
        return res.status(401).json({error:'Not Authenticated'});
        }
        
        const { cartItemId } = req.params;
        const { quantity } = req.body;
        
        if(!cartItemId || quantity === undefined){
            return res.status(400).json({error: 'cartItemId and quantity required'})
        }

        if(quantity <=0){
            return res.status(400).json({error: 'Quantity must be greater than o'})
        }

        const cartItem = await getCartItemDB(Number(cartItemId));
        if(!cartItem){
            return res.status(404).json({error:'cart item not found'});
        }

        const updatedItem = await updateCartItemQuantityDB(Number(cartItemId), quantity);
        res.json({
            message: 'Cart item quantity updated successfully',
            item: updatedItem
        })
    }catch(error){
        console.error('Updated cart item error::',error);
        res.status(500).json({error: 'Failed to update cart item'})
        
    }
}

export const removeFromCart = async (req: AuthRequest, res: Response)=>{
    try{
        if(!req.user){
            return res.status(401).json({error:'Not Authenticated'});
        }

        const { cartItemId } = req.params;
        if(!cartItemId){
            return res.status(400).json({error:'cartItemId required'})
        }

        const cartItem = await getCartItemDB(Number(cartItemId));
        if(!cartItem){
            return res.status(404).json({error: 'Cart item not found'});
        }

        const deleted = await removeFromCartDB(Number(cartItemId));

        res.json({message:'Item removed from cart successfully'});
        
    }catch(error){
        console.error('Remove from cart error:', error);
        res.status(500).json({error:'Failed to remove item from cart'})
        
    }
}

export const clearCartItems = async (req:AuthRequest, res: Response)=>{
    try{
        if(!req.user){
            return res.status(401).json({error:'Not Authenticated'});
        }

        const cleared = await clearCartDB(req.user.id);
        res.json({
            message: 'Cart cleared successfully',
            itesRemoved: cleared
        });
    }catch(error){
        console.error('Clear cart error',error);
        res.status(500).json({ error: 'Failed to clear cart'})
        
    }
}