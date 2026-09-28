# pocketdev

Open your local dev server on your phone.

```text
$ pocketdev

Port 3000  (next)
  Phone:   http://my-mac.local:3000   same on every network; bookmark it
  Or:      http://192.168.1.8:3000
  This computer: http://localhost:3000

  [QR code]
  Scan with the phone camera. Same Wi-Fi as this computer.
```

It finds the running dev server, prints a link your phone can open, and draws a QR code for it.
It also checks for the problem that's hardest to diagnose from a phone: **a page that loads but
never responds to taps**, because the framework refuses requests from anything but `localhost`.

## Install

```bash
npm i -g github:jason-armstrong-72/pocketdev
```

Or run it without installing: `npx -y github:jason-armstrong-72/pocketdev`. Requires Node 18 or
later. Works on macOS, Linux and Windows.

If you use a Node version manager (nvm, fnm, volta and similar), a global install belongs to the
Node version that was active when you installed it. Switch versions and `pocketdev` disappears
until you install it again under the new one. The `npx` form works under any version.

## Use

```bash
pocketdev                      # find the dev server on the usual ports
pocketdev 3000                 # a specific port
pocketdev --path /settings     # link straight to a page
pocketdev --json               # machine-readable, for scripts and agents
```

Run it from your project folder, so it can tell which framework you use and give the right fix.

The phone has to be on the same Wi-Fi as the computer.

## What it checks

| It says | What it means | Fix |
| --- | --- | --- |
| *only listens on this computer* | The server isn't bound to the network | Restart with `--host` (Vite, Astro, SvelteKit, Nuxt), `-H 0.0.0.0` (`next start`), or `--host 0.0.0.0` (`ng serve`) |
| *Next refuses dev requests* | Next 15.2+ blocks its dev endpoints from other origins, so the page never hydrates | Add `allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"]` to `next.config` and restart |
| *Vite refuses the name* | Vite allows IP addresses but not hostnames by default | Use the IP link, or add `server.allowedHosts: [".local"]` |

Use patterns, not your current IP address. The address changes when you change networks.

## The `.local` link

On macOS, pocketdev leads with your computer's network name (`something.local`), which stays the
same on every network, so a phone bookmark keeps working. Set a short one in System Settings,
General, Sharing, **Local hostname**. iPhones open `.local` links reliably, but some Android phones
don't, which is why the QR code encodes the IP link.

## With Claude Code

This repo is also a Claude Code plugin. Once it's installed, Claude hands back a phone link
beside every localhost link it gives you, and offers the config fix when a framework would refuse
the phone.

```bash
claude plugin marketplace add jason-armstrong-72/pocketdev
claude plugin install pocketdev@pocketdev
```

If you use auto mode, the first time Claude starts a server bound to the network you may be asked
to approve it. To allow it permanently, add this to `~/.claude/settings.json`:

```json
"autoMode": {
  "allow": [
    "$defaults",
    "Starting a local development or preview server bound to all interfaces so the user can open the app on a phone on the same local network. This does NOT extend to tunnels or anything that publishes a server beyond the local network."
  ]
}
```

## Safety

A server your phone can reach can be reached by **anyone on the same network**, and dev servers
aren't built for that. Use it at home or in the office, not on café, airport or hotel Wi-Fi.
pocketdev never opens a tunnel or exposes anything to the internet.

## License

MIT
