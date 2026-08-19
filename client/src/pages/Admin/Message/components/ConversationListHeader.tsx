/* ============================================================================
 * SUB-COMPONENT: ConversationListHeader (search + tabs + nút tạo)
 * ========================================================================== */

import { MessageSquarePlus, Search } from 'lucide-react';
import type { ActiveTabT } from '../MessagePage';
import { cn } from '@/lib/utils';
import PlanGate from '@/components/PlanGate';

interface ConversationListHeaderProps {
  isManager: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  activeTab: ActiveTabT;
  onTabChange: (tab: ActiveTabT) => void;
  onOpenCreateForm: () => void;
  groupChatCount: number;
}

export const ConversationListHeader = ({
  isManager,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onOpenCreateForm,
  groupChatCount,
}: ConversationListHeaderProps) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-4">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Tin nhắn nội bộ</h3>
      {isManager && (
<PlanGate
          resource="group_chats"
          currentCount={groupChatCount}
          fallbackMode="upsell"
          disabledTooltip={`Đã đạt trần ${groupChatCount} nhóm chat của gói hiện tại. Nâng gói để tạo thêm.`}
        >
          <button
            type="button"
            onClick={onOpenCreateForm}
            className="rounded-lg p-1.5 text-cerulean-blue-600 transition-all hover:bg-cerulean-blue-50"
            aria-label="Tạo hội thoại"
            title="Tạo nhóm"
          >
            <MessageSquarePlus size={16} />
          </button>
        </PlanGate>
      )}
    </div>
    <SearchBar value={searchQuery} onChange={onSearchChange} />
    <ConversationTabs activeTab={activeTab} onChange={onTabChange} />
  </div>
);

/* ============================================================================
 * SUB-COMPONENT: SearchBar
 * ========================================================================== */

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

const SearchBar = ({ value, onChange }: SearchBarProps) => (
  <div className="relative w-full">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Tìm kiếm cuộc trò chuyện..."
      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs text-slate-700 outline-none transition-all focus:border-cerulean-blue-500 focus:bg-white"
    />
    <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
  </div>
);

/* ============================================================================
 * SUB-COMPONENT: ConversationTabs
 * ========================================================================== */

interface ConversationTabsProps {
  activeTab: ActiveTabT;
  onChange: (tab: ActiveTabT) => void;
}

const TAB_OPTIONS: { key: ActiveTabT; label: string }[] = [
  { key: 'tat-ca', label: 'Tất cả' },
  { key: 'nhom', label: 'Nhóm' },
  { key: 'noi-bo', label: 'Nội Bộ' },
];

const ConversationTabs = ({ activeTab, onChange }: ConversationTabsProps) => (
  <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
    {TAB_OPTIONS.map((tab) => (
      <button
        key={tab.key}
        type="button"
        onClick={() => onChange(tab.key)}
        className={cn(
          'flex-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
          activeTab === tab.key
            ? 'bg-white text-cerulean-blue-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700',
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);
