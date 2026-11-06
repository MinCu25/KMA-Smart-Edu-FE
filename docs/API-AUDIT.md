# Rà soát kết nối API — 06/11/2026

## Kết luận

Source backend hiện có 44 endpoint thuộc 9 controller. Đối chiếu tự động
HTTP method và URL giữa controller Java và ENDPOINTS/API_URLS: 44/44 khớp,
không có endpoint thiếu hoặc thừa. Chuẩn hóa tên path variable khi so sánh.
Đã đọc các caller UI, không chỉ kiểm tra hằng URL.

Đây là xác nhận kết nối ở mức mã nguồn; chưa xác nhận HTTP end-to-end.
Khi kiểm tra không có tiến trình lắng nghe cổng 8080. Không thực hiện mutation
database, gửi email hoặc migration trong lần rà soát này.

## Danh mục đầy đủ

Mọi đường dẫn dưới đây có tiền tố `/api/v1`.

| Controller | Method và đường dẫn | Caller frontend |
|---|---|---|
| Auth (3) | POST /auth/login; POST /auth/logout; POST /auth/change-password | AuthContext → eduApi; LoginPage, App, PasswordForm |
| AdminUser (4) | GET /admin/users; POST /admin/users/{userId}/lock; POST /admin/users/{userId}/unlock; POST /admin/users/{userId}/reset-password | LiveAccounts → useLiveRequest |
| Student (9, gồm hồ sơ) | GET /students; GET /students/{id}; POST /students; PUT /students/{id}; POST /students/{id}/account-notification/resend; GET /students/me; PATCH /students/me; POST /students/admission/preview; PUT /students/admission/{batchId}/assignment | ListPage/catalog/ActionForm, StudentProfile, Admission |
| Student — xác nhận nhập học (1) | POST /students/admission/{batchId}/confirm | Admission |
| Lecturer (4) | GET /lecturers; GET /lecturers/{id}; POST /lecturers; POST /lecturers/{id}/account-notification/resend | ListPage/catalog/ActionForm; gửi lại email từ chi tiết |
| Subject (7) | GET /subjects; GET /subjects/{id}; POST /subjects; PUT /subjects/{id}; POST /subjects/{id}/deactivate; DELETE /subjects/{id}; POST /subjects/{id}/prerequisites | ListPage/catalog/ActionForm |
| Semester (4) | GET /semesters; GET /semesters/{id}; POST /semesters; PUT /semesters/{id} | ListPage/catalog/ActionForm |
| ModuleClass (6) | GET /module-classes; GET /module-classes/{id}; PATCH /module-classes/{id}; POST /module-classes/{id}/cancel; GET /semesters/{semesterId}/opening-subjects; POST /semesters/{semesterId}/module-classes/batch | ListPage/catalog/ActionForm, Opening |
| Room (6) | GET /rooms; GET /rooms/{id}; POST /rooms; PUT /rooms/{id}; PATCH /rooms/{id}/status; DELETE /rooms/{id} | LiveRoomsPage → RoomsScreen/store → useLiveRequest |

StudentController có 8 endpoint, MyStudentProfileController có 2 endpoint;
hai dòng sinh viên trong bảng cộng lại là 10.

## Đã kiểm tra trong code

- App bật LiveAccountPage khi VITE_AUTH_MODE=api; các context dữ liệu demo không bọc các trang API.
- Base URL `/` đi qua Vite proxy `/api` đến localhost:8080, khớp application.yaml.
- Login không đòi token; các request sau login gắn Authorization: Bearer.
- Logout gửi refreshToken; đổi mật khẩu xóa phiên sau thành công.
- HTTP client bóc ApiResponse.data, giữ mã lỗi và field errors, xử lý 204.
- 401 (trừ mã 4003) xóa phiên; không tự refresh hoặc tự retry mutation.
- Danh sách sử dụng PageResponse và tổng số server; query sinh viên dùng classId.
- Upload nhập học dùng FormData với field file, không ép Content-Type JSON.
- Admission có preview, đổi phân lớp, confirm và hiển thị emailFailures.
- Hồ sơ sinh viên dùng GET/PATCH /students/me, không suy luận ID từ username.
- Tiên quyết gửi prerequisiteSubjectIds; xóa học phần có body reason/confirmed.
- Tạo lô lớp gửi subjects/classes/maxCapacity; không báo đã phân công giảng viên.
- Chạy lại npm test: đạt toàn bộ bộ test hiện có. Snapshot DTO cũ không thay thế
  đối chiếu source controller hiện tại hoặc kiểm thử server thật.

## Những giới hạn còn lại

1. Chưa chạy đăng nhập và CRUD qua HTTP thật; cần backend/database hoạt động
   và tài khoản tương ứng từng vai trò. Build thành công ở lần cấu hình trước.
2. Gợi ý mở lớp và hủy lớp đã có caller, nhưng backend dùng
   ObjectProvider<EnrollmentFacade.Planning>; không tìm thấy implementation
   Planning trong source hiện tại. Gợi ý có thể trả 4317 khi cần lịch sử;
   hủy lớp có thể trả 4325. Trường hợp không có sinh viên có nhánh trả snapshot rỗng.
3. Chưa có API lookup ngành, khóa, khoa, lớp hành chính; form yêu cầu nhập ID thật.
4. Đăng ký/hủy đăng ký, điểm, lịch học/giảng dạy, phân công, xếp lịch,
   công bố lớp và chatbot/tri thức chưa có controller tương ứng. UI chờ API.
5. Users search chỉ có keyword/page/size; không hỗ trợ filter role/status trên API.
6. Token chỉ ở bộ nhớ, tải lại trang cần đăng nhập lại; backend chưa có refresh endpoint.
7. Vite proxy chỉ phục vụ dev. Production phải có reverse proxy hoặc backend origin
   được cấu hình trước build.

Không phát hiện endpoint REST hiện có nào chỉ khai báo mà chưa có luồng UI gọi.
Điều này không đồng nghĩa mọi nghiệp vụ backend đã sẵn sàng hoặc đã qua E2E.
