# KMA Smart Edu — React + TypeScript

Bản xuất mã nguồn ngày 03/11/2026, từ commit FE: 8392934292988df2ea418fe34ba8f426d854849a.
Đã gồm bản sửa mới nhất: trang đăng nhập bỏ gợi ý tài khoản/mật khẩu và để trống hai ô nhập (kể cả khi đổi vai trò).

## Chạy trên máy

Cài Node.js 22 LTS. Giải nén, mở terminal tại thư mục `kma-smart-edu` chứa package.json:

```bash
npm ci
npm run dev
```

Mở URL Vite in trong terminal. Không mở trực tiếp index.html bằng Live Server.

## Kiểm tra và build

```bash
npm test
npm run typecheck
npm run build
```

Build tạo thư mục dist. ZIP không chứa node_modules, dist, Git history, dữ liệu trình duyệt hoặc cấu hình triển khai riêng của bản web đám mây.

## Tài khoản khởi tạo để kiểm thử local

| Vai trò | Tài khoản | Mật khẩu ban đầu |
| --- | --- | --- |
| Sinh viên | CT080101 | demo123 |
| Giảng viên | GV001 | demo123 |
| Admin học vụ | hocvu | demo123 |
| Admin hệ thống | admin | demo123 |

Đây là dữ liệu phát triển cục bộ, không phải tài khoản backend thật. Mật khẩu đã đổi và dữ liệu nhập trên bản web đám mây không được chép vào ZIP. Trình duyệt ở địa chỉ mới khởi tạo bộ dữ liệu riêng; tài khoản tạo mới trong luồng nhập học có yêu cầu đổi mật khẩu lần đầu.

## Cấu trúc

- src/pages: giao diện theo từng vai trò.
- src/context, src/hooks: trạng thái và luồng xử lý.
- src/types/dto.ts: request/response và enum.
- src/services/api/eduApi.ts: bộ gọi API theo các controller đã xác nhận.
- src/services/mock, src/data/mock: dữ liệu và dịch vụ cục bộ.
- src/styles: giao diện, font Nunito Sans.
- tests: kiểm thử nghiệp vụ, DTO và các payload API.
- docs/API-READINESS.md: tài liệu bàn giao hiện hành, các giới hạn và việc còn cần BE.
- docs/develop-contract.json: snapshot develop BE 8253c0e2965b53bab1a3ab47e068a472a2e99255.

## Tình trạng tích hợp API

Bản web vẫn dùng dữ liệu cục bộ. Client HTTP đã chuẩn bị cho 7 controller; chưa thay toàn bộ context/caller sang API thật. Chỉ thêm VITE_API_BASE_URL không tự chuyển toàn bộ ứng dụng sang API.

Đọc docs/API-READINESS.md trước khi kết nối. Cần URL BE, xác thực, lookup/mapping ID, các endpoint còn thiếu và kiểm thử đầu–cuối với dữ liệu thật. Không gửi ID fixtures lên database thật.

Tên kỳ hiển thị HK_1 - 2026-2027 được chuyển sang tên BE khi gửi qua client. Mã KY tăng dần hiện chỉ là quy ước local; mã kỳ thật do backend cấp.

Form hiển thị lỗi dưới từng trường; lỗi tác vụ ngoài form hiện thông báo. Thành công tự tắt sau 2,5 giây. Đặt lại mật khẩu/email và AI chưa được coi là dịch vụ thật khi chưa kết nối backend.

## Bản sửa sidebar màn hình nhỏ
Sidebar của Giảng viên, Admin hệ thống và Admin học vụ hiển thị đủ danh mục, cố định theo chiều dọc, cuộn được; hỗ trợ đóng bằng Escape.
