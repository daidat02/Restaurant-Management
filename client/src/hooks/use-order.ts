import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { IOrder, IOrderItem } from '@/types/order.type';
import soundNotification from '@/assets/notification_sound.mp3';
// Import API
import {
  createOrder,
  addItemIntoOrder,
  getDetailOrder,
  getAllOrderByRestaurant,
  updateOrder as updateOrderApi,
  updateOrderStatus,
  getAllOrderByStatus,
  updateOrderItem,
  getActiveOrdersByRestaurant,
  getOrderByTableId,
  getMyOrders,
} from '@/api/order.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';
import { socket } from '@/configs/socket.io';
import { useNotification } from './use-notification';

export const useOrder = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // State quản lý dữ liệu
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<IOrder | null>(null);

  // State quản lý UI cho các hàm GET
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [listeningSocketOrder, setListeningSocketOrder] = useState<string | null>(null);
  const [listeningSocketRestaurant, setListeningSocketRestaurant] = useState<string | null>(null);
  const [orderSocketResult, setOrderSocketResult] = useState<any | null>(null);

  const { playAudio } = useNotification(soundNotification);

  const handleOrderEvent = (res: { action: string; orderData: any; message: string }) => {
    console.log(`[Socket] Nhận sự kiện order với action [${res.action}]:`, res);

    const { action, orderData, message } = res;

    setOrderSocketResult(res);

    toast.success(message || 'Có cập nhật mới về đơn hàng!', { position: 'top-right' });
    // playAudio(10);
    setOrders((prevOrders) => {
      switch (action) {
        case 'CREATE':
          return [orderData, ...prevOrders];

        case 'ADD_ITEMS':
          return prevOrders.map((order) =>
            order._id === orderData._id ? { ...order, ...orderData } : order,
          );
        case 'UPDATE_STATUS':
          // Khách thêm món HOẶC bếp cập nhật trạng thái đơn -> Thay thế đơn cũ bằng dữ liệu mới cập nhật
          return prevOrders.map((order) => (order._id === orderData._id ? orderData : order));
        case 'CANCEL':
          // Đơn bị hủy -> Lọc bỏ đơn đó khỏi màn hình hiển thị trực quan
          return prevOrders.filter((order) => order._id !== orderData._id);

        default:
          return prevOrders;
      }
    });
  };

  const handelOrderItemEvent = (res: { action: string; itemData: any; message: string }) => {
    console.log(`[Socket] Nhận sự kiện order item với action [${res.action}]:`, res);
    playAudio(1);
    const { action, itemData } = res;

    setCurrentOrder((prevOrder) => {
      if (!prevOrder) return prevOrder;

      switch (action) {
        case 'UPDATE_ITEM':
          return {
            ...prevOrder,
            items: prevOrder.items?.map((item) =>
              item._id === itemData._id ? { ...item, ...itemData } : item,
            ),
          };
        default:
          return prevOrder;
      }
    });
  };

  useEffect(() => {
    if (listeningSocketRestaurant) {
      console.log(`[Socket] Bắt đầu nhận sự kiện phòng restaurant_${listeningSocketRestaurant}`);
      socket.on('order_event', handleOrderEvent);
    } else if (listeningSocketOrder) {
      console.log(`[Socket] Bắt đầu vào phòng order_${listeningSocketOrder}`);
      socket.emit('join_order', listeningSocketOrder);
      socket.on('order_event', handelOrderItemEvent);
    } else {
      return;
    }

    return () => {
      socket.emit('leave_order', listeningSocketOrder);
      socket.off('order_event', handleOrderEvent);
      socket.off('order_event', handelOrderItemEvent);
    };
  }, [listeningSocketRestaurant, listeningSocketOrder]);

  const startListeningRestaurantSocket = useCallback((restaurantId: string) => {
    if (!restaurantId) return;
    setListeningSocketRestaurant(restaurantId);
  }, []);

  const startListeningOrderSocket = useCallback((orderId: string) => {
    if (!orderId) return;
    setListeningSocketOrder(orderId);
  }, []);

  // ==========================================
  // GET METHODS
  // ==========================================

  const fetchOrdersByRestaurant = useCallback(async (restaurantId: string, status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllOrderByRestaurant(restaurantId);
      setOrders(result ?? []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hàng');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hàng', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrdersByStatus = useCallback(async (restaurantId: string, status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllOrderByStatus(restaurantId, status);
      setOrders(result ?? []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hàng');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hàng', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrderById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDetailOrder(id);
      setCurrentOrder(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải chi tiết đơn hàng');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải chi tiết đơn hàng', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActiveOrders = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getActiveOrdersByRestaurant(restaurantId);
      setOrders(result ?? []); // Cập nhật danh sách đơn hiện tại vào state orders chung
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hiện tại');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hiện tại', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyOrders();
      setOrders(result ?? []);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hàng của bạn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách đơn hàng của bạn', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // MUTATION METHODS (CREATE, UPDATE, ADD ITEM)
  // ==========================================

  const addOrder = useCallback(
    async (data: Partial<IOrder>) => {
      showLoading('Đang tạo đơn hàng mới...');

      setError(null);
      try {
        const newOrder = await createOrder(data);
        if (newOrder) {
          setOrders((prev) => [...prev, newOrder]);
          setCurrentOrder(newOrder);
          return newOrder;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi tạo đơn hàng');
        toast.error(err.message || 'Đã xảy ra lỗi khi tạo đơn hàng', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const addItemToOrder = useCallback(
    async (itemData: any) => {
      showLoading('Đang thêm món...');
      setError(null);
      try {
        const updatedOrder = await addItemIntoOrder(itemData);
        if (updatedOrder) {
          setOrders((prev) =>
            prev.map((o) => (o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o)),
          );
          if (currentOrder?._id === updatedOrder._id) {
            setCurrentOrder({ ...currentOrder, ...updatedOrder });
          }
          toast.success('Thêm món thành công', { position: 'top-right' });
          return updatedOrder;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi thêm món');
        toast.error(err.message || 'Đã xảy ra lỗi khi thêm món', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentOrder],
  );

  const updateOrderItemStatus = useCallback(
    async (itemId: string, status: string) => {
      showLoading('Đang cập nhật trạng thái món...');
      setError(null);
      try {
        const updatedItem = await updateOrderItem(itemId, status);

        if (updatedItem) {
          setCurrentOrder((prevOrder) => {
            if (!prevOrder || !prevOrder.items) return prevOrder;

            return {
              ...prevOrder,
              items: prevOrder.items.map((item) =>
                item._id === itemId ? { ...item, status: updatedItem.status } : item,
              ),
            };
          });
          toast.success('Cập nhật trạng thái món thành công', { position: 'top-right' });
          return updatedItem;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật');
        toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật', { position: 'top-right' });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading],
  );

  const updateOrder = useCallback(
    async (id: string, orderData: Partial<IOrder>) => {
      showLoading('Đang cập nhật đơn hàng...');
      setError(null);
      try {
        const updatedOrderResult = await updateOrderApi(id, orderData);
        if (updatedOrderResult) {
          setOrders((prev) =>
            prev.map((o) => (o._id === id ? { ...o, ...updatedOrderResult } : o)),
          );
          if (currentOrder?._id === id) {
            setCurrentOrder({ ...currentOrder, ...updatedOrderResult });
          }
          // Tương tự, mình khuyên nên tắt toast ở đây vì FormBillOrder đã xử lý thông báo chi tiết hơn
          return updatedOrderResult;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật đơn hàng');
        toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật đơn hàng', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentOrder],
  );

  const changeOrderStatus = useCallback(
    async (id: string, status: string) => {
      showLoading('Đang cập nhật trạng thái...');
      setError(null);
      try {
        const updatedOrder = await updateOrderStatus(id, status);
        if (updatedOrder) {
          setOrders((prev) =>
            prev.map((o) => (o._id === id ? { ...o, status: updatedOrder.status } : o)),
          );
          if (currentOrder?._id === id) {
            setCurrentOrder({ ...currentOrder, status: updatedOrder.status });
          }
          toast.success('Cập nhật trạng thái thành công', { position: 'top-right' });
          return updatedOrder;
        }
      } catch (err: any) {
        setError(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái');
        toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái', {
          position: 'top-right',
        });
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, currentOrder],
  );

  const fetchOrderByTableId = useCallback(async (tableId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOrderByTableId(tableId);
      if (result) {
        setCurrentOrder(result);
        return result;
      } else {
        setCurrentOrder(null); // Nếu không có đơn hàng nào, đảm bảo currentOrder được reset về null
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải đơn hàng theo bàn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải đơn hàng theo bàn', {
        position: 'top-right',
      });
      setCurrentOrder(null); // Trong trường hợp lỗi, cũng reset currentOrder về null để tránh hiển thị dữ liệu cũ
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    orders,
    currentOrder,
    isLoading,
    error,

    //Socket
    listeningSocketOrder,
    orderSocketResult,
    startListeningRestaurantSocket,
    startListeningOrderSocket,

    // Methods
    fetchOrdersByRestaurant,
    fetchOrdersByStatus,
    fetchOrderById,
    addOrder,
    addItemToOrder,
    updateOrderItemStatus,
    updateOrder,
    changeOrderStatus,
    fetchActiveOrders,
    fetchOrderByTableId,
    fetchMyOrders,
  };
};
