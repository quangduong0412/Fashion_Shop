import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

export const testDatabasePattern = /^fashion(?:haven|heaven)_test_[0-9]{13}_[a-f0-9]{8}$/;
const systemDatabases = new Set(['mysql', 'sys', 'information_schema', 'performance_schema']);
export const manifestDirectory = path.resolve(__dirname, '../test-artifacts/db-manifests');
export type Manifest = { version: 1; database: string; runId: string; pid: number; state: 'running' | 'finished'; createdAt: string };
const expectedTables = new Set('account appmutex customeraudit passwordreset storesettings settingsaudit baiviet bienthesanpham checkoutrequest chinhanh chucvu ctdonhang ctphieunhap dieuchinhtonkho donhang khachhang kho lienhe loaihang nhacungcap nhanvien orderevent phieunhap sanpham sysdiagrams yeucaunhaphang customerwishlist customeraddress customercart cartmerge'.split(' '));
const createdHere = new Map<string, string>();
export function recordCreatedDatabase(database: string, runId: string) { assertDisposableName(database, []); createdHere.set(database, runId); }
export function localSource(value: string): URL {
  const source = new URL(value);
  if (source.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) throw new Error('Only local MySQL may be inspected or cleaned.');
  return source;
}
export function assertDisposableName(database: string, protectedNames: Iterable<string>) {
  if (!testDatabasePattern.test(database) || systemDatabases.has(database.toLowerCase()) || [...protectedNames].some(name => name.toLowerCase() === database.toLowerCase())) throw new Error('Protected or invalid database name.');
}
export function pidAlive(pid: number) {
  try { process.kill(pid, 0); return true; } catch (error: any) { return error?.code !== 'ESRCH'; }
}
export async function writeManifest(manifest: Manifest) {
  assertDisposableName(manifest.database, []);
  await fs.mkdir(manifestDirectory, { recursive: true });
  await fs.writeFile(path.join(manifestDirectory, `${manifest.database}.json`), JSON.stringify(manifest, null, 2), { mode: 0o600 });
}
export async function readManifest(database: string): Promise<Manifest | null> {
  assertDisposableName(database, []);
  try {
    const value = JSON.parse(await fs.readFile(path.join(manifestDirectory, `${database}.json`), 'utf8'));
    if (value.version !== 1 || value.database !== database || typeof value.runId !== 'string' || !Number.isSafeInteger(value.pid) || !['running', 'finished'].includes(value.state)) throw new Error('Invalid ownership manifest.');
    return value;
  } catch (error: any) { if (error.code === 'ENOENT') return null; throw new Error('Unreadable ownership manifest; cleanup refused.'); }
}
export async function configuredDatabases(workspace: string, source: URL) {
  const protectedNames = new Set([decodeURIComponent(source.pathname.slice(1))]);
  const configReferences: { file: string; database: string }[] = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', 'db-backups', 'test-artifacts', '.expo']);
  async function visit(directory: string) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || skip.has(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (/^\.env(?:\..*)?$/.test(entry.name) || /\.(?:[cm]?[jt]sx?|json|ya?ml|config)$/i.test(entry.name)) {
        const text = await fs.readFile(filename, 'utf8');
        for (const match of text.matchAll(/mysql:\/\/[^\s"']+/g)) {
          try {
            const url = new URL(match[0]);
            if (url.host !== source.host && !(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && (url.port || '3306') === (source.port || '3306'))) continue;
            const database = decodeURIComponent(url.pathname.slice(1));
            protectedNames.add(database);
            if (testDatabasePattern.test(database)) configReferences.push({ file: path.relative(workspace, filename), database });
          } catch { /* Example placeholders do not designate a live database. */ }
        }
      }
    }
  }
  await visit(workspace);
  return { protectedNames, configReferences };
}
export type Inspection = { database: string; eligible: boolean; basis: string; blockers: string[]; tables: number; rows: number; activeConnections: number; manifest: boolean; marker: boolean };
export async function inspectDatabase(client: PrismaClient, database: string, protectedNames: Iterable<string>, ownedRunId?: string): Promise<Inspection> {
  assertDisposableName(database, protectedNames);
  const meta = await client.$queryRaw<{ name: string; type: string }[]>`SELECT TABLE_NAME name, TABLE_TYPE type FROM information_schema.TABLES WHERE TABLE_SCHEMA = ${database}`;
  const names = meta.map(table => table.name);
  const connections = await client.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) total FROM information_schema.PROCESSLIST WHERE DB = ${database}`;
  const grants = await client.$queryRawUnsafe<Record<string, string>[]>('SHOW GRANTS');
  const canInspectAll = grants.some(grant => /(?:ALL PRIVILEGES|\bPROCESS\b).*ON\s+\*\.\*/i.test(Object.values(grant).join(' ')));
  const own = !!ownedRunId && createdHere.get(database) === ownedRunId;
  let manifest: Manifest | null;
  try { manifest = await readManifest(database); } catch (error) { if (!own) throw error; manifest = null; }
  let marker = false;
  if (names.includes('__fashion_test_owner')) {
    const rows = await client.$queryRawUnsafe<{ RunId: string; Project: string }[]>(`SELECT RunId, Project FROM \`${database}\`.__fashion_test_owner WHERE Id = 1`);
    marker = !!manifest && rows.length === 1 && rows[0]?.RunId === manifest.runId && rows[0]?.Project === 'fashion-haven-integration';
  }
  const blockers: string[] = [];
  if (!canInspectAll) blockers.push('Cannot verify connections from every database user.');
  const activeConnections = Number(connections[0]?.total ?? 0);
  if (activeConnections) blockers.push('Database has active connections.');
  if (manifest?.state === 'running' && pidAlive(manifest.pid) && !own) blockers.push('Runner lease belongs to a live process.');
  if (own && manifest && manifest.runId !== ownedRunId) blockers.push('Ownership manifest changed.');
  const business = meta.filter(table => table.name !== '__fashion_test_owner');
  if (business.some(table => table.type !== 'BASE TABLE' || !expectedTables.has(table.name))) blockers.push('Unknown tables or views.');
  const routines = await client.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) total FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ${database}`;
  if (Number(routines[0]?.total)) blockers.push('Database contains routines.');
  const triggers = await client.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) total FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ${database}`;
  const events = await client.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) total FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ${database}`;
  if (Number(triggers[0]?.total) || Number(events[0]?.total)) blockers.push('Database contains triggers or scheduled events.');
  let total = 0;
  for (const table of business) {
    if (!expectedTables.has(table.name)) continue;
    const rows = await client.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(*) total FROM \`${database}\`.\`${table.name}\``);
    total += Number(rows[0]?.total ?? 0);
  }
  let fixture = false;
  const fixtureMismatches: string[] = [];
  const required = ['account', 'khachhang', 'nhanvien', 'sanpham', 'chucvu', 'chinhanh'];
  if (required.every(name => names.includes(name)) && !blockers.includes('Unknown tables or views.')) {
    // Exact known fixtures, not merely a database prefix. Never print row values.
    const checks: [string, string][] = [
      ['account', "UserName NOT IN ('test-admin','test-legacy','test-staff','namespace@example.invalid') AND UserName NOT REGEXP '^namespace-[0-9]+@example[.]invalid$'"],
      ['khachhang', "Email NOT IN ('synthetic@example.invalid','other@example.invalid','namespace@example.invalid') AND Email NOT REGEXP '^namespace-[0-9]+@example[.]invalid$'"],
      ['nhanvien', "TenNhanVien NOT IN ('Test administrator','Test legacy','Synthetic employee','Namespace staff')"],
      ['sanpham', "TenSanPham NOT IN ('Synthetic garment','Last item','Other warehouse item','Renamed synthetic item','Concurrent variant fixture','Stock limit fixture','Browser created variants')"],
      ['chucvu', "TenChucVu <> 'Test sales'"], ['chinhanh', "TenChiNhanh <> 'Test store'"],
      ['kho', "TenKho NOT IN ('Test warehouse','Test warehouse 2')"], ['nhacungcap', "TenNCC <> 'Test supplier'"],
      ['loaihang', "TenLoaiHang <> 'Test category'"],
      ['donhang', "TenNguoiNhan IS NOT NULL AND TenNguoiNhan NOT IN ('Synthetic recipient','Synthetic customer','Browser synthetic customer')"],
      ['baiviet', '1=1'], ['lienhe', '1=1'], ['sysdiagrams', '1=1'], ['yeucaunhaphang', '1=1']
    ];
    fixture = true;
    for (const [table, predicate] of checks) if (names.includes(table)) {
      const rows = await client.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(*) total FROM \`${database}\`.\`${table}\` WHERE ${predicate}`);
      if (Number(rows[0]?.total)) { fixture = false; fixtureMismatches.push(`Legacy fixture mismatch in ${table}.`); }
    }
    const anchor = await client.$queryRawUnsafe<{ total: bigint }[]>(`SELECT COUNT(*) total FROM \`${database}\`.account WHERE UserName = 'test-admin'`);
    if (!total) { fixture = false; fixtureMismatches.push('Empty legacy schema has no ownership provenance.'); }
    else if (Number(anchor[0]?.total) !== 1) fixture = false;
  }
  if (fixture) {
    const prefix = `\`${database}\``;
    const references = [
      ['ctdonhang', `SELECT COUNT(*) total FROM ${prefix}.ctdonhang l LEFT JOIN ${prefix}.donhang d ON d.MaPhieuXuat=l.MaPhieuXuat LEFT JOIN ${prefix}.sanpham p ON p.MaSanPham=l.MaSanPham WHERE d.MaPhieuXuat IS NULL OR p.MaSanPham IS NULL`],
      ['ctphieunhap', `SELECT COUNT(*) total FROM ${prefix}.ctphieunhap l LEFT JOIN ${prefix}.phieunhap d ON d.MaPhieuNhap=l.MaPhieuNhap LEFT JOIN ${prefix}.sanpham p ON p.MaSanPham=l.MaSanPham WHERE d.MaPhieuNhap IS NULL OR p.MaSanPham IS NULL`],
      ['donhang', `SELECT COUNT(*) total FROM ${prefix}.donhang d LEFT JOIN ${prefix}.khachhang c ON c.MaKhachHang=d.MaKhachHang LEFT JOIN ${prefix}.nhanvien n ON n.MaNhanVien=d.MaNhanVien WHERE (d.MaKhachHang IS NOT NULL AND c.MaKhachHang IS NULL) OR n.MaNhanVien IS NULL`]
    ];
    for (const [table, query] of references) if (names.includes(table!)) {
      const rows = await client.$queryRawUnsafe<{total:bigint}[]>(query!);
      if (Number(rows[0]?.total)) { fixture = false; fixtureMismatches.push('Legacy fixture references do not match.'); }
    }
  }
  const basis = marker ? 'marker+manifest' : own ? 'created-by-this-run+manifest' : fixture ? total ? 'legacy-fixture-fingerprint' : 'legacy-empty-prisma-schema' : 'unverified';
  if (basis === 'unverified') blockers.push('No matching ownership marker/manifest or complete fixture fingerprint.', ...fixtureMismatches);
  return { database, eligible: blockers.length === 0, basis, blockers, tables: meta.length, rows: total, activeConnections, manifest: !!manifest, marker };
}
export async function dropVerifiedDatabase(client: PrismaClient, database: string, protectedNames: Iterable<string>, options: { runId?: string; allowLegacy?: boolean } = {}) {
  const inspection = await inspectDatabase(client, database, protectedNames, options.runId);
  if (!inspection.eligible || (!options.allowLegacy && inspection.basis.startsWith('legacy-'))) throw new Error(`Cleanup refused for ${database}: ${inspection.blockers.join(' ') || 'Legacy fingerprint requires explicit --allow-legacy.'}`);
  // Name is validated, and connection/lease/ownership checks are repeated immediately before DROP.
  await client.$executeRawUnsafe(`DROP DATABASE \`${database}\``);
  if (inspection.manifest) await fs.rm(path.join(manifestDirectory, `${database}.json`));
  return inspection;
}
