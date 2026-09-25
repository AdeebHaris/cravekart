import pool from '../db.ts';

export const saveRestaurant = async (restaurant: {
  place_id: string;
  name: string;
  rating: number;
  address: string;
  latitude: number;
  longitude: number;
  is_open: boolean | null;
  photo_url: string | null;
}) => {
  try {
    const result = await pool.query(
      `INSERT INTO restaurants (place_id, name, rating, address, latitude, longitude, is_open, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (place_id) DO UPDATE SET 
         name = EXCLUDED.name, 
         address = EXCLUDED.address,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         photo_url = COALESCE(EXCLUDED.photo_url, restaurants.photo_url)
       RETURNING *`,
      [
        restaurant.place_id,
        restaurant.name,
        restaurant.rating,
        restaurant.address,
        restaurant.latitude,
        restaurant.longitude,
        restaurant.is_open,
        restaurant.photo_url,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error saving restaurant:', error);
    throw error;
  }
};

export const saveMultipleRestaurants = async (restaurants: any[]) => {
  for (const restaurant of restaurants) {
    await saveRestaurant(restaurant);
  }
};

export const getAllRestaurants = async () => {
  const result = await pool.query('SELECT * FROM restaurants ORDER BY id DESC');
  return result.rows;
};

export const getRestaurantById = async (id: number) => {
  const result = await pool.query('SELECT * FROM restaurants WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const searchRestaurants = async (query: string) => {
  const result = await pool.query(
    `SELECT DISTINCT r.* 
    FROM restaurants r
    LEFT JOIN menu_items mi ON r.id = mi.restaurant_id
    WHERE r.name ILIKE $1 
      OR r.address ILIKE $1 
      OR mi.name ILIKE $1
    ORDER BY r.rating DESC
    `,
    [`%${query}%`]
  );
  return result.rows;
};

export const deleteRestaurant = async (identifier: string | number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let restaurantId: number | null = null;
    const num = Number(identifier);

    if (!isNaN(num) && num > 0) {
      restaurantId = num;
    } else {
      const res = await client.query('SELECT id FROM restaurants WHERE place_id = $1', [String(identifier)]);
      if (res.rows.length > 0) {
        restaurantId = res.rows[0].id;
      }
    }

    if (!restaurantId) {
      const delByPlace = await client.query('DELETE FROM restaurants WHERE place_id = $1', [String(identifier)]);
      await client.query('COMMIT');
      return delByPlace.rowCount;
    }

    await client.query('DELETE FROM menu_items WHERE restaurant_id = $1', [restaurantId]);
    await client.query('DELETE FROM cart_items WHERE restaurant_id = $1', [restaurantId]);
    await client.query('DELETE FROM restaurant_owners WHERE restaurant_id = $1', [restaurantId]);
    
    try {
      await client.query('DELETE FROM orders WHERE restaurant_id = $1', [restaurantId]);
    } catch {
      await client.query('UPDATE orders SET restaurant_id = NULL WHERE restaurant_id = $1', [restaurantId]);
    }

    const result = await client.query('DELETE FROM restaurants WHERE id = $1', [restaurantId]);

    await client.query('COMMIT');
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error in deleteRestaurant:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const updateRestaurant = async (restaurantId: number, updates: {
  name?: string;
  rating?: number;
  address?: string;
  is_open?: boolean;
  photo_url?: string;
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

    if (updates.rating !== undefined) {
      setClauses.push(`rating = $${paramCount}`);
      values.push(updates.rating);
      paramCount++;
    }

    if (updates.address !== undefined) {
      setClauses.push(`address = $${paramCount}`);
      values.push(updates.address);
      paramCount++;
    }

    if (updates.is_open !== undefined) {
      setClauses.push(`is_open = $${paramCount}`);
      values.push(updates.is_open);
      paramCount++;
    }

    if (updates.photo_url !== undefined) {
      setClauses.push(`photo_url = $${paramCount}`);
      values.push(updates.photo_url);
      paramCount++;
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }


    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    
    values.push(restaurantId);

    const query = `
      UPDATE restaurants 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log('Update query:', query);
    console.log('Values:', values);

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database error updating restaurant:', error);
    throw error;
  }
};