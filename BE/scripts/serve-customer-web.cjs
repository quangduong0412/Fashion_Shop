// Local preview of the actual Expo web export. No database writes or demo seeding.
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../FE/dist');
const port = Number(process.env.CUSTOMER_WEB_PORT || 8081);
if (!Number.isInteger(port) || port < 1 || port > 65535 || !fs.existsSync(path.join(root, 'index.html'))) {
  console.error('Build FE first: cd FE; npx.cmd expo export --platform web. CUSTOMER_WEB_PORT must be valid.');
  process.exit(1);
}
const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.use(express.static(root, { extensions: ['html'], index: 'index.html', dotfiles: 'deny' }));
app.use((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.sendStatus(404); return; }
  const route = /^\/(product|article)\/[1-9]\d*\/?$/.exec(req.path);
  if (route) { res.sendFile(path.join(root, route[1], '[id].html')); return; }
  res.status(404).sendFile(path.join(root, '+not-found.html'));
});
app.listen(port, () => console.log(`Fashion Haven customer web: http://localhost:${port} (Expo export; API from build configuration).`));
