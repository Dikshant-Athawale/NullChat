import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().accessToken;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    if (error.message === 'Invalid token') {
      useAuthStore.getState().logout();
    }
  });

  // ─── Message Events ─────────────────────────────────────────
  socket.on('message:receive', (data) => {
    useChatStore.getState().addMessage({
      _id: data._id,
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderUsername: data.senderUsername,
      ciphertext: data.ciphertext,
      iv: data.iv,
      status: data.status,
      selfDestructTimer: data.selfDestructTimer,
      burnAfterReading: data.burnAfterReading,
      createdAt: data.createdAt,
    });

    // Auto-acknowledge delivery
    const currentUser = useAuthStore.getState().user;
    if (data.senderId !== currentUser?.uuid) {
      socket?.emit('message:delivered', {
        messageId: data._id,
        conversationId: data.conversationId,
      });
    }
  });

  socket.on('message:status', (data) => {
    useChatStore.getState().updateMessageStatus(data.messageId, data.status);
  });

  socket.on('message:burned', (data) => {
    useChatStore.getState().removeMessage(data.messageId);
  });

  // ─── Typing Events ─────────────────────────────────────────
  socket.on('typing:indicator', (data) => {
    useChatStore.getState().setTyping(
      data.conversationId,
      { userId: data.userId, username: data.username },
      data.isTyping
    );
  });

  // ─── Presence Events ───────────────────────────────────────
  socket.on('presence:update', (data) => {
    if (data.status === 'online') {
      useChatStore.getState().setUserOnline(data.userId);
    } else {
      useChatStore.getState().setUserOffline(data.userId);
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function sendMessage(
  conversationId: string,
  ciphertext: string,
  options?: { iv?: string; selfDestructTimer?: number; burnAfterReading?: boolean }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false, error: 'Not connected' });
      return;
    }

    socket.emit(
      'message:send',
      {
        conversationId,
        ciphertext,
        iv: options?.iv,
        selfDestructTimer: options?.selfDestructTimer,
        burnAfterReading: options?.burnAfterReading,
      },
      (response: any) => {
        resolve(response);
      }
    );
  });
}

export function joinConversation(conversationId: string): void {
  socket?.emit('conversation:join', { conversationId });
}

export function emitTyping(conversationId: string, isTyping: boolean): void {
  socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
}

export function burnMessage(messageId: string, conversationId: string): void {
  socket?.emit('message:burn', { messageId, conversationId });
}
