import { getRestaurantId, getMenuItem, saveMenuItems, createMenuItem, deleteMenuItem as deleteMenuItemDB, searchMenuItems as searchMenuItemsDB,updateMenuItem as updateMenuItemDB, getMenuItemById, bulkUpdateDiscount  } from '../Repository/menuRepository';
import { fetchMenuFromGroq, generateItemDescriptions  } from '../services/menuServices';
import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.ts';
import { broadcastMenuEvent } from '../services/sseService';
import { parseSearchQueryWithGroq } from '../services/menuServices';
import { searchMenuItemsWithAIFilters } from '../Repository/menuRepository';

export const getMenu = async (req:Request, res:Response) => {
  const restaurantName = String(req.params.restaurantName);
  
  const restaurantId = await getRestaurantId(restaurantName);
  if (!restaurantId) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  
  let items = await getMenuItem(restaurantId);

 
  if (!items || items.length === 0) {
    console.log(`No menu found for "${restaurantName}". Generating via Groq AI...`);
    const generatedItems = await fetchMenuFromGroq(restaurantName);
    await saveMenuItems(restaurantId, generatedItems);
    items = await getMenuItem(restaurantId);
  }

  res.json(items);
};

// export const saveMenu = async (req: Request, res: Response) => {
//   const restaurantName = String(req.params.restaurantName);
  
//   const restaurantId = await getRestaurantId(restaurantName);
//   if (!restaurantId) {
//     return res.status(404).json({ error: 'Restaurant not found' });
//   }
  
//   const items = await fetchMenuFromGroq(restaurantName);
//   await saveMenuItems(restaurantId, items);
//   res.json(items);
// };

export const addMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof req.restaurantId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const restaurantId:number = req.restaurantId;
    const { name, price, description, veg, discount } = req.body;

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0 || priceNum > 99999999.99) {
      return res.status(400).json({ error: 'Price must be a valid amount up to ₹99,999,999.99' });
    }

    const menuItem = await createMenuItem(restaurantId, {
      name,
      price: priceNum,
      description,
      veg: Boolean(veg),
      discount: discount !== undefined ? Math.min(100, Math.max(0, Number(discount))) : 0,
    });

    broadcastMenuEvent({
      type: 'MENU_ITEM_ADDED',
      restaurantId,
      item: menuItem,
    });

    res.status(201).json({ message: 'Menu item added successfully', menuItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    const deleted = await deleteMenuItemDB(Number(itemId));

    if (deleted === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const restaurantId = req.restaurantId ?? 0;
    broadcastMenuEvent({
      type: 'MENU_ITEM_DELETED',
      restaurantId,
      itemId: Number(itemId),
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
};

export const searchMenuItems = async (req: Request, res: Response) => {
  try {
    const { q} = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const items = await searchMenuItemsDB(String(q));
    
    res.json(items);
  } catch (error) {
    console.error('Search menu error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { name, price, description, veg, discount } = req.body;

   

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    if (typeof req.restaurantId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const restaurantId:number = req.restaurantId;

    
    const menuItem = await getMenuItemById(Number(itemId));
    console.log('Menu item found:', menuItem);

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }


    if (menuItem.restaurant_id !== restaurantId) {
      return res.status(400).json({ 
        error: 'Menu item does not belong to this restaurant' 
      });
    }

    if (name === undefined && price === undefined && description === undefined && veg === undefined && discount === undefined) {
      return res.status(400).json({ 
        error: 'At least one field required to update: name, price, description, veg, discount' 
      });
    }

    
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ error: 'Name must be a string' });
    }

    if (price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0 || priceNum > 99999999.99) {
        return res.status(400).json({ error: 'Price must be a valid amount up to ₹99,999,999.99' });
      }
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    if (veg !== undefined && typeof veg !== 'boolean') {
      return res.status(400).json({ error: 'Veg must be a boolean' });
    }

    if (discount !== undefined) {
      const discountNum = Number(discount);
      if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
        return res.status(400).json({ error: 'Discount must be between 0 and 100' });
      }
    }


    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined) updates.price = Number(price);
    if (description !== undefined) updates.description = description.trim();
    if (veg !== undefined) updates.veg = veg;
    if (discount !== undefined) updates.discount = Number(discount);

    console.log('Updates to apply:', updates);
    console.log('Calling updateMenuItemDB...');

  
    const updatedItem = await updateMenuItemDB(Number(itemId), updates);

    console.log('Update completed:', updatedItem);
    
    broadcastMenuEvent({
      type: 'MENU_ITEM_UPDATED',
      restaurantId,
      item: updatedItem,
    });

    res.json({
      message: 'Menu item updated successfully',
      menuItem: updatedItem
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
};

export const toggleMenuItemAvailability = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (typeof req.restaurantId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    const menuItem = await getMenuItemById(Number(itemId));
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (menuItem.restaurant_id !== req.restaurantId) {
      return res.status(403).json({ error: 'Menu item does not belong to your restaurant' });
    }

    const newAvailability = !(menuItem.is_available ?? true);
    const updatedItem = await updateMenuItemDB(Number(itemId), { is_available: newAvailability });

    broadcastMenuEvent({
      type: 'MENU_ITEM_UPDATED',
      restaurantId: req.restaurantId,
      item: updatedItem,
    });

    res.json({
      message: newAvailability ? 'Item marked as In Stock' : 'Item marked as Out of Stock',
      menuItem: updatedItem,
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Failed to toggle item availability' });
  }
};

export const suggestItemDescriptions = async (req: AuthRequest, res: Response)=>{
  try{
    const { name, veg, restaurantName } = req.body;

    if(!name || typeof name !== 'string' || name.trim().length <2){
      return res.status(400).json({ error: 'Item name is required (min 2 characters)'})
    }

    if(!restaurantName || typeof restaurantName !=='string'){
      return res.status(400).json({ error: 'Restaurant name is required '});
    }

    const descriptions = await generateItemDescriptions(
      name.trim(),
      Boolean(veg),
      restaurantName.trim()
    );

    res.json({ descriptions })
  }catch(error: any){
    console.error('Description suggestion error:', error);
    res.status(500).json({ error: 'Failed to generate descriptions. Please try again.'})
  }
}

export const bulkUpdateMenuDiscount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (typeof req.restaurantId !== 'number') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const restaurantId: number = req.restaurantId;
    const { discount } = req.body;
    if (discount === undefined || discount === null) {
      return res.status(400).json({ error: 'discount is required' });
    }
    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      return res.status(400).json({ error: 'Discount must be between 0 and 100' });
    }
    const updatedItems = await bulkUpdateDiscount(restaurantId, Math.round(discountNum));
    broadcastMenuEvent({
      type: 'MENU_ITEMS_BULK_UPDATED',
      restaurantId,
      items: updatedItems,
    });
    res.json({ message: 'Discount applied to all menu items', items: updatedItems });
  } catch (error) {
    console.error('Bulk discount error:', error);
    res.status(500).json({ error: 'Failed to apply bulk discount' });
  }
};

export const aiSearchMenuItems = async (req: Request, res: Response) => {
  try {
    const { query, restaurantName } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const intent = await parseSearchQueryWithGroq(query.trim());
    const { restaurants, items } = await searchMenuItemsWithAIFilters(
      intent,
      restaurantName ? String(restaurantName).trim() : undefined
    );
    res.json({
      summary: intent.summary,
      intent,
      restaurants,
      items
    });
  } catch (error: any) {
    console.error('AI search controller error:', error);
    res.status(500).json({ error: 'Failed to process AI search request' });
  }
};