# Tình trạng tích hợp frontend — hợp đồng 10/11/2026

## Phạm vi

Hợp đồng hiện hành: API_SPECIFICATION.md + fe-api-contract.ts. Bộ docs BE được giữ nguyên nội dung. Tài liệu 02–05/11 là lịch sử, không dùng quyết định endpoint hiện tại.

FE kết nối các nhóm REST auth, admin users, hồ sơ sinh viên, giảng viên, phương án nhập học/lớp hành chính, học phần/tiên quyết, kỳ học, lớp học phần và phòng. Mapping có 53 cặp method/path; download template dùng binary response, các endpoint khác dùng ApiResponse.

Nhập học có tạo dự kiến/tạo từ file, mở lại theo ID, nhập bổ sung, chọn kịch bản/lớp trống, preview, chuyển lớp từng applicant, xác nhận một phần và xem trạng thái email. Revision cũ yêu cầu người dùng tải lại; không tự lặp ghi. Không có API liệt kê mọi plan nên mở lại bằng plan ID.

## Giới hạn server cần giữ rõ

- Chưa có role authorization tại BE. Guard/menu FE chỉ phục vụ UX, không bảo vệ API khỏi gọi trực tiếp.
- JWT cũ có thể còn được chấp nhận tới hết hạn ở endpoint không kiểm tra phiên DB. FE xóa phiên không thay cho thu hồi access token BE.
- BE thừa nhận lỗi thứ tự kiểm tra xung đột mã hồ sơ nhập học. FE không sửa được transaction hay dữ liệu phía server; đối chiếu ADMISSION_WORKFLOW.md.
- Chưa có REST cho xếp lịch/thời khóa biểu, phân công GV, đăng ký môn, điểm/học vụ, AI/knowledge; trạng thái chờ API được giữ.
- Chưa có lookup ngành/khóa/khoa. Nhập ID được BE cung cấp; lớp hành chính lấy API theo ngành/khóa. Không suy ID từ tên.
- Chưa có CRUD đầy đủ kỳ (xóa/khóa), đổi trạng thái SV, chuyển ngành/lớp, restore môn/lớp/phòng.
- Lịch trong ModuleClassResponse hiện luôn []; không suy rằng database không có lịch. Gợi ý 503/4317 và hủy 503/4325 phản ánh thiếu nguồn Enrollment.
- Demo không gửi email hay kiểm chứng rollback/concurrency; phản hồi demo ghi rõ chưa gửi. Danh mục demo có scope giới hạn, không phải ID production.

## Kiểm chứng

Kiểm tra kiểu/build, tests hợp đồng và nghiệp vụ mô phỏng không thay cho kiểm thử đầu-cuối với BE. Chưa có URL BE/tài khoản/SMTP thực để chứng minh các luồng thật. Khi bàn giao BE, kiểm tra login thường/first-login, 4006/401, request đúng whitelist, email null, create mail FAILED, revision stale, partial confirm, mã lỗi phòng, và danh mục thật.
