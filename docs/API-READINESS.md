# Tình trạng bàn giao — 2026-11-03

Đối chiếu develop `8253c0e2965b53bab1a3ab47e068a472a2e99255`. Nguồn hiện hành: `develop-contract.json` (78 tệp DTO/common/enum/controller), `src/types/dto.ts`, `src/services/api/eduApi.ts`. Đây là bản sửa FE, **chưa phải nghiệm thu API thật**.

## Đã sửa sau rà soát toàn luồng

- `STUDYING` đúng backend; migrate trạng thái `STUDING` cũ khi đọc browser storage. Test 13 enum độc lập với bộ kiểm tra field; tài khoản dùng DISABLED, giảng viên/học phần dùng INACTIVE.
- Bổ sung citizenId hồ sơ, các trường UpdateStudentRequest, trạng thái kỳ và các DTO mới. Test bắt buộc có tất cả 57 DTO/common trong snapshot, không bỏ qua DTO chưa được khai báo.
- GPA mục tiêu lấy từ đúng hồ sơ theo tài khoản, không dùng khóa global. Không sao chép giá trị global cũ sang mọi người. Điểm 0 được giữ nguyên.
- Sinh viên xem TP1/TP2 đã lưu của đúng lớp và MSSV từ cùng nguồn của giảng viên. Không tự tính điểm tổng kết/GPA khi chưa có công thức và quyết định công bố chính thức. Kỳ lịch sử vẫn từ dữ liệu ban đầu, phải thay bằng summary API.
- Danh sách học phần mở và lý do điều kiện lấy từ dữ liệu hiện tại; bỏ hai dòng học phần viết cố định. Sinh viên mới không nhận bảng điểm của tài khoản khác.
- Thời khóa biểu sinh viên dùng cùng tuần cho ngày cột và buổi học, giới hạn trong kỳ; sửa hàng tiết lệch một hàng. Lịch giảng viên và CSV ghi khoảng ngày áp dụng, không ngụ ý mọi lịch diễn ra suốt kỳ.
- Email liên hệ cập nhật cả hồ sơ và tài khoản liên kết, chặn trùng liên vai trò. Đọc CCCD từ DTO trước metadata cũ.
- Tài khoản giảng viên thiếu email chuyển DISABLED khi reconcile, vẫn giữ định danh/hồ sơ lịch sử. Không xóa điểm/mật khẩu/lớp lịch sử. Hồ sơ đó không được tự cấp email giả hay tự kích hoạt lại.
- State trình duyệt lắng nghe thay đổi từ tab khác. Đây không phải transaction DB/chống cạnh tranh đa người dùng.
- Bỏ xử lý invalid toàn app bằng popup để không ghi đè chính sách lỗi theo trường.
- AI ước tính chỉ dùng summary của đúng tài khoản; thiếu dữ liệu thì nói thiếu, không dùng mặc định GPA/tín chỉ của sinh viên khác. Chưa phải chatbot/RAG thật.

## Client cho API đã có

`createEduApi({getAccessToken,onUnauthorized})`, VITE_API_BASE_URL là origin BE hoặc proxy prefix, không gồm `/api/v1`. Client tự thêm `/api/v1`. Không có cơ chế tự rơi về mock khi API lỗi.

| Nhóm | Đã có method trong client |
|---|---|
| Auth | login, logout (body refreshToken), changePassword |
| Users | search keyword/page/size, lock (path userId/body reason), unlock, reset-password (path userId/không body) |
| Students | search, detail, update |
| Lecturers | search, detail |
| Subjects | search/detail/create/update/deactivate/delete/prerequisites |
| Semesters | search/detail/create/update, confirmDateChange boolean |
| Classes | search/detail/opening-subjects/create batch/update capacity/cancel |

Phân trang trả nguyên PageResponse, không thay tổng số từ server bằng số dòng trên trang. FieldErrorDetail giữ nguyên qua ApiError. Token 401 gọi onUnauthorized; không tự đoán refresh endpoint, không retry mutation tự động. Quyền phải kiểm tra trên BE.

UI hosted **vẫn dùng nguồn browser-local**. Client mới đã được kiểm thử request/response giả lập nhưng chưa gắn toàn bộ caller/context sang HTTP. Không bật API bằng cách chỉ thêm biến môi trường, không trộn tài khoản server với ID fixtures. Cần chuyển nguồn dữ liệu đồng bộ sau khi có các contract còn thiếu và môi trường BE.

## Quy ước cần giữ rõ

- Hiển thị tên `HK_1 - 2026-2027`; `semesterBody()` chuyển sang tên BE `Học kì 1 năm học 2026-2027` khi gửi. Không gửi mã kỳ tự sinh. API response là nguồn duy nhất cho ID/mã kỳ thật.
- Mã `KY0001` tăng dần chỉ thuộc chế độ browser-local đã được người dùng yêu cầu. Backend hiện sinh `HK_1_2026_2027` và đổi mã khi đổi tên. Nếu sản phẩm thật bắt buộc mã KY tăng dần, nhóm BE phải thống nhất và triển khai việc cấp mã trên server; FE không cấp thay.
- Users API chưa hỗ trợ role/status. HTTP client từ chối hai filter đó rõ ràng, không lọc riêng trang rồi báo tổng sai. UI local vẫn có bộ lọc đầy đủ; cần bổ sung query BE trước khi thay nguồn trang Accounts.
- Giảng viên và loại phòng không nằm trong body batch mở lớp. Phân công phải là thao tác riêng; không báo phân công server thành công chỉ vì tạo lớp thành công.

## Còn phụ thuộc BE / cần kết nối thực

1. URL triển khai, CORS và tài khoản kiểm thử từng vai trò; JSON response thực (boolean firstLogin/last, null và lỗi); cơ chế hết hạn/refresh/revoke phiên.
2. Lookup ngành/khóa/khoa/phòng/lớp hành chính, mapping user–student–lecturer. Không dùng `username=MSSV` như hợp đồng API khi chưa được xác nhận.
3. Endpoint đăng ký/hủy, roster, điểm và công bố điểm, summary, thời khóa biểu theo tài khoản. Policy tín chỉ 12–24 vẫn local, phải lấy quy định thực theo kỳ/sinh viên; BE kiểm tra sức chứa/tiên quyết/xung đột atomic.
4. Tạo sinh viên/giảng viên, trạng thái sinh viên; phòng CRUD; phân công giảng viên/xếp lịch/công bố; khóa điểm/kỳ/xóa kỳ. DTO hoặc facade không có nghĩa controller đã tồn tại.
5. Nhập học: template, preview/confirm, import Excel/CSV được hỗ trợ, kết quả từng dòng, rollback và gửi email. Quy tắc cấp mã/chia lớp phải được nhóm chốt.
6. AI: hội thoại/lịch sử, kiến thức/upload/job xử lý/vector index. Lưu IndexedDB không phải lưu server.
7. Điểm TP1/TP2 local đang hiển thị sau lưu; cần BE xác định thời điểm sinh viên được xem và công thức điểm quá trình/tổng kết.

## Bằng chứng kiểm tra

- npm test: field sets 57 DTO + enum, validation, trạng thái/tài khoản, lịch/tiên quyết/phân lớp; thêm cô lập GPA/điểm, migration, quarantine tài khoản và HTTP path/body/query/401.
- TypeScript và production build chạy trước đóng gói.
- Cloud browser mở được trang đăng nhập local. Chưa kiểm thử tương tác các trang cần đăng nhập và chưa có API thật để kiểm thử end-to-end. SSR/unit không thay thế E2E.

## Kịch bản nghiệm thu tích hợp bắt buộc

- Nhập học → tài khoản → email → first-login → đổi mật khẩu → đăng nhập lại.
- Mở kỳ → mở lớp → phân công → xếp lịch → công bố → đăng ký/hủy/đăng ký lại → lịch của SV/GV/Admin khớp.
- Nhập điểm (null/0/10/sai định dạng) → lưu → công bố theo quyền → SV xem đúng điểm → khóa kỳ.
- Khóa/mở khóa → phiên đang mở bị xử lý; reset email lỗi không báo thành công; reset thành công bắt đổi mật khẩu.
- Hai tài khoản/hai tab, đăng ký chỗ cuối đồng thời, lỗi mạng giữa mutation, 401/403/409/422/500, phân trang + bộ lọc toàn bộ dữ liệu.
