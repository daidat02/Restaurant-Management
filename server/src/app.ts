import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import router from './router/index.js';

dotenv.config();

/**
 * Tạo Express app (không listen) để supertest dùng trong integration test.
 * `index.ts` gọi hàm này rồi tự http.createServer + listen.
 */
const createApp = () => {
  const app = express();

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'];

  const allowedOrigins = [
    ...allowedOriginsEnv,
    'http://192.168.1.93:5173', // Giữ lại ip local nếu cần test điện thoại
    'https://abcdef.ngrok-free.app', // Ngrok để test nhanh
  ];

  // Middleware
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api', router);

  return app;
};

export default createApp;
