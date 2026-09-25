import pool from '../db'
import bcrypt from 'bcrypt'



export const checkSuperAdminExists = async () => {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND is_active = TRUE LIMIT 1',
      ['super_admin']
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database error checking super admin:', error);
    throw error;
  }
};



export const createUser = async (user:{username: string; email: string; password: string; first_name: string; last_name: string; role?: string}) =>{
    try{
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, email, password, first_name, last_name, role, login_method) VALUES ($1, $2, $3, $4, $5, $6, 'local')
            RETURNING id, username, email, first_name, last_name, role, created_at`,
            [user.username, user.email,hashedPassword, user.first_name, user.last_name, user.role || 'user']

        );
        return result.rows[0];
    }catch(error){
        console.error('Error creating user:', error);
        throw error;

    }
};

export const getUserByUsername = async (username:string) =>{
    const result = await pool.query(
        `SELECT * FROM users WHERE username = $1 AND is_active = TRUE`,
        [username]
    )
    return result.rows[0] || null;
};

export const getUserByEmail = async (email : string) =>{
    const result = await pool.query(
        `SELECT * FROM users WHERE email = $1 AND is_active= TRUE`,
        [email]
    );
    return result.rows[0];
};

export const getUserByUsernameAll = async (username: string) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
};

export const getUserByEmailAll = async (email: string) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};


export const getUserById = async (id:number) =>{
    const result = await pool.query(
        `SELECT id, username, email, first_name, last_name, avatar_url, role, created_at FROM users where id = $1`,
        [id]    
    );
    return result.rows[0];
};

export const createOrUpdateGoogleUser = async (googleUser: any) =>{
    const exists = await pool.query(
        `SELECT * FROM users WHERE auth0_id = $1`,
        [googleUser.sub]
    );

    if(exists.rows.length === 0){
        const result = await pool.query(
            `INSERT INTO users (auth0_id, username, email, first_name, last_name, avatar_url, role, login_method)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'google')
            RETURNING id, username, email, first_name, last_name, role, created_at`,
            [googleUser.sub, googleUser.nickname || googleUser.email.split('@')[0], googleUser.email, googleUser.given_name, googleUser.family_name, googleUser.picture, 'user']
        );
        return result.rows[0];
    }else{
        return exists.rows[0]
    }
}

export const updateUserRole = async (userId: number, newRole: string)=>{
    const validRoles = ['user', 'restaurant_owner', 'admin', 'super_admin', 'delivery_partner'];

    if(!validRoles.includes(newRole)){
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(',')}`);
    }

    const result = await pool.query(
        `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [newRole, userId]
        
    )
    return result.rows[0]
}



export const assignRestaurantOwner = async (userId: number, restaurantId: number) => {
  try {
    
    await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['restaurant_owner', userId]
    );

   
    const result = await pool.query(
      `INSERT INTO restaurant_owners (user_id, restaurant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, restaurant_id) DO NOTHING
       RETURNING *`,
      [userId, restaurantId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error assigning restaurant owner:', error);
    throw error;
  }
};

export const getRestaurantsByOwner = async (userId: number) => {
  const result = await pool.query(
    `SELECT r.* FROM restaurants r
     JOIN restaurant_owners ro ON r.id = ro.restaurant_id
     WHERE ro.user_id = $1 AND ro.is_active = TRUE`,
    [userId]
  );
  return result.rows;
};

export const getRestaurantOwner = async (userId: number, restaurantId: number) => {
  const result = await pool.query(
    `SELECT * FROM restaurant_owners
     WHERE user_id = $1 AND restaurant_id = $2 AND is_active = TRUE`,
    [userId, restaurantId]
  );
  return result.rows[0] || null;
};

export const removeRestaurantOwner = async (userId: number, restaurantId: number) => {
  const result = await pool.query(
    'UPDATE restaurant_owners SET is_active = FALSE WHERE user_id = $1 AND restaurant_id = $2',
    [userId, restaurantId]
  );
  return result.rowCount;
};

export const updateUser = async (userId: number, updates:{
    username?: string;
    first_name?: string;
    last_name?: string;
    email?:string;
    avatar_url?:string;
    phone?:string;
})=>{
    try{
        const setClauses=[];
        const values=[];
        let paramCount=1;

        if(updates.username !== undefined){
            setClauses.push(`username = $${paramCount++}`);
            values.push(updates.username);
        }
        if(updates.first_name !==undefined){
            setClauses.push(`first_name = $${paramCount++}`);
            values.push(updates.first_name)
        }
        if(updates.last_name !== undefined){
            setClauses.push(`last_name =$${paramCount++}`);
            values.push(updates.last_name)
        }
        if(updates.email !== undefined){
            setClauses.push(`email = $${paramCount++}`);
            values.push(updates.email)
        }
        if(updates.avatar_url !== undefined){
            setClauses.push(`avatar_url = $${paramCount++}`);
            values.push(updates.avatar_url)
        }
        if(updates.phone !== undefined){
            setClauses.push(`phone=$${paramCount++}`);
            values.push(updates.phone);
        }

        if(setClauses.length === 0){
            throw new Error('No fields to update');
        }
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(userId);


        const query = `
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, username, email, first_name, last_name, avatar_url, role, created_at`;

        const result = await pool.query(query, values);
        return result.rows[0] || null;

    }catch(error){
        console.error('Database error updating user:', error);
        throw error;
        
    }
}

export const deleteUser = async (userId: number) => {
  try {
    
    const result = await pool.query(
      'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
    return result.rowCount;
  } catch (error) {
    console.error('Database error deleting user:', error);
    throw error;
  }
};

export const changePassword = async (userId: number, newPassword: string) => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email',
      [hashedPassword, userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database error changing password:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.username, u.email, u.role, u.first_name, u.last_name, u.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id', r.id, 'name', r.name))
           FROM restaurant_owners ro
           JOIN restaurants r ON ro.restaurant_id = r.id
           WHERE ro.user_id = u.id AND ro.is_active = TRUE),
          '[]'::json
        ) as owned_restaurants
      FROM users u
      WHERE u.is_active = TRUE
      ORDER BY u.id ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Database error fetching all users:', error);
    throw error;
  }
};

