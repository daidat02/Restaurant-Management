import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongod: MongoMemoryReplSet | undefined;

export default async function globalSetup() {
  // OrderService dùng transaction (startTransaction) → cần replica set, không phải standalone
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [
      {
        args: [
          '--setParameter',
          'maxTransactionLockRequestTimeoutMillis=5000',
          '--setParameter',
          'transactionLifetimeLimitSeconds=60',
        ],
      },
    ],
  });
  process.env.MONGODB_MEMORY_URI = mongod.getUri();

  // Đảm bảo secret luôn tồn tại trong test (không phụ thuộc .env)
  if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  return async () => {
    await mongod?.stop();
  };
}
