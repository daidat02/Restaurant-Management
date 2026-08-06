import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import { LoadingProvider } from '@/components/LoadingOverlay';
import SidebarSuperAdmin from '@/components/SidebarSuperAdmin';
import SettingModal from '@/pages/Admin/SettingPage/SettingModal';
import { MessagingProvider } from '@/hooks/use-messaging';

export default function LayoutSuperAdmin() {
  const [isOpenSetting, setIsOpenSetting] = useState(false);

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
          {/* CONTAINER LAYOUT GỐC */}
          <div className="flex h-screen w-full overflow-hidden bg-neutral-50 relative">
            <SidebarSuperAdmin onOpenSetting={() => setIsOpenSetting(true)} />

            <SidebarInset className="flex flex-col flex-1 w-full min-w-0 bg-transparent h-screen overflow-hidden">
              <Header />
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
