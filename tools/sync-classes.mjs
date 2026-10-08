#!/usr/bin/env node
// Sinh lại web + backend của mọi lớp trong classes.json từ template (giữ nguyên URL /exec).
//   node tools/sync-classes.mjs                    # chỉ sinh lại file trong repo
//   node tools/sync-classes.mjs --google           # + clasp push và cập nhật deployment (giữ URL)
//   node tools/sync-classes.mjs --only 10A1,10T0   # giới hạn theo lớp
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadClasses, buildWeb, buildBackend, clasp, claspJson } from './lib.mjs';

const args = process.argv.slice(2);
const google = args.includes('--google');
const oi = args.indexOf('--only');
const only = oi >= 0 ? args[oi + 1].toUpperCase().split(',') : null;

let failed = 0;
for (const c of loadClasses()) {
  if (only && !only.includes(c.lop)) continue;
  try {
    buildWeb(c);
    buildBackend(c);
    console.log(`✓ ${c.lop}: đã sinh lại web + backend`);
    if (google) {
      if (!c.scriptId || !c.deploymentId) {
        console.log(`  - ${c.lop}: thiếu scriptId/deploymentId trong classes.json → bỏ qua clasp`);
        continue;
      }
      const bdir = path.join(ROOT, c.backendDir);
      fs.writeFileSync(path.join(bdir, '.clasp.json'), claspJson(c), 'utf8');
      clasp(['push', '--force'], bdir);
      clasp(['create-deployment', '--deploymentId', c.deploymentId, '--description', 'sync từ template'], bdir);
      console.log(`  ✓ ${c.lop}: đã đẩy code và cập nhật deployment (URL giữ nguyên)`);
    }
  } catch (e) {
    failed++;
    console.error(`✗ ${c.lop}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
