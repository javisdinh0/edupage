// Thư viện dùng chung cho new-class.mjs / sync-classes.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_DIR = path.join(ROOT, 'templates', 'dongphuc');
export const CHUNG_DIR = path.join(ROOT, 'dongphucmuadong2026', '_chung');
export const CLASSES_FILE = path.join(ROOT, 'classes.json');
export const SITE = 'https://edupage.space';

export function loadClasses() {
  return JSON.parse(fs.readFileSync(CLASSES_FILE, 'utf8'));
}
export function saveClasses(list) {
  fs.writeFileSync(CLASSES_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
}

/** Mã băm ngắn của tài nguyên dùng chung -> chống trình duyệt giữ bản cũ (cache-bust). */
export function assetVersion() {
  const h = crypto.createHash('sha1');
  for (const f of ['script.js', 'style.css']) h.update(fs.readFileSync(path.join(CHUNG_DIR, f)));
  return h.digest('hex').slice(0, 8);
}

export function render(text, vars) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Thiếu biến template ${k}`);
    return vars[k];
  });
}

export function gasUrlOf(deploymentId) {
  return `https://script.google.com/macros/s/${deploymentId}/exec`;
}

/** Sinh trang web của lớp từ template. */
export function buildWeb(c) {
  const vars = { LOP: c.lop, NAM_HOC: c.namHoc, CHUNG: c.chung, GAS_URL: c.gasUrl || '', VER: assetVersion() };
  const dir = path.join(ROOT, c.webDir);
  fs.mkdirSync(dir, { recursive: true });
  const html = render(fs.readFileSync(path.join(TEMPLATE_DIR, 'index.html'), 'utf8'), vars);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

/** Sinh backend (Code.gs + appsscript.json) của lớp từ template. */
export function buildBackend(c) {
  const vars = { LOP: c.lop, NAM_HOC: c.namHoc };
  const dir = path.join(ROOT, c.backendDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Code.gs'), render(fs.readFileSync(path.join(TEMPLATE_DIR, 'Code.gs'), 'utf8'), vars), 'utf8');
  fs.copyFileSync(path.join(TEMPLATE_DIR, 'appsscript.json'), path.join(dir, 'appsscript.json'));
}

/** Chạy clasp trong thư mục backend của lớp; ném lỗi nếu thất bại. */
export function clasp(args, cwd) {
  const r = spawnSync('clasp', args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.error) throw new Error('Không chạy được clasp (đã cài chưa? npm i -g @google/clasp): ' + r.error.message);
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0) throw new Error(`clasp ${args.join(' ')} thất bại:\n${out}`);
  return out;
}

export function claspJson(c) {
  return JSON.stringify({ scriptId: c.scriptId, rootDir: '.' }, null, 2) + '\n';
}
