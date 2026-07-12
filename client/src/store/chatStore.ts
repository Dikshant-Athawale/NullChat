import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderUsername?: string;
  ciphertext: string;
  iv?: string;
  status: 'sent' | 'delivered' | 'read';
  selfDestructTimer?: number;
  burnAfterReading?: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  type: 'direct' | 'group';
  groupName?: string;
  lastMessage?: {
    senderId: string;
    ciphertext: string;
    timestamp: string;
  };
  // Populated on client side
  otherUser?: {
    uuid: string;
    username: string;
  };
  updatedAt: string;
}

interface TypingUser {
  userId: string;
  username: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  typingUsers: Map<string, TypingUser[]>;
  onlineUsers: Set<string>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  setActiveConversation: (conversation: Conversation | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'delivered' | 'read') => void;
  removeMessage: (messageId: string) => void;
  createConversation: (participantUuid: string) => Promise<Conversation>;
  setTyping: (conversationId: string, user: TypingUser, isTyping: boolean) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  typingUsers: new Map(),
  onlineUsers: new Set(),
  isLoadingConversations: false,
  isLoadingMessages: false,

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation, messages: [] });
    if (conversation) {
      get().fetchMessages(conversation._id);
    }
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await api.get('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ conversations: res.data.conversations, isLoadingConversations: false });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoadingMessages: true });
    try {
      const token = useAuthStore.getState().accessToken;
      const res = await api.get(`/api/chat/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ messages: res.data.messages, isLoadingMessages: false });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
    get().updateConversationLastMessage(message.conversationId, message);
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, status } : m
      ),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    }));
  },

  createConversation: async (participantUuid: string) => {
    const token = useAuthStore.getState().accessToken;
    const res = await api.post(
      '/api/chat/conversations',
      { participantUuid },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const conversation = res.data.conversation;

    set((state) => {
      const exists = state.conversations.find((c) => c._id === conversation._id);
      if (!exists) {
        return { conversations: [conversation, ...state.conversations] };
      }
      return {};
    });

    return conversation;
  },

  setTyping: (conversationId, user, isTyping) => {
    set((state) => {
      const typingUsers = new Map(state.typingUsers);
      const current = typingUsers.get(conversationId) || [];
      if (isTyping) {
        if (!current.find((u) => u.userId === user.userId)) {
          typingUsers.set(conversationId, [...current, user]);
        }
      } else {
        typingUsers.set(conversationId, current.filter((u) => u.userId !== user.userId));
      }
      return { typingUsers };
    });
  },

  setUserOnline: (userId) => {
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      onlineUsers.add(userId);
      return { onlineUsers };
    });
  },

  setUserOffline: (userId) => {
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      onlineUsers.delete(userId);
      return { onlineUsers };
    });
  },

  updateConversationLastMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations
        .map((c) =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: {
                  senderId: message.senderId,
                  ciphertext: message.ciphertext,
                  timestamp: message.createdAt,
                },
                updatedAt: message.createdAt,
              }
            : c
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }));
  },
}));
