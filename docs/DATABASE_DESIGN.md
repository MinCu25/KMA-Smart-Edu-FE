# Database, Flyway và dữ liệu mẫu

## Nguồn chính thức và nguyên tắc

SQL trong [db/migration](../src/main/resources/db/migration) mô tả schema/chuyển đổi bắt buộc; [db/seed](../src/main/resources/db/seed) mô tả dữ liệu mẫu. Đọc toàn bộ chuỗi migration để xác định schema cuối, không chỉ đọc CREATE TABLE đầu tiên. JPA thay tên class/package không tự đổi tên bảng/cột SQL.

PostgreSQL dùng chung cho các module. Bảng/cột snake_case; các bảng nghiệp vụ có metadata BaseEntity, timestamp UTC và is_deleted. Giữ liên kết lịch sử khi soft delete, không cascade xóa dữ liệu module khác. API/facade trả DTO; mapping JPA không cho phép gọi repository liên module.

## Bảng hiện có theo ownership

| Module | Bảng |
|---|---|
| identity | roles, users, refresh_tokens |
| people | students, lecturers, faculties, cohorts, administrative_classes, lecturer_teaching_subjects; people_user_links và lecturer_code_counters là bảng toàn vẹn/cấp số nội bộ |
| curriculum | majors, subjects, subject_prerequisites, curriculums, curriculum_subjects |
| scheduling | semesters, module_classes, rooms, class_schedules |
| admission | admission_plans, admission_applicants, admission_plan_classes, student_admissions |
| notification | admission_notifications, entity Java QueuedAdmissionNotification |
| di sản giữ lại | audit_logs: còn trong migration, ứng dụng chưa ghi audit |

SystemConfig, enrollments và các bảng knowledge/chat/scenario là phần thiết kế/chưa có migration trong bộ source hiện tại. Không mô tả chúng như bảng runtime đã triển khai. Điểm dự kiến thuộc Enrollment; academic chỉ sở hữu logic GPA/tín chỉ/cảnh báo.

## Identity và People

- users: username unique, password_hash BCrypt, previous_password_hash nullable, status ACTIVE/LOCKED/DISABLED, failed_login_count, locked_until, password_changed_at, is_first_login. refresh_tokens quản lý phiên và revoked.
- [Migration lịch sử mật khẩu](../src/main/resources/db/migration/V20261109002023__add_previous_official_password_hash.sql) chỉ thêm một hash chính thức trước đó, không có bảng lịch sử nhiều đời hoặc mật khẩu plain-text. Đổi thông thường đưa hash hiện tại vào previous_password_hash; đổi lần đầu không đưa hash tạm vào đó. Reset lưu hash chính thức hiện tại trước khi cấp mật khẩu tạm; reset liên tiếp giữ nguyên hash chính thức gần nhất. Dữ liệu cũ chưa lưu lịch sử để NULL, không thể khôi phục mật khẩu cũ; lịch sử bắt đầu được ghi từ lần đổi/reset tiếp theo. Chính sách kiểm tra và thu hồi token ở API_SPECIFICATION.md.
- ApplicationInitConfig có ngoại lệ tạo lại User bootstrap đã xóa mềm/DISABLED: xóa refresh token cũ, xóa User rồi tạo User mới trong cùng transaction. FK hồ sơ/people_user_links vẫn giữ nguyên để chặn mất liên kết; lỗi FK rollback cả việc xóa refresh token. Không áp dụng xóa vật lý này cho API quản trị User hoặc hồ sơ People; cấu hình/hành vi bootstrap ở ARCHITECTURE.md.
- Student/Lecturer giữ user_id nullable; khi có phải tồn tại trong users và unique trong từng bảng. people_user_links cùng trigger ngăn một User gắn đồng thời Student và Lecturer, kể cả transaction cạnh tranh. Soft delete không giải phóng liên kết; đổi/gỡ user_id cập nhật cùng transaction.
- Student liên kết AdministrativeClass; lớp liên kết ngành và Cohort. administrative_classes không còn cột sao chép major_name/major_code; major_id có FK tới majors. Tên ngành trên DTO đọc qua facade theo lô.
- cohorts.start_year/end_year: cả hai cùng trống được giữ cho dữ liệu cũ; nếu khai báo phải đủ cặp và end_year > start_year. Không suy năm từ mã khóa.
- cohorts.code_sequence unique khi có giá trị, phạm vi 1–99. Migration admission backfill từ hậu tố mã cũ khi hợp lệ; cần đối soát dữ liệu thực trước dùng.
- Lớp hành chính có min_capacity/max_capacity/reserve_capacity, last_student_sequence 0–99; max_capacity + reserve_capacity <=99. Tên lớp unique theo ngành + khóa, không cấp lại số định danh đã dùng. Bộ đếm được giữ qua dữ liệu cũ, không lấy currentSize làm STT.
- students có citizen_id, application_code, entrance_score, activity_status, target_gpa và academic_warning_status/reason. Student/Lecturer không còn cột email hoặc trạng thái/lỗi gửi thông báo; users.email là nguồn duy nhất cho email hiện tại, nullable và không unique toàn hệ thống. Email không phải khóa danh tính sinh viên.
- target_gpa vẫn NUMERIC(19,2), nullable; giới hạn 0–4 và tối đa hai chữ số thập phân do DTO/policy ứng dụng kiểm tra, chưa có CHECK tương ứng trong database. Không tự sửa dữ liệu GPA cũ khi cập nhật code. Quy tắc PATCH và cập nhật email tài khoản ở API_SPECIFICATION.md.
- [Migration MSGV và môn giảng dạy](../src/main/resources/db/migration/V20261110060821__support_lecturer_recruitment_and_teaching_subjects.sql) thêm faculties.faculty_code nullable, unique kể cả lịch sử, chỉ nhận chữ A–Z. Trigger chặn đổi mã khoa sau khi đã có bộ đếm cấp MSGV. TODO(FACULTY_CODE_DATA): chờ bảng mã khoa chính thức để bổ sung bằng migration dữ liệu; không suy từ tên. Khoa chưa có mã bị chặn cấp MSGV mới bằng 400/4121.
- lecturers.recruitment_year lưu năm bốn chữ số 1000–9999, dữ liệu cũ giữ NULL; không backfill từ created_at và không đổi mã/username cũ. MSGV mặc định = mã khoa + hai số cuối năm tuyển dụng + STT ba chữ số; định dạng YAML do ARCHITECTURE.md mô tả. lecturer_code_counters cấp 001–999 theo (faculty_id, recruitment_year) bằng UPSERT cùng transaction tạo hồ sơ; xóa mềm không giảm bộ đếm. Unique lecturer_code/username vẫn chặn trùng toàn hệ thống, kể cả hai năm khác thế kỷ có cùng hai số cuối. lecturer_code_seq cũ được giữ như schema lịch sử nhưng runtime không dùng cấp mã mới.
- lecturer_teaching_subjects có metadata BaseEntity, scalar lecturer_id/subject_id ở Java, FK SQL tới lecturers/subjects và unique cặp kể cả lịch sử. Không cascade sang Curriculum; hồ sơ cũ không tự được gắn môn. Các cột/bảng mới chưa được chạy trên database trong quá trình sửa code; unit test không xác nhận UPSERT, trigger hoặc concurrency PostgreSQL thực tế. Mã và giới hạn MSSV thuộc People; quy trình nhập học ở ADMISSION_WORKFLOW.md.
- Cập nhật môn có thể dạy dùng schema hiện có: khóa Lecturer gốc, giữ liên kết còn chọn, xóa mềm môn bị bỏ và khôi phục cùng bản ghi khi chọn lại môn cũ để giữ unique cặp lecturer_id/subject_id. Chỉ thêm cặp chưa từng tồn tại; thay đổi liên kết và User.email cùng transaction hồ sơ. Contract thay tập môn/null ở [API_SPECIFICATION.md](API_SPECIFICATION.md).
- academic_warning_status/academic_warning_reason giữ nguyên schema và dữ liệu cũ, hiện chỉ đọc qua response; API cập nhật hồ sơ không còn nhận hoặc tự tính cảnh báo. Cơ chế đánh giá đang hoãn, xem TODO(ACADEMIC_WARNING_EVALUATION) tại [API_SPECIFICATION.md](API_SPECIFICATION.md). Dữ liệu actor/audit riêng đang hoãn, không khôi phục ghi audit_logs.

### Chuyển email hồ sơ về User

[Migration nguồn email](../src/main/resources/db/migration/V20261109164945__use_user_as_profile_email_source.sql) khóa bảng, giữ nguyên users.email và bỏ cột email trên students/lecturers. Đã chấp nhận bỏ email hồ sơ cũ, kể cả hồ sơ chưa gắn User hoặc có email khác tài khoản; không còn bước dừng để đối soát hai nguồn email này. Không tự tạo tài khoản, ghi đè User.email hoặc khôi phục email hồ sơ vào User đang trống.

Phạm vi bỏ email gồm cả hồ sơ đã xóa mềm; hồ sơ và liên kết User hiện có vẫn được giữ. Hồ sơ chưa có User hoặc User không có email hiển thị email=null. Email chỉ tồn tại ở cột hồ sơ cũ sẽ không còn sau migration; không có bảng lưu trữ hoặc bản sao email dự phòng.

Seed people hiện có ba giảng viên TEST-GV chưa gắn User và có email. Các hồ sơ mẫu vẫn được giữ, email mẫu bị bỏ cùng cột, nên không cần tạo User hoặc sửa seed đã áp dụng để chuyển schema. Flyway sắp seed cũ trước migration nguồn email; sau migration, API trả email=null cho ba giảng viên này khi chưa gắn tài khoản.

Migration vẫn dừng nếu users.email trùng giữa nhiều hồ sơ giảng viên chưa xóa, vì unique email giảng viên vẫn là ràng buộc nghiệp vụ. Kiểm tra so sánh trim/lowercase, thông báo chỉ có số lượng nhóm trùng, không đưa địa chỉ email vào log. Không dùng repair/clean hoặc tắt validation để bỏ qua ràng buộc này.

Email duy nhất của giảng viên vẫn theo hồ sơ chưa xóa, kể cả INACTIVE và User đã xóa/khóa. users.has_undeleted_lecturer_profile là cờ kỹ thuật do trigger INSERT/DELETE/đổi user_id/is_deleted của Lecturer cập nhật; không map vào entity User, không dùng để kiểm tra role/permission và không chứa bản sao email. Unique index uk_lecturers_email_active chuyển sang lower(btrim(users.email)) trong phạm vi cờ này; sinh viên và tài khoản chưa có hồ sơ giảng viên vẫn được dùng chung email. Giữ tên index để handler trả 409/4117. Email đầu vào/snapshot trong admission_applicants/student_admissions và recipient của admission_notifications giữ nguyên.

Chưa chạy lại migration trên database trong quá trình sửa code. Unit test không xác nhận trigger, unique index, rollback hoặc cạnh tranh thực tế; kiểm chứng PostgreSQL/Flyway sẽ thực hiện khi có yêu cầu kiểm thử tích hợp.

## Curriculum

- subjects: mã/tên unique, credits dương, status ACTIVE/INACTIVE. DTO hiện giới hạn 1–5; unique bao gồm bản ghi đã xóa. Mã bất biến trong luồng sửa hiện tại.
- subject_prerequisites: hai FK tới subjects, quan hệ có is_deleted. Gỡ mềm cạnh; thêm lại tạo cạnh mới, không cascade. Ghi tiên quyết khóa học phần theo ID, kiểm tra chu trình trước lưu.
- majors có faculty_id FK tới faculties, mã/tên unique. Mapping Major.faculty LAZY, không cascade.
- curriculums có major_id/cohort_id/training_type; unique bộ ngành–khóa–hệ. Dữ liệu cũ chưa gắn khóa có thể giữ cohort_id null nhưng chưa đủ để lập kế hoạch. Curriculum.cohort LAZY, không cascade.
- required_graduation_credits bắt buộc >0, được backfill từ môn REQUIRED của dữ liệu cũ. Nếu không có môn bắt buộc cần chốt số tín chỉ trước migrate. Yêu cầu tốt nghiệp độc lập với tổng tín chỉ danh mục.
- curriculum_subjects unique cặp curriculum_id/subject_id cả lịch sử soft delete; recommend_semester là kỳ trong lộ trình, không phải semester_id; không vượt số kỳ khi bổ sung CRUD sau này.
- Không lưu total_credits: Catalog tính từ quan hệ chưa xóa và môn chưa xóa, kể cả môn INACTIVE còn trong CTĐT. Đổi tín chỉ môn không tự đổi yêu cầu tốt nghiệp.

## Scheduling

### Kỳ học và lớp học phần

- semesters lưu tên/mã unique cả lịch sử, bốn ngày bắt buộc và hai cờ is_locked/locked_grade. Không có cột status; UPCOMING/ONGOING/ENDED suy từ ngày Việt Nam.
- Tên Học kì 1 năm học 2026-2027 tương ứng mã HK_1_2026_2027; service kiểm tra hai năm liên tiếp.
- CHECK: registration_start < registration_end < start_date < end_date. Hai exclusion constraint GiST ngăn chồng lấn riêng khoảng học/đăng ký giữa kỳ chưa xóa, dùng hai đầu mút đóng. Bản thân ngày biên trùng cũng bị chặn.
- module_classes có FK semester_id/subject_id, lecturer_id nullable. ModuleClass.subject/lecturer là quan hệ LAZY; lecturer_id là ID hồ sơ Lecturer, không phải User.
- FK fk_module_classes_lecturer có thể còn NOT VALID nếu dữ liệu cũ không khớp. Đối soát giảng viên thật trước ALTER TABLE ... VALIDATE CONSTRAINT; không tự gán ID fixture hoặc xóa lớp cũ.
- module_class_code unique; class_sequence dương và unique theo kỳ + học phần, tính cả lớp CANCELLED/soft delete. Không cấp lại mã/STT.
- max_capacity 1–80, current_size >=0 và <=max_capacity. Status UNSCHEDULED/SCHEDULED/OPEN/CANCELLED; lớp mới chưa có giảng viên, sĩ số 0.
- Sửa/hủy khóa kỳ rồi lớp. Hủy đổi CANCELLED, không xóa vật lý hoặc giải phóng mã. Lịch sử đăng ký chưa có nguồn thực không đồng nghĩa không có Enrollment; contract ở MODULE_CONTRACT.md.

### Phòng, lịch và constraint

Nguồn schema: [init_rooms_and_class_schedules.sql](../src/main/resources/db/migration/V20261105165309__init_rooms_and_class_schedules.sql).

- rooms không có room_type. room_code/building_code/room_number VARCHAR(50) bắt buộc; room_name VARCHAR(255) không blank; campus VARCHAR(100), default chuỗi rỗng.
- room_code unique toàn hệ thống; bộ campus/building_code/room_number cũng unique, tính cả soft delete. Mã dạng số-phòng/tòa như 102-TA1 được chuẩn hóa tại API; buildingCode/roomNumber phải khớp các phần mã.
- capacity INTEGER >0, độc lập giới hạn lớp 80; status ACTIVE/INACTIVE. Không cascade xóa phòng/lịch sử.
- class_schedules có module_class_id/room_id FK, day_of_week 2–8, lesson_order_start/end, start_date/end và BaseEntity. Chưa có REST tạo lịch/thời khóa biểu.
- Trigger require_available_schedule_room khóa Room, chặn lịch mới trỏ phòng INACTIVE/đã xóa/không đủ sức chứa. Index theo room_id cho lịch chưa xóa và module_class_id.
- A2: khóa phòng trước ngừng dùng/xóa, kiểm tra lịch chưa xóa thuộc lớp chưa xóa/chưa CANCELLED và kỳ chưa xóa có end_date >= hôm nay Việt Nam. Không chỉ xét ngày kết thúc từng dòng lịch.
- A3: khi giảm sức chứa phòng, so với ModuleClass.maxCapacity trong cùng tập lịch, không dùng currentSize. Bằng đúng maxCapacity được phép. Lỗi không lưu thay đổi một phần.
- Liên kết lịch sử giữ nguyên khi Room INACTIVE/soft delete hoặc kỳ đã kết thúc. Đổi sức chứa lớp/ngày kỳ cần tích hợp kiểm tra lịch ở use-case tiếp theo.

## Admission và notification

Nguồn: [create_admission_workflow.sql](../src/main/resources/db/migration/V20261106160000__create_admission_workflow.sql), tiếp theo là [allow_three_scheduled_admission_retries.sql](../src/main/resources/db/migration/V20261107010000__allow_three_scheduled_admission_retries.sql).

| Bảng | Ràng buộc cần giữ |
|---|---|
| admission_plans | major_id/cohort_id FK; total_students >=0; min>0, min<=max, reserve>=0, max+reserve<=99; revision, confirmation_token, processing_until và exception_reason |
| admission_plan_classes | class_id unique toàn bảng; unique plan_id/class_position; target_size 0–99, không phải sức chứa lớp |
| admission_applicants | unique plan_id/row_number; dữ liệu nhập, lỗi/cảnh báo, state, reuse_account, class_id/student_id; có index plan_id/state |
| student_admissions | application_code unique toàn hệ thống, tối đa 100; FK sinh viên/plan/lớp; snapshot CCCD 12 số, họ tên và entrance_score NUMERIC(19,2); activity_status STUDYING mặc định |
| admission_notifications | admission_id bắt buộc/unique FK tới student_admissions; student_id bắt buộc; recipient nullable, kind/state, failure_count, next_attempt_at, last_error tối đa 255; index state/next_attempt_at |

Constraint cuối của failure_count là 0–4, dù CREATE TABLE đầu tiên còn 0–3. Dữ liệu cũ có ba thất bại có thể được xử lý lượt cuối, không reset bộ đếm. Trạng thái/lỗi gửi chỉ lưu trên admission_notifications, không có bản sao trên Student/Lecturer.

[Migration bỏ bản sao kết quả gửi](../src/main/resources/db/migration/V20261109180930__remove_profile_notification_snapshots.sql) bỏ hai cột account_notification_status/account_notification_error cùng CHECK liên quan ở mỗi bảng students/lecturers. Đã chấp nhận bỏ các giá trị tổng hợp cũ, không chuyển sang users, không tạo bảng lịch sử hoặc dựng dữ liệu gửi giả. admission_notifications và giới hạn retry giữ nguyên. Migration chưa được chạy trên database trong quá trình sửa code; giới hạn không lưu kết quả gửi đơn lẻ/GV và TODO tương lai ở [NOTIFICATION_README.md](NOTIFICATION_README.md).

Entity notification giữ scalar admissionId/studentId; tên class mới không đổi bảng admission_notifications. Transaction từng hồ sơ bao gồm Student/User/MSSV/lịch sử/hàng đợi; chi tiết trạng thái, phân bổ và retry ở hai tài liệu nghiệp vụ.

## Flyway và profile

```text
src/main/resources/db/
├── migration/    schema, constraint, trigger, backfill/chuyển đổi bắt buộc
└── seed/         dữ liệu mẫu chỉ khi bật location
```

application.yaml bật classpath:db/migration. application-dev.yaml local bổ sung classpath:db/seed; profile mặc định dev, deployment chọn SPRING_PROFILES_ACTIVE phù hợp. File dev hiện bị .gitignore, không giả định người nhận repo tự có cấu hình local đó.

- Flyway sắp version trên toàn bộ location, không chạy hết migration rồi mới seed theo thứ tự thư mục.
- Migration/seed mới dùng timestamp thật yyyyMMddHHmmss, lấy bằng Get-Date ngay lúc tạo; phải lớn hơn version lớn nhất của cả hai thư mục, không trùng version.
- Migration gồm cả backfill, chuẩn hóa và INSERT people_user_links cần cho toàn vẹn. Không chuyển chúng sang dữ liệu mẫu.
- Ba role STUDENT/LECTURER/ACADEMIC_ADMIN thuộc migration insert_required_identity_roles, chạy mọi profile. SYSTEM_ADMIN do ApplicationInitConfig tạo cùng bước khởi tạo quản trị; chỉ chạy Flyway không tự có role này. Cấu hình khởi tạo ở ARCHITECTURE.md.
- Seed versioned V... chỉ chạy một lần theo history. Bổ sung dữ liệu mẫu bằng version mới, không sửa file đã chạy. Không tùy ý chuyển cùng database qua lại profile có/không seed để tránh applied migration không được resolve.

### Dữ liệu mẫu để phát triển

Seed hiện tại theo thứ tự version: subject → curriculum → semester → people → administrative_classes → accounts_data → room. Không seed Student, ModuleClass hoặc ClassSchedule.

- Subject/tiên quyết có dữ liệu ACTIVE/INACTIVE/soft delete và cạnh đã gỡ để thử lọc, gỡ/thêm lại, chu trình; CS090/CS099/SEM101 là các ví dụ thử trạng thái/CRUD.
- CTĐT CNTT/ATTT/DTVT/TTNT có 8 kỳ, 40 quan hệ REQUIRED mỗi CTĐT; tín chỉ yêu cầu mẫu 124/123/123/124. Lookup bằng mã, không cố định ID hoặc tự chỉnh sequence.
- Kỳ học mẫu 2022–2028, hai kỳ/năm, ngày cụ thể ở seed_semester_management; trạng thái luôn tính tại ngày truy vấn, không giữ bảng snapshot trạng thái cũ.
- People/CT8 và lớp mẫu dùng major_id theo schema cuối, chưa tự tạo hồ sơ cho User Postman. Seed Postman chỉ tạo STUDENT/LECTURER/ACADEMIC_ADMIN; tài khoản quản trị hệ thống do ApplicationInitConfig tạo. User test có thể login nhưng GET /students/me vẫn 404 nếu chưa có Student liên kết.
- Phòng mẫu: 12 phòng trên CS1/CS2, TA1/TA2/TB1; 9 ACTIVE, 2 INACTIVE và 1 soft delete; không có lịch mẫu. Chỉ bật migration thì danh mục phòng ban đầu rỗng.
- SQL trong seed là nguồn chi tiết mã/ngày/tín chỉ mẫu, không sao chép toàn bộ bảng dữ liệu vào tài liệu. Không suy ID bản ghi theo thứ tự ví dụ.

### Database đã chạy history cũ

Bộ migration hiện tại đã từng tách schema/seed và gộp phần khởi tạo phòng theo quyết định trước đây. Database đã chạy bộ file cũ không mặc nhiên nâng cấp được bằng history mới: có thể checksum mismatch hoặc applied migration not resolved.

1. Database mới/rỗng có thể chạy trọn bộ theo profile.
2. Database cũ cần giữ dữ liệu: sao lưu, đối soát version/checksum/schema rồi lập phương án chuyển tiếp riêng. Không chỉ repair để che sai lệch, không chạy lại seed gây trùng dữ liệu.
3. Sau đổi tên/di chuyển SQL, chạy Maven clean để loại SQL cũ trong target/classes. Đây không phải Flyway clean, không xóa database.
4. Không tự xóa schema, flyway_schema_history, bật Flyway clean hoặc tắt validation. Không đổi migration đã áp dụng để phục vụ một lần chạy local.

Schema phòng đã gộp trong migration init_rooms_and_class_schedules và seed_room_management; không khôi phục ba file phòng cũ còn sót trong build output.

## Kiểm chứng

Hiện chỉ chạy unit test theo AGENTS.md; chưa có kiểm thử tự động trên PostgreSQL/Flyway hoặc Spring context. Unit test không xác nhận migration, FK, transaction/rollback hoặc tính đúng khi migrate lại. Các kiểm thử tích hợp sẽ bổ sung sau khi được yêu cầu; không dùng database trong .env để chạy kiểm thử tự động.

Migration-only phải có ba role nghiệp vụ nhưng chưa có SYSTEM_ADMIN hoặc người dùng; migration+seed phải giữ dữ liệu đúng khi migrate lần nữa. Đây là các điều kiện cần kiểm chứng khi bổ sung integration test, không phải kết quả kiểm thử hiện có. Kế hoạch nâng cấp database thật vẫn thực hiện riêng; lỗi nghiệp vụ đã biết xem tài liệu nhập học.
