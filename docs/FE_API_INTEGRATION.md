> Tài liệu lịch sử trước 10/11/2026. Hợp đồng hiện hành là [API_SPECIFICATION.md](API_SPECIFICATION.md) và [fe-api-contract.ts](fe-api-contract.ts); xem [tình trạng FE](FRONTEND-INTEGRATION-STATUS.md). Các nhận định/API cũ bên dưới không đại diện bản hiện tại.

# EduHub — tài liệu bàn giao API cho Frontend

**Đối chiếu source ngày 05/11/2026. Phạm vi: toàn bộ 44 endpoint nghiệp vụ trong 9 REST controller hiện có.**

Tài liệu này mô tả hành vi đang được code trong controller → service → repository/facade → database, bao gồm validation, DTO, response, quyền thực tế và phần chưa hoàn thiện. Nguồn chính là `src/main/java`; [API_SPECIFICATION.md](API_SPECIFICATION.md) có cả thiết kế dự kiến và một số mô tả cũ, không nên dùng riêng file đó làm danh sách API đang chạy.

**File để FE copy:** [fe-api-contract.ts](fe-api-contract.ts) chứa đầy đủ kiểu request/query/response của các API dưới đây, các enum và `API_URLS`. File không phụ thuộc thư viện HTTP hay framework FE. Các DTO chỉ có trong facade hoặc tính năng chưa có REST không được đưa vào như hợp đồng gọi API.

## Mục lục

1. [Những điểm phải đọc trước](#1-những-điểm-phải-đọc-trước)
2. [Quy ước gọi API và response](#2-quy-ước-gọi-api-và-response)
3. [Đăng nhập và tài khoản](#3-đăng-nhập-và-tài-khoản)
4. [Sinh viên và hồ sơ cá nhân](#4-sinh-viên-và-hồ-sơ-cá-nhân)
5. [Import nhập học Excel](#5-import-nhập-học-excel)
6. [Giảng viên](#6-giảng-viên)
7. [Học phần và tiên quyết](#7-học-phần-và-tiên-quyết)
8. [Kỳ học](#8-kỳ-học)
9. [Lớp học phần](#9-lớp-học-phần)
10. [Phòng học](#10-phòng-học)
11. [Mã lỗi cần xử lý](#11-mã-lỗi-cần-xử-lý)
12. [Phần chưa có API và thiếu dữ liệu danh mục](#12-phần-chưa-có-api-và-thiếu-dữ-liệu-danh-mục)
13. [Mẫu gọi API và trình tự ghép FE](#13-mẫu-gọi-api-và-trình-tự-ghép-fe)
14. [Phạm vi kiểm chứng](#14-phạm-vi-kiểm-chứng)

## 1. Những điểm phải đọc trước

> **TẤT CẢ URL `/api/v1/**` đều cần `Authorization: Bearer <accessToken>`, ngoại trừ `POST /api/v1/auth/login` và request `OPTIONS`.** Các câu “chưa yêu cầu đăng nhập” ở tài liệu MVP cũ không còn phản ánh filter chung hiện tại.

> **Có `refreshToken` trong response nhưng CHƯA CÓ endpoint refresh token.** Access token sống **900 giây = 15 phút**. Khi hết hạn, FE yêu cầu đăng nhập lại; không gọi `/auth/refresh`.

> **`login.user.id` là User ID; `StudentResponse.id` là Student ID; `LecturerResponse.id` là Lecturer ID. Không dùng lẫn.** `/students/me` tự tra hồ sơ theo User ID trong token, không nhận ID từ FE.

> **Hai tên JSON dễ sai:** `PageResponse.last`, `UserInfoResponse.firstLogin`. Riêng `SemesterResponse.isLocked` vẫn giữ chữ `is`. Đã kiểm tra bằng Jackson trên DTO đã biên dịch, không suy tên JSON chỉ từ tên field Java.

> **Tạo sinh viên/giảng viên thành công có thể trả `notificationStatus="FAILED"`. Hồ sơ và tài khoản đã được lưu.** Hiển thị “đã tạo, gửi email thất bại” và cho gửi lại thông báo; không tự POST tạo lại.

> **`opening-subjects` và hủy lớp học phần chưa thể chạy trọn luồng khi cần lịch sử Enrollment.** Chưa có implementation `EnrollmentFacade.Planning` ở runtime; có thể nhận **503/4317** hoặc **503/4325**. Không biến lỗi này thành danh sách trống hoặc thông báo “không có nhu cầu”.

> **Chưa có API danh mục ngành, khóa, lớp hành chính và khoa.** Form tạo người cần ID thật từ BE/DB; không tự đặt ID hay dùng mã ngành thay ID. Chi tiết cách lấy dữ liệu ở mục 12.

> **Import dùng batch nằm trong RAM**, mất khi BE restart; preview không tạo hồ sơ chính thức. Chỉ confirm mới tạo dữ liệu. **`invalidRows` hiện đếm số lỗi, không phải số dòng lỗi khác nhau.**

> **`DELETE /subjects/{id}` có JSON body; `DELETE /rooms/{id}` không có body.** Các thao tác xóa hiện có là xóa mềm. Không có API xóa sinh viên/giảng viên hoặc xóa kỳ học.

> **Phân quyền hiện chưa đồng nhất.** Chỉ các API chỉ rõ role trong bảng mới có kiểm tra role ở service; những API khác mới kiểm tra token chung. Ẩn nút ở FE phục vụ UX, không thay thế phần phân quyền BE còn để sau.

## 2. Quy ước gọi API và response

### 2.1. Địa chỉ, header và kiểu dữ liệu

| Nội dung | Giá trị |
|---|---|
| Origin local mặc định | `http://localhost:8080` |
| Base path | `/api/v1` |
| JSON request | `Content-Type: application/json` |
| Header xác thực | `Authorization: Bearer <accessToken>`, đúng tiền tố có khoảng trắng |
| Upload Excel | `multipart/form-data`, field `file`; để browser tự đặt boundary |
| ID | JSON number của Java Long; `batchId` là UUID string |
| Ngày | `yyyy-MM-dd`, ví dụ `2026-11-05` |
| Timestamp | ISO local date-time, ví dụ `2026-11-05T10:30:00.123`, không có `Z` |
| Số thập phân | JSON number: `targetGpa: 3.2`, không gửi chuỗi `"3.2"` |
| Enum | Gửi đúng chuỗi IN HOA, ví dụ `CHINH_QUY`, `ACTIVE` |
| Phân trang | `page=0`, `size=20` mặc định; `page >= 0`, `size >= 1` |
| Sort | Cố định tại service; chưa có query `sort` dùng chung |

`API_URLS` đã chứa `/api/v1`. Nếu dùng hằng này, cấu hình base URL của HTTP client là origin, tránh tạo `/api/v1/api/v1/...`. Khi gọi từ máy khác phải cấu hình hostname/IP của BE, vì `localhost` là máy đang chạy browser.

Ứng dụng đặt timezone UTC trong `main()`; ngày nghiệp vụ kỳ học/phòng/lớp tính theo **Asia/Ho_Chi_Minh**. Các field `LocalDate` là ngày, nên giữ nguyên chuỗi, không tự chuyển UTC rồi làm lệch ngày. Timestamp không có timezone đi kèm; khi hiển thị cần thống nhất cách diễn giải UTC của BE.

CORS MVC hiện cho mọi origin pattern, header và các method GET/POST/PUT/DELETE/PATCH/OPTIONS, cho credentials. Xác thực API dùng token trong header, không có luồng đăng nhập bằng cookie trong các controller hiện tại.

### 2.2. Response chung

**Cột “Data” trong mọi bảng endpoint dưới đây là kiểu của `body.data`, đã nằm trong `ApiResponse<T>`.** Không phải response JSON phẳng.

Thành công có dữ liệu:

~~~json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1
  },
  "timestamp": "2026-11-05T10:30:00"
}
~~~

Thành công không có dữ liệu, chẳng hạn logout, xóa phòng hoặc reset mật khẩu:

~~~json
{
  "success": true,
  "message": "Đăng xuất thành công",
  "timestamp": "2026-11-05T10:30:00"
}
~~~

**Field null của envelope bị lược bỏ:** thành công thường không có `code`, `errors`, `path`; response void không có `data`. Không kiểm tra `code === 200` để xác định thành công. Field null bên trong các DTO nghiệp vụ thường vẫn xuất hiện.

Lỗi nghiệp vụ/validation:

~~~json
{
  "success": false,
  "code": 1001,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "errors": [
    {
      "field": "email",
      "message": "must be a well-formed email address"
    }
  ],
  "path": "/api/v1/students",
  "timestamp": "2026-11-05T10:30:00"
}
~~~

`errors` **có thể không xuất hiện**. Nhiều lỗi chỉ có `code/message`. `errors[].field` cũng có thể là đường dẫn như `subjects[0].subjectId` hoặc `moduleClasses[20]`, không phải luôn là tên input.

API trả HTTP tương ứng với lỗi: ví dụ HTTP `401` và body `code=4000`. **Mã nghiệp vụ không phải HTTP status.** Không phân nhánh theo câu `message` vì có thông báo tùy tình huống và thông báo lỗi chu trình kèm mã môn.

### 2.3. Phân trang

~~~json
{
  "success": true,
  "message": "Không tìm thấy kết quả",
  "data": {
    "content": [],
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 0,
    "totalPages": 0,
    "last": true
  },
  "timestamp": "2026-11-05T10:30:00"
}
~~~

**Trang trống là thành công HTTP 200.** FE đọc `data.content`, không đọc `data.items`. Thông báo trang trống của `module-classes` và `admin/users` hiện vẫn là `Success`; không dùng message để nhận biết rỗng.

Các bộ lọc kết hợp bằng AND, trừ phần tìm keyword thường OR giữa mã/tên. Khi đổi bộ lọc, FE nên đưa `page` về `0`. Không gửi query dưới dạng body JSON. Bỏ các query chưa chọn thay vì gửi chuỗi `"null"` hoặc `"undefined"`.

## 3. Đăng nhập và tài khoản

Nguồn: [AuthController](../src/main/java/com/eduhub/edu_hub/identity/api/AuthController.java), [AuthApplicationService](../src/main/java/com/eduhub/edu_hub/identity/application/AuthApplicationService.java), [AdminUserService](../src/main/java/com/eduhub/edu_hub/identity/application/AdminUserService.java), [AccessTokenFilter](../src/main/java/com/eduhub/edu_hub/identity/api/AccessTokenFilter.java).

### 3.1. URL và DTO

| STT | Method | URL | Request | Data | HTTP thành công | Quyền thực tế |
|---|---|---|---|---|---|---|
| 01 | POST | `/api/v1/auth/login` | `LoginRequest` | `LoginResponse` | 200 | Công khai |
| 02 | POST | `/api/v1/auth/logout` | `LogoutRequest` | Không có | 200 | Token hợp lệ |
| 03 | POST | `/api/v1/auth/change-password` | `ChangePasswordRequest` | Không có | 200 | Token hợp lệ |
| 04 | GET | `/api/v1/admin/users` | Query `AdminUserSearchQuery` | `PageResponse<UserInfoResponse>` | 200 | SYSTEM_ADMIN |
| 05 | POST | `/api/v1/admin/users/{userId}/lock` | `LockBody` | Không có | 200 | SYSTEM_ADMIN |
| 06 | POST | `/api/v1/admin/users/{userId}/unlock` | Không body | Không có | 200 | SYSTEM_ADMIN |
| 07 | POST | `/api/v1/admin/users/{userId}/reset-password` | Không body | Không có | 200 | SYSTEM_ADMIN |

### 3.2. Login → đổi mật khẩu → logout

**01 — Login:** nhận `{"username":"...","password":"..."}`, cả hai không blank. Service khóa hàng User theo username, kiểm tra ACTIVE/khóa tạm và BCrypt, rồi tạo phiên trong `refresh_tokens`. JWT gắn User ID và session ID; filter các request sau kiểm tra chữ ký/hạn token, phiên chưa revoked và tài khoản còn ACTIVE/chưa xóa.

~~~json
{
  "accessToken": "<access-token>",
  "refreshToken": "<refresh-token>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": 15,
    "username": "CT080101",
    "email": null,
    "role": "STUDENT",
    "fullName": null,
    "firstLogin": true,
    "status": "ACTIVE"
  },
  "requirePasswordChange": true
}
~~~

Đây là **ví dụ phần `data`**, token là placeholder. Login hiện chưa map `email` và `fullName`, không lấy tên hiển thị từ hai field này. Nếu cần hồ sơ SV, gọi `GET /students/me` bằng token STUDENT có liên kết hồ sơ.

Sai mật khẩu trả `401/4003`; đủ **5 lần sai** đặt khóa tạm **15 phút**. Lần sai đạt ngưỡng vẫn trả `4003`, lần đăng nhập tiếp theo trong thời gian khóa trả `403/4004`. LOCKED/DISABLED cũng bị từ chối. Không có field thời điểm mở khóa trong response để FE làm countdown chính xác.

**03 — Change password:**

~~~json
{
  "currentPassword": "MatKhauCu@123",
  "newPassword": "MatKhauMoi@123",
  "confirmPassword": "MatKhauMoi@123"
}
~~~

- Nếu `requirePasswordChange=true`/first-login: có thể bỏ `currentPassword`; tài khoản mới hiện được cấp mật khẩu ban đầu `12345` từ service, mật khẩu mới vẫn phải đạt chính sách.
- Nếu không phải first-login: phải gửi `currentPassword` đúng. Nhập sai cũng tăng bộ đếm và có thể khóa tạm.
- Mật khẩu mới: ít nhất 8 ký tự, có chữ hoa/chữ thường/chữ số/ký tự đặc biệt, không có khoảng trắng, khác mật khẩu hiện tại; confirmation phải khớp.
- Service cập nhật hash, đặt first-login=false và **thu hồi TẤT CẢ phiên của User**.
- Thành công chỉ trả message **“Đổi mật khẩu thành công. Vui lòng đăng nhập lại.”** FE xóa token cũ và đưa về login, không tiếp tục gọi API bằng token vừa dùng.

**02 — Logout:** header là access token, body `{"refreshToken":"<token của cùng phiên>"}`. Service kiểm tra cặp session/User, hạn refresh token rồi revoke phiên đó. **Không gửi accessToken trong body.** FE xóa trạng thái đăng nhập khi logout xong; các phiên khác của User không bị logout theo.

**Chú ý first-login:** source hiện trả cờ yêu cầu đổi mật khẩu nhưng chưa chặn đồng loạt API khác bằng `FIRST_LOGIN_REQUIRED`. FE nên chủ động chuyển vào màn đổi mật khẩu và chỉ mở ứng dụng chính sau khi đổi + đăng nhập lại. Không ghi trong UI rằng BE đã bảo vệ toàn bộ API theo cờ này.

### 3.3. Quản trị User

**04 — Search:** `GET /api/v1/admin/users?keyword=postman&page=0&size=20`. Chỉ tìm username không phân biệt hoa/thường, bỏ User đã xóa. Chưa có filter role/status hoặc sort công khai. Response `UserInfoResponse` có `email` từ User; `fullName` chưa map.

**05 — Lock:** body chỉ `{"reason":"Lý do khóa"}`. Lưu `status=LOCKED` và revoke tất cả phiên của User đích. Tự khóa tài khoản của mình bị chặn `403/4001` nếu đang là SYSTEM_ADMIN ACTIVE cuối cùng theo phép đếm của service. `userId` lấy từ danh sách User, không lấy Student ID.

**06 — Unlock:** không body. Lưu `status=ACTIVE`, xóa khóa tạm và reset bộ đếm sai mật khẩu. Không phục hồi những token đã revoke; người dùng phải login lại.

**07 — Reset password:** không body, không dùng `ResetPasswordRequest` trong source. Service tự tạo mật khẩu tạm, cập nhật hash, đặt first-login=true, revoke mọi phiên rồi gửi email. Không trả mật khẩu cho FE. Thiếu email trả `400/4007`; lỗi gửi mail trả `502/4008` và transaction reset rollback.

## 4. Sinh viên và hồ sơ cá nhân

Nguồn: [StudentController](../src/main/java/com/eduhub/edu_hub/people/api/StudentController.java), [StudentApplicationService](../src/main/java/com/eduhub/edu_hub/people/application/StudentApplicationService.java), [MyStudentProfileService](../src/main/java/com/eduhub/edu_hub/people/application/MyStudentProfileService.java).

### 4.1. URL và DTO

| STT | Method | URL | Request | Data | HTTP | Quyền thực tế |
|---|---|---|---|---|---|---|
| 08 | GET | `/api/v1/students` | Query `StudentSearchRequest` + page/size | `PageResponse<StudentResponse>` | 200 | Token hợp lệ |
| 09 | GET | `/api/v1/students/{id}` | Không body | `StudentResponse` | 200 | Token hợp lệ |
| 10 | POST | `/api/v1/students` | `CreateStudentRequest` | `CreateStudentResponse` | **200** | ACADEMIC_ADMIN hoặc SYSTEM_ADMIN |
| 11 | PUT | `/api/v1/students/{id}` | `UpdateStudentRequest` | `StudentResponse` | 200 | Token hợp lệ; chưa kiểm tra role riêng |
| 12 | POST | `/api/v1/students/{id}/account-notification/resend` | Không body | `AccountNotificationResponse` | 200 | ACADEMIC_ADMIN hoặc SYSTEM_ADMIN |
| 13 | GET | `/api/v1/students/me` | Không body | `StudentResponse` | 200 | STUDENT, có hồ sơ gắn User |
| 14 | PATCH | `/api/v1/students/me` | `UpdateMyStudentProfileRequest` | `StudentResponse` | 200 | STUDENT, có hồ sơ gắn User |

### 4.2. Tra cứu và dữ liệu trả về

**08 — Search:** các query tùy chọn: `keyword` (MSSV/họ tên), `majorId`, `cohortId`, `classId`, `activityStatus`, `academicWarningStatus`, `page`, `size`. `activityStatus` nhận STUDYING/DEACTIVATED/DELETED, sai giá trị trả `400/1001`. `academicWarningStatus` là chuỗi so sánh chính xác, chưa có enum quy định. Sắp xếp ID tăng dần, chỉ lấy hồ sơ chưa xóa mềm; keyword không phân biệt hoa/thường nhưng service SV hiện không trim/escape keyword như một số module khác.

**09 — Detail:** dùng Student ID. Service đọc Student + lớp + khóa, lấy tên ngành theo lô qua `CurriculumFacade.ReferenceData`, map sang DTO. Không thấy/đã xóa: `404/4101`.

`StudentResponse` có các field sau; kiểu chính xác và nullable nằm trong file TS:

| Nhóm | Field trả về |
|---|---|
| Hồ sơ | `id`, `studentCode`, `fullName`, `dateOfBirth`, `email`, `phone`, `citizenId` |
| Học tập/danh mục | `majorName`, `cohortCode`, `className`, `trainingType`, `entranceScore`, `targetGpa` |
| Trạng thái | `activityStatus`, `academicWarningStatus`, `academicWarningReason`, `statusReason` |
| Metadata | `createdAt` |

**Response hiện không có `userId`, `majorId`, `cohortId`, `administrativeClassId` hay `gender`.** Khi mở form sửa, không suy ID từ tên lớp/ngành; cần dữ liệu danh mục do BE cung cấp. `statusReason` được khai báo trong DTO nhưng mapper hiện chưa gán nên thường null.

### 4.3. Tạo sinh viên

**10 — Request mẫu:** thay các ID và email bằng dữ liệu thật.

~~~json
{
  "fullName": "Nguyễn Văn An",
  "dateOfBirth": "2008-05-20",
  "gender": "NAM",
  "email": "an@example.com",
  "phone": "0901234567",
  "citizenId": "012345678901",
  "majorId": 1,
  "cohortId": 1,
  "administrativeClassId": 1,
  "trainingType": "CHINH_QUY",
  "entranceScore": 25.5,
  "reason": "Bổ sung hồ sơ nhập học"
}
~~~

| Field | Bắt buộc | Validation / xử lý |
|---|---|---|
| fullName | Có | Không blank, <=255, trim |
| email | Có | Email hợp lệ, <=255; trim/lowercase; trùng hồ sơ chưa xóa trả 4113 |
| majorId, cohortId, administrativeClassId | Có | Phải cùng ngành–khóa của lớp; dùng ID thật |
| trainingType | Có | CHINH_QUY/LIEN_THONG/VAN_BANG_2; phải khớp hệ của lớp |
| reason | Có | Không blank, trim rồi <=500 |
| dateOfBirth | Không | LocalDate; DTO tạo SV hiện không bắt buộc quá khứ |
| gender | Không | Chuỗi tự do, trim; không có enum BE |
| phone, citizenId | Không | <=255; CCCD bỏ khoảng trắng, rỗng thành null |
| entranceScore | Không | >=0 |

Luồng: kiểm tra quyền → chuẩn hóa/trùng email-CCCD → khóa lớp hành chính → kiểm tra scope/sức chứa → sinh MSSV → tạo User STUDENT + hồ sơ STUDYING + audit trong transaction → commit → gửi email → ghi kết quả gửi bằng transaction riêng.

MSSV do BE sinh, ví dụ `CT080101`, từ ngành CNTT→CT, ATTT→AT, DTVT→DT, TTNT→AI + số khóa + số lớp + STT 01–99. Không gửi `studentCode`, `username`, `password` hoặc `userId` khi tạo. Lớp/khóa không đủ định dạng hoặc hết STT sẽ bị từ chối theo mã lỗi ở mục 11.

Response là `{student, warnings, notificationStatus, notificationError}`, **không phải trực tiếp StudentResponse**. Trùng họ tên + ngày sinh chỉ tạo warning cần kiểm tra, không tự chặn. Email lỗi sau commit vẫn là HTTP 200/success=true.

**12 — Resend:** nhận Student ID; cần đã có User. Chỉ gửi lại thông báo, không tạo hồ sơ mới hoặc reset mật khẩu. Có thể trả `notificationStatus=FAILED` với `ACCOUNT_ALREADY_ACTIVATED`, `ACCOUNT_EMAIL_MISSING` hoặc `EMAIL_SEND_FAILED`. FE hiển thị kết quả nghiệp vụ kể cả HTTP thành công. Luồng gửi lại SV hiện chưa kiểm tra lại hash mật khẩu ban đầu như luồng giảng viên; không diễn giải resend là cấp lại mật khẩu.

### 4.4. Cập nhật hồ sơ quản trị

**11 — PUT hiện xử lý kiểu cập nhật từng field**, không bắt buộc gửi nguyên hồ sơ. Chỉ các field khác null được cập nhật:

~~~json
{
  "fullName": "Nguyễn Văn An",
  "phone": "0907654321",
  "targetGpa": 3.2,
  "academicWarningStatus": "CANH_BAO",
  "academicWarningReason": "Cần kiểm tra tiến độ học",
  "statusReason": "Điều chỉnh thông tin hồ sơ"
}
~~~

`CANH_BAO` chỉ là ví dụ chuỗi, không phải enum đã được BE chuẩn hóa.

- **Không gửi `studentCode`, kể cả gửi lại mã hiện tại:** mọi giá trị khác null đều trả `400/1001`.
- Các field nhận: fullName, dateOfBirth, email, phone, citizenId, administrativeClassId, targetGpa, academicWarningStatus, academicWarningReason, statusReason. dateOfBirth phải quá khứ; email phải hợp lệ; administrativeClassId >0; targetGpa >=0.
- Bỏ field hoặc gửi null thông thường nghĩa là giữ nguyên. Muốn xóa điện thoại bằng null hãy dùng PATCH hồ sơ cá nhân nếu đúng ngữ cảnh.
- Gửi `academicWarningStatus=""`/blank để gỡ cả trạng thái và lý do. Đổi trạng thái làm xóa lý do cũ nếu không cung cấp lý do mới. Gửi lý do không rỗng khi không có trạng thái bị từ chối.
- `statusReason` hiện chỉ ghi log, không lưu vào hồ sơ, không đổi `activityStatus`.
- **Giới hạn hiện tại:** luồng PUT chưa có kiểm tra quyền quản trị riêng; chưa kiểm tra đầy đủ trùng email/CCCD, sức chứa lớp mới, đồng bộ email User hoặc sinh lại MSSV khi đổi lớp. DTO `targetGpa` quản trị chưa có max=4. Không suy rằng các ràng buộc của POST đã áp dụng cho PUT.

### 4.5. Hồ sơ cá nhân sinh viên

**13 — GET /me:** lấy User từ token → bắt buộc role STUDENT → tìm Student qua `user_id` → trả `StudentResponse`. Không có hồ sơ tương ứng trả `404/4101`; khác role trả `403/4001`.

**14 — PATCH /me:** chỉ cho hai key:

~~~json
{
  "targetGpa": 3.5,
  "phone": "0901234567"
}
~~~

- targetGpa: 0–4; phone tối đa 255 ký tự, trim.
- **Không có field:** giữ nguyên; **null:** xóa giá trị. `{}` hợp lệ và không thay đổi.
- Có thể xóa cả hai bằng `{"targetGpa":null,"phone":null}`.
- Key lạ như `email`, `studentCode`, `userId`, `activityStatus`, `targetGpaPresent` đều trả `400/1001`, kể cả giá trị null.
- Service khóa hồ sơ của User hiện tại, lưu thay đổi và audit nếu giá trị thay đổi. Không cho chọn sửa hồ sơ người khác bằng path/query/body.

## 5. Import nhập học Excel

Nguồn: [StudentAdmissionService](../src/main/java/com/eduhub/edu_hub/people/application/StudentAdmissionService.java), [parser Excel](../src/main/java/com/eduhub/edu_hub/people/application/admission/StudentAdmissionSpreadsheetParser.java), [AdmissionPreviewStore](../src/main/java/com/eduhub/edu_hub/people/application/admission/AdmissionPreviewStore.java).

| STT | Method | URL | Request | Data | HTTP | Quyền thực tế |
|---|---|---|---|---|---|---|
| 15 | POST | `/api/v1/students/admission/preview` | Multipart `file` | `AdmissionPreviewResponse` | 200 | Token hợp lệ; chưa kiểm tra role riêng |
| 16 | PUT | `/api/v1/students/admission/{batchId}/assignment` | `AdmissionClassAdjustmentRequest` | `AdmissionPreviewResponse` | 200 | Token hợp lệ; chưa kiểm tra role riêng |
| 17 | POST | `/api/v1/students/admission/{batchId}/confirm` | `AdmissionConfirmRequest` | `AdmissionConfirmResponse` | 200 | Token hợp lệ; chưa kiểm tra role riêng |

### 5.1. Preview

**15 — Chỉ nhận file `.xlsx` không rỗng; đọc sheet đầu tiên.** Không phải endpoint `/students/batch-import` trong đặc tả cũ. Request không có majorId/cohortId bên ngoài: thông tin ngành/khóa/hệ nằm trong từng dòng Excel.

File phải có đủ 9 header sau, parser trim và không phân biệt hoa/thường; không phụ thuộc thứ tự cột:

| Header | Dữ liệu |
|---|---|
| ma_ho_so | Mã hồ sơ tuyển sinh, không phải MSSV |
| ho_ten | Họ tên |
| ngay_sinh | Excel date hoặc chuỗi dd/MM/yyyy |
| gioi_tinh | Chuỗi không rỗng, chưa giới hạn enum |
| email | Email hợp lệ |
| diem_xet_tuyen | Số không âm; parser hỗ trợ dấu phẩy thập phân |
| ma_nganh | Mã ngành catalog, ví dụ CNTT, không phải CT |
| ma_khoa | Mã khóa, ví dụ CT8 |
| he_dao_tao | CHINH_QUY/LIEN_THONG/VAN_BANG_2 |

Tất cả cột trên đều bắt buộc có dữ liệu trên dòng import. Một file chỉ chứa **một ngành, một khóa, một hệ**. Kiểm tra mã hồ sơ/email trùng trong file hoặc hồ sơ chưa xóa trong DB, ngành tồn tại và có lớp phù hợp. Dòng thiếu/sai hoặc không còn chỗ xếp lớp bị đưa vào danh sách lỗi, không nằm trong tập sẽ confirm.

Luồng phân lớp: lấy lớp phù hợp và SV đang có → xếp ứng viên theo điểm giảm dần, mã hồ sơ làm tiêu chí phụ → chọn lớp còn chỗ, ưu tiên tránh trùng tên, cân sĩ số/điểm → trả preview và giữ batch trong RAM. Chưa tạo User/Student chính thức.

~~~json
{
  "batchId": "123e4567-e89b-42d3-a456-426614174000",
  "fileName": "admission.xlsx",
  "totalRows": 20,
  "validRows": 19,
  "invalidRows": 2,
  "classes": [],
  "errors": [
    {"rowNumber": 3, "applicationCode": "HS002", "field": "email", "reason": "Email sai định dạng"},
    {"rowNumber": 3, "applicationCode": "HS002", "field": "ma_ho_so", "reason": "Trùng mã hồ sơ trong file"}
  ],
  "duplicateNameWarnings": [],
  "capacityWarnings": []
}
~~~

Ví dụ rút gọn phần data, `classes` được lược nội dung. **19 dòng hợp lệ + 2 lỗi vẫn có thể xuất phát từ 20 dòng** vì một dòng có nhiều lỗi.

`classes[]` gồm `classId, className, currentSize, projectedSize, minCapacity, maxCapacity, projectedAverageEntranceScore, students[]`. `students[]` chỉ là ứng viên mới trong batch, không phải toàn bộ SV cũ của lớp. Mỗi ứng viên có `rowNumber, applicationCode, fullName, dateOfBirth, gender, email, entranceScore, majorCode, cohortCode, trainingType, assignedClassId, assignedClassName`.

**HTTP 200 preview chưa đồng nghĩa file hợp lệ.** Phải đọc `data.errors`, `validRows` và các warnings. Đây là lỗi của file nằm trong data, khác `body.errors` của HTTP lỗi chung. Lỗi cấu trúc header cũng có thể trả preview 200 chứa lỗi field=file.

### 5.2. Chỉnh phân lớp

**16 — Mỗi lần chuyển một hồ sơ:**

~~~json
{
  "applicationCode": "HS001",
  "targetClassId": 2
}
~~~

`targetClassId` phải lấy từ `preview.classes[].classId` của chính batch. Service tìm ứng viên trong batch, kiểm tra lớp đích chưa đầy, cập nhật phân công, tính lại cảnh báo và trả **toàn bộ preview mới**. FE thay state bằng response mới, không chỉ sửa số đếm tại client.

Batch không tồn tại/mất sau restart trả `404/4106`; batch đã confirm trả `409/4107`; lớp đầy trả `400/4105`. Chưa có API GET để lấy lại preview theo batchId. FE phải giữ preview hiện tại trong phiên thao tác và upload lại nếu batch mất.

### 5.3. Confirm

**17 — Luôn gửi JSON object, tối thiểu `{}` nếu không chấp nhận cảnh báo.** Khi có cảnh báo, chỉ gửi true sau khi người dùng xác nhận:

~~~json
{
  "actor": "ten-nguoi-thao-tac",
  "acceptMinimumCapacityWarning": true
}
~~~

`actor` hiện là chuỗi FE gửi vào audit, chưa được service suy từ token; không dùng field này để coi là bằng chứng quyền hoặc danh tính đã xác minh.

Luồng: kiểm tra batch còn mở/cảnh báo → khóa các lớp được phân theo ID → cấp MSSV → kiểm tra trùng mã → tạo User STUDENT first-login và hồ sơ cho **các ứng viên hợp lệ trong preview** → gửi email từng tài khoản → đánh dấu batch confirmed và ghi audit.

- `acceptMinimumCapacityWarning` mặc định false; còn capacityWarnings mà chưa chấp nhận trả `409/4108`, không tự chuyển true trong HTTP interceptor.
- **Confirm không có điều kiện “invalidRows phải bằng 0”.** FE cần cho người dùng thấy rõ số dòng được tạo và số bị bỏ; nếu yêu cầu nhập đủ toàn bộ thì sửa file/upload lại trước confirm.
- Response `{batchId, createdStudents, createdUsers, emailFailures}`. `emailFailures` chứa **applicationCode**, không phải email/MSSV. Email lỗi không nhất thiết làm rollback việc tạo hồ sơ.
- Tắt nút confirm trong lúc đang gửi; không tự retry thao tác tạo batch/confirm nếu chưa biết trạng thái request trước.
- Batch chỉ lưu trong RAM, chưa gắn owner/TTL và chưa có API khôi phục. Luồng này chưa kiểm chứng lại đầy đủ sức chứa khi sĩ số thay đổi giữa preview/confirm, cũng chưa bảo đảm cơ chế chống confirm đồng thời dựa trên transaction commit. Đây là giới hạn BE cần hoàn thiện khi tích hợp nhiều người dùng.

File mẫu có sẵn: [Danh_sach_trung_tuyen_CT8_20SV_CNTT.xlsx](../postman/Danh_sach_trung_tuyen_CT8_20SV_CNTT.xlsx). Kiểm tra ID/lớp và mã danh mục thực tế trước khi demo.

## 6. Giảng viên

Nguồn: [LecturerController](../src/main/java/com/eduhub/edu_hub/people/api/LecturerController.java), [LecturerApplicationService](../src/main/java/com/eduhub/edu_hub/people/application/LecturerApplicationService.java), [LecturerCreationService](../src/main/java/com/eduhub/edu_hub/people/application/LecturerCreationService.java).

| STT | Method | URL | Request | Data | HTTP | Quyền thực tế |
|---|---|---|---|---|---|---|
| 18 | GET | `/api/v1/lecturers` | Query `LecturerSearchRequest` + page/size | `PageResponse<LecturerResponse>` | 200 | Token hợp lệ |
| 19 | GET | `/api/v1/lecturers/{id}` | Không body | `LecturerResponse` | 200 | Token hợp lệ |
| 20 | POST | `/api/v1/lecturers` | `CreateLecturerRequest` | `CreateLecturerResponse` | **200** | ACADEMIC_ADMIN hoặc SYSTEM_ADMIN |
| 21 | POST | `/api/v1/lecturers/{id}/account-notification/resend` | Không body | `LecturerNotificationResponse` | 200 | ACADEMIC_ADMIN hoặc SYSTEM_ADMIN |

**18 — Search:** keyword (mã/họ tên), lecturerCode, fullName, facultyId, status, page, size. Keyword/mã/tên tìm chuỗi con, trim/không phân biệt hoa thường. status=ACTIVE/INACTIVE; sắp ID tăng dần, bỏ lecturer đã xóa. Lọc facultyId còn yêu cầu khoa chưa xóa.

**19 — Detail:** đọc Lecturer + Faculty, map DTO; không thấy/đã xóa trả `404/4102`. DTO: `id, lecturerCode, fullName, email, phone, dateOfBirth, citizenId, facultyId, accountNotificationStatus, accountNotificationError, facultyName, status`. Khoa đã xóa có thể khiến `facultyName=null`. Không có `userId` trong response.

**20 — Create:**

~~~json
{
  "fullName": "Trần Thị Bình",
  "dateOfBirth": "1990-04-15",
  "email": "binh@example.com",
  "phone": "0901234567",
  "citizenId": "012345678902",
  "facultyId": 1,
  "reason": "Bổ sung giảng viên mới"
}
~~~

Bắt buộc fullName/email (không blank, <=255), dateOfBirth (ngày quá khứ), facultyId, reason (không blank, <=500). phone/citizenId tùy chọn <=255. Email trim/lowercase; CCCD bỏ khoảng trắng. Khoa phải active/chưa xóa; trùng email/CCCD bị từ chối, trùng tên + ngày sinh chỉ cảnh báo.

Luồng: kiểm tra role → kiểm tra trùng/khoa → cấp mã `GV000001` qua sequence DB (không tự suy số kế tiếp ở FE) → tạo User LECTURER + hồ sơ ACTIVE + audit trong transaction → commit → gửi email → cập nhật notification. Response `{lecturer, warnings, notificationStatus, notificationError}`. **Không nhận lecturerCode/password/User ID do FE đặt.**

**21 — Resend:** gửi lại thông báo cho tài khoản đã tạo, không reset password. Có thể trả FAILED với `ACCOUNT_NOT_AVAILABLE`, `INITIAL_PASSWORD_NO_LONGER_VALID`, `ACCOUNT_ALREADY_ACTIVATED`, `ACCOUNT_EMAIL_MISSING` hoặc `EMAIL_SEND_FAILED`. FE giữ hồ sơ và hiển thị kết quả gửi. Không có PUT/PATCH/DELETE giảng viên trong source hiện tại.

## 7. Học phần và tiên quyết

Nguồn: [SubjectController](../src/main/java/com/eduhub/edu_hub/curriculum/api/controller/SubjectController.java), [SubjectApplicationService](../src/main/java/com/eduhub/edu_hub/curriculum/application/SubjectApplicationService.java), [CurriculumExceptionHandler](../src/main/java/com/eduhub/edu_hub/curriculum/api/exception/CurriculumExceptionHandler.java).

| STT | Method | URL | Request | Data | HTTP | Quyền thực tế |
|---|---|---|---|---|---|---|
| 22 | GET | `/api/v1/subjects` | Query `SubjectSearchRequest` | `PageResponse<SubjectResponse>` | 200 | Token hợp lệ |
| 23 | GET | `/api/v1/subjects/{id}` | Không body | `SubjectResponse` | 200 | Token hợp lệ |
| 24 | POST | `/api/v1/subjects` | `CreateSubjectRequest` | `SubjectResponse` | 201 | Token hợp lệ |
| 25 | PUT | `/api/v1/subjects/{id}` | `UpdateSubjectRequest` | `SubjectResponse` | 200 | Token hợp lệ |
| 26 | POST | `/api/v1/subjects/{id}/deactivate` | `SubjectActionRequest` | `SubjectResponse` | 200 | Token hợp lệ |
| 27 | DELETE | `/api/v1/subjects/{id}` | **Body `SubjectActionRequest`** | Không có | 200 | Token hợp lệ |
| 28 | POST | `/api/v1/subjects/{id}/prerequisites` | `SetPrerequisiteRequest` | `SubjectResponse` | 200 | Token hợp lệ |

Các API này **chưa có kiểm tra role riêng**, nhưng vẫn qua filter xác thực chung.

### 7.1. Search và response

**22 — Query:** keyword (mã hoặc tên), subjectCode (một phần mã), subjectName (một phần tên), credits (nguyên >=1, khớp chính xác), status (ACTIVE/INACTIVE), withoutPrerequisites (mặc định false), page, size.

`withoutPrerequisites=true` chỉ lấy môn không còn liên kết tiên quyết tới môn chưa xóa; false là không áp dụng tiêu chí này. Tìm chuỗi con, trim/không phân biệt hoa thường, sort ID tăng dần. Service này chưa escape wildcard %/_ trong chuỗi tìm kiếm như room/module-class.

**23 — Detail:** ID chưa xóa; không thấy trả `404/4201`. Đọc hai chiều quan hệ trực tiếp từ `subject_prerequisites`. Response:

~~~json
{
  "id": 10,
  "subjectCode": "CS102",
  "subjectName": "Lập trình hướng đối tượng",
  "credits": 3,
  "description": "Nội dung học phần",
  "status": "ACTIVE",
  "prerequisites": [
    {"id": 1, "subjectCode": "CS101", "subjectName": "Lập trình cơ bản", "credits": 3}
  ],
  "requiredBy": []
}
~~~

`prerequisites` là các môn phải học trước môn đang xem; `requiredBy` là các môn cần môn đang xem làm tiên quyết. Chỉ là quan hệ **trực tiếp**, không phải toàn bộ chuỗi tổ tiên. Môn INACTIVE vẫn có thể xuất hiện trong quan hệ đọc nếu chưa xóa mềm.

### 7.2. Tạo và sửa

**24 — POST:**

~~~json
{
  "subjectCode": "FE_DEMO_101",
  "subjectName": "Học phần demo",
  "credits": 3,
  "description": "Mô tả tùy chọn"
}
~~~

Mã/tên không blank, credits nguyên 1–5. Service kiểm tra trùng mã/tên → tạo ACTIVE, hai danh sách quan hệ rỗng → lưu DB → map DTO. Trùng trả `409/4205` hoặc `409/4206`. So trùng chính xác, chưa chuẩn hóa trim/hoa thường khi tạo; unique DB bao gồm bản ghi đã xóa. Chưa có handler riêng cho tình huống trùng do ghi đồng thời của module này, nên FE vẫn cần xử lý lỗi 500 chung.

**25 — PUT:** bắt buộc subjectName và credits 1–5; description tùy chọn.

~~~json
{
  "subjectName": "Học phần demo cập nhật",
  "credits": 4,
  "description": null
}
~~~

Service yêu cầu môn ACTIVE/chưa xóa, giữ ID/mã/trạng thái/quan hệ, kiểm tra trùng tên loại trừ chính ID rồi lưu. **Bỏ hoặc null description sẽ xóa mô tả cũ.** Có thể bỏ subjectCode; nếu gửi thì phải bằng mã hiện tại, khác trả `409/4208`. Môn INACTIVE trả `409/4207`.

**Giới hạn BE:** sửa tín chỉ chưa kiểm tra đã có điểm/lớp đang mở; không quảng bá ràng buộc đó là đã được bảo đảm.

### 7.3. Ngừng dùng và xóa mềm

**26/27 — Cả hai cần body:**

~~~json
{
  "reason": "Không còn sử dụng trong chương trình mới",
  "confirmed": true
}
~~~

reason không blank; **confirmed phải true**, thiếu/false trả `400/4209`. Luồng: xác nhận → tìm môn chưa xóa → tìm môn ACTIVE còn cần nó làm tiên quyết → nếu có thì `409/4204` kèm `errors[].field="requiredBy"` và mã/tên môn phụ thuộc → nếu không thì đổi trạng thái/xóa mềm.

Ngừng dùng đổi status=INACTIVE và vẫn xem được. Xóa đặt deleted=true, không xóa vật lý hoặc dây chuyền dữ liệu lịch sử; GET sau đó trả 404. Không có endpoint activate/restore học phần.

**Giới hạn BE:** chưa chặn xóa dựa trên toàn bộ lớp đã mở/điểm. Luồng mở lớp ở scheduling đã yêu cầu môn ACTIVE/chưa xóa, nhưng không đồng nghĩa chiều xóa/sửa của curriculum đã kiểm tra đầy đủ lịch sử.

### 7.4. Thiết lập tiên quyết

**28 — Request là TOÀN BỘ tập tiên quyết sau khi lưu:**

~~~json
{
  "prerequisiteSubjectIds": [1, 2]
}
~~~

- ID môn đích nằm trên URL. Không gửi `subjectId` trong body.
- `[]` gỡ hết; bỏ field/null, phần tử null hoặc ID <=0 là lỗi.
- Môn đích phải ACTIVE/chưa xóa; các tiên quyết trong danh sách cũng phải ACTIVE/chưa xóa.
- ID lặp được khử trùng. ID cũ bị bỏ khỏi danh sách được gỡ mềm.
- Service khóa đồ thị học phần theo ID → kiểm tra tự tham chiếu/chu trình trên trạng thái sau thay đổi → chỉ sau khi hợp lệ mới lưu cạnh và cập nhật DTO.
- Tự chọn môn đích làm tiên quyết: `400/4210`. Tiên quyết INACTIVE: `400/4211`. Có chu trình: `400/4203`, message có đường đi mã môn.
- **Thay đổi không hồi tố điểm/đăng ký đã có.** FE nên hiển thị nội dung này trên form xác nhận.

## 8. Kỳ học

Nguồn: [SemesterApplicationService](../src/main/java/com/eduhub/edu_hub/scheduling/application/SemesterApplicationService.java), [SemesterExceptionHandler](../src/main/java/com/eduhub/edu_hub/scheduling/api/exception/SemesterExceptionHandler.java).

| STT | Method | URL | Request | Data | HTTP | Quyền thực tế |
|---|---|---|---|---|---|---|
| 29 | GET | `/api/v1/semesters` | Query `SemesterSearchRequest` | `PageResponse<SemesterResponse>` | 200 | Token hợp lệ |
| 30 | GET | `/api/v1/semesters/{id}` | Không body | `SemesterResponse` | 200 | Token hợp lệ |
| 31 | POST | `/api/v1/semesters` | `CreateSemesterRequest` | `SemesterResponse` | 201 | Token hợp lệ |
| 32 | PUT | `/api/v1/semesters/{id}` | `UpdateSemesterRequest` | `SemesterResponse` | 200 | Token hợp lệ |

**29 — Search:** keyword tìm mã/tên, status=UPCOMING/ONGOING/ENDED, page/size. Trim/không phân biệt hoa thường, escape wildcard. Sort `startDate DESC, id DESC`.

**30 — Detail:** đọc kỳ chưa xóa, tính status theo ngày VN. Không thấy `404/4305`.

`SemesterResponse` gồm **`id, semesterCode, semesterName, startDate, endDate, registrationStart, registrationEnd, status, isLocked, lockedGrade`**. Không có `registrationStatus` hoặc boolean “đang mở đăng ký”. UPCOMING/ONGOING/ENDED chỉ nói về **thời gian học**, không nói về đăng ký.

**31/32 — POST và PUT đều cần đủ 5 field chính:**

~~~json
{
  "semesterName": "Học kì 1 năm học 2028-2029",
  "startDate": "2028-08-11",
  "endDate": "2029-01-05",
  "registrationStart": "2028-08-01",
  "registrationEnd": "2028-08-10"
}
~~~

Đây là ví dụ cấu trúc; vẫn có thể xung đột nếu DB đã có kỳ cùng thời gian.

- **Tên phải đúng `Học kì <số kỳ dương> năm học YYYY-YYYY`**, dùng chữ `kì`, số kỳ không có 0 ở đầu, hai năm liên tiếp, năm đầu >0. BE trim hai đầu, không tự sửa các phần tên sai.
- BE sinh mã `HK_1_2028_2029`, đổi tên thì đổi mã theo; không gửi semesterCode/status/isLocked/lockedGrade vào form.
- Bắt buộc **`registrationStart < registrationEnd < startDate < endDate`**, không cho bằng nhau.
- Kiểm tra trùng tên và chồng lấn riêng khoảng học/đăng ký với các kỳ chưa xóa. Hai đầu mút tính trong khoảng, chung một ngày cũng xung đột. Các lỗi có thể kèm `errors.field=studyPeriod` hoặc `registrationPeriod`.
- POST tạo cờ khóa false. PUT giữ cờ khóa; chưa có API đổi cờ.
- Kỳ ENDED chỉ xem, PUT trả `409/4312` dựa trên endDate đang lưu.
- UPCOMING: hôm nay trước startDate; ONGOING: startDate <= hôm nay <= endDate; ENDED: hôm nay sau endDate.

**31 — Luồng tạo:** chuẩn hóa tên/kiểm tra ngày → trùng tên/chồng lấn → sinh mã → saveAndFlush → DTO. Unique/exclusion constraint DB tiếp tục chống ghi đồng thời.

**32 — Luồng cập nhật:** khóa hàng kỳ → chặn kỳ kết thúc → kiểm tra dữ liệu mới/trùng/chồng lấn → kiểm tra cần xác nhận đổi ngày → cập nhật và flush.

Nếu đổi **startDate hoặc endDate** của kỳ có bất kỳ lớp khác CANCELLED (kể cả lớp đã soft delete), trả **`409/4320`**. FE hiển thị cảnh báo, sau khi đồng ý gửi lại **đủ request cũ** kèm:

~~~json
{
  "semesterName": "Học kì 1 năm học 2028-2029",
  "startDate": "2028-08-12",
  "endDate": "2029-01-05",
  "registrationStart": "2028-08-01",
  "registrationEnd": "2028-08-10",
  "confirmDateChange": true
}
~~~

Chỉ sửa tên hoặc khoảng đăng ký không yêu cầu cờ này. **Không tự bật cờ trước khi người dùng xác nhận.** Service cập nhật kỳ hiện chưa kiểm tra isLocked như luồng mở/sửa/hủy lớp; chưa kiểm tra lịch đã xếp có nằm trong khoảng ngày mới. Chưa có API xóa kỳ hoặc lock/unlock kỳ.

## 9. Lớp học phần

Nguồn: [ModuleClassController](../src/main/java/com/eduhub/edu_hub/scheduling/api/controller/ModuleClassController.java), [ModuleClassApplicationService](../src/main/java/com/eduhub/edu_hub/scheduling/application/ModuleClassApplicationService.java), [FacadeAcademicPlanningDataSource](../src/main/java/com/eduhub/edu_hub/scheduling/infrastructure/FacadeAcademicPlanningDataSource.java), [FacadeModuleClassEnrollmentQuery](../src/main/java/com/eduhub/edu_hub/scheduling/infrastructure/FacadeModuleClassEnrollmentQuery.java).

| STT | Method | URL | Request | Data | HTTP | Tình trạng |
|---|---|---|---|---|---|---|
| 33 | GET | `/api/v1/semesters/{semesterId}/opening-subjects` | Không body | `OpeningSubjectResponse[]` | 200 | Có route; phụ thuộc nguồn lịch sử |
| 34 | GET | `/api/v1/module-classes` | Query `ModuleClassSearchRequest` | `PageResponse<ModuleClassResponse>` | 200 | Đã có |
| 35 | GET | `/api/v1/module-classes/{id}` | Không body | `ModuleClassResponse` | 200 | Đã có |
| 36 | POST | `/api/v1/semesters/{semesterId}/module-classes/batch` | `CreateModuleClassesRequest` | `ModuleClassResponse[]` | 201 | Đã có, không phụ thuộc gợi ý |
| 37 | PATCH | `/api/v1/module-classes/{id}` | `UpdateModuleClassRequest` | `ModuleClassResponse` | 200 | Đã có |
| 38 | POST | `/api/v1/module-classes/{id}/cancel` | `CancelModuleClassRequest` | `ModuleClassResponse` | 200 | Có route; thiếu nguồn kiểm tra Enrollment |

Cả sáu API cần token hợp lệ, chưa kiểm tra role riêng.

### 9.1. Gợi ý môn cần mở

**33 — Luồng:** tìm kỳ → chặn kỳ đã kết thúc/isLocked → People lấy SV STUDYING/chưa xóa → Curriculum map ngành–khóa–hệ sang CTĐT → Enrollment lấy lịch sử → tính nhu cầu môn REQUIRED còn hoạt động → đếm lớp chưa hủy đã có trong kỳ → DTO.

**Trạng thái nguồn hiện tại:**

- Runtime đọc People/Curriculum thật qua facade ở mọi profile. **Không còn runtime DEV_FIXTURE**, JSON fixture chỉ nằm trong test.
- Nếu không có sinh viên cần lập kế hoạch, adapter có thể trả snapshot rỗng và API trả 200/list rỗng.
- Nếu có SV mà thiếu năm nhập học/mapping CTĐT/lịch sử đầy đủ, hoặc chưa có Enrollment.Planning bean, trả **503/4317**.
- Thống kê chỉ hỗ trợ mã HK_1/HK_2 và năm liên tiếp; kỳ 3 có thể tạo hợp lệ nhưng không hỗ trợ tính nhu cầu, trả `400/4319` sau khi qua các bước nguồn dữ liệu trước đó.

`OpeningSubjectResponse`: `subjectId, subjectCode, subjectName, credits, onTimeStudentCount, retakeStudentCount, missedStudentCount, expectedStudentCount, recommendedClassCount, existingClassCount, dataSource, historyComplete`.

Công thức kỳ chương trình: `k = 2 × (năm đầu năm học được chọn − năm nhập học) + số kỳ`. Có COMPLETED hoặc REGISTERED trước/đến kỳ đích thì loại; đúng kỳ khi recommendSemester=k; học lại khi khác kỳ và có FAILED; bỏ lỡ khi recommendSemester<k và chưa từng có lần học. DROPPED không được hiểu là chưa từng đăng ký. Bỏ lịch sử sau kỳ đích, khử trùng SV theo môn. Không loại SV chỉ vì chưa có User hoặc quá năm kết thúc dự kiến.

`recommendedClassCount = ceil(expectedStudentCount / 80)`, **chưa trừ sức chứa lớp đã mở**. `existingClassCount` đếm mọi lớp khác CANCELLED, kể cả lớp soft delete. Không dùng thống kê này như kiểm tra đủ điều kiện đăng ký của từng SV.

### 9.2. Search, detail và response

**34 — Query:** keyword (chỉ mã lớp), semesterId, subjectId, lecturerId, status, page, size. Các ID query phải >0, status=UNSCHEDULED/SCHEDULED/OPEN/CANCELLED. Keyword trim/không phân biệt hoa thường/escape wildcard; sort ID giảm dần. Lớp CANCELLED vẫn hiện nếu không lọc status; lớp đã xóa mềm bị loại.

**35 — Detail:** tìm lớp chưa xóa → đọc học phần qua Curriculum, gồm thông tin môn lịch sử → nếu có lecturerId thì lấy tên giảng viên qua People, không lọc mất giảng viên INACTIVE → map DTO. Không thấy `404/4301`.

`ModuleClassResponse` gồm:

| Nhóm | Field |
|---|---|
| ID/liên kết | `id, semesterId, subjectId, lecturerId` |
| Mã/tên | `moduleClassCode, classSequence, subjectCode, subjectName, credits, lecturerName, semesterCode` |
| Vận hành | `maxCapacity, currentSize, status, schedules, dataSource` |

**`lecturerId/lecturerName` nullable. `schedules` hiện LUÔN được mapper trả `[]`, chưa đọc bảng lịch.** Không dùng `[]` để kết luận DB không có lịch. `dataSource` hiện là `DATABASE`.

### 9.3. Mở nhiều lớp trong một lô

**36 — Request:**

~~~json
{
  "subjects": [
    {
      "subjectId": 1,
      "confirmAdditionalClasses": false,
      "classes": [
        {"maxCapacity": 80},
        {"maxCapacity": 50},
        {}
      ]
    }
  ]
}
~~~

Ví dụ này tạo 3 lớp cho subjectId=1, sức chứa lần lượt 80/50/80. `semesterId` lấy trên URL.

- subjects và classes không được rỗng/null, không chứa phần tử null; subjectId >0, mỗi môn xuất hiện **một lần trong lô**.
- `maxCapacity` chỉ nhận JSON integer 1–80; **bỏ field mặc định 80**, gửi null/chuỗi/boolean/`80.0`/`10.5` bị từ chối. Dữ liệu từ input HTML cần chuyển thành number trước khi stringify.
- Không nhận/phân công lecturerId/roomId/schedule/status trong DTO này.
- Service khóa kỳ → chặn kỳ đã qua endDate hoặc isLocked → yêu cầu mọi môn ACTIVE/chưa xóa qua Curriculum → kiểm tra môn đã có lớp → cấp STT/mã → lưu cả lô trong **một transaction**.
- Kỳ có thể hết thời gian đăng ký của SV mà admin vẫn mở lớp được; điều kiện hiện là chưa kết thúc/chưa khóa.
- Môn có lớp chưa hủy yêu cầu `confirmAdditionalClasses=true`. Nếu chưa xác nhận, cả lô trả **409/4313**, `errors` chỉ vị trí `subjects[i].subjectId`, **chưa tạo một phần lô**.
- Sau khi người dùng đồng ý, gửi lại toàn bộ lô với cờ true trên những môn cần mở thêm. Không tự bật cờ khi retry.
- Mã `MC_<semesterId>_<subjectCode>_<STT tối thiểu 3 chữ số>`, STT lấy cả lịch sử hủy/soft delete, không tái cấp. Mã/STT không do FE tạo.
- Lớp mới: `UNSCHEDULED`, `currentSize=0`, lecturerId/lecturerName=null, schedules=[].
- **Có thể mở lớp bằng môn từ `GET /subjects?status=ACTIVE` dù API gợi ý 33 đang 503.** Không bắt buộc gọi thành công gợi ý trước khi POST lô.

### 9.4. Sửa sức chứa và hủy

**37 — PATCH chỉ thay sức chứa:**

~~~json
{
  "maxCapacity": 60,
  "reason": "Điều chỉnh quy mô lớp"
}
~~~

Cả hai bắt buộc, reason không blank, maxCapacity JSON integer 1–80 và không nhỏ hơn currentSize. Service khóa kỳ rồi lớp → kiểm tra kỳ chưa kết thúc/chưa khóa, lớp chưa CANCELLED → kiểm tra sức chứa → lưu và trả DTO. Mã/môn/kỳ/giảng viên/status giữ nguyên. Nhỏ hơn sĩ số trả `409/4322` kèm field=maxCapacity. **Chưa kiểm tra đầy đủ tương thích với phòng đã xếp khi tăng sức chứa lớp.**

**38 — Cancel:**

~~~json
{
  "reason": "Không đủ nhu cầu mở lớp"
}
~~~

Cùng điều kiện kỳ/lớp và thứ tự khóa với PATCH. currentSize >0 bị chặn `409/4323`. Sĩ số 0 vẫn phải kiểm tra nguồn lịch sử đầy đủ xác nhận chưa có **bất kỳ Enrollment** nào, kể cả DROPPED/đã xóa mềm. Có lịch sử trả `409/4323`, có thể kèm `enrollmentCount/studentCount`.

**Hiện chưa có implementation Enrollment.Planning nên lớp sĩ số 0 thường trả `503/4325`, không được suy là hủy được.** Khi nguồn đầy đủ và không có lịch sử, chỉ chuyển status=CANCELLED, vẫn xem được, giữ mã/STT và bản ghi. PATCH/cancel lại lớp CANCELLED trả `409/4321`. Chưa có API khôi phục/xóa/chuyển lớp; chưa nối xử lý ngừng hiệu lực lịch trong cùng transaction hủy lớp.

## 10. Phòng học

Nguồn: [RoomApplicationService](../src/main/java/com/eduhub/edu_hub/scheduling/application/RoomApplicationService.java), [RoomScheduleSpecification](../src/main/java/com/eduhub/edu_hub/scheduling/application/specification/RoomScheduleSpecification.java). Tài liệu nghiệp vụ bổ sung: [ROOM_MANAGEMENT.md](ROOM_MANAGEMENT.md).

| STT | Method | URL | Request | Data | HTTP | Quyền thực tế |
|---|---|---|---|---|---|---|
| 39 | GET | `/api/v1/rooms` | Query `RoomSearchRequest` | `PageResponse<RoomResponse>` | 200 | Token hợp lệ |
| 40 | GET | `/api/v1/rooms/{id}` | Không body | `RoomResponse` | 200 | Token hợp lệ |
| 41 | POST | `/api/v1/rooms` | `CreateRoomRequest` | `RoomResponse` | 201 | Token hợp lệ |
| 42 | PUT | `/api/v1/rooms/{id}` | `UpdateRoomRequest` | `RoomResponse` | 200 | Token hợp lệ |
| 43 | PATCH | `/api/v1/rooms/{id}/status` | `ChangeRoomStatusRequest` | `RoomResponse` | 200 | Token hợp lệ |
| 44 | DELETE | `/api/v1/rooms/{id}` | **Không body** | Không có | 200 | Token hợp lệ |

Chưa kiểm tra role riêng, chưa có audit/log nghiệp vụ phòng theo quyết định MVP hiện tại.

### 10.1. Search/detail

**39 — Query:** keyword, buildingCode, campus, status, minCapacity, page, size. Keyword tìm mã/tên/cơ sở/tòa/số phòng, trim/không phân biệt hoa thường/escape wildcard. campus/buildingCode khớp chính xác sau chuẩn hóa IN HOA. status=ACTIVE/INACTIVE, minCapacity nguyên >=1. Sort campus/buildingCode/roomNumber/id tăng dần, **số phòng sắp theo chuỗi**. Không gửi status thì lấy cả ACTIVE/INACTIVE chưa xóa.

**40 — Detail:** không thấy/đã xóa trả `404/4326`. `RoomResponse` gồm **`id, roomCode, roomName, campus, buildingCode, roomNumber, capacity, status`**. **Không có roomType**.

### 10.2. Tạo/sửa phòng

**41/42 — Request:**

~~~json
{
  "roomCode": "102-TA1",
  "roomName": "Phòng học 102",
  "campus": "CS1",
  "buildingCode": "TA1",
  "roomNumber": "102",
  "capacity": 100
}
~~~

| Field | Bắt buộc | Quy tắc |
|---|---|---|
| roomCode | Có | <=50, dạng `[0-9]+-[A-Za-z0-9]+`, trim/IN HOA |
| roomName | Có | Không blank, <=255, trim |
| buildingCode | Có | Không blank, <=50, IN HOA, khớp phần sau dấu - trong mã |
| campus | Không | <=100; bỏ/null/blank lưu `""`, có giá trị thì trim/IN HOA |
| roomNumber | Không | <=50; bỏ/null suy phần trước dấu -; có gửi phải không blank và khớp mã |
| capacity | Có | JSON integer 1–2147483647; **không giới hạn 80 như lớp học phần** |

Sai tòa/số phòng so với mã trả `400/1001` với `errors` tương ứng. Mã phòng unique toàn hệ thống; vị trí (campus, buildingCode, roomNumber) cũng unique; không tái sử dụng mã/vị trí bản ghi đã xóa. Cùng mã phòng ở cơ sở khác vẫn có thể bị trùng mã toàn hệ thống.

**41 — Create:** chuẩn hóa/validate → kiểm tra trùng mã/vị trí → lưu ACTIVE bằng saveAndFlush → DTO. Trùng trả `409/4327` hoặc `409/4328`.

**42 — PUT phải gửi đủ field bắt buộc**, giữ ID/status/ngày tạo, sửa được cả phòng INACTIVE. Bỏ campus nghĩa là chuyển về cơ sở chưa khai báo, không phải giữ giá trị cũ. Luồng chuẩn hóa → khóa phòng → kiểm tra trùng → nếu giảm sức chứa thì kiểm tra các lớp bị ảnh hưởng → lưu.

### 10.3. Đổi trạng thái/xóa và ràng buộc lịch

**43 — PATCH:** `{"status":"INACTIVE"}` để ngừng dùng, ACTIVE để đưa vào dùng lại. Gửi trạng thái hiện tại thành công, không cập nhật lại timestamp.

**44 — DELETE:** không reason, không confirmed, không body. Khóa phòng → kiểm tra còn lịch đang dùng → đặt deleted=true, giữ Room và FK lịch sử. Response thành công không có data. Gọi GET hoặc DELETE lại bản ghi đã xóa trả 404.

**Hai ràng buộc quan trọng:**

- **A2 — `409/4330`:** chặn INACTIVE/xóa nếu phòng có lịch chưa xóa của lớp chưa xóa/chưa CANCELLED, kỳ chưa xóa và endDate >= hôm nay VN. Ngày cuối kỳ vẫn tính; không chỉ dựa vào ngày kết thúc từng dòng lịch.
- **A3 — `409/4331`:** khi giảm sức chứa, không được nhỏ hơn **maxCapacity của lớp** trong cùng tập lịch. Không so với currentSize. Bằng maxCapacity được phép.

Lỗi liệt kê lớp ở `errors`:

~~~json
{
  "success": false,
  "code": 4331,
  "message": "Sức chứa phòng nhỏ hơn sức chứa tối đa của lớp đang xếp",
  "errors": [
    {
      "field": "moduleClasses[20]",
      "message": "MC_7_CS101_001 — Học kì 1 năm học 2026-2027; sức chứa tối đa: 60"
    }
  ],
  "path": "/api/v1/rooms/5",
  "timestamp": "2026-11-05T10:30:00"
}
~~~

FE hiển thị danh sách lớp xung đột, giữ nguyên form cho người dùng sửa. Không tự giảm sĩ số hoặc xóa lịch để vượt lỗi. Kỳ đã kết thúc không chặn A2/A3; lịch sử vẫn giữ. Bảng/entity lịch và trigger kiểm tra phòng đã có, **chưa có endpoint xếp lịch/thời khóa biểu**.

## 11. Mã lỗi cần xử lý

Nguồn: [ErrorCode](../src/main/java/com/eduhub/edu_hub/shared/exception/ErrorCode.java), [GlobalExceptionHandler](../src/main/java/com/eduhub/edu_hub/shared/exception/GlobalExceptionHandler.java) và handler riêng của từng controller. Bảng chỉ tập trung mã liên quan các endpoint hiện có; enum còn chứa mã cho các module chưa có API.

| HTTP | Code | Trường hợp / FE xử lý |
|---|---|---|
| 500 | 1000 | Lỗi hệ thống: hiển thị lỗi chung, không tự lặp thao tác ghi |
| 400 | 1001 | JSON/query/field không hợp lệ; hiển thị errors theo field nếu có |
| 400 | 1002 | Thiếu tham số bắt buộc |
| 405 | 1003 | Sai HTTP method; kiểm tra URL/method, không đổi method để thử ghi |
| 401 | **4000** | Token thiếu/sai/hết hạn/revoked; xóa phiên FE, yêu cầu login |
| 403 | 4001 | Không đủ quyền; giữ phiên, hiển thị bị từ chối |
| 404 | 4002 | Không tìm thấy User |
| 401 | **4003** | Sai username/password hoặc currentPassword; hiển thị tại form, không áp dụng xử lý hết phiên một cách máy móc |
| 403 | 4004 | Tài khoản khóa/khóa tạm/DISABLED trong luồng login |
| 400 | 4007 | Tài khoản chưa có email để reset mật khẩu |
| 502 | 4008 | Gửi email mật khẩu tạm thất bại, reset rollback |
| 404 | 4101 / 4102 | Không có Student / Lecturer, hoặc đã xóa |
| 409 | 4103 / 4104 | Trùng MSSV/username sinh viên hoặc mã/username giảng viên |
| 400 | 4105 | Lớp hành chính đầy |
| 404 | 4106 | Batch nhập học không có hoặc BE đã restart |
| 409 | 4107 | Batch đã confirm |
| 409 | **4108** | Cần xử lý/chấp nhận capacityWarnings; chỉ gửi cờ true sau xác nhận |
| 400 | 4109 / 4110 / 4111 | Dữ liệu ngành/khóa/lớp không đáp ứng định dạng sinh MSSV; cần BE sửa danh mục |
| 409 | 4112 | Hết STT MSSV 01–99 trong lớp |
| 409 | 4113 / 4114 | Trùng email / CCCD sinh viên |
| 400 | 4115 | Ngành/khóa/hệ không khớp lớp hành chính |
| 400 | 4116 | Khoa không có hoặc không active |
| 409 | 4117 / 4118 | Trùng email / CCCD giảng viên |
| 409 | 4119 | Hết dải mã GV 6 chữ số |
| 400 | 4120 | GPA mục tiêu ngoài 0–4 ở kiểm tra service /me; HTTP DTO validation thường trả 1001 |
| 404 | 4201 | Không có học phần hoặc đã xóa |
| 400 | 4203 | Chu trình tiên quyết, message có đường đi |
| 409 | 4204 | Môn còn là tiên quyết của môn ACTIVE; hiển thị errors.requiredBy |
| 409 | 4205 / 4206 | Trùng mã / tên học phần |
| 409 | 4207 | Môn đích INACTIVE, không sửa/thiết lập tiên quyết được |
| 409 | 4208 | Cố thay mã học phần |
| 400 | 4209 | Chưa confirmed thao tác deactivate/delete học phần |
| 400 | 4210 / 4211 | Tự làm tiên quyết / tiên quyết không ACTIVE |
| 404 | 4301 | Không có lớp học phần hoặc đã xóa |
| 400 | 4302 | Kỳ bị khóa, chặn gợi ý/mở/sửa/hủy lớp |
| 404 | 4305 | Không có kỳ học hoặc đã xóa |
| 409 | 4306 | Trùng tên/mã kỳ |
| 400 | 4307 | Tên kỳ/năm không đúng chuẩn |
| 400 | 4308 / 4309 | Khoảng học / khoảng đăng ký sai thứ tự |
| 409 | 4310 / 4311 | Chồng lấn khoảng học / đăng ký; hiển thị kỳ xung đột nếu có |
| 409 | 4312 | Kỳ đã kết thúc |
| 409 | **4313** | Môn đã có lớp, cần confirmAdditionalClasses; gửi lại cả lô sau xác nhận |
| 409 | 4314 | Môn không ACTIVE, không được mở lớp |
| 400 | 4316 | Một môn bị lặp trong lô |
| 503 | **4317** | Nguồn lập kế hoạch thiếu/chưa triển khai; hiển thị “chưa đủ dữ liệu”, không giả danh sách rỗng |
| 409 | 4318 | Trùng mã/STT lớp do constraint; tải lại trước khi người dùng gửi lại |
| 400 | 4319 | Mã kỳ không hỗ trợ tính nhu cầu HK_1/HK_2 |
| 409 | **4320** | Có lớp chưa hủy, cần confirmDateChange khi đổi ngày kỳ |
| 409 | 4321 | Lớp CANCELLED chỉ được xem |
| 409 | 4322 | maxCapacity mới nhỏ hơn currentSize |
| 409 | 4323 | Lớp có sĩ số/lịch sử Enrollment, không được hủy |
| 503 | **4325** | Chưa có nguồn lịch sử theo lớp để xác nhận điều kiện hủy |
| 404 | 4326 | Không có phòng hoặc đã xóa |
| 409 | 4327 / 4328 | Trùng mã phòng / vị trí phòng |
| 400 | 4329 | Sai mẫu roomCode ở kiểm tra service; qua DTO HTTP thường là 1001 |
| 409 | **4330** | Phòng có lịch trong kỳ chưa kết thúc, không được ngừng dùng/xóa |
| 409 | **4331** | Giảm sức chứa phòng thấp hơn maxCapacity lớp, hiển thị lớp bị ảnh hưởng |

**4005 (password policy) và 4006 (first-login) có khai báo trong enum nhưng luồng controller hiện tại không trả chúng cho chính sách đổi mật khẩu hoặc chặn mọi API first-login.** Mật khẩu mới không đạt chính sách trả **400/1001 + errors**. Không viết logic FE chỉ chờ 4005/4006.

Không phải mọi lỗi framework/transport đều bảo đảm theo envelope này: lỗi mạng, reverse proxy hoặc một số lỗi multipart trước controller có thể khác. FE cần fallback đọc HTTP status khi không parse được JSON/envelope. Không dùng fallback đó để che lỗi 503 thành thành công.

## 12. Phần chưa có API và thiếu dữ liệu danh mục

### 12.1. Có trong thiết kế/DTO nhưng CHƯA có controller

**Không gọi những URL dưới đây để ghép FE hiện tại.** Có token không có nghĩa route sẽ hoạt động; status khi gọi nhầm còn phụ thuộc mapping/method/framework, không cam kết luôn 404.

| Chức năng | URL/tính năng dự kiến chưa triển khai |
|---|---|
| Refresh access token | `POST /api/v1/auth/refresh` |
| Student activate/deactivate | `/api/v1/students/{id}/activate`, `/deactivate` |
| Import một bước cũ | `POST /api/v1/students/batch-import`; dùng 3 API admission thực tế |
| Sửa/xóa giảng viên | PUT/PATCH/DELETE `/api/v1/lecturers/{id}` |
| Ngành/khoa/khóa/lớp hành chính | Chưa có REST danh mục tương ứng |
| CTĐT | `GET /api/v1/curriculums`, `GET /api/v1/curriculums/{id}`; hiện mới có facade nội bộ |
| Phân công giảng viên | Chưa có API phân công; `/api/v1/module-classes/lecturers` cũng chưa triển khai |
| Tạo một lớp đơn theo thiết kế cũ | Chưa có POST `/api/v1/module-classes`; dùng batch theo kỳ |
| Xếp lịch | `POST /api/v1/class-schedules` |
| Thời khóa biểu | `GET /api/v1/timetable/student`, `GET /api/v1/timetable/lecturer` |
| Đăng ký/hủy đăng ký học phần | `/api/v1/enrollments/register`, `/{id}/drop`, `/my` |
| Nhập điểm/xem học vụ | `/api/v1/grades/process-score`, `/batch-update`, `/my-summary` |
| AI/chat/knowledge | `/api/v1/ai/*`, `/api/v1/admin/knowledge*` |
| Khóa/mở kỳ, công bố lớp, khôi phục lớp | Chưa có endpoint |
| Khôi phục học phần/phòng đã xóa | Chưa có endpoint |

`TokenResponse`, `LockUserRequest`, `ResetPasswordRequest`, `BatchImportStudentRequest`, `AdministrativeClassResponse`, các DTO CTĐT/Enrollment/Academic/AI hay `CreateClassScheduleRequest` có thể tồn tại trong code nhưng **không tự tạo thành REST endpoint**. Lock User thực tế dùng `LockBody` nội bộ controller, ID ở URL; reset không body.

Actuator là nhóm endpoint hạ tầng do Spring Boot auto-config cung cấp (ví dụ health theo cấu hình môi trường), không phải 44 API nghiệp vụ trong bảng. Không dùng response Actuator như ApiResponse và không đưa vào DTO nghiệp vụ FE. Chưa khai báo springdoc/OpenAPI trong pom hiện tại, không mặc định đã có Swagger `/v3/api-docs`.

### 12.2. Lấy ID để dựng form

**Đây là phần còn thiếu để FE tích hợp form danh mục trọn vẹn.** Tạm thời BE cung cấp danh sách ID/tên hoặc dùng cấu hình dev; về lâu dài cần endpoint danh mục. Các SELECT sau chỉ là truy vấn đọc tham khảo cho người phụ trách BE, **không chạy SQL từ browser**.

Danh sách lớp kèm ngành/khóa/hệ cho form tạo SV:

~~~sql
SELECT c.id AS administrative_class_id,
       c.class_name,
       c.major_id,
       m.major_code,
       m.major_name,
       c.cohort_id,
       h.cohort_code,
       c.training_type,
       c.min_capacity,
       c.max_capacity
FROM administrative_classes c
JOIN majors m ON m.id = c.major_id
JOIN cohorts h ON h.id = c.cohort_id
WHERE NOT c.is_deleted
  AND NOT m.is_deleted
  AND NOT h.is_deleted
ORDER BY h.cohort_code, m.major_code, c.class_name;
~~~

Khoa cho form tạo giảng viên:

~~~sql
SELECT id, faculty_name
FROM faculties
WHERE active AND NOT is_deleted
ORDER BY faculty_name;
~~~

Có thể lấy facultyId từ `GET /lecturers` để demo khi đã có dữ liệu giảng viên, nhưng danh sách đó **không thay thế danh mục khoa đầy đủ**. Không suy majorId/cohortId từ index mảng hoặc hard-code ID của database khác.

### 12.3. Dữ liệu dev và chia sẻ file

Profile mặc định dev; `application-dev.yaml` của workspace hiện có bật `db/migration` + `db/seed`. Seed tạo dữ liệu danh mục và các User test, không bảo đảm ID cố định. Cấu hình dev đang bị ignore bởi Git trong workspace, nên người khác cần kiểm tra cấu hình local thực tế; không chỉ dựa vào mô tả cũ trong FLYWAY.md.

Nếu đã nạp seed `seed_postman_test_accounts`, có các User test `postman_system_admin`, `postman_academic_admin`, `postman_lecturer`, `postman_student` với mật khẩu mẫu **`Postman@123`**. Seed không ghi đè User đã tồn tại, nên mật khẩu có thể đã được đổi. Đây là tài khoản phát triển, không phải thông tin lấy từ .env.

**Các User seed không tự có hồ sơ People.** Login bằng postman_student có thể thành công nhưng `/students/me` vẫn 404. Muốn test /me: tạo SV qua API/import, dùng MSSV làm username và hoàn thành luồng đổi mật khẩu.

Collections có sẵn trong [postman](../postman): Identity, People, Curriculum, Scheduling. Đối chiếu lại với tài liệu này; collection cũ có thể chưa phản ánh toàn bộ phòng học/trạng thái nguồn mới.

**Thư mục `docs/` hiện nằm trong `.gitignore`.** Hai file bàn giao được lưu local đúng thư mục; muốn đưa riêng chúng vào Git có thể dùng:

~~~powershell
git add -f docs/FE_API_INTEGRATION.md docs/fe-api-contract.ts
~~~

Đây là hướng dẫn chia sẻ, không có thao tác stage/commit tự động trong lần tạo tài liệu này.

## 13. Mẫu gọi API và trình tự ghép FE

### 13.1. HTTP helper tham khảo

Copy file TS sang FE, ví dụ `src/api/fe-api-contract.ts`. Kiểu TypeScript giúp kiểm tra lúc viết code, không phải runtime validator. Ví dụ sau dùng fetch, không phụ thuộc Axios và không tự quyết định lưu token vào đâu.

~~~ts
import type {
  ApiError, ApiResponse, ApiSuccess,
  LoginRequest, LoginResponse,
  CreateStudentRequest, CreateStudentResponse,
  AdmissionPreviewResponse, AdmissionConfirmResponse,
  SubjectActionRequest,
} from "./fe-api-contract";
import { API_URLS } from "./fe-api-contract";

const API_ORIGIN = "http://localhost:8080"; // Đưa vào cấu hình môi trường của FE.

class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: ApiError;

  constructor(status: number, payload: ApiError) {
    super(payload.message);
    this.status = status;
    this.payload = payload;
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  token?: string;
  json?: unknown;
  form?: FormData;
};

async function apiRequest<T = void>(
  path: string,
  { token, json, form, ...init }: ApiOptions = {},
): Promise<ApiSuccess<T>> {
  if (form && json !== undefined) {
    throw new Error("Chỉ gửi một trong json hoặc form");
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", "Bearer " + token);
  if (form) {
    headers.delete("Content-Type"); // Browser tự thêm multipart boundary.
  } else if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(API_ORIGIN + path, {
    ...init,
    headers,
    body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
  });

  let payload: ApiResponse<T>;
  try {
    payload = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error("Không đọc được response JSON; HTTP " + response.status);
  }
  if (!payload || typeof payload.success !== "boolean") {
    throw new Error("Response không đúng ApiResponse; HTTP " + response.status);
  }
  if (!payload.success) {
    throw new ApiRequestError(response.status, payload);
  }
  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }
  return payload;
}

function toQuery(values: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const encoded = query.toString();
  return encoded ? "?" + encoded : "";
}

// 1. Login: accessToken nằm ở response.data.
async function login(input: LoginRequest) {
  const response = await apiRequest<LoginResponse>(API_URLS.auth.login, {
    method: "POST",
    json: input,
  });
  return response.data;
}

// 2. Tạo SV: HTTP thành công vẫn phải đọc notificationStatus.
async function createStudent(token: string, input: CreateStudentRequest) {
  const response = await apiRequest<CreateStudentResponse>(API_URLS.students.create, {
    method: "POST",
    token,
    json: input,
  });
  return response.data; // { student, warnings, notificationStatus, notificationError }
}

// 3. Preview Excel: không set Content-Type JSON.
async function previewAdmission(token: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await apiRequest<AdmissionPreviewResponse>(
    API_URLS.students.admissionPreview,
    { method: "POST", token, form },
  );
  return response.data; // Đọc errors/capacityWarnings trước confirm.
}

// 4. DELETE học phần CÓ body.
async function deleteSubject(token: string, subjectId: number, reason: string) {
  const json: SubjectActionRequest = { reason, confirmed: true };
  await apiRequest(API_URLS.subjects.delete(subjectId), {
    method: "DELETE",
    token,
    json,
  });
}

// 5. Confirm chỉ sau khi người dùng đã đọc preview/cảnh báo.
async function confirmAdmission(
  token: string,
  batchId: string,
  acceptMinimumCapacityWarning: boolean,
) {
  const response = await apiRequest<AdmissionConfirmResponse>(
    API_URLS.students.admissionConfirm(batchId),
    { method: "POST", token, json: { acceptMinimumCapacityWarning } },
  );
  return response.data;
}
~~~

Khi gọi danh sách, ghép URL bằng `toQuery({ keyword, page: 0, size: 20 })`. Form số nên dùng `Number(value)` và `Number.isInteger` trước submit; TypeScript number không tự bảo đảm số nguyên hoặc khoảng giá trị.

Khi bắt `ApiRequestError`: `payload.code=4000` mới xử lý phiên hết hiệu lực; `4003` là lỗi thông tin tại form. `1001` hiện field errors, `4108/4313/4320` mở xác nhận có nội dung rồi người dùng chủ động gửi lại. `4317/4325` thông báo chưa đủ nguồn dữ liệu. Các `errors` liên quan danh sách lớp/kỳ hiển thị trong vùng thông báo chung, không ép vào input không tồn tại.

### 13.2. Thứ tự tích hợp đề nghị

1. **Kết nối cơ bản:** cấu hình origin → login → lưu trạng thái phiên theo kiến trúc FE → gửi Bearer → xử lý 4000 và hết hạn 900 giây.
2. **First-login:** điều hướng đổi mật khẩu → xóa token → login lại. Không tạo vòng lặp tự refresh vì chưa có API.
3. **Màn danh sách:** Student/Lecturer/Subject/Semester/Room/ModuleClass; map đúng content/pageNumber/last, lọc và reset page.
4. **Cấp tài khoản:** lấy ID danh mục thật → tạo SV/GV → đọc warnings/notification → hiển thị trạng thái gửi lại. Không giả “tạo thất bại” khi email FAILED.
5. **Hồ sơ cá nhân:** dùng SV đã được tạo và liên kết User; chỉ PATCH targetGpa/phone, thử cả bỏ field và null.
6. **Import:** chọn XLSX → preview → hiển thị lỗi theo dòng và warnings → chỉnh từng lớp nếu cần → confirm tập hợp lệ → đọc emailFailures → tải lại danh sách.
7. **Học phần/kỳ/phòng:** dùng đúng full PUT hay cập nhật từng field theo mô tả; triển khai các hộp xác nhận và hiển thị xung đột.
8. **Mở lớp:** dùng danh mục môn ACTIVE để tạo lô; gợi ý/hủy lớp giữ trạng thái “chưa sẵn sàng” khi thiếu Enrollment, không chặn toàn màn quản lý lớp chỉ vì gợi ý lỗi.
9. **Phần chờ BE:** endpoint danh mục, refresh token nếu cần, Enrollment + lịch sử, phân công/xếp lịch, học vụ/điểm, phân quyền đầy đủ. Chỉ ghép các tính năng này sau khi có controller và hợp đồng mới.

## 14. Phạm vi kiểm chứng

Tài liệu bám source của workspace này, không cam kết binary đang deploy ở máy chủ khác đã cùng phiên bản. Đã rà đủ controller, DTO trực tiếp/lồng nhau, service, adapter facade, query/specification, mã lỗi và handler; phân biệt capability nội bộ với REST công khai.

Kiểm tra bổ sung của lần bàn giao được ghi dưới đây. Các ví dụ JSON dùng ID minh họa, không khẳng định bản ghi tương ứng có trong DB của người chạy. Không khởi động ứng dụng với database trong .env, không gọi API tạo người/confirm/reset password, không gửi email thật và không chạy migration trong lần tạo tài liệu.

### Kết quả kiểm tra trong lần bàn giao

- **Compile source thành công:** mvn -o -DskipTests compile.
- **115 test đạt, 0 lỗi, 0 bỏ qua** trong 8 lớp test controller/validation/exception hiện có: SubjectControllerTest, SemesterControllerTest, ModuleClassControllerTest, RoomControllerTest, MyStudentProfileControllerTest, StudentControllerAdmissionTest, GlobalExceptionHandlerTest, CurriculumExceptionHandlerTest.
- Đối chiếu tự động **đủ 44 cặp method + URL** từ 9 controller với cả bảng tài liệu và hằng URL TypeScript, không có route thiếu/thừa.
- Kiểm tra serialization bằng Jackson trên DTO đã biên dịch; **49 tập field DTO** trùng file TypeScript sau khi tính kế thừa/alias và hai tham số page/size riêng của controller People. Xác nhận last, firstLogin, isLocked và envelope bỏ field null.
- File TypeScript nạp được bằng Node 24 hỗ trợ TypeScript; đã kiểm tra cú pháp/runtime của 44 hằng/hàm URL. Đây không phải lần chạy toàn bộ static type-check/build của dự án FE.
- **25 ví dụ JSON** parse hợp lệ; đường dẫn tài liệu/source/file mẫu và các code fence đã được kiểm tra.
- Chưa chạy kiểm thử HTTP end-to-end trên môi trường BE/FE của nhóm; các test controller dùng mock không chứng minh toàn bộ luồng database/email đã hoạt động. Các giới hạn nghiệp vụ và dependency thiếu được nêu ngay ở từng endpoint.
