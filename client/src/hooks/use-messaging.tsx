import {
  getConversations,
  getMessages,
  markConversationRead,
} from '@/api/message.api';
import { socket } from '@/configs/socket.io';
import { useAppSelector } from '@/hooks/redux-hook';
import type { IConversationView, IMessage } from '@/types/message.type';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import messageSound from '@/assets/message_sound.mp3';

interface MessagingContextValue {
  conversations: IConversationView[];
  activeConversationId: string | null;
  messagesMap: Record<string, IMessage[]>;
  unreadMap: Record<string, number>;
  onlineUserIds: Set<string>;
  typingMap: Record<string, Set<string>>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMap: Record<string, boolean>;
  totalUnread: number;
  loadConversations: () => Promise<void>;
  openConversation: (conversationId: string) => void;
  setActiveConversationId: (id: string | null) => void;
  send: (conversationId: string, text: string) => void;
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  loadMoreMessages: (conversationId: string) => void;
  isTypingIn: (conversationId: string, userId: string) => boolean;
  playMessageSound: () => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

/** Provider dùng chung cho MessageModal + MailBoxPopover/Header (ticket 05). */
export const MessagingProvider = ({ children }: { children: ReactNode }) => {
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? '');

  const [conversations, setConversations] = useState<IConversationView[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, IMessage[]>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingMap, setTypingMap] = useState<Record<string, Set<string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMap, setHasMoreMap] = useState<Record<string, boolean>>({});

  const pageRef = useRef<Record<string, number>>({});
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Âm thanh báo tin mới (chỉ khi conv không mở)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = new Audio(messageSound);
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playMessageSound = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, []);

  // ---------- Fetch danh sách hội thoại ----------
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await getConversations();
      setConversations(list);
      const unread: Record<string, number> = {};
      list.forEach((c) => {
        unread[c._id] = c.unreadCount ?? 0;
      });
      setUnreadMap(unread);
    } catch (error) {
      console.error('[useMessaging] Lỗi lấy danh sách hội thoại:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------- Load messages (phân trang ngược) ----------
  const loadMessages = useCallback(async (conversationId: string, page = 1) => {
    try {
      setIsLoadingMore(true);
      const result = await getMessages(conversationId, page, 20);
      setMessagesMap((prev) => {
        const existing = prev[conversationId] ?? [];
        // Page 1: thay toàn bộ (mới nhất); page > 1: chèn lên đầu (cũ hơn)
        const merged = page === 1 ? result.messages : [...result.messages, ...existing];
        return { ...prev, [conversationId]: merged };
      });
      setHasMoreMap((prev) => ({
        ...prev,
        [conversationId]: page * 20 < result.total,
      }));
      pageRef.current[conversationId] = page;
    } catch (error) {
      console.error('[useMessaging] Lỗi lấy tin nhắn:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  // ---------- Mở hội thoại ----------
  const openConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      // Load lịch sử nếu chưa từng mở
      setMessagesMap((prev) => {
        if (!prev[conversationId]) {
          loadMessages(conversationId, 1);
        }
        return prev;
      });
      // Mark read khi mở
      markConversationRead(conversationId)
        .then(() => {
          setUnreadMap((prev) => ({ ...prev, [conversationId]: 0 }));
        })
        .catch(() => {});
    },
    [loadMessages],
  );

  // ---------- Gửi tin qua socket (optimistic + persist) ----------
  const send = useCallback((conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Optimistic append
    const tempId = `temp_${Date.now()}`;
    const optimistic: IMessage = {
      _id: tempId,
      conversationId,
      senderId: currentUserId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), optimistic],
    }));

    // Emit send_message và đợi ack từ server. Timeout 10s nếu socket lỗi/không nối.
    socket.timeout(10000).emit(
      'send_message',
      { conversationId, text: trimmed },
      (
        err: Error | null,
        res?: { code: number; message?: string; data?: { message: IMessage } },
      ) => {
        if (err || !res || res.code !== 201 || !res.data) {
          // Gỡ tin tạm khi gửi thất bại
          setMessagesMap((prev) => ({
            ...prev,
            [conversationId]: (prev[conversationId] ?? []).filter((m) => m._id !== tempId),
          }));
          toast.error(res?.message || 'Không gửi được tin nhắn');
          return;
        }
        const realMsg = res.data.message;
        // Thay tin tạm bằng tin thật từ server, đồng thời gỡ bất kỳ tin thật
        // nào mà socket event "new_message" (từ tab khác) đã thêm sẵn (tránh trùng tin).
        setMessagesMap((prev) => {
          const list = prev[conversationId] ?? [];
          const deduped = list.filter((m) => m._id !== tempId && m._id !== realMsg._id);
          return { ...prev, [conversationId]: [...deduped, realMsg] };
        });
        // Người gửi không nhận lại "new_message" (server chỉ emit tới socket khác),
        // nên cập nhật lastMessage trong danh sách hội thoại tại tab này.
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    text: realMsg.text,
                    senderId: realMsg.senderId,
                    createdAt: realMsg.createdAt,
                  },
                }
              : c,
          ),
        );
      },
    );
  }, [currentUserId]);

  // ---------- Socket: join/leave conversation + listen events ----------
  useEffect(() => {
    if (activeConversationId) {
      socket.emit('join_conversation', activeConversationId);
      socket.emit('typing', { conversationId: activeConversationId, isTyping: false });
    }
    return () => {
      if (activeConversationId) {
        socket.emit('leave_conversation', activeConversationId);
      }
    };
  }, [activeConversationId]);

  useEffect(() => {
    const handleNewMessage = (payload: { message: IMessage }) => {
      const msg = payload?.message;
      if (!msg) return;
      const isOwnMessage = msg.senderId === currentUserId;
      const isActive = activeConversationIdRef.current === msg.conversationId;
      // Append tin vào conv tương ứng
      setMessagesMap((prev) => {
        const existing = prev[msg.conversationId] ?? [];
        if (existing.some((m) => m._id === msg._id)) return prev;
        return { ...prev, [msg.conversationId]: [...existing, msg] };
      });
      // Cập nhật lastMessage trong danh sách conv
      setConversations((prev) =>
        prev.map((c) =>
          c._id === msg.conversationId
            ? {
                ...c,
                lastMessage: {
                  text: msg.text,
                  senderId: msg.senderId,
                  createdAt: msg.createdAt,
                },
              }
            : c,
        ),
      );
      // Toast + âm thanh + tăng unread nếu KHÔNG phải conv đang mở và không phải tin của mình
      if (!isActive && !isOwnMessage) {
        setUnreadMap((prev) => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] ?? 0) + 1,
        }));
        const conv = conversations.find((c) => c._id === msg.conversationId);
        const displayName =
          conv?.type === 'group'
            ? conv.name ?? 'Nhóm'
            : conv?.otherMember?.name ?? 'Tin nhắn mới';
        toast.info(`💬 ${displayName}: ${msg.text.slice(0, 60)}`);
        playMessageSound();
      }
    };

    const handleConversationUpdated = (payload: {
      conversation: IConversationView;
      unreadCount?: number;
    }) => {
      const conv = payload?.conversation;
      if (!conv) return;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === conv._id);
        if (idx === -1) return [conv, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], ...conv };
        return next;
      });
      if (typeof payload.unreadCount === 'number') {
        const count: number = payload.unreadCount;
        setUnreadMap((prev) => ({ ...prev, [conv._id]: count }));
      }
    };

    const handleUserOnline = (payload: { userId?: string }) => {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => new Set(prev).add(payload.userId as string));
    };

    const handleUserOffline = (payload: { userId?: string }) => {
      if (!payload?.userId) return;
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.userId as string);
        return next;
      });
    };

    const handleTyping = (payload: {
      conversationId?: string;
      userId?: string;
      isTyping?: boolean;
    }) => {
      if (!payload?.conversationId || !payload?.userId) return;
      setTypingMap((prev) => {
        const set = new Set(prev[payload.conversationId!] ?? []);
        if (payload.isTyping) set.add(payload.userId as string);
        else set.delete(payload.userId as string);
        return { ...prev, [payload.conversationId as string]: set };
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('typing', handleTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, currentUserId]);

  // ---------- Typing emit (debounce) ----------
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!conversationId) return;
    socket.emit('typing', { conversationId, isTyping });
    if (isTyping) {
      // Tự tắt typing sau 2.5s nếu không gõ tiếp
      if (typingTimeoutRef.current[conversationId]) {
        clearTimeout(typingTimeoutRef.current[conversationId]);
      }
      typingTimeoutRef.current[conversationId] = setTimeout(() => {
        socket.emit('typing', { conversationId, isTyping: false });
      }, 2500);
    }
  }, []);

  // ---------- Load thêm tin cũ (scroll ngược) ----------
  const loadMoreMessages = useCallback(
    (conversationId: string) => {
      const page = pageRef.current[conversationId] ?? 1;
      if (!hasMoreMap[conversationId]) return;
      loadMessages(conversationId, page + 1);
    },
    [hasMoreMap, loadMessages],
  );

  const isTypingIn = useCallback(
    (conversationId: string, userId: string) =>
      typingMap[conversationId]?.has(userId) ?? false,
    [typingMap],
  );

  const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

  const value: MessagingContextValue = {
    conversations,
    activeConversationId,
    messagesMap,
    unreadMap,
    onlineUserIds,
    typingMap,
    isLoading,
    isLoadingMore,
    hasMoreMap,
    totalUnread,
    loadConversations,
    openConversation,
    setActiveConversationId,
    send,
    emitTyping,
    loadMoreMessages,
    isTypingIn,
    playMessageSound,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMessaging = () => {
  const ctx = useContext(MessagingContext);
  if (!ctx) {
    throw new Error('useMessaging phải được dùng trong <MessagingProvider>');
  }
  return ctx;
};