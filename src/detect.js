import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

/** Ports the common dev servers default to, in rough order of popularity. */
export const COMMON_PORTS = [
  3000, 3001, 3002, 3003, 5173, 5174, 5175, 4200, 4321, 8080, 8000, 8081, 5000, 4000, 19006, 6006,
];

/** Resolves true if something accepts a TCP connection on host:port within the timeout. */
export function isOpen(host, port, timeout = 400) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

/** Which framework this folder runs, read from its package.json. Null if none is recognised. */
export function detectFramework(cwd = process.cwd()) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps.next) return 'next';
  if (deps['@angular/cli'] || deps['@angular/core']) return 'angular';
  if (deps.astro) return 'astro';
  if (deps.nuxt) return 'nuxt';
  if (deps['@sveltejs/kit']) return 'sveltekit';
  if (deps.expo) return 'expo';
  if (deps.vite) return 'vite';
  return null;
}

/** What to run so the server listens on the network, per framework. */
export const LISTEN_FIX = {
  next: 'next dev already listens on the network; for `next start`, add `-H 0.0.0.0`',
  vite: 'restart with `npm run dev -- --host` (or set server.host: true in vite.config)',
  astro: 'restart with `npm run dev -- --host`',
  nuxt: 'restart with `npm run dev -- --host`',
  sveltekit: 'restart with `npm run dev -- --host`',
  angular: 'restart with `ng serve --host 0.0.0.0`',
  expo: 'Expo already listens on the network; use the URL Expo prints',
  null: 'restart the server bound to 0.0.0.0 (usually a --host flag)',
};
