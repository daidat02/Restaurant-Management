import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './configs/db.js';
import router from './router/index.js';
import { initSocket } from './configs/socketsConfig.js';
const app = express();

const server = http.createServer(app);
//Khởi tạo server socketIO
initSocket(server);
// Nạp biến môi trường từ file .env
dotenv.config();

// Kết nối cơ sở dữ liệu MongoDB
connectDB();
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

server.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
