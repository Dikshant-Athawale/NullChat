import { Router } from 'express';
import { register, login, refreshAccessToken, logout, deleteAccount, searchUsers, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authRateLimiter, searchRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refreshAccessToken);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.delete('/account', authMiddleware, deleteAccount);
router.get('/me', authMiddleware, getMe);
router.get('/users/search', authMiddleware, searchRateLimiter, searchUsers);

export default router;
