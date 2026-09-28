import os from 'node:os';
import { execFileSync } from 'node:child_process';

const PRIVATE = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

/** Rank an interface so Wi-Fi and Ethernet beat VPNs, bridges and virtual adapters. */
function interfaceRank(name) {
  if (/^(en0|wlan0|wlp|Wi-?Fi)/i.test(name)) return 0;
  if (/^(en\d|eth\d|enp|Ethernet)/i.test(name)) return 1;
  if (/^(utun|tun|tap|wg|tailscale|zt|docker|br-|veth|vbox|vmnet|bridge)/i.test(name)) return 9;
  return 5;
}

/**
 * The IPv4 addresses a phone on the same network could reach, best first.
 * Pure over its input so it can be tested without a network.
 */
export function lanAddresses(interfaces = os.networkInterfaces()) {
  const found = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      const v4 = entry.family === 'IPv4' || entry.family === 4;
      if (!v4 || entry.internal) continue;
      if (entry.address.startsWith('169.254.')) continue; // link-local: no DHCP, not reachable
      const isPrivate = PRIVATE.some((re) => re.test(entry.address));
      found.push({ name, address: entry.address, rank: interfaceRank(name) + (isPrivate ? 0 : 20) });
    }
  }
  return found.sort((a, b) => a.rank - b.rank).map(({ name, address }) => ({ name, address }));
}

/**
 * The machine's mDNS name (`something.local`), which stays the same when the
 * network changes. macOS only: elsewhere `.local` resolution on phones is too
 * patchy to lead with, so we return null and the IP link leads instead.
 */
export function mdnsName(platform = process.platform) {
  if (platform !== 'darwin') return null;
  try {
    const name = execFileSync('scutil', ['--get', 'LocalHostName'], { encoding: 'utf8' }).trim();
    return name ? `${name}.local` : null;
  } catch {
    return null;
  }
}
