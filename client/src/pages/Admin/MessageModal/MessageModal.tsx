import { useState, useMemo } from 'react';
import {
  X,
  Search,
  Send,
  User,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Circle,
} from 'lucide-react';
import { DialogCustom } from '@/components/DialogCustom';

interface MessageModalProps {
  isOpen: boolean;
  onChangeOpenModal: () => void;
}

// --- 📦 DATA MOCK HỆ THỐNG TIN NHẮN ---
const MOCK_CONVERSATIONS = [
  {
    id: 'conv_1',
    name: 'Nguyễn Văn A (Bàn 5)',
    avatar: '',
    lastMessage: 'Dạ shop ơi cho em đổi món súp sang lẩu được không ạ?',
    time: '12:45',
    unread: 2,
    online: true,
    role: 'Khách hàng',
  },
  {
    id: 'conv_2',
    name: 'Trần Thị B (Bàn 12)',
    avatar: '',
    lastMessage: 'Đã thanh toán qua VietQR rồi nhé ad',
    time: '11:20',
    unread: 0,
    online: false,
    role: 'Khách hàng',
  },
  {
    id: 'conv_3',
    name: 'Bếp Trưởng (Lầu 1)',
    avatar: '',
    lastMessage: 'Món cá kho của bàn số 3 xong rồi nhé, giục tiếp viên qua lấy',
    time: 'Hôm qua',
    unread: 0,
    online: true,
    role: 'Nhân viên',
  },
  {
    id: 'conv_4',
    name: 'Lê Văn C (Bàn 2)',
    avatar: '',
    lastMessage: 'Lên cho em xin thêm cái khăn giấy',
    time: 'Hôm qua',
    unread: 0,
    online: false,
    role: 'Khách hàng',
  },
];

const MOCK_MESSAGES_MAP: Record<string, any[]> = {
  conv_1: [
    {
      id: 'm1',
      sender: 'customer',
      text: 'Xin chào nhà hàng, mình vừa đặt bàn số 5',
      time: '12:40',
    },
    {
      id: 'm2',
      sender: 'staff',
      text: 'Dạ vâng xin chào anh A, nhà hàng đã nhận đơn và đang chuẩn bị món cho anh rồi ạ 🥰',
      time: '12:41',
    },
    {
      id: 'm3',
      sender: 'customer',
      text: 'Dạ shop ơi cho em đổi món súp sang lẩu được không ạ?',
      time: '12:45',
    },
  ],
  conv_2: [
    { id: 'm4', sender: 'customer', text: 'Kiểm tra hộ mình hóa đơn bàn 12', time: '11:15' },
    {
      id: 'm5',
      sender: 'staff',
      text: 'Dạ tổng bill của mình là 450.000đ ạ. Anh có thể quét mã QR đặt trên bàn để thanh toán nhé.',
      time: '11:18',
    },
    { id: 'm6', sender: 'customer', text: 'Đã thanh toán qua VietQR rồi nhé ad', time: '11:20' },
  ],
};

const MessageModal = ({ isOpen, onChangeOpenModal }: MessageModalProps) => {
  const [activeConvId, setActiveConvId] = useState<string>('conv_1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [messagesMap, setMessagesMap] = useState(MOCK_MESSAGES_MAP);

  // Lọc danh sách hội thoại theo ô tìm kiếm
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [conversations, searchQuery]);

  // Lấy chi tiết cuộc trò chuyện hiện tại đang chọn
  const currentChat = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId);
  }, [conversations, activeConvId]);

  // Xử lý gửi tin nhắn mới
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const timeNow = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Cập nhật tin nhắn vào map chat
    const currentChatMessages = messagesMap[activeConvId] || [];
    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: 'staff',
      text: inputMessage,
      time: timeNow,
    };
    setMessagesMap({
      ...messagesMap,
      [activeConvId]: [...currentChatMessages, newMessage],
    });

    // 2. Cập nhật tin nhắn cuối cùng ra ngoài danh sách bên trái
    setConversations(
      conversations.map((c) =>
        c.id === activeConvId ? { ...c, lastMessage: inputMessage, time: timeNow, unread: 0 } : c,
      ),
    );

    setInputMessage('');
  };

  // Đọc tin nhắn (xóa chấm đỏ thông báo) khi bấm vào hội thoại
  const handleSelectChat = (id: string) => {
    setActiveConvId(id);
    setConversations(conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
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
            {/* Header tìm kiếm */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Tin nhắn nội bộ
                </h3>
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

            {/* List Chat cuộn */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredConversations.map((chat) => {
                const isSelected = activeConvId === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`w-full flex gap-3 p-3 rounded-xl text-left transition-all relative group ${
                      isSelected
                        ? 'bg-cerulean-blue-50 border border-cerulean-blue-100'
                        : 'hover:bg-slate-200/50'
                    }`}
                  >
                    {/* Avatar mock */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-100 uppercase">
                        {chat.name.charAt(0)}
                      </div>
                      {chat.online && (
                        <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full fill-green-500 text-white stroke-2" />
                      )}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-slate-800 truncate pr-2">
                          {chat.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {chat.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{chat.lastMessage}</p>
                      <span
                        className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          chat.role === 'Khách hàng'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {chat.role}
                      </span>
                    </div>

                    {/* Số tin nhắn chưa đọc */}
                    {chat.unread > 0 && (
                      <span className="absolute right-3 bottom-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm animate-bounce">
                        {chat.unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredConversations.length === 0 && (
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
                    {currentChat.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {currentChat.name}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      {currentChat.online ? (
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
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <Phone size={15} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <Video size={15} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <MoreVertical size={15} />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
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
            <div className="flex-1 overflow-y-auto bg-slate-50/40 p-4 space-y-4 custom-scrollbar">
              {currentChat && messagesMap[currentChat.id] ? (
                messagesMap[currentChat.id].map((msg) => {
                  const isStaff = msg.sender === 'staff';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 max-w-[80%] ${isStaff ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar nhỏ bên cạnh tin nhắn */}
                      <div className="h-6 w-6 rounded-lg bg-slate-200 shrink-0 flex items-center justify-center font-bold text-[9px] uppercase border border-white shadow-sm">
                        {isStaff ? 'ME' : currentChat.name.charAt(0)}
                      </div>

                      {/* Khối bong bóng tin nhắn */}
                      <div className="flex flex-col">
                        <div
                          className={`px-3 py-2 text-xs rounded-2xl shadow-sm leading-relaxed break-words ${
                            isStaff
                              ? 'bg-cerulean-blue-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {/* Thời gian + Trạng thái đã xem */}
                        <div
                          className={`flex items-center gap-1 mt-1 text-[9px] text-slate-400 ${isStaff ? 'justify-end' : 'justify-start'}`}
                        >
                          <span>{msg.time}</span>
                          {isStaff && <CheckCheck size={11} className="text-cerulean-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
                  <User size={36} className="text-slate-200 mb-2 stroke-[1.5]" />
                  <p className="text-xs">Hãy chọn một cuộc hội thoại để bắt đầu nhắn tin</p>
                </div>
              )}
            </div>

            {/* Ô THANH CHỮ ĐÁY CHÁT (GỬI TIN NHẮN) */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 z-10"
            >
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Paperclip size={15} />
                </button>
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Smile size={15} />
                </button>
              </div>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={!currentChat}
                placeholder={
                  currentChat ? `Nhập tin nhắn đến ${currentChat.name}...` : 'Vui lòng chọn chat'
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-cerulean-blue-500 transition-all disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || !currentChat}
                className="h-8 w-8 rounded-xl bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 flex items-center justify-center shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Send size={13} className="ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      }
    />
  );
};

export default MessageModal;
