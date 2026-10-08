# Deploy form đăng ký đồng phục mùa đông (`dongphucmuadong10t02026/`)

1. Tạo **Google Sheet mới** (đặt tên tuỳ ý) → **Extensions → Apps Script**.
2. Xoá code mặc định, dán toàn bộ [`backend/dongphucmuadong10t02026/Code.gs`](../../backend/dongphucmuadong10t02026/Code.gs).
3. (Tuỳ chọn) **Project Settings → Script properties** → `SHEET_NAME` = tên tab ghi dữ liệu (mặc định `DangKy`, tự tạo kèm dòng tiêu đề).
4. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone*. Cấp quyền khi được hỏi.
5. Copy URL `/exec`, dán vào `GAS_WEB_APP_URL` ở đầu [`dongphucmuadong10t02026/script.js`](../../dongphucmuadong10t02026/script.js), commit & push.

Không hardcode ID Sheet: script gắn trực tiếp vào Sheet (`getActiveSpreadsheet`), nên repo public vẫn an toàn.

## Hành vi
- Đăng ký lại cùng **email + họ tên** → ghi đè dòng cũ (bản mới nhất).
- Áo vest chỉ có cột số lượng (nhà may đo trực tiếp), các món khác có thêm cột size.
- Áo len / gile len: PHHS đăng ký nhỏ hơn 1 size (ghi chú trên form).

## Lưu ảnh biên nhận vào Google Drive
Mỗi lượt đăng ký, script lưu **ảnh biên nhận (PNG)** vào một thư mục Drive; **tên file = tên học sinh** (ví dụ `Nguyễn Minh Anh.png`).

- Thư mục: Script property `DRIVE_FOLDER_ID`. Bỏ trống → script tự tạo thư mục "Biên nhận đồng phục 10T0" ở Drive gốc và ghi lại ID.
  Muốn dùng thư mục có sẵn: lấy ID trong URL thư mục (`drive.google.com/drive/folders/<ID>`) và đặt vào property này.
- Đăng ký lại (cùng email + họ tên) → thay file cũ bằng bản mới. Học sinh khác trùng tên → `Tên (2).png`, `Tên (3).png`…
- Lỗi lưu ảnh không làm mất dòng trong Sheet (phản hồi có `saved: false` và `saveError`).

### Cấp quyền (làm 1 lần)
1. **Cài đặt dự án** → bật "Hiển thị tệp kê khai appsscript.json" → mở `appsscript.json`, đặt:
   ```json
   "oauthScopes": [
     "https://www.googleapis.com/auth/spreadsheets",
     "https://www.googleapis.com/auth/drive"
   ]
   ```
2. Chọn hàm `testDrive` → **Chạy** → cấp quyền khi Google hỏi (Xem lại quyền → Nâng cao → Đi tới … → Cho phép). Nhật ký phải hiện `Đã lưu ảnh OK`.
3. **Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản mới → Triển khai.**
