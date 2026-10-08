/**
 * Đăng ký đồng phục mùa đông 10T0 — Google Apps Script (BACKEND)
 * ------------------------------------------------------------------
 * Nhận bài đăng ký từ dongphuc/index.html (doPost) và ghi vào Google Sheet.
 * Đăng ký lại (cùng email + họ tên) sẽ GHI ĐÈ dòng cũ — giữ bản mới nhất.
 *
 * CÀI ĐẶT (làm 1 lần) — xem docs/dongphuc/DEPLOY.md:
 *   1. Tạo Google Sheet mới -> Extensions -> Apps Script -> dán file này.
 *   2. (Tuỳ chọn) Script properties: SHEET_NAME = tên sheet ghi dữ liệu (mặc định "DangKy").
 *   3. Deploy -> New deployment -> Web app: Execute as Me, Who has access: Anyone.
 *   4. Copy URL /exec dán vào GAS_WEB_APP_URL trong dongphuc/script.js.
 */

var ITEMS = [
  { key: 'ao_len_dai', name: 'Áo len dài tay', size: true },
  { key: 'gile_len', name: 'Áo gile len', size: true },
  { key: 'gile_vai', name: 'Áo gile (vải)', size: true },
  { key: 'bo_ni', name: 'Bộ nỉ', size: true },
  { key: 'vest', name: 'Áo vest (may đo)', size: false }
];

var HEADERS = ['Thời gian', 'Email', 'Họ tên', 'Lớp', 'Giới tính', 'SĐT', 'Chiều cao (cm)', 'Cân nặng (kg)'];

function headers_() {
  var h = HEADERS.slice();
  ITEMS.forEach(function (it) {
    h.push(it.name + ' - SL');
    if (it.size) h.push(it.name + ' - Size');
  });
  h.push('Ghi chú');
  return h;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || 'DangKy';
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    var h = headers_();
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function norm_(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Không nhận được dữ liệu.');
    var d = JSON.parse(e.postData.contents);
    if (!d.email || !d.fullName) throw new Error('Thiếu email hoặc họ tên.');

    var row = [new Date(), String(d.email).trim(), String(d.fullName).trim(), d.class || '', d.gender || '', d.phone || '', d.height || '', d.weight || ''];
    ITEMS.forEach(function (it) {
      var qty = Number(d[it.key + '_qty']) || 0;
      row.push(qty);
      if (it.size) row.push(qty > 0 ? (d[it.key + '_size'] || '') : '');
    });
    row.push(d.note || '');

    lock.waitLock(20000);
    var sh = getSheet_();
    var last = sh.getLastRow();
    var target = last + 1;
    if (last > 1) {
      var keys = sh.getRange(2, 2, last - 1, 2).getValues(); // cột Email, Họ tên
      for (var i = 0; i < keys.length; i++) {
        if (norm_(keys[i][0]) === norm_(d.email) && norm_(keys[i][1]) === norm_(d.fullName)) {
          target = i + 2;
          break;
        }
      }
    }
    sh.getRange(target, 1, 1, row.length).setValues([row]);
    var mailErr = sendReceipt_(d); // '' = gửi OK, ngược lại là thông báo lỗi
    return json_({ status: 'success', updated: target <= last, mailed: mailErr === '', mailError: mailErr });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/**
 * Gửi email biên nhận (ảnh PNG đính kèm) cho người nhận nội bộ.
 * Người nhận: Script property NOTIFY_EMAIL; bỏ trống = chính tài khoản chạy script.
 * Lỗi gửi mail KHÔNG làm hỏng việc ghi Sheet. Trả về '' nếu OK, ngược lại trả thông báo lỗi.
 */
function sendReceipt_(d) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
    var m = /^data:image\/png;base64,(.+)$/.exec(d.receipt || '');
    var opts = { name: 'Đăng ký đồng phục 10T0' };
    var summary = ITEMS.filter(function (it) { return Number(d[it.key + '_qty']) > 0; }).map(function (it) {
      return '- ' + it.name + ': ' + d[it.key + '_qty'] + (it.size ? ' (Size ' + d[it.key + '_size'] + ')' : ' (may đo)');
    }).join('\n') || 'Không đăng ký';
    if (m) {
      var file = 'Bien_nhan_' + String(d.fullName).replace(/[^\w]+/g, '_') + '.png';
      opts.attachments = [Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', file)];
    }
    var body = 'Học sinh: ' + d.fullName + ' - Lớp ' + (d.class || '') + ' - ' + (d.gender || '') +
      '\nEmail đăng ký: ' + d.email +
      '\nChiều cao / cân nặng: ' + (d.height || '?') + ' cm / ' + (d.weight || '?') + ' kg' +
      '\nThời gian: ' + (d.submittedAt || '') +
      '\n\n' + summary + (d.note ? '\n\nGhi chú: ' + d.note : '') + '\n\n(Phiếu biên nhận đính kèm.)';
    MailApp.sendEmail(to, '[Đồng phục 10T0] ' + d.fullName + ' đã đăng ký', body, opts);
    return '';
  } catch (err) {
    return String(err);
  }
}

/** Chạy tay trong editor để kiểm tra quyền + gửi thử 1 email (xem kết quả ở Nhật ký thực thi). */
function testMail() {
  var err = sendReceipt_({
    fullName: 'TEST EMAIL', email: 'test@example.com', class: '10T0', gender: 'Nữ',
    height: '160', weight: '52', submittedAt: new Date().toString(),
    vest_qty: '1', note: 'Email kiểm tra từ testMail()'
  });
  Logger.log(err === '' ? 'Đã gửi mail OK' : 'LỖI: ' + err);
}
