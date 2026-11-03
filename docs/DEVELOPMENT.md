# Hướng dẫn phát triển

Đọc README.md và DTO-INTEGRATION.md trước khi tích hợp backend.
Giữ request/response trong src/types/dto.ts; adapter UI nằm ở src/services/adapters.ts.
Không sử dụng enum nhãn tiếng Việt làm giá trị API. Không sử dụng mã lớp/MSSV thay ID số.
Chạy npm run typecheck, node tests/run.mjs và npm run build trước khi giao mã.

## Thông báo thao tác

Dùng useUI().notify(message) cho thành công (2,5 giây), notifyError(message) cho lỗi (giữ đến khi đóng hoặc thao tác tiếp theo). Các tiện ích ngoài React dùng announce trong utils/notifications.ts. Lỗi form giữ nội dung tại form; điều kiện đăng ký hiển thị chi tiết theo dữ liệu thực tại dòng lớp. Không phát thông báo thành công trước khi thao tác hoàn tất. Thao tác xuất tệp chỉ xác nhận đã tạo tệp/bắt đầu tải, không khẳng định đã lưu thành công trên máy người dùng.
