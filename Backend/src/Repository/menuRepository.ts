import pool from '../db'

export const getRestaurantId = async (restaurantName: string) =>{
    const result = await pool.query(
        'SELECT id FROM restaurants WHERE name = $1',
        [restaurantName]
    );
    return result.rows.length > 0? result.rows[0].id: null;
}

export const getMenuItem = async (restaurantId: number) =>{
    const result = await pool.query(
        'SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY id ASC',
        [restaurantId]
    );
    return result.rows.map(row => ({
        ...row,
        discount: Number(row.discount || 0)
    }));
}

export const saveMenuItems = async(restaurantId: number, items: any[]) =>{
    for(const item of items){
        await pool.query(
            'INSERT INTO menu_items (restaurant_id, name, price, description, veg) VALUES ($1, $2, $3, $4, $5)',
            [restaurantId, item.name, item.price, item.description, item.veg]
        )
    }
}


export const createMenuItem = async (restaurantId: number, item: {
  name: string;
  price: number;
  description?: string;
  veg: boolean;
  discount?: number;
}) => {
  const result = await pool.query(
    'INSERT INTO menu_items (restaurant_id, name, price, description, veg, discount) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [restaurantId, item.name, item.price, item.description || '', item.veg, item.discount || 0]
  );
  return result.rows[0];
}

export const deleteMenuItem = async (itemId: number) => {
  const result = await pool.query(
    'DELETE FROM menu_items WHERE id = $1',
    [itemId]
  );
  return result.rowCount;
}

export const getMenuItemById = async (itemId: number) => {
  const result = await pool.query(
    'SELECT * FROM menu_items WHERE id = $1',
    [itemId]
  );
  return result.rows[0] || null;
}


export const searchMenuItems = async (query: string, restaurantId?: number) => {
  let sql = `SELECT * FROM menu_items WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY name ASC`;
  let params: any[] = [`%${query}%`];


  const result = await pool.query(sql, params);
  return result.rows;
}

export const updateMenuItem = async (itemId: number, updates: {
  name?: string;
  price?: number;
  description?: string;
  veg?: boolean;
  is_available?: boolean;
  discount?: number;
}) => {
  try {
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.price !== undefined) {
      setClauses.push(`price = $${paramCount}`);
      values.push(updates.price);
      paramCount++;
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramCount}`);
      values.push(updates.description);
      paramCount++;
    }

    if (updates.veg !== undefined) {
      setClauses.push(`veg = $${paramCount}`);
      values.push(updates.veg);
      paramCount++;
    }

    if (updates.is_available !== undefined) {
      setClauses.push(`is_available = $${paramCount}`);
      values.push(updates.is_available);
      paramCount++;
    }

    if (updates.discount !== undefined) {
      setClauses.push(`discount = $${paramCount}`);
      values.push(updates.discount);
      paramCount++;
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(itemId);

    const query = `
      UPDATE menu_items 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log('Update menu item query:', query);
    console.log('Values:', values);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database error updating menu item:', error);
    throw error;
  }
};


export const bulkUpdateDiscount = async (restaurantId: number, discount: number) => {
  const result = await pool.query(
    'UPDATE menu_items SET discount = $1 WHERE restaurant_id = $2 RETURNING *',
    [discount, restaurantId]
  );
  return result.rows;
};

import { AISearchIntent } from '../services/menuServices';

export const searchMenuItemsWithAIFilters = async (
  intent: AISearchIntent,
  restaurantNameFilter?: string
) => {
  if (intent.isValidQuery === false) {
    return { restaurants: [], items: [] };
  }

  const targetRestaurant = restaurantNameFilter || intent.restaurantName;
  const hasPriceOrVegFilter = (intent.maxPrice !== null && intent.maxPrice > 0) || intent.veg !== null;

  if (!targetRestaurant && (!intent.keywords || intent.keywords.length === 0) && !hasPriceOrVegFilter) {
    return { restaurants: [], items: [] };
  }

  let conditions: string[] = [];
  let params: any[] = [];
  let paramIdx = 1;

  if (targetRestaurant) {
    params.push(`%${targetRestaurant}%`);
    conditions.push(`r.name ILIKE $${paramIdx++}`);
  } else if (intent.keywords && intent.keywords.length > 0) {
    const keywordConditions = intent.keywords.map(kw => {
      params.push(`%${kw}%`);
      const p = paramIdx++;
      return `(m.name ILIKE $${p} OR m.description ILIKE $${p} OR r.name ILIKE $${p})`;
    });
    conditions.push(`(${keywordConditions.join(' OR ')})`);
  }

  if (intent.veg !== null) {
    params.push(intent.veg);
    conditions.push(`m.veg = $${paramIdx++}`);
  }

  if (intent.maxPrice !== null && intent.maxPrice > 0) {
    params.push(intent.maxPrice);
    conditions.push(`m.price <= $${paramIdx++}`);
  }

  conditions.push(`(m.is_available = TRUE OR m.is_available IS NULL)`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      m.id as item_id,
      m.name as item_name,
      m.price,
      m.description,
      m.veg,
      m.discount,
      m.is_available,
      r.id as restaurant_id,
      r.name as restaurant_name,
      r.photo_url,
      r.rating,
      r.address
    FROM menu_items m
    JOIN restaurants r ON m.restaurant_id = r.id
    ${whereClause}
    ORDER BY m.price ASC;
  `;

  const result = await pool.query(sql, params);
  const rows = result.rows;

  // Group items by restaurant for easy rendering on RestaurantsPage
  const restaurantMap = new Map<number, any>();
  const allItems: any[] = [];

  for (const row of rows) {
    const item = {
      id: row.item_id,
      name: row.item_name,
      price: Number(row.price),
      description: row.description,
      veg: row.veg,
      discount: Number(row.discount || 0),
      is_available: row.is_available,
      restaurant_id: row.restaurant_id,
      restaurant_name: row.restaurant_name
    };

    if (!restaurantMap.has(row.restaurant_id)) {
      restaurantMap.set(row.restaurant_id, {
        id: row.restaurant_id,
        name: row.restaurant_name,
        photo_url: row.photo_url,
        rating: row.rating,
        address: row.address,
        matchedItems: []
      });
    }

    const isDishMatch = intent.keywords && intent.keywords.length > 0
      ? intent.keywords.some(kw => {
          const k = kw.toLowerCase().trim();
          return k.length > 1 && (
            row.item_name.toLowerCase().includes(k) ||
            (row.description && String(row.description).toLowerCase().includes(k))
          );
        })
      : true;

    if (isDishMatch) {
      allItems.push(item);
      restaurantMap.get(row.restaurant_id).matchedItems.push(item);
    }
  }

  return {
    restaurants: Array.from(restaurantMap.values()),
    items: allItems
  };
};
