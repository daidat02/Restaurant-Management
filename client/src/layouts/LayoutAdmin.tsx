import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import { LoadingProvider } from '@/components/LoadingOverlay';
import SidebarApp from '@/components/Sidebar';
import UpsellSubscriptionModal from '@/components/UpsellSubscriptionModal';
import { MessagingProvider } from '@/hooks/use-messaging';
import { PlanProvider } from '@/contexts/PlanContext';

export default function LayoutAdmin() {
  return (
    <LoadingProvider>
      <MessagingProvider>
        <PlanProvider>
          <SidebarProvider>
          <Toaster />
          <UpsellSubscriptionModal />
          {/* CONTAINER LAYOUT GỐC */}
          <div className="flex h-screen w-full overflow-hidden bg-neutral-50 relative">
            <SidebarApp />

            <SidebarInset className="flex flex-col flex-1 w-full min-w-0 bg-transparent h-screen overflow-hidden">
              <Header />
              <main className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden relative">
                <Outlet />
              </main>
            </SidebarInset>
          </div>
          </SidebarProvider>
        </PlanProvider>
      </MessagingProvider>
    </LoadingProvider>
  );
}
