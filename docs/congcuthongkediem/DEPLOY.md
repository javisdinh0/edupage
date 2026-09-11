# Triển khai backend cho Công cụ thống kê điểm

Trang `congcuthongkediem/` dùng **một deployment Google Apps Script RIÊNG**
(tách biệt với phần khảo sát 10T0). Làm theo các bước sau **một lần duy nhất**.

## 1. Tạo Google Sheet mới
1. Vào <https://sheets.new> để tạo một bảng tính trống.
2. Đặt tên gợi nhớ, ví dụ: **ViDiLab — Thống kê điểm**.
3. Không cần tạo cột gì cả — script sẽ tự tạo sheet `DiemThi` và hàng tiêu đề.

## 2. Dán code backend
1. Trong bảng tính vừa tạo: **Extensions → Apps Script**.
2. Xóa hết code mẫu, dán **toàn bộ nội dung** file [`Code.gs`](../../backend/congcuthongkediem/Code.gs).
3. Nhấn **Save** (biểu tượng đĩa).

## 3. Đặt mật khẩu (Script properties)
1. Trong Apps Script: **Project Settings** (bánh răng bên trái).
2. Kéo xuống **Script properties → Add script property**, thêm:

| Property | Value | Bắt buộc |
|---|---|---|
| `ADMIN_PASSWORD` | mật khẩu bạn muốn cho công cụ điểm | ✅ (nếu không dùng `USERS_SHEET_ID`) |
| `ADMIN_EMAIL` | email bắt buộc khi đăng nhập (bỏ trống = không kiểm tra email) | ⬜ |
| `SHEET_NAME` | tên sheet dữ liệu (mặc định `DiemThi`) | ⬜ |
| `USERS_SHEET_ID` | ID bảng "User Admin" dùng chung (SSO) — xem [USER_ADMIN_SETUP.md](../USER_ADMIN_SETUP.md) | Khuyến nghị |

3. **Save script properties**.

> Mật khẩu này **độc lập** với mật khẩu trang khảo sát. Có thể đặt trùng hoặc khác tuỳ ý.

## 4. Deploy Web app
1. Góc trên phải: **Deploy → New deployment**.
2. Bánh răng **Select type → Web app**.
3. Cấu hình:
   - **Description**: `congcuthongkediem v1`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
4. **Deploy** → cấp quyền (Authorize access) cho tài khoản Google của bạn.
5. Copy **Web app URL** dạng `https://script.google.com/macros/s/AKfy.../exec`.

## 5. Gắn URL vào trang
1. Mở [`index.html`](./index.html).
2. Tìm dòng:
   ```js
   const SCRIPT_URL = 'PASTE_YOUR_EXEC_URL_HERE';
   ```
3. Thay bằng URL `/exec` vừa copy. Lưu lại và deploy web.

## 6. Kiểm tra nhanh
- Mở URL `/exec` trên trình duyệt → phải thấy JSON `{"ok":true,"service":"ividlab-congcuthongkediem"...}`.
- Vào trang `congcuthongkediem`, đăng nhập bằng `ADMIN_PASSWORD` → tải file Excel mẫu → lưu → dữ liệu xuất hiện trong sheet `DiemThi`.

## Cập nhật code sau này
Mỗi khi sửa `Code.gs`: dán lại vào Apps Script rồi **Deploy → Manage deployments →
(chọn deployment) → Edit → Version: New version → Deploy**. URL `/exec` **không đổi**.

## Cấu trúc dữ liệu (sheet `DiemThi`)
Mỗi dòng = 1 học sinh / 1 tháng / 1 lớp / 1 môn. Khóa upsert: `Tháng | Lớp | Môn | Mã HS`.

| Tháng | Lớp | Môn | TT | Mã HS | Họ tên | Ngày sinh | Ghi chú | TB | Lần 1 | Thi lại | Cập nhật lúc |
|---|---|---|---|---|---|---|---|---|---|---|---|

Bạn có thể mở sheet này để lọc/xem trực tiếp theo từng tháng, từng lớp bằng
tính năng Filter của Google Sheets.
