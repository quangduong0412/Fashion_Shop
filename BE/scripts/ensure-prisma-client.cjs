const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Preserve quoted values while ignoring Prisma formatter whitespace/comments.
function schemaTokens(source) {
  return JSON.stringify((source.match(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_]\w*|\d+(?:\.\d+)?|[^\s]/g) || [])
    .filter(token => !token.startsWith('//') && !token.startsWith('/*')));
}
function clientIsCurrent(cwd = path.resolve(__dirname, '..'), platform = process.platform) {
  try {
    const generated = path.join(cwd, 'node_modules/.prisma/client');
    const readPackage = file => JSON.parse(fs.readFileSync(file, 'utf8'));
    const version = readPackage(path.join(cwd, 'node_modules/@prisma/client/package.json')).version;
    if (readPackage(path.join(generated, 'package.json')).version !== version || readPackage(path.join(cwd, 'node_modules/prisma/package.json')).version !== version) return false;
    if (!['index.js', 'index.d.ts', 'default.js'].every(file => fs.existsSync(path.join(generated, file)))) return false;
    const engine = platform === 'win32'
      ? fs.existsSync(path.join(generated, 'query_engine-windows.dll.node'))
      : fs.readdirSync(generated).some(file => /^libquery_engine.*\.(so|dylib)\.node$/.test(file));
    return engine && schemaTokens(fs.readFileSync(path.join(cwd, 'prisma/schema.prisma'), 'utf8')) === schemaTokens(fs.readFileSync(path.join(generated, 'schema.prisma'), 'utf8'));
  } catch { return false; }
}
async function ensureClient(force = false) {
  const cwd = path.resolve(__dirname, '..');
  if (!force && clientIsCurrent(cwd)) {
    console.log('Prisma Client đã khớp schema/version; giữ nguyên engine, không generate lại DLL.'); return 0;
  }
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(cwd, 'node_modules/prisma/build/index.js'), 'generate'], { cwd, stdio: 'inherit', windowsHide: true });
    child.once('error', reject); child.once('close', code => resolve(code ?? 1));
  });
  if (code) console.error('Prisma generate chưa thành công. Nếu Windows báo EPERM: dừng backend/test đang dùng client của BE, rồi chạy npm run db:generate. Không cần xóa node_modules hoặc reset database.');
  return code;
}
module.exports = { schemaTokens, clientIsCurrent, ensureClient };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && args[0] !== '--force') { console.error('Dùng không tham số hoặc --force.'); process.exitCode = 1; }
  else ensureClient(args[0] === '--force').then(code => { process.exitCode = code; }).catch(() => { console.error('Không thể chuẩn bị Prisma Client; kiểm tra dependency và quyền file của BE.'); process.exitCode = 1; });
}
