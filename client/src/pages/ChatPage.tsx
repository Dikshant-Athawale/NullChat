import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore, type Conversation, type Message } from '../store/chatStore';
import { connectSocket, disconnectSocket, sendMessage, joinConversation, emitTyping } from '../services/socket';
import api from '../services/api';
import {
  Shield, Search, MessageSquare, LogOut, Trash2,
  Send, Clock, ChevronLeft, Flame, Timer, X, User, Lock, Settings
} from 'lucide-react';

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, logout, deleteAccount, accessToken } = useAuthStore();
  const {
    conversations, activeConversation, messages, typingUsers, onlineUsers,
    setActiveConversation, fetchConversations, addMessage, createConversation,
    isLoadingMessages
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selfDestructTimer, setSelfDestructTimer] = useState<number | null>(null);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [sendAnimating, setSendAnimating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect socket on mount
  useEffect(() => {
    connectSocket();
    fetchConversations();

    return () => {
      disconnectSocket();
    };
  }, []);

  // Join active conversation room
  useEffect(() => {
    if (activeConversation) {
      joinConversation(activeConversation._id);
    }
  }, [activeConversation?._id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!user?.expiresAt) return '';
    const diff = new Date(user.expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  // Search users
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/api/auth/users/search?q=${encodeURIComponent(q.trim())}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSearchResults(res.data.users);
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  }, [accessToken]);

  // Start conversation with user
  const handleStartChat = async (targetUser: { uuid: string; username: string }) => {
    try {
      const conversation = await createConversation(targetUser.uuid);
      const convWithUser = { ...conversation, otherUser: targetUser };
      setActiveConversation(convWithUser);
      setSearchQuery('');
      setSearchResults([]);
      setShowSidebar(false);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const text = messageInput.trim();
    setMessageInput('');
    setShowMessageOptions(false);

    // Trigger send animation
    setSendAnimating(true);
    setTimeout(() => setSendAnimating(false), 400);

    // In Phase 1, we send plaintext (E2EE comes in Phase 3)
    // The field is called "ciphertext" to match the schema — it will be actual ciphertext later
    const result = await sendMessage(activeConversation._id, text, {
      selfDestructTimer: selfDestructTimer || undefined,
      burnAfterReading,
    });

    if (!result.success) {
      console.error('Failed to send:', result.error);
    }

    // Reset message options after sending
    setSelfDestructTimer(null);
    setBurnAfterReading(false);
  };

  // Typing indicator
  const handleTyping = () => {
    if (!activeConversation) return;
    emitTyping(activeConversation._id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(activeConversation._id, false);
    }, 2000);
  };

  // Get other user info for conversation
  const getOtherUser = (conv: Conversation) => {
    if (conv.otherUser) return conv.otherUser;
    const otherUuid = conv.participants.find((p) => p !== user?.uuid);
    return { uuid: otherUuid || '', username: otherUuid?.substring(0, 8) || 'Unknown' };
  };

  // Typing indicator for active conversation
  const activeTyping = activeConversation
    ? typingUsers.get(activeConversation._id)?.filter((u) => u.userId !== user?.uuid) || []
    : [];

  // Handle delete account
  const handleDeleteAccount = async () => {
    await deleteAccount();
    navigate('/');
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const selfDestructOptions = [
    { label: '30s', value: 30 },
    { label: '5m', value: 300 },
    { label: '1h', value: 3600 },
    { label: '24h', value: 86400 },
  ];

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  let lastDateLabel = '';

  return (
    <div className="chat-height flex overflow-hidden bg-[var(--color-bg-primary)] relative">
      {/* Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--color-purple-glow),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_var(--color-accent-glow),_transparent_50%)] opacity-15 animate-mesh"></div>
      </div>

      {/* ─── Sidebar ──────────────────────────────────────────── */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-[var(--color-border)] glass z-10 shrink-0 safe-top`}>
        {/* Header */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2.5 sm:pb-3 border-b border-[var(--color-border)]">
          {/* Top Row: Logo + Actions */}
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-purple)] flex items-center justify-center shadow-[0_0_12px_var(--color-accent-glow)]">
                <Shield size={13} className="sm:hidden text-[var(--color-bg-primary)]" strokeWidth={2.5} />
                <Shield size={15} className="hidden sm:block text-[var(--color-bg-primary)]" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-[var(--color-text-primary)] text-sm tracking-tight">NullChat</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="badge badge-warning">
                <Clock size={11} />
                <span className="font-mono text-[10px]">{getTimeRemaining()}</span>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn-icon"
                aria-label="Settings"
              >
                <Settings size={17} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            <input
              id="input-search-users"
              type="text"
              placeholder="Search username"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="input-field input-field-sm bg-[var(--color-bg-primary)]"
              style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 sm:mt-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] overflow-hidden animate-[slide-down_0.2s_ease-out]">
              {searchResults.map((u) => (
                <button
                  key={u.uuid}
                  onClick={() => handleStartChat(u)}
                  className="w-full flex items-center gap-3 px-3 sm:px-3.5 py-2.5 hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)] transition-all duration-200 text-left cursor-pointer"
                >
                  <div className="avatar avatar-sm">
                    <User size={14} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.username}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Start secure conversation</p>
                  </div>
                  <Lock size={13} className="text-[var(--color-green)] shrink-0" />
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
            <div className="mt-2 py-3 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">No users found</p>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/80 p-3 sm:p-4 animate-[slide-down_0.25s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="avatar">
                <User size={16} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user?.username}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] font-mono">{user?.uuid.substring(0, 8)}...</p>
              </div>
            </div>
            <div className="space-y-1">
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="btn btn-ghost w-full justify-start gap-2.5 text-sm text-[var(--color-text-secondary)] rounded-lg py-2.5"
              >
                <LogOut size={15} /> Logout
              </button>
              {confirmDelete ? (
                <button
                  id="btn-delete-account-confirm"
                  onClick={handleDeleteAccount}
                  className="btn btn-danger w-full justify-start gap-2.5 text-sm rounded-lg py-2.5 bg-red-600 animate-[fade-in_0.2s_ease-out]"
                >
                  <Trash2 size={15} /> Click to Confirm Deletion
                </button>
              ) : (
                <button
                  id="btn-delete-account"
                  onClick={() => setConfirmDelete(true)}
                  className="btn btn-danger w-full justify-start gap-2.5 text-sm rounded-lg py-2.5"
                >
                  <Trash2 size={15} /> Delete Account
                </button>
              )}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:px-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] flex items-center justify-center mb-4 sm:mb-5">
                <MessageSquare size={24} className="sm:hidden text-[var(--color-text-muted)] opacity-40" />
                <MessageSquare size={28} className="hidden sm:block text-[var(--color-text-muted)] opacity-40" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">No conversations yet</p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-[200px]">Search for a username above to start chatting securely</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherUser(conv);
              const isActive = activeConversation?._id === conv._id;
              const isOnline = onlineUsers.has(other.uuid);

              return (
                <button
                  key={conv._id}
                  onClick={() => { setActiveConversation({ ...conv, otherUser: other }); setShowSidebar(false); }}
                  className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 transition-all duration-200 cursor-pointer border-b border-[var(--color-border)]/50 group active:bg-[var(--color-bg-active)] ${
                    isActive
                      ? 'bg-[var(--color-accent)]/8 border-l-2 border-l-[var(--color-accent)]'
                      : 'hover:bg-[var(--color-bg-hover)] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`avatar ${isOnline ? 'avatar-online' : ''}`}>
                    <User size={16} className="text-[var(--color-text-muted)]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {other.username}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-[var(--color-text-muted)] ml-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                          {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock size={9} className="text-[var(--color-green)] shrink-0 opacity-60" />
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                        {conv.lastMessage ? 'Encrypted message' : 'Start a secure conversation'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Chat Area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-14 sm:h-[3.75rem] px-3 sm:px-4 flex items-center gap-3 sm:gap-3.5 border-b border-[var(--color-border)] glass-strong shrink-0 safe-top">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:!hidden btn-icon"
                aria-label="Back to conversations"
              >
                <ChevronLeft size={20} />
              </button>
              <div className={`avatar avatar-sm ${onlineUsers.has(getOtherUser(activeConversation).uuid) ? 'avatar-online' : ''}`}>
                <User size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-tight">
                  {getOtherUser(activeConversation).username}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Lock size={9} className="text-[var(--color-green)]" />
                  <p className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)]">
                    {onlineUsers.has(getOtherUser(activeConversation).uuid) ? (
                      <><span className="text-[var(--color-green)]">Online</span></>
                    ) : (
                      <>Offline</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 md:px-6 py-4 sm:py-5">
              {/* E2EE Notice */}
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="badge badge-green py-1.5 px-3 sm:px-3.5">
                  <Lock size={10} className="sm:hidden" />
                  <Lock size={11} className="hidden sm:block" />
                  <span className="text-[10px] sm:text-[11px]">Messages are end-to-end encrypted</span>
                </div>
              </div>

              {isLoadingMessages && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              <div className="space-y-2 sm:space-y-2.5">
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.uuid;

                  // Date separator
                  const currentDateLabel = getDateLabel(msg.createdAt);
                  let showDateSep = false;
                  if (currentDateLabel !== lastDateLabel) {
                    showDateSep = true;
                    lastDateLabel = currentDateLabel;
                  }

                  return (
                    <div key={msg._id}>
                      {showDateSep && (
                        <div className="flex items-center justify-center my-4 sm:my-5">
                          <div className="badge badge-muted py-1 px-3 text-[10px]">
                            {currentDateLabel}
                          </div>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-[fade-in_0.2s_ease-out]`}>
                        <div className={`msg-bubble ${isMine ? 'msg-mine' : 'msg-theirs'}`}>
                          {!isMine && msg.senderUsername && (
                            <p className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-accent-light)] mb-1">{msg.senderUsername}</p>
                          )}
                          <p className="text-[13px] sm:text-sm leading-relaxed break-words">{msg.ciphertext}</p>
                          <div className={`flex items-center gap-1.5 mt-1 sm:mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {msg.selfDestructTimer && (
                              <Timer size={9} className={isMine ? 'text-[var(--color-bg-primary)]/50' : 'text-[var(--color-text-muted)]'} />
                            )}
                            {msg.burnAfterReading && (
                              <Flame size={9} className={isMine ? 'text-[var(--color-bg-primary)]/70' : 'text-orange-400/60'} />
                            )}
                            <span className={`text-[10px] ${isMine ? 'text-[var(--color-bg-primary)]/50 font-medium' : 'text-[var(--color-text-muted)]'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Typing indicator */}
              {activeTyping.length > 0 && (
                <div className="flex items-center gap-2.5 mt-3 animate-[fade-in_0.2s_ease-out]">
                  <div className="badge badge-muted py-1.5 px-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:0ms]"></span>
                      <span className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 bg-[var(--color-text-muted)] rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {activeTyping.map((u) => u.username).join(', ')} typing
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-2 sm:px-3 md:px-4 pb-2 sm:pb-3 pt-1 shrink-0 border-t border-[var(--color-border)]/50 safe-bottom">
              <div className="glass-strong rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                {/* Message Options */}
                {showMessageOptions && (
                  <div className="mb-1.5 sm:mb-2 px-1 flex flex-wrap items-center gap-1.5 sm:gap-2 animate-[slide-down_0.15s_ease-out]">
                    {/* Self-destruct timer */}
                    <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                      <Timer size={12} className="text-[var(--color-text-muted)] mr-0.5" />
                      {selfDestructOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSelfDestructTimer(selfDestructTimer === opt.value ? null : opt.value)}
                          className={`px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer min-h-[1.75rem] ${
                            selfDestructTimer === opt.value
                              ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] active:bg-[var(--color-bg-hover)]'
                          }`}
                          aria-label={`Self-destruct in ${opt.label}`}
                          title={`Message will self-destruct ${opt.label} after being sent`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Burn after reading */}
                    <button
                      onClick={() => setBurnAfterReading(!burnAfterReading)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer min-h-[2rem] ${
                        burnAfterReading
                          ? 'bg-orange-500/15 border-orange-500/25 text-orange-300'
                          : 'bg-[var(--color-bg-tertiary)] border-[var(--color-border)] text-[var(--color-text-muted)] active:bg-[var(--color-bg-hover)]'
                      }`}
                      aria-label="Toggle burn after reading"
                      title="Message will immediately self-destruct the moment they read it"
                    >
                      <Flame size={12} /> Burn
                    </button>

                    <button
                      onClick={() => setShowMessageOptions(false)}
                      className="btn-icon p-1.5 min-w-[1.75rem] min-h-[1.75rem]"
                      aria-label="Close message options"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Active options badges */}
                {(selfDestructTimer || burnAfterReading) && !showMessageOptions && (
                  <div className="mb-1.5 sm:mb-2 px-1 flex items-center gap-2">
                    {selfDestructTimer && (
                      <span className="badge badge-accent">
                        <Timer size={10} /> {selfDestructOptions.find((o) => o.value === selfDestructTimer)?.label}
                      </span>
                    )}
                    {burnAfterReading && (
                      <span className="badge badge-orange">
                        <Flame size={10} /> Burn
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    onClick={() => setShowMessageOptions(!showMessageOptions)}
                    className="btn-icon shrink-0"
                    title="Message privacy options"
                    aria-label="Toggle message privacy options"
                  >
                    <Timer size={17} />
                  </button>

                  <input
                    id="input-message"
                    ref={messageInputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    className="input-field input-field-sm flex-1 min-w-0 bg-[var(--color-bg-primary)]/50"
                    autoComplete="off"
                    autoCapitalize="sentences"
                    enterKeyHint="send"
                  />

                  <button
                    id="btn-send-message"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className={`btn btn-primary p-2.5 rounded-xl shrink-0 ${sendAnimating ? 'animate-[send-bounce_0.4s_cubic-bezier(0.34,1.56,0.64,1)]' : ''}`}
                    aria-label="Send message"
                  >
                    <Send size={17} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state — no conversation selected (hidden on mobile when sidebar is showing) */
          <div className={`flex-1 flex-col items-center justify-center text-center px-6 sm:px-8 ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center mb-5 sm:mb-6 animate-[float_6s_ease-in-out_infinite]">
              <Shield size={28} className="sm:hidden text-[var(--color-accent)] opacity-30" />
              <Shield size={36} className="hidden sm:block text-[var(--color-accent)] opacity-30" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-2">NullChat</h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xs leading-relaxed mb-6 sm:mb-8">
              Search for a username to start a secure conversation. All messages are end-to-end encrypted.
            </p>
            <div className="badge badge-warning py-1.5 px-3 sm:px-4">
              <Clock size={13} />
              <span className="text-[11px] sm:text-xs">Expires in {getTimeRemaining()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
