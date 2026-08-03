import { useEffect, useState, useMemo } from 'react';
import {
  Lock,
  Sliders,
  LayoutGrid,
  UtensilsCrossed,
  Receipt,
  X,
  Globe,
  Store,
  Save,
  User,
  LogOut,
  Mail,
  CreditCard,
} from 'lucide-react';
import { DialogCustom } from '@/components/DialogCustom';
import { TabProfile, TabSystem } from './components/SettingTabContent';
import { useTable } from '@/hooks/use-table';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import type { IRestaurant } from '@/types/restaurant.type';
import { FormAddTable } from './components/FormCreateTable';
import { FormAddCategory } from './components/FormCreateCategory';
import { useMenu } from '@/hooks/use-menu';
import type { ITable } from '@/types/table.type';
import { useSetting } from '@/hooks/use-setting';
import type { IBankAccountConfig, IReceiptConfig, ISetting } from '@/types/setting.type';
import { TabTables } from './components/TabTables';
import { TabMenuConfig } from './components/TabMenuConfig';
import { TabReceipt } from './components/TabReceipt';
import { TabIntegrations } from './components/TabIntegrations';
import TabGateway from './components/TabGateway';
import { CustomInput } from '@/components/FormInput';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { toast } from 'sonner';

interface SettingModalProps {
  isOpen: boolean;
  onChangeOpenModal: () => void;
  /**
   * Ticket 09: chỉ định nhà hàng cấu hình (admin mở Cài Đặt từ danh sách chi nhánh).
   * Khi có override → mọi hook trong modal dùng id này; ngược lại dùng useActiveRestaurantId() (manager/staff).
   */
  restaurantIdOverride?: string;
}

type SettingTab =
  | 'info'
  | 'security'
  | 'gateway'
  | 'profile'
  | 'tables'
  | 'menu_config'
  | 'receipt'
  | 'integrations'
  | 'system';

const SettingModal = ({ isOpen, onChangeOpenModal, restaurantIdOverride }: SettingModalProps) => {
  const { user, logout } = useAuth();
  const { editProfile, changePassword } = useUser();
  const activeRestaurantId = useActiveRestaurantId();
  const { selectedRestaurant, selectRestaurant, updateRestaurant } = useRestaurant();
  const { tables, fetchTablesByRestaurant, addTable, editTable } = useTable();
  const { categories, fetchCategories, addCategory } = useMenu();
  const {
    currentSetting,
    fetchSettingById,
    editSetting,
    changePaymentMethodType,
    generateKitchenCode,
  } = useSetting();

  // Nhà hàng hiệu lực: override (admin từ trang chi nhánh) ưu tiên hơn useActiveRestaurantId.
  const effectiveRestaurantId = restaurantIdOverride || activeRestaurantId;

  // --- 🛠️ 0. THÔNG TIN CÁ NHÂN + BẢO MẬT (mọi role; ticket 05) ---
  // Manager thấy tab cấu hình nhà hàng; Admin chỉ thấy khi mở từ bánh răng chi nhánh (override, ticket 06).
  const canSeeRestaurantTabs =
    user?.role === 'manager' || (user?.role === 'admin' && Boolean(restaurantIdOverride));
  // Tab cấu hình cổng thanh toán hệ thống — chỉ Super Admin (Ticket 07)
  const canSeeGatewayTab = user?.role === 'super-admin';
  const [personalName, setPersonalName] = useState(user?.name || '');
  const [personalPhone, setPersonalPhone] = useState(user?.phone || '');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  const [activeTab, setActiveTab] = useState<SettingTab>(restaurantIdOverride ? 'profile' : 'info');

  const handleSavePersonal = async () => {
    if (!personalName.trim()) {
      toast.error('Họ và tên không được để trống', { position: 'top-right' });
      return;
    }
    setSavingInfo(true);
    await editProfile({ name: personalName.trim(), phone: personalPhone });
    setSavingInfo(false);
  };

  const handleChangePassword = async () => {
    if (!curPass || !newPass) {
      toast.error('Vui lòng nhập đầy đủ mật khẩu', { position: 'top-right' });
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Mật khẩu mới không khớp', { position: 'top-right' });
      return;
    }
    setSavingPass(true);
    const ok = await changePassword(curPass, newPass);
    setSavingPass(false);
    if (ok) {
      setCurPass('');
      setNewPass('');
      setConfirmPass('');
    }
  };

  const handleLogout = () => {
    onChangeOpenModal();
    logout();
  };

  const [openModalTable, setOpenModalTable] = useState(false);
  const [tableSelected, setTableSelected] = useState<ITable | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectionVerified, setIsConnectionVerified] = useState(true);
  // --- 🛠️ 1. HỆ THỐNG STATE GỐC ĐỂ ĐỐI CHIẾU THAY ĐỔI (ORIGINAL STATES) ---
  const [originalRestaurant, setOriginalRestaurant] = useState<IRestaurant | null>(null);
  const [originalReceiptConfig, setOriginalReceiptConfig] = useState<IReceiptConfig | null>(null);
  const [originalSystemConfig, setOriginalSystemConfig] = useState({ autoPushKDS: true });
  const [originalPaymentMethodType, setOriginalPaymentMethodType] =
    useState<ISetting['paymentMethodType']>('none');
  const [originalIntegrations, setOriginalIntegrations] = useState<any>({
    payOS: { clientId: '', apiKey: '', checksumKey: '' },
  });
  const [originalBankAccount, setOriginalBankAccount] = useState<IBankAccountConfig>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    bin: '',
  });

  // --- 🛠️ 2. HỆ THỐNG STATE CHỈNH SỬA HIỆN TẠI TRÊN UI (EDITING STATES) ---
  const [profileConfig, setProfileConfig] = useState<IRestaurant | null>(null);
  const [receiptConfig, setReceiptConfig] = useState<IReceiptConfig | null>(null);
  const [systemConfig, setSystemConfig] = useState({ autoPushKDS: true });
  const [paymentMethodType, setPaymentMethodType] = useState<ISetting['paymentMethodType']>('none');
  const [integrationsConfig, setIntegrationsConfig] = useState<any>({
    payOS: { clientId: '', apiKey: '', checksumKey: '' },
  });
  const [bankAccountConfig, setBankAccountConfig] = useState<IBankAccountConfig>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    bin: '',
  });

  const isProfileDirty = useMemo(() => {
    if (!profileConfig || !originalRestaurant) return false;
    return JSON.stringify(profileConfig) !== JSON.stringify(originalRestaurant);
  }, [profileConfig, originalRestaurant]);

  const isReceiptDirty = useMemo(() => {
    if (!receiptConfig || !originalReceiptConfig) return false;
    return JSON.stringify(receiptConfig) !== JSON.stringify(originalReceiptConfig);
  }, [receiptConfig, originalReceiptConfig]);

  const isSystemDirty = useMemo(() => {
    return JSON.stringify(systemConfig) !== JSON.stringify(originalSystemConfig);
  }, [systemConfig, originalSystemConfig]);

  const isPaymentConfigDirty = useMemo(() => {
    if (paymentMethodType !== originalPaymentMethodType) return true;
    if (paymentMethodType === 'payos') {
      return JSON.stringify(integrationsConfig) !== JSON.stringify(originalIntegrations);
    }
    if (paymentMethodType === 'bank_transfer') {
      return JSON.stringify(bankAccountConfig) !== JSON.stringify(originalBankAccount);
    }
    return false;
  }, [
    paymentMethodType,
    originalPaymentMethodType,
    integrationsConfig,
    originalIntegrations,
    bankAccountConfig,
    originalBankAccount,
  ]);

  // Xác định xem tab hiện tại có dữ liệu thay đổi để kích hoạt thanh công cụ hay không
  const isCurrentTabDirty = useMemo(() => {
    switch (activeTab) {
      case 'profile':
        return isProfileDirty;
      case 'receipt':
        return isReceiptDirty;
      case 'integrations':
        if (paymentMethodType === 'payos') {
          return isPaymentConfigDirty && isConnectionVerified;
        }
        return isPaymentConfigDirty;
      case 'system':
        return isSystemDirty;
      default:
        return false;
    }
  }, [
    activeTab,
    isProfileDirty,
    isReceiptDirty,
    isPaymentConfigDirty,
    isSystemDirty,
    isConnectionVerified,
    paymentMethodType,
  ]);
  useEffect(() => {
    if (effectiveRestaurantId) {
      fetchTablesByRestaurant(effectiveRestaurantId);
      selectRestaurant(effectiveRestaurantId);
      fetchCategories(effectiveRestaurantId);
      fetchSettingById(effectiveRestaurantId);
    }
  }, [effectiveRestaurantId]);

  useEffect(() => {
    if (selectedRestaurant) {
      setOriginalRestaurant(selectedRestaurant as IRestaurant);
      setProfileConfig(selectedRestaurant as IRestaurant);
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    if (currentSetting) {
      // 4.1 Cấu hình hóa đơn
      setOriginalReceiptConfig(currentSetting.receiptConfig as IReceiptConfig);
      setReceiptConfig(currentSetting.receiptConfig as IReceiptConfig);

      // 4.2 Cấu hình thanh toán (Chuyển khoản / PayOS)
      const method = currentSetting.paymentMethodType || 'none';
      const integrations = currentSetting.integrations;
      const bank = currentSetting.bankAccount || {
        bankName: '',
        accountNumber: '',
        accountName: '',
        bin: '',
      };

      setOriginalPaymentMethodType(method);
      setPaymentMethodType(method);

      setOriginalIntegrations(integrations);
      setIntegrationsConfig(integrations);

      setOriginalBankAccount(bank);
      setBankAccountConfig(bank);
      const hasKeyBackend =
        currentSetting.integrations?.payOS?.hasApiKey ||
        !!currentSetting.integrations?.payOS?.clientId;

      const initialPayOSData = {
        clientId: integrations?.payOS?.clientId || '',
        apiKey: hasKeyBackend ? '••••••••••••••••' : '',
        checksumKey: hasKeyBackend ? '••••••••••••••••' : '',
      };

      setOriginalIntegrations({ payOS: initialPayOSData });
      setIntegrationsConfig({ payOS: initialPayOSData });

      const sysConfig = currentSetting.systemConfig || { autoPushKDS: true };
      setOriginalSystemConfig(sysConfig);
      setSystemConfig(sysConfig);
    }
  }, [currentSetting]);

  const handleSaveChanges = async () => {
    if (!currentSetting?._id) return;
    setIsSaving(true);
    try {
      if (activeTab === 'profile' && profileConfig) {
        // Lưu hồ sơ chi nhánh (ticket 09) — chỉ admin có quyền update restaurant.
        const updated = await updateRestaurant(profileConfig._id, profileConfig);
        if (updated) setOriginalRestaurant(profileConfig);
      } else if (activeTab === 'receipt' && receiptConfig) {
        await editSetting(currentSetting._id, { receiptConfig });
        setOriginalReceiptConfig(receiptConfig);
        console.log('Đã lưu cấu hình hóa đơn thành công!');
      } else if (activeTab === 'integrations') {
        const payload: Partial<ISetting> = {
          integrations: {
            payOS: paymentMethodType === 'payos' ? integrationsConfig : undefined,
          },
          bankAccount: paymentMethodType === 'bank_transfer' ? bankAccountConfig : undefined,
        };

        await changePaymentMethodType(currentSetting._id, paymentMethodType, payload);

        setOriginalPaymentMethodType(paymentMethodType);
        setOriginalIntegrations(integrationsConfig);
        setOriginalBankAccount(bankAccountConfig);
        console.log('Đã lưu cấu hình thanh toán thành công!');
      } else if (activeTab === 'system') {
        await editSetting(currentSetting._id, { systemConfig: systemConfig as any });
        setOriginalSystemConfig(systemConfig);
        console.log('Đã lưu cấu hình tham số hệ thống!');
      }
    } catch (error) {
      console.error('Lỗi khi thực hiện lưu dữ liệu cài đặt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    if (activeTab === 'profile') {
      setProfileConfig({ ...originalRestaurant } as IRestaurant);
    } else if (activeTab === 'receipt') {
      setReceiptConfig({ ...originalReceiptConfig } as IReceiptConfig);
    } else if (activeTab === 'integrations') {
      setPaymentMethodType(originalPaymentMethodType);
      setIntegrationsConfig(originalIntegrations);
      setBankAccountConfig(originalBankAccount);
    } else if (activeTab === 'system') {
      setSystemConfig({ ...originalSystemConfig });
    }
  };

  const renderSettingContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User size={15} className="text-cerulean-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Thông Tin Cá Nhân</h4>
            </div>
            <CustomInput
              label="Họ và tên"
              value={personalName}
              onChange={(e) => setPersonalName(e.target.value)}
            />
            <CustomInput
              label="Số điện thoại"
              value={personalPhone}
              onChange={(e) => setPersonalPhone(e.target.value)}
            />
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Mail size={14} />
              <span>{user?.email}</span>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={savingInfo || !personalName.trim()}
                onClick={handleSavePersonal}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-300 transition-all"
              >
                {savingInfo ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Lock size={15} className="text-cerulean-blue-600" />
              <h4 className="text-sm font-bold text-slate-900">Mật khẩu & Bảo Mật</h4>
            </div>
            <div className="flex flex-col gap-3">
              <CustomInput
                type="password"
                label="Mật khẩu hiện tại"
                placeholder="••••••••"
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
              />
              <CustomInput
                type="password"
                label="Mật khẩu mới"
                placeholder="••••••••"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <CustomInput
                type="password"
                label="Xác nhận mật khẩu mới"
                placeholder="••••••••"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={savingPass || !curPass || !newPass || newPass !== confirmPass}
                onClick={handleChangePassword}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-300 transition-all"
              >
                {savingPass ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </div>
        );
      case 'gateway':
        return <TabGateway />;
      case 'profile':
        return profileConfig ? (
          <TabProfile data={profileConfig} onChange={setProfileConfig} />
        ) : null;
      case 'tables':
        return (
          <TabTables
            list={tables}
            onSelect={(table) => {
              setTableSelected(table);
              setOpenModalTable(true);
            }}
            onOpenCreateModal={() => {
              setTableSelected(null);
              setOpenModalTable(true);
            }}
          />
        );
      case 'menu_config':
        return (
          <TabMenuConfig
            list={categories}
            onToggle={(id) => {}}
            onOpenCreateModal={() => setOpenModalTable(true)}
          />
        );
      case 'receipt':
        return receiptConfig ? (
          <TabReceipt data={receiptConfig} onChange={setReceiptConfig} />
        ) : null;
      case 'integrations':
        return (
          <TabIntegrations
            data={integrationsConfig?.payOS}
            bankAccount={bankAccountConfig}
            paymentMethodType={paymentMethodType}
            onChange={(updatedFields: any) => {
              if (updatedFields.integrations) setIntegrationsConfig(updatedFields.integrations);
              if (updatedFields.bankAccount) setBankAccountConfig(updatedFields.bankAccount);
            }}
            onSelectMethod={(val) => setPaymentMethodType(val)}
            onConnectVerified={(isValid) => setIsConnectionVerified(isValid)}
          />
        );
      case 'system':
        return (
          <TabSystem
            data={systemConfig}
            onChange={setSystemConfig}
            settingId={currentSetting?._id}
            onGenerateKitchenCode={generateKitchenCode}
          />
        );
      default:
        return null;
    }
  };

  // Logic phụ trợ đóng mở form CRUD bàn/danh mục
  const handleFormSubmit = async (formData: Partial<ITable>) => {
    if (tableSelected) {
      await editTable(tableSelected._id, formData);
    } else {
      await addTable(formData);
    }
    setOpenModalTable(false);
    setTableSelected(null);
  };

  const personalMenu = [
    { id: 'info', title: 'Thông Tin Cá Nhân', icon: User },
    { id: 'security', title: 'Mật Khẩu & Bảo Mật', icon: Lock },
  ] as const;

  // Chỉ Super Admin được xem tab cấu hình cổng thanh toán hệ thống (Ticket 07)
  const gatewayMenu = [{ id: 'gateway', title: 'Thanh Toán Hệ Thống', icon: CreditCard }] as const;

  const restaurantMenu = [
    { id: 'profile', title: 'Thông Tin Nhà Hàng', icon: Store },
    { id: 'tables', title: 'Sơ Đồ & Tạo Bàn Mới', icon: LayoutGrid },
    { id: 'menu_config', title: 'Thiết Lập Danh Mục', icon: UtensilsCrossed },
    { id: 'receipt', title: 'Cấu Hình Hóa Đơn', icon: Receipt },
    { id: 'integrations', title: 'Cấu Hình Thanh Toán', icon: Globe },
    { id: 'system', title: 'Tham Số Hệ Thống', icon: Sliders },
  ] as const;

  // Admin/Staff/Super-Admin mở từ Sidebar: chỉ cá nhân + bảo mật; Manager (và Admin qua override) thêm tab cấu hình nhà hàng (ticket 05).
  const settingMenu = canSeeRestaurantTabs
    ? [...personalMenu, ...restaurantMenu]
    : canSeeGatewayTab
      ? [...personalMenu, ...gatewayMenu]
      : personalMenu;

  return (
    <DialogCustom
      open={isOpen}
      onOpenChange={() => onChangeOpenModal()}
      contentClass="!max-w-3xl max-h-screen w-[95vw] md:w-[800px] p-0 lg:w-[1200px] rounded-lg overflow-hidden"
      content={
        <div className="flex h-[95vh] rounded-2xl overflow-hidden bg-white text-slate-700">
          {/* Sub-modal phục vụ thêm sửa nhanh bàn/danh mục */}
          <DialogCustom
            open={openModalTable}
            onOpenChange={() => setOpenModalTable(false)}
            content={
              activeTab === 'tables' ? (
                <FormAddTable
                  restaurantId={selectedRestaurant?._id as string}
                  onSuccess={() => setOpenModalTable(false)}
                  onSubmit={handleFormSubmit}
                  editData={tableSelected}
                />
              ) : activeTab === 'menu_config' ? (
                <FormAddCategory
                  restaurantId={selectedRestaurant?._id as string}
                  onSuccess={() => setOpenModalTable(false)}
                  onSubmit={(data) => {
                    addCategory(data);
                  }}
                />
              ) : null
            }
          />

          {/* MENU CÀI ĐẶT BÊN TRÁI */}
          <div className="bg-slate-50 border-r border-slate-100 p-4 flex flex-col gap-1.5 shrink-0 select-none rounded-l-lg w-[150px] md:w-[220px]">
            <div className="px-3 mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Cài Đặt Hệ Thống
              </h3>
            </div>

            {settingMenu.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-3 px-3 py-2 h-9 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-cerulean-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                  <span>{item.title}</span>
                </button>
              );
            })}

            {/* NÚT ĐĂNG XUẤT — cuối thanh bên modal, mọi role (ticket 05) */}
            <div className="mt-auto pt-3 border-t border-slate-200/70">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 h-9 w-full rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut size={14} />
                <span>Đăng Xuất</span>
              </button>
            </div>
          </div>

          {/* VÙNG NỘI DUNG BÊN PHẢI CÓ THANH THÔNG BÁO LƯU ẨN HIỆN */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {/* Header đóng modal */}
            <div className="w-full flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => onChangeOpenModal()}
                className="p-1.5 mr-4 mt-3 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all shadow-sm md:shadow-none bg-white md:bg-transparent"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Khung cuộn nội dung form cài đặt */}
            <div className="flex-1 overflow-y-auto px-6 pb-20 pt-2 custom-scrollbar">
              {renderSettingContent()}
            </div>

            {/* THANH THÔNG BÁO (ACTION BAR) CHỈ HIỆN KHI CÓ THAY ĐỔI DỮ LIỆU */}
            <div
              className={`absolute bottom-0 right-0 left-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-end items-center gap-3 transition-all duration-300 transform shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20
                ${isCurrentTabDirty ? 'translate-y-0 opacity-100 visible' : 'translate-y-full opacity-0 invisible'}`}
            >
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Bạn có thay đổi chưa lưu trên tab này
              </span>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleCancelChanges}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
              >
                Hủy thay đổi
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveChanges}
                className="flex items-center gap-2 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 disabled:bg-cerulean-blue-400 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
              >
                <Save size={14} className={isSaving ? 'animate-spin' : ''} />
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default SettingModal;
