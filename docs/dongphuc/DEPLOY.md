# Deploy form đăng ký đồng phục mùa đông (`dongphuc/`)

1. Tạo **Google Sheet mới** (đặt tên tuỳ ý) → **Extensions → Apps Script**.
2. Xoá code mặc định, dán toàn bộ [`backend/dongphuc/Code.gs`](../../backend/dongphuc/Code.gs).
3. (Tuỳ chọn) **Project Settings → Script properties** → `SHEET_NAME` = tên tab ghi dữ liệu (mặc định `DangKy`, tự tạo kèm dòng tiêu đề).
4. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone*. Cấp quyền khi được hỏi.
5. Copy URL `/exec`, dán vào `GAS_WEB_APP_URL` ở đầu [`dongphuc/script.js`](../../dongphuc/script.js), commit & push.

Không hardcode ID Sheet: script gắn trực tiếp vào Sheet (`getActiveSpreadsheet`), nên repo public vẫn an toàn.

## Hành vi
- Đăng ký lại cùng **email + họ tên** → ghi đè dòng cũ (bản mới nhất).
- Áo vest chỉ có cột số lượng (nhà may đo trực tiếp), các món khác có thêm cột size.
- Áo len / gile len: PHHS đăng ký nhỏ hơn 1 size (ghi chú trên form).
