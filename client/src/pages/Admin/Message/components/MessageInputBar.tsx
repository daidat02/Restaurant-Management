/* ============================================================================
 * SUB-COMPONENT: MessageInputBar
 * ========================================================================== */

import { Send } from 'lucide-react';
import type { ConversationT } from '../MessagePage';

interface MessageInputBarProps {
  currentChat?: ConversationT;
  inputMessage: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onEnterSend: () => void;
  convName: (conv: ConversationT) => string;
  activeConversationId: string | null | undefined;
  onTyping: (id: string, typing: boolean) => void;
}

const MAX_LENGTH = 2000;

export const MessageInputBar = ({
  currentChat,
  inputMessage,
  onChange,
  onSubmit,
  onEnterSend,
  convName,
  activeConversationId,
  onTyping,
}: MessageInputBarProps) => (
  <>
    <form
      onSubmit={onSubmit}
      className="z-10 flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white p-3"
    >
      <input
        type="text"
        value={inputMessage}
        maxLength={MAX_LENGTH}
        onChange={(e) => {
          onChange(e.target.value);
          if (activeConversationId) onTyping(activeConversationId, e.target.value.length > 0);
        }}
        onKeyDown={(e) => {
          // Enter: gửi; Ctrl+Enter / Shift+Enter: xuống dòng
          if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            if (activeConversationId && inputMessage.trim()) onEnterSend();
          }
        }}
        disabled={!currentChat}
        placeholder={
          currentChat
            ? `Nhập tin nhắn đến ${convName(currentChat)}... (Enter để gửi)`
            : 'Vui lòng chọn chat'
        }
        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cerulean-blue-500 focus:bg-white disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!inputMessage.trim() || !currentChat}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-600 shadow-sm transition-all hover:bg-cerulean-blue-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400"
        aria-label="Gửi tin nhắn"
      >
        <Send size={13} className="ml-0.5" />
      </button>
    </form>
    {currentChat && inputMessage.length >= MAX_LENGTH - 100 && (
      <div className="pointer-events-none absolute bottom-12 right-3 text-[9px] text-slate-400">
        {inputMessage.length}/{MAX_LENGTH}
      </div>
    )}
  </>
);
