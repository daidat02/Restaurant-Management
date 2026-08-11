import { PopoverCustom } from '@/components/PopoverCusom';
import { Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '@/hooks/use-messaging';
import { useAuth } from '@/hooks/use-auth';

const formatTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const hhmm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === now.toDateString()
    ? hhmm
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const convDisplayName = (
  c: ReturnType<typeof useMessaging>['conversations'][number],
) => (c.type === 'group' ? c.name || 'Nhóm' : c.otherMember?.name || 'Thành viên');

/**
 * Popover "Tin nội bộ quán" — bấm 1 hội thoại sẽ điều hướng sang trang nhắn tin
 * riêng (theo base path của role) và mở đúng hội thoại đó qua ?conv=.
 */
export function MailBoxPopover() {
  const { conversations, unreadMap, totalUnread } = useMessaging();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 3–5 hội thoại gần nhất (server đã sort updatedAt desc)
  const recent = conversations.slice(0, 5);

  const messagesPath = (() => {
    switch (user?.role) {
      case 'manager':
        return '/manager/messages';
      case 'staff':
        return '/staff/messages';
      case 'super-admin':
        return '/super-admin/messages';
      default:
        return '/admin/messages';
    }
  })();

  const openConversation = (convId: string) => {
    navigate(`${messagesPath}?conv=${convId}`);
  };

  return (
    <PopoverCustom
      align="end"
      trigger={
        <button className="relative p-1 sm:p-2.5 bg-white border hover:bg-gray-100 rounded-lg transition">
          <Mail className="h-4 w-4 text-gray-700" />
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#EB5757] text-white text-[10px] font-bold h-5 min-w-[20px] flex items-center justify-center rounded-full border-2 border-white px-1">
              {totalUnread}
            </span>
          )}
        </button>
      }
    >
      <div className="w-[280px] sm:w-[320px] max-h-[380px] flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <span className="font-bold text-sm text-gray-800">Tin nội bộ quán</span>
          <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
            {totalUnread} mới
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {recent.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400">
              Chưa có hội thoại nào
            </div>
          )}
          {recent.map((chat) => {
            const name = convDisplayName(chat);
            const unread = unreadMap[chat._id] ?? 0;
            return (
              <button
                key={chat._id}
                onClick={() => openConversation(chat._id)}
                className={`w-full p-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer text-left ${
                  unread > 0 ? 'bg-blue-550/5' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-xs font-bold text-gray-800 truncate">{name}</h4>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                      {formatTime(chat.lastMessage?.createdAt ?? chat.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-normal">
                    {chat.lastMessage?.text || 'Bắt đầu trò chuyện'}
                  </p>
                  {unread > 0 && (
                    <span className="inline-block mt-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread} chưa đọc
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => navigate(messagesPath)}
            className="w-full text-center text-[11px] font-semibold text-cerulean-blue-600 hover:text-cerulean-blue-700 py-1"
          >
            Xem tất cả tin nhắn
          </button>
        </div>
      </div>
    </PopoverCustom>
  );
}