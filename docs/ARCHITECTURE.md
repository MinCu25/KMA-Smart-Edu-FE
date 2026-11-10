# Kiến trúc và tình trạng triển khai EduHub

## Mục lục tài liệu

Mỗi chủ đề có một nơi mô tả chính. Quy tắc làm việc nằm ở [AGENTS.md](../AGENTS.md).

| Tài liệu | Nội dung sở hữu |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc, ownership, môi trường dev, tình trạng module và việc tích hợp còn lại |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | Schema, constraint, Flyway, seed và database cũ |
| [API_SPECIFICATION.md](API_SPECIFICATION.md) | REST thực tế, validation, mã lỗi và hướng dẫn tích hợp FE |
| [MODULE_CONTRACT.md](MODULE_CONTRACT.md) | Capability facade, consumer, DTO và ranh giới transaction |
| [ADMISSION_WORKFLOW.md](ADMISSION_WORKFLOW.md) | Quy trình, thuật toán, trạng thái và giới hạn nhập học |
| [NOTIFICATION_README.md](NOTIFICATION_README.md) | Gửi email, hàng đợi, retry, template và cấu hình notification |
| [fe-api-contract.ts](fe-api-contract.ts) | Kiểu dữ liệu và URL để FE sử dụng cùng API specification |

Đối chiếu source ngày 10/11/2026. Source/controller/migration là căn cứ kiểm tra hành vi; một interface hoặc DTO tồn tại không chứng minh tính năng đã có implementation hay REST API. Khi source thay đổi, cập nhật đúng tài liệu sở hữu nội dung.

## Kiến trúc và công nghệ

Modular Monolith: một codebase, một ứng dụng Spring Boot và một PostgreSQL database. Module chia theo nghiệp vụ, chưa tách microservice.

- Package gốc: `com.eduhub.edu_hub`.
- Java 21, Spring Boot 4.1.2, Maven; Spring Data JPA/Hibernate, Jakarta Validation.
- Identity dùng Spring Security: AuthenticationManager/DaoAuthenticationProvider xác thực username/password, BCrypt qua PasswordEncoder, Nimbus JwtEncoder/JwtDecoder HS256 và OAuth2 Resource Server xử lý Bearer. API nghiệp vụ yêu cầu JWT thông thường; JWT first-login chỉ đổi mật khẩu/đăng xuất. Chưa phân quyền role.
- Lombok, MapStruct; Apache POI đọc/ghi XLSX; Thymeleaf core cho email và Spring Mail gửi SMTP.
- Flyway quản lý schema/seed. Hiện chỉ duy trì unit test; quy ước kiểm thử ở AGENTS.md. Integration test sẽ bổ sung sau.
- Chưa khai báo springdoc/OpenAPI trong pom; không mặc định có Swagger. Actuator là API hạ tầng, không thuộc REST nghiệp vụ.

## Ownership và phân công

| Module | Dữ liệu/trách nhiệm |
|---|---|
| shared | BaseEntity, ApiResponse, PageResponse, FieldErrorDetail, ErrorCode, cấu hình chung, TextsNormalizer; SystemConfig mới là phần thiết kế. Bảng audit_logs cũ còn nhưng ứng dụng không ghi AuditLog. |
| identity | User, Role, RefreshToken; đăng nhập, phiên, mật khẩu, quản trị tài khoản và kiểm tra điều kiện gửi thông báo tài khoản |
| people | Student, Lecturer, Faculty, Cohort, AdministrativeClass; hồ sơ cá nhân, MSSV, mã giảng viên và tên lớp hành chính |
| admission | AdmissionPlan, AdmissionApplicant, AdmissionPlanClass, StudentAdmission; lập phương án, import, phân lớp và xác nhận từng hồ sơ |
| notification | QueuedAdmissionNotification, bảng admission_notifications; email, trạng thái gửi, hàng đợi, async và scheduler |
| curriculum | Major, Subject, Curriculum, CurriculumSubject, SubjectPrerequisite; danh mục và quy tắc chương trình/tiên quyết |
| scheduling | Semester, ModuleClass, Room, ClassSchedule; kỳ học, mở lớp, quản lý phòng và nguồn lập kế hoạch |
| enrollment | Thiết kế Enrollment và facade; chưa có implementation nguồn lịch sử/đăng ký thực tế |
| academic | Contract tính GPA, tín chỉ, cảnh báo học vụ; không sở hữu bảng điểm, chưa có implementation |
| aiassistant | Thiết kế KnowledgeSource, KnowledgeChunk, ChatSession, ChatMessage, MessageChunkReference, GraduationScenario; chưa có REST thực tế |

BE1 phụ trách shared/identity/people/admission/notification; BE2 phụ trách curriculum/scheduling/enrollment/academic. AI làm sau. Thứ tự nghiệp vụ BE2: học phần/CTĐT/tiên quyết → kỳ/phòng/lớp/lịch → đăng ký → điểm/học vụ. Chỉ coi hạng mục hoàn tất khi có source và kiểm chứng tương ứng.

## Tổ chức code và giao tiếp

```text
{module}/
├── api/
│   ├── controller/
│   ├── dto/request/
│   ├── dto/response/
│   ├── mapper/           chuyển entity/dữ liệu đã tải sang DTO khi cần
│   └── exception/        HTTP handler của module
├── application/
│   ├── service/          service use-case, truy vấn và điều phối
│   ├── specification/    predicate tìm kiếm/lọc theo tiêu chí
│   ├── facade/           interface và impl/ cho từng capability
│   └── exception/        exception nghiệp vụ của module
├── domain/
│   ├── model/
│   ├── repository/
│   ├── enums/
│   └── policy/           quy tắc kiểm tra/tính toán từ đầu vào
└── infrastructure/       config, security, persistence, spreadsheet, code, mail, template, dispatch
```

Đây là bố cục mục tiêu; chỉ tạo package khi có code thực tế. Service, kể cả QueryService, nằm trong application.service; specification tìm kiếm ở application.specification; policy ở domain.policy; cấu hình/settings ở infrastructure.config. Specification chỉ dựng predicate từ tiêu chí, không truy vấn DB/gọi facade; service tổ hợp tiêu chí và gọi repository. Identity dùng UserAccountSpecification cho tìm kiếm tài khoản theo nhiều tiêu chí. Một số module khác còn service/facade/specification hoặc contract ở package cũ, chỉ chuyển khi refactor đúng phạm vi. Không bắt buộc tách domain entity/persistence entity hoặc thêm adapter cho mỗi repository.

- API nhận request DTO và bọc response DTO; application điều phối use-case và transaction; domain chứa dữ liệu/quy tắc; infrastructure chứa chi tiết POI, JDBC, SMTP, scheduler và cấu hình.
- Mapper chỉ chuyển dữ liệu đã tải. Policy không gọi DB/facade hoặc phụ thuộc DTO HTTP.
- Quy ước DTO/exception ở AGENTS.md: service và facade dùng trực tiếp Request/Response trong api.dto, không thêm Command/Result hay mapper trung gian tương đương. Identity, admission và notification đã theo quy ước này; contract legacy ở module khác chuyển khi refactor đúng phạm vi. Admission dùng mapper Response ở api.mapper, mapper dữ liệu spreadsheet sang entity ở application.mapper; các kiểu dữ liệu kỹ thuật spreadsheet và RenderedEmail ở infrastructure tương ứng. Private record điều phối transaction/contract của port giữ gần nơi dùng.
- Identity: AuthApplicationService, AdminUserService, CurrentUserAuthenticationService, TokenService và UserDetailsServiceImpl ở application.service; PasswordPolicy/UserAccountAdministrationPolicy ở domain.policy; AuthenticationSettings/PasswordSettings ở infrastructure.config. AdminUserService và IdentityFacadeImpl dùng chung kiểm tra User/phiên, facade vẫn chỉ trả DTO. Facade và exception giữ package riêng, unit test theo package production. Không có application.command/result trong Identity.
- AdminUserService trả DTO summary riêng cho danh sách và DTO chi tiết riêng cho tài khoản; họ tên/số điện thoại được đọc qua PeopleFacade.AccountProfile theo User ID/role. PeopleAccountProfileFacadeImpl chỉ đọc projection hồ sơ qua repository People, không gọi ngược Identity. Contract quản trị tài khoản ở API_SPECIFICATION.md, capability ở MODULE_CONTRACT.md.
- Controller Identity, StudentSelfController, POST tạo SV/GV và PUT của AdminStudentController/AdminLecturerController lấy Jwt qua AuthenticationPrincipal, truyền principal đã xác thực cho service; không tự cắt Authorization hoặc giải mã lại JWT. StudentSelfController gọi StudentSelfService.getMyProfile/updateMyProfile cho /students/me theo User ID đã xác thực. AdminStudentController đọc hồ sơ theo Student ID qua StudentApplicationService.findById và cập nhật qua StudentAdminUpdateService.updateStudentProfile; AdminLecturerController cập nhật theo Lecturer ID qua LecturerAdminUpdateService.updateLecturerProfile. Điều kiện DB và giới hạn phân quyền được mô tả tại API_SPECIFICATION.md; xem/sửa hồ sơ cá nhân, tạo đơn lẻ và cập nhật quản trị đều kiểm tra người thực hiện/phiên qua IdentityFacade.
- Module không inject repository/service nội bộ của module khác. Facade trả ID/DTO, không trả entity/proxy. Hợp đồng cụ thể ở MODULE_CONTRACT.md.
- Các quan hệ JPA liên module hiện hữu gồm Major.faculty, Curriculum.cohort, AdministrativeClass.major, ModuleClass.subject/lecturer; giữ LAZY, không cascade sang module khác. Đây là mapping dữ liệu đã chốt, không cho phép tùy ý gọi repository liên module.
- Student/Lecturer giữ scalar userId, không giữ email hiện tại; email chỉ ở User thuộc Identity. StudentApplicationService và LecturerApplicationService dùng chung ProfileAccountEmailService tại people.application.service để loại User ID null/trùng, đọc email qua IdentityFacade theo lô và dựng map theo User ID. Service này không mở transaction riêng; mapper chỉ ghép dữ liệu đã tải vào response. Email đầu vào/lịch sử nhập học và recipient thông báo có ý nghĩa snapshot riêng; quy tắc schema/chuyển đổi ở DATABASE_DESIGN.md. Admission và notification giữ scalar ID tới module khác; JPA giữa các entity admission chỉ nằm trong nội bộ admission.
- Bean graph gửi mail: queued sender → IdentityFacade → NotificationFacade.ImmediateEmail → renderer/SMTP. AdmissionQueue có implementation riêng, không inject sender vào ImmediateEmail để tạo vòng khởi tạo bean.

## Trạng thái triển khai và giới hạn

### Đã có luồng thực tế

- Identity: login/logout/change-password, quản trị User, kiểm tra phiên và bootstrap admin dev.
- People: tạo/tra cứu sinh viên, cập nhật quản trị, GET/PATCH hồ sơ cá nhân; tạo/tra cứu/cập nhật giảng viên và môn có thể dạy, cấp MSGV theo khoa/năm tuyển dụng; create gửi mail một lần sau commit.
- Admission: phương án lưu database, chuẩn bị lớp, import XLSX theo ngành/khóa, phân bổ/xác nhận từng hồ sơ. Đọc ADMISSION_WORKFLOW.md trước khi sửa.
- Notification: gửi đồng bộ và hàng đợi nhập học, template HTML/text, retry. Đọc NOTIFICATION_README.md trước khi sửa.
- Curriculum: CRUD học phần theo phạm vi MVP, tiên quyết và facade đọc danh mục/CTĐT; chưa có REST CRUD CTĐT/ngành.
- Scheduling: kỳ học, mở/sửa/hủy lớp học phần, phòng học. ClassSchedule có schema/entity/query/trigger phục vụ ràng buộc phòng, chưa có REST xếp lịch/thời khóa biểu.

### Tích hợp đang thiếu

- Runtime scheduling dùng People/Curriculum thật qua facade ở mọi profile; JSON fixture chỉ ở test. StudentPlanning chỉ lấy STUDYING/chưa xóa, không phụ thuộc User hoặc endYear dự kiến.
- EnrollmentFacade.Planning chưa có bean. Có sinh viên mà thiếu năm nhập học, mapping CTĐT hoặc lịch sử đầy đủ: gợi ý mở môn trả 503/4317. Hủy lớp sĩ số 0 thiếu lịch sử trả 503/4325; lớp có sinh viên bị chặn 409/4323.
- Không dựng implementation trả rỗng/false để vượt kiểm tra. Mở, xem và sửa sức chứa lớp không bắt buộc nguồn lịch sử.
- Curriculum còn chờ kiểm tra điểm/lớp đã mở trước sửa tín chỉ hoặc xóa/ngừng môn. Scheduling đã chặn mở lớp từ môn INACTIVE/đã xóa, không đồng nghĩa chiều ngược đã hoàn thiện.
- Phân công giảng viên, xếp lịch, kiểm tra lịch khi đổi ngày kỳ/tăng sức chứa lớp và xử lý lịch khi hủy lớp là các use-case tiếp theo. Thống nhất thứ tự khóa, kiểm tra lại phòng khi lưu; đăng ký sau này phải khóa ModuleClass và đồng bộ currentSize.
- Dữ liệu lecturer_id cũ có FK NOT VALID cần đối soát ID thật trước validate; không xóa/gán lại ID theo fixture.

### Công việc còn lại và quyết định cần giữ

- People: StudentSelfService và StudentAdminUpdateService ở application.service, dùng chung StudentResponseMapper tại api.mapper và StudentTargetGpaPolicy tại domain.policy; StudentProfileUpdatePolicy giữ quy tắc chuẩn hóa/kiểm tra hồ sơ. StudentCreationService và LecturerCreationService điều phối tạo đơn lẻ, tạo DTO trước commit và gửi đồng bộ một lần sau commit; không có service/endpoint resend. StudentApplicationService và LecturerApplicationService phục vụ truy vấn hồ sơ. LecturerResponseMapper ghép email/môn đã tải; LecturerTeachingSubject giữ scalar subjectId, chỉ đọc danh mục qua CurriculumFacade.TeachingSubjects. Hai service kiểm tra request tìm kiếm và tổ hợp StudentSpecification/LecturerSpecification tại application.specification; specification chỉ dựng predicate. Giới hạn lưu kết quả gửi được mô tả tại NOTIFICATION_README.md.
- LecturerAdminUpdateService điều phối cập nhật hồ sơ/email/môn trong một transaction, khóa Lecturer trước môn/User; LecturerProfileUpdatePolicy giữ chuẩn hóa/validation thuần. Request/response ở api.dto, dùng lại LecturerResponseMapper; LecturerProfileExceptionHandler tại api.exception xử lý lỗi tạo/cập nhật theo field trong phạm vi AdminLecturerController. Chi tiết field/null và thay tập môn tại API_SPECIFICATION.md; không đổi schema hoặc cấp lại mã/tài khoản khi cập nhật.
- PeopleFacade.Scheduling trả LecturerResponse của API, phù hợp quy ước dùng DTO response chung. PATCH hồ sơ cá nhân phải giữ phân biệt thiếu field với null.
- StudentCodeGenerator/LecturerCodeGenerator ở people.application.service tải dữ liệu/cấp số; StudentCodePolicy/LecturerCodePolicy ở domain.policy ghép mã thuần. Hai generator tách allocateNextStudentSequence/allocateNextLecturerSequence để cấp STT và generateStudentCode/generateLecturerCode để ghép mã; LecturerCodeCounterRepository ở people.infrastructure.persistence thực hiện UPSERT bộ đếm kỹ thuật trong transaction hiện tại. StudentCodeGenerator đọc admission.student-code-format; LecturerCodeGenerator đọc people.lecturer-code-format từ YAML bằng @Value. AdmissionSettings không giữ bản sao định dạng MSSV. MSSV/MSGV/username đã cấp bất biến; schema và giới hạn dữ liệu khoa ở DATABASE_DESIGN.md.
- Search sinh viên/giảng viên chỉ đặt message không tìm thấy kết quả khi content rỗng; khi có dữ liệu, response không có field message. FE xác định rỗng bằng content. Chuẩn hóa validation giữa tạo/cập nhật là thay đổi hành vi cần xử lý riêng.
- TODO(AUTHORIZATION): đã yêu cầu đăng nhập và giới hạn mục đích JWT trên /api/v1/**, chưa có ma trận quyền role cho từng API; chi tiết ở API specification. AccessTokenFilter và AccessSessionService đã được bỏ.
- JWT first-login và chính sách đổi mật khẩu đã có tại backend; contract và giới hạn access token sau logout/đổi/reset mật khẩu chỉ mô tả tại API specification. Chưa có endpoint refresh token.
- TODO(AUDIT_LOG): chưa khôi phục entity/repository/ghi bảng audit_logs; đặt TODO tại thao tác cần ghi sau commit. Phòng học chưa có log nghiệp vụ/actor/audit riêng theo quyết định hiện tại.
- TODO(CAPACITY_CONFIG): giới hạn lớp học phần 80 còn là quy tắc cố định; cấu hình động phải đồng bộ service/DTO/constraint.
- TODO nhập học và notification chỉ duy trì trong hai tài liệu tương ứng, không sao chép lại ở đây.

## Môi trường dev và kiểm tra

Cấu hình chung ở [application.yaml](../src/main/resources/application.yaml). Mặc định profile dev; khai báo SPRING_PROFILES_ACTIVE để chọn profile khác. Biến bắt buộc gồm DBMS_CONNECTION, DBMS_USERNAME, DBMS_PASSWORD, JWT_SECRET, INITIAL_ACCOUNT_PASSWORD, APP_INIT_SYSTEM_ADMIN_USERNAME và APP_INIT_SYSTEM_ADMIN_PASSWORD. File .env được đọc tùy chọn và không đưa vào Git. SMTP/cấu hình email ở tài liệu notification.

JWT_SECRET vẫn là Base64 của ít nhất 32 byte khóa, dùng chung cho Nimbus encoder/decoder HS256. JWT_ACCESS_TOKEN_LIFETIME/JWT_REFRESH_TOKEN_LIFETIME và AUTH_TEMPORARY_LOCK_DURATION nhận Duration như 15m/7d; AUTH_MAX_FAILED_LOGINS là số nguyên dương. Giá trị mặc định và chính sách FE được mô tả tại API specification; biến mẫu ở [.env.example](../.env.example).

people.lecturer-code-format trong application.yaml mặc định `[MaKhoa][NamTuyenDung][SttGV]`. Mỗi token phải xuất hiện đúng một lần; được đổi thứ tự và thêm chữ/số/dấu gạch ngang hoặc gạch dưới, không nhận token lạ/khoảng trắng. MaKhoa lấy từ mã khoa chính thức, NamTuyenDung luôn hai chữ số cuối, SttGV luôn ba chữ số. Cấu hình sai bị chặn trước khi cấp STT; thay công thức chỉ áp dụng lần cấp mới, không đổi MSGV/username hoặc bộ đếm đã cấp.

PASSWORD_MINIMUM_LENGTH mặc định 8, cho phép 8–72 ký tự; BCrypt giới hạn riêng 72 byte UTF-8. INITIAL_ACCOUNT_PASSWORD là nguồn cấu hình duy nhất trong Identity cho cấp SV/GV và gửi email tài khoản; consumer không truyền mật khẩu hoặc cờ bỏ qua first-login. Mật khẩu tạm không kiểm tra độ mạnh, vẫn phải khác rỗng và không quá 72 byte. Thay cấu hình không sửa hash tài khoản đã cấp: gửi lại chỉ thành công khi mật khẩu cấu hình còn khớp hash, không tự reset để gửi mail.

application-dev.yaml local bật thêm db/seed. File dev, docs, postman và sample_data hiện bị .gitignore; người nhận code cần kiểm tra cấu hình local và cách chia sẻ tài liệu thực tế. Không tự đổi .gitignore hoặc stage file ngoài yêu cầu.

[ApplicationInitConfig](../src/main/java/com/eduhub/edu_hub/identity/infrastructure/config/ApplicationInitConfig.java) chạy ở mọi profile sau khi Flyway hoàn tất:

- Đọc app.init.system-admin từ YAML base, lấy giá trị từ APP_INIT_SYSTEM_ADMIN_USERNAME/PASSWORD; APP_INIT_SYSTEM_ADMIN_EMAIL tùy chọn. Username/password không được blank.
- Tạo role SYSTEM_ADMIN nếu thiếu, sau đó tạo tài khoản khi username cấu hình chưa tồn tại. User ACTIVE/LOCKED chưa xóa mềm được giữ nguyên. User đã xóa mềm hoặc DISABLED được xóa vật lý cùng refresh token cũ rồi tạo User mới trong cùng transaction. Không có trạng thái INACTIVE trên User; nếu còn hồ sơ/FK khác tham chiếu thì rollback toàn bộ và báo IdentityConfigurationException, không tự xóa/gỡ hồ sơ People.
- User mới ACTIVE, firstLogin=true; mật khẩu BCrypt, không kiểm tra độ mạnh đối với mật khẩu khởi tạo. Tài khoản đã tồn tại không bị tự sửa cờ firstLogin hoặc mật khẩu. Không ghi giá trị secret thật vào tài liệu.

```powershell
mvn -o spring-boot:run
mvn -o test
mvn -o spotless:check
```

Chế độ -o cần dependency đã có trong cache. Unit test hiện không cần Docker, database hoặc khởi động Spring application context. Không ghi cố định số lượng test hoặc coi test controller mock là xác nhận end-to-end. Transaction/concurrency/constraint database và toàn luồng auth chưa có kiểm thử tích hợp ở giai đoạn này; không coi unit test đạt là đã xác nhận các hành vi đó. Lỗi import đã biết ở ADMISSION_WORKFLOW.md vẫn còn hiệu lực.
