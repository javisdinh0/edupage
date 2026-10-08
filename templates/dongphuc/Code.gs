/**
 * Đăng ký đồng phục mùa đông {{LOP}} ({{NAM_HOC}}) — Google Apps Script (BACKEND)
 * ------------------------------------------------------------------
 * File này được SINH TỰ ĐỘNG từ templates/dongphuc/Code.gs (tools/new-class.mjs) — đừng sửa tay
 * trong thư mục lớp; sửa template rồi chạy tools/sync-classes.mjs.
 *
 * Nhận bài đăng ký từ trang web (doPost), ghi Google Sheet và lưu ảnh biên nhận vào Google Drive.
 * Đăng ký lại (cùng email + họ tên) sẽ GHI ĐÈ dòng cũ và ảnh cũ — giữ bản mới nhất.
 *
 * Script properties (tuỳ chọn):
 *   SHEET_NAME      = tên tab ghi dữ liệu (mặc định "DangKy")
 *   DRIVE_FOLDER_ID = ID thư mục Drive lưu ảnh (bỏ trống = tự tạo "Biên nhận đồng phục {{LOP}}")
 */

var LOP = '{{LOP}}';

var ITEMS = [
  { key: 'ao_len_dai', name: 'Áo len dài tay', size: true },
  { key: 'gile_len', name: 'Áo gile len', size: true },
  { key: 'gile_vai', name: 'Áo gile (vải)', size: true },
  { key: 'bo_ni', name: 'Bộ nỉ', size: true },
  { key: 'vest', name: 'Áo vest (may đo)', size: false }
];

var SIZES = ['Số 5', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];
var MAX_QTY = 20;
var MAX_RECEIPT_B64 = 1500000; // ~1,1 MB ảnh PNG
var RATE_LIMIT_PER_MIN = 5;

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

/** Kiểm tra dữ liệu đầu vào. Trả về '' nếu hợp lệ, ngược lại là thông báo lỗi. */
function validate_(d) {
  var email = String(d.email || '').trim();
  var name = String(d.fullName || '').trim();
  if (!email || !name) return 'Thiếu email hoặc họ tên.';
  if (email.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Email không hợp lệ.';
  if (name.length > 100) return 'Họ tên quá dài.';
  if (String(d.class || '').trim().toUpperCase() !== LOP) return 'Form này chỉ nhận đăng ký của lớp ' + LOP + '.';
  if (String(d.phone || '').length > 30 || String(d.note || '').length > 500) return 'Nội dung quá dài.';
  if (d.gender && d.gender !== 'Nam' && d.gender !== 'Nữ') return 'Giới tính không hợp lệ.';
  var hw = [d.height, d.weight];
  for (var i = 0; i < hw.length; i++) {
    if (hw[i] !== undefined && hw[i] !== '' && !(Number(hw[i]) > 0 && Number(hw[i]) < 400)) return 'Chiều cao/cân nặng không hợp lệ.';
  }
  for (var k = 0; k < ITEMS.length; k++) {
    var it = ITEMS[k];
    var q = Number(d[it.key + '_qty'] || 0);
    if (!(q >= 0 && q <= MAX_QTY) || Math.floor(q) !== q) return 'Số lượng ' + it.name + ' không hợp lệ (0-' + MAX_QTY + ').';
    if (it.size && q > 0 && SIZES.indexOf(d[it.key + '_size']) < 0) return 'Size ' + it.name + ' không hợp lệ.';
  }
  if (d.receipt && String(d.receipt).length > MAX_RECEIPT_B64) return 'Ảnh biên nhận quá lớn.';
  return '';
}

/** Chống gửi dồn dập: tối đa RATE_LIMIT_PER_MIN lần/phút cho mỗi email. */
function rateLimited_(email) {
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + Utilities.base64EncodeWebSafe(norm_(email)).slice(0, 80);
  var n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 60);
  return n > RATE_LIMIT_PER_MIN;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ status: 'error', permanent: true, message: 'Không nhận được dữ liệu.' });
    var d = JSON.parse(e.postData.contents);

    if (d.website) return json_({ status: 'success', saved: false }); // honeypot: bot -> lờ đi, không ghi gì

    var bad = validate_(d);
    if (bad) return json_({ status: 'error', permanent: true, message: bad });
    if (rateLimited_(d.email)) return json_({ status: 'error', message: 'Bạn gửi quá nhanh, vui lòng đợi 1 phút rồi thử lại.' });

    var row = [new Date(), String(d.email).trim(), String(d.fullName).trim(), LOP, d.gender || '', d.phone || '', d.height || '', d.weight || ''];
    ITEMS.forEach(function (it) {
      var qty = Number(d[it.key + '_qty']) || 0;
      row.push(qty);
      if (it.size) row.push(qty > 0 ? (d[it.key + '_size'] || '') : '');
    });
    row.push(d.note || '');

    // Chỉ giữ khoá khi ghi Sheet (ngắn); lưu ảnh Drive để NGOÀI khoá cho nhiều người nộp song song
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    var updated;
    try {
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
      updated = target <= last;
    } finally {
      lock.releaseLock();
    }

    var saveErr = saveReceipt_(d); // '' = lưu OK, ngược lại là thông báo lỗi
    return json_({ status: 'success', updated: updated, saved: saveErr === '', saveError: saveErr });
  } catch (err) {
    return json_({ status: 'error', message: 'Máy chủ bận hoặc lỗi tạm thời, vui lòng thử lại. (' + String(err).slice(0, 120) + ')' });
  }
}

/**
 * Lưu ảnh biên nhận (PNG) vào thư mục Google Drive. Tên file = tên học sinh.
 * Cùng email -> ghi đè (thay file cũ); khác email trùng tên -> thêm (2), (3)...
 * Lỗi lưu ảnh KHÔNG làm hỏng việc ghi Sheet. Trả về '' nếu OK, ngược lại trả thông báo lỗi.
 */
function saveReceipt_(d) {
  try {
    var m = /^data:image\/png;base64,(.+)$/.exec(d.receipt || '');
    if (!m) return 'Không có ảnh biên nhận trong dữ liệu gửi lên.';

    var props = PropertiesService.getScriptProperties();
    var folder;
    var id = props.getProperty('DRIVE_FOLDER_ID');
    if (id) {
      folder = DriveApp.getFolderById(id);
    } else {
      var lock = LockService.getScriptLock(); // tránh 2 request cùng tạo 2 thư mục
      lock.waitLock(30000);
      try {
        id = props.getProperty('DRIVE_FOLDER_ID');
        if (id) {
          folder = DriveApp.getFolderById(id);
        } else {
          folder = DriveApp.createFolder('Biên nhận đồng phục ' + LOP);
          props.setProperty('DRIVE_FOLDER_ID', folder.getId());
        }
      } finally {
        lock.releaseLock();
      }
    }

    var base = String(d.fullName).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'hoc-sinh';
    var email = norm_(d.email);
    var blob = Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png');

    var name = base + '.png';
    for (var k = 2; k < 200; k++) {
      var it = folder.getFilesByName(name);
      if (!it.hasNext()) break;
      var f = it.next();
      if (f.getDescription() === email) { f.setTrashed(true); break; }
      name = base + ' (' + k + ').png';
    }
    folder.createFile(blob.setName(name)).setDescription(email);
    return '';
  } catch (err) {
    return String(err);
  }
}

/** Chạy tay 1 lần trong editor để CẤP QUYỀN (Sheet + Drive). Nhật ký phải hiện "Đã cấp quyền OK". */
function capQuyen() {
  SpreadsheetApp.getActiveSpreadsheet().getName();
  DriveApp.getRootFolder().getName();
  getSheet_();
  Logger.log('Đã cấp quyền OK');
}

/** Chạy tay để kiểm tra lưu ảnh (tạo thư mục + 1 file thử, xoá file thử sau khi xem). */
function testDrive() {
  var png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  var err = saveReceipt_({ fullName: 'TEST LƯU ẢNH', email: 'test@example.com', receipt: png });
  Logger.log(err === '' ? 'Đã lưu ảnh OK vào thư mục Drive' : 'LỖI: ' + err);
}
