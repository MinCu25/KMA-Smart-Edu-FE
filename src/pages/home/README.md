# Trang chủ công khai KMA

Tích hợp từ `KMA_trang_chu_final.zip` tại thư mục gốc workspace.
Trang hiển thị khi chưa đăng nhập; sau đăng nhập, `App` mở màn hình theo role
và vẫn ưu tiên đổi mật khẩu nếu backend yêu cầu.

- `HomePage.tsx`: ghép trang vào React và form đăng nhập thật qua `useAuth`.
  Form không chọn vai trò; quyền và trang đích luôn lấy từ phản hồi API đăng nhập.
- `home.html`: markup tĩnh tin cậy của ZIP, không nhúng dữ liệu API hoặc input.
- `homeBehavior.js`: giữ tìm kiếm không dấu, bộ lọc, phân trang, dialog và carousel
  của bản mẫu; selector giới hạn trong root trang chủ. Hàm khởi tạo trả cleanup
  để hủy listener, observer, timeout và animation frame khi đăng nhập/rời trang.
- `home.css`: CSS của ZIP được giới hạn trong `.kma-home`.
- `integration.css`: xử lý khác biệt với CSS của ứng dụng và form bốn vai trò.
- `fonts.css`, `fonts/`: font cục bộ Be Vietnam Pro và Noto Serif kèm giấy phép OFL.
- `public/home/assets/`: tài nguyên ảnh gốc; URL hỗ trợ Vite BASE_URL.

Thông báo, nội dung chi tiết, kế hoạch và thủ tục là nội dung đi kèm bản mẫu,
chưa có API quản lý công khai trong backend. Trang vẫn gắn nhãn dữ liệu minh họa.
Quên mật khẩu hướng dẫn liên hệ quản trị viên; không giả lập việc gửi yêu cầu.
Không cần thay đổi `application.yaml` để hiển thị trang chủ.
