# Hướng dẫn triển khai bảo mật — Khảo sát 10T0

Tài liệu này giải thích cách bật **xác thực phía server** cho hệ thống, thay cho cơ chế cũ
(che giấu URL trong trình duyệt — không an toàn).

## Vì sao phải làm

- **Trước đây:** URL Google Sheet nằm công khai trong trang khảo sát, và endpoint trả
  **toàn bộ dữ liệu (tên, email, SĐT, địa chỉ) khi GET mà không cần mật khẩu**. Ai biết URL
  cũng lấy được. Lớp "mã hoá" trong admin chỉ là che mắt.
- **Sau khi làm theo hướng dẫn này:** muốn lấy dữ liệu phải gửi **mật khẩu đúng**; server
  kiểm tra rồi mới trả. Sai mật khẩu → không trả gì.

---

## Các bước (làm 1 lần, ~10 phút)

### 1. Mở Apps Script của Google Sheet
- Mở Google Sheet đang chứa dữ liệu khảo sát.
- Menu **Extensions → Apps Script**.

### 2. Dán code server
- Xoá code cũ trong file `Code.gs`, dán toàn bộ nội dung file [`Code.gs`](../../backend/admin/Code.gs) vào.
- Bấm **Save** (biểu tượng đĩa).

### 3. Đặt mật khẩu (Script properties)
- Trong Apps Script: **Project Settings** (bánh răng bên trái) → kéo xuống **Script properties**
  → **Add script property**.
- Thêm các mục sau:

  | Property | Value | Bắt buộc |
  |---|---|---|
  | `ADMIN_PASSWORD` | mật khẩu admin bạn muốn | ✅ Có (nếu không dùng `USERS_SHEET_ID`) |
  | `ADMIN_EMAIL` | email admin (nếu muốn bắt buộc đúng cả email) | Tuỳ chọn |
  | `SHEET_NAME` | tên sheet chứa dữ liệu (bỏ trống = sheet đầu tiên) | Tuỳ chọn |
  | `USERS_SHEET_ID` | ID bảng "User Admin" dùng chung (SSO) — xem [USER_ADMIN_SETUP.md](../USER_ADMIN_SETUP.md) | Khuyến nghị |

- Bấm **Save script properties**.

> Mật khẩu gốc chỉ nằm ở đây (chỉ chủ sở hữu thấy). Khi đăng nhập, trình duyệt gửi
> **SHA-256 của mật khẩu** chứ không gửi mật khẩu thô.

### 4. Deploy thành Web app
- Bấm **Deploy → New deployment**.
- Chọn loại **Web app**.
- Thiết lập:
  - **Execute as:** `Me`
  - **Who has access:** `Anyone`
- Bấm **Deploy**, cấp quyền nếu được hỏi.
- Copy **Web app URL** (dạng `https://script.google.com/macros/s/AKfy.../exec`).

> **Giữ nguyên URL cũ:** nếu bạn muốn không phải sửa lại các file HTML, hãy dùng
> **Manage deployments → (deployment hiện tại) → Edit → Version: New version → Deploy**.
> Cách này giữ nguyên URL `/exec` đang có.

### 5. Cập nhật URL vào các trang (nếu URL thay đổi)
Nếu URL `/exec` khác với URL đang dùng, sửa hằng số `SCRIPT_URL` trong **3 file**:
- `index.html` (trang cổng)
- `admin/index.html`
- `khaosatchiase10t0/index.html` (trang khảo sát)

Tìm dòng `const SCRIPT_URL = '...'` (trang khảo sát là `const SCRIPT_URL =` trong `<script>`)
và thay bằng URL mới.

---

## Kiểm tra sau khi triển khai

1. Vào `https://edupage.space/` → nhập email + mật khẩu → phải hiện các nút.
2. Bấm **Bảng điều khiển Admin** → vào thẳng, **không hỏi mật khẩu lại**.
3. Mở trực tiếp `https://edupage.space/admin/` (tab mới) → **phải hỏi mật khẩu**.
4. Nhập sai mật khẩu → báo lỗi, không hiện dữ liệu.
5. Gửi thử 1 phiếu khảo sát ở trang phụ huynh → kiểm tra dòng mới xuất hiện trong Sheet.

---

## Lưu ý bảo mật còn lại

- Đây là bảo mật mức "mật khẩu chung cho admin" — đủ cho nhu cầu nội bộ lớp. Không phải hệ thống
  tài khoản nhiều người dùng.
- Phiên đăng nhập từ trang cổng được giữ trong `sessionStorage` (mất khi đóng tab). Bearer là
  SHA-256 của mật khẩu; chỉ tồn tại trong tab đang mở.
- Toàn bộ truyền qua HTTPS nên mật khẩu/hash được mã hoá trên đường truyền.
- Nếu lộ mật khẩu, chỉ cần đổi `ADMIN_PASSWORD` trong Script properties là vô hiệu hoá phiên cũ.
