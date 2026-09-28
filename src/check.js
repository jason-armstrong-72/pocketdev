import http from 'node:http';

/** A plain GET with chosen headers; resolves { status, body } or null on a network error. */
export function get(url, headers = {}, timeout = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { headers, timeout }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        if (body.length < 2000) body += chunk;
      });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}

/**
 * Is what answers on this port a web server someone is developing, rather than
 * a system service that happens to use a dev-looking port? macOS's AirPlay
 * Receiver listens on 5000 (and 7000) and answers HTTP as "AirTunes".
 */
export async function looksLikeDevServer(port) {
  const res = await get(`http://127.0.0.1:${port}/`);
  if (!res) return false;
  const server = String(res.headers?.server ?? '');
  return !/AirTunes|AirPlay/i.test(server);
}

/**
 * Would this server refuse the phone? Two framework guards produce a page that
 * loads but never becomes interactive, which is the failure nobody can diagnose
 * from the phone:
 *
 * - Next (15.2+) refuses its dev endpoints to an Origin not in allowedDevOrigins,
 *   answering 403 "Unauthorized".
 * - Vite (5.4.12+ / 6.0.9+) refuses a Host header it does not allow, answering
 *   403 "Blocked request". IP addresses are always allowed, names are not.
 *
 * Returns a list of problems; empty means nothing was refused.
 */
export async function checkPhoneAccess({ ip, port, name }) {
  const problems = [];
  const base = `http://${ip}:${port}`;

  // Next: a dev endpoint requested with the phone's Origin.
  const next = await get(`${base}/_next/static/chunks/__pocketdev_probe.js`, { Origin: base });
  if (next && next.status === 403 && /Unauthorized/i.test(next.body)) {
    problems.push({
      framework: 'next',
      detail: `Next refuses dev requests from ${ip}, so the page will load but not respond to taps.`,
      fix:
        'add `allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"]` to next.config and restart `next dev`',
    });
  }

  // Vite: the page requested by name rather than by IP.
  if (name) {
    const vite = await get(`${base}/`, { Host: `${name}:${port}` });
    if (vite && vite.status === 403 && /Blocked request/i.test(vite.body)) {
      problems.push({
        framework: 'vite',
        detail: `Vite refuses the name ${name}; the IP link still works.`,
        fix: `add \`server: { allowedHosts: [".local"] }\` to vite.config, or use the IP link`,
      });
    }
  }
  return problems;
}
