import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import { LoadingProvider } from '@/components/LoadingOverlay';
import SidebarApp from '@/components/Sidebar';
import UpsellSubscriptionModal from '@/components/UpsellSubscriptionModal';
import SettingModal from '@/pages/Admin/SettingPage/SettingModal';
import AccountModal from '@/pages/Admin/components/AccountModal';
import MessageModal from '@/pages/Admin/MessageModal/MessageModal';
import { useAuth } from '@/hooks/use-auth';

export default function LayoutAdmin() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isOpenSetting, setIsOpenSetting] = useState(false);
  const [isOpenAccount, setIsOpenAccount] = useState(false);
  const [isOpenMessage, setIsOpenMessage] = useState(false);

  // Admin: "Cài Đặt Chung" = modal tài khoản cá nhân (Q15). Manager: "Cài Đặt Nhà Hàng" → SettingModal.
  const handleOpenSetting = () => {
    if (isAdmin) {
      setIsOpenAccount(true);
    } else {
      setIsOpenSetting(true);
    }
  };

  return (
    <LoadingProvider>
      <SidebarProvider>
        <Toaster />
        <SettingModal isOpen={isOpenSetting} onChangeOpenModal={() => setIsOpenSetting(false)} />
        <AccountModal isOpen={isOpenAccount} onChangeOpenModal={() => setIsOpenAccount(false)} />
        <MessageModal isOpen={isOpenMessage} onChangeOpenModal={() => setIsOpenMessage(false)} />
        <UpsellSubscriptionModal />
        {/* CONTAINER LAYOUT GỐC */}
        <div className="flex h-screen w-full overflow-hidden bg-neutral-50 relative">
          <SidebarApp
            onOpenSetting={handleOpenSetting}
            onOpenMessage={() => setIsOpenMessage(true)}
          />

          <SidebarInset className="flex flex-col flex-1 w-full min-w-0 bg-transparent h-screen overflow-hidden">
            <Header onOpenAccount={() => setIsOpenAccount(true)} />
            <main className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden relative">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </LoadingProvider>
  );
}
