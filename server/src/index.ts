import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './configs/db.js';
import { initSocket } from './configs/socketsConfig.js';
import createApp from './app.js';

dotenv.config();

const app = createApp();
const server = http.createServer(app);
//Khởi tạo server socketIO
initSocket(server);

// Kết nối cơ sở dữ liệu MongoDB
connectDB();

app.get('/healthz', (req, res) => res.status(200).send('OK'));

server.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
