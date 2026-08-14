/* ============================================================================
 * SUB-COMPONENT: EmptyMessagesState / MessagesArea
 * ========================================================================== */

import type { useMessaging } from '@/hooks/use-messaging';
import { Loader2, MessageSquarePlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/helpers';
import type { ConversationT } from '../MessagePage';

interface MessagesAreaProps {
  currentChat?: ConversationT;
  messages?: ReturnType<typeof useMessaging>['messagesMap'][string];
  isMessageLoading: boolean;
  currentUserId: string;
  convName: (conv: ConversationT) => string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const MessagesArea = ({
  currentChat,
  messages,
  isMessageLoading,
  currentUserId,
  convName,
  scrollRef,
  onScroll,
}: MessagesAreaProps) => (
  <div
    ref={scrollRef}
    onScroll={onScroll}
    className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50/40 p-4"
  >
    {!currentChat ? (
      <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
        <User size={36} className="mb-2 stroke-[1.5] text-slate-200" />
        <p className="text-xs">Hãy chọn một cuộc hội thoại để bắt đầu nhắn tin</p>
      </div>
    ) : messages ? (
      messages.length > 0 ? (
        messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            msg={msg}
            isOwn={msg.senderId === currentUserId}
            avatarChar={convName(currentChat).charAt(0)}
          />
        ))
      ) : (
        <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
          <MessageSquarePlus size={36} className="mb-2 stroke-[1.5] text-slate-200" />
          <p className="text-xs">Chưa có tin nhắn nào — hãy gửi tin đầu tiên</p>
        </div>
      )
    ) : isMessageLoading ? (
      <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
        <Loader2 size={28} className="mb-2 animate-spin text-cerulean-blue-500" />
        <p className="text-xs">Đang tải tin nhắn...</p>
      </div>
    ) : (
      <div className="flex h-full select-none flex-col items-center justify-center text-slate-400">
        <MessageSquarePlus size={36} className="mb-2 stroke-[1.5] text-slate-200" />
        <p className="text-xs">Chưa có tin nhắn nào — hãy gửi tin đầu tiên</p>
      </div>
    )}
  </div>
);

interface MessageBubbleProps {
  msg: ReturnType<typeof useMessaging>['messagesMap'][string][number];
  isOwn: boolean;
  avatarChar: string;
}

const MessageBubble = ({ msg, isOwn, avatarChar }: MessageBubbleProps) => (
  <div className={cn('flex max-w-[80%] gap-2', isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
    {/* Avatar nhỏ bên cạnh tin nhắn */}
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white bg-slate-200 text-[9px] font-bold uppercase shadow-sm">
      {isOwn ? 'ME' : avatarChar}
    </div>

    {/* Khối bong bóng tin nhắn */}
    <div className="flex flex-col">
      <div
        className={cn(
          'break-words rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm',
          isOwn
            ? 'rounded-tr-none bg-cerulean-blue-600 text-white'
            : 'rounded-tl-none border border-slate-100 bg-white text-slate-800',
        )}
      >
        {msg.text}
      </div>

      {/* Thời gian */}
      <div
        className={cn(
          'mt-1 flex items-center gap-1 text-[9px] text-slate-400',
          isOwn ? 'justify-end' : 'justify-start',
        )}
      >
        <span>{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  </div>
);
