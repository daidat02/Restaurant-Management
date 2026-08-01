import { describe, it, expect } from 'vitest';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { io as createClient, type Socket } from 'socket.io-client';
import createApp from '../app.js';
import { initSocket } from '../configs/socketsConfig.js';
import { tokenFor } from './utils.js';
import { SEED_IDS } from './seed.js';

const X = SEED_IDS.tenantX.toString();
const Y = SEED_IDS.tenantY.toString();

// Server HTTP thật + socket.io để client kết nối
const server = createServer(createApp());
initSocket(server);
server.listen(0);

const port = (server.address() as AddressInfo).port;
const url = `http://localhost:${port}`;

function connect(token?: string): Promise<{ socket: Socket; error?: string }> {
  return new Promise((resolve) => {
    const socket = createClient(url, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
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

/** Đợi event `room_error` từ server; nếu không có trong timeout → resolve undefined. */
function waitRoomError(socket: Socket, ms = 1000): Promise<string | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    socket.on('room_error', (data: { message: string }) => {
      clearTimeout(timer);
      resolve(data.message);
    });
  });
}

afterAll(() => {
  server.close();
});

describe('T6 — Socket: xác thực token & cô lập phòng nhà hàng', () => {
  it('kết nối không có token → bị từ chối', async () => {
    const { socket, error } = await connect();
    expect(error).toBeTruthy();
    socket.close();
  });

  it('kết nối với token hợp lệ (admin X) → thành công', async () => {
    const { socket, error } = await connect(tokenFor('admin', X));
    expect(error).toBeUndefined();
    expect(socket.connected).toBe(true);
    socket.close();
  });

  it('kết nối với token giả mạo → bị từ chối', async () => {
    const { socket, error } = await connect('not.a.valid.token');
    expect(error).toBeTruthy();
    socket.close();
  });

  it('admin X join phòng restaurant_X (init_orders) → không bị từ chối', async () => {
    const { socket, error } = await connect(tokenFor('admin', X));
    expect(error).toBeUndefined();

    const errPromise = waitRoomError(socket);
    socket.emit('init_orders', X);
    const err = await errPromise;
    expect(err).toBeUndefined();
    socket.close();
  });

  it('manager X join phòng restaurant_Y (init_orders) → BỊ từ chối room_error', async () => {
    // managerX chỉ thuộc restaurantIds=[X] → join Y phải bị chặn
    const { socket, error } = await connect(tokenFor('manager', X));
    expect(error).toBeUndefined();

    const errPromise = waitRoomError(socket);
    socket.emit('init_orders', Y);
    const err = await errPromise;
    expect(err).toBe('Bạn không thuộc nhà hàng này!');
    socket.close();
  });

  it('manager X join phòng restaurant_Y (init_room_restaurant) → BỊ từ chối room_error', async () => {
    const { socket, error } = await connect(tokenFor('manager', X));
    expect(error).toBeUndefined();

    const errPromise = waitRoomError(socket);
    socket.emit('init_room_restaurant', Y);
    const err = await errPromise;
    expect(err).toBe('Bạn không thuộc nhà hàng này!');
    socket.close();
  });

  it('staff Y join phòng restaurant_Y → thành công', async () => {
    const { socket, error } = await connect(tokenFor('staffY'));
    expect(error).toBeUndefined();

    const errPromise = waitRoomError(socket);
    socket.emit('init_room_restaurant', Y);
    const err = await errPromise;
    expect(err).toBeUndefined();
    socket.close();
  });

  it('token KDS (mã bếp X) join phòng restaurant_X → thành công', async () => {
    const { socket, error } = await connect(tokenFor('kds', X));
    expect(error).toBeUndefined();

    const errPromise = waitRoomError(socket);
    socket.emit('init_orders', X);
    const err = await errPromise;
    expect(err).toBeUndefined();
    socket.close();
  });
});
