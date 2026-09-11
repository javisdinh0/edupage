/**
 * ViDiLab — Công cụ thống kê điểm : Google Apps Script (BACKEND)
 * ------------------------------------------------------------------
 * Backend RIÊNG cho trang /congcuthongkediem.
 * Lưu điểm thi khảo sát chất lượng tháng vào MỘT bảng phẳng (sheet "DiemThi").
 *
 * Mỗi dòng = 1 học sinh / 1 tháng / 1 lớp / 1 môn.
 * Khóa duy nhất (upsert): Tháng | Lớp | Môn | Mã HS.
 *
 * Các action (đều là POST + passHash, xác thực phía server):
 *   - login       : kiểm tra mật khẩu.
 *   - list        : trả toàn bộ dữ liệu điểm (2D array) để dựng dashboard.
 *   - listKeys    : trả danh sách phân biệt (tháng, lớp, môn) cho bộ lọc.
 *   - saveBatch   : upsert 1 đợt {month, class, subject, rows[]} (xóa dòng cùng
 *                   Tháng+Lớp+Môn rồi ghi lại) -> cho phép sửa & lưu đè.
 *   - deleteBatch : xóa 1 đợt Tháng+Lớp+Môn.
 *
 * CÀI ĐẶT (làm 1 lần) — xem chi tiết trong docs/congcuthongkediem/DEPLOY.md:
 *   1. Tạo Google Sheet MỚI (riêng, không dùng chung với khảo sát).
 *   2. Extensions -> Apps Script -> dán toàn bộ file này.
 *   3. Project Settings -> Script properties -> thêm:
 *        ADMIN_PASSWORD = <mật khẩu công cụ điểm>
 *        (tuỳ chọn) ADMIN_EMAIL   = <email bắt buộc khi đăng nhập>
 *        (tuỳ chọn) SHEET_NAME    = <tên sheet dữ liệu; mặc định "DiemThi">
 *   4. Deploy -> New deployment -> Web app:
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy URL /exec dán vào index.html (biến SCRIPT_URL).
 */

// Thứ tự cột cố định của bảng phẳng.
var HEADERS = [
  'Tháng', 'Lớp', 'Môn', 'TT', 'Mã HS', 'Họ tên',
  'Ngày sinh', 'Ghi chú', 'TB', 'Lần 1', 'Thi lại', 'Cập nhật lúc'
];
var DEFAULT_SHEET = 'DiemThi';

// ID bảng "User Admin" dùng chung (SSO toàn portal). KHÔNG hardcode ở đây vì
// repo này public — bắt buộc cấu hình qua Script property USERS_SHEET_ID
// (Project Settings -> Script properties, xem docs/USER_ADMIN_SETUP.md).
// Để trống property này nếu muốn quay lại ADMIN_PASSWORD cũ.
var USERS_SHEET_ID_DEFAULT = '';

/** Lấy (hoặc tạo) sheet dữ liệu, đảm bảo có hàng tiêu đề. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || DEFAULT_SHEET;
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var lastCol = sheet.getLastColumn();
  var firstRow = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if (firstRow.join('') === '') {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** SHA-256 -> chuỗi hex (khớp crypto.subtle.digest phía trình duyệt). */
function sha256Hex_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Trả JSON (đọc được cross-origin từ trang tĩnh). */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET: chỉ báo endpoint còn sống, không trả dữ liệu nhạy cảm. */
function doGet() {
  // Trả kèm thông tin chẩn đoán (không lộ mật khẩu) để mở URL /exec là thấy ngay
  // đã đọc được bảng "User Admin" hay chưa.
  return diag_();
}

/** POST: định tuyến theo action. Mọi action đều yêu cầu xác thực. */
function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'BAD_JSON' });
  }

  // Chẩn đoán không cần đăng nhập (không lộ email/mật khẩu).
  if (body.action === 'diag') return diag_();

  var auth = authenticate_(body);
  if (!auth.ok) return json_(auth);

  switch (body.action) {
    case 'login':       return json_({ ok: true, role: auth.role });
    case 'list':        return handleList_();
    case 'listKeys':    return handleListKeys_();
    case 'saveBatch':   return handleSaveBatch_(body);
    case 'deleteBatch': return handleDeleteBatch_(body);
    default:            return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  }
}

/**
 * Đọc bảng tài khoản DÙNG CHUNG "User Admin" (SSO cho toàn portal dinhtieuthuong).
 * Trả null nếu CHƯA cấu hình USERS_SHEET_ID -> gọi hàm sẽ fallback về ADMIN_PASSWORD.
 * Cột nhận diện (không phân biệt hoa/thường): "Admin account", "Admin Password",
 * "User account", "User password". Mỗi cặp là một tài khoản; đọc mọi dòng dữ liệu.
 */
function readCredentials_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('USERS_SHEET_ID') || USERS_SHEET_ID_DEFAULT;
  if (!id) return null;
  var ss = SpreadsheetApp.openById(id);
  var name = props.getProperty('USERS_SHEET_NAME');
  var sheet = name ? ss.getSheetByName(name) : ss.getSheets()[0];
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return (h || '').toString().trim().toLowerCase(); });
  var iAA = headers.indexOf('admin account'), iAP = headers.indexOf('admin password');
  var iUA = headers.indexOf('user account'), iUP = headers.indexOf('user password');
  var creds = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (iAA > -1 && (row[iAA] || '').toString().trim() !== '') {
      creds.push({ acc: row[iAA].toString().trim(), pw: (iAP > -1 ? row[iAP] : '').toString().trim(), role: 'admin' });
    }
    if (iUA > -1 && (row[iUA] || '').toString().trim() !== '') {
      creds.push({ acc: row[iUA].toString().trim(), pw: (iUP > -1 ? row[iUP] : '').toString().trim(), role: 'user' });
    }
  }
  return creds;
}

/**
 * Xác thực chung: ưu tiên bảng "User Admin"; nếu chưa cấu hình -> fallback
 * về ADMIN_PASSWORD / ADMIN_EMAIL cũ. Trả { ok, role, email } hoặc { ok:false, error }.
 */
function authenticate_(body) {
  var incomingHash = (body.passHash || '').toLowerCase();
  var incomingEmail = (body.email || '').toString().trim().toLowerCase();

  var creds;
  try {
    creds = readCredentials_();
  } catch (err) {
    return { ok: false, error: 'USERS_SHEET_ERROR', message: String(err) };
  }
  if (creds !== null) {
    for (var i = 0; i < creds.length; i++) {
      var c = creds[i];
      if (c.acc.toLowerCase() !== incomingEmail) continue;
      if (sha256Hex_(c.pw) === incomingHash) return { ok: true, role: c.role, email: c.acc };
    }
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }

  // --- Fallback: cấu hình cũ ---
  var props = PropertiesService.getScriptProperties();
  var stored = props.getProperty('ADMIN_PASSWORD');
  if (!stored) return { ok: false, error: 'SERVER_NOT_CONFIGURED' };
  var storedEmail = props.getProperty('ADMIN_EMAIL');
  if (storedEmail && incomingEmail !== storedEmail.trim().toLowerCase()) {
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  if (sha256Hex_(stored) !== incomingHash) return { ok: false, error: 'INVALID_CREDENTIALS' };
  return { ok: true, role: 'admin', email: incomingEmail };
}

/**
 * Chẩn đoán (KHÔNG cần mật khẩu, KHÔNG lộ email/mật khẩu):
 * cho biết đọc được bảng "User Admin" hay không, tìm thấy bao nhiêu tài khoản.
 * Gọi bằng: POST {"action":"diag"} tới URL /exec.
 */
function diag_() {
  var out = { ok: true, service: 'congcuthongkediem' };
  try {
    var id = PropertiesService.getScriptProperties().getProperty('USERS_SHEET_ID') || USERS_SHEET_ID_DEFAULT;
    out.usersSheetConfigured = !!id;
    var creds = readCredentials_();
    out.readable = true;
    out.credentialCount = creds ? creds.length : 0;
    out.roles = creds ? creds.map(function (c) { return c.role; }) : [];
    out.accountsMasked = creds ? creds.map(function (c) { return maskAcc_(c.acc); }) : [];
  } catch (err) {
    out.readable = false;
    out.error = String(err);
  }
  return json_(out);
}

/** Che bớt email để chẩn đoán mà không lộ đầy đủ: abc@x.com -> a***@x.com */
function maskAcc_(acc) {
  acc = (acc || '').toString();
  var at = acc.indexOf('@');
  if (at <= 1) return acc.charAt(0) + '***';
  return acc.charAt(0) + '***' + acc.substring(at);
}

/** Trả toàn bộ dữ liệu bảng điểm dưới dạng 2D array [headers, ...rows]. */
function handleList_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var iMonth = values.length ? values[0].indexOf('Tháng') : -1;
  var data = values.map(function (row, r) {
    return row.map(function (c, ci) {
      if (r > 0 && ci === iMonth) return monthKey_(c);        // Tháng luôn trả "YYYY-MM"
      if (c instanceof Date) return c.toISOString();
      return c === null || c === undefined ? '' : c;
    });
  });
  return json_({ ok: true, data: data });
}

/** Trả danh sách phân biệt (tháng, lớp, môn) để đổ vào dropdown lọc. */
function handleListKeys_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return json_({ ok: true, months: [], classes: [], subjects: [], batches: [] });

  var headers = values[0];
  var iMonth = headers.indexOf('Tháng');
  var iClass = headers.indexOf('Lớp');
  var iSubj = headers.indexOf('Môn');

  var months = {}, classes = {}, subjects = {}, batches = {};
  for (var r = 1; r < values.length; r++) {
    var m = (values[r][iMonth] || '').toString().trim();
    var c = (values[r][iClass] || '').toString().trim();
    var s = (values[r][iSubj] || '').toString().trim();
    if (!m && !c && !s) continue;
    if (m) months[m] = true;
    if (c) classes[c] = true;
    if (s) subjects[s] = true;
    batches[m + '|' + c + '|' + s] = true;
  }
  return json_({
    ok: true,
    months: Object.keys(months).sort(),
    classes: Object.keys(classes).sort(),
    subjects: Object.keys(subjects).sort(),
    batches: Object.keys(batches).sort()
  });
}

/**
 * Upsert 1 đợt: xóa mọi dòng cùng (Tháng, Lớp, Môn) rồi ghi lại từ body.rows.
 * body = { month, class, subject, rows: [ {tt, maHS, hoTen, ngaySinh, ghiChu, tb, lan1, thiLai}, ... ] }
 */
function handleSaveBatch_(body) {
  var month = monthKey_(body.month);   // chuẩn hoá về "YYYY-MM"
  var klass = (body['class'] || body.klass || '').toString().trim();
  var subject = (body.subject || '').toString().trim();
  var rows = Array.isArray(body.rows) ? body.rows : [];

  if (!month || !klass || !subject) {
    return json_({ ok: false, error: 'MISSING_KEY', message: 'Thiếu Tháng / Lớp / Môn.' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var iMonth = headers.indexOf('Tháng');
    var iClass = headers.indexOf('Lớp');
    var iSubj = headers.indexOf('Môn');

    // Xóa các dòng cũ cùng Tháng+Lớp+Môn (so khớp theo "YYYY-MM" nên vẫn khớp cả
    // dòng cũ đã bị Sheets đổi sang kiểu ngày). Xóa từ dưới lên để không lệch chỉ số.
    for (var r = values.length - 1; r >= 1; r--) {
      var m = monthKey_(values[r][iMonth]);
      var c = (values[r][iClass] || '').toString().trim();
      var s = (values[r][iSubj] || '').toString().trim();
      if (m === month && c === klass && s === subject) {
        sheet.deleteRow(r + 1); // +1 vì sheet 1-based
      }
    }

    // Ghi các dòng mới.
    var now = new Date();
    var out = rows.map(function (row) {
      return [
        month, klass, subject,
        num_(row.tt),
        (row.maHS || '').toString(),
        (row.hoTen || '').toString(),
        (row.ngaySinh || '').toString(),
        (row.ghiChu || '').toString(),
        num_(row.tb),
        num_(row.lan1),
        num_(row.thiLai),
        now
      ];
    });
    if (out.length) {
      var startRow = sheet.getLastRow() + 1;
      // Ép cột Tháng sang định dạng VĂN BẢN để Sheets KHÔNG tự đổi "2026-06" thành ngày.
      sheet.getRange(startRow, iMonth + 1, out.length, 1).setNumberFormat('@');
      sheet.getRange(startRow, 1, out.length, HEADERS.length).setValues(out);
    }
    return json_({ ok: true, saved: out.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Xóa 1 đợt Tháng+Lớp+Môn. */
function handleDeleteBatch_(body) {
  var month = monthKey_(body.month);
  var klass = (body['class'] || body.klass || '').toString().trim();
  var subject = (body.subject || '').toString().trim();
  if (!month || !klass || !subject) {
    return json_({ ok: false, error: 'MISSING_KEY' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var iMonth = headers.indexOf('Tháng');
    var iClass = headers.indexOf('Lớp');
    var iSubj = headers.indexOf('Môn');
    var deleted = 0;
    for (var r = values.length - 1; r >= 1; r--) {
      var m = monthKey_(values[r][iMonth]);
      var c = (values[r][iClass] || '').toString().trim();
      var s = (values[r][iSubj] || '').toString().trim();
      if (m === month && c === klass && s === subject) {
        sheet.deleteRow(r + 1);
        deleted++;
      }
    }
    return json_({ ok: true, deleted: deleted });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Chuẩn hoá tháng về "YYYY-MM". Nhận: chuỗi "YYYY-MM", chuỗi ISO, hoặc Date
 * (do Google Sheets tự đổi). Dùng UTC để khớp đúng tháng người dùng đã nhập.
 */
function monthKey_(v) {
  if (v instanceof Date) {
    return v.getUTCFullYear() + '-' + ('0' + (v.getUTCMonth() + 1)).slice(-2);
  }
  var s = (v === null || v === undefined) ? '' : v.toString().trim();
  var m = /^(\d{4})-(\d{2})/.exec(s);
  if (m) {
    if (s.indexOf('T') !== -1) {
      var d = new Date(s);
      if (!isNaN(d.getTime())) return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2);
    }
    return m[1] + '-' + m[2];
  }
  return s;
}

/** Chuẩn hoá số: '' hoặc không phải số -> '' (ô trống); còn lại -> Number. */
function num_(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  return isNaN(n) ? '' : n;
}
