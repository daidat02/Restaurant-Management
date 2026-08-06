import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import { LoadingProvider } from '@/components/LoadingOverlay';
import SidebarApp from '@/components/Sidebar';
import UpsellSubscriptionModal from '@/components/UpsellSubscriptionModal';
import SettingModal from '@/pages/Admin/SettingPage/SettingModal';
import MessageModal from '@/pages/Admin/MessageModal/MessageModal';
import { MessagingProvider } from '@/hooks/use-messaging';

export default function LayoutAdmin() {
  const [isOpenSetting, setIsOpenSetting] = useState(false);
  const [isOpenMessage, setIsOpenMessage] = useState(false);
  // Signal mở modal tại đúng hội thoại (từ MailBoxPopover); null = mở bình thường không chọn conv.
  const [openMessageWithConv, setOpenMessageWithConv] = useState<string | null>(null);

  const handleOpenMessage = () => {
    setOpenMessageWithConv(null);
    setIsOpenMessage(true);
  };

  return (
    <LoadingProvider>
      <MessagingProvider>
        <SidebarProvider>
          <Toaster />
          <SettingModal
            key={isOpenSetting ? 'open' : 'closed'}
            isOpen={isOpenSetting}
            onChangeOpenModal={() => setIsOpenSetting(false)}
          />
          <MessageModal
            isOpen={isOpenMessage}
            onChangeOpenModal={() => setIsOpenMessage(false)}
            initialConversationId={openMessageWithConv}
          />
          <UpsellSubscriptionModal />
          {/* CONTAINER LAYOUT GỐC */}
          <div className="flex h-screen w-full overflow-hidden bg-neutral-50 relative">
            <SidebarApp
              onOpenSetting={() => setIsOpenSetting(true)}
              onOpenMessage={handleOpenMessage}
            />

            <SidebarInset className="flex flex-col flex-1 w-full min-w-0 bg-transparent h-screen overflow-hidden">
              <Header onOpenConversation={(convId) => {
                setOpenMessageWithConv(convId);
                setIsOpenMessage(true);
              }} />
              <main className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden relative">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </MessagingProvider>
    </LoadingProvider>
  );
}
