import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lanAddresses, mdnsName } from '../src/network.js';

const v4 = (address, internal = false) => ({ family: 'IPv4', address, internal });

test('prefers Wi-Fi over VPN and virtual adapters', () => {
  const result = lanAddresses({
    utun3: [v4('10.8.0.2')],
    bridge100: [v4('192.168.64.1')],
    en0: [v4('192.168.1.8')],
  });
  assert.equal(result[0].address, '192.168.1.8');
  assert.equal(result[0].name, 'en0');
});

test('skips loopback, link-local and IPv6', () => {
  const result = lanAddresses({
    lo0: [v4('127.0.0.1', true)],
    en0: [v4('169.254.10.2'), { family: 'IPv6', address: 'fe80::1', internal: false }],
  });
  assert.deepEqual(result, []);
});

test('ranks a private address above a public one on the same kind of interface', () => {
  const result = lanAddresses({ en1: [v4('203.0.113.5')], en2: [v4('10.0.0.7')] });
  assert.equal(result[0].address, '10.0.0.7');
});

test('accepts the numeric family some Node versions report', () => {
  const result = lanAddresses({ eth0: [{ family: 4, address: '172.20.1.4', internal: false }] });
  assert.equal(result[0].address, '172.20.1.4');
});

test('mdnsName is null off macOS', () => {
  assert.equal(mdnsName('linux'), null);
  assert.equal(mdnsName('win32'), null);
});
