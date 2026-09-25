import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware.ts';
import { getUserById } from '../Repository/userRepository.ts';


export const authorize = (allowedRoles:string[])=>{
    return async (req: AuthRequest, res: Response, next: NextFunction) =>{
        try{
            if(!req.user){
                return res.status(401).json({error: 'Not authenticated'});

            }
            const user = await getUserById(req.user.id);

            if(!user){
                return res.status(404).json({error: 'User not found'})
            }

            if(!allowedRoles.includes(user.role)){
                return res.status(403).json({
                    error:`Access denied. Required role:${allowedRoles.join(' or ')}. Your role is ${user.role}`
                });
            }
            req.user.role = user.role;
            next();

        }catch(error){
            console.error('Authorization error:', error);
            res.status(500).json({error: 'Authorization failed'});

        }
    };
};