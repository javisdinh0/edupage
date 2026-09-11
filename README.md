# edupage

Cổng khảo sát + công cụ thống kê điểm của lớp Đinh Tiêu Thương. Static HTML/JS, không
build step, deploy qua GitHub Pages tới domain `edupage.space` (xem `CNAME`).

Tách ra từ repo `ividlab` (trước đây phục vụ tại `ividlab.com/dinhtieuthuong/`).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Trang cổng (đăng nhập SSO + link tới các công cụ) |
| `admin/` | Bảng điều khiển admin khảo sát |
| `congcuthongkediem/` | Công cụ thống kê điểm |
| `khaosatchiase10t0/` | Trang khảo sát chia sẻ 10T0 |
| `backend/` | `Code.gs` — dán tay vào Google Apps Script editor (không chạy trong repo) |
| `docs/` | Hướng dẫn deploy backend + thiết lập tài khoản dùng chung (SSO) |

Vì repo này **public**, không hardcode ID bảng tính / mật khẩu trong `backend/**/Code.gs`
— đọc qua Apps Script Script properties. Xem [`docs/USER_ADMIN_SETUP.md`](docs/USER_ADMIN_SETUP.md).

## Deploy

Không có build step — push lên `main` là đủ, GitHub Pages serve trực tiếp
(bật ở Settings → Pages, custom domain `edupage.space`).
