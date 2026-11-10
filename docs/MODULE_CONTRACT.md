# Hợp đồng liên module

Tài liệu này mô tả capability, consumer và ranh giới giao dịch. Signature/kiểu chính xác đọc tại interface source được liên kết; không giữ thêm bản sao toàn bộ interface dễ lỗi thời. REST công khai xem [API_SPECIFICATION.md](API_SPECIFICATION.md), ownership xem [ARCHITECTURE.md](ARCHITECTURE.md).

## Nguyên tắc

- Inject facade interface của module sở hữu, không inject implementation/repository/service nội bộ từ module khác. Chỉ ID/DTO/kiểu đơn giản đi qua facade, không expose entity/proxy.
- Facade mới theo application.facade, implementation từng capability ở application.facade.impl với hậu tố Impl. Theo AGENTS.md, contract mới dùng DTO Request/Response trong api.dto, không thêm nhóm Command/Result tương đương. Các DTO facade/adapter legacy nêu dưới đây giữ đúng source và chuyển khi refactor đúng phạm vi.
- Chỉ công bố capability có nhu cầu thực. Interface/DTO dự kiến không chứng minh có bean thực thi; không dựng adapter giả trả dữ liệu rỗng để che nguồn chưa triển khai.
- Consumer quản lý transaction của use-case; method ghi/khóa tham gia transaction theo hợp đồng cụ thể, không tự thêm REQUIRES_NEW làm vỡ rollback.
- Khi thay signature/DTO/semantics, cập nhật consumer, test và tài liệu này. Thay JSON/URL thuộc API specification và file TS; không coi đổi tên Java là yêu cầu đổi dữ liệu công khai.

## 1. IdentityFacade

[Interface](../src/main/java/com/eduhub/edu_hub/identity/application/facade/IdentityFacade.java) · [Implementation](../src/main/java/com/eduhub/edu_hub/identity/application/facade/impl/IdentityFacadeImpl.java).

| Capability | Consumer / bảo đảm |
|---|---|
| createStudentAccountWithoutNotification, createLecturerAccountWithoutNotification | People tạo User trong transaction tạo hồ sơ, trả userId, chưa gửi mail |
| sendStudentAccountNotification, sendLecturerAccountNotification | People và queued sender; xác nhận trạng thái tài khoản/firstLogin/mật khẩu khởi tạo, trả AccountNotificationResponse(userId,emailSent,emailError) |
| getStudentAccount | Admission kiểm tra tài khoản dùng lại, không trả User entity |
| sendStudentAdmissionNotification | Queued sender gửi xác nhận tới recipient của lần nhập học, không reset mật khẩu |
| requireCurrentUser | People truyền Jwt đã xác thực từ SecurityContext; đọc claims không gọi decoder, đối chiếu User ID/username, User ACTIVE/chưa xóa/không khóa tạm và phiên đúng chủ sở hữu/chưa revoke/còn hạn. Không nhận ID User tùy chọn, chưa kiểm tra role |
| updateAccountEmail | People cập nhật nguồn email duy nhất User.email từ PATCH /me hoặc PUT hồ sơ sinh viên/giảng viên; User ID lấy từ principal/liên kết hồ sơ phía server. Chuẩn hóa/null, khóa User sau hồ sơ gốc và chỉ lưu khi đổi. Propagation.MANDATORY tham gia transaction hồ sơ, không tự commit; lỗi phải rollback toàn use-case |
| findAccountEmailsByUserIds | People dựng StudentResponse/LecturerResponse; trả UserAccountEmailResponse(userId,email) theo lô 500, thứ tự User ID tăng dần. Giữ cả User đã xóa/khóa để không mất email hiển thị hồ sơ; email có thể null, ID không tồn tại không có phần tử, tập rỗng không query |
| findUserIdsByEmail | People kiểm tra email giảng viên: đối chiếu trim/lowercase, trả User ID mọi role/trạng thái, rồi People kiểm tra hồ sơ giảng viên chưa xóa. Không áp đặt unique email chung cho User |
| existsByUsername | People kiểm tra trùng username trước cấp tài khoản |

DTO cấp tài khoản là CreateStudentAccountRequest/CreateLecturerAccountRequest trong identity.api.dto.request; AccountNotificationResponse và StudentAccountResponse ở identity.api.dto.response. Facade dùng trực tiếp các DTO này, không còn command/result của Identity. Không còn createStudentAccount tự gửi thông báo trong interface. API quản trị User dùng AdminUserService nội bộ identity, không khôi phục method facade quản trị chỉ để khớp tài liệu cũ.

requireCurrentUser được IdentityFacadeImpl chuyển cho CurrentUserAuthenticationService, dùng chung kiểm tra User/phiên với AdminUserService. User entity từ service này chỉ dùng nội bộ Identity, không đi qua facade; contract DTO của People giữ nguyên.

Request cấp tài khoản chỉ nhận username/email, luôn firstLogin=true; Identity chọn mật khẩu tạm từ PasswordSettings và dùng PasswordEncoder. Hai method gửi thông báo tài khoản chỉ nhận userId, lấy cùng cấu hình để đối chiếu hash và gửi. People/queued sender không giữ bản sao mật khẩu khởi tạo; thay cấu hình không tự reset các tài khoản đã cấp. Cấu hình do ARCHITECTURE.md sở hữu; không kiểm tra độ mạnh mật khẩu tạm khi cấp tài khoản.

## 2. PeopleFacade

[Interface](../src/main/java/com/eduhub/edu_hub/people/application/facade/PeopleFacade.java).

### LoginProfile

[PeopleLoginProfileFacadeImpl](../src/main/java/com/eduhub/edu_hub/people/application/facade/impl/PeopleLoginProfileFacadeImpl.java) phục vụ login của identity. findStudentFullNameByUserId/findLecturerFullNameByUserId trả Optional tên từ hồ sơ chưa xóa bằng User ID đã xác thực; không trả entity hoặc gọi ngược IdentityFacade. Chỉ truy vấn loại hồ sơ phù hợp role, không chặn hồ sơ INACTIVE/DEACTIVATED chỉ vì trạng thái nghiệp vụ. Thiếu hồ sơ trả rỗng để login vẫn thành công. Truy vấn read-only tham gia transaction login của consumer.

### AccountProfile

[PeopleAccountProfileFacadeImpl](../src/main/java/com/eduhub/edu_hub/people/application/facade/impl/PeopleAccountProfileFacadeImpl.java) phục vụ xem chi tiết tài khoản của AdminUserService. findStudentContactByUserId/findLecturerContactByUserId nhận User ID của tài khoản đích, trả Optional<AccountProfileContactResponse> trong people.api.dto.response. Repository chỉ chiếu fullName/phone từ hồ sơ chưa xóa mềm; không lọc trạng thái nghiệp vụ, không tải tài khoản hoặc gọi ngược IdentityFacade. Identity chọn đúng method theo role, admin không truy vấn hồ sơ; thiếu hồ sơ trả Optional rỗng. Read-only tham gia transaction đọc chi tiết của consumer, không khóa ghi hoặc thay đổi dữ liệu. Capability login hiện có giữ nguyên.

### Admission

[PeopleAdmissionFacadeImpl](../src/main/java/com/eduhub/edu_hub/people/application/facade/impl/PeopleAdmissionFacadeImpl.java) phục vụ admission và queued notification sender.

- requireCohort/lockCohort xác định và khóa khóa học.
- findClasses/findClassesByIds, lockClass, createClass/configureClass và findClassPrefixes cung cấp dữ liệu lớp, tên/tiền tố, sĩ số và cấu hình. findClasses giữ cả lớp đã xóa để không cấp lại STT.
- findStudentsByCitizenIds/findStudentsByIds trả AdmissionStudentInfo theo lô, không phải entity Student.
- registerStudent nhận AdmissionStudentRegistration, trả AdmissionStudentRegistrationResult(student,reused,accountLocked). Khóa lớp, kiểm tra sức chứa, cấp MSSV bằng bộ sinh dùng chung và tạo/dùng tài khoản qua IdentityFacade.
- Không có capability ghi trạng thái gửi vào Student; Notification lưu kết quả trên bản ghi thông báo nhập học của mình.

DTO Admission* nằm ở people.application.facade.dto. Các thao tác lock/ghi dùng Propagation.MANDATORY để tham gia transaction do consumer mở. Lỗi StudentAdmission/queue phải rollback Student/User/MSSV của cùng hồ sơ, không để facade tự commit riêng.

### Scheduling

[PeopleSchedulingFacadeImpl](../src/main/java/com/eduhub/edu_hub/people/application/facade/impl/PeopleSchedulingFacadeImpl.java):

- findStudentsForPlanning trả StudentPlanningResponse cho sinh viên STUDYING/chưa xóa theo ngành–khóa–hệ; không loại theo User/endYear.
- findLecturersByIds trả LecturerResponse theo tập ID để bổ sung tên cho lớp đã có giảng viên, không lọc mất hồ sơ INACTIVE từng được phân công.

LecturerResponse hiện dùng chung REST/facade; đây là tương thích hiện hữu, không tự nhân bản/đổi DTO khi consumer chưa được cập nhật. Lớp chưa có giảng viên giữ lecturerId/lecturerName null và không gọi nguồn People để phân công ngầm.

## 3. CurriculumFacade

[Interface](../src/main/java/com/eduhub/edu_hub/curriculum/application/facade/CurriculumFacade.java).

| Facet | Implementation | Capability / consumer |
|---|---|---|
| ReferenceData | [CurriculumReferenceDataFacadeImpl](../src/main/java/com/eduhub/edu_hub/curriculum/application/facade/impl/CurriculumReferenceDataFacadeImpl.java) | findMajorsByIds, findCurriculumAssignments: People đọc tên ngành, scheduling map ngành–khóa–hệ sang CTĐT |
| Catalog | [CurriculumCatalogFacadeImpl](../src/main/java/com/eduhub/edu_hub/curriculum/application/facade/impl/CurriculumCatalogFacadeImpl.java) | findById/findCurriculum: đọc CTĐT, tín chỉ tính động; chưa phải REST CRUD CTĐT |
| Majors | [CurriculumMajorFacade](../src/main/java/com/eduhub/edu_hub/curriculum/application/CurriculumMajorFacade.java) | requireMajor/findMajorsForClassNaming: scope và tên lớp của people/admission |
| TeachingSubjects | [CurriculumTeachingSubjectsFacadeImpl](../src/main/java/com/eduhub/edu_hub/curriculum/application/facade/impl/CurriculumTeachingSubjectsFacadeImpl.java) | requireActiveTeachingSubjects: kiểm tra/khóa môn khi tạo/cập nhật GV; findTeachingSubjectsByIds: đọc tên môn lịch sử theo lô cho hồ sơ |
| ClassOpening | [CurriculumClassOpeningFacadeImpl](../src/main/java/com/eduhub/edu_hub/curriculum/application/facade/impl/CurriculumClassOpeningFacadeImpl.java) | findPlanningSubjects, findSubjectsByIds, requireOpenableSubjects: scheduling đọc môn/lộ trình và kiểm tra môn mở được |

findSubjectsByIds có thể đọc môn lịch sử đã ẩn để xem lớp cũ. requireOpenableSubjects yêu cầu mọi môn ACTIVE/chưa xóa, giữ khóa đọc đến cuối transaction mở lớp. Catalog đọc Cohort qua quan hệ entity LAZY, không có People.Organization giả. TeachingSubjects dùng SubjectSimpleResponse trong curriculum.api.dto.response; không dùng contract mở lớp cho năng lực giảng dạy. requireActiveTeachingSubjects dùng MANDATORY, giữ khóa đọc môn theo ID tăng dần đến hết transaction tạo/cập nhật GV; thiếu môn hoặc môn INACTIVE/đã xóa trả TeachingSubjectException. findTeachingSubjectsByIds giữ cả môn lịch sử ngừng/ẩn để không làm mất thông tin đã gắn; PUT bỏ/null danh sách môn chỉ gọi nhánh đọc này.

UC sửa tín chỉ/xóa/ngừng môn còn chờ contract kiểm tra lớp/điểm ở chiều ngược; không mặc định Facade Scheduling/Enrollment đã cung cấp phép kiểm tra theo học phần.

## 4. SchedulingFacade.RoomCapacity

[Interface](../src/main/java/com/eduhub/edu_hub/scheduling/application/SchedulingFacade.java) · [RoomCapacityFacade](../src/main/java/com/eduhub/edu_hub/scheduling/infrastructure/RoomCapacityFacade.java).

countSuitableRooms(requiredCapacity) đếm phòng ACTIVE/chưa xóa/capacity đủ yêu cầu cho cảnh báo phương án nhập học. Không giữ phòng, không xếp lịch. Interface hiện chỉ có RoomCapacity; không chép lại các signature timetable/đăng ký/lớp chưa tồn tại từ thiết kế cũ.

Quản lý phòng/kỳ/lớp là service nội bộ scheduling. RoomScheduleSpecification query lịch thật cho A2/A3, không thêm facade giả. Phân công/xếp lịch sẽ bổ sung capability khi có use-case thực.

## 5. EnrollmentFacade — có contract, chưa có implementation

[Interface](../src/main/java/com/eduhub/edu_hub/enrollment/application/EnrollmentFacade.java).

EnrollmentFacade.Planning dành cho hai adapter scheduling:

- findLearningHistory(studentIds): lịch sử đầy đủ theo môn/năm học/kỳ, kể cả DROPPED/soft delete. COMPLETED nghĩa là đã đạt; không biến nguồn chưa có thành lịch sử rỗng.
- summarizeModuleClass(moduleClassId): đếm mọi bản ghi đăng ký theo ID lớp, kể cả đã hủy/ẩn, cùng số sinh viên distinct và cờ đầy đủ của nguồn.

[FacadeAcademicPlanningDataSource](../src/main/java/com/eduhub/edu_hub/scheduling/infrastructure/FacadeAcademicPlanningDataSource.java) và [FacadeModuleClassEnrollmentQuery](../src/main/java/com/eduhub/edu_hub/scheduling/infrastructure/FacadeModuleClassEnrollmentQuery.java) dùng facade thật ở mọi profile. JSON fixture chỉ ở src/test/resources, không có runtime fixture.

Thiếu dữ liệu đầy đủ chặn gợi ý mở môn 503/4317 và hủy lớp sĩ số 0 bằng 503/4325. ModuleClassEnrollmentQuery là port nội bộ scheduling, không phải REST. Đăng ký về sau phải khóa hàng lớp, kiểm tra CANCELLED/sức chứa và đồng bộ currentSize.

Các method findById/findByStudentAndSemester/findByModuleClass/isEnrolled/findCompletedEnrollments hiện là interface dự kiến, chưa có service/REST đăng ký thực thi.

## 6. AcademicFacade — contract dự kiến

[Interface](../src/main/java/com/eduhub/edu_hub/academic/application/AcademicFacade.java): calculateCumulativeGpa, calculateAccumulatedCredits, getStudentAcademicSummary, evaluateAcademicWarning. Chưa có implementation/REST; academic không sở hữu Enrollment hoặc bảng điểm. Không quảng bá endpoint tính GPA/nhập điểm là đã chạy.

## 7. NotificationFacade

[Interface](../src/main/java/com/eduhub/edu_hub/notification/application/facade/NotificationFacade.java).

| Facet | Method | Kết quả / transaction |
|---|---|---|
| ImmediateEmail | sendAccountEmail(SendAccountEmailRequest), sendAdmissionConfirmationEmail(SendAdmissionConfirmationEmailRequest) | EmailDeliveryResponse; [ImmediateEmailNotificationFacadeImpl](../src/main/java/com/eduhub/edu_hub/notification/application/facade/impl/ImmediateEmailNotificationFacadeImpl.java) dùng SUPPORTS, render/gửi đồng bộ |
| AdmissionQueue | enqueueAdmissionNotification(QueueAdmissionNotificationRequest) | notificationId; [AdmissionNotificationQueueFacadeImpl](../src/main/java/com/eduhub/edu_hub/notification/application/facade/impl/AdmissionNotificationQueueFacadeImpl.java) dùng MANDATORY, lưu queue/phát AdmissionNotificationQueued trong transaction nhập học |
| AdmissionQueue | findNotificationsByAdmissionIds(admissionIds) | List AdmissionNotificationResponse, khử trùng ID, query lô 500 và sắp theo ID thông báo |

Các Request/Response trên thuộc notification.api.dto.request/response, dùng trực tiếp qua facade; AdmissionNotificationResponse cũng là DTO của REST trạng thái nhập học. RenderedEmail thuộc infrastructure.template và không đi qua facade. Identity/AdminUserService chọn rõ template ACCOUNT_CREATED/PASSWORD_RESET; xác nhận nhập học dùng ADMISSION_CONFIRMED và không chứa mật khẩu. Admission tự truy vấn các ID lịch sử thuộc plan; notification không đọc entity/repository admission. Chỉ ID/DTO qua ranh giới, RenderedEmail không lưu queue/DB/log.

Chi tiết lần đầu/retry, sau commit, lỗi template/SMTP, cấu hình và TODO dịch vụ ngoài chỉ duy trì ở [NOTIFICATION_README.md](NOTIFICATION_README.md). Chưa có AdmissionFacade vì admission chưa có consumer liên module.
