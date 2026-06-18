import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ResgisterSocketIO } from '../sockets/index.js';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // hoặc ["http://localhost:5173"] nếu frontend chạy Vite
      methods: ['GET', 'POST'],
    },
  });

  ResgisterSocketIO(io);
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
