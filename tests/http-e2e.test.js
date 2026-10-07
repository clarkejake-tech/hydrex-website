/**
 * HTTP & Page Integration Test
 * Verifies that all 12 pages, assets, scripts, and CSS return HTTP 200 on http://localhost:3000.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const BASE_URL = 'http://localhost:3000';

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

test('HTTP Server - Verifying All Routes on Port 3000', async (t) => {
  const routes = [
    '/',
    '/index.html',
    '/get-my-price.html',
    '/window-cleaning.html',
    '/gutter-cleaning.html',
    '/fascia-soffit-cleaning.html',
    '/roof-cleaning.html',
    '/pressure-washing.html',
    '/conservatory-cleaning.html',
    '/solar-panel-cleaning.html',
    '/why-hydrex.html',
    '/contact.html',
    '/privacy.html',
    '/robots.txt',
    '/sitemap.xml',
    '/css/style.css',
    '/js/config.js',
    '/js/pricing-engine.js',
    '/js/calculator.js',
    '/js/main.js',
    '/assets/images/hero-home.jpg',
    '/assets/images/window-cleaning.jpg',
    '/assets/images/gutter-fascia.jpg',
    '/assets/images/pressure-washing.jpg',
    '/assets/images/conservatory-cleaning.jpg',
    '/assets/images/solar-panel-cleaning.jpg',
    '/assets/brand/favicon.svg'
  ];

  for (const r of routes) {
    await t.test(`Route ${r} responds with 200`, async () => {
      const res = await fetchUrl(r);
      assert.strictEqual(res.status, 200, `Expected 200 for ${r}, got ${res.status}`);
      assert.ok(res.body.length > 0, `Expected content for ${r}`);
    });
  }
});
