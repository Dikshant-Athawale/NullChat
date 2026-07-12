import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  user?: {
    uuid: string;
    username: string;
  };
}

// Track online users: uuid -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

export function setupSocketHandlers(io: Server): void {
  // JWT authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nullchat-dev-secret') as {
        uuid: string;
        username: string;
      };
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`🟢 ${user.username} connected (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(user.uuid)) {
      onlineUsers.set(user.uuid, new Set());
    }
    onlineUsers.get(user.uuid)!.add(socket.id);

    // Broadcast online status
    socket.broadcast.emit('presence:update', {
      userId: user.uuid,
      username: user.username,
      status: 'online',
    });

    // Join user's conversation rooms
    joinUserRooms(socket, user.uuid);

    // ─── Message Handling ───────────────────────────────────────
    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, ciphertext, iv, selfDestructTimer, burnAfterReading } = data;

        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: user.uuid,
        });

        if (!conversation) {
          callback?.({ error: 'Conversation not found' });
          return;
        }

        // Calculate expiry for self-destructing messages
        let expiresAt: Date | undefined;
        if (selfDestructTimer) {
          expiresAt = new Date(Date.now() + selfDestructTimer * 1000);
        }

        const message = new Message({
          conversationId,
          senderId: user.uuid,
          ciphertext, // Server stores only ciphertext — never decrypts
          iv,
          status: 'sent',
          selfDestructTimer: selfDestructTimer || null,
          burnAfterReading: burnAfterReading || false,
          expiresAt,
        });

        await message.save();

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: {
            senderId: user.uuid,
            ciphertext: ciphertext.substring(0, 50) + '...', // Truncated preview (still ciphertext)
            timestamp: message.createdAt,
          },
          updatedAt: new Date(),
        });

        // Emit to all participants in the conversation room
        io.to(`conv:${conversationId}`).emit('message:receive', {
          _id: message._id,
          conversationId,
          senderId: user.uuid,
          senderUsername: user.username,
          ciphertext,
          iv,
          status: 'sent',
          selfDestructTimer: message.selfDestructTimer,
          burnAfterReading: message.burnAfterReading,
          createdAt: message.createdAt,
        });

        callback?.({ success: true, messageId: message._id });
      } catch (error: any) {
        console.error('Message send error:', error.message);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // ─── Delivery & Read Receipts ────────────────────────────────
    socket.on('message:delivered', async (data) => {
      try {
        const { messageId, conversationId } = data;
        await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
        socket.to(`conv:${conversationId}`).emit('message:status', {
          messageId,
          status: 'delivered',
        });
      } catch (error: any) {
        console.error('Delivery ack error:', error.message);
      }
    });

    socket.on('message:read', async (data) => {
      try {
        const { messageId, conversationId } = data;
        await Message.findByIdAndUpdate(messageId, { status: 'read' });
        socket.to(`conv:${conversationId}`).emit('message:status', {
          messageId,
          status: 'read',
        });
      } catch (error: any) {
        console.error('Read ack error:', error.message);
      }
    });

    // ─── Burn After Reading ──────────────────────────────────────
    socket.on('message:burn', async (data) => {
      try {
        const { messageId, conversationId } = data;
        await Message.findByIdAndDelete(messageId);
        io.to(`conv:${conversationId}`).emit('message:burned', { messageId });
      } catch (error: any) {
        console.error('Burn message error:', error.message);
      }
    });

    // ─── Typing Indicators ──────────────────────────────────────
    socket.on('typing:start', (data) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:indicator', {
        conversationId: data.conversationId,
        userId: user.uuid,
        username: user.username,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:indicator', {
        conversationId: data.conversationId,
        userId: user.uuid,
        username: user.username,
        isTyping: false,
      });
    });

    // ─── Join Conversation ──────────────────────────────────────
    socket.on('conversation:join', (data) => {
      socket.join(`conv:${data.conversationId}`);
    });

    // ─── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔴 ${user.username} disconnected (${socket.id})`);

      const userSockets = onlineUsers.get(user.uuid);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.uuid);
          // Broadcast offline status only when all sockets disconnected
          socket.broadcast.emit('presence:update', {
            userId: user.uuid,
            username: user.username,
            status: 'offline',
          });
        }
      }
    });
  });
}

async function joinUserRooms(socket: AuthenticatedSocket, userUuid: string): Promise<void> {
  try {
    const conversations = await Conversation.find({ participants: userUuid }, { _id: 1 });
    for (const conv of conversations) {
      socket.join(`conv:${conv._id}`);
    }
  } catch (error: any) {
    console.error('Join rooms error:', error.message);
  }
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}
