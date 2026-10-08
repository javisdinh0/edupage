# Nhân bản form đồng phục ra nhiều lớp

Mỗi lớp có **form riêng + Google Sheet riêng + Apps Script riêng + thư mục Drive riêng**, sinh từ một template:

| Thành phần | Vị trí |
|---|---|
| Template web / backend | `templates/dongphuc/` (`index.html`, `Code.gs`, `appsscript.json`) |
| Tài nguyên dùng chung (CSS, JS, ảnh) | `dongphucmuadong2026/_chung/` |
| Form từng lớp | `dongphucmuadong2026/<lớp>/` → `https://edupage.space/dongphucmuadong2026/<lớp>/` |
| Backend từng lớp | `backend/dongphucmuadong2026/<lớp>/` |
| Sổ đăng ký các lớp | `classes.json` |
| Lớp 10T0 (giữ nguyên URL cũ) | `dongphucmuadong10t02026/` |

> Không sửa tay `index.html` / `Code.gs` trong thư mục từng lớp — chúng bị ghi đè khi sync. Sửa `templates/dongphuc/` hoặc `dongphucmuadong2026/_chung/` rồi chạy `sync-classes`.

## Cài đặt (làm 1 lần)
1. `npm i -g @google/clasp` (cần Node ≥ 22).
2. Bật **Apps Script API**: <https://script.google.com/home/usersettings>.
3. `clasp login` → trình duyệt mở ra → tự đăng nhập `dinhtieuthuong.edu@gmail.com` → Cho phép.
   (Token lưu ở `~/.clasprc.json`, **không** nằm trong repo.)

## Tạo lớp mới
```bash
node tools/new-class.mjs 10A1
```
Lệnh tự: sinh form + backend → `clasp create-script` (Sheet + Apps Script) → `clasp push` → `clasp create-deployment` → ghép URL `/exec` vào form → ghi `classes.json`.

Rồi **làm tay 1 lần/lớp** (Google bắt buộc, không tự động được):
1. Mở Apps Script của lớp ("Đồng phục đông 10A1 2026-2027") → chọn hàm `capQuyen` → **Chạy** → **Cho phép** (Xem lại quyền → Nâng cao → Đi tới … → Cho phép). Nhật ký phải hiện `Đã cấp quyền OK`.
2. Commit, push, merge PR → link chạy sau 1–2 phút.

Tuỳ chọn: `--nam-hoc 2027-2028` (thư mục `dongphucmuadong2027/…`), `--no-google` (chỉ sinh file), `--gas-url <URL /exec>` (dùng backend đã có sẵn).

## Cập nhật hàng loạt khi sửa template
```bash
node tools/sync-classes.mjs            # sinh lại file trong repo
node tools/sync-classes.mjs --google   # + đẩy code & cập nhật deployment, GIỮ NGUYÊN URL
node tools/sync-classes.mjs --only 10A1,10T0
```
`--google` cần `scriptId` + `deploymentId` trong `classes.json` (lớp tạo bằng `new-class` có đủ). Với **10T0** (tạo tay), điền `scriptId` (Apps Script → Cài đặt dự án → ID tập lệnh) rồi mới đẩy được; nếu chưa, dán lại `backend/dongphucmuadong10t02026/Code.gs` vào editor và triển khai **Phiên bản mới**.

## Kiểm thử
`node tools/test-backend.mjs` — chạy logic backend (kiểm tra dữ liệu, giới hạn tần suất, ghi đè, trùng tên, lưu ảnh) trên dịch vụ Google giả lập, không cần đăng nhập.

## Giới hạn cần biết (tài khoản gmail.com)
Nguồn: [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).
- **30 lượt chạy đồng thời / tài khoản** (chung mọi script): nhiều lớp mở form cùng giờ cao điểm có thể bị từ chối. Form tự thử lại 3 lần và báo lỗi nếu vẫn không được (dữ liệu giữ nguyên trên form). Nên **mở form các lớp lệch giờ**.
- Tạo Apps Script: tối đa 50 project/ngày.
- Drive: 15 GB **dùng chung Gmail/Ảnh/Drive**; mỗi ảnh biên nhận ~230 KB → 1 lớp ≈ 10 MB. Kiểm tra dung lượng trống trước khi mở nhiều lớp.
- Mỗi lượt chạy tối đa 6 phút (thực tế ~3–6 giây).

## Chống lạm dụng (URL `/exec` nằm trong repo public)
Backend từ chối: sai lớp, size/số lượng/email không hợp lệ, ảnh > ~1 MB, trường hợp bot (ô ẩn `website`), và gửi quá 5 lần/phút cho một email.
