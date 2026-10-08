#!/usr/bin/env node
// Kiểm thử logic backend (validate, giới hạn tần suất, ghi đè, lưu ảnh) bằng dịch vụ Google giả lập.
//   node tools/test-backend.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { TEMPLATE_DIR, render } from './lib.mjs';

const code = render(fs.readFileSync(path.join(TEMPLATE_DIR, 'Code.gs'), 'utf8'), { LOP: '10A1', NAM_HOC: '2026-2027' });

function makeEnv() {
  const rows = [];            // dữ liệu Sheet (không gồm tiêu đề)
  const files = [];           // file trong thư mục Drive
  const cache = {};
  const props = {};
  let lockHeld = 0, maxLock = 0, folders = 0;
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 2, r - 2 + nr).map(x => x.slice(c - 1, c - 1 + nc)),
      setValues: v => { rows[r - 2] = v[0]; return { setFontWeight() { return this; } }; },
      setFontWeight() { return this; }
    }),
    setFrozenRows() {}
  };
  const folder = {
    getId: () => 'F1',
    getFilesByName: n => { const m = files.filter(f => f.name === n && !f.trashed); let i = 0; return { hasNext: () => i < m.length, next: () => m[i++] }; },
    createFile: b => { const f = { name: b.name, desc: '', trashed: false, getDescription() { return this.desc; }, setDescription(d) { this.desc = d; return this; }, setTrashed(t) { this.trashed = t; } }; files.push(f); return f; }
  };
  const ctx = {
    console, Logger: { log() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet, getName: () => 'x' }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() { lockHeld++; maxLock = Math.max(maxLock, lockHeld); }, releaseLock() { lockHeld--; } }) },
    DriveApp: { getFolderById: () => folder, createFolder: () => { folders++; return folder; }, getRootFolder: () => ({ getName: () => 'root' }) },
    Utilities: {
      base64EncodeWebSafe: s => Buffer.from(s).toString('base64url'),
      base64Decode: s => Buffer.from(s, 'base64'),
      newBlob: () => ({ name: '', setName(n) { this.name = n; return this; } })
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) }
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const post = obj => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).s);
  return { post, rows, files, props, stats: () => ({ maxLock, folders, lockHeld }) };
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const ok = (over = {}) => ({ email: 'a@b.vn', fullName: 'Nguyễn An', class: '10A1', gender: 'Nam', ao_len_dai_qty: '1', ao_len_dai_size: 'S', vest_qty: '1', receipt: PNG, ...over });
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✓', name); };

t('đăng ký hợp lệ: ghi 1 dòng + lưu ảnh', () => {
  const e = makeEnv(); const r = e.post(ok());
  assert.equal(r.status, 'success'); assert.equal(r.saved, true); assert.equal(e.rows.length, 1); assert.equal(e.files.length, 1);
  assert.equal(e.files[0].name, 'Nguyễn An.png');
});
t('đăng ký lại cùng email+họ tên: ghi đè dòng, thay file (không nhân đôi)', () => {
  const e = makeEnv(); e.post(ok()); const r = e.post(ok({ ao_len_dai_qty: '2', ao_len_dai_size: 'M' }));
  assert.equal(r.updated, true); assert.equal(e.rows.length, 1);
  assert.equal(e.files.filter(f => !f.trashed).length, 1); assert.equal(e.files.filter(f => f.trashed).length, 1);
});
t('trùng tên khác email: file thứ hai là "(2)"', () => {
  const e = makeEnv(); e.post(ok()); e.post(ok({ email: 'c@d.vn' }));
  assert.deepEqual(e.files.filter(f => !f.trashed).map(f => f.name), ['Nguyễn An.png', 'Nguyễn An (2).png']);
});
t('sai lớp bị từ chối (permanent)', () => {
  const r = makeEnv().post(ok({ class: '10B2' })); assert.equal(r.status, 'error'); assert.equal(r.permanent, true);
});
t('size sai / số lượng sai / email sai bị từ chối', () => {
  const e = makeEnv();
  assert.equal(e.post(ok({ ao_len_dai_size: 'XXL' })).status, 'error');
  assert.equal(e.post(ok({ vest_qty: '99' })).status, 'error');
  assert.equal(e.post(ok({ vest_qty: '-1' })).status, 'error');
  assert.equal(e.post(ok({ email: 'khong-hop-le' })).status, 'error');
  assert.equal(e.post(ok({ fullName: 'x'.repeat(101) })).status, 'error');
  assert.equal(e.rows.length, 0);
});
t('ảnh quá lớn bị từ chối', () => {
  const r = makeEnv().post(ok({ receipt: 'data:image/png;base64,' + 'A'.repeat(1600000) })); assert.equal(r.status, 'error');
});
t('honeypot: bot không ghi gì', () => {
  const e = makeEnv(); const r = e.post(ok({ website: 'http://spam' })); assert.equal(r.status, 'success'); assert.equal(e.rows.length, 0); assert.equal(e.files.length, 0);
});
t('giới hạn tần suất: lần thứ 6 trong 1 phút bị chặn (không permanent)', () => {
  const e = makeEnv(); let last;
  for (let i = 0; i < 6; i++) last = e.post(ok());
  assert.equal(last.status, 'error'); assert.notEqual(last.permanent, true);
});
t('khoá được nhả sau mỗi yêu cầu và thư mục Drive chỉ tạo 1 lần', () => {
  const e = makeEnv(); e.post(ok()); e.post(ok({ email: 'z@y.vn', fullName: 'Lê B' }));
  assert.equal(e.stats().lockHeld, 0); assert.equal(e.stats().folders, 1);
});
t('lưu ảnh lỗi (không có ảnh) vẫn ghi Sheet', () => {
  const e = makeEnv(); const r = e.post(ok({ receipt: '' })); assert.equal(r.status, 'success'); assert.equal(r.saved, false); assert.equal(e.rows.length, 1);
});
console.log(`\n${n} bài kiểm tra đạt.`);
