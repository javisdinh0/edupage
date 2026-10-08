# Hướng dẫn: form đăng ký đồng phục mùa đông (nhiều lớp)

Tài liệu từ A–Z cho người quản trị (`dinhtieuthuong.edu@gmail.com`). Chi tiết kỹ thuật xem thêm [`NHAN_BAN_LOP.md`](NHAN_BAN_LOP.md).

## 1. Tổng quan

| | |
|---|---|
| Phụ huynh | Mở link form của lớp → điền thông tin, chọn size → **Gửi đăng ký** → **lưu ảnh biên nhận** về điện thoại |
| Học sinh | Giữ ảnh biên nhận (hoặc bản giấy) để nhận đồ |
| Dữ liệu | Ghi vào **Google Sheet** của lớp (tab `DangKy`) — đăng ký lại cùng email + họ tên thì ghi đè |
| Ảnh biên nhận | Lưu vào **thư mục Google Drive** của lớp, tên file = tên học sinh |
| Link form | 10T0: `https://edupage.space/dongphucmuadong10t02026/` · Lớp khác: `https://edupage.space/dongphucmuadong2026/<lớp>/` (vd `.../10a1/`) |

Mỗi lớp có **Sheet + Apps Script + thư mục Drive riêng** (không lẫn dữ liệu giữa các lớp).

## 2. Việc cài đặt làm một lần (máy quản trị)

1. Cài Node.js ≥ 22 và clasp: `npm i -g @google/clasp`
2. Bật **Apps Script API**: <https://script.google.com/home/usersettings> → bật.
3. Đăng nhập clasp: `clasp login` → trình duyệt mở → đăng nhập `dinhtieuthuong.edu@gmail.com` → **Cho phép**.
   Token nằm ở `~/.clasprc.json` (ngoài repo, không bao giờ commit).

## 3. Tạo form cho lớp mới

```bash
node tools/new-class.mjs 10A1
```

Lệnh tự làm: sinh web + backend → tạo Google Sheet + Apps Script → đẩy code → deploy → gắn URL `/exec` vào form → ghi `classes.json`.
Tuỳ chọn: `--nam-hoc 2027-2028` · `--no-google` (chỉ sinh file) · `--gas-url <URL>` (dùng backend có sẵn).

### Bước bắt buộc làm tay (Google không cho tự động) — mỗi lớp 1 lần
1. Mở <https://script.google.com> → chọn dự án **"Đồng phục đông 10A1 2026-2027"**.
2. Ở thanh trên chọn hàm **`capQuyen`** → **Chạy**.
3. Hộp **Yêu cầu ủy quyền** → **Xem lại quyền** → chọn tài khoản → **Nâng cao** → **Đi tới … (không an toàn)** → **Cho phép**.
   (Cảnh báo "không an toàn" là bình thường: đây là script của chính bạn.)
4. Nhật ký thực thi phải hiện **`Đã cấp quyền OK`**.

### Đưa lên mạng
1. `git add -A && git commit -m "feat: form đồng phục lớp 10A1"` → push → tạo PR → **merge**.
2. Đợi 1–2 phút → mở `https://edupage.space/dongphucmuadong2026/10a1/` kiểm tra.

## 4. Kiểm tra trước khi gửi link cho phụ huynh

1. Mở form, **đăng ký thử** một học sinh giả (dùng nút "Áp dụng" size gợi ý, chọn vài món).
2. Kiểm tra:
   - Màn hình "Đăng ký thành công" có ảnh biên nhận và nút **Lưu ảnh biên nhận về điện thoại**.
   - **Sheet** `DangKy`: có đúng 1 dòng, số lượng và size khớp.
   - **Drive**: thư mục "Biên nhận đồng phục 10A1" có file `<tên học sinh>.png`.
   - Áo len & gile len nhỏ hơn gile vải & bộ nỉ đúng **1 size** khi dùng size gợi ý.
3. **Xoá dữ liệu thử**: dòng trong Sheet và file ảnh trong Drive.
4. Gửi link cho phụ huynh. Nên **mở các lớp lệch giờ nhau** (xem mục 7).

## 5. Sửa nội dung form và cập nhật mọi lớp

Sửa **một chỗ**, áp dụng cho mọi lớp:
- Giao diện / logic / ảnh mẫu / bảng size: `dongphucmuadong2026/_chung/` (`script.js`, `style.css`, `anh/`)
- Khung trang & chữ cố định: `templates/dongphuc/index.html`
- Backend: `templates/dongphuc/Code.gs`

Rồi chạy:
```bash
node tools/sync-classes.mjs             # sinh lại file trong repo
node tools/sync-classes.mjs --google    # + đẩy code lên Apps Script, GIỮ NGUYÊN URL
node tools/sync-classes.mjs --only 10A1,10T0
```
Commit → PR → merge. **Không sửa tay** `index.html`/`Code.gs` trong thư mục từng lớp (sẽ bị ghi đè).

Nếu đổi `Code.gs` mà không dùng `--google`: dán thủ công vào Apps Script → **Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản: Phiên bản mới → Triển khai**.

## 6. Lớp 10T0 (tạo tay, URL cũ giữ nguyên)

- Web: `dongphucmuadong10t02026/` · Backend: `backend/dongphucmuadong10t02026/Code.gs`.
- Để dùng `sync-classes.mjs --google` cho 10T0: điền `scriptId` (Apps Script → Cài đặt dự án → *ID tập lệnh*) vào `classes.json`.
- Khi cập nhật backend 10T0 bằng tay: dán `Code.gs` mới, kiểm tra `appsscript.json` có `oauthScopes` gồm `spreadsheets` và `drive`, chạy `capQuyen` (nếu Google hỏi quyền), rồi triển khai **Phiên bản mới**.

## 7. Giới hạn cần nhớ (tài khoản gmail.com)

| Giới hạn | Ý nghĩa |
|---|---|
| 30 lượt chạy đồng thời / tài khoản | Chung cho mọi lớp. Nhiều lớp nộp cùng giờ cao điểm có thể bị từ chối → form tự thử lại 3 lần, vẫn lỗi thì báo và giữ nguyên dữ liệu. **Mở form các lớp lệch giờ.** |
| Drive 15 GB (chung Gmail/Ảnh/Drive) | Ảnh ~230 KB; 1 lớp ≈ 10 MB. Kiểm tra dung lượng trống tại <https://drive.google.com/settings/storage>. |
| 50 Apps Script project / ngày | Tạo vài lớp mỗi lần là đủ. |
| 6 phút / lần chạy | Thực tế 3–6 giây. |

Backend tự từ chối: sai lớp, email/size/số lượng không hợp lệ, ảnh > ~1 MB, bot (ô ẩn), gửi quá 5 lần/phút cho một email.

## 8. Xử lý sự cố

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Phản hồi không có `saved`/`saveError` (bản cũ) | URL `/exec` vẫn chạy phiên bản cũ → **Triển khai → Quản lý → ✏️ → Phiên bản mới → Triển khai** (chọn *Phiên bản mới*, không để số cũ). |
| `saveError`: không có quyền `DriveApp`… | Chưa cấp quyền → chạy `capQuyen` và **Cho phép**; kiểm tra `appsscript.json` có `…/auth/drive`. Xong triển khai lại phiên bản mới. |
| Hộp xin quyền không hiện / "Đã xảy ra lỗi không xác định" | Cho phép popup cho `script.google.com`; thử cửa sổ ẩn danh, **chỉ đăng nhập một tài khoản Google**; tải lại trang rồi chạy lại. |
| Form báo "Chưa gửi được đăng ký: Không kết nối được máy chủ" | Mạng phụ huynh yếu hoặc URL `/exec` sai/chưa deploy. Dữ liệu còn trên form → bấm **Gửi đăng ký** lại. Kiểm tra `gasUrl` trong `classes.json` và deployment còn hoạt động. |
| "Bạn gửi quá nhanh, vui lòng đợi 1 phút" | Gửi >5 lần/phút cùng email. Đợi rồi gửi lại. |
| "Form này chỉ nhận đăng ký của lớp …" | Trang và backend không cùng lớp (sai `gasUrl` giữa các lớp). Chạy lại `sync-classes` và kiểm tra `classes.json`. |
| Phụ huynh thấy giao diện cũ sau khi cập nhật | Cache trình duyệt; `sync-classes` đã đổi `?v=` mã băm — kiểm tra đã commit/merge file `index.html` mới và đợi 1–2 phút. |
| `clasp: command not found` | Cài `npm i -g @google/clasp` (Node ≥ 22). |
| `clasp` báo chưa bật API | Bật Apps Script API tại <https://script.google.com/home/usersettings>. |
| Lỗi `Cannot find module`… khi chạy `tools/*.mjs` | Chạy lệnh ở **thư mục gốc repo**. |

## 9. Kiểm thử không cần đăng nhập
```bash
node tools/test-backend.mjs   # logic backend trên dịch vụ Google giả lập (10 bài)
```

## 10. Bảo mật
- Repo **public**: không đưa mật khẩu/token vào repo. `.clasp.json`, `.clasprc.json` đã nằm trong `.gitignore`.
- URL `/exec` hiển thị công khai (bắt buộc để form hoạt động) — chống lạm dụng bằng kiểm tra phía máy chủ ở mục 7.
- Quyền `drive` của script cho phép đọc/ghi toàn bộ Drive của tài khoản chạy script; chỉ cấp cho tài khoản quản trị này.
