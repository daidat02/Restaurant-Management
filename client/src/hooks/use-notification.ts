import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/notification.api';
import { socket } from '@/configs/socket.io';
import type { INotification } from '@/types/noti.type';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import soundNotification from '@/assets/notification_sound.mp3';

export const useNotification = (soundUr?: string) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCountRef = useRef<number>(0);
  const maxRepeatsRef = useRef<number>(0);

  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [listeningNotificationSocket, setListeningNotificationSocket] = useState<boolean>(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // State quản lý trạng thái loading API

  // 1. Luồng API: Tự động gọi API lấy thông báo cũ khi có restaurantId và được kích hoạt lắng nghe
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      if (!listeningNotificationSocket || !restaurantId) return;

      try {
        setIsLoading(true);
        // Gọi API phân trang, mặc định lấy trang 1, tối đa 50 thông báo gần nhất
        const result = await getMyNotifications(restaurantId, 1, 50);

        if (result && Array.isArray(result)) {
          setNotifications(result);
        }
      } catch (error: any) {
        console.error('[NotificationHook] Lỗi lấy danh sách thông báo cũ:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialNotifications();
  }, [listeningNotificationSocket, restaurantId]);

  useEffect(() => {
    if (!listeningNotificationSocket) return;

    const handleNotificationEvent = (res: { notiData: INotification }) => {
      const newNoti = res.notiData;
      if (!newNoti) return;
      const { type } = newNoti;
      const { staff, orderType } = newNoti.data;
      console.log(newNoti.data);
      // Chặn trùng lặp hiển thị nếu vô tình bị nhận double sự kiện do StrictMode hoặc React Closure
      setNotifications((prevNotification) => {
        const isDuplicate = prevNotification.some((noti) => noti._id === newNoti._id);
        if (isDuplicate) return prevNotification;

        switch (true) {
          case !staff && type === 'new_order':
            // Case 1: Không có staff (Khách tự đặt qua QR/Web)
            playAudio(20);
            break;

          case orderType !== 'to-go':
            // Case 2: Có staff + Ăn tại quán (Dine-in)
            playAudio(1);
            break;

          case orderType === 'to-go':
            // Case 3: Có staff + Đơn mang về (Mở rộng thêm nếu cần)
            // playAudio(2);
            break;

          default:
            playAudio(1);
            // Case mặc định nếu không khớp các điều kiện trên
            break;
        }

        return [newNoti, ...prevNotification]; // Đẩy thông báo mới lên đầu mảng
      });

      console.log(`[Socket] Nhận sự kiện Noti ID:`, newNoti);
    };

    socket.on('new_notification', handleNotificationEvent);

    return () => {
      console.log('[Socket] Hủy bộ lắng nghe cũ');
      socket.off('new_notification', handleNotificationEvent);
    };
  }, [listeningNotificationSocket]);

  // Hàm kích hoạt lắng nghe được gọi từ Header hoặc App Layout
  const startLiseningNotification = useCallback((id?: string) => {
    if (id) {
      setRestaurantId(id);
      setListeningNotificationSocket(true);
    }
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(soundUr || soundNotification);

    const handleAudioEnded = () => {
      if (playCountRef.current < maxRepeatsRef.current) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current
            .play()
            .catch((err) => console.log('[AudioHook] Lỗi phát tiếp theo:', err));
          playCountRef.current++;
        }
      }
    };

    audioRef.current.addEventListener('ended', handleAudioEnded);

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.pause();
      }
    };
  }, [soundNotification]);

  const playAudio = (maxRepeats: number = 1) => {
    if (!audioRef.current) return;

    // SỬA LỖI: Nếu chuông cũ đang phát, chủ động ép nó dừng lại trước khi phát lượt mới
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    maxRepeatsRef.current = maxRepeats;
    playCountRef.current = 0; // Reset bộ đếm cho lượt gọi mới

    if (playCountRef.current < maxRepeatsRef.current) {
      audioRef.current
        .play()
        .then(() => {
          playCountRef.current++;
        })
        .catch((err) => console.log('[AudioHook] Lỗi phát lần đầu hoặc bị ngắt quãng:', err));
    }
  };

  // Hàm để tắt âm thanh ngay lập tức
  const stopAudio = () => {
    // SỬA LỖI: Triệt tiêu bộ đếm lặp ngay lập tức để sự kiện 'ended' không kích hoạt phát tiếp nữa
    maxRepeatsRef.current = 0;
    playCountRef.current = 0;

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        console.log('[UI] Đã ép luồng Audio dừng thành công.');
      } catch (error) {
        console.log('[AudioHook] Không thể pause luồng âm thanh hiện tại:', error);
      }
    }
  };

  const markReadNoti = async (id: string) => {
    try {
      const result = await markNotificationAsRead(id);
      // 2. Cập nhật State cục bộ để UI lập tức đổi màu hoặc giảm số lượng Badge chưa đọc
      setNotifications((prevNotifications) =>
        prevNotifications.map((noti) => (noti._id === id ? { ...noti, isRead: true } : noti)),
      );
      return result;
    } catch (err: any) {
      console.log(err);
    }
  };

  const markReadAllNoti = async (restaurantId: string) => {
    try {
      const result = await markAllNotificationsAsRead(restaurantId);
      // 2. Cập nhật State cục bộ để UI lập tức đổi màu hoặc giảm số lượng Badge chưa đọc
      setNotifications((prevNotis) => prevNotis.map((noti) => ({ ...noti, isRead: true })));
      return result;
    } catch (err: any) {
      console.log(err.message);
    }
  };

  return {
    // states
    notifications,
    isLoading,
    setNotifications, // Trả ra để bạn có thể cập nhật trạng thái "Đã đọc" ở UI

    // actions
    startLiseningNotification,
    playAudio,
    stopAudio,

    markReadNoti,
    markReadAllNoti,
  };
};
