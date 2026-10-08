require('dotenv').config();
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { clientIsCurrent } = require('./ensure-prisma-client.cjs');

async function portIsFree(port) {
  const probeAddress = host => new Promise((resolve, reject) => {
    const socket = net.createConnection({ port, host });
    const finish = free => { socket.destroy(); resolve(free); };
    socket.setTimeout(1500, () => finish(false));
    socket.once('connect', () => finish(false));
    socket.once('error', error => finish(['ECONNREFUSED', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'ENETUNREACH', 'EHOSTUNREACH'].includes(error.code)));
  });
  // Do not bind probes: Windows can allow overlapping wildcard/specific binds.
  // A TCP connection checks the actual listener without claiming its address.
  return (await Promise.all(['127.0.0.1', '::1'].map(probeAddress))).every(Boolean);
}
async function existingShop(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return false;
    const body = await response.json();
    return body.service === 'fashion-haven-api' && body.mode === 'shop' && body.status === 'ok';
  } catch { return false; }
}
async function main() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT không hợp lệ.');
  if (!await portIsFree(port)) {
    if (await existingShop(port) && clientIsCurrent()) {
      console.log(`Backend cửa hàng đã chạy: http://localhost:${port}. Không mở thêm process hoặc ghi lại Prisma engine. Muốn restart watcher: dừng phiên backend hiện tại trước.`); return;
    }
    throw new Error(`Cổng ${port} đang được sử dụng hoặc client cần cập nhật. Dừng đúng phiên backend cũ rồi chạy lại npm run dev.`);
  }
  const cwd = path.resolve(__dirname, '..');
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Khởi động bằng npm run dev.');
  let child;
  const stop = () => child?.kill();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const run = args => new Promise((resolve, reject) => {
    child = spawn(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.once('error', reject); child.once('close', code => { child = undefined; resolve(code ?? 1); });
  });
  try {
    const prepared = await run([npmCli, 'run', 'db:prepare']);
    if (prepared) { process.exitCode = prepared; return; }
    process.exitCode = await run([require.resolve('nodemon/bin/nodemon.js'), '--watch', 'src', '--ext', 'ts,json', 'src/server.ts']);
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
module.exports = { portIsFree, existingShop };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
