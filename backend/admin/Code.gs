/**
 * ViDiLab — Khảo sát 10T0 : Google Apps Script (BACKEND)
 * ------------------------------------------------------------------
 * File này là "máy chủ" thật của hệ thống. Nó làm 2 việc:
 *   1) Nhận bài khảo sát từ trang phụ huynh (doPost, không cần mật khẩu).
 *   2) Trả dữ liệu cho trang admin CHỈ KHI mật khẩu đúng (xác thực phía server).
 *
 * ĐIỂM KHÁC BIỆT BẢO MẬT so với bản cũ:
 *   - Bản cũ: GET /exec -> trả TOÀN BỘ dữ liệu, không cần mật khẩu (ai cũng lấy được).
 *   - Bản này: muốn lấy dữ liệu phải POST kèm mật khẩu đúng; sai -> 401, không trả gì.
 *
 * CÀI ĐẶT (làm 1 lần) — xem chi tiết trong docs/admin/DEPLOY_BAO_MAT.md:
 *   1. Mở Google Sheet chứa dữ liệu -> Extensions -> Apps Script.
 *   2. Dán toàn bộ file này vào (thay cho code cũ).
 *   3. Project Settings -> Script properties -> thêm:
 *        ADMIN_PASSWORD = <mật khẩu admin bạn muốn>
 *        (tuỳ chọn) SHEET_NAME = <tên sheet chứa dữ liệu; bỏ trống = sheet đầu tiên>
 *   4. Deploy -> New deployment -> Web app:
 *        Execute as: Me
 *        Who has access: Anyone
 *      Copy URL /exec dán vào admin/index.html (biến SCRIPT_URL).
 */

// Các cột cố định luôn đứng đầu bảng
var FIXED_COLS = ['Thời gian', 'Họ Tên Con', 'Email Phụ Huynh'];

// ID bảng "User Admin" dùng chung (SSO toàn portal). KHÔNG hardcode ở đây vì
// repo này public — bắt buộc cấu hình qua Script property USERS_SHEET_ID
// (Project Settings -> Script properties, xem docs/USER_ADMIN_SETUP.md).
// Để trống property này nếu muốn quay lại ADMIN_PASSWORD cũ.
var USERS_SHEET_ID_DEFAULT = '';

/** Lấy sheet dữ liệu (theo Script property SHEET_NAME, mặc định sheet đầu tiên). */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = PropertiesService.getScriptProperties().getProperty('SHEET_NAME');
  if (name) {
    var s = ss.getSheetByName(name);
    if (s) return s;
  }
  return ss.getSheets()[0];
}

/** SHA-256 -> chuỗi hex (khớp với crypto.subtle.digest ở phía trình duyệt). */
function sha256Hex_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Trả JSON (có thể đọc cross-origin từ trang admin). */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET: không trả dữ liệu nhạy cảm. Chỉ báo endpoint còn sống.
 * (Đây chính là chỗ bản cũ bị lộ toàn bộ dữ liệu — nay đã đóng lại.)
 */
function doGet() {
  // Trả kèm thông tin chẩn đoán (không lộ mật khẩu) để mở URL /exec là thấy ngay
  // đã đọc được bảng "User Admin" hay chưa.
  return diag_();
}

/**
 * POST:
 *   - action === 'login'  -> xác thực rồi trả dữ liệu.
 *   - còn lại (có studentName/dataJSON) -> ghi bài khảo sát mới.
 */
function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'BAD_JSON' });
  }

  if (body.action === 'diag') {
    return diag_();
  }
  if (body.action === 'login') {
    return handleLogin_(body);
  }
  return handleSubmit_(body);
}

/**
 * Chẩn đoán (KHÔNG cần mật khẩu, KHÔNG lộ email/mật khẩu):
 * cho biết đọc được bảng "User Admin" hay không, tìm thấy bao nhiêu tài khoản.
 * Gọi bằng: POST {"action":"diag"} tới URL /exec.
 */
function diag_() {
  var out = { ok: true, service: 'khaosat-admin' };
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
 * về ADMIN_PASSWORD / ADMIN_EMAIL cũ (để không phá hệ thống đang chạy).
 * Trả { ok, role, email } hoặc { ok:false, error }.
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

/** Xác thực admin phía server rồi trả dữ liệu bảng. */
function handleLogin_(body) {
  var auth = authenticate_(body);
  if (!auth.ok) return json_(auth);

  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  // Chuẩn hoá thành chuỗi để JSON gọn và trang admin xử lý như cũ.
  var data = values.map(function (row) {
    return row.map(function (c) {
      if (c instanceof Date) return c.toISOString();
      return c === null || c === undefined ? '' : c;
    });
  });
  return json_({ ok: true, role: auth.role, data: data });
}

/** Ghi một bài khảo sát mới; tự tạo cột theo key nếu chưa có. */
function handleSubmit_(body) {
  var name = (body.studentName || '').toString();
  var email = (body.studentEmail || '').toString();
  var survey = {};
  try {
    survey = JSON.parse(body.dataJSON || '{}');
  } catch (err) {
    survey = {};
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // tránh 2 người gửi cùng lúc ghi đè nhau
  try {
    var sheet = getSheet_();

    // Đảm bảo có hàng tiêu đề
    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if (headers.length === 0 || headers.join('') === '') {
      headers = FIXED_COLS.slice();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Bản đồ tiêu đề -> chỉ số cột (1-based)
    var colIndex = {};
    headers.forEach(function (h, i) { colIndex[h] = i + 1; });

    function ensureCol(headerName) {
      if (colIndex[headerName]) return colIndex[headerName];
      var idx = headers.length + 1;
      sheet.getRange(1, idx).setValue(headerName);
      headers.push(headerName);
      colIndex[headerName] = idx;
      return idx;
    }

    // Gom giá trị cho từng cột
    var rowObj = {};
    rowObj['Thời gian'] = new Date();
    rowObj['Họ Tên Con'] = name;
    rowObj['Email Phụ Huynh'] = email;

    Object.keys(survey).forEach(function (key) {
      var entry = survey[key] || {};
      var parts = [].concat(entry.checked || [], entry.text || [])
        .map(function (s) { return (s || '').toString().trim(); })
        .filter(function (s) { return s; });
      rowObj[key] = parts.join(', ');
    });

    // Chốt vị trí cột (tạo mới nếu cần) rồi ghi 1 hàng
    Object.keys(rowObj).forEach(ensureCol);
    var width = headers.length;
    var newRow = new Array(width).fill('');
    Object.keys(rowObj).forEach(function (k) {
      newRow[colIndex[k] - 1] = rowObj[k];
    });
    sheet.appendRow(newRow);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
