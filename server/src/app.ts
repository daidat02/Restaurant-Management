import express from 'express';
import cors, { type CorsOptions } from 'cors';
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
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
    : ['http://localhost:5173'];

  // Gom các origin và loại bỏ dấu / ở cuối nếu có
  const allowedOrigins = [...allowedOriginsEnv, 'https://0de4-171-239-174-145.ngrok-free.app'];

  console.log('Allowed origins for CORS:', allowedOrigins);

  const corsOptions: CorsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Cho phép requests không có origin (Postman, Mobile App, Server-to-Server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked]: Origin ${origin} không nằm trong whitelist`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  };

  // Middleware CORS
  app.use(cors(corsOptions));

  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api', router);

  return app;
};

export default createApp;
