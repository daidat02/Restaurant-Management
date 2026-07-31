import { useCallback, useEffect, useState } from "react";
import { store } from "@/redux/store/store";
import { connectSocketWithAuth } from "@/configs/socket.io";

export const useSocket = (socket: any) => {
    const [listeningSocketRestaurant, setListeningSocketRestaurant] = useState<string | null>(null);
    const accessToken = store.getState().auth.token;

    useEffect(() => {
        if (!socket) return;

        if (!accessToken) {
            // Khách chưa đăng nhập không có quyền realtime — đảm bảo không kết nối socket
            socket.auth = {};
            if (socket.connected) socket.disconnect();
        } else {
            connectSocketWithAuth(accessToken);
        }

        socket.on("connect", () => {
            console.log("[Socket] Kết nối thành công! ID:", socket.id);
            // Nếu đã có sẵn restaurantId trước khi connect thành công, vào phòng luôn
            if (listeningSocketRestaurant) {
                socket.emit('init_room_restaurant', listeningSocketRestaurant);
            }
        });

        return () => {
            console.log("[Socket] Ngắt kết nối socket tổng");
            socket.off("connect"); // Hủy lắng nghe sự kiện để tránh rò rỉ bộ nhớ
            socket.disconnect();
        };
    }, [socket, accessToken]);

    // 2. useEffect này Chuyên trách việc Vào/Rời phòng khi ID nhà hàng thay đổi
    useEffect(() => {
        if (!socket || !listeningSocketRestaurant) return;
        
        // Nếu socket đã kết nối rồi thì emit luôn, nếu chưa thì để sự kiện "connect" ở trên lo
      
        console.log(`[Socket] Đang vào phòng: restaurant_${listeningSocketRestaurant}`);
        socket.emit('init_room_restaurant', listeningSocketRestaurant);
     

        return () => {
            if (listeningSocketRestaurant) {
                console.log(`[Socket] Đang rời phòng: restaurant_${listeningSocketRestaurant}`);
                socket.emit("leave_restaurant", listeningSocketRestaurant);
            }
        };
    }, [listeningSocketRestaurant, socket]); 

    // Hàm kích hoạt từ phía Component
    const startListeningSocket = useCallback((restaurantId: string) => {
        if (restaurantId) {
            setListeningSocketRestaurant(restaurantId);
        }
    }, []);

    return {
        startListeningSocket,
        currentRestaurantId: listeningSocketRestaurant // Trả thêm state này nếu component cần dùng
    };
};