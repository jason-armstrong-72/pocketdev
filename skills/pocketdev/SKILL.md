---
name: pocketdev
description: >
  Give the user a link their phone can open for any local dev or preview server, alongside the
  localhost one. Use EVERY time you start a local server or hand back a localhost link for testing,
  in any repo, and whenever the user asks for a "test link", a "phone link", their "local IP", or
  to "check it on mobile". Runs the `pocketdev` command, which finds the LAN address and the
  machine's stable .local name, and detects frameworks that load on a phone but never respond
  (Next's allowedDevOrigins, Vite's allowedHosts).
---

# A phone link beside every localhost link

The user tests on a real phone, and a `localhost` URL is useless to it. **Whenever you start a
local server or hand back a localhost link, also give the phone link**, or say in one line why
there isn't one.

## 1. Run pocketdev, don't work it out by hand

```bash
pocketdev --json --no-qr                    # if installed globally
npx -y github:jason-armstrong-72/pocketdev --json --no-qr   # otherwise
```

Pass the port if you know it (`pocketdev 3000 --json`), and `--path /some/route` to link straight
to the page under test. Run it from the project folder, so it can read `package.json` and name
the framework.

The JSON gives, per server, `urls.name` (the `.local` link, the same on every network, on macOS
only), `urls.ip` (works on every phone), `onLan`, and `problems[]`, each with a `detail` and a
`fix`.

**Never reuse an address from memory or an earlier session.** It changes with the network, and
pocketdev looks it up fresh each time.

## 2. Hand back

```text
Computer:  http://localhost:3000/settings
Phone:     http://my-mac.local:3000/settings   (same Wi-Fi; bookmark it)
       or  http://192.168.1.8:3000/settings
```

Tell the user they can run `pocketdev` themselves for a QR code to scan.

## 3. When pocketdev reports a problem

- **`onLan: false`.** The server only listens on this computer. Restart it with the `fix` given
  (usually `--host`, or `-H 0.0.0.0` for `next start`), then run pocketdev again.
- **Next refuses the phone.** The page will load on the phone and ignore every tap. The fix is
  one line in `next.config`: `allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"]`. That's a
  committed change to the user's repo, so **offer it once, as its own small change, the first time
  a phone link is needed in that repo.** Don't make it unasked. Use patterns, never a literal IP,
  because the IP changes with the network.
- **Vite refuses the `.local` name.** The IP link still works. Hand that back and offer
  `server.allowedHosts: [".local"]`.

## 4. Trusted networks only, never a tunnel

A server the phone can reach can be reached by **anyone on the same network**, and dev servers
aren't hardened for that. On a café, airport, hotel or conference network, give the localhost link
only, and say why.

**Never use a tunnel** (ngrok, cloudflared, localtunnel, Tailscale Funnel, port forwarding) to get
round a network problem. That publishes the server to the internet. It's the user's decision to
make, not a fallback.

## 5. When the phone still can't connect

In order of likelihood:

1. The phone is on mobile data or a different Wi-Fi.
2. The page loads but ignores taps: see section 3.
3. The computer's firewall. On macOS, allow `node` under System Settings, Network, Firewall.
4. The network isolates devices from each other (common on guest and office Wi-Fi). Nothing on
   the computer fixes that. Use a trusted network or a hotspot.
5. The `.local` link fails on some Android phones. Use the IP link.
