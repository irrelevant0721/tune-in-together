#!/usr/bin/env node
/**
 * Build Flutter APK and copy to server/downloads/openmusic.apk
 *
 *   node scripts/build-flutter-apk.mjs --server-url=https://example.com [--release]
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');

const args = process.argv.slice(2);
const release = args.includes('--release');
const noVersionBump = args.includes('--no-version-bump');
const serverArg = args.find((a) => a.startsWith('--server-url='));
const rawServerUrl = serverArg?.slice('--server-url='.length) || process.env.OM_SERVER_URL;
if (!rawServerUrl) {
  console.error('Missing --server-url= or OM_SERVER_URL');
  process.exit(1);
}

function normalizeServerOrigin(raw, requireHttps) {
  let parsed;
  try {
    parsed = new URL(String(raw).trim());
  } catch {
    console.error('OM_SERVER_URL must be a valid http/https origin');
    process.exit(1);
  }
  const validScheme = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  if (
    !validScheme
    || parsed.username
    || parsed.password
    || (parsed.pathname && parsed.pathname !== '/')
    || parsed.search
    || parsed.hash
  ) {
    console.error('OM_SERVER_URL must be a valid http/https origin');
    process.exit(1);
  }
  if (requireHttps && parsed.protocol !== 'https:') {
    console.error('Release builds require an HTTPS OM_SERVER_URL');
    process.exit(1);
  }
  return parsed.origin;
}

const serverUrl = normalizeServerOrigin(rawServerUrl, release);

const flutter =
  process.env.FLUTTER_ROOT
    ? path.join(process.env.FLUTTER_ROOT, 'bin', process.platform === 'win32' ? 'flutter.bat' : 'flutter')
    : process.platform === 'win32' && existsSync('C:\\flutter\\bin\\flutter.bat')
      ? 'C:\\flutter\\bin\\flutter.bat'
      : 'flutter';

const pubspecPath = path.join(mobileRoot, 'pubspec.yaml');
const localVersionPath = path.join(mobileRoot, '.android-version.local');

function parseVersion(version, source) {
  const versionMatch = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)\+(\d+)$/);
  if (!versionMatch) {
    console.error(`Invalid Flutter version in ${source}, expected: x.y.z+build`);
    process.exit(1);
  }

  const [, major, minor, patch, build] = versionMatch;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    build: Number(build),
  };
}

function formatVersion({ major, minor, patch, build }) {
  return `${major}.${minor}.${patch}+${build}`;
}

function readBaseVersion() {
  const pubspec = readFileSync(pubspecPath, 'utf8');
  const versionMatch = pubspec.match(/^version:\s*(\d+\.\d+\.\d+\+\d+)\s*$/m);
  if (!versionMatch) {
    console.error('Cannot find Flutter version in pubspec.yaml, expected: version: x.y.z+build');
    process.exit(1);
  }
  return parseVersion(versionMatch[1], 'pubspec.yaml');
}

function readLocalVersion() {
  if (!existsSync(localVersionPath)) return null;
  return parseVersion(readFileSync(localVersionPath, 'utf8'), '.android-version.local');
}

function bumpAndroidVersion() {
  const previous = readLocalVersion() ?? readBaseVersion();
  const nextPatch = previous.patch + 1;
  const nextBuild = previous.build + 1;
  if (
    !Number.isSafeInteger(nextPatch)
    || nextPatch <= previous.patch
    || !Number.isSafeInteger(nextBuild)
    || nextBuild <= previous.build
  ) {
    console.error('Invalid Android version:', formatVersion(previous));
    process.exit(1);
  }

  const next = { ...previous, patch: nextPatch, build: nextBuild };
  writeFileSync(localVersionPath, `${formatVersion(next)}\n`);
  console.log(`Bumped local Android version: ${formatVersion(previous)} -> ${formatVersion(next)}`);
  return next;
}

const androidVersion = release
  ? noVersionBump
    ? readLocalVersion() ?? readBaseVersion()
    : bumpAndroidVersion()
  : readBaseVersion();

const buildType = release ? 'apk' : 'apk';
const mode = release ? '--release' : '--debug';
const r = spawnSync(
  flutter,
  [
    'build',
    buildType,
    mode,
    `--build-name=${androidVersion.major}.${androidVersion.minor}.${androidVersion.patch}`,
    `--build-number=${androidVersion.build}`,
    `--dart-define=OM_FLAVOR=${release ? 'prod' : 'local'}`,
    `--dart-define=OM_SERVER_URL=${serverUrl}`,
  ],
  { cwd: mobileRoot, stdio: 'inherit', shell: process.platform === 'win32' },
);
if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);

const apkDir = path.join(
  mobileRoot,
  'build',
  'app',
  'outputs',
  'flutter-apk',
);
const apkName = release ? 'app-release.apk' : 'app-debug.apk';
const src = path.join(apkDir, apkName);
if (!existsSync(src)) {
  console.error('APK not found at', src);
  process.exit(1);
}
const destDir = path.join(repoRoot, 'server', 'downloads');
mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, 'openmusic.apk');
copyFileSync(src, dest);
console.log('Copied', src, '->', dest);
