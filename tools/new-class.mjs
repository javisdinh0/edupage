#!/usr/bin/env node
// Tạo form đăng ký đồng phục cho 1 lớp mới: web + backend (+ Google Sheet/Apps Script qua clasp).
//   node tools/new-class.mjs 10A1 [--nam-hoc 2026-2027] [--no-google] [--gas-url <URL /exec>]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE, loadClasses, saveClasses, buildWeb, buildBackend, clasp, claspJson, gasUrlOf } from './lib.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const lopArg = args.find(a => !a.startsWith('--') && a !== opt('--nam-hoc') && a !== opt('--gas-url'));

if (!lopArg) {
  console.error('Cách dùng: node tools/new-class.mjs <tên-lớp> [--nam-hoc 2026-2027] [--no-google] [--gas-url <URL>]');
  process.exit(1);
}
if (!/^[0-9a-zA-Z]{2,12}$/.test(lopArg)) {
  console.error('Tên lớp chỉ gồm chữ/số không dấu (2-12 ký tự), ví dụ 10A1.');
  process.exit(1);
}
const namHoc = opt('--nam-hoc') || '2026-2027';
if (!/^\d{4}-\d{4}$/.test(namHoc)) {
  console.error('Năm học dạng 2026-2027.');
  process.exit(1);
}

const lop = lopArg.toUpperCase();
const slug = lopArg.toLowerCase();
const namMa = namHoc.split('-')[0];

const list = loadClasses();
if (list.some(c => c.lop === lop && c.namHoc === namHoc)) {
  console.error(`Lớp ${lop} (${namHoc}) đã có trong classes.json.`);
  process.exit(1);
}
const webDir = `dongphucmuadong${namMa}/${slug}`;
if (fs.existsSync(path.join(ROOT, webDir))) {
  console.error(`Thư mục ${webDir} đã tồn tại.`);
  process.exit(1);
}

const entry = {
  lop, namHoc, webDir,
  chung: '../_chung',
  backendDir: `backend/dongphucmuadong${namMa}/${slug}`,
  scriptId: null, deploymentId: null, gasUrl: opt('--gas-url') || ''
};

buildBackend(entry);

if (!flag('--no-google') && !entry.gasUrl) {
  const bdir = path.join(ROOT, entry.backendDir);
  console.log('Đang tạo Google Sheet + Apps Script (clasp)…');
  clasp(['create-script', '--type', 'sheets', '--title', `Đồng phục đông ${lop} ${namHoc}`], bdir);
  entry.scriptId = JSON.parse(fs.readFileSync(path.join(bdir, '.clasp.json'), 'utf8')).scriptId;
  if (!entry.scriptId) throw new Error('Không đọc được scriptId từ .clasp.json do clasp tạo.');
  fs.writeFileSync(path.join(bdir, '.clasp.json'), claspJson(entry), 'utf8');
  buildBackend(entry); // ghi đè appsscript.json mặc định do clasp tạo
  clasp(['push', '--force'], bdir);
  const dep = clasp(['create-deployment', '--description', `Đồng phục ${lop}`], bdir);
  const m = /(AKfy[\w-]+)/.exec(dep);
  if (!m) throw new Error('Không đọc được deployment ID từ clasp:\n' + dep);
  entry.deploymentId = m[1];
  entry.gasUrl = gasUrlOf(m[1]);
} else if (entry.gasUrl) {
  entry.deploymentId = (/\/s\/([^/]+)\/exec/.exec(entry.gasUrl) || [])[1] || null;
}

buildWeb(entry);
list.push(entry);
saveClasses(list);

console.log('\nĐã tạo lớp', lop);
console.log('  Web     :', webDir + '/index.html');
console.log('  Backend :', entry.backendDir);
console.log('  Link    :', `${SITE}/${webDir}/`);
if (entry.gasUrl) console.log('  /exec   :', entry.gasUrl);
console.log(`
Việc còn lại (thủ công, Google bắt buộc):
  1. Mở Apps Script của lớp (script.google.com → "Đồng phục đông ${lop} ${namHoc}"), chọn hàm capQuyen → Chạy → Cho phép.
     Nhật ký phải hiện "Đã cấp quyền OK".
  2. Commit + push, merge PR → link hoạt động sau 1-2 phút.`);
