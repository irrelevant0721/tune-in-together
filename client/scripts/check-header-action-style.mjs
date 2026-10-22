import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../src/', import.meta.url);
const files = [
  'pages/Home.tsx',
  'components/AccountAccess.tsx',
  'components/MyRoomsAccess.tsx',
];

const sources = await Promise.all(files.map((file) => readFile(new URL(file, root), 'utf8')));
const sharedStyle = await readFile(new URL('lib/homeHeaderActions.ts', root), 'utf8');

assert.match(sharedStyle, /border-white\/20/, 'shared actions must retain a visible white outline');
assert.match(sharedStyle, /active:scale-\[0\.98\]/, 'shared actions must provide touch feedback');
assert.doesNotMatch(
  sources[1],
  /flex h-6 w-6 items-center/,
  'account status icon must not make login actions taller than neighboring actions',
);

for (const [index, source] of sources.entries()) {
  assert.match(
    source,
    /headerPillCls/,
    `${files[index]} must use the shared desktop header action style`,
  );
}

assert.match(
  sources[0],
  /data-home-primary-actions[\s\S]{0,700}AccountAccess[\s\S]{0,700}MyRoomsAccess/,
  'account actions must sit beside the OpenMusic brand',
);
