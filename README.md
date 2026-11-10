# KMA Smart Edu — React + TypeScript

Frontend cho Sinh viên, Giảng viên, Admin học vụ và Admin hệ thống. Hợp đồng REST hiện hành lấy từ bộ tài liệu BE ngày **10/11/2026** trong `docs/`, gồm **53 cặp HTTP method/URL**. Tài liệu cũ ngày 02–05/11 chỉ dùng tham khảo lịch sử.

## Chạy dự án

Cần Node.js 20.19+ hoặc 22.12+ và npm. Trong thư mục có `package.json`:

```cmd
npm install
if not exist .env.local copy .env.example .env.local
notepad .env.local
npm run dev
```

Mở địa chỉ Vite in ra, thông thường http://localhost:5173.

### Chế độ API

```dotenv
VITE_AUTH_MODE=api
VITE_API_BASE_URL=http://localhost:8080
```

Thay URL bằng backend thực sự truy cập được từ máy bạn. `localhost` là máy đang chạy trình duyệt, không phải máy của thành viên BE. Không thêm `/api/v1` vào URL vì client đã có prefix. BE cần cho phép CORS từ địa chỉ frontend. Khởi động lại Vite sau khi đổi cấu hình; bản build cần build lại.

Tài khoản và ID ngành/khóa/khoa do BE cung cấp. Không dùng ID hay tài khoản demo trên database thật. Tài khoản seed chưa có hồ sơ sinh viên có thể đăng nhập nhưng `/students/me` trả 404.

### Chế độ demo

```dotenv
VITE_AUTH_MODE=demo
VITE_API_BASE_URL=http://localhost:8080
```

Demo dùng dữ liệu/lưu trữ riêng trên trình duyệt. Thao tác demo không thay đổi dữ liệu BE và không gửi email. Hai chế độ dùng chung luồng giao diện nhập học; demo chỉ mô phỏng các scope được khai báo. Dữ liệu cũ trong trình duyệt không được dùng làm dữ liệu API.

## Tài liệu đang áp dụng

- `docs/API_SPECIFICATION.md`: API thực tế, validation, lỗi và giới hạn BE.
- `docs/fe-api-contract.ts`: kiểu request/response và URL chính thức.
- `docs/ADMISSION_WORKFLOW.md`: lập phương án, chuẩn bị lớp, import, phân bổ và xác nhận.
- `docs/NOTIFICATION_README.md`: email, hàng đợi và retry do BE thực hiện.
- `docs/ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `MODULE_CONTRACT.md`: kiến trúc và hợp đồng nội bộ BE; facade không đồng nghĩa có REST API.
- `docs/FRONTEND-INTEGRATION-STATUS.md`: phần frontend đã kết nối và giới hạn kiểm chứng.

## Quy tắc tích hợp

- Đăng nhập chỉ nhập username/password, giao diện theo role BE trả về. Token chỉ lưu trong bộ nhớ; tải lại trang yêu cầu đăng nhập lại.
- First-login buộc đổi mật khẩu; đổi thành công xóa phiên và đăng nhập lại. Chưa có REST refresh token.
- Reset mật khẩu gọi API không body; BE sinh và gửi mật khẩu tạm. FE không nhập, đọc hoặc hiển thị mật khẩu cấp lại.
- Form hiển thị lỗi tại trường; không tự xác nhận cảnh báo nghiệp vụ hay tự lặp request ghi.
- Nhập học dùng planId/revision mới nhất. Mẫu XLSX được tải theo ngành/khóa từ API, không dùng mẫu batch cũ.
- Kết quả tạo hồ sơ và kết quả gửi email là hai việc riêng. Không POST tạo lại người chỉ vì email FAILED/SKIPPED. Không còn resend API cho tạo SV/GV đơn lẻ.
- Trong API mode, chức năng BE chưa cung cấp được hiển thị chờ API, không thay bằng thành công giả hoặc dữ liệu demo.

## Kiểm tra và đóng gói

```cmd
npm test
npm run build
```

Tests kiểm tra logic FE và phản hồi mô phỏng. Snapshot DTO Java cũ được ghi rõ là baseline lịch sử của demo; đối chiếu API hiện hành dùng bộ tài liệu 10/11. Build/test đạt không chứng minh SMTP, migration, phân quyền hay transaction của server đã hoạt động thực tế.

Không đưa `.env.local`, `.env`, `node_modules/` hoặc `dist/` lên GitHub. Giữ `.env.example` không chứa bí mật. Biến `VITE_*` được nhúng vào mã trình duyệt, không đặt mật khẩu DB/SMTP/JWT secret tại đây.
