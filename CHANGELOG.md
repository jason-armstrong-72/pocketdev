# Changelog

Each release of pocketdev gets a section here, newest first. The version lives in `package.json`
and `.claude-plugin/plugin.json`, which change together.

How a release happens: the pull request that changes the version adds its section here. After it
merges, the merge commit is tagged `v<version>` and a GitHub Release is published with the same
notes. Versions before 0.1.1 are not listed.

## 0.1.1 (2026-10-09)

### Fixed

- The Claude Code skill no longer offers `npx -y pocketdev` as a fallback. pocketdev isn't
  published on npm under that name, so the command failed, and it would have run whatever package
  someone else published under the name. The fallback is now
  `npx -y github:jason-armstrong-72/pocketdev` (#4).
