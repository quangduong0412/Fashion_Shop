const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { schemaTokens, clientIsCurrent } = require('../scripts/ensure-prisma-client.cjs');
const { portIsFree, existingShop, startupPlan } = require('../scripts/run-dev.cjs');

test('Prisma schema comparison ignores formatter changes but preserves real schema/string changes', () => {
  const a = 'model Item {\n id Int @id\n label String @default("hello world // value")\n}';
  const b = '// comment\r\n model Item {\r\n   id   Int  @id\r\n label String @default("hello world // value") /* note */\r\n}';
  assert.equal(schemaTokens(a), schemaTokens(b));
  assert.notEqual(schemaTokens(a), schemaTokens(a.replace('Int', 'BigInt')));
  assert.notEqual(schemaTokens(a), schemaTokens(a.replace('hello world', 'helloworld')));
  assert.notEqual(schemaTokens('model AB { c Int }'), schemaTokens('model A { bc Int }'));
});
test('client generation is skipped only for matching schema/version and complete generated files', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fashion-prisma-check-'));
  const put = (name, value) => { const file = path.join(directory, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
  try {
    put('prisma/schema.prisma', 'model A { id Int @id }');
    for (const name of ['@prisma/client', 'prisma', '.prisma/client']) put(`node_modules/${name}/package.json`, '{"version":"5.22.0"}');
    for (const name of ['index.js','index.d.ts','default.js','query_engine-windows.dll.node']) put(`node_modules/.prisma/client/${name}`, 'fixture');
    put('node_modules/.prisma/client/schema.prisma', '// formatted\nmodel A {\n id Int @id\n}');
    assert.equal(clientIsCurrent(directory, 'win32'), true);
    put('prisma/schema.prisma', 'model A { id BigInt @id }'); assert.equal(clientIsCurrent(directory, 'win32'), false);
    put('prisma/schema.prisma', 'model A { id Int @id }');
    put('node_modules/prisma/package.json', '{"version":"5.21.0"}'); assert.equal(clientIsCurrent(directory, 'win32'), false);
    put('node_modules/prisma/package.json', '{"version":"5.22.0"}');
    fs.unlinkSync(path.join(directory, 'node_modules/.prisma/client/index.d.ts')); assert.equal(clientIsCurrent(directory, 'win32'), false);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('fashion-prisma-check-'));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('dev startup distinguishes the shop, a demo API and unrelated occupied ports', async () => {
  let mode = 'shop', service = 'fashion-haven-api';
  const server = http.createServer((_req, res) => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({service,mode,status:'ok'})); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const port = server.address().port;
  try {
    assert.equal(await portIsFree(port), false); assert.equal(await existingShop(port), true);
    assert.equal(await startupPlan(port), 'reuse', 'an active Fashion Haven shop is reused without touching its loaded Prisma engine');
    mode = 'demo'; assert.equal(await existingShop(port), false);
    await assert.rejects(startupPlan(port), /tiến trình khác sử dụng/);
    mode = 'shop'; service = 'unrelated'; assert.equal(await existingShop(port), false);
    await assert.rejects(startupPlan(port), /tiến trình khác sử dụng/);
  } finally { await new Promise(resolve => server.close(resolve)); }
  assert.equal(await portIsFree(port), true);
});
test('wildcard IPv6 listener is detected without binding over the existing server', async () => {
  const server = http.createServer((_req,res)=>res.end('running'));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'::',resolve);});
  try { assert.equal(await portIsFree(server.address().port), false); }
  finally { await new Promise(resolve=>server.close(resolve)); }
});
