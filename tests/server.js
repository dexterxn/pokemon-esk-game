// Minimal static file server used only to serve this repo to Playwright while
// tests run. It exists so the test suite has zero dependency on any global
// tool (`serve`, `http-server`, Python, ...) — just Node's built-in `http`
// and `fs` modules, which Playwright's own installation already requires.
//
// The game must be served over http:// (not opened as a file://), because it
// loads its code as ES modules (`<script type="module">`), and browsers
// refuse to fetch modules from the filesystem. This server is the equivalent
// of `npx serve .` or `python -m http.server`, just dependency-free.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);

    // Refuse to serve anything outside the repo root.
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(500);
      res.end('Server error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Static server for tests running at http://localhost:${PORT}`);
});
