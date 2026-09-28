import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { detectFramework, isOpen } from '../src/detect.js';
import { checkPhoneAccess, looksLikeDevServer } from '../src/check.js';

function withPackage(deps, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: deps }));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('detects the framework from package.json', () => {
  assert.equal(withPackage({ next: '16', react: '19' }, detectFramework), 'next');
  assert.equal(withPackage({ vite: '6' }, detectFramework), 'vite');
  assert.equal(withPackage({ astro: '5', vite: '6' }, detectFramework), 'astro');
  assert.equal(withPackage({ '@angular/core': '19' }, detectFramework), 'angular');
  assert.equal(withPackage({ express: '5' }, detectFramework), null);
});

test('no package.json means no framework', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketdev-'));
  assert.equal(detectFramework(dir), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

function serve(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler).listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('isOpen sees a listening port and not a closed one', async () => {
  const server = await serve((req, res) => res.end('ok'));
  const { port } = server.address();
  assert.equal(await isOpen('127.0.0.1', port), true);
  server.close();
  assert.equal(await isOpen('127.0.0.1', port), false);
});

test('flags a Next server that refuses the phone origin', async () => {
  const server = await serve((req, res) => {
    if (req.url.startsWith('/_next') && req.headers.origin) {
      res.statusCode = 403;
      return res.end('Unauthorized');
    }
    res.end('<html></html>');
  });
  const { port } = server.address();
  const problems = await checkPhoneAccess({ ip: '127.0.0.1', port, name: null });
  server.close();
  assert.equal(problems.length, 1);
  assert.equal(problems[0].framework, 'next');
});

test('flags a Vite server that refuses the .local name', async () => {
  const server = await serve((req, res) => {
    if (req.headers.host.endsWith('.local:' + req.socket.localPort)) {
      res.statusCode = 403;
      return res.end('Blocked request. This host is not allowed.');
    }
    res.end('<html></html>');
  });
  const { port } = server.address();
  const problems = await checkPhoneAccess({ ip: '127.0.0.1', port, name: 'my-mac.local' });
  server.close();
  assert.deepEqual(problems.map((p) => p.framework), ['vite']);
});

test('does not mistake the macOS AirPlay receiver for a dev server', async () => {
  const airplay = await serve((req, res) => {
    res.writeHead(403, { Server: 'AirTunes/950.7.1' });
    res.end();
  });
  const app = await serve((req, res) => res.end('ok'));
  assert.equal(await looksLikeDevServer(airplay.address().port), false);
  assert.equal(await looksLikeDevServer(app.address().port), true);
  airplay.close();
  app.close();
});

test('reports nothing for a server that accepts the phone', async () => {
  const server = await serve((req, res) => res.end('ok'));
  const { port } = server.address();
  const problems = await checkPhoneAccess({ ip: '127.0.0.1', port, name: 'my-mac.local' });
  server.close();
  assert.deepEqual(problems, []);
});
