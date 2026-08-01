import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

export default async function globalSetup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_MEMORY_URI = mongod.getUri();

  // Đảm bảo secret luôn tồn tại trong test (không phụ thuộc .env)
  if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  return async () => {
    await mongod?.stop();
  };
}
