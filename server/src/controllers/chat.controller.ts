import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/User';

export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversations = await Conversation.find({ 
      participants: req.user.uuid,
      'participants.1': { $exists: true }
    })
      .sort({ updatedAt: -1 })
      .lean();


    
    const participantUuids = new Set<string>();
    conversations.forEach((conv: any) => {
      conv.participants.forEach((p: string) => {
        if (p !== req.user!.uuid) participantUuids.add(p);
      });
    });

    const users = await User.find({ uuid: { $in: Array.from(participantUuids) } }).lean();
    const userMap = new Map<string, any>();
    users.forEach((u: any) => userMap.set(u.uuid, { uuid: u.uuid, username: u.tempUsername }));

    const populatedConversations = conversations.map((conv: any) => {
      const otherUuid = conv.participants.find((p: string) => p !== req.user!.uuid);
      const otherUser = otherUuid ? userMap.get(otherUuid) : undefined;
      return {
        ...conv,
        otherUser: otherUser || { uuid: otherUuid || '', username: otherUuid?.substring(0, 8) || 'Unknown' }
      };
    });

    res.json({ conversations: populatedConversations });
  } catch (error: any) {
    console.error('Get conversations error:', error.message);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
}

export async function createOrGetConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { participantUuid } = req.body;

    if (!participantUuid) {
      res.status(400).json({ error: 'Participant UUID required' });
      return;
    }

    // Check if direct conversation already exists
    const existing = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user.uuid, participantUuid], $size: 2 },
    });

    const otherUserDoc = await User.findOne({ uuid: participantUuid }).lean();
    const otherUser = otherUserDoc ? { uuid: otherUserDoc.uuid, username: otherUserDoc.tempUsername } : undefined;

    if (existing) {
      res.json({ conversation: { ...existing.toObject(), otherUser } });
      return;
    }

    const conversation = new Conversation({
      participants: [req.user.uuid, participantUuid],
      type: 'direct',
      createdBy: req.user.uuid,
    });

    await conversation.save();
    res.status(201).json({ conversation: { ...conversation.toObject(), otherUser } });
  } catch (error: any) {
    console.error('Create conversation error:', error.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conversationId } = req.params;
    const { before, limit = '50' } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.uuid,
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const query: any = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10))
      .lean();

    res.json({ messages: messages.reverse() });
  } catch (error: any) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ error: 'Failed to get messages' });
  }
}
