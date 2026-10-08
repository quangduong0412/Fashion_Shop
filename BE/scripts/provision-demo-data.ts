import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ApiError } from '../src/services/apiErrors';
import { hashPassword } from '../src/services/credentials';
import { createDemoDataset, demoDatabaseName, demoPlan, demoProject, demoTarget, demoWriteConfig, type DemoManifest } from '../src/services/demoDataset';

type Marker = { Project: string; State: string; Manifest: string | object | null };
const tableNames = Prisma.dmmf.datamodel.models.map(model => model.dbName ?? model.name);

export function completedDemo(marker: Marker): DemoManifest | null {
  if (marker.Project !== demoProject || !['EMPTY', 'READY'].includes(marker.State)) throw new ApiError(409, 'DEMO_OWNERSHIP_UNVERIFIED', 'Database đích không có marker demo hợp lệ; giữ nguyên dữ liệu.');
  if (marker.State === 'EMPTY') return null;
  let result: DemoManifest;
  try { result = typeof marker.Manifest === 'string' ? JSON.parse(marker.Manifest) : marker.Manifest; } catch { throw new ApiError(409, 'DEMO_RECEIPT_INVALID', 'Biên nhận demo không đọc được; không ghi đè.'); }
  if (!result || result.project !== demoProject || result.version !== 1 || result.counts?.products !== 60 || result.counts?.customers !== 60 || result.counts?.orders !== 60 || Object.entries(result.ids ?? {}).some(([, ids]) => !Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id <= 0))) throw new ApiError(409, 'DEMO_RECEIPT_INVALID', 'Biên nhận demo không khớp; không tự seed lại.');
  return result;
}
async function targetExists(source: PrismaClient) {
  const databases = await source.$queryRaw<{ name: string }[]>`SELECT SCHEMA_NAME name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ${demoDatabaseName}`;
  return databases.length > 0;
}
async function targetMarker(target: PrismaClient) {
  const tables = await target.$queryRaw<{ name: string; type: string }[]>`SELECT TABLE_NAME name, TABLE_TYPE type FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
  const expected = new Set([...tableNames, '__fashion_demo_owner']);
  if (tables.some(t => !expected.has(t.name) || t.type !== 'BASE TABLE') || !tables.some(t => t.name === '__fashion_demo_owner')) throw new ApiError(409, 'DEMO_OWNERSHIP_UNVERIFIED', 'Database đích đã tồn tại nhưng không xác minh được nguồn demo; giữ nguyên.');
  const markers = await target.$queryRaw<Marker[]>`SELECT Project, State, Manifest FROM __fashion_demo_owner WHERE Id = 1`;
  if (markers.length !== 1) throw new ApiError(409, 'DEMO_OWNERSHIP_UNVERIFIED', 'Thiếu marker sở hữu database demo.');
  completedDemo(markers[0]!);
  return markers[0]!;
}
async function prepareNewSchema(targetURL: string) {
  const cwd = path.resolve(__dirname, '..');
  // Only called immediately after this process's successful CREATE DATABASE. No reset/accept-data-loss.
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(cwd, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], { cwd, env: { ...process.env, DATABASE_URL: targetURL }, stdio: 'ignore', windowsHide: true });
    child.once('error', reject); child.once('close', code => resolve(code ?? 1));
  });
  if (code) throw new ApiError(500, 'DEMO_SCHEMA_FAILED', 'Tạo schema demo thất bại. Database mới được giữ để kiểm tra; không chạy reset.');
}
export async function provisionDemoData(env: NodeJS.ProcessEnv, apply: boolean) {
  const config = apply ? demoWriteConfig(env) : demoTarget(env);
  const source = new PrismaClient({ datasources: { db: { url: config.source } } });
  let target: PrismaClient | undefined;
  try {
    const exists = await targetExists(source);
    if (!apply) {
      let state = 'NOT_CREATED';
      if (exists) { target = new PrismaClient({ datasources: { db: { url: config.target } } }); state = (await targetMarker(target)).State; }
      return { ...demoPlan, state, dryRun: true, passwordConfigured: !!env.DEMO_DATA_PASSWORD, development: env.NODE_ENV === 'development', optIn: env.ALLOW_DEMO_DATA === 'true' };
    }
    if (!exists) {
      // A concurrent creator gets a database-exists error and cannot seed an unverified target.
      await source.$executeRawUnsafe(`CREATE DATABASE \`${demoDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await prepareNewSchema(config.target);
      target = new PrismaClient({ datasources: { db: { url: config.target } } });
      await target.$executeRaw`CREATE TABLE __fashion_demo_owner (Id INT PRIMARY KEY, Project VARCHAR(64) NOT NULL, State VARCHAR(16) NOT NULL, Manifest JSON NULL)`;
      await target.$executeRaw`INSERT INTO __fashion_demo_owner (Id, Project, State) VALUES (1, ${demoProject}, 'EMPTY')`;
    } else target = new PrismaClient({ datasources: { db: { url: config.target } } });
    const marker = await targetMarker(target);
    const completed = completedDemo(marker);
    if (completed) return { database: demoDatabaseName, replayed: true, manifest: completed, message: 'Bộ demo đã được tạo. Không đổi mật khẩu, dữ liệu hay tồn kho hiện tại.' };
    // Unique salts for all 120 accounts. Do not keep plaintext in receipts or console output.
    const hashes: string[] = [];
    for (let i = 0; i < 120; i++) hashes.push(await hashPassword((config as ReturnType<typeof demoWriteConfig>).password));
    const result = await target.$transaction(async tx => {
      const [locked] = await tx.$queryRaw<Marker[]>`SELECT Project, State, Manifest FROM __fashion_demo_owner WHERE Id = 1 FOR UPDATE`;
      if (!locked) throw new ApiError(409, 'DEMO_OWNERSHIP_UNVERIFIED', 'Thiếu marker demo.');
      const previous = completedDemo(locked);
      if (previous) return { replayed: true, manifest: previous };
      for (const name of tableNames) {
        // Identifiers come only from the generated Prisma model metadata, never input.
        if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Invalid model table name.');
        const [rows] = await tx.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(*) total FROM \`${name}\``);
        if (Number(rows?.total)) throw new ApiError(409, 'DEMO_NOT_EMPTY', 'Database chưa có biên nhận hoàn thành nhưng có dữ liệu; giữ nguyên để kiểm tra.');
      }
      const manifest = await createDemoDataset(tx, hashes);
      await tx.$executeRaw`UPDATE __fashion_demo_owner SET State = 'READY', Manifest = ${JSON.stringify(manifest)} WHERE Id = 1`;
      return { replayed: false, manifest };
    }, { timeout: 180_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    return { database: demoDatabaseName, ...result };
  } finally { await target?.$disconnect(); await source.$disconnect(); }
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--plan', '--apply'].includes(args[0]!)) { console.error('Dùng --plan (dry-run) hoặc --apply (cần cấu hình local).'); process.exitCode = 1; }
  else provisionDemoData(process.env, args[0] === '--apply').then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error instanceof ApiError ? `${error.code}: ${error.message}` : 'Không thể tạo bộ demo. Kiểm tra MySQL/quyền/schema local; dữ liệu gốc không bị thay thế.'); process.exitCode = 1; });
}
