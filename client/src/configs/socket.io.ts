import { BASE_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';

// Tạo instance nhưng KHÔNG autoConnect và chưa có auth
export const socket: Socket = io(BASE_URL, {
  autoConnect: false,
  extraHeaders: {
    'ngrok-skip-browser-warning': '69420',
  },
});

// Kết nối socket kèm token xác thực (access token user hoặc token KDS).
// Token phải được set trước khi handshake; nếu đang nối với token khác thì reconnect.
export const connectSocketWithAuth = (token: string | null) => {
  const nextAuth = token ? { token } : {};
  const sameAuth = JSON.stringify(socket.auth) === JSON.stringify(nextAuth);
  socket.auth = nextAuth;

  if (socket.connected) {
    if (sameAuth) return;
    socket.disconnect();
  }
  socket.connect();
};
