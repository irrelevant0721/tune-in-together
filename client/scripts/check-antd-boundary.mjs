#!/usr/bin/env node
// 守住 antd 的引入边界：antd/@ant-design 系列包体积很大（打包后约 900KB），
// 目前只有后台管理页（Admin/Setup 及其子组件）依赖它，且它们本身是懒加载的，
// 不会拖慢普通听歌用户的首屏。这个脚本防止以后有人在房间/大厅等主站页面
// 不小心引入 antd 组件，把这坨体积带进主站主 chunk。
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcDir = join(__dirname, '..', 'src');

const ALLOWED_PREFIXES = [
  'pages/admin/',
  'pages/Admin.tsx',
  'pages/Setup.tsx',
];

const ANTD_IMPORT_RE = /from\s+['"](antd|@ant-design\/[^'"]+)['"]/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

function isAllowed(relPath) {
  return ALLOWED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

const violations = [];
for (const file of walk(srcDir)) {
  const relPath = relative(srcDir, file).replace(/\\/g, '/');
  if (isAllowed(relPath)) continue;
  const content = readFileSync(file, 'utf8');
  if (ANTD_IMPORT_RE.test(content)) {
    violations.push(relPath);
  }
}

if (violations.length > 0) {
  console.error('发现 antd/@ant-design 引入越界（应只出现在后台管理页 pages/admin/、pages/Admin.tsx、pages/Setup.tsx 下）：');
  for (const file of violations) console.error(`  - src/${file}`);
  console.error('\n这会把 antd 这个大依赖打进主站普通用户会加载的 chunk 里，请改用轻量组件或把这块逻辑挪进后台目录。');
  process.exit(1);
}

console.log('antd 引入边界检查通过。');
