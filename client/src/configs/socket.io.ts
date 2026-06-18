import { BASE_URL } from '@/constants';
import { io, Socket } from 'socket.io-client';

// Tạo instance nhưng KHÔNG autoConnect và chưa có auth
export const socket: Socket = io(BASE_URL, {
  autoConnect: false,
  extraHeaders: {
    'ngrok-skip-browser-warning': '69420',
  },
});
