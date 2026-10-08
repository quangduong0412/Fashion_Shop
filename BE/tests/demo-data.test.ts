import test from 'node:test';
import assert from 'node:assert/strict';
import { completedDemo } from '../scripts/provision-demo-data';
import { demoDatabaseName, demoPlan, demoProject, demoServerPort, demoSize, demoTarget, demoWriteConfig } from '../src/services/demoDataset';

const input = { DATABASE_URL: 'mysql://operator:private@localhost:3306/shop_dev', NODE_ENV: 'development', ALLOW_DEMO_DATA: 'true', DEMO_DATA_PASSWORD: 'SyntheticFixture1!' };
test('demo server cannot replace the configured shop API port', () => {
  assert.equal(demoServerPort({ NODE_ENV: 'development' }), '4001');
  assert.equal(demoServerPort({ NODE_ENV: 'development', DEMO_PORT: '04002' }), '4002');
  for (const change of [{ NODE_ENV: 'production' }, { NODE_ENV: undefined }, { DEMO_PORT: '4000' }, { PORT: '4001' }, { PORT: '5000', DEMO_PORT: '5000' }, { DEMO_PORT: '' }, { DEMO_PORT: '0' }, { DEMO_PORT: '-1' }, { DEMO_PORT: '65536' }, { DEMO_PORT: 'abc' }]) assert.throws(() => demoServerPort({ NODE_ENV: 'development', ...change }));
});
test('bulk demo always selects a separate local database and refuses unsafe configuration', () => {
  assert.equal(new URL(demoTarget(input).target).pathname, `/${demoDatabaseName}`);
  assert.equal(new URL(demoTarget(input).source).pathname, '/shop_dev');
  for (const DATABASE_URL of ['invalid', 'sqlite:///x', 'mysql://u:p@remote.invalid/shop', 'mysql://u:p@localhost/mysql', 'mysql://u:p@localhost/sys', 'mysql://u:p@localhost/information_schema', 'mysql://u:p@localhost/performance_schema', 'mysql://u:p@localhost/fashionhaven_test_123_abcd', 'mysql://u:p@localhost/fashionheaven_test_123_abcd', `mysql://u:p@localhost/${demoDatabaseName}`, 'mysql://u:p@localhost/', 'mysql://u:p@localhost/shop?schema=other']) assert.throws(() => demoTarget({ ...input, DATABASE_URL }));
});
test('bulk demo requires development, opt-in and an operator password; plan needs no password', () => {
  assert.ok(demoTarget({ DATABASE_URL: input.DATABASE_URL }));
  assert.equal(demoWriteConfig(input).password, input.DEMO_DATA_PASSWORD);
  for (const change of [{ NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { NODE_ENV: undefined }, { ALLOW_DEMO_DATA: 'false' }, { DEMO_DATA_PASSWORD: '' }, { DEMO_DATA_PASSWORD: undefined }, { DEMO_DATA_PASSWORD: 'short' }, { DEMO_DATA_PASSWORD: 'ế'.repeat(30) }]) assert.throws(() => demoWriteConfig({ ...input, ...change }));
  assert.equal(demoPlan.recordsPerEntity, demoSize); assert.equal(demoPlan.derived.variants, demoSize * 4);
});
test('demo completion receipts are immutable and malformed/unowned markers cannot cause reseeding', () => {
  assert.equal(completedDemo({ Project: demoProject, State: 'EMPTY', Manifest: null }), null);
  const receipt = { version: 1, project: demoProject, createdAt: new Date().toISOString(), counts: { products: 60, customers: 60, orders: 60 }, ids: { products: Array.from({length:60}, (_, i) => i + 1) } };
  const first = completedDemo({ Project: demoProject, State: 'READY', Manifest: JSON.stringify(receipt) });
  assert.deepEqual(first, receipt);
  const current = { ...receipt, counts: { products: demoSize, customers: demoSize, orders: demoSize }, ids: { products: Array.from({length:demoSize}, (_,i)=>i+1) } };
  assert.deepEqual(completedDemo({ Project: demoProject, State: 'READY', Manifest: current }), current);
  assert.deepEqual(completedDemo({ Project: demoProject, State: 'READY', Manifest: receipt }), first);
  for (const marker of [{ Project: 'someone-else', State: 'EMPTY', Manifest: null }, { Project: demoProject, State: 'BUILDING', Manifest: null }, { Project: demoProject, State: 'READY', Manifest: '{broken' }, { Project: demoProject, State: 'READY', Manifest: {...receipt, counts:{products:1}} }, { Project: demoProject, State: 'READY', Manifest: {...receipt, ids:{products:['x']}} }]) assert.throws(() => completedDemo(marker));
});
