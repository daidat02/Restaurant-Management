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

const allowedOrigins = [
  'http://localhost:5173', // Cổng khi bạn dùng máy tính đang code
  'http://192.168.1.93:5173', // Cổng IP mạng LAN hiển thị trên Vite của bạn hiện tại
  'https://abcdef.ngrok-free.app', // Thêm cả URL ngrok vào đây nếu sau này bạn dùng ngrok
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
