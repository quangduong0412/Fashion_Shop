import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTestLifecycle } from './testLifecycle';
import { assertDisposableName, localSource, testDatabasePattern } from './testDatabaseSafety';

const name = 'fashionhaven_test_1790934939858_fac78935';
test('only exact local test names are disposable, and configured app databases are protected', () => {
  assert.equal(testDatabasePattern.test(name), true);
  assert.equal(testDatabasePattern.test(name.replace('fashionhaven', 'fashionheaven')), true);
  for (const value of ['mysql', 'FashionHeaven', `${name};DROP DATABASE mysql`, 'fashionhaven_test_backup']) assert.throws(() => assertDisposableName(value, []));
  assert.throws(() => assertDisposableName(name, [name.toUpperCase()]));
  assert.throws(() => localSource('mysql://example.invalid/FashionHeaven'));
  assert.throws(() => localSource('postgres://localhost/FashionHeaven'));
  assert.equal(localSource('mysql://localhost/FashionHeaven').hostname, 'localhost');
});
function fixture(overrides: Partial<Parameters<typeof runTestLifecycle>[0]> = {}) {
  const calls: string[] = [];
  const steps = { keep: false, create: async () => { calls.push('create'); }, prepare: async () => { calls.push('prepare'); }, test: async () => { calls.push('test'); return 0; }, finish: async () => { calls.push('finish'); }, cleanup: async () => { calls.push('cleanup'); }, ...overrides };
  return { calls, steps };
}
test('successful run closes resources before dropping its own schema', async () => {
  const { calls, steps } = fixture(); const result = await runTestLifecycle(steps);
  assert.deepEqual(calls, ['create', 'prepare', 'test', 'finish', 'cleanup']); assert.equal(result.exitCode, 0);
});
test('failed schema setup still closes resources and cleans the newly created schema', async () => {
  const failure = new Error('setup'); const { calls, steps } = fixture({ prepare: async () => { throw failure; } });
  const result = await runTestLifecycle(steps); assert.equal(result.failure, failure); assert.equal(result.exitCode, 1); assert.deepEqual(calls, ['create', 'finish', 'cleanup']);
});
test('test failure keeps its original exit code even if cleanup also fails', async () => {
  const failure = new Error('cleanup'); const { steps } = fixture({ test: async () => 7, cleanup: async () => { throw failure; } });
  const result = await runTestLifecycle(steps); assert.equal(result.exitCode, 7); assert.equal(result.cleanupFailure, failure);
});
test('KEEP_TEST_DB closes resources and deliberately preserves the schema', async () => {
  const { calls, steps } = fixture({ keep: true }); const result = await runTestLifecycle(steps); assert.equal(result.exitCode, 0); assert.equal(calls.includes('cleanup'), false); assert.equal(calls.includes('finish'), true);
});
test('failed CREATE never drops a schema it did not create', async () => {
  const { calls, steps } = fixture({ create: async () => { throw new Error('exists'); } });
  const result = await runTestLifecycle(steps); assert.equal(result.created, false); assert.deepEqual(calls, ['finish']);
});
test('child close failure retains the schema and reports explicit cleanup failure', async () => {
  const { calls, steps } = fixture({ finish: async () => { throw new Error('child alive'); } }); const result = await runTestLifecycle(steps);
  assert.ok(result.cleanupFailure); assert.equal(result.exitCode, 1); assert.equal(calls.includes('cleanup'), false);
});
