import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const deny = /(^|\/)(\.git|node_modules|dist|build|release|dow|data|deployment-backups|artifacts|\.codex|\.dart_tool|\.gradle|\.kotlin|\.idea|\.vscode|coverage)(\/|$)|(^|\/)(admin-access\.txt|desktop-build\.local\.json|desktop-runtime-config\.json|adminCredentials\.json|runtimeConfig\.json|adminConfig\.json|siteBans\.json|setup\.lock|key\.properties|local\.properties|connect-domain\.ps1)$|\.(log|tsbuildinfo|jks|keystore|pem|p12|key|apk|aab|ipa|exe|zip)$/i;
function excluded(name) {
  if (deny.test(name) || /(^|\/)\.env(?:\.|$)/i.test(name) && !/\.example$/i.test(name)) return true;
  if (['VERIFICATION.md', 'docs/WECHAT-COMPANION-LIVE-VERIFICATION.md', 'docs/WECHAT-COMPANION-VERIFICATION.md'].includes(name)) return true;
  return !name.includes('/') && /-preview\.png$/i.test(name);
}
function exportBytes(name, bytes) {
  // Sanitize only public copies of these host-specific files; keep live settings intact.
  if (!['FRIENDS-DEPLOYMENT.md', 'docker-compose.friends.yml', 'start-music.ps1'].includes(name)) return bytes;
  return Buffer.from(bytes.toString('utf8')
    .replaceAll('music.irrelevant0721.kdns.fr', 'music.example.com')
    .replaceAll('zzz.irrelevant0721.kdns.fr', 'api.example.com')
    .replaceAll('5dd7cc46-d5cf-42f1-a4ca-b38444e92762.cfargotunnel.com', 'YOUR_TUNNEL_ID.cfargotunnel.com'));
}
const rules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
  ['api-secret', /\bsk-(?:proj-|ant-api\d+-)?[A-Za-z0-9_-]{32,}\b/g],
  ['cloud-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
];
const files = [];
const excludedPaths = [];
const findings = [];
const advisories = [];
for (const name of [...new Set(listed.split('\0').filter(Boolean))].sort()) {
  if (excluded(name)) { excludedPaths.push(name); continue; }
  const absolute = path.resolve(root, name);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Path outside workspace');
  if (!fs.existsSync(absolute)) continue; // tracked deletions are not restored
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile()) throw new Error(`Unsupported symlink or submodule: ${name}`);
  if (stat.size > 100 * 1024 * 1024) { findings.push({ file: name, rule: 'file-over-100MiB' }); continue; }
  const bytes = fs.readFileSync(absolute);
  const text = bytes.includes(0) ? null : bytes.toString('utf8');
  if (text !== null) {
    for (const [rule, expression] of rules) {
      expression.lastIndex = 0;
      for (const match of text.matchAll(expression)) {
        findings.push({ file: name, line: text.slice(0, match.index).split('\n').length, rule });
      }
    }
    if (name.endsWith('.example')) {
      text.split('\n').forEach((line, index) => {
        const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
        if (!match || !/SECRET|TOKEN|PASSWORD|COOKIE|API_KEY|ACCESS_KEY/i.test(match[1])) return;
        const value = match[2].replace(/^["']|["']$/g, '');
        if (value && !/replace|example|your|change|placeholder|^false$|^true$/i.test(value)) findings.push({ file: name, line: index + 1, rule: 'non-placeholder-example-credential' });
      });
    }
    if (!['scripts/prepare-source-release.mjs', 'scripts/package-build.mjs'].includes(name) && /irrelevant0721\.kdns\.fr|[A-Z]:\\(?:Users|AiWork)\\/i.test(text)) advisories.push({ file: name, rule: 'local-deployment-reference', sanitizedInExport: !exportBytes(name, bytes).equals(bytes) });
  }
  const exported = exportBytes(name, bytes);
  files.push({ path: name, bytes: exported.length, sha256: crypto.createHash('sha256').update(exported).digest('hex'), sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'), sanitized: !exported.equals(bytes) });
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(root, 'release', `source-review-${stamp}`);
fs.mkdirSync(output, { recursive: true });
const report = {
  status: findings.length ? 'blocked-by-scan' : 'review-required',
  generatedAt: new Date().toISOString(),
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  shallowHistory: execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true',
  scope: 'Working tree snapshot including non-ignored untracked files. No full-history, binary-content, or complete credential/asset authorization audit.',
  authorization: 'Unresolved third-party provenance and license questions: see THIRD_PARTY_NOTICES.md. Not cleared for public distribution.',
  files: files.length, findings, advisories, excludedPaths,
};
fs.writeFileSync(path.join(output, 'SCAN-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'MANIFEST.json'), JSON.stringify(files, null, 2) + '\n');
console.log(`Scan report: ${path.join(output, 'SCAN-REPORT.json')}`);
if (findings.length) {
  for (const finding of findings) console.error(`${finding.file}:${finding.line || 0} [${finding.rule}]`);
  process.exitCode = 1;
} else {
  const destination = path.join(output, 'openmusic');
  fs.mkdirSync(destination);
  for (const file of files) {
    const source = path.join(root, file.path);
    // Prevent a concurrent edit between scan and copy from bypassing the scan.
    const bytes = fs.readFileSync(source);
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== file.sourceSha256) throw new Error(`File changed during packaging: ${file.path}`);
    const target = path.join(destination, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, exportBytes(file.path, bytes));
  }
  const archive = path.join(output, 'openmusic-source-review.zip');
  if (process.platform === 'win32') {
    // Environment variables carry paths; no workspace path is interpolated into shell code.
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:SOURCE_REVIEW_INPUT, $env:SOURCE_REVIEW_ZIP)'],
    { stdio: 'inherit', env: { ...process.env, SOURCE_REVIEW_INPUT: destination, SOURCE_REVIEW_ZIP: archive } });
  } else {
    execFileSync('zip', ['-q', '-r', archive, '.'], { cwd: destination, stdio: 'inherit' });
  }
  fs.writeFileSync(path.join(output, 'SHA256SUMS'), `${crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex')}  ${path.basename(archive)}\n`);
  console.log(`Source review archive: ${archive}\nFiles: ${files.length}; advisories: ${advisories.length}. Third-party authorization remains unresolved.`);
}
