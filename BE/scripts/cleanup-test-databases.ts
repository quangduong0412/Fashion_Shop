import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { configuredDatabases, dropVerifiedDatabase, inspectDatabase, localSource, testDatabasePattern } from '../tests/testDatabaseSafety';

async function main() {
  const args = process.argv.slice(2);
  const allowLegacy = args.includes('--allow-legacy');
  const dropIndex = args.indexOf('--drop');
  if (args.some(arg => !['--list', '--dry-run', '--drop', '--allow-legacy'].includes(arg) && !testDatabasePattern.test(arg))) throw new Error('Unknown cleanup argument.');
  const dryRun = args.includes('--dry-run') || args.includes('--list');
  const requested = dropIndex >= 0 ? args.slice(dropIndex + 1).filter(arg => !arg.startsWith('--')) : [];
  if (dropIndex >= 0 && !requested.length) throw new Error('Specify each exact database after --drop.');
  const source = localSource(process.env.DATABASE_URL || '');
  const { protectedNames, configReferences } = await configuredDatabases(path.resolve(__dirname, '../..'), source);
  const client = new PrismaClient();
  try {
    const schemas = await client.$queryRaw<{ name: string }[]>`SELECT SCHEMA_NAME name FROM information_schema.SCHEMATA`;
    const candidates = schemas.map(row => row.name).filter(name => testDatabasePattern.test(name));
    console.log(JSON.stringify({ mode: requested.length && !dryRun ? 'explicit-drop' : 'dry-run', configReferences }));
    for (const database of requested.length ? requested : candidates.sort()) {
      if (!candidates.includes(database)) throw new Error(`Requested database is not a test candidate: ${database}`);
      let inspection;
      try { inspection = await inspectDatabase(client, database, protectedNames); }
      catch { console.log(JSON.stringify({ database, eligible: false, blockers: ['Protected configuration or inspection failed.'] })); if (requested.length) throw new Error('Explicit cleanup refused.'); continue; }
      console.log(JSON.stringify(inspection));
      if (requested.length && !dryRun) {
        await dropVerifiedDatabase(client, database, protectedNames, { allowLegacy });
        console.log(JSON.stringify({ database, dropped: true }));
      }
    }
  } finally { await client.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Test database cleanup failed.'); process.exitCode = 1; });
