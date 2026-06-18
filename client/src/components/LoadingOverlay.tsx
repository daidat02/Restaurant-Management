import React, { createContext, useContext, useState } from 'react';
import { Loader2 } from 'lucide-react';

// 1. Định nghĩa các hàm bạn muốn gọi (giống như loading(true) của bạn)
interface LoadingContextType {
  showLoading: (text?: string) => void;
  hideLoading: () => void;
  spinner?: React.ReactNode; // Nếu bạn muốn tùy chỉnh spinner
  spinnerColor?: string; // Màu sắc spinner nếu bạn muốn
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// 2. Component Provider bọc ngoài cùng
export const LoadingProvider: React.FC<{
  children: React.ReactNode;
  spinner?: React.ReactNode;
  spinnerColor?: string;
}> = ({ children, spinner, spinnerColor }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Đang xử lý...');

  // Hàm bật loading (bạn có thể truyền chữ tùy ý)
  const showLoading = (text = 'Đang xử lý...') => {
    setLoadingText(text);
    setIsLoading(true);
  };

  // Hàm tắt loading
  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, spinner, spinnerColor }}>
      {children}

      {/* 3. Đặt giao diện Loading ở đây, nó sẽ nằm đè lên toàn bộ App */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 min-w-[200px]">
            {spinner || (
              <Loader2 className={`w-10 h-10 ${spinnerColor || 'text-blue-500'} animate-spin`} />
            )}
            <span className="text-gray-700 font-medium text-sm animate-pulse">{loadingText}</span>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

// 4. Hook để gọi ở bất kỳ đâu (như file useMenu)
export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useGlobalLoading phải được dùng trong LoadingProvider');
  return context;
};
