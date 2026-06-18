import { useCallback, useEffect, useState } from "react";

export const useSocket = (socket: any) => {
    const [listeningSocketRestaurant, setListeningSocketRestaurant] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;

        if (!socket.connected) {
            socket.connect();
        }

        socket.on("connect", () => {
            console.log("[Socket] Kết nối thành công! ID:", socket.id);
            // Nếu đã có sẵn restaurantId trước khi connect thành công, vào phòng luôn
            if (listeningSocketRestaurant) {
                socket.emit('join_restaurant', listeningSocketRestaurant);
            }
        });

        return () => {
            console.log("[Socket] Ngắt kết nối socket tổng");
            socket.off("connect"); // Hủy lắng nghe sự kiện để tránh rò rỉ bộ nhớ
            socket.disconnect();
        };
    }, [socket]);

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