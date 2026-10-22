#!/usr/bin/env node
/**
 * Bootstrap Flutter platform folders (android/ios) when SDK is available.
 * Usage: node scripts/bootstrap-flutter-platforms.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flutterCandidates = [
  process.env.FLUTTER_ROOT && path.join(process.env.FLUTTER_ROOT, 'bin', process.platform === 'win32' ? 'flutter.bat' : 'flutter'),
  process.platform === 'win32' ? 'C:\\flutter\\bin\\flutter.bat' : null,
  'flutter',
].filter(Boolean);

function findFlutter() {
  for (const c of flutterCandidates) {
    if (c === 'flutter') return c;
    if (existsSync(c)) return c;
  }
  return null;
}

const flutter = findFlutter();
if (!flutter) {
  console.error('Flutter SDK not found. Install Flutter and re-run.');
  console.error('See mobile/README.md');
  process.exit(1);
}

const r = spawnSync(
  flutter,
  ['create', '--platforms=android,ios', '--org=com.openmusic', '--project-name=openmusic', '.'],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(r.status ?? 1);
