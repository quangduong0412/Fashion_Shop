const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cwd = path.resolve(__dirname, '..');
const env = {
  ...process.env,
  PLAYWRIGHT_MODULE: process.env.PLAYWRIGHT_MODULE || require.resolve('playwright')
};
const artifactDir = path.resolve(cwd, 'test-artifacts');
fs.mkdirSync(artifactDir, { recursive: true });
const log = fs.createWriteStream(path.join(artifactDir, 'browser-run.log'), { flags: 'w' });
const child = spawn(process.execPath, [require.resolve('ts-node/dist/bin.js'), path.join(cwd, 'tests/run-integration.ts')], {
  cwd,
  env,
  stdio: ['inherit', 'pipe', 'pipe'],
  windowsHide: true
});

for (const [source, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
  source.on('data', chunk => { target.write(chunk); log.write(chunk); });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.once('error', error => {
  console.error(`Could not start isolated browser acceptance runner: ${error.message}`);
  process.exitCode = 1;
});
child.once('close', code => {
  log.end();
  process.exitCode = code ?? 1;
});
