# Rà soát trước buổi demo — 13/11/2026

## Kết luận và phạm vi

Đây là kiểm tra frontend với dữ liệu demo và phản hồi API giả lập, không phải nghiệm thu toàn hệ thống BE. Không có URL BE đang chạy hoặc tài khoản BE để kiểm tra database, JWT thật, email, Gemini và pgvector.

## Lỗi xác nhận và đã sửa

- Bộ dữ liệu khởi tạo thiếu 5 tài khoản sinh viên: đã bổ sung theo hồ sơ có sẵn; tổng mặc định 11 tài khoản.
- Trạng thái vô hiệu hóa và khóa bị dùng lẫn trong thao tác học vụ: đã tách DISABLED/LOCKED, tái kích hoạt mở lại đăng nhập theo UC-10 (xem đính chính bên dưới).
- Ẩn thao tác khóa/reset không hợp lệ cho DISABLED, giải thích trong chi tiết.
- Nhãn trạng thái sinh viên thống nhất “Vô hiệu hóa”; xác nhận tái kích hoạt nói rõ mở lại quyền đăng nhập.
- Kỳ mẫu bắt đầu 02/11 trước khi kết thúc đăng ký 15/11: sửa ngày bắt đầu kỳ và lịch mẫu thành 16/11/2026.
- Lớp INT1306.2 trùng phòng 201-A với INT1340.1: chuyển INT1306.2 sang 201-B.
- Chỉ sửa các ngày/lịch cũ nhận diện được là dữ liệu mẫu chưa chỉnh; không xóa dữ liệu trình duyệt, không sửa mật khẩu hay lịch tự tạo. Các kỳ/lịch đã chỉnh cần tự kiểm tra lại trong giao diện.

## Bằng chứng kiểm tra

- npm test: toàn bộ nhóm kiểm thử hiện có đạt; gồm đăng nhập 4 vai trò bằng service, mật khẩu, bắt đổi lần đầu, trạng thái tài khoản, biểu mẫu, nhập học, đăng ký, tiên quyết, lịch, kỳ, điểm lịch sử, phân trang, DTO/API và AI.
- Kiểm thử bổ sung: đủ 11 tài khoản, bảo toàn định danh, không tạo trùng, giữ trạng thái khóa; toàn bộ lịch mẫu không trùng phòng/giảng viên; ngày đăng ký kết thúc trước ngày học; sửa dữ liệu cũ đúng phạm vi.
- Build TypeScript/Vite: demo và API đều kiểm tra được. Cảnh báo bundle >500 kB vẫn còn, không làm build thất bại.
- Trình duyệt: form đăng nhập trống hiện cả hai lỗi; kiểm tra component quản trị độc lập với provider demo: 11 tài khoản, tìm kiếm rỗng, sinh viên, validate tái kích hoạt, đồng bộ sang tài khoản, validate nhập học, danh sách kỳ và lớp.
- Không gọi đây là kiểm thử end-to-end đầy đủ 4 vai trò trên trình duyệt: đăng nhập các vai trò được kiểm tra bằng test service, các component quản trị được kiểm tra riêng; không thao tác toàn bộ nút/nhánh lỗi trên UI.

## Chuẩn bị trình bày ngày 14/11/2026

1. Dùng VITE_AUTH_MODE=demo nếu chưa có BE chạy và đã thử trước. Khởi động lại Vite sau khi đổi cấu hình.
2. Kiểm tra đăng nhập bốn tài khoản trước giờ học: admin, hocvu, GV001, CT080101. Mật khẩu khởi tạo là demo123; tài khoản từng đổi dùng mật khẩu đã đổi trên đúng địa chỉ web đó.
3. Admin hệ thống: danh sách 11 tài khoản, bộ lọc, chi tiết. Không tự khóa admin duy nhất. Dùng tài khoản sinh viên đang hoạt động nếu trình bày khóa/mở khóa.
4. Admin học vụ: xem sinh viên/giảng viên; form trống để trình bày lỗi dưới trường; tái kích hoạt CT080327 rồi đối chiếu tài khoản; thêm phòng/học phần; lớp học phần có ba tab danh sách/xếp lịch/công bố.
5. Kỳ mẫu đăng ký đến 15/11/2026, bắt đầu học 16/11/2026. Thời khóa biểu: chọn tuần bắt đầu 16/11. Không sửa ngày máy để vượt điều kiện.
6. Sinh viên: xem lý do không đủ điều kiện; đăng ký lớp đủ điều kiện, kiểm tra danh sách và lịch; hủy và đăng ký lại. Sĩ số, số tín chỉ, trùng lịch và tiên quyết có thể chặn thao tác đúng nghiệp vụ.
7. Giảng viên GV001: chọn đúng lớp, mở danh sách, nhập điểm trong 0–10, lưu rồi xuất CSV điểm đã lưu. Kỳ đã khóa/lịch sử chỉ đọc.
8. Phân luồng: demo dùng ngành ID 1, khóa ID 1 hoặc 2. Tải mẫu XLSX rồi điền đúng cấu trúc. Lập phương án theo số dự kiến không thay thế danh sách sinh viên thực để xác nhận nhập học.

## Những phần không nên trình bày là đã chạy thật

- Demo không gửi email đặt lại mật khẩu/cấp tài khoản; lỗi chưa kết nối dịch vụ là chủ ý, không có email thật.
- Chat demo là phản hồi giả lập. AI thật và upload TXT RAG phải chạy chế độ API với BE đã cấu hình LLM/vector DB.
- Tính điều kiện tốt nghiệp, đổi tên/xóa hội thoại và danh sách/xóa/bật tắt tài liệu AI chưa có API tương ứng trong phần đã đối chiếu.
- Một số trang trong API mode hiển thị chờ API: đăng ký, kết quả học tập, lịch, lớp/điểm giảng viên và thời khóa biểu học vụ. Không dùng API mode để trình diễn những luồng này khi chưa có triển khai BE mới.
- Online và localhost có localStorage riêng; dữ liệu đã thao tác và mật khẩu không tự đồng bộ giữa hai địa chỉ.

## Đính chính theo tài liệu gốc — UC-10

Nguồn: `BF_UCS_and_IMAGESnew.pdf`, trang 78–79, “Vô hiệu hóa/Tái kích hoạt sinh viên”. Hậu điều kiện ghi: vô hiệu hóa không thể đăng nhập; kích hoạt lại mở đăng nhập bình thường. Hồ sơ, điểm và lịch sử phải được giữ nguyên; thao tác ghi log kèm lý do.

- Bỏ quy tắc tự thêm “giữ khóa riêng của Admin hệ thống khi tái kích hoạt”. Không tiếp tục tạo trường ngoài DTO `demoStatusBeforeDeactivation`; thao tác chuyển trạng thái loại bỏ trường cũ nếu có.
- Demo: DEACTIVATED hiển thị “Vô hiệu hóa”, tài khoản liên kết DISABLED. Tái kích hoạt: STUDYING / ACTIVE. Không đổi enum BE.
- `API_SPECIFICATION.md`, quản lý tài khoản: DISABLED không được khóa/mở khóa/reset; LOCKED vẫn được khóa lại. Nút khóa trong chi tiết tuân theo quy định này.
- API BE hiện chưa có activate/deactivate sinh viên (mục API chưa triển khai). UC-10 đang mô phỏng trong demo; không dùng endpoint mở khóa tài khoản để giả làm endpoint tái kích hoạt hồ sơ.
- Không tự động mở khóa toàn bộ tài khoản đã lưu: dữ liệu cũ không đủ thông tin xác định nguyên nhân khóa. Tái kích hoạt qua Admin học vụ sẽ áp dụng đúng UC-10.

Đây là bản sửa các sai lệch đã xác định trong luồng trạng thái. Không phải xác nhận mọi use-case của toàn dự án đã được nghiệm thu với BE thật.

## Điều chỉnh giao diện tài khoản theo yêu cầu

- BE cho phép khóa lại LOCKED, nhưng giao diện chủ động không hiển thị thao tác lặp này. Chi tiết LOCKED chỉ có mở khóa và đặt lại mật khẩu; handler cũng chặn khóa lại.
- Bảng sinh viên demo hiển thị riêng trạng thái hồ sơ và đăng nhập từ tài khoản liên kết. Khóa User không tự chuyển Student sang DEACTIVATED (API_SPECIFICATION.md mục quản lý tài khoản).
- Không gọi API quản trị tài khoản từ màn hình People để suy đoán quyền học vụ. StudentResponse hiện không có trạng thái User; chế độ API cần BE cung cấp trường/quyền phù hợp nếu muốn hiển thị cả hai trong danh sách sinh viên.
- Các xác nhận trong form sinh viên, học phần, kỳ học dùng checkbox, gửi nguyên giá trị yes cho logic demo hiện có; chưa chọn thì báo lỗi ngay dưới trường.
- Bỏ dòng thừa cạnh nút xem chi tiết tài khoản DISABLED và nút Quay lại trong form khóa; bố cục nhãn/giá trị chi tiết được tách rõ, một cột trên màn hình nhỏ.

## Cập nhật cách hiển thị theo yêu cầu mới

Bảng quản lý sinh viên demo chỉ hiển thị một trạng thái từ tài khoản liên kết (ACTIVE/LOCKED/DISABLED). Bộ lọc trạng thái cũng lọc tài khoản, không lọc activityStatus của hồ sơ. Dữ liệu activityStatus và luồng vô hiệu hóa/tái kích hoạt giữ nguyên. Thay đổi này thay thế cách hiển thị hai trạng thái ghi ở mục trên; không gửi User status vào StudentSearchRequest của BE.
