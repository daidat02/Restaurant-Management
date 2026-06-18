import { PopoverCustom } from '@/components/PopoverCusom';
import { Mail } from 'lucide-react';

interface MessageItem {
  id: number;
  sender: string;
  avatar: string;
  excerpt: string;
  time: string;
  isUnread: boolean;
}

interface MailBoxPopoverProps {
  messages: MessageItem[];
  unreadCount: number;
}

export function MailBoxPopover({ messages, unreadCount }: MailBoxPopoverProps) {
  return (
    <PopoverCustom
      align="end"
      trigger={
        <button className="relative p-1 sm:p-2.5 bg-white border hover:bg-gray-100 rounded-lg transition">
          <Mail className="h-4 w-4 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#EB5757] text-white text-[10px] font-bold h-5 min-w-[20px] flex items-center justify-center rounded-full border-2 border-white px-1">
              {unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className="w-[280px] sm:w-[320px] max-h-[380px] flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <span className="font-bold text-sm text-gray-800">Tin nội bộ quán</span>
          <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
            {unreadCount} mới
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                msg.isUnread ? 'bg-blue-550/5' : ''
              }`}
            >
              <img
                src={msg.avatar}
                className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                alt="avatar"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="text-xs font-bold text-gray-800 truncate">{msg.sender}</h4>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                    {msg.time}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-normal">{msg.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PopoverCustom>
  );
}
