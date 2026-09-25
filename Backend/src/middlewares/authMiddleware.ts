import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isSessionValid } from '../Repository/tokenRepository.ts'; 

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role?: string; 
    sessionId: string; 
    loginMethod?:string;
  };
  restaurantId?:number;
  
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('Verifying access token...');

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const sessionActive = await isSessionValid((decoded as any).sessionId);
    if (!sessionActive) {
      return res.status(401).json({ error: 'Session expired or logged out' });
    }
    
    req.user = {
      id: (decoded as any).id,
      username: (decoded as any).username,
      email: (decoded as any).email,
      role: (decoded as any).role,
      sessionId: (decoded as any).sessionId
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};