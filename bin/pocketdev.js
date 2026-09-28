#!/usr/bin/env node
import { renderUnicodeCompact } from 'uqr';
import { lanAddresses, mdnsName } from '../src/network.js';
import { COMMON_PORTS, LISTEN_FIX, detectFramework, isOpen } from '../src/detect.js';
import { checkPhoneAccess, looksLikeDevServer } from '../src/check.js';

const HELP = `pocketdev: open your local dev server on your phone

Usage
  pocketdev [port] [options]

  With no port, pocketdev looks for a dev server on the usual ports
  (${COMMON_PORTS.slice(0, 8).join(', ')}, ...).

Options
  --path <path>   append a path to the links, e.g. --path /settings
  --json          print machine-readable output (for scripts and agents)
  --no-qr         skip the QR code
  --no-check      skip the check for frameworks that refuse phones
  -h, --help      show this help

The phone must be on the same Wi-Fi as this computer. Only use this on a
network you trust: anyone on it can open the same link.`;

function parseArgs(argv) {
  const opts = { port: null, path: '', json: false, qr: true, check: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--no-qr') opts.qr = false;
    else if (arg === '--no-check') opts.check = false;
    else if (arg === '--path') opts.path = argv[++i] ?? '';
    else if (/^\d+$/.test(arg)) opts.port = Number(arg);
    else {
      console.error(`pocketdev: unknown argument "${arg}". Try --help.`);
      process.exit(2);
    }
  }
  if (opts.path && !opts.path.startsWith('/')) opts.path = `/${opts.path}`;
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}

const addresses = lanAddresses();
if (addresses.length === 0) {
  const msg = 'No network address found. Is this computer connected to Wi-Fi or Ethernet?';
  if (opts.json) console.log(JSON.stringify({ error: msg }));
  else console.error(`pocketdev: ${msg}`);
  process.exit(1);
}
const ip = addresses[0].address;
const name = mdnsName();
const framework = detectFramework();

const candidates = opts.port ? [opts.port] : COMMON_PORTS;
const open = await Promise.all(candidates.map((p) => isOpen('127.0.0.1', p)));
let ports = candidates.filter((_, i) => open[i]);
// When scanning (no port given), drop system services that squat on dev ports.
// An explicit port is always trusted: the user asked for it.
if (!opts.port) {
  const dev = await Promise.all(ports.map((p) => looksLikeDevServer(p)));
  ports = ports.filter((_, i) => dev[i]);
}

if (ports.length === 0) {
  const msg = opts.port
    ? `Nothing is listening on port ${opts.port}. Is the dev server running?`
    : 'No dev server found on the usual ports. Start one, or pass its port: pocketdev 3000';
  if (opts.json) console.log(JSON.stringify({ error: msg, ip, name }));
  else console.error(`pocketdev: ${msg}`);
  process.exit(1);
}

const results = [];
for (const port of ports) {
  const onLan = await isOpen(ip, port);
  const urls = {
    name: name ? `http://${name}:${port}${opts.path}` : null,
    ip: `http://${ip}:${port}${opts.path}`,
  };
  const problems = [];
  if (!onLan) {
    problems.push({
      framework,
      detail: `Port ${port} only listens on this computer, so the phone cannot reach it.`,
      fix: LISTEN_FIX[framework] ?? LISTEN_FIX.null,
    });
  } else if (opts.check) {
    problems.push(...(await checkPhoneAccess({ ip, port, name })));
  }
  results.push({ port, onLan, urls, problems });
}

if (opts.json) {
  console.log(JSON.stringify({ ip, name, interface: addresses[0].name, framework, servers: results }, null, 2));
  process.exit(results.some((r) => !r.onLan) ? 1 : 0);
}

const dim = (s) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s);
const warn = (s) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s);

for (const [i, r] of results.entries()) {
  console.log('');
  console.log(bold(`Port ${r.port}`) + dim(framework ? `  (${framework})` : ''));
  if (r.onLan) {
    if (r.urls.name) console.log(`  Phone:   ${bold(r.urls.name)}  ${dim('same on every network; bookmark it')}`);
    console.log(`  ${r.urls.name ? 'Or:     ' : 'Phone:  '} ${r.urls.name ? r.urls.ip : bold(r.urls.ip)}`);
    console.log(`  This computer: http://localhost:${r.port}${opts.path}`);
  }
  for (const p of r.problems) {
    console.log(warn(`  ! ${p.detail}`));
    console.log(`    Fix: ${p.fix}`);
  }
  // One QR code, for the first reachable server. It encodes the IP link:
  // every phone can open that, while `.local` names fail on some Android phones.
  if (opts.qr && r.onLan && i === results.findIndex((x) => x.onLan)) {
    console.log('');
    console.log(renderUnicodeCompact(r.urls.ip, { border: 1 }).replace(/^/gm, '  '));
    console.log(dim('  Scan with the phone camera. Same Wi-Fi as this computer.'));
  }
}
console.log('');
process.exit(results.some((r) => !r.onLan) ? 1 : 0);
