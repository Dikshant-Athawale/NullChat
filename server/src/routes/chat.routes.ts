import { Router } from 'express';
import { getConversations, createOrGetConversation, getMessages } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/conversations', authMiddleware, getConversations);
router.post('/conversations', authMiddleware, createOrGetConversation);
router.get('/conversations/:conversationId/messages', authMiddleware, getMessages);

export default router;
