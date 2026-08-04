import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Search,
  Send,
  User,
  Users,
  UserPlus,
  MessageSquarePlus,
} from 'lucide-react';
import { DialogCustom } from '@/components/DialogCustom';
import { useMessaging } from '@/hooks/use-messaging';
import { useAppSelector } from '@/hooks/redux-hook';
import { getUsersWithFilter } from '@/api/user.api';
import { createConversation } from '@/api/message.api';
import type { IUser } from '@/types/user.type';

interface MessageModalProps {
  isOpen: boolean;
  onChangeOpenModal: () => void;
  /** (optional — ticket 05) Mở modal tại đúng hội thoại này ngay khi mount. */
  initialConversationId?: string | null;
}

const MAX_LENGTH = 2000;

// Chuyển ISO/date sang chuỗi giờ ngắn (HH:mm hoặc ngày/giờ).
const formatTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hhmm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return hhmm;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const MessageModal = ({
  isOpen,
  onChangeOpenModal,
  initialConversationId,
}: MessageModalProps) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id ?? '';
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const currentRestaurantId = useAppSelector((state) => state.auth.currentRestaurantId);

  const {
    conversations,
    activeConversationId,
    messagesMap,
    unreadMap,
    onlineUserIds,
    isLoading,
    loadConversations,
    openConversation,
    send,
    emitTyping,
    loadMoreMessages,
    typingMap,
  } = useMessaging();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<IUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load danh sách hội thoại khi mở modal
  useEffect(() => {
    if (isOpen) loadConversations();
  }, [isOpen, loadConversations]);

  // Mở đúng hội thoại khi có initialConversationId (từ MailBoxPopover)
  useEffect(() => {
    if (isOpen && initialConversationId) {
      openConversation(initialConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialConversationId]);

  // Tên hiển thị 1 hội thoại
  const convName = useCallback(
    (conv: (typeof conversations)[number]) =>
      conv.type === 'group'
        ? conv.name || 'Nhóm'
        : conv.otherMember?.name || 'Thành viên',
    [],
  );

  // Filter client-side theo search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const name = convName(c).toLowerCase();
      const lastMsg = c.lastMessage?.text.toLowerCase() ?? '';
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, searchQuery, convName]);

  const currentChat = useMemo(
    () => conversations.find((c) => c._id === activeConversationId),
    [conversations, activeConversationId],
  );

  const currentOtherUserId = currentChat?.otherMember?.userId;
  const isOtherTyping = useMemo(() => {
    if (!activeConversationId || !currentOtherUserId) return false;
    return typingMap[activeConversationId]?.has(currentOtherUserId) ?? false;
  }, [typingMap, activeConversationId, currentOtherUserId]);

  // Infinite scroll ngược: khi cuộn lên đầu mà còn dữ liệu thì load thêm trang cũ hơn
  const handleConversationScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 40 && activeConversationId) {
      loadMoreMessages(activeConversationId);
    }
  };

  // Cuộn xuống đáy khi mở hội thoại mới / có tin mới
  const activeMessagesCount = messagesMap[activeConversationId ?? '']?.length;
  useEffect(() => {
    if (isOpen && activeConversationId) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [activeConversationId, isOpen, activeMessagesCount]);

  // Mở modal tạo hội thoại — load danh sách nhân viên cùng nhà hàng
  const openCreateForm = async () => {
    setShowCreate(true);
    setCreateError('');
    setSelectedIds([]);
    setCreateType('direct');
    setGroupName('');
    try {
      const users = await getUsersWithFilter(['staff', 'manager', 'admin'], currentRestaurantId ?? undefined);
      // Loại chính mình
      setUserOptions((users ?? []).filter((u) => u._id !== currentUserId));
    } catch (error) {
      console.error('Lỗi lấy danh sách nhân viên:', error);
      setUserOptions([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (createType === 'direct' && selectedIds.length !== 1) {
      setCreateError('Hội thoại 1-1 cần chọn đúng 1 người');
      return;
    }
    if (createType === 'group' && !groupName.trim()) {
      setCreateError('Nhóm cần có tên');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const conv = await createConversation({
        type: createType,
        name: createType === 'group' ? groupName.trim() : undefined,
        memberIds: createType === 'direct' ? selectedIds : undefined,
      });
      setShowCreate(false);
      await loadConversations();
      openConversation(conv._id);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setCreateError(err?.response?.data?.message || 'Không tạo được hội thoại');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !inputMessage.trim()) return;
    send(activeConversationId, inputMessage);
    setInputMessage('');
    emitTyping(activeConversationId, false);
  };

  return (
    <DialogCustom
      open={isOpen}
      onOpenChange={() => onChangeOpenModal()}
      contentClass="!max-w-3xl max-h-screen w-[95vw] md:w-[800px] p-0 lg:w-[1200px] rounded-lg overflow-hidden"
      content={
        <div className="flex h-[95vh] rounded-2xl overflow-hidden bg-white text-slate-700">
          {/* 👥 CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI */}
          <div className="bg-slate-50 border-r border-slate-100 flex flex-col shrink-0 select-none rounded-l-lg w-[220px] md:w-[320px] lg:w-[360px]">
            {/* Header tìm kiếm + nút tạo */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-white">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Tin nhắn nội bộ
                </h3>
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="p-1.5 rounded-lg text-cerulean-blue-600 hover:bg-cerulean-blue-50 transition-all"
                  aria-label="Tạo hội thoại"
                >
                  <MessageSquarePlus size={16} />
                </button>
              </div>
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm cuộc trò chuyện..."
                  className="w-full rounded-xl border border-slate-200 py-1.5 pl-3 pr-8 text-xs text-slate-700 outline-none bg-slate-50 focus:border-cerulean-blue-500 focus:bg-white transition-all"
                />
                <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {showCreate && (
              <div className="p-3 border-b border-slate-100 bg-cerulean-blue-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Tạo hội thoại</span>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Đóng tạo hội thoại"
                  >
                    <X size={14} />
                  </button>
                </div>

                {isManager && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateType('direct')}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                        createType === 'direct'
                          ? 'bg-cerulean-blue-600 text-white'
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      <Users size={11} /> 1-1
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateType('group')}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all ${
                        createType === 'group'
                          ? 'bg-cerulean-blue-600 text-white'
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      <UserPlus size={11} /> Nhóm
                    </button>
                  </div>
                )}

                {createType === 'group' && (
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Tên nhóm..."
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-cerulean-blue-500"
                  />
                )}

                {createType === 'direct' && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                    {userOptions.length === 0 && (
                      <p className="text-[10px] text-slate-400">Không có nhân viên nào</p>
                    )}
                    {userOptions.map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center gap-2 cursor-pointer rounded-lg px-1.5 py-1 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(u._id)}
                          onChange={() => toggleSelect(u._id)}
                          className="accent-cerulean-blue-600"
                        />
                        <span className="h-5 w-5 rounded-md bg-cerulean-blue-50 text-cerulean-blue-600 flex items-center justify-center font-bold text-[9px] uppercase">
                          {u.name?.charAt(0) ?? '?'}
                        </span>
                        <span className="text-[11px] text-slate-600 truncate">{u.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {createError && (
                  <p className="text-[10px] text-red-500">{createError}</p>
                )}
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full rounded-lg bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-slate-200 text-white text-[11px] font-bold py-1.5 transition-all"
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo hội thoại'}
                </button>
              </div>
            )}

            {/* List Chat cuộn */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {isLoading && conversations.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">Đang tải...</div>
              )}
              {filteredConversations.map((chat) => {
                const isSelected = activeConversationId === chat._id;
                const name = convName(chat);
                const otherId = chat.otherMember?.userId;
                const isOnline = otherId ? onlineUserIds.has(otherId) : false;
                const unread = unreadMap[chat._id] ?? 0;
                const membersTyping = chat.type === 'group'
                  ? Array.from(typingMap[chat._id] ?? new Set<string>())
                  : (typingMap[chat._id]?.size ?? 0) > 0
                    ? ['họ']
                    : [];
                return (
                  <button
                    key={chat._id}
                    onClick={() => openConversation(chat._id)}
                    className={`w-full flex gap-3 p-3 rounded-xl text-left transition-all relative group ${
                      isSelected
                        ? 'bg-cerulean-blue-50 border border-cerulean-blue-100'
                        : 'hover:bg-slate-200/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-100 uppercase">
                        {name.charAt(0)}
                      </div>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                      )}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-slate-800 truncate pr-2">
                          {name}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatTime(chat.lastMessage?.createdAt ?? chat.updatedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {membersTyping.length > 0
                          ? 'đang gõ...'
                          : chat.lastMessage?.text || 'Bắt đầu trò chuyện'}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          chat.type === 'group'
                            ? 'bg-purple-50 text-purple-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {chat.type === 'group' ? 'Nhóm' : chat.otherMember?.role || 'Thành viên'}
                      </span>
                    </div>

                    {/* Số tin chưa đọc */}
                    {unread > 0 && (
                      <span className="absolute right-3 bottom-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm animate-bounce">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {!isLoading && filteredConversations.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Không tìm thấy cuộc hội thoại nào
                </div>
              )}
            </div>
          </div>

          {/* 💬 CỘT PHẢI: KHUNG CHÁT CHI TIẾT */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {/* Header thanh Chat Action */}
            <div className="h-14 border-b border-slate-100 px-4 flex items-center justify-between bg-white shrink-0">
              {currentChat ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-cerulean-blue-50 text-cerulean-blue-600 flex items-center justify-center font-bold text-xs border border-cerulean-blue-100">
                    {convName(currentChat).charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {convName(currentChat)}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {isOtherTyping ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-cerulean-blue-500 inline-block animate-pulse" />
                          đang gõ...
                        </>
                      ) : currentOtherUserId && onlineUserIds.has(currentOtherUserId) ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                          Đang hoạt động
                        </>
                      ) : (
                        'Ngoại tuyến'
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div />
              )}

              {/* Bộ điều hướng & nút đóng */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChangeOpenModal()}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Vùng hiển thị tin nhắn (Cuộn) */}
            <div
              ref={scrollRef}
              onScroll={handleConversationScroll}
              className="flex-1 overflow-y-auto bg-slate-50/40 p-4 space-y-4 custom-scrollbar"
            >
              {currentChat && messagesMap[currentChat._id]
                ? messagesMap[currentChat._id].map((msg) => {
                    const isOwn = msg.senderId === currentUserId;
                    return (
                      <div
                        key={msg._id}
                        className={`flex gap-2 max-w-[80%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        {/* Avatar nhỏ bên cạnh tin nhắn */}
                        <div className="h-6 w-6 rounded-lg bg-slate-200 shrink-0 flex items-center justify-center font-bold text-[9px] uppercase border border-white shadow-sm">
                          {isOwn ? 'ME' : convName(currentChat).charAt(0)}
                        </div>

                        {/* Khối bong bóng tin nhắn */}
                        <div className="flex flex-col">
                          <div
                            className={`px-3 py-2 text-xs rounded-2xl shadow-sm leading-relaxed break-words ${
                              isOwn
                                ? 'bg-cerulean-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                            }`}
                          >
                            {msg.text}
                          </div>

                          {/* Thời gian */}
                          <div
                            className={`flex items-center gap-1 mt-1 text-[9px] text-slate-400 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
                    <User size={36} className="text-slate-200 mb-2 stroke-[1.5]" />
                    <p className="text-xs">Hãy chọn một cuộc hội thoại để bắt đầu nhắn tin</p>
                  </div>
                )}
            </div>

            {/* Ô THANH CHỮ ĐÁY CHÁT (GỬI TIN NHẮN) */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 z-10"
            >
              <input
                type="text"
                value={inputMessage}
                maxLength={MAX_LENGTH}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  if (activeConversationId) emitTyping(activeConversationId, e.target.value.length > 0);
                }}
                onKeyDown={(e) => {
                  // Enter: gửi; Ctrl+Enter / Shift+Enter: xuống dòng
                  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    if (activeConversationId && inputMessage.trim()) {
                      send(activeConversationId, inputMessage);
                      setInputMessage('');
                      emitTyping(activeConversationId, false);
                    }
                  }
                }}
                disabled={!currentChat}
                placeholder={
                  currentChat ? `Nhập tin nhắn đến ${convName(currentChat)}... (Enter để gửi)` : 'Vui lòng chọn chat'
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-cerulean-blue-500 transition-all disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || !currentChat}
                className="h-8 w-8 rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 flex items-center justify-center shadow-sm transition-all active:scale-95 shrink-0"
                aria-label="Gửi tin nhắn"
              >
                <Send size={13} className="ml-0.5" />
              </button>
            </form>
            {currentChat && inputMessage.length >= MAX_LENGTH - 100 && (
              <div className="absolute bottom-12 right-3 text-[9px] text-slate-400 pointer-events-none">
                {inputMessage.length}/{MAX_LENGTH}
              </div>
            )}
          </div>
        </div>
      }
    />
  );
};

export default MessageModal;