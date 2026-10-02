import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import path from 'path';

async function main() {
  const source = new URL(process.env.DATABASE_URL || '');
  if (source.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
    throw new Error('Integration tests require a local MySQL server. The application database is never used for fixtures.');
  }
  const database = `fashionhaven_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const provisioner = new PrismaClient();
  try { await provisioner.$executeRawUnsafe(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); }
  finally { await provisioner.$disconnect(); }
  source.pathname = `/${database}`;
  const env = { ...process.env, DATABASE_URL: source.toString(), JWT_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'test', TEST_DATABASE: database };
  const cwd = path.resolve(__dirname, '..');
  console.log(`Isolated test database: ${database} (preserved after the run)`);
  const schema = spawnSync(process.execPath, [path.join(cwd, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], { cwd, env, stdio: 'inherit' });
  if (schema.status !== 0) throw new Error('Could not prepare the isolated test schema.');
  const result = spawnSync(process.execPath, ['--test', '-r', 'ts-node/register', 'tests/integration.test.ts', 'tests/cart-state.test.ts', 'tests/request-throttle.test.ts'], { cwd, env, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
main().catch(() => { console.error('Integration setup failed. Check local MySQL availability and CREATE DATABASE permission. No application data was modified.'); process.exitCode = 1; });
