// bump-version.mjs — bump the plugin version across all metadata files and the changelog.
//
// Usage:
//   node bump-version.mjs 2.1.3-beta.1        # explicit version
//   node bump-version.mjs --beta             # auto: next beta prerelease
//   node bump-version.mjs --rc               # auto: next release-candidate
//
// Keeps package.json, manifest.json and versions.json in sync, back-fills any
// previously published version that is missing from versions.json, and appends
// a dated entry to CHANGELOG.md. It does NOT commit or tag — that is left to the
// developer so a Conventional Commit message can be used and no remote push occurs.

import { readFileSync, writeFileSync, existsSync } from "fs";

const semverRe = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/;

function parse(v) {
  const m = v.match(semverRe);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return {
    major: +m[1],
    minor: +m[2],
    patch: +m[3],
    preid: m[4] || null,
    prenum: m[5] ? +m[5] : null,
  };
}

function format(p) {
  const base = `${p.major}.${p.minor}.${p.patch}`;
  return p.preid ? `${base}-${p.preid}.${p.prenum}` : base;
}

function nextPrerelease(current, preid) {
  const p = parse(current);
  if (p.preid === preid && p.prenum != null) {
    return format({ ...p, prenum: p.prenum + 1 });
  }
  // no matching prerelease yet -> bump patch, start at .1
  return format({ major: p.major, minor: p.minor, patch: p.patch + 1, preid, prenum: 1 });
}

const arg = process.argv[2];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const cur = pkg.version;
if (!cur) throw new Error("package.json has no version field");

let next;
if (arg && arg.startsWith("--")) {
  const id = arg.slice(2); // beta | rc | alpha
  if (!["beta", "rc", "alpha"].includes(id)) throw new Error(`Unknown prerelease id: ${id}`);
  next = nextPrerelease(cur, id);
} else if (arg) {
  parse(arg); // validate
  next = arg;
} else {
  throw new Error("Provide an explicit version or a --beta/--rc/--alpha flag");
}

// 1. package.json
pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, "\t") + "\n");

// 2. manifest.json (preserve minAppVersion)
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = next;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// 3. versions.json — back-fill current version if missing, then add next
const vpath = "versions.json";
let versions = existsSync(vpath) ? JSON.parse(readFileSync(vpath, "utf8")) : {};
if (!versions[cur]) versions[cur] = minAppVersion;
versions[next] = minAppVersion;
writeFileSync(vpath, JSON.stringify(versions, null, "\t") + "\n");

// 4. CHANGELOG.md
const date = new Date().toISOString().slice(0, 10);
const cpath = "CHANGELOG.md";
let changelog = existsSync(cpath) ? readFileSync(cpath, "utf8") : "# Changelog\n\n";
const entry = `## [${next}] - ${date}\n\n- _test build_ — internal refactor / changes under test.\n\n`;
changelog = changelog.replace(/(# Changelog\n+)/, `$1\n${entry}`);
writeFileSync(cpath, changelog);

console.log(`Bumped ${cur} -> ${next}`);
console.log("Updated: package.json, manifest.json, versions.json, CHANGELOG.md");
console.log("Next step: git commit -m 'chore(release): ${next}' && git tag ${next}");
