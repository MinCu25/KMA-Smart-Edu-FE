# REST API và tích hợp Frontend

Đối chiếu source ngày 10/11/2026. Đây là tài liệu REST chính thức; [fe-api-contract.ts](fe-api-contract.ts) cung cấp kiểu request/query/response và URL tương ứng, không tự gửi request hoặc lưu token. Facade nội bộ/DTO có sẵn không tự tạo REST endpoint. Quy trình nhập học và notification chỉ mô tả chi tiết tại hai tài liệu nghiệp vụ.

## 1. Xác thực và quy ước chung

**Trạng thái source hiện tại:** [SecurityConfig](../src/main/java/com/eduhub/edu_hub/identity/infrastructure/config/SecurityConfig.java) dùng OAuth2 Resource Server với Nimbus HS256. POST /api/v1/auth/login và OPTIONS công khai. POST change-password/logout yêu cầu JWT đã xác thực; các API /api/v1/** còn lại yêu cầu JWT thông thường (token_use=ACCESS). JWT first-login (token_use=PASSWORD_CHANGE) chỉ dùng hai API đổi mật khẩu/đăng xuất; gọi API nghiệp vụ trả 403/4006, bỏ token trả 401/4000. Chưa phân quyền theo role. Ngoài /api/v1/** vẫn permitAll, bao gồm đường xử lý lỗi/hạ tầng.

Logout/change-password, admin/users, students/me, POST students/lecturers và PUT students/{id}/lecturers/{id} nhận Jwt từ SecurityContext qua AuthenticationPrincipal, không cắt header hoặc giải mã lại JWT. Các kiểm tra User/phiên DB là quy tắc riêng, không do JwtDecoder thực hiện. Service vẫn chặn principal null; GET/PATCH students/me, POST students/lecturers và PUT students/{id}/lecturers/{id} kiểm tra người thực hiện là User ACTIVE/chưa xóa/không khóa tạm, phiên đúng chủ sở hữu/chưa revoke/còn hạn qua IdentityFacade. PUT xác định hồ sơ đích bằng Student ID hoặc Lecturer ID trên URL, khác User ID của người thực hiện.

FE gửi Authorization: Bearer <accessToken> sau login. Mặc định access token 900 giây, refresh token 7 ngày; thời hạn có thể cấu hình, FE dùng expiresIn của response. Có refreshToken nhưng chưa có REST refresh; access token hết hạn cần đăng nhập lại. JWT giữ sub=username, uid=User ID, sid=ID bản ghi refresh token, token_use; chỉ JWT ACCESS có claim role. Resource Server kiểm tra chữ ký/hạn/mục đích JWT, không tra phiên database; principal Bearer là Jwt, khác CustomUserDetail của xác thực mật khẩu. JWT theo định dạng cũ thiếu token_use không còn hợp lệ sau cập nhật này, cần đăng nhập lại. /students/me xác định hồ sơ bằng User ID trong token; User ID, Student ID và Lecturer ID khác nhau.

| Nội dung | Contract |
|---|---|
| Origin / base path | Local mặc định http://localhost:8080; API_URLS đã gồm /api/v1, không cộng prefix lần hai |
| JSON / upload | application/json; FormData để browser tự đặt multipart boundary |
| ID | JSON number của Java Long; không thay ID bằng mã ngành/MSSV. JS number không bảo đảm chính xác mọi Long lớn |
| Ngày / timestamp | yyyy-MM-dd giữ nguyên ngày; LocalDateTime ISO không có Z, main chạy UTC. Ngày nghiệp vụ kỳ/phòng/lớp theo Asia/Ho_Chi_Minh |
| Enum / số | Enum IN HOA; số JSON number. Các field integer nghiêm ngặt như capacity không nhận string, boolean, null hay token JSON thập phân |
| Phân trang | page=0, size=20, page>=0/size>=1; sort cố định theo từng service; đổi filter đưa page về 0 |
| CORS | MVC cho origin pattern/header và GET/POST/PUT/PATCH/DELETE/OPTIONS theo cấu hình; token trong header, chưa có luồng cookie login |

Mọi bảng dưới đây ghi kiểu của body.data; JSON bọc ApiResponse. Riêng tải mẫu XLSX trả bytes với MIME application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, không bọc JSON.

```json
{"success":true,"message":"Success","data":{"id":1},"timestamp":"2026-11-08T10:30:00"}
```

```json
{"success":false,"code":1001,"message":"Dữ liệu đầu vào không hợp lệ","errors":[{"field":"email","message":"Email không hợp lệ"}],"path":"/api/v1/students","timestamp":"2026-11-08T10:30:00"}
```

Envelope lược field null: success thường không có code/errors/path; Void không có data. DTO nghiệp vụ vẫn có thể chứa null. HTTP status khác mã nghiệp vụ; không kiểm tra code=200 hoặc so message để quyết định thành công. errors có thể vắng mặt, field có thể là subjects[0].subjectId hoặc moduleClasses[20]. Lỗi mạng/proxy/multipart ngoài controller có thể không theo envelope, cần fallback.

PageResponse gồm content, pageNumber, pageSize, totalElements, totalPages, **last**. Trang rỗng vẫn HTTP 200. JSON UserInfoResponse là **firstLogin**, SemesterResponse là **isLocked**. Search sinh viên/giảng viên trả message không tìm thấy kết quả khi content rỗng; khi có dữ liệu thì lược field message. FE đọc content để xác định kết quả, không phụ thuộc message luôn có trong response thành công.

## 2. Identity

Nguồn: [AuthController](../src/main/java/com/eduhub/edu_hub/identity/api/controller/AuthController.java), [AdminUserController](../src/main/java/com/eduhub/edu_hub/identity/api/controller/AdminUserController.java).

Controller truyền trực tiếp request DTO và trả response DTO. Lỗi nghiệp vụ do IdentityAuthenticationException/IdentityAccountException biểu diễn; IdentityExceptionHandler trong api.exception xử lý cho các controller Identity. PasswordValidationException giữ errors theo field và trả 400/1001; controller không chứa ExceptionHandler. Các mã lỗi/JSON bên dưới không thay đổi do chuyển type Java.

Đổi mật khẩu kiểm tra User ACTIVE/chưa xóa, khóa tạm và refresh token cùng User chưa revoke/còn hạn; khóa User theo uid trong transaction cập nhật. Quản trị tài khoản và IdentityFacade.requireCurrentUser dùng chung CurrentUserAuthenticationService để đối chiếu uid/username, User ACTIVE/chưa xóa/không khóa tạm và phiên đúng chủ sở hữu/chưa revoke/còn hạn. Principal thiếu hoặc không đạt điều kiện trả 401/4000. Không suy rằng JwtDecoder đã kiểm tra các điều kiện database này.

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| POST | /api/v1/auth/login | LoginRequest | LoginResponse | 200 |
| POST | /api/v1/auth/logout | LogoutRequest + Bearer header | Void | 200 |
| POST | /api/v1/auth/change-password | ChangePasswordRequest + Bearer header | Void | 200 |
| GET | /api/v1/admin/users | SearchUserAccountsRequest (query) + Bearer header | `PageResponse<UserAccountSummaryResponse>` | 200 |
| GET | /api/v1/admin/users/{userId} | Không body, Bearer header | UserAccountDetailResponse | 200 |
| POST | /api/v1/admin/users/{userId}/lock | LockUserRequest + Bearer header | Void | 200 |
| POST | /api/v1/admin/users/{userId}/unlock | Không body, Bearer header | Void | 200 |
| POST | /api/v1/admin/users/{userId}/reset-password | Không body, Bearer header | Void | 200 |

- Login nhận username/password không blank, không tự trim/đổi hoa thường; AuthenticationManager/DaoAuthenticationProvider xác thực qua BCrypt. Tải User/Role có khóa hàng, giữ transaction đến khi ghi bộ đếm và tạo phiên hoàn tất. LoginResponse giữ accessToken, refreshToken, tokenType=Bearer, expiresIn, user, requirePasswordChange. user.email lấy từ tài khoản; fullName lấy hồ sơ theo role/User ID qua PeopleFacade.LoginProfile. Thiếu/đã xóa hồ sơ vẫn login với fullName=null; admin chưa có nguồn họ tên. User ID không phải ID hồ sơ.
- Username không tồn tại/password sai cùng 401/4003. Mặc định năm lần sai liên tiếp khóa tạm 15 phút; lần thứ năm vẫn 4003, lần tiếp theo khi còn khóa trả 403/4004. LOCKED/DISABLED bị từ chối trước so mật khẩu. Thành công hoặc hết khóa tạm reset bộ đếm; ghi thất bại không rollback theo lỗi trả client. Số lần và thời gian khóa có thể cấu hình. Chưa có thời điểm mở khóa trong response hoặc rate limit theo IP.
- Change-password nhận currentPassword, newPassword, confirmPassword. Service đọc firstLogin trong DB; first-login bỏ qua currentPassword, các lần khác bắt buộc nhập đúng. Thiếu/blank currentPassword trả 400/1001 theo field, không tăng bộ đếm; sai mật khẩu trả 401/4003 và dùng chung failed_login_count/locked_until với login (cùng ngưỡng/thời gian khóa). Lỗi chính sách/xác nhận không tăng số lần sai.
- Mật khẩu người dùng tự đặt phải đủ policy ngay cả lần đổi đầu tiên: tối thiểu cấu hình PASSWORD_MINIMUM_LENGTH (mặc định 8 ký tự Unicode), tối đa 72 byte UTF-8 cho BCrypt; đủ hoa/thường/số/ký tự đặc biệt, không whitespace; khác hoàn toàn username/MSSV theo so sánh phân biệt hoa/thường; confirmation khớp. Không so sánh hash/encode với đầu vào quá 72 byte. Lỗi trả 400/1001 + errors theo currentPassword/newPassword/confirmPassword. Mật khẩu tạm do hệ thống cấp/reset được miễn kiểm tra độ mạnh, không áp dụng miễn trừ đó cho mật khẩu mới người dùng tự nhập.
- Chống tái sử dụng chỉ đối chiếu mật khẩu hiện tại và một mật khẩu chính thức ngay trước đó. Đổi thông thường lưu hash hiện tại làm hash trước đó; đổi first-login không lưu hash tạm vào lịch sử. Reset giữ mật khẩu chính thức gần nhất, kể cả reset nhiều lần trước khi người dùng đổi; không có danh sách cấm mật khẩu khởi tạo hoặc lịch sử nhiều đời. Dữ liệu trước migration chưa có hash lịch sử để đối chiếu, không thể tái dựng tự động.
- Thành công cập nhật hash/ngày đổi, firstLogin=false, xóa bộ đếm/khóa tạm và revoke **toàn bộ refresh token**, gồm phiên hiện tại, trong cùng transaction. Không phát JWT mới ngay ở endpoint này. FE phải xóa cả hai token/thông tin đăng nhập và quay lại login; lần login sau mới nhận JWT ACCESS. JWT hạn chế cũ không được nâng quyền sau khi đổi mật khẩu.
- Logout nhận refreshToken của cùng phiên trong body và access token còn hạn ở header. Resource Server xác thực access token một lần; service lấy uid/sid từ principal rồi đối chiếu chủ sở hữu, ID và hạn refresh token trước revoke. Gọi lại với cùng cặp còn hạn vẫn thành công; không ảnh hưởng phiên khác. FE xóa cả hai token/thông tin đăng nhập khi logout. Access token chưa hết hạn vẫn được Resource Server chấp nhận; các endpoint còn tự kiểm tra phiên database có thể từ chối phiên đã revoke. TODO(ACCESS_TOKEN_REVOCATION): cân nhắc Redis lưu jti bị thu hồi với TTL còn lại và kiểm tra khi xác thực JWT; chưa triển khai thu hồi access token tức thì.
- Bearer hết hạn trả 401/4009 với thông báo "Phiên làm việc đã hết hạn"; token sai trả 401/4000. Đường logout có access token hết hạn bị chặn trước controller, không revoke refresh token trong request đó. Lỗi security dùng ApiResponse JSON qua custom AuthenticationEntryPoint/AccessDeniedHandler, không chuyển hướng HTML.

### Quản trị tài khoản hệ thống

AdminUserController truyền trực tiếp SearchUserAccountsRequest/LockUserRequest cho AdminUserService; không có userId trong body khóa và không nhận body reset. TypeScript giữ tên AdminUserSearchQuery/LockBody để FE dùng tiếp cùng JSON/query hiện tại. LockBody và ResetPasswordRequest Java cũ không còn được dùng.

- Search dùng chung để tải danh sách ban đầu và tra cứu: keyword tìm chuỗi con trong username **hoặc** email, trim/không phân biệt hoa thường, escape ký tự LIKE `%`, `_` và `\`. Các bộ lọc role (STUDENT/LECTURER/ACADEMIC_ADMIN/SYSTEM_ADMIN), status (ACTIVE/LOCKED/DISABLED) và firstLogin (true/false) kết hợp bằng AND; bỏ bộ lọc thì không hạn chế tương ứng. Enum phân biệt hoa/thường; giá trị không hợp lệ trả 400/1001 với field errors. firstLogin=false khác với bỏ tham số. Không tìm theo họ tên.
- Search sort ID tăng dần, loại User đã xóa mềm; page mặc định 0, size 20, page>=0/size>=1, chưa giới hạn size tối đa. Không có kết quả trả HTTP 200 với content=[]. UserAccountSummaryResponse chỉ có id, username, role, status; UserInfoResponse tiếp tục dùng cho login/facade Identity, không dùng cho danh sách quản trị.
- Chi tiết nhận User ID trên URL, trả 404/4002 khi không có/đã xóa mềm; vẫn đọc được tài khoản LOCKED/DISABLED. UserAccountDetailResponse có id, username, role, status, failedLoginCount, lockedUntil, passwordChangedAt, createdAt, updatedAt, email, firstLogin, temporarilyLocked, fullName, phone. Timestamp thuộc User; passwordChangedAt cũng được cập nhật khi reset. firstLogin=true biểu thị đang cần đổi mật khẩu, kể cả sau reset.
- temporarilyLocked được tính bằng lockedUntil khác null và lớn hơn thời điểm đọc UTC, độc lập với status=LOCKED thủ công. lockedUntil đã hết hạn vẫn được trả nguyên giá trị; đọc chi tiết không tự xóa mốc khóa hoặc reset bộ đếm. Không trả mật khẩu/hash hoặc token.
- Email lấy từ User. fullName/phone đọc theo User ID qua PeopleFacade.AccountProfile: STUDENT từ Student, LECTURER từ Lecturer, loại hồ sơ đã xóa mềm nhưng giữ hồ sơ INACTIVE/DEACTIVATED. Admin chưa có nguồn hồ sơ hoặc thiếu hồ sơ tương ứng trả fullName=null, phone=null, không làm mất chi tiết tài khoản. phone chưa khai báo có thể null. Không dùng Student ID/Lecturer ID thay User ID.
- Lock nhận {reason}: trim, không blank, tối đa 500 ký tự sau trim; lỗi trả 400/1001 với errors.reason. Chuyển LOCKED và revoke mọi refresh token chưa revoke, kể cả gọi khóa lại tài khoản đã LOCKED. Không thay hồ sơ Student/Lecturer hoặc role.
- Unlock đưa ACTIVE và xóa lockedUntil/failedLoginCount; gọi với ACTIVE vẫn gỡ khóa tạm. Không phục hồi refresh token đã revoke.
- Reset sinh mật khẩu ngẫu nhiên mới mỗi lần, độc lập INITIAL_ACCOUNT_PASSWORD; lưu BCrypt, giữ lịch sử mật khẩu chính thức như phần đổi mật khẩu, đặt firstLogin=true/passwordChangedAt, gỡ lockedUntil/failedLoginCount và revoke toàn bộ phiên. Không trả mật khẩu cho FE. LOCKED vẫn giữ LOCKED sau reset, cần mở khóa riêng; tự reset được phép, phiên hiện tại cũng bị revoke. Lần login tiếp theo dùng mật khẩu tạm nhận JWT PASSWORD_CHANGE và phải đổi mật khẩu.
- Tài khoản đích không có/đã xóa trả 404/4002 ở cả ba thao tác. DISABLED bị từ chối bằng 409/4010; kích hoạt lại tài khoản không thuộc use-case mở khóa này.
- Thiếu email reset trả 400/4007 trước khi thay mật khẩu. Gửi/render email lỗi trả 502/4008, rollback mật khẩu, lịch sử, khóa tạm và revoke phiên. Gửi vẫn đồng bộ trong transaction, không có queue/retry reset. Giới hạn SMTP đã gửi nhưng DB commit lỗi được mô tả tại NOTIFICATION_README.md.

Lock/unlock giữ khóa ghi hàng role SYSTEM_ADMIN trước khóa ghi User đích, rồi mới tải/kiểm tra người thực hiện và đếm admin để tránh dùng trạng thái đã đọc trước khi chờ khóa. Chỉ khi tự khóa chính SYSTEM_ADMIN và số SYSTEM_ADMIN ACTIVE/chưa xóa <=1 mới chặn 403/4001; role khác tự khóa không bị quy tắc này chặn khi phân quyền đang hoãn. Khóa tạm không loại tài khoản khỏi phép đếm ACTIVE. Reset chỉ khóa User đích trước khi tải actor, giữ hash/lịch sử mới nhất khi tự reset hoặc cạnh tranh với đổi mật khẩu. Khóa chung role không phải kiểm tra quyền; SYSTEM_ADMIN được bootstrap tạo, thiếu role này là lỗi cấu hình/dữ liệu khởi tạo. Các luồng vô hiệu hóa/xóa/đổi role bổ sung sau này phải tuân theo cùng cơ chế bảo vệ admin cuối cùng.

FE mở màn quản trị bằng GET danh sách không bộ lọc, đổi bộ lọc thì đưa page về 0. Chọn tài khoản bằng id từ summary rồi GET chi tiết trước thao tác. Sau lock/unlock/reset thành công, tải lại chi tiết và trang danh sách đang xem để nhận trạng thái mới; tự khóa/tự reset làm phiên hiện tại không còn hợp lệ thì chuyển về login. Backend luôn kiểm tra lại điều kiện tại thời điểm thao tác, không coi trạng thái FE đang giữ là căn cứ quyết định.

**TODO(AUTHORIZATION):** chỉ SYSTEM_ADMIN có permission quản trị tài khoản được tìm kiếm, xem chi tiết và dùng các thao tác quản trị trên khi triển khai phân quyền. Hiện chưa kiểm tra role/permission; đã chấp nhận việc STUDENT/LECTURER/ACADEMIC_ADMIN có JWT ACCESS và tài khoản/phiên hợp lệ gọi các API này trên tài khoản khác, kể cả SYSTEM_ADMIN. Quy tắc tự khóa không ngăn người khác khóa admin cuối cùng ở giai đoạn chưa phân quyền. Quyền kỹ thuật của SYSTEM_ADMIN không bao gồm cập nhật hồ sơ sinh viên qua API People.

**TODO(AUDIT_LOG):** hiện chỉ ghi application log actor/đích/lý do ở lock và actor/đích ở unlock/reset, trước commit; chưa ghi bảng audit_logs và chưa coi log là bằng chứng transaction đã lưu thành công. Khi có hạ tầng audit, lưu kết quả sau commit, không lưu mật khẩu/hash/nội dung email. Unit test hiện kiểm tra quy tắc và thứ tự gọi khóa bằng mock; chưa xác nhận concurrency hoặc rollback PostgreSQL thực tế.

**NOTE — giới hạn thu hồi sau khóa tài khoản/đổi/reset mật khẩu:** hiện chấp nhận access token đã phát tiếp tục hợp lệ đến exp, giống logout. JWT ACCESS cũ vẫn có thể gọi API chỉ kiểm tra JWT, dù refresh token đã revoke; các endpoint kiểm tra phiên DB riêng (đổi mật khẩu, admin/users, students/me, POST students/lecturers, PUT students/{id}/lecturers/{id}) có thể từ chối ngay. Vì vậy “thu hồi toàn bộ refresh token, FE yêu cầu đăng nhập lại” chưa đồng nghĩa vô hiệu hóa tức thì mọi truy cập từ access token cũ. Sau reset, JWT ACCESS đã phát trước đó cũng giữ mục đích ACCESS đến hết hạn; chỉ lần login mới với mật khẩu tạm nhận JWT PASSWORD_CHANGE.

**TODO(ACCESS_TOKEN_REVOCATION):** khi sửa use-case để bắt buộc chấm dứt ngay mọi truy cập cũ, bổ sung jti và Redis lưu danh sách thu hồi với TTL còn lại, kiểm tra ở xác thực JWT và đồng bộ logout/đổi/reset mật khẩu. Chưa triển khai cơ chế này trong quyết định hiện tại. **TODO(REFRESH_TOKEN):** nếu bổ sung endpoint refresh sau này, phải kiểm tra firstLogin tại DB và giữ JWT hạn chế; không được dùng refresh token để bỏ qua bước đổi mật khẩu.

## 3. Sinh viên, hồ sơ cá nhân và giảng viên

Nguồn: [AdminStudentController](../src/main/java/com/eduhub/edu_hub/people/api/controller/AdminStudentController.java), [StudentSelfController](../src/main/java/com/eduhub/edu_hub/people/api/controller/StudentSelfController.java), [AdminLecturerController](../src/main/java/com/eduhub/edu_hub/people/api/controller/AdminLecturerController.java).

StudentSelfController dùng StudentSelfService.getMyProfile/updateMyProfile cho sinh viên xem/sửa hồ sơ của mình theo User ID đã xác thực. AdminStudentController đọc hồ sơ theo Student ID qua StudentApplicationService.findById và sửa qua StudentAdminUpdateService.updateStudentProfile. Request Java tương ứng là UpdateMyProfileRequest cho PATCH /me và UpdateStudentProfileRequest cho PUT theo ID; file TS giữ tên type UpdateMyStudentProfileRequest/UpdateStudentRequest để tương thích consumer hiện có, cùng cấu trúc JSON. Phân quyền role vẫn theo TODO(AUTHORIZATION) bên dưới.

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| GET | /api/v1/students | StudentSearchRequest (query, gồm page/size) | `PageResponse<StudentResponse>` | 200 |
| GET | /api/v1/students/{id} | Không body | StudentResponse | 200 |
| POST | /api/v1/students | CreateStudentRequest + Bearer header | CreateStudentResponse | 200 |
| PUT | /api/v1/students/{id} | UpdateStudentProfileRequest + Bearer header | StudentResponse | 200 |
| GET | /api/v1/students/me | Bearer header | StudentResponse | 200 |
| PATCH | /api/v1/students/me | UpdateMyProfileRequest + Bearer | StudentResponse | 200 |
| GET | /api/v1/lecturers | LecturerSearchRequest (query, gồm page/size) | `PageResponse<LecturerResponse>` | 200 |
| GET | /api/v1/lecturers/{id} | Không body | LecturerResponse | 200 |
| POST | /api/v1/lecturers | CreateLecturerRequest + Bearer header | CreateLecturerResponse | 200 |
| PUT | /api/v1/lecturers/{id} | UpdateLecturerProfileRequest + Bearer header | LecturerResponse | 200 |

Hai API search bind toàn bộ query vào request DTO; service kiểm tra page>=0, size>=1 và trạng thái hợp lệ trước khi gọi repository, lỗi trả 400/1001. Bỏ page/size dùng 0/20, chưa giới hạn size tối đa. Trạng thái trống/bỏ tham số không lọc trạng thái; tên trạng thái phân biệt hoa/thường. Predicate nằm trong StudentSpecification/LecturerSpecification tại people.application.specification; service tổ hợp bộ lọc và tải email/tên ngành theo lô. URL và tên query giữ nguyên.

### Sinh viên

Search: keyword MSSV/họ tên, majorId/cohortId/classId, activityStatus, page/size. Filter AND, ID tăng dần, không lấy soft delete; keyword hiện chưa trim/escape wildcard. ActivityStatus STUDYING/DEACTIVATED/DELETED; chưa hỗ trợ lọc cảnh báo học vụ. Chi tiết dùng Student ID, không thấy/đã xóa 404/4101.

StudentResponse có hồ sơ, majorName/cohortCode/className/trainingType, entranceScore/targetGpa, activityStatus/academicWarningStatus/academicWarningReason/statusReason/createdAt; không có userId/majorId/cohortId/administrativeClassId/gender. statusReason hiện thường null vì mapper chưa gán. Không suy ID từ các tên trả về.

Field email trên StudentResponse và LecturerResponse lấy từ User liên kết qua IdentityFacade, không lưu ở entity hồ sơ. API danh sách/tra cứu nhiều ID đọc email theo lô; /me dùng email của User vừa xác thực. Hồ sơ chưa có User hoặc User không có email trả email=null; không loại hồ sơ khỏi kết quả chỉ vì tài khoản đã khóa/xóa. Tên field JSON và URL hiện có giữ nguyên.

| CreateStudentRequest | Quy tắc hiện tại |
|---|---|
| fullName | Bắt buộc, <=255, trim |
| citizenId | Bắt buộc, DTO <=32; service bỏ whitespace và yêu cầu đúng 12 chữ số |
| majorId/cohortId/administrativeClassId | Bắt buộc, dùng danh mục thật và khớp lớp |
| trainingType | Bỏ field mặc định CHINH_QUY; nếu gửi phải khớp hệ lớp |
| email | Tùy chọn/null/blank; nếu có email hợp lệ <=255, chuẩn hóa lowercase. Không còn chặn trùng email như tài liệu cũ |
| dateOfBirth | Tùy chọn, nếu có phải quá khứ |
| gender/phone | Tùy chọn; phone <=255; gender chưa có enum validation trong luồng đơn lẻ |
| entranceScore | Tùy chọn, không âm |
| reason | Bắt buộc, trim rồi <=500 |

StudentCreationService kiểm tra người thực hiện/phiên qua IdentityFacade, khóa lớp và kiểm tra scope/sức chứa, cấp MSSV, tạo User/Student trong transaction; sau commit mới gửi email và chỉ trả kết quả gửi trong response, không ghi kết quả vào hồ sơ. MSSV từ bộ sinh dùng chung, mã ngành lấy nguyên catalog; ví dụ CNTT080101 theo cấu hình mặc định, không còn bảng ánh xạ CNTT→CT. Thêm đơn lẻ cấp STT tiếp theo, không đánh số lại người cũ. Không gửi studentCode/username/password/userId từ FE.

CreateStudentResponse là {student,warnings,notificationStatus,notificationError}. Trùng họ tên + ngày sinh chỉ cảnh báo; CCCD trùng chặn tạo. Thiếu email có thể SKIPPED; mail FAILED vẫn HTTP 200, hồ sơ/tài khoản đã lưu, không tự POST tạo lại. Không còn endpoint resend tài khoản SV cũ.

PUT do StudentAdminUpdateService điều phối, chỉ áp dụng field khác null, không phải full replace. Bỏ field hoặc gửi null giữ nguyên giá trị; {} không đổi dữ liệu nghiệp vụ. Chỉ nhận fullName/dateOfBirth/citizenId/phone/email/targetGpa và statusReason tùy chọn. Key khác đều bị từ chối bằng 400/1001 với errors theo field, kể cả null: studentCode (kể cả bằng mã cũ), administrativeClassId, majorId/cohortId/trainingType, gender/entranceScore, userId, trạng thái/cảnh báo hoặc key lạ. Request trộn trường hợp lệ với trường bị cấm bị từ chối toàn bộ; MSSV chỉ đọc trên response.

| Trường PUT | Quy tắc |
|---|---|
| fullName | Tối đa 255 ký tự trước trim; có giá trị khác null thì không được blank, trim khi lưu |
| dateOfBirth | Phải là ngày trong quá khứ |
| citizenId | Bỏ whitespace, yêu cầu đúng 12 chữ số; không trùng hồ sơ Student khác chưa xóa, loại chính Student ID đang sửa |
| phone | Tối đa 255 ký tự trước trim; trim khi lưu, chuỗi trắng thành chuỗi rỗng như /me; chưa kiểm tra định dạng số |
| email | Chuẩn hóa trước validation, email hợp lệ <=255; null/bỏ field giữ nguyên, chuỗi rỗng/trắng yêu cầu xóa User.email |
| targetGpa | Từ 0–4, tối đa hai chữ số thập phân; không làm tròn, null giữ nguyên ở PUT |
| statusReason | Lý do cập nhật tùy chọn, tối đa 500 ký tự trước trim; chỉ ghi application log, không đổi activityStatus |

PUT kiểm tra dữ liệu trước khi ghi, khóa Student theo ID rồi mới khóa User khi sửa email, cùng thứ tự với PATCH /me. Cập nhật chính instance Student đang quản lý; email ghi duy nhất qua IdentityFacade trong cùng transaction, lỗi phải rollback toàn use-case. Hồ sơ không có/đã xóa trả 404/4101; chưa có liên kết User trả 404/4002 khi yêu cầu sửa email, không tự cấp tài khoản. CCCD trùng trả 409/4114 với errors.citizenId, gồm cả khi unique constraint chặn ghi cạnh tranh; unit test chưa xác nhận concurrency/rollback database thực tế.

**TODO(STUDENT_ADMINISTRATIVE_CLASS_TRANSFER):** chuyển lớp là UC riêng, cần kiểm tra lớp đích, ngành/khóa/hệ, sức chứa, thứ tự khóa, lý do và lịch sử có hiệu lực. **TODO(STUDENT_MAJOR_TRANSFER):** cần chốt CTĐT đích, công nhận kết quả/tín chỉ và bố trí lớp mới. Hai luồng bảo toàn lịch sử nhập học, MSSV/username và bộ đếm đã cấp; chưa có API thực thi. Chọn lớp lúc tạo sinh viên và lọc danh sách theo lớp vẫn thuộc các luồng hiện có.

**TODO(AUDIT_LOG) — cập nhật hồ sơ:** hiện chỉ log actor User ID/Student ID/lý do trước commit. Khi bổ sung audit, lưu actor, các trường thay đổi, lý do, thời điểm và kết quả sau commit; không ghi mật khẩu/hash/nội dung email hoặc CCCD đầy đủ. Application log hiện tại không chứng minh transaction đã commit thành công.

**TODO(ACADEMIC_WARNING_EVALUATION):** cơ chế cảnh báo học vụ đang hoãn; UpdateStudentProfileRequest không còn academicWarningStatus/academicWarningReason và StudentSearchRequest không còn bộ lọc academicWarningStatus. Dữ liệu đã lưu và các trường cảnh báo trong StudentResponse vẫn được giữ để đọc; cập nhật hồ sơ/GPA mục tiêu không tự tính, sửa hoặc xóa cảnh báo. Khi triển khai Academic, cần có nguồn điểm/lịch sử học tập đầy đủ và chốt quy chế xét nhiều tiêu chí như GPA thực tế học kỳ/tích lũy, số tín chỉ học lại, tín chỉ nợ/không đạt và kỳ xét. Không dùng targetGpa thay GPA thực tế hoặc tự đặt ngưỡng khi chưa có quy chế. Academic sẽ đánh giá qua facade, đồng bộ trạng thái/lý do với People; đây là công việc chưa triển khai, không phải dữ liệu do client nhập tay.

GET /me xác thực User rồi tìm Student liên kết bằng User ID, không có hồ sơ/chỉ có hồ sơ đã xóa trả 404/4101. Không nhận Student ID hoặc User ID tùy chọn từ client. GET/PATCH dùng chung StudentResponse hiện có.

| Trường PATCH /me | Quy tắc |
|---|---|
| phone | Tối đa 255 ký tự trước trim; bỏ khoảng trắng hai đầu khi lưu; chưa kiểm tra định dạng số điện thoại. Chuỗi trắng lưu chuỗi rỗng như contract cũ |
| email | Email hợp lệ, tối đa 255 ký tự sau chuẩn hóa; trim/chuẩn hóa Unicode/lowercase, chuỗi rỗng hoặc trắng thành null; không yêu cầu duy nhất hoặc xác minh email |
| targetGpa | Từ 0–4, tối đa hai chữ số thập phân; không làm tròn. null là chưa thiết lập, khác với mục tiêu 0 |

Bỏ field giữ nguyên, gửi null xóa đúng field đó, {} không thay đổi. Key khác, kể cả có giá trị null hoặc cờ targetGpaPresent/phonePresent/emailPresent, trả 400/1001 với errors theo field. Request trộn trường được sửa với trường khóa bị từ chối toàn bộ, không lưu phần hợp lệ. Ngày sinh, họ tên, MSSV, CCCD, lớp/ngành/khóa/hệ, trạng thái và cảnh báo học vụ chỉ xem ở /me; ngày sinh sai định dạng không phải nhánh cập nhật của API này.

PATCH khóa Student theo User ID và chỉ lưu hồ sơ nếu phone/targetGpa thực sự đổi; so GPA theo giá trị số, 3.2 và 3.20 không tạo cập nhật mới. Khi có field email, chỉ cập nhật User.email qua IdentityFacade trong cùng transaction; User cũng chỉ lưu khi email đổi. Sửa riêng email không gọi save Student. Bỏ field email giữ nguyên; gửi null xóa email tài khoản. Lỗi cập nhật email truyền ra để rollback toàn bộ PATCH. Xóa email gỡ email nhận thông báo tài khoản/reset mật khẩu; không đổi username, mật khẩu hoặc thu hồi phiên chỉ vì sửa email. Email lịch sử nhập học và recipient đã lưu của thông báo không bị đồng bộ theo thay đổi này.

**TODO(AUTHORIZATION) — đã chốt nghiệp vụ, chưa thực thi:** STUDENT chỉ được xem/sửa hồ sơ của chính mình tại /me, với ba trường phone/email/targetGpa. Cập nhật quản trị qua PUT /students/{id} dành cho ACADEMIC_ADMIN; SYSTEM_ADMIN không có quyền cập nhật này và không có ngoại lệ vượt giới hạn của /me. Hiện chưa kiểm tra role và chưa có cấu hình động quyền sửa field theo role. Đã chấp nhận tạm thời việc STUDENT hoặc role khác có JWT ACCESS gọi PUT theo ID để sửa các trường bị khóa tại /me, kể cả hồ sơ khác; whitelist /me không ngăn đường gọi này. Không mô tả các quyền trên như đã được backend bảo vệ.

**TODO(STUDENT_TARGET_GPA_AI):** GPA mục tiêu đã được lưu/đọc trong People, chưa có luồng AI đọc dữ liệu này. Khi triển khai tư vấn tốt nghiệp, bổ sung capability People facade cho consumer thực tế; không cho AI truy vấn trực tiếp StudentRepository, không tự thay null bằng 0.

### Giảng viên

Search: keyword, lecturerCode, fullName, facultyId, status ACTIVE/INACTIVE, page/size; trim/không phân biệt hoa thường, ID tăng, loại soft delete. Chi tiết dùng Lecturer ID; 404/4102 nếu không thấy. LecturerResponse có facultyId/facultyName, không có userId hoặc accountNotificationStatus/accountNotificationError.

status lọc trạng thái hồ sơ giảng viên, không phải UserStatus của tài khoản. Khi có facultyId, chỉ lấy giảng viên thuộc khoa chưa xóa. Ví dụ: GET /api/v1/lecturers?status=INACTIVE&facultyId=2&page=0&size=20.

LecturerCreationService nhận principal đã xác thực và kiểm tra User/phiên qua IdentityFacade. Tạo bắt buộc fullName/email <=255, dateOfBirth quá khứ, facultyId của khoa ACTIVE/chưa xóa, reason không blank <=500. Email được trim/chuẩn hóa/lowercase trước validation. phone/citizenId tùy chọn <=255; CCCD nếu có phải đúng 12 chữ số sau bỏ whitespace, blank thành null. Chặn trùng email giữa giảng viên chưa xóa và trùng CCCD giảng viên; trùng tên/ngày sinh chỉ warning. Không áp đặt unique email toàn bộ User.

CreateLecturerRequest bổ sung hai field bắt buộc:

| Field | Quy tắc |
|---|---|
| recruitmentYear | Năm tuyển dụng bốn chữ số 1000–9999, không tự lấy năm hiện tại hoặc created_at |
| teachingSubjectIds | Danh sách không rỗng, từng ID dương/không null; ID lặp được gộp; toàn bộ môn phải tồn tại, ACTIVE/chưa xóa |

Khoa phải có mã chính thức gồm chữ cái in hoa; thiếu/sai mã trả 400/4121 với errors.facultyId. Theo định dạng YAML mặc định, mã mới = [MaKhoa][hai số cuối năm tuyển dụng][STT 001–999 trong khoa/năm], ví dụ CNTT26001. Cấu hình people.lecturer-code-format được mô tả tại ARCHITECTURE.md. Username=MSGV; không nhận lecturerCode/password/User ID từ FE. Mã/username cũ giữ nguyên. Giới hạn schema/bộ đếm và dữ liệu khoa chờ đối soát ở DATABASE_DESIGN.md.

Khóa khoa rồi môn theo ID tăng dần; cấp số, tạo User/Lecturer và lưu môn có thể dạy trong một transaction. Thiếu môn trả 404/4201; môn INACTIVE/đã xóa không được chọn, lỗi gắn teachingSubjectIds. LecturerResponse bổ sung recruitmentYear và teachingSubjects (SubjectSimpleResponse[]); dữ liệu cũ chưa có năm/môn trả null/[]. Đọc danh sách/hồ sơ lấy môn theo lô qua facade, giữ tên môn lịch sử đã ngừng/ẩn. Dữ liệu này chưa được tự dùng để phân công/xếp lịch.

Sau commit gửi mail một lần, trả {lecturer,warnings,notificationStatus,notificationError}; gửi lỗi vẫn giữ hồ sơ và trả HTTP 200.

PUT /lecturers/{id} do LecturerAdminUpdateService điều phối, dùng UpdateLecturerProfileRequest (type TS: UpdateLecturerRequest), trả LecturerResponse trong ApiResponse. Chấp nhận hồ sơ ACTIVE/INACTIVE chưa xóa; không có/đã xóa trả 404/4102. Bỏ field hoặc gửi null giữ nguyên; {} không đổi dữ liệu nghiệp vụ. Chỉ nhận các field sau:

| Trường PUT giảng viên | Quy tắc |
|---|---|
| fullName | Không blank, tối đa 255 ký tự trước trim |
| dateOfBirth | Ngày trong quá khứ |
| email | Trim/lowercase trước validation, email hợp lệ tối đa 255; chuỗi rỗng/trắng xóa User.email, null/bỏ field giữ nguyên |
| phone | Tối đa 255 ký tự trước trim; chuỗi trắng thành chuỗi rỗng |
| citizenId | Đúng 12 chữ số sau bỏ whitespace; chuỗi trắng không hợp lệ |
| teachingSubjectIds | Bỏ/null giữ nguyên; [] không hợp lệ. Danh sách có giá trị thay toàn bộ tập môn; từng ID dương/không null, gộp ID lặp; mọi môn phải ACTIVE/chưa xóa |
| reason | Tùy chọn, tối đa 500 ký tự trước trim; chỉ phục vụ log hiện tại, không phải statusReason của sinh viên |

Key khác bị từ chối toàn bộ bằng 400/1001 với errors theo field, kể cả key có giá trị null hoặc gửi chung field hợp lệ: lecturerCode/userId/facultyId/recruitmentYear/status/password/role/teachingSubjects/statusReason hoặc key lạ. Không đổi MSGV/username, khoa, năm tuyển dụng, trạng thái hoặc thông tin xác thực; cập nhật không gửi email.

Khóa Lecturer gốc, kiểm tra/khóa môn theo ID tăng dần nếu gửi danh sách, rồi khóa User khi đổi email. Service cập nhật chính instance đang quản lý; hồ sơ, email tài khoản và liên kết môn cùng một transaction. Giữ liên kết còn chọn, xóa mềm môn bị bỏ, khôi phục đúng bản ghi cũ khi chọn lại môn từng xóa mềm; chỉ thêm bản ghi cho cặp chưa tồn tại. Nếu bỏ/null danh sách thì giữ và hiển thị cả môn lịch sử ngừng/ẩn, không kiểm tra lại điều kiện chọn môn mới. Môn không tồn tại/đã xóa trả 404/4201; môn INACTIVE trả 400/4212; errors gắn teachingSubjectIds.

Kiểm tra trùng loại chính Lecturer ID đang sửa. Email lấy duy nhất từ User; vẫn chặn trùng với hồ sơ giảng viên INACTIVE chưa xóa, kể cả User đã khóa/xóa. Email trùng trả 409/4117, CCCD trùng trả 409/4118, có errors.email/citizenId và ánh xạ cả unique constraint tương ứng. Hồ sơ chưa liên kết User vẫn sửa được thông tin cá nhân/môn; yêu cầu đổi email trả 404/4002, không tự cấp tài khoản. Unit test chưa xác nhận rollback/concurrency/constraint PostgreSQL thực tế.

TODO(AUTHORIZATION): quyền cập nhật giảng viên dành cho ACADEMIC_ADMIN, SYSTEM_ADMIN không có ngoại lệ; hiện chỉ kiểm tra JWT/User/phiên, chưa kiểm tra role. TODO(AUDIT_LOG): hiện ghi application log actor/Lecturer ID/lý do trong transaction, chưa có audit trail hoặc bảo đảm log phản ánh commit thành công.

Không có endpoint resend SV/GV hoặc PATCH/DELETE giảng viên. Trạng thái lần gửi create có thể FAILED với ACCOUNT_NOT_AVAILABLE, INITIAL_PASSWORD_NO_LONGER_VALID, ACCOUNT_ALREADY_ACTIVATED, ACCOUNT_EMAIL_MISSING, EMAIL_TEMPLATE_RENDER_FAILED hoặc EMAIL_SEND_FAILED. Lỗi ngoài dự kiến riêng ở bước gửi sau commit cũng trả FAILED/EMAIL_SEND_FAILED; lỗi tạo dữ liệu hoặc commit không bị che và không gửi email.

Tạo SV đơn lẻ và tạo GV chỉ trả notificationStatus/notificationError trong response của thao tác; không lưu kết quả lâu dài và không tra cứu lại được sau đó. Student/Lecturer không giữ trạng thái/lỗi gửi. Nhập học vẫn có bản ghi hàng đợi/API trạng thái phục vụ retry riêng. Hai create ghi application log actor/hồ sơ/mã/lý do sau commit, chưa ghi audit trail; TODO(AUDIT_LOG) vẫn áp dụng. TODO(AUTHORIZATION): khi triển khai phân quyền, chỉ ACADEMIC_ADMIN được thêm đơn lẻ; hiện chỉ kiểm tra JWT/User/phiên, chưa kiểm tra role. Giới hạn và TODO bổ sung nguồn thông báo xem [NOTIFICATION_README.md](NOTIFICATION_README.md).

## 4. Nhập học và lớp hành chính

Nguồn: [StudentAdmissionController](../src/main/java/com/eduhub/edu_hub/admission/api/controller/StudentAdmissionController.java), [AdministrativeClassController](../src/main/java/com/eduhub/edu_hub/admission/api/controller/AdministrativeClassController.java). Quy trình/thuật toán/Excel xem [ADMISSION_WORKFLOW.md](ADMISSION_WORKFLOW.md).

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| GET | /api/v1/student-admissions/configuration | Không body | AdmissionCapacityResponse | 200 |
| GET | /api/v1/student-admissions/template | majorId/cohortId query bắt buộc | XLSX bytes | 200 |
| POST | /api/v1/student-admissions/plans | CreateAdmissionPlanRequest | AdmissionPlanResponse | 200 |
| POST | /api/v1/student-admissions/plans/import | Multipart CreateAdmissionPlanFromFileRequest | AdmissionPlanResponse | 200 |
| GET | /api/v1/student-admissions/plans/{id} | Không body | AdmissionPlanResponse | 200 |
| POST | /api/v1/student-admissions/plans/{id}/applicants | Multipart ImportAdmissionApplicantsRequest | AdmissionPlanResponse | 200 |
| GET | /api/v1/administrative-classes | majorId/cohortId query bắt buộc | AdministrativeClassResponse[] | 200 |
| POST | /api/v1/administrative-classes/from-admission-plan | PrepareAdmissionClassesRequest | AdmissionPlanResponse | 200 |
| POST | /api/v1/student-admissions/plans/{id}/allocation/preview | PreviewAdmissionAllocationRequest | AdmissionPlanResponse | 200 |
| PATCH | /api/v1/student-admissions/plans/{id}/allocation | AdjustAdmissionAssignmentsRequest | AdmissionPlanResponse | 200 |
| POST | /api/v1/student-admissions/plans/{id}/confirm | ConfirmAdmissionEnrollmentRequest | AdmissionConfirmationResponse | 200 |
| GET | /api/v1/student-admissions/plans/{id}/notifications | Không body | AdmissionNotificationResponse[] | 200 |

Java dùng các DTO Request/Response riêng trong api.dto; controller truyền trực tiếp request cho service và nhận response. Các tên TypeScript hiện có và field JSON giữ nguyên; CreateAdmissionPlanFromFileForm/ImportAdmissionApplicantsForm là kiểu form phía FE tương ứng với hai Request multipart Java. AdmissionExceptionHandler áp dụng cho cả hai controller nhập học/lớp hành chính, xử lý exception của module và giữ field errors khi lệch scope file. Không còn batchId UUID, batch trong RAM hay endpoint /students/admission/... cũ. Plan/hồ sơ lưu database và GET đọc lại được sau restart.

- JSON tạo plan: majorId, cohortId, totalStudents>=0; minCapacity/maxCapacity/reserveCapacity tùy chọn, bỏ/null dùng cấu hình 40/50/15.
- Tạo plan từ file: multipart majorId, cohortId, file bắt buộc; các capacity tùy chọn, không gửi totalStudents. Import vào plan đã có: multipart file và expectedRevision bắt buộc, không đổi scope ngành/khóa.
- Tải mẫu nhận XLSX blob và Content-Disposition; lỗi trả JSON envelope. Mẫu có tiêu đề, tên/mã ngành bằng tiếng Việt có dấu, một dòng trống trước header; dữ liệu từ dòng 6. Khóa lấy từ lựa chọn/plan, không ghi trong mẫu mới. Bố cục và tương thích mẫu cũ xem ADMISSION_WORKFLOW.md. Không gửi FormData bằng JSON hoặc tự đặt boundary.
- Chuẩn bị lớp: planId, expectedRevision, classCount 1–99; existingClassIds phân biệt null/[]/danh sách. acceptReserve/acceptBelowMinimum mặc định false, reason <=500.
- Preview: {expectedRevision}. Điều chỉnh: {expectedRevision,assignments:[{applicantId,classId}]}, danh sách không rỗng.
- Confirm: expectedRevision, acceptReserve, acceptBelowMinimum, reason. Dùng revision trả gần nhất; stale 409/4132 thì tải lại, không tự gán revision hoặc lặp thao tác ghi mù.
- PlanResponse có id/revision/scope/totalStudents/capacity/state/selectedClassCount/scenarios/classes/applicants/averageScoreDifference/warnings. Applicant lỗi nằm trong applicants[].state/error, không có invalidRows hay errors batch kiểu cũ.
- ConfirmationResponse có planId/revision/state/enrolled/failed/skipped/applicants. Một dòng lỗi có thể PARTIALLY_CONFIRMED, các dòng thành công đã commit; không coi toàn bộ đợt rollback.
- NotificationResponse: id, admissionId, state, failureCount, error. Mail lỗi không hoàn tác nhập học; không có endpoint retry thủ công/reset bộ đếm.

Ví dụ tạo plan và xác nhận, các ID chỉ minh họa:

```json
{"majorId":1,"cohortId":8,"totalStudents":100,"minCapacity":40,"maxCapacity":50,"reserveCapacity":15}
```

```json
{"expectedRevision":3,"acceptReserve":false,"acceptBelowMinimum":false,"reason":null}
```

FE chạy theo thứ tự chọn scope → mẫu/import hoặc tạo dự kiến → chọn kịch bản/chuẩn bị lớp → import thực tế nếu chưa có → preview → điều chỉnh → xác nhận → xem trạng thái. Sau mỗi thao tác thay state bằng response server. Hai lỗi đối chiếu mã hồ sơ còn tồn tại được nêu rõ trong ADMISSION_WORKFLOW.md, không coi HTTP 200 là mọi quy tắc danh tính đã hoàn thiện.

## 5. Học phần và tiên quyết

Nguồn: [SubjectController](../src/main/java/com/eduhub/edu_hub/curriculum/api/controller/SubjectController.java).

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| GET | /api/v1/subjects | SubjectSearchRequest | `PageResponse<SubjectResponse>` | 200 |
| GET | /api/v1/subjects/{id} | Không body | SubjectResponse | 200 |
| POST | /api/v1/subjects | CreateSubjectRequest | SubjectResponse | 201 |
| PUT | /api/v1/subjects/{id} | UpdateSubjectRequest | SubjectResponse | 200 |
| POST | /api/v1/subjects/{id}/deactivate | SubjectActionRequest | SubjectResponse | 200 |
| DELETE | /api/v1/subjects/{id} | SubjectActionRequest, có body | Void | 200 |
| POST | /api/v1/subjects/{id}/prerequisites | SetPrerequisiteRequest | SubjectResponse | 200 |

Search: keyword/subjectCode/subjectName chuỗi con, trim/không phân biệt hoa thường, credits nguyên dương chính xác, status, withoutPrerequisites, page/size; AND, ID tăng. withoutPrerequisites=true chỉ lấy môn chưa có quan hệ tiên quyết tới môn chưa xóa; false không lọc. Chưa escape wildcard %/_. Detail không thấy/đã xóa 404/4201. Response gồm id/code/name/credits/description/status cùng prerequisites và requiredBy trực tiếp, không phải toàn chuỗi gián tiếp; môn INACTIVE chưa xóa vẫn có thể nằm trong quan hệ đọc.

POST bắt buộc subjectCode/subjectName không blank, credits 1–5, description tùy chọn; ACTIVE, hai danh sách quan hệ rỗng. So trùng mã/tên chính xác, chưa trim/đổi case khi tạo; unique bao gồm soft delete. Chưa có handler riêng cho unique cạnh tranh ở module này, FE cần fallback 500.

PUT bắt buộc subjectName và credits 1–5, chỉ sửa môn ACTIVE. Mã bất biến; có gửi subjectCode phải bằng mã hiện tại. Bỏ/null description xóa mô tả cũ. Giữ ID/status/ngày tạo/quan hệ. Chưa chặn sửa tín chỉ theo toàn bộ điểm/lớp đang mở.

Deactivate/DELETE đều nhận {reason,confirmed:true}; reason không blank, confirmed thiếu/false trả 400/4209. Môn còn là tiên quyết của môn ACTIVE/chưa xóa bị chặn 409/4204 với errors.requiredBy. Deactivate chuyển INACTIVE vẫn xem được; DELETE soft delete, không xóa lịch sử dây chuyền. Chưa kiểm tra đầy đủ lớp/điểm ở chiều curriculum; không có restore/activate endpoint.

SetPrerequisiteRequest là toàn bộ tập cuối {prerequisiteSubjectIds:[1,2]}; [] gỡ hết, thiếu/null/phần tử null/ID<=0 lỗi. Môn đích và tiên quyết phải ACTIVE/chưa xóa. Khử trùng, gỡ mềm cạnh bị bỏ, thêm lại cạnh đã gỡ tạo cạnh mới. Khóa đồ thị theo ID, kiểm tra tự tham chiếu và chu trình sau thay đổi trước lưu, gồm môn INACTIVE chưa xóa. Có thể gỡ cạnh phá chu trình cũ, nhưng chu trình nơi khác còn tồn tại vẫn chặn. Thay đổi không hồi tố điểm/đăng ký; message chu trình có đường đi mã môn. Concurrency khóa đồ thị còn cần integration test riêng.

## 6. Kỳ học

Nguồn: [SemesterController](../src/main/java/com/eduhub/edu_hub/scheduling/api/controller/SemesterController.java).

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| GET | /api/v1/semesters | SemesterSearchRequest | `PageResponse<SemesterResponse>` | 200 |
| GET | /api/v1/semesters/{id} | Không body | SemesterResponse | 200 |
| POST | /api/v1/semesters | CreateSemesterRequest | SemesterResponse | 201 |
| PUT | /api/v1/semesters/{id} | UpdateSemesterRequest | SemesterResponse | 200 |

POST/PUT gửi đủ semesterName/startDate/endDate/registrationStart/registrationEnd. Tên chuẩn Học kì <số kỳ dương> năm học YYYY-YYYY, hai năm liên tiếp, năm đầu>0, không số 0 đầu số kỳ. Backend trim và sinh HK_1_2026_2027, đổi tên đồng bộ mã, giữ ID/cờ khóa; không gửi mã/status từ client.

registrationStart < registrationEnd < startDate < endDate. Chồng lấn khoảng học/đăng ký kiểm riêng, hai đầu mút đóng; chung một ngày cũng xung đột. Unique tên/mã gồm soft delete. Database constraint bảo vệ ghi cạnh tranh; lỗi cạnh tranh có thể không có danh sách errors xung đột, cần tải lại.

Status tính theo ngày Việt Nam: UPCOMING trước startDate, ONGOING gồm ngày đầu/cuối, ENDED sau endDate. Không có registrationStatus; status không biểu thị đang mở đăng ký. Kỳ ENDED không sửa được. PUT giữ isLocked/lockedGrade, chưa có API đổi cờ/xóa kỳ.

Đổi startDate/endDate khi kỳ có lớp khác CANCELLED (kể cả soft delete) trả 409/4320; sau xác nhận gửi lại toàn bộ request kèm confirmDateChange=true. Chỉ đổi tên/khoảng đăng ký không cần cờ. Chưa kiểm tra đủ lịch đã xếp hoặc chặn isLocked như luồng mở lớp.

Search keyword mã/tên, status, page/size; trim/case-insensitive/escape wildcard, startDate DESC rồi id DESC. Lỗi chồng lấn có errors.studyPeriod/registrationPeriod. Cập nhật và mở lớp khóa cùng hàng kỳ.

## 7. Lớp học phần

Nguồn: [ModuleClassController](../src/main/java/com/eduhub/edu_hub/scheduling/api/controller/ModuleClassController.java).

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| GET | /api/v1/semesters/{semesterId}/opening-subjects | Không body | OpeningSubjectResponse[] | 200 |
| GET | /api/v1/module-classes | ModuleClassSearchRequest | `PageResponse<ModuleClassResponse>` | 200 |
| GET | /api/v1/module-classes/{id} | Không body | ModuleClassResponse | 200 |
| POST | /api/v1/semesters/{semesterId}/module-classes/batch | CreateModuleClassesRequest | ModuleClassResponse[] | 201 |
| PATCH | /api/v1/module-classes/{id} | UpdateModuleClassRequest | ModuleClassResponse | 200 |
| POST | /api/v1/module-classes/{id}/cancel | CancelModuleClassRequest | ModuleClassResponse | 200 |

Gợi ý: khóa/kiểm tra kỳ chưa kết thúc/chưa khóa, People lấy STUDYING/chưa xóa, Curriculum map CTĐT, Enrollment cung cấp lịch sử đầy đủ. Runtime dùng facade thật mọi profile, không có DEV_FIXTURE. Không SV có thể trả rỗng; có SV mà thiếu năm/mapping/lịch sử/Enrollment.Planning bean trả 503/4317.

k=2×(năm đầu năm học đích−năm nhập học)+số kỳ, chỉ hỗ trợ HK_1/HK_2. REQUIRED đúng kỳ là on-time; FAILED chưa đạt ngoài kỳ là retake; recommendSemester<k và chưa có lần học là missed. COMPLETED/REGISTERED trước hoặc tại kỳ đích bị loại, DROPPED không phải chưa từng đăng ký; bỏ lịch sử tương lai, khử trùng sinh viên theo môn, không lọc theo User/endYear dự kiến. recommendedClassCount=ceil(expectedStudentCount/80), chưa trừ sức chứa lớp đã mở; existingClassCount đếm mọi lớp khác CANCELLED kể cả soft delete. Không dùng thống kê thay kiểm tra quyền đăng ký từng SV.

Tạo lô ví dụ:

```json
{"subjects":[{"subjectId":1,"confirmAdditionalClasses":false,"classes":[{"maxCapacity":80},{"maxCapacity":50},{}]}]}
```

subjects/classes không rỗng/null/không phần tử null; mỗi subjectId dương xuất hiện một lần. maxCapacity bỏ field mặc định 80, nếu gửi phải JSON integer 1–80; null/string/boolean/80.0 bị từ chối. Không nhận lecturerId/room/schedule/status. Khóa kỳ → môn ACTIVE/chưa xóa có khóa đọc → xác nhận lớp đã có → cấp mã/STT → lưu cả lô trong một transaction. Có lớp khác CANCELLED cần confirmAdditionalClasses=true sau khi người dùng xác nhận; 409/4313 chưa lưu một phần lô, gửi lại toàn bộ lô.

Mã MC_<semesterId>_<subjectCode>_<STT ít nhất ba chữ số>, lấy cả lịch sử hủy/ẩn, không tái cấp. Lớp mới UNSCHEDULED, currentSize=0, lecturerId/lecturerName=null, schedules=[]. Có thể mở từ danh mục môn ACTIVE khi gợi ý 503; không bắt buộc gợi ý thành công. Hết thời gian đăng ký SV không đồng nghĩa cấm admin mở lớp; điều kiện là kỳ chưa kết thúc/isLocked=false.

Search keyword mã lớp, semesterId/subjectId/lecturerId dương, status, page/size; AND, trim/escape wildcard, id DESC; loại soft delete nhưng giữ CANCELLED. Detail bổ sung tên môn lịch sử qua Curriculum và tên giảng viên qua People nếu có ID; không lọc mất giảng viên INACTIVE. schedules hiện mapper luôn trả [], chưa đọc lịch thật; không suy DB không có lịch từ mảng này. dataSource=DATABASE.

PATCH {maxCapacity,reason}: cả hai bắt buộc, reason không blank, integer 1–80 và >=currentSize; khóa kỳ rồi lớp, giữ mã/giảng viên/status. Chưa kiểm tra đủ sức chứa phòng đã xếp khi tăng maxCapacity. Cancel {reason} cũng cần kỳ chưa kết thúc/chưa khóa, lớp chưa CANCELLED. currentSize>0 chặn 4323; sĩ số 0 vẫn cần nguồn lịch sử đầy đủ xác nhận chưa có bất kỳ Enrollment kể cả DROPPED/soft delete, thiếu nguồn trả 503/4325. Hủy chỉ CANCELLED, giữ mã/STT/record; chưa ngừng hiệu lực lịch trong cùng transaction. Sửa/hủy lại CANCELLED trả 409/4321, chưa có restore/delete/transfer endpoint.

## 8. Phòng học

Nguồn: [RoomController](../src/main/java/com/eduhub/edu_hub/scheduling/api/controller/RoomController.java). Constraint/trigger và seed chỉ mô tả tại DATABASE_DESIGN.md.

| Method | URL | Request | Data | HTTP |
|---|---|---|---|---|
| GET | /api/v1/rooms | RoomSearchRequest | `PageResponse<RoomResponse>` | 200 |
| GET | /api/v1/rooms/{id} | Không body | RoomResponse | 200 |
| POST | /api/v1/rooms | CreateRoomRequest | RoomResponse | 201 |
| PUT | /api/v1/rooms/{id} | UpdateRoomRequest | RoomResponse | 200 |
| PATCH | /api/v1/rooms/{id}/status | ChangeRoomStatusRequest | RoomResponse | 200 |
| DELETE | /api/v1/rooms/{id} | Không body | Void | 200 |

| Field tạo/sửa | Quy tắc |
|---|---|
| roomCode | Bắt buộc <=50, regex [0-9]+-[A-Za-z0-9]+, trim/IN HOA, ví dụ 102-TA1 |
| roomName | Bắt buộc không blank, <=255, trim |
| buildingCode | Bắt buộc <=50, trim/IN HOA, khớp phần sau dấu gạch ngang |
| campus | Tùy chọn <=100, bỏ/null/blank lưu chuỗi rỗng; có giá trị trim/IN HOA |
| roomNumber | Tùy chọn <=50, bỏ/null suy từ mã; có gửi không blank và khớp phần đầu mã |
| capacity | Bắt buộc JSON integer 1–2147483647, độc lập giới hạn lớp 80 |

Không có roomType. Mã phòng unique toàn hệ thống và vị trí campus/buildingCode/roomNumber unique, giữ cả bản ghi soft delete. Lệch tòa/số phòng với mã trả 1001 errors field tương ứng; lỗi trùng cạnh tranh được chuyển 409, không lộ SQL.

POST tạo ACTIVE. PUT gửi đủ field bắt buộc, giữ ID/status/ngày tạo, sửa được INACTIVE; bỏ campus không phải giữ giá trị cũ mà chuyển về chưa khai báo. Sửa/status/delete khóa hàng Room; service không nhận token/actor hoặc reason, chưa log nghiệp vụ/audit riêng.

Search keyword mã/tên/cơ sở/tòa/số phòng; campus/buildingCode khớp chính xác sau chuẩn hóa; status/minCapacity nguyên dương/page/size. AND, escape wildcard, sort campus/buildingCode/roomNumber/id tăng; số phòng sort chuỗi. Bỏ status lấy cả ACTIVE/INACTIVE chưa xóa. Detail không có 404/4326; RoomResponse gồm id/roomCode/roomName/campus/buildingCode/roomNumber/capacity/status.

PATCH {status:INACTIVE} ngừng dùng, ACTIVE đưa lại; gửi trạng thái đang có thành công, không đổi timestamp. DELETE không body, reason hay confirmed, soft delete và giữ FK lịch sử; GET/delete lại 404.

- A2 (409/4330): chặn INACTIVE/xóa nếu có lịch chưa xóa, lớp chưa xóa/chưa CANCELLED và kỳ chưa xóa có endDate>=hôm nay VN; ngày cuối kỳ vẫn bị chặn, không chỉ dựa ngày kết thúc dòng lịch.
- A3 (409/4331): giảm sức chứa không được dưới maxCapacity lớp trong cùng tập lịch, không so currentSize. Bằng đúng được phép; chỉ liệt kê các lớp bị ảnh hưởng một lần.
- errors[].field=moduleClasses[<id>], message chứa mã lớp/kỳ/sức chứa. Không lưu thay đổi một phần, không tự xóa lịch để vượt lỗi. Kỳ đã kết thúc không chặn; lịch sử Room/FK vẫn đọc được.

## 9. Mã lỗi và xử lý FE

Nguồn đầy đủ: [ErrorCode](../src/main/java/com/eduhub/edu_hub/shared/exception/ErrorCode.java). Bảng chỉ gồm mã liên quan contract hiện tại; enum có thể chứa mã chưa được REST dùng.

| HTTP | Code | Ý nghĩa / xử lý |
|---|---|---|
| 500 | 1000 | Lỗi hệ thống, không tự lặp thao tác ghi |
| 400 | 1001 / 1002 | Dữ liệu không hợp lệ / thiếu tham số; errors có thể có hoặc không |
| 405 / 404 | 1003 / 1004 | Sai method / endpoint không tồn tại |
| 401 | 4000 | Token không hợp lệ khi endpoint thực sự kiểm tra; login lại |
| 401 | 4009 | Bearer token hết hạn; xóa token ở FE, thông báo hết phiên và đăng nhập lại |
| 403 | 4001 | Quy tắc quyền, hiện còn chống tự khóa admin cuối cùng |
| 403 | 4006 | JWT first-login gọi API nghiệp vụ; chuyển sang đổi mật khẩu hoặc đăng xuất |
| 404 / 401 / 403 | 4002 / 4003 / 4004 | Không User / sai thông tin đăng nhập / tài khoản khóa; không xử lý 4003 như token hết hạn |
| 400 / 502 | 4007 / 4008 | Thiếu email reset / gửi email reset lỗi, rollback |
| 409 | 4010 | Tài khoản DISABLED không được khóa/mở khóa/reset; không dùng unlock để kích hoạt lại |
| 404 | 4101 / 4102 | Không Student / Lecturer |
| 409 | 4103 / 4104 | Trùng MSSV hoặc mã GV/username |
| 400 | 4105 / 4109 / 4110 / 4111 / 4115 | Lớp đầy / dữ liệu mã ngành/khóa/lớp sai / scope lớp không khớp |
| 409 | 4112 / 4114 | Hết STT SV trong lớp / trùng CCCD SV |
| 400 | 4116 / 4120 | Khoa không hoạt động / GPA mục tiêu sai |
| 409 | 4117 / 4118 / 4119 | Trùng email GV / CCCD GV / hết 999 MSGV trong cùng khoa/năm |
| 400 | 4121 / 4212 | Khoa thiếu mã cấp MSGV / môn không đủ điều kiện ghi nhận giảng dạy |
| 404 / 400 | 4130 / 4131 | Không plan / cấu hình sĩ số sai |
| 409 | 4132 | Revision cũ, tải lại trước thao tác |
| 409 | 4133 | Cần xác nhận dự phòng/dưới tối thiểu và reason |
| 409 | 4134 / 4135 / 4136 / 4137 | Sai trạng thái / lớp không phù hợp / dữ liệu đã đổi / hồ sơ xung đột |
| 400 | 4138 / 4139 / 4140 | File sai / thiếu metadata / ngành-khóa không khớp; giữ form và hiển thị field errors |
| 404 | 4201 | Không học phần |
| 400 | 4203 / 4210 / 4211 | Chu trình / tự tham chiếu / tiên quyết INACTIVE |
| 409 | 4204 / 4205 / 4206 / 4207 / 4208 | Môn còn được dùng / trùng mã / trùng tên / INACTIVE / đổi mã bất biến |
| 400 | 4209 | Chưa confirmed deactivate/delete môn |
| 404 / 400 | 4301 / 4302 | Không lớp học phần / kỳ khóa |
| 404 / 409 | 4305 / 4306 | Không kỳ / trùng kỳ |
| 400 | 4307 / 4308 / 4309 | Tên kỳ / ngày học / ngày đăng ký sai |
| 409 | 4310 / 4311 / 4312 | Chồng lấn học / chồng lấn đăng ký / kỳ kết thúc |
| 409 / 400 | 4313 / 4316 | Cần xác nhận mở thêm lớp / môn lặp trong lô |
| 409 | 4314 / 4318 | Môn không mở được / mã-STT lớp trùng cạnh tranh |
| 503 / 400 | 4317 / 4319 | Nguồn lập kế hoạch thiếu / mã kỳ chưa hỗ trợ thống kê |
| 409 | 4320 / 4321 / 4322 / 4323 | Cần xác nhận đổi ngày kỳ / lớp hủy / sức chứa dưới sĩ số / lớp đã có đăng ký |
| 503 | 4325 | Thiếu lịch sử đầy đủ để hủy lớp, không giả thành thành công |
| 404 / 409 | 4326 / 4327 / 4328 | Không phòng / trùng mã phòng / trùng vị trí |
| 400 / 409 | 4329 / 4330 / 4331 | Mã phòng sai / A2 có lịch / A3 sức chứa quá thấp |

4005 có trong enum nhưng lỗi password policy hiện trả 1001 + errors. 4113 không còn được dùng để chặn email trùng khi tạo SV; 4106/4107/4108 của batch admission cũ không phải contract nhập học hiện tại.

Với 4133/4313/4320, hiển thị nội dung rồi chỉ gửi cờ xác nhận sau khi người dùng đồng ý. Không tự bật trong interceptor. Với 4317/4325, hiển thị chưa đủ nguồn dữ liệu, không chuyển lỗi thành trang rỗng. Các errors theo lớp/kỳ hiển thị vùng thông báo chung, không ép vào input không tồn tại.

## 10. Hướng dẫn FE và phần chưa có REST

- Copy/import file TS cùng tài liệu này, không dùng DTO/facade Java như bằng chứng route đã có. TypeScript chỉ kiểm tra lúc viết code, không phải runtime validator.
- Login → xử lý first-login/đổi mật khẩu → login lại; chưa tự refresh. Danh sách dùng content/pageNumber/last, filter bỏ giá trị null/undefined và reset page.
- Tạo SV/GV đọc warnings và notificationStatus; mail FAILED không phải tạo người thất bại. /me cần User thực sự có hồ sơ, User seed không tự có Student.
- Ngành/khóa/khoa chưa có REST danh mục. Lớp hành chính đã có API theo majorId/cohortId để phục vụ plan; không còn mô tả là hoàn toàn chưa có danh mục lớp. BE cung cấp ID thật để demo, không suy từ tên/index hoặc database khác.
- Chuẩn bị FormData bằng file/majorId/cohortId/expectedRevision phù hợp từng endpoint; không JSON.stringify(file). Tải template dùng blob khi HTTP thành công; khi lỗi đọc JSON envelope.
- Mở lớp từ môn ACTIVE không phụ thuộc gợi ý thành công; trạng thái nguồn thiếu không khóa toàn bộ màn quản lý lớp.
- Chưa có REST refresh token; activate/deactivate/xóa SV; xóa GV; CRUD ngành/khoa/khóa/CTĐT; phân công giảng viên; xếp lịch/thời khóa biểu; enrollment; điểm/học vụ; AI/chat/knowledge; lock/unlock kỳ hoặc restore lớp/môn/phòng.
- Không có POST tạo một ModuleClass đơn theo thiết kế cũ; dùng batch theo kỳ. Không có retry nhập học/reset bộ đếm hoặc resend SV cũ.
- Collection Postman/sample_data local có thể lỗi thời; không dùng thay controller làm contract. Tài liệu/docs hiện bị .gitignore; chia sẻ/stage theo quyết định người dùng, không tự force-add.

Mẫu gọi JSON tối thiểu (người dùng quyết định cách lưu token ở FE):

```ts
import { API_URLS, type ApiResponse, type LoginResponse } from "./fe-api-contract";

const response = await fetch("http://localhost:8080" + API_URLS.auth.login, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "<username>", password: "<password>" }),
});
const payload = await response.json() as ApiResponse<LoginResponse>;
if (!response.ok || !payload.success) {
  throw new Error(payload.message);
}
const accessToken = payload.data.accessToken;
```

Khi tích hợp, thêm fallback nếu không parse được JSON/envelope và xử lý code riêng như bảng lỗi. Ví dụ dùng placeholder, không phải tài khoản/ID bảo đảm có thật. Kiểm chứng bằng đối chiếu controller/DTO, kiểm tra TS và test phù hợp; không ghi lại các báo cáo số lượng test cũ như bằng chứng deploy hiện tại.
