import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import prisma from './src/db';

const quote = (name: string) => `\`${name.replace(/`/g, '``')}\``;
const serialize = (value: unknown) => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
const digest = (value: unknown) => createHash('sha256').update(serialize(value)).digest('hex');
const additions: Record<string, Record<string, string>> = {
  donhang: {
    PhuongThucThanhToan: 'VARCHAR(50) NULL', TrangThaiThanhToan: 'VARCHAR(50) NULL',
    DonViVanChuyen: 'VARCHAR(100) NULL', MaVanDon: 'VARCHAR(100) NULL',
    TenNguoiNhan: 'VARCHAR(255) NULL', DienThoaiNhan: 'VARCHAR(50) NULL', DiaChiNhan: 'TEXT NULL'
  },
  ctdonhang: {
    MaBienThe: 'INT NULL', SKU: 'VARCHAR(100) NULL', KichCo: 'VARCHAR(10) NULL',
    MauSac: 'VARCHAR(50) NULL', ThuocTinh: 'JSON NULL'
  }
};

async function main() {
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE()'
  );
  const names = new Map(tables.map(table => [table.name.toLowerCase(), table.name]));
  const caseSetting = await prisma.$queryRawUnsafe<Array<{ setting: bigint | number }>>('SELECT @@lower_case_table_names AS setting');
  const caseSensitive = Number(caseSetting[0]?.setting) === 0;
  const pairs = [['phieuxuat', 'donhang', 'MaPhieuXuat'], ['ctphieuxuat', 'ctdonhang', 'STT']] as const;
  const plans = await Promise.all(pairs.map(async ([legacy, target, primaryKey]) => {
    if (names.has(legacy) && names.has(target)) {
      throw new Error(`CSDL có cả ${legacy} và ${target}. Cần đối chiếu dữ liệu trước khi chuyển đổi.`);
    }
    const source = names.get(target) || names.get(legacy);
    if (!source) throw new Error(`Thiếu bảng ${target}. Khởi tạo CSDL bằng FashionHeaven.sql trước.`);
    const columns = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(`SHOW COLUMNS FROM ${quote(source)}`);
    return { source, target, primaryKey, rename: source.toLowerCase() !== target || (caseSensitive && source !== target), columns: columns.map(column => column.Field) };
  }));
  const needsChanges = plans.some(plan => plan.rename ||
    Object.keys(additions[plan.target]!).some(column => !plan.columns.includes(column)));
  if (!needsChanges) {
    console.log('Order tables donhang/ctdonhang are already up to date.');
    return;
  }

  const snapshots = await Promise.all(plans.map(async plan => ({
    ...plan,
    definition: await prisma.$queryRawUnsafe(`SHOW CREATE TABLE ${quote(plan.source)}`),
    rows: await prisma.$queryRawUnsafe(`SELECT * FROM ${quote(plan.source)} ORDER BY ${quote(plan.primaryKey)}`)
  })));
  const backupDirectory = path.join(__dirname, 'db-backups');
  await fs.mkdir(backupDirectory, { recursive: true });
  const backupName = `orders-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(path.join(backupDirectory, backupName), serialize(snapshots), { flag: 'wx' });
  console.log(`Saved order data and table definitions to db-backups/${backupName}.`);

  const renames = plans.filter(plan => plan.rename);
  if (renames.length) {
    await prisma.$executeRawUnsafe(`RENAME TABLE ${renames.map(plan => `${quote(plan.source)} TO ${quote(plan.target)}`).join(', ')}`);
  }
  for (const plan of plans) {
    for (const [column, type] of Object.entries(additions[plan.target]!)) {
      if (!plan.columns.includes(column)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${quote(plan.target)} ADD COLUMN ${quote(column)} ${type}`);
      }
    }
  }
  for (const snapshot of snapshots) {
    const rows = await prisma.$queryRawUnsafe<Array<unknown>>(
      `SELECT ${snapshot.columns.map(quote).join(', ')} FROM ${quote(snapshot.target)} ORDER BY ${quote(snapshot.primaryKey)}`
    );
    if (digest(rows) !== digest(snapshot.rows)) throw new Error(`Dữ liệu ${snapshot.target} khác bản sao lưu. Cần kiểm tra trước khi chạy cửa hàng.`);
    console.log(`${snapshot.target}: migrated and verified ${rows.length} existing records.`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Order migration failed.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
