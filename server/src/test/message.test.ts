import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import mongoose from 'mongoose';
import { io as createClient, type Socket } from 'socket.io-client';
import createApp from '../app.js';
import { initSocket } from '../configs/socketsConfig.js';
import { request, tokenFor, idOf } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

const adminX = () => tokenFor('admin', X);
const staffX = () => tokenFor('staff', X);
const staffY = () => tokenFor('staffY', Y);
const managerX = () => tokenFor('manager', X);

// Server socket thật cho test join_conversation
const server = createServer(createApp());
initSocket(server);
server.listen(0);
const port = (server.address() as AddressInfo).port;
const url = `http://localhost:${port}`;

function connect(token?: string): Promise<{ socket: Socket; error?: string }> {
  return new Promise((resolve) => {
    const socket = createClient(url, {
      transports: ['websocket'],
      auth: token ? { token } : {},
      forceNew: true,
    });
    const timer = setTimeout(() => resolve({ socket }), 1500);
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      resolve({ socket, error: err.message });
    });
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve({ socket });
    });
  });
}

function waitRoomError(socket: Socket, ms = 1000): Promise<string | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    socket.on('room_error', (data: { message: string }) => {
      clearTimeout(timer);
      resolve(data.message);
    });
  });
}

// Emit send_message qua socket và chờ ack từ server
function sendViaSocket(
  socket: Socket,
  conversationId: string,
  text: string,
): Promise<{ code?: number; message?: string; data?: { message?: { text?: string } } }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({}), 1500);
    socket.emit('send_message', { conversationId, text }, (res: {
      code?: number;
      message?: string;
      data?: { message?: { text?: string } };
    }) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

// Chờ sự kiện new_message (broadcast tới các socket khác trong phòng)
function waitNewMessage(socket: Socket, ms = 1500): Promise<{ message?: { text?: string } } | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    socket.on('new_message', (data: { message?: { text?: string } }) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

beforeEach(async () => {
  // Mỗi test độc lập: xoá sạch dữ liệu chat để không dính idempotent (direct cùng cặp).
  await mongoose.connection.collection('conversations').deleteMany({});
  await mongoose.connection.collection('messages').deleteMany({});
});

afterAll(() => {
  server.close();
});

describe('Chat — Conversation + Message REST', () => {
  it('POST /api/conversations — tạo direct giữa admin X và staff X → 201', async () => {
    const res = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('direct');
    expect(idOf(res.body.data.restaurantId)).toBe(X);
    expect(res.body.data.members.length).toBe(2);
  });

  it('POST /api/conversations — tạo lại direct cùng cặp → 200 (idempotent)', async () => {
    const first = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    expect(first.status).toBe(201);
    const firstId = idOf(first.body.data._id);

    const second = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    expect(second.status).toBe(200);
    expect(idOf(second.body.data._id)).toBe(firstId);
  });

  it('POST /api/conversations — staff X không được tạo group → 403', async () => {
    const res = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ type: 'group', name: 'Nhóm bếp', memberIds: [SEED_IDS.managerX] });
    expect(res.status).toBe(403);
  });

  it('POST /api/conversations — member thuộc nhà hàng khác bị từ chối → 403', async () => {
    const res = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffY] });
    expect(res.status).toBe(403);
  });

  it('POST /api/conversations/:id/messages — staff X gửi tin → 201', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const res = await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ text: 'Kiểm tra món bàn 5 nhé' });
    expect(res.status).toBe(201);
    expect(res.body.data.message.text).toBe('Kiểm tra món bàn 5 nhé');
  });

  it('POST /api/conversations/:id/messages — text rỗng → 400', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const res = await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ text: '   ' });
    expect(res.status).toBe(400);
  });

  it('GET /api/conversations — admin X thấy conv + unreadCount > 0 sau tin của staff', async () => {
    // Tạo conv + staff gửi 1 tin
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);
    await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ text: 'Đơn bàn 5 xong rồi ạ' });

    const res = await request
      .get('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`);
    expect(res.status).toBe(200);
    const list = res.body.data as any[];
    const mine = list.find((c) => idOf(c._id) === convId);
    expect(mine).toBeTruthy();
    expect(mine.unreadCount).toBeGreaterThan(0);
    expect(mine.lastMessage.text).toBe('Đơn bàn 5 xong rồi ạ');
  });

  it('GET /api/conversations/:id/messages — phân trang, trả về asc', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);
    await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ text: 'Tin thứ 1' });
    await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ text: 'Tin thứ 2' });

    const res = await request
      .get(`/api/conversations/${convId}/messages?page=1&limit=20`)
      .set('Authorization', `Bearer ${staffX()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    const texts = (res.body.data.messages as any[]).map((m) => m.text);
    expect(texts).toEqual(['Tin thứ 1', 'Tin thứ 2']);
  });

  it('POST /api/conversations/:id/read — reset unread', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);
    await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffX()}`)
      .send({ text: 'Tin chưa đọc' });

    const read = await request
      .post(`/api/conversations/${convId}/read`)
      .set('Authorization', `Bearer ${adminX()}`);
    expect(read.status).toBe(200);

    const res = await request
      .get('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`);
    const mine = (res.body.data as any[]).find((c) => idOf(c._id) === convId);
    expect(mine.unreadCount).toBe(0);
  });

  it('Bảo mật: staff Y không gửi được tin vào conv của nhà hàng X → 403', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const res = await request
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${staffY()}`)
      .send({ text: 'Xâm nhập' });
    expect(res.status).toBe(403);
  });

  it('Bảo mật: staff Y không thấy conv của nhà hàng X trong GET /api/conversations', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const res = await request
      .get('/api/conversations')
      .set('Authorization', `Bearer ${staffY()}`);
    const list = res.body.data as any[];
    const found = list.find((c) => idOf(c._id) === convId);
    expect(found).toBeUndefined();
  });
});

describe('Chat — Socket join_conversation (ticket 02)', () => {
  it('member join conversation_<id> → không bị room_error', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const { socket, error } = await connect(staffX());
    expect(error).toBeUndefined();
    const errPromise = waitRoomError(socket);
    socket.emit('join_conversation', convId);
    const err = await errPromise;
    expect(err).toBeUndefined();
    socket.close();
  });

  it('non-member join conversation_<id> → bị room_error', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const { socket, error } = await connect(staffY());
    expect(error).toBeUndefined();
    const errPromise = waitRoomError(socket);
    socket.emit('join_conversation', convId);
    const err = await errPromise;
    expect(err).toBeTruthy();
    socket.close();
  });

  it('send_message qua socket — ack tin thật + broadcast new_message tới member khác trong phòng', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const sender = await connect(staffX());
    const receiver = await connect(adminX());
    expect(sender.error).toBeUndefined();
    expect(receiver.error).toBeUndefined();

    // Cả 2 tham gia phòng conversation_<id> (đợi join xong trước khi gửi)
    const errS = waitRoomError(sender.socket);
    const errR = waitRoomError(receiver.socket);
    sender.socket.emit('join_conversation', convId);
    receiver.socket.emit('join_conversation', convId);
    await errS;
    await errR;

    const received = waitNewMessage(receiver.socket);
    const ack = await sendViaSocket(sender.socket, convId, 'Tin gửi qua socket');
    expect(ack.code).toBe(201);
    expect(ack.data?.message?.text).toBe('Tin gửi qua socket');

    // Người gửi không nhận lại new_message (tránh trùng tin) — broadcast chỉ tới socket khác
    const selfEvt = await waitNewMessage(sender.socket, 300);
    expect(selfEvt).toBeUndefined();

    const evt = await received;
    expect(evt?.message?.text).toBe('Tin gửi qua socket');

    sender.socket.close();
    receiver.socket.close();
  });

  it('send_message qua socket — text rỗng → ack 400', async () => {
    const conv = await request
      .post('/api/conversations')
      .set('Authorization', `Bearer ${adminX()}`)
      .send({ type: 'direct', memberIds: [SEED_IDS.staffX] });
    const convId = idOf(conv.body.data._id);

    const { socket } = await connect(staffX());
    const ack = await sendViaSocket(socket, convId, '   ');
    expect(ack.code).toBe(400);
    socket.close();
  });
});
