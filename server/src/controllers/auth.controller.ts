import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { AuthRequest } from '../middleware/auth.middleware';

// Environment variables evaluated at runtime to avoid import hoisting issues

function generateAccessToken(uuid: string, username: string): string {
  const secret = process.env.JWT_SECRET || 'nullchat-dev-secret';
  return jwt.sign({ uuid, username }, secret, { expiresIn: '15m' });
}

function generateRefreshToken(uuid: string, username: string): string {
  const secret = process.env.JWT_REFRESH_SECRET || 'nullchat-dev-refresh-secret';
  return jwt.sign({ uuid, username }, secret, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    username = username.trim();

    if (username.length < 3 || username.length > 32) {
      res.status(400).json({ error: 'Username must be 3-32 characters' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if username already taken
    const existing = await User.findOne({ tempUsername: username });
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const uuid = crypto.randomUUID();
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const ttlHours = parseInt(process.env.ACCOUNT_TTL_HOURS || '24', 10);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const refreshToken = generateRefreshToken(uuid, username);

    const user = new User({
      uuid,
      tempUsername: username,
      passwordHash,
      expiresAt,
      refreshToken,
    });

    await user.save();

    const accessToken = generateAccessToken(uuid, username);

    res.status(201).json({
      uuid,
      username: user.tempUsername,
      accessToken,
      refreshToken,
      expiresAt: user.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await User.findOne({ tempUsername: username });

    if (!user) {
      res.status(401).json({ error: 'This account has expired and all associated data has been permanently removed.' });
      return;
    }

    // Check if account has expired (belt-and-suspenders with TTL index)
    if (user.expiresAt < new Date()) {
      res.status(401).json({ error: 'This account has expired and all associated data has been permanently removed.' });
      return;
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const accessToken = generateAccessToken(user.uuid, user.tempUsername);
    const refreshToken = generateRefreshToken(user.uuid, user.tempUsername);

    // Rotate refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      uuid: user.uuid,
      username: user.tempUsername,
      accessToken,
      refreshToken,
      expiresAt: user.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function refreshAccessToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    let decoded: { uuid: string; username: string };
    try {
      const secret = process.env.JWT_REFRESH_SECRET || 'nullchat-dev-refresh-secret';
      decoded = jwt.verify(refreshToken, secret) as { uuid: string; username: string };
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await User.findOne({ uuid: decoded.uuid, refreshToken });
    if (!user) {
      res.status(401).json({ error: 'Refresh token revoked or user not found' });
      return;
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user.uuid, user.tempUsername);
    const newRefreshToken = generateRefreshToken(user.uuid, user.tempUsername);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.user) {
      await User.findOneAndUpdate({ uuid: req.user.uuid }, { refreshToken: null });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Logout failed' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { uuid } = req.user;

    // Delete all user's messages
    const conversations = await Conversation.find({ participants: uuid });
    const conversationIds = conversations.map((c) => c._id);
    await Message.deleteMany({ conversationId: { $in: conversationIds } });

    // Delete the conversations entirely to leave no traces for other users
    await Conversation.deleteMany({ _id: { $in: conversationIds } });

    // Delete the user
    await User.findOneAndDelete({ uuid });

    res.json({ message: 'Account and all associated data permanently deleted' });
  } catch (error: any) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ error: 'Account deletion failed' });
  }
}

export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 3) {
      res.json({ users: [] });
      return;
    }

    // Exact match only — prevents enumeration
    const user = await User.findOne(
      { tempUsername: q.trim(), uuid: { $ne: req.user?.uuid } },
      { tempUsername: 1, uuid: 1, _id: 0 }
    );

    res.json({ users: user ? [{ username: user.tempUsername, uuid: user.uuid }] : [] });
  } catch (error: any) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findOne({ uuid: req.user.uuid }, { passwordHash: 0, refreshToken: 0, __v: 0 });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      uuid: user.uuid,
      username: user.tempUsername,
      expiresAt: user.expiresAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Get me error:', error.message);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}
