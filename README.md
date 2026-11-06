# KMA Smart Edu · Chạy frontend với API của nhóm

## Kết nối backend trong workspace này

Backend dùng cổng `8080` theo `../src/main/resources/application.yaml`.
File `.env.local` đã bật `VITE_AUTH_MODE=api` và `VITE_API_BASE_URL=/`.
Chạy backend với các biến `JWT_SECRET`, `DBMS_CONNECTION`, `DBMS_USERNAME`,
`DBMS_PASSWORD` của môi trường của bạn, sau đó chạy frontend:

```powershell
cd KMA-Smart-Edu-FE
npm.cmd ci
npm.cmd run dev
```

Mở `http://localhost:5173`. Vite chuyển tiếp `/api/*` sang
`http://localhost:8080`, giữ nguyên đường dẫn `/api/v1/*` và Bearer token.
Đăng nhập bằng tài khoản trong database backend. Khi sửa `.env.local`,
khởi động lại Vite. `.env.local` không được đưa vào Git; máy khác sao chép
`.env.example` thành `.env.local`.

Proxy chỉ áp dụng khi chạy Vite dev. Khi triển khai production, cấu hình reverse
proxy `/api` đến backend hoặc đặt `VITE_API_BASE_URL` thành origin backend
(ví dụ `https://backend.example.com`, không thêm `/api/v1`) trước khi build.
Không đưa thông tin database hay JWT secret vào các biến `VITE_*`.

Các trang API đã có: tài khoản, sinh viên, nhập học, giảng viên, học phần,
kỳ học, lớp học phần, phòng và hồ sơ sinh viên. Các chức năng chưa có controller
(đăng ký học phần, điểm, lịch, chatbot) hiển thị trạng thái chờ backend.

Chạy backend theo mục 12 của `docs/FE_API_INTEGRATION.md`. Sao chép `.env.example` thành `.env.local` ở thư mục chứa package.json, sửa VITE_API_BASE_URL nếu backend dùng địa chỉ khác, rồi chạy `npm ci` và `npm run dev`. Đăng nhập bằng tài khoản do backend cấp.

Chế độ API nối các thao tác có trong 44 endpoint của tài liệu BE. Chọn Admin hệ thống để quản lý tài khoản. Chọn Admin học vụ để quản lý sinh viên, nhập học Excel, giảng viên, học phần, kỳ, lớp học phần và phòng học. Thao tác tài khoản nằm ngay trên từng hàng. Trong các bảng học vụ, dùng nút Xem hoặc bấm tên học phần, tên giảng viên hay mã lớp để mở chi tiết. Các form chỉnh sửa mở trên danh sách. Trang nhập học cung cấp tệp cấu trúc .xlsx theo hợp đồng của BE. Sinh viên mở hồ sơ cá nhân để sửa số điện thoại và GPA. Với các danh mục ngành, khóa, lớp hành chính, khoa chưa có API tra cứu, dùng ID thật do BE cung cấp. Các trang chưa có controller hiển thị trạng thái chờ BE. Gợi ý mở lớp và hủy lớp có thể trả lỗi phụ thuộc Enrollment (xem phần Lớp học phần). Token được giữ trong bộ nhớ, tải lại trang sẽ cần đăng nhập lại. Để chạy giao diện với dữ liệu trình duyệt, đặt VITE_AUTH_MODE=demo và khởi động lại Vite.

## Tài liệu của bản giao diện trước khi ghép API

# KMA Smart Edu — React + TypeScript

Frontend cho sinh viên, giảng viên, Admin học vụ và Admin hệ thống.
Đã đối chiếu DTO nhánh `develop` của https://github.com/CanhhTran-01/edu-hub
ở commit `0c2220775f5292db40a54bf13143f0a22039052f` (01/11/2026).

## Chạy trên máy

Cài Node.js 20.19+ hoặc 22+, giải nén rồi mở terminal tại thư mục chứa package.json:

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite in trong terminal. Sau khi đăng nhập, hệ thống tự mở giao diện theo vai trò của tài khoản.

| Vai trò | Tài khoản | Mật khẩu |
| --- | --- | --- |
| Sinh viên | CT080101 | demo123 |
| Giảng viên | GV001 | demo123 |
| Admin học vụ | hocvu | demo123 |
| Admin hệ thống | admin | demo123 |

Đây là xác thực mô phỏng và giới hạn điều hướng trên frontend, không phải phân quyền backend.

## Đăng ký học phần và trợ lý

Danh sách lớp mở có bộ lọc học phần, điều kiện và tìm kiếm. Hủy lớp sẽ đưa lớp trở lại danh sách mở và đặt lại bộ lọc. Xem lý do chỉ hiện popup, đồng thời tô màu dòng đang chọn; lỗi ngưỡng 12–24 tín chỉ hiện ở thanh chi tiết. Thông báo thành công tự tắt sau 2,5 giây.

Trợ lý có đường dẫn riêng cho hỏi đáp, tư vấn tốt nghiệp và lịch sử. Hội thoại được lưu riêng theo tài khoản trên trình duyệt hiện tại (localStorage), kể cả sau khi tạo hội thoại mới hoặc tải lại trang. Gửi câu hỏi không hiện thông báo thành công. Chưa đồng bộ lịch sử với máy chủ; xóa dữ liệu trình duyệt sẽ mất lịch sử.

```bash
npm run typecheck
npm run build
node tests/run.mjs
```

## Dữ liệu theo DTO

- `src/types/dto.ts`: các request/response, enum, ApiResponse, PageResponse.
- `src/data/mock/dtoFixtures.ts`: fixtures có kiểu DTO, ID số tách khỏi mã hiển thị.
- `src/services/adapters.ts`: DTO → view model để giữ giao diện cũ.
- `src/services/mock/dtoService.ts`: dịch vụ giả nhận request DTO.
- `src/components/common/DtoManager.tsx`: form học phần, tiên quyết, giảng viên, lớp, lịch, khóa tài khoản, reset mật khẩu.
- `src/services/api/httpClient.ts`: xử lý envelope, validation errors, bearer token, HTTP 204, lỗi kết nối.
- `src/services/api/uploads.ts`: tạo multipart cho nhập sinh viên / điểm, chưa có nút gửi API.
- `docs/DTO-INTEGRATION.md`: phạm vi đã làm, giới hạn và những việc cần thống nhất với nhóm backend.
- `docs/backend-contract.json`: snapshot mã Java dùng để đối chiếu.

## Backend chưa có endpoint

Tại commit trên, các thư mục `api/controller` chỉ có `.gitkeep`. Chưa có URL/method
để FE tích hợp thật. Toàn bộ web hiện chạy mock; thêm `VITE_API_BASE_URL` đơn lẻ
không chuyển ứng dụng sang API. Không tự đoán đường dẫn API hay gửi dữ liệu lên repo.
Các lần lưu chỉ tác động dữ liệu trình duyệt. Không push thay đổi vào repo backend.

Khi nhóm có Controller/OpenAPI, thêm service thực gọi `apiRequest<T>` bằng đúng URL,
method và DTO; thay lời gọi mock ở component/context. Không gửi trực tiếp `Student`,
`Course`, `RecordRow`, `Grade` (view model) làm request.

Các khóa localStorage có phiên bản mới để không đọc nhầm dữ liệu demo cũ.
Mã nguồn giữ nguyên cấu trúc thư mục và giao diện gốc, thêm lớp DTO và các form tương ứng.

## Quy tắc thông báo giao diện

- Lỗi nhập liệu trong form hiển thị dưới từng trường; kiểm tra tất cả trường để nhiều lỗi hiện cùng lúc và cập nhật khi sửa. Lỗi không gắn với trường cụ thể hiển thị trong form.
- Lỗi tác vụ ngoài form hiển thị thông báo.
- Riêng kết quả đăng nhập: thành công hoặc xác thực thất bại hiển thị thông báo; bỏ trống trường đăng nhập vẫn báo dưới ô tương ứng.
- Thành công tự tắt sau 2,5 giây. Thông báo lỗi có nút đóng.

## Giảng viên và học kỳ

Đăng nhập giảng viên mở danh sách lớp. Lựa chọn học kỳ/lớp được dùng chung giữa danh sách lớp và quản lý điểm. Hai học kỳ 2025–2026 là fixtures trong `teachingHistory.ts`, tách khỏi điểm kỳ hiện tại, chỉ xem/xuất; chưa phải dữ liệu lịch sử từ API. Lỗi điểm hiện dưới từng ô, cho phép để trống. CSV dùng UTF-8 BOM, escape dấu nháy và ngăn công thức Excel; trình duyệt phải cho phép tải tệp. Các dòng giới thiệu dùng thử đã được gỡ theo yêu cầu, ứng dụng vẫn chạy mock.

## Tài khoản và mật khẩu

Admin hệ thống chỉ có trang Tài khoản người dùng và Đổi mật khẩu; các đường dẫn cũ chuyển về tài khoản. Danh sách hỗ trợ tìm kiếm không dấu, bộ lọc vai trò/trạng thái/yêu cầu đổi mật khẩu và phân trang. Khóa/mở khóa có hiệu lực với đăng nhập trong cùng trình duyệt. Cả bốn vai trò có đổi mật khẩu.

Mật khẩu cấp lại và đổi mật khẩu được kiểm tra trong mô phỏng đăng nhập, lưu bộ kiểm chứng PBKDF2-SHA256 với salt ngẫu nhiên (không lưu mật khẩu thô); cần HTTPS hoặc localhost có Web Crypto. Đặt lại mật khẩu yêu cầu người dùng đổi ở lần đăng nhập sau và không tự mở khóa. Không ghi mật khẩu vào nhật ký. Dữ liệu chỉ thuộc trình duyệt hiện tại, xóa dữ liệu sẽ khôi phục tài khoản mặc định; đây không phải bảo mật backend thực. `ResetPasswordRequest` backend hiện chỉ có userId/reason; các ô cấp lại mật khẩu là phần mô phỏng, không được gửi nguyên dạng này khi nối API.

### Cập nhật luồng đặt lại mật khẩu qua email
Admin chỉ gửi `ResetPasswordRequest { userId, reason? }`; không nhập hoặc xem mật khẩu tạm. Backend phải sinh mật khẩu tạm, gửi email đến địa chỉ đã đăng ký và bật yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo. `services/api/passwordReset.ts` hiện là ranh giới tích hợp chưa kết nối API: trả lỗi rõ ràng, không thay mật khẩu, không báo gửi email thành công, không thay cờ firstLogin. Luồng đặt lại mật khẩu nhập tay trước đây đã được gỡ; chức năng tự đổi mật khẩu và chặn truy cập khi requirePasswordChange=true vẫn giữ nguyên.

## Đồng bộ DTO ngày 02/11/2026
Đọc `docs/API-INTEGRATION.md` để xem thay đổi và các phần còn chờ API. Học phần, tiên quyết và đổi mật khẩu đã được chỉnh theo DTO đối chiếu; không còn gửi status trong UpdateSubjectRequest hoặc subjectId trong SetPrerequisiteRequest. Không tuyên bố tích hợp backend hoàn chỉnh: danh mục ID, auth, phân trang, email, lịch sử AI và mutation vẫn cần nối endpoint chính thức.
