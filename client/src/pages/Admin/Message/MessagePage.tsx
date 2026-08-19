import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMessaging } from '@/hooks/use-messaging';
import { useAppSelector } from '@/hooks/redux-hook';
import { getUsersWithFilter } from '@/api/user.api';
import { getMyRestaurants } from '@/api/restaurants.api';
import {
  createConversation,
  getDirectConversation,
  addConversationMembers,
  removeConversationMember,
} from '@/api/message.api';
import type { IUser } from '@/types/user.type';
import { cn } from '@/lib/utils';
import MemberManagementPanel from './components/MemberManagementPanel';
import { MessageInputBar } from './components/MessageInputBar';
import { MessagesArea } from './components/MessagesArea';
import { ChatHeader } from './components/ChatHeader';
import { ConversationList } from './components/ConversationList';
import { CreateGroupForm } from './components/CreateGroupForm';
import { ConversationListHeader } from './components/ConversationListHeader';
import { roleLabelOf } from '@/utils/helpers';

export type ConversationT = ReturnType<typeof useMessaging>['conversations'][number];
export type ActiveTabT = ReturnType<typeof useMessaging>['activeTab'];

/* ============================================================================
 * MAIN PAGE — MessagePage
 * (toàn bộ tính năng trước đây nằm trong MessageModal, giờ là 1 page 2 cột:
 *  danh sách hội thoại + khung chat, được lắp ráp từ các sub-component ở trên)
 * ========================================================================== */

const MessagePage = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id ?? '';
  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin';
  const currentRestaurantId = useAppSelector((state) => state.auth.currentRestaurantId);

  const [searchParams] = useSearchParams();

  // Mobile: kiểm soát việc ẩn/hiện cột danh sách hội thoại
  const [showListOnMobile, setShowListOnMobile] = useState(false);

  const {
    conversations,
    visibleConversations,
    activeTab,
    setActiveTab,
    activeConversationId,
    messagesMap,
    unreadMap,
    onlineUserIds,
    isLoading,
    isMessageLoading,
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
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [internalUsers, setInternalUsers] = useState<IUser[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  // Quản lý thành viên nhóm (inline panel thay vì modal)
  const [showMemberPanel, setShowMemberPanel] = useState(false);
  const [memberPickerUsers, setMemberPickerUsers] = useState<IUser[]>([]);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [memberError, setMemberError] = useState('');
  // Map restaurantId -> tên nhà hàng (admin hiển thị badge nhà hàng chéo chuỗi)
  const [restaurantNameMap, setRestaurantNameMap] = useState<Record<string, string>>({});
  // Nhà hàng mà admin chọn khi tạo nhóm (mặc định = tenant đang chọn)
  const [groupRestaurantId, setGroupRestaurantId] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Load danh sách hội thoại khi vào trang
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Mở đúng hội thoại khi có ?conv= (từ MailBoxPopover / deep link)
  const convParam = searchParams.get('conv');
  useEffect(() => {
    if (convParam) {
      setShowListOnMobile(false);
      openConversation(convParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam]);

  // Tên hiển thị 1 hội thoại
  const convName = useCallback(
    (conv: ConversationT) =>
      conv.type === 'group' ? conv.name || 'Nhóm' : conv.otherMember?.name || 'Thành viên',
    [],
  );

  // Filter client-side theo search (lọc trên danh sách đã theo tab)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return visibleConversations;
    const q = searchQuery.toLowerCase();
    return visibleConversations.filter((c) => {
      const name = convName(c).toLowerCase();
      const lastMsg = c.lastMessage?.text.toLowerCase() ?? '';
      return name.includes(q) || lastMsg.includes(q);
    });
  }, [visibleConversations, searchQuery, convName]);

  const currentChat = useMemo(
    () => conversations.find((c) => c._id === activeConversationId),
    [conversations, activeConversationId],
  );

  // Số nhóm chat hiện tại của nhà hàng đang tạo (để gate UI theo trần `group_chats`).
  const groupChatCount = useMemo(() => {
    const target = (groupRestaurantId || currentRestaurantId || '').toString();
    return conversations.filter(
      (c) =>
        c.type === 'group' &&
        (!target || !c.restaurantId || String(c.restaurantId) === target),
    ).length;
  }, [conversations, groupRestaurantId, currentRestaurantId]);

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
    if (activeConversationId) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [activeConversationId, activeMessagesCount]);

  // Admin: nạp map tên nhà hàng (badge chéo chuỗi + mặc định tenant tạo nhóm)
  useEffect(() => {
    if (!isAdmin) return;
    getMyRestaurants()
      .then((restaurants) => {
        const map: Record<string, string> = {};
        (restaurants ?? []).forEach((r) => {
          if (r._id && r.name) map[r._id] = r.name;
        });
        setRestaurantNameMap(map);
        setGroupRestaurantId((prev) => {
          if (prev) return prev;
          const fallback =
            (currentRestaurantId && map[currentRestaurantId] ? currentRestaurantId : '') ||
            (Object.keys(map)[0] ?? '');
          return fallback;
        });
      })
      .catch((error) => {
        console.error('Lỗi lấy danh sách nhà hàng:', error);
      });
  }, [isAdmin, currentRestaurantId]);

  // Danh bạ "Nội Bộ": manager/staff thấy admin + nhân viên cùng nhà hàng, admin thấy toàn chuỗi
  useEffect(() => {
    let cancelled = false;
    getUsersWithFilter(
      ['staff', 'manager', 'admin'],
      isAdmin ? undefined : (currentRestaurantId ?? undefined),
    )
      .then((users) => {
        if (!cancelled) setInternalUsers((users ?? []).filter((u) => u._id !== currentUserId));
      })
      .catch((error) => {
        console.error('Lỗi lấy danh sách nội bộ:', error);
        if (!cancelled) setInternalUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, currentRestaurantId, currentUserId]);

  // Mở form tạo hội thoại — giờ chỉ còn tạo group
  const openCreateForm = () => {
    setShowCreate(true);
    setCreateError('');
    setSelectedIds([]);
    setGroupName('');
  };

  // Hội thoại 1-1 với nhân viên (tab Nội Bộ) nếu đã có
  const directConversationOf = (userId: string) =>
    conversations.find(
      (c) =>
        c.type === 'direct' &&
        (c.otherMember?.userId === userId ||
          (c.members ?? []).some((m) => String(m.userId) === userId)),
    );

  // Danh sách nội bộ sau khi filter theo tìm kiếm
  const filteredInternalUsers = useMemo(() => {
    if (!searchQuery.trim()) return internalUsers;
    const q = searchQuery.toLowerCase();
    return internalUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        roleLabelOf(u.role).toLowerCase().includes(q),
    );
  }, [internalUsers, searchQuery]);

  // Chọn người nhận → mở thẳng hội thoại 1-1 (không cần bấm nút tạo)
  // Tối ưu: tìm hội thoại 1-1 sẵn có trước (GET nhẹ); chỉ POST tạo khi chưa tồn tại.
  // Chọn người nhận → mở thẳng hội thoại 1-1 (Tối ưu không bị delay UI)
  const handlePickDirectUser = async (userId: string) => {
    if (!userId || isCreating) return;

    // 1. KIỂM TRA CLIENT-SIDE TRƯỚC (Nhanh tức thì - 0ms)
    const existingClientConv = directConversationOf(userId);
    if (existingClientConv) {
      setShowListOnMobile(false);
      openConversation(existingClientConv._id); // Chuyển chat ngay không cần chờ API
      return;
    }

    // 2. NẾU CHƯA CÓ TRÊN CLIENT: Chuyển giao diện mobile ngay để tạo cảm giác mượt
    setShowListOnMobile(false);
    setIsCreating(true);
    setCreateError('');

    try {
      // Tìm trên server hoặc tạo mới nếu chưa từng chat
      const existing = await getDirectConversation(userId);
      const conv =
        existing ??
        (await createConversation({
          type: 'direct',
          memberIds: [userId],
          restaurantId: currentRestaurantId ?? undefined,
        }));

      // Cập nhật lại danh sách ngầm không cần await làm hoãn mở chat
      loadConversations();
      openConversation(conv._id);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setCreateError(err?.response?.data?.message || 'Không mở được hội thoại');
    } finally {
      setIsCreating(false);
    }
  };

  // Tạo nhóm — chỉ cần tên, thêm thành viên sau ở header
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setCreateError('Nhóm cần có tên');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      const conv = await createConversation({
        type: 'group',
        name: groupName.trim(),
        restaurantId: (isAdmin ? groupRestaurantId : currentRestaurantId) ?? undefined,
      });
      setShowCreate(false);
      setGroupName('');
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(conv._id);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setCreateError(err?.response?.data?.message || 'Không tạo được hội thoại nhóm');
    } finally {
      setIsCreating(false);
    }
  };

  // Mở panel quản lý member cho group
  const openMemberPanel = async () => {
    if (!activeConversationId) return;
    setShowMemberPanel(true);
    setMemberError('');
    setSelectedIds([]);
    try {
      const conv = conversations.find((c) => c._id === activeConversationId);
      const restaurantId = conv?.restaurantId ?? currentRestaurantId ?? undefined;
      const users = await getUsersWithFilter(['staff', 'manager', 'admin'], restaurantId);
      const existingMemberIds = new Set(conv?.members?.map((m) => String(m.userId)) ?? []);
      setMemberPickerUsers(
        (users ?? []).filter((u) => u._id !== currentUserId && !existingMemberIds.has(u._id)),
      );
    } catch (error) {
      console.error('Lỗi lấy danh sách thành viên:', error);
      setMemberPickerUsers([]);
    }
  };

  const toggleMemberSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAddMembers = async () => {
    if (!activeConversationId || selectedIds.length === 0) return;
    setIsManagingMembers(true);
    setMemberError('');
    try {
      await addConversationMembers(activeConversationId, selectedIds);
      setShowMemberPanel(false);
      setSelectedIds([]);
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(activeConversationId);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setMemberError(err?.response?.data?.message || 'Không thêm được thành viên');
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeConversationId) return;
    setIsManagingMembers(true);
    setMemberError('');
    try {
      await removeConversationMember(activeConversationId, userId);
      await loadConversations();
      setShowListOnMobile(false);
      openConversation(activeConversationId);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setMemberError(err?.response?.data?.message || 'Không gỡ được thành viên');
    } finally {
      setIsManagingMembers(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !inputMessage.trim()) return;
    send(activeConversationId, inputMessage);
    setInputMessage('');
    emitTyping(activeConversationId, false);
  };

  const handleEnterSend = () => {
    if (!activeConversationId || !inputMessage.trim()) return;
    send(activeConversationId, inputMessage);
    setInputMessage('');
    emitTyping(activeConversationId, false);
  };

  // Mobile: khi đang mở chat → ẩn cột trái, hiện nút quay lại
  const showList = !activeConversationId || showListOnMobile;

  return (
    <div className="h-full overflow-hidden bg-slate-100 p-0 md:p-4">
      <div className="flex h-full overflow-hidden rounded-none bg-white text-slate-700 md:rounded-2xl md:border md:border-slate-200 md:shadow-card">
        {/* 👥 CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI */}
        <div
          className={cn(
            'flex shrink-0 flex-col select-none border-r border-slate-100 bg-slate-50 md:rounded-l-2xl',
            'w-full md:w-[300px] lg:w-[340px] xl:w-[360px]',
            showList ? 'flex' : 'hidden md:flex',
          )}
        >
          <ConversationListHeader
            isManager={isManager}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenCreateForm={openCreateForm}
            groupChatCount={groupChatCount}
          />

          {showCreate && (
            <CreateGroupForm
              isAdmin={isAdmin}
              restaurantNameMap={restaurantNameMap}
              groupRestaurantId={groupRestaurantId}
              onGroupRestaurantChange={setGroupRestaurantId}
              groupName={groupName}
              onGroupNameChange={setGroupName}
              createError={createError}
              isCreating={isCreating}
              onClose={() => setShowCreate(false)}
              onSubmit={handleCreateGroup}
            />
          )}

          <ConversationList
            isLoading={isLoading}
            activeTab={activeTab}
            conversations={conversations}
            filteredConversations={filteredConversations}
            filteredInternalUsers={filteredInternalUsers}
            activeConversationId={activeConversationId}
            onlineUserIds={onlineUserIds}
            unreadMap={unreadMap}
            typingMap={typingMap}
            isAdmin={isAdmin}
            restaurantNameMap={restaurantNameMap}
            convName={convName}
            directConversationOf={directConversationOf}
            onPickDirectUser={(userId) => {
              setShowListOnMobile(false);
              handlePickDirectUser(userId);
            }}
            onOpenConversation={(id) => {
              setShowListOnMobile(false);
              openConversation(id);
            }}
          />
        </div>

        {/* 💬 CỘT PHẢI: KHUNG CHÁT CHI TIẾT */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-white">
          <ChatHeader
            currentChat={currentChat}
            activeConversationId={activeConversationId}
            showListOnMobile={showListOnMobile}
            onShowListOnMobile={() => setShowListOnMobile(true)}
            convName={convName}
            currentUserId={currentUserId}
            currentOtherUserId={currentOtherUserId}
            onlineUserIds={onlineUserIds}
            isOtherTyping={isOtherTyping}
            isAdmin={isAdmin}
            onOpenMemberPanel={openMemberPanel}
          />

          <MessagesArea
            currentChat={currentChat}
            messages={currentChat ? messagesMap[currentChat._id] : undefined}
            isMessageLoading={currentChat ? isMessageLoading(currentChat._id) : false}
            currentUserId={currentUserId}
            convName={convName}
            scrollRef={scrollRef}
            onScroll={handleConversationScroll}
          />

          <MessageInputBar
            currentChat={currentChat}
            inputMessage={inputMessage}
            onChange={setInputMessage}
            onSubmit={handleSend}
            onEnterSend={handleEnterSend}
            convName={convName}
            activeConversationId={activeConversationId}
            onTyping={emitTyping}
          />

          {/* 🔧 PANEL QUẢN LÝ THÀNH VIÊN NHÓM (inline, thay cho modal) */}
          {showMemberPanel && currentChat && (
            <MemberManagementPanel
              currentChat={currentChat}
              currentUserId={currentUserId}
              memberPickerUsers={memberPickerUsers}
              selectedIds={selectedIds}
              onToggleSelect={toggleMemberSelect}
              memberError={memberError}
              isManagingMembers={isManagingMembers}
              onAddMembers={handleAddMembers}
              onRemoveMember={handleRemoveMember}
              onClose={() => {
                setShowMemberPanel(false);
                setSelectedIds([]);
                setMemberError('');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagePage;
