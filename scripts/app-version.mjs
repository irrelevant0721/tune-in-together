import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const NOTES_PATH = path.join(ROOT, 'release-notes.json');

/**
 * @typedef {{ buildId: string, version: string, notes: string[], builtAt: string, forcePrompt: boolean }} AppVersionMeta
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

/** 形如 20260716.213045 */
export function createBuildId(date = new Date()) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `.${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function parseForcePrompt(raw) {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return false;
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

export function readReleaseNotesFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
    const notes = Array.isArray(raw?.notes)
      ? raw.notes.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    return {
      notes,
      forcePrompt: parseForcePrompt(raw?.forcePrompt),
      path: NOTES_PATH,
    };
  } catch {
    return { notes: [], forcePrompt: false, path: NOTES_PATH };
  }
}

/** 将本次更新说明按选择追加到历史记录，具体数量限制由写入函数统一处理。 */
export function mergeReleaseNotes(previousNotes, currentNotes, appendPrevious = false) {
  const previous = Array.isArray(previousNotes) ? previousNotes : [];
  const current = Array.isArray(currentNotes) ? currentNotes : [];
  return appendPrevious ? [...previous, ...current] : [...current];
}

/**
 * @param {string[]} notes
 * @param {{ forcePrompt?: boolean }} [options]
 */
export function writeReleaseNotesFile(notes, options = {}) {
  const cleaned = (Array.isArray(notes) ? notes : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 20);
  const forcePrompt = options.forcePrompt !== undefined
    ? parseForcePrompt(options.forcePrompt)
    : readReleaseNotesFile().forcePrompt;
  fs.writeFileSync(
    NOTES_PATH,
    `${JSON.stringify({ notes: cleaned, forcePrompt }, null, 2)}\n`,
    'utf8',
  );
  return { notes: cleaned, forcePrompt };
}

export function parseNotesFromEnv(raw) {
  return String(raw || '')
    .split(/\r?\n|;|｜/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * @param {{ notes?: string[], forcePrompt?: boolean }} [options]
 * @returns {AppVersionMeta}
 */
export function buildAppVersionMeta(options = {}) {
  const fromFile = readReleaseNotesFile();
  const notes = (options.notes && options.notes.length > 0)
    ? options.notes
    : fromFile.notes;
  const forcePrompt = options.forcePrompt !== undefined
    ? parseForcePrompt(options.forcePrompt)
    : fromFile.forcePrompt;
  const builtAt = new Date().toISOString();
  const buildId = createBuildId(new Date(builtAt));
  return {
    buildId,
    version: buildId,
    notes: notes.length > 0 ? notes : ['功能与体验优化'],
    forcePrompt,
    builtAt,
  };
}

export function writeVersionJson(outDir, meta) {
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, 'version.json');
  fs.writeFileSync(filePath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  return filePath;
}

export { NOTES_PATH, ROOT, parseForcePrompt };
