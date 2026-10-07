/**
 * HYDREX - High Performance Local Static Server
 * Zero dependencies, built on Node.js standard library.
 * Serves static assets, handles HTML extensions cleanly, and logs requests.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=UTF-8',
};

const server = http.createServer((req, res) => {
  // CORS & Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Normalize path
  if (pathname === '/') {
    pathname = '/index.html';
  } else if (!path.extname(pathname)) {
    // If no extension, try .html or /index.html
    if (fs.existsSync(path.join(ROOT_DIR, `${pathname}.html`))) {
      pathname = `${pathname}.html`;
    } else if (fs.existsSync(path.join(ROOT_DIR, pathname, 'index.html'))) {
      pathname = path.join(pathname, 'index.html');
    }
  }

  const filePath = path.join(ROOT_DIR, pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 handler
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 Page Not Found | HYDREX</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body style="background:#07131D;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:24px;">
  <div>
    <h1 style="font-size:3rem;margin-bottom:8px;color:#159FE8;">404</h1>
    <h2 style="font-size:1.5rem;margin-bottom:16px;">Page Not Found</h2>
    <p style="color:#94A3B8;margin-bottom:24px;">The page you are looking for does not exist or has moved.</p>
    <a href="/" style="display:inline-block;padding:12px 24px;background:#159FE8;color:#fff;text-decoration:none;font-weight:600;border-radius:6px;">Back to Homepage</a>
  </div>
</body>
</html>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=3600',
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[HYDREX] Local server running at http://localhost:${PORT}`);
});
