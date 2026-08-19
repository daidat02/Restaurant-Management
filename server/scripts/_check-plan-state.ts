import 'dotenv/config';
import mongoose from 'mongoose';
import DB_Connection from '../src/models/DB_Connection.js';

const M = process.env.MONGODB_URL as string;
const dbName = M.split('?')[0].split('/').pop() || 'test';

async function main() {
  await mongoose.connect(M, { dbName });
  const pricing = await DB_Connection.PricingConfig.findOne().lean().exec();
  console.log('=== pricingconfig plans (key, featureKeys, limits) ===');
  for (const p of pricing?.plans ?? []) {
    console.log(JSON.stringify({ key: p.key, featureKeys: p.featureKeys, limits: p.limits }));
  }
  const restaurants = await DB_Connection.Restaurant.find()
    .select('name currentPlanKey subscription')
    .lean()
    .exec();
  console.log('=== restaurants (name, currentPlanKey, subscription) ===');
  for (const r of restaurants) {
    console.log(JSON.stringify({ name: r.name, key: r.currentPlanKey, sub: r.subscription }));
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });