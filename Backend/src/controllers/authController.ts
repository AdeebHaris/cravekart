import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db'
import jwt from 'jsonwebtoken'
import { 
  checkSuperAdminExists,
  createUser, 
  getUserByUsername, 
  getUserByEmail, 
  createOrUpdateGoogleUser, 
  updateUserRole,
  assignRestaurantOwner,  
  getUserById,
  removeRestaurantOwner,
  getRestaurantsByOwner,
  updateUser,
  deleteUser,
  changePassword as changePasswordDB,   
  getAllUsers
} from '../Repository/userRepository'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  createSession,
  isSessionValid,
  deleteSession,
} from '../Repository/tokenRepository.ts';
import { AuthRequest } from '../middlewares/authMiddleware';


export const register = async (req: Request, res: Response) => {
    try{ 
        const { username, email, password, first_name, last_name } = req.body;

        

        const existingUser = await getUserByUsername(username);
        if(existingUser){
            return res.status(409).json({ error: 'Username already exists'})
        }
        const existingEmail = await getUserByEmail(email);
        if(existingEmail){
            return res.status(409).json({
                error: 'Email already exists'
            })
        }

        const user = await createUser({
            username, 
            email,
            password, 
            first_name,
            last_name,
            role: 'user'
        });
        
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        })
    } catch(error){
        console.error('Registration error', error)
        res.status(500).json({
            error: 'Registration failed'
        })
    }
}


export const setupFirstAdmin = async (req: Request, res: Response) => {
  try {
    const { username, email, password, first_name, last_name } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        error: 'All fields required: username, email, password, first_name, last_name'
      });
    }

   
    const superAdminExists = await checkSuperAdminExists();
    if (superAdminExists) {
      return res.status(403).json({
        error: 'Super admin already exists.'
      });
    }


    const user = await createUser({
      username,
      email,
      password,
      first_name,
      last_name,
      role:'super_admin'
    });

    res.status(201).json({
      message: 'Super admin created successfully',
      user
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
};


export const login = async (req: Request, res: Response) => {
    try{
        const { username, password } = req.body;
 
        let user = await getUserByUsername(username);
        if (!user) {
            user = await getUserByEmail(username);
        }

        if(!user){
            return res.status(401).json({
                error: 'Invalid credentials'
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const sessionId = await createSession(user.id);

        const payload = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          sessionId
        };


        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

       

        res.json({
          message: 'Login successful',
          accessToken,      
          refreshToken,     
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            sessionId: sessionId
          }
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
        }
};

export const googleLogin = async (req: Request, res: Response) => {
    try{
       const { googleToken } = req.body
       
        const googleUser = await verifyGoogleToken(googleToken);

        if(!googleUser){
            return res.status(401).json({
                error: 'Invalid Google token'
            })
        }
        
        const user = await createOrUpdateGoogleUser(googleUser);
        const sessionId = await createSession(user.id);

        const payload = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          sessionId
        };

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not set in environment variables');
        }

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);
        
        res.json({
            message: 'Google login successful',
            accessToken,
            refreshToken,
            user
        });
    } catch(error){
        console.error('Google login error:', error);
        res.status(500).json({
            error: 'Google login failed'
        })
    }
};


export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

   
    const decoded = verifyRefreshToken(refreshToken) as any;
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

  
    const sessionActive = await isSessionValid(decoded.sessionId);
    if (!sessionActive) {
      return res.status(401).json({ error: 'Session expired or logged out' });
    }


    
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId   
    });

    res.json({
      message: 'Access token refreshed',
      accessToken: newAccessToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await deleteSession(req.user.sessionId);


    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const assignAdminRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const user = await getUserById(userId);
    if(!user){
        return res.status(400).json({
            errir: 'userId not found'
        })
    }
    // if(user.role ==='restaurant_owner'){
    //     return res.status(400).json({ 
    //         error: 'The user is a restaurant owner.' 
    //   });
    // }

    if(user.role ==='super_admin'){
        return res.status(400).json({
            error: 'Cannot downgrade super_admin role'
        })
    }
    if (user.role === 'admin') {
      return res.status(400).json({ 
        error: 'User is already admin' 
      });
    }
    
    const updatedUser = await updateUserRole(userId, 'admin');

    res.json({ 
      message: 'Admin role assigned successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Role assignment error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const removeAdminRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const user = await getUserById(userId);
    if(!user){
        return res.status(404).json({error: 'User not found'})
    }

    if(user.role !=='admin'){
        return res.status(400).json({
            error:`User is not admin. Current role:${user.role}.`
        })
    }

   
    const updatedUser = await updateUserRole(userId, 'user');

    res.json({ 
      message: 'Admin role removed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Role removal error:', error);
    res.status(500).json({ error: String(error) });
  }
};


export const assignRestaurantOwnerRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, restaurantId } = req.body;

    if (!userId || !restaurantId) {
      return res.status(400).json({ 
        error: 'userId and restaurantId required' 
      });
    }

    const user = await getUserById(userId);  
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(400).json({ 
        error: `Cannot change ${user.role} role to restaurant_owner` 
      });
    }
    
    await assignRestaurantOwner(userId, restaurantId);
    const updatedUser = await getUserById(userId);

    res.json({ 
      message: 'Restaurant owner role assigned successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Role assignment error:', error);
    res.status(500).json({ error: String(error) });
  }
};


export const removeRestaurantOwnerRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, restaurantId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const user = await getUserById(userId);  
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'restaurant_owner') {
      return res.status(400).json({ 
        error: `User is not a restaurant owner. Current role: ${user.role}` 
      });
    }

    if (restaurantId) {
      const removed = await removeRestaurantOwner(userId, restaurantId);
      if (removed === 0) {
        return res.status(404).json({ 
          error: 'Restaurant ownership not found' 
        });
      }

      const activeRestaurants = await getRestaurantsByOwner(userId);
      if (activeRestaurants.length === 0) {
        await updateUserRole(userId, 'user');
      }
    } else {
      await pool.query(
        'UPDATE restaurant_owners SET is_active = FALSE WHERE user_id = $1',
        [userId]
      );
      await updateUserRole(userId, 'user');
    }

    res.json({ 
      message: 'Restaurant owner role removed successfully' 
    });
  } catch (error) {
    console.error('Role removal error:', error);
    res.status(500).json({ error: String(error) });
  }
};


async function verifyGoogleToken(token: string){
    try{
        const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
        );
        
        if(!response.ok){
            console.error('Token verification failed');
            return null;
        }
        
        const data = await response.json()

        return {
            sub: data.sub,
            email: data.email,
            given_name: data.name?.split(' ')[0],
            family_name: data.name?.split(' ')[1],
            picture: data.picture,
            nickname: data.email.split('@')[0]
        }
    } catch(error){
        console.error('Google token verification failed:', error);
        return null
    }
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;  
    const { username, first_name, last_name, email, avatar_url, phone } = req.body;

    if (!username && !first_name && !last_name && !email && !avatar_url && !phone) {
      return res.status(400).json({ 
        error: 'At least one field required to update' 
      });
    }

    if (username) {
      const existingUser = await getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Username already in use' });
      }
    }
    
    if (email) {
      const existingUser = await getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updates: any = {};
    if (username) updates.username = username.trim();
    if (first_name) updates.first_name = first_name.trim();
    if (last_name) updates.last_name = last_name.trim();
    if (email) updates.email = email.trim();
    if (avatar_url) updates.avatar_url = avatar_url;
    if (phone) updates.phone = phone;

    const updatedUser = await updateUser(userId, updates);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  try {

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let userIdToDelete: number;

    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId required for admin deletion' });
      }
      
      userIdToDelete = userId;
    } else {
     
      userIdToDelete = req.user.id;
    }

    
    const user = await getUserById(userIdToDelete);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_active===false) {
      return res.status(400).json({ error: 'User is already inactive' });
    }

    const deleted = await deleteUser(userIdToDelete);

    if (deleted === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User deleted successfully',
      userId: userIdToDelete
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};        

export const changePassword = async (req:AuthRequest, res: Response)=>{
  try{
    if(!req.user){
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if(!oldPassword || !newPassword || !confirmPassword){
      return res.status(400).json({
        error: 'oldPassword, newPassword, and confirmPassword are required'
      });
    }

    if(newPassword !== confirmPassword){
      return res.status(400).json({
        error:' New passswords do not match'
      });
    }
    if( oldPassword === newPassword ){
      return res.status(400).json({
        error:'New password must be different from old password'
      });
    }

    

    const updatedUser = await changePasswordDB(userId, newPassword);

    res.json({
      message: 'Password changed successfully',
      user: updatedUser
    })
  }catch(error){
    console.error('Change password error', error);
    res.status(500).json({error:'Failed to change password'});
    
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

export const assignDeliveryPartnerRole = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin' || user.role === 'super_admin' || user.role ==='restaurant_owner') {
      return res.status(400).json({
        error: `Cannot change ${user.role} role to delivery_partner`
      });
    }
    if (user.role === 'delivery_partner') {
      return res.status(400).json({ error: 'User is already a delivery partner' });
    }
    const updatedUser = await updateUserRole(userId, 'delivery_partner');
    res.json({
      message: 'Delivery partner role assigned successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Assign delivery partner error:', error);
    res.status(500).json({ error: String(error) });
  }
};

export const removeDeliveryPartnerRole = async (req: AuthRequest, res: Response) =>{
  try{
    const { userId } =req.body;

    if(!userId){
      return res.status(400).json({error: 'userId required'});
    }

    const user = await getUserById(userId);

    if(!user){
      return res.status(404).json({error: 'User not found'})
    }

    if(user.role !== 'delivery_partner'){
      return res.status(400).json({error: `User is not a delivery partner. Current role: ${user.role}`});
    }

    const updateUser = await updateUserRole(userId, 'user');

    res.json({
      message:' Delivery partner role removed successfully',
      user: updateUser
    });
  }catch(error){
    console.error('Remove delivery partner error:',error);
    res.status(500).json({error: String(error)});
    
  }
}