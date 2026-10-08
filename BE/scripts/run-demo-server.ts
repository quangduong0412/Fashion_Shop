import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { demoTarget } from '../src/services/demoDataset';
import { completedDemo } from './provision-demo-data';

async function main() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Demo server chỉ dùng NODE_ENV=development.');
  const config = demoTarget(process.env);
  const check = new PrismaClient({ datasources: { db: { url: config.target } } });
  try {
    const [marker] = await check.$queryRaw<{ Project: string; State: string; Manifest: string | null }[]>`SELECT Project, State, Manifest FROM __fashion_demo_owner WHERE Id = 1`;
    if (!marker || !completedDemo(marker)) throw new Error('Cần tạo bộ demo hoàn chỉnh trước khi chạy.');
  } finally { await check.$disconnect(); }
  process.env.DATABASE_URL = config.target;
  // Transactional email is disabled in demo; .invalid accounts must never trigger a real provider.
  process.env.RESET_DELIVERY_MODE = 'file';
  console.log(`DEMO API — ${config.database}; không dùng database cửa hàng. Port ${process.env.PORT || 4000}.`);
  require('../src/server');
}
main().catch(() => { console.error('Không khởi động được DEMO API. Kiểm tra NODE_ENV, marker, schema và port; không in thông tin đăng nhập.'); process.exitCode = 1; });
