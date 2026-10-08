import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { configuredDatabases, dropVerifiedDatabase, localSource, recordCreatedDatabase, writeManifest } from './testDatabaseSafety';
import type { Manifest } from './testDatabaseSafety';
import { runTestLifecycle } from './testLifecycle';

async function main() {
  const arg = process.argv[2];
  if (arg && !['--cleanup-probe=setup-failure', '--cleanup-probe=test-failure'].includes(arg)) throw new Error('Unknown integration argument.');
  const source = localSource(process.env.DATABASE_URL || '');
  const database = `fashionhaven_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const runId = randomUUID();
  const keep = process.env.KEEP_TEST_DB === 'true';
  const manifest: Manifest = { version: 1, database, runId, pid: process.pid, state: 'running', createdAt: new Date().toISOString() };
  const { protectedNames } = await configuredDatabases(path.resolve(__dirname, '../..'), source);
  const provisioner = new PrismaClient();
  const target = new URL(source); target.pathname = `/${database}`;
  const env = { ...process.env, DATABASE_URL: target.toString(), JWT_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'test', TEST_DATABASE: database };
  const cwd = path.resolve(__dirname, '..');
  let child: ChildProcess | undefined;
  let interrupted = false;
  let created = false;
  const stop = () => { interrupted = true; child?.kill(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const runChild = async (args: string[]) => {
    if (interrupted) throw new Error('Integration run interrupted.');
    return new Promise<number>((resolve, reject) => {
      const running = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
      child = running;
      running.once('error', reject);
      running.once('close', (code, signal) => { if (child === running) child = undefined; resolve(code ?? (signal ? 130 : 1)); });
    });
  };
  const result = await runTestLifecycle({
    keep,
    create: async () => {
      await provisioner.$executeRawUnsafe(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      recordCreatedDatabase(database, runId);
      created = true;
    },
    prepare: async () => {
      await writeManifest(manifest);
      console.log(`Isolated test database: ${database} (${keep ? 'KEEP_TEST_DB=true' : 'cleanup in finally'})`);
      if (arg === '--cleanup-probe=setup-failure') throw new Error('Intentional setup failure to verify finally cleanup.');
      const schemaCode = await runChild([path.join(cwd, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate']);
      if (schemaCode) throw new Error('Isolated schema setup failed.');
      const markerClient = new PrismaClient({ datasources: { db: { url: target.toString() } } });
      try {
        await markerClient.$executeRawUnsafe('CREATE TABLE __fashion_test_owner (Id INT PRIMARY KEY, RunId VARCHAR(36) NOT NULL, Project VARCHAR(64) NOT NULL)');
        await markerClient.$executeRaw`INSERT INTO __fashion_test_owner (Id, RunId, Project) VALUES (1, ${runId}, 'fashion-haven-integration')`;
      } finally { await markerClient.$disconnect(); }
    },
    test: () => arg === '--cleanup-probe=test-failure' ? Promise.resolve(2) : runChild(['--test', '-r', 'ts-node/register', 'tests/integration.test.ts', 'tests/cart-state.test.ts', 'tests/request-throttle.test.ts', 'tests/test-database-lifecycle.test.ts', 'tests/content-validation.test.ts', 'tests/store-settings.test.ts', 'tests/development-customer.test.ts', 'tests/demo-data.test.ts', 'tests/vouchers.test.ts']),
    finish: async () => {
      if (child) {
        const running = child; running.kill();
        await new Promise<void>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Child did not close; database retained.')), 10000); running.once('close', () => { clearTimeout(timeout); resolve(); }); });
      }
      if (keep && created) { manifest.state = 'finished'; await writeManifest(manifest); }
    },
    cleanup: async () => {
      await dropVerifiedDatabase(provisioner, database, protectedNames, { runId });
      console.log(`Removed owned test database: ${database}`);
    }
  });
  try {
    if (result.exitCode && !result.failure) console.error(`Integration tests failed with exit code ${result.exitCode}; original failure preserved.`);
    if (result.failure) console.error('Integration setup/run failed. Application data was not used for fixtures.');
    if (result.cleanupFailure) console.error(`Test database cleanup failed; inspect ${database} with the dry-run cleanup script.`);
    if (keep && result.created) console.log(`Retained ${database} by KEEP_TEST_DB=true; ownership manifest recorded.`);
    process.exitCode = result.exitCode;
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); await provisioner.$disconnect(); }
}
main().catch(() => { console.error('Integration initialization failed. No application database was reset or seeded.'); process.exitCode = process.exitCode || 1; });
