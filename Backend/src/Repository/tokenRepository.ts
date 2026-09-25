
import jwt from 'jsonwebtoken';
import pool from '../db.ts';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'access-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';

interface TokenPayload {
  id: number;
  username: string;
  email: string;
  role: string;
  sessionId: string; 
}


export const generateAccessToken = (payload: TokenPayload) => {
  try {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m'
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
};

export const generateRefreshToken = (payload: TokenPayload) => {
  try {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: '7d'
    });
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw error;
  }
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    console.error('Error verifying access token:', error);
    return null;
  }
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};


export const createSession = async (userId: number): Promise<string> => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
  const result = await pool.query(
    `INSERT INTO sessions (user_id, expires_at) VALUES ($1, $2) RETURNING session_id`,
    [userId, expiresAt]
  );
  return result.rows[0].session_id;
};


export const isSessionValid = async (sessionId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM sessions WHERE session_id = $1 AND expires_at > NOW()`,
    [sessionId]
  );
  return (result.rowCount ?? 0) > 0;
};

export const deleteSession = async (sessionId: string): Promise<number> => {
  const result = await pool.query(
    `DELETE FROM sessions WHERE session_id = $1`,
    [sessionId]
  );
  return result.rowCount ?? 0;
};