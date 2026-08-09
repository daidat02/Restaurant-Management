import { BASE_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';

const baseOptions = {
  autoConnect: false,
  extraHeaders: {
    'ngrok-skip-browser-warning': '69420',
  },
} as const;

// Socket dùng chung cho app (xác thực bằng access token user).
export const socket: Socket = io(BASE_URL, baseOptions);

// Socket RIÊNG cho màn hình bếp (KDS): xác thực bằng token KDS (scope='kds').
// Tách riêng để không xung đột với socket user khi cùng mở trong 1 tab/browser.
export const kdsSocket: Socket = io(BASE_URL, baseOptions);

// Kết nối socket kèm token xác thực (access token user hoặc token KDS).
// Token phải được set trước khi handshake; nếu đang nối với token khác thì reconnect.
const connectWithAuth = (target: Socket, token: string | null) => {
  const nextAuth = token ? { token } : {};
  const sameAuth = JSON.stringify(target.auth) === JSON.stringify(nextAuth);
  target.auth = nextAuth;
  // `active` = đang kết nối HOẶC đã kết nối. Nếu token khác mà socket đang
  // handshake (chưa `connected`) thì vẫn phải ngắt để handshake lại bằng token mới.
  if (target.active) {
    if (sameAuth) return;
    target.disconnect();
  }
  target.connect();
};

export const connectSocketWithAuth = (token: string | null) => connectWithAuth(socket, token);

export const connectKdsSocketWithAuth = (token: string) => connectWithAuth(kdsSocket, token);
