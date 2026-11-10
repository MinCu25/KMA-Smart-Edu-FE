# Quy trình nhập học và phân lớp

Module admission điều phối lập phương án, chuẩn bị lớp, phân bổ/xác nhận. Student, Cohort, AdministrativeClass và bộ sinh MSSV thuộc people; tài khoản thuộc identity; gửi email thuộc notification. Hợp đồng HTTP ở [API_SPECIFICATION.md](API_SPECIFICATION.md), facade ở [MODULE_CONTRACT.md](MODULE_CONTRACT.md), schema ở [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

## Thành phần và ranh giới

| Thành phần | Trách nhiệm |
|---|---|
| AdmissionPlanningService | Tạo/đọc phương án và tải mẫu theo ngành/khóa |
| AdmissionImportService | Đọc, validate, đối chiếu danh tính, gộp và lưu hồ sơ |
| AdmissionApplicantValidationPolicy / AdmissionIdentityPolicy / AdmissionApplicantMergePolicy | Validation field, so sánh dữ liệu, gộp giữ hồ sơ đã nhập học |
| AdmissionClassPreparationService | Liệt kê và tạo/dùng lại lớp theo kịch bản đã chọn |
| AdmissionAllocationService / SerpentineClassAllocator | Phân theo điểm, điều chỉnh thủ công và giảm trùng họ tên |
| AdmissionCapacityPolicy / AdmissionScoreBalancePolicy / AdmissionDuplicateNamePolicy | Kịch bản sĩ số, thống kê điểm và giới hạn tên trùng |
| AdmissionPlanQueryService / AdmissionPlanResponseMapper / AdmissionScenarioResponseMapper | Tải dữ liệu và dựng kết quả/cảnh báo; mapper không query DB |
| AdmissionConfirmationService / AdmissionApplicantEnrollmentService / AdmissionConfirmationLeaseService | Điều phối cả đợt, lưu từng hồ sơ, phối hợp worker |
| AdmissionSpreadsheetReader / AdmissionSpreadsheetScopeValidator / AdmissionSpreadsheetRowParser | Điều phối đọc file, kiểm tra metadata, parse từng dòng |
| AdmissionSpreadsheetColumn / AdmissionSpreadsheetTemplateWriter | Header và tạo mẫu XLSX |

Code theo api/application/domain/infrastructure. Controller và service dùng trực tiếp DTO Request/Response trong api.dto; multipart giữ nguyên tên tham số và yêu cầu bắt buộc, controller gom thành CreateAdmissionPlanFromFileRequest hoặc ImportAdmissionApplicantsRequest trước khi gọi service. Mapper Response ở api.mapper chỉ dựng DTO từ dữ liệu đã tải. AdmissionApplicantImportMapper trong application.mapper chuyển AdmissionSpreadsheetApplicant thành AdmissionApplicant; AdmissionSpreadsheetApplicant và AdmissionSpreadsheetScope là dữ liệu nội bộ ở infrastructure.spreadsheet, độc lập entity JPA. Policy kiểm tra/gộp hồ sơ ở domain.policy; ngày đánh giá do service cung cấp. AdmissionPlanLockService khóa plan và đối chiếu revision trong transaction của use-case. Chuẩn hóa dùng shared.text.TextsNormalizer. Chưa có consumer cần AdmissionFacade nên chưa tạo facade cho admission.

AdministrativeClassController đặt tại admission vì phục vụ chuẩn bị lớp cho phương án; entity/lưu lớp vẫn thuộc people. Admission chỉ giữ ID tham chiếu sang module khác, không đọc repository/entity của chúng. NotificationFacade.AdmissionQueue chỉ nhận/trả ID/DTO. API trạng thái thông báo dùng chung AdmissionNotificationResponse do notification sở hữu, không tạo bản sao tại admission.

## 1. Lập phương án và chọn kịch bản

Chọn majorId/cohortId từ danh mục thật. Có thể lập phương án theo totalStudents dự kiến hoặc từ XLSX; chưa tạo lớp, Student hoặc User tại bước này. Ngành/khóa của plan là nguồn chính thức, file chỉ đối chiếu.

- m=minCapacity, M=maxCapacity, R=reserveCapacity; mặc định 40/50/15. m>0, m<=M, R>=0, M+R<=99.
- T là số hồ sơ được tính vào đợt: VALID/FAILED đang chờ và ENROLLED của chính plan. INVALID/CONFLICT/EXISTING không tính. T=0 không có kịch bản.
- Ưu tiên NORMAL, rồi RESERVE, sau cùng BELOW_MINIMUM. Hiển thị mọi số lớp bình thường khả thi, chỉ đề xuất số lớp ít nhất, không tự chọn thay Admin.
- Khi cần dự phòng, có thể thêm phương án dưới tối thiểu để so sánh. Sĩ số tự chia lệch tối đa một người, dư rải vào các lớp đầu.
- Cảnh báo nếu số phòng ACTIVE/chưa xóa/capacity>=M+R ít hơn số lớp; không đặt chỗ phòng hoặc xếp thời khóa biểu.
- Dùng dự phòng cần acceptReserve; dưới tối thiểu cần acceptBelowMinimum và reason. Không tự chấp nhận cảnh báo trong client/interceptor.

## 2. Chuẩn bị lớp hành chính

Admin chọn classCount trong các kịch bản và gửi revision hiện tại. existingClassIds có ba nghĩa khác nhau:

| Giá trị | Ý nghĩa |
|---|---|
| null hoặc bỏ field | Tự dùng lớp trống phù hợp trước, tạo phần thiếu |
| [] | Tạo mới toàn bộ |
| Danh sách ID | Dùng lại chính các lớp được chọn, tạo phần thiếu |

Lớp dùng lại phải cùng ngành/khóa, hệ CHINH_QUY, chưa có sinh viên/chưa cấp MSSV và chưa được plan khác sử dụng. Sức chứa lớp trống được cấu hình theo plan. targetSize là chỉ tiêu phân bổ, khác maxCapacity. Có thể chọn lại khi chưa có hồ sơ nhập học thành công.

Tên lớp theo tiền tố gợi ý từ tên ngành + số khóa không đệm 0 + hậu tố chữ: CT8A...CT8Z, CT8AA. Tiền tố chuẩn hóa tiếng Việt về Latin, lấy chữ đầu từng từ rồi chữ đầu/cuối của chuỗi viết tắt; Công nghệ thông tin → CNTT → CT. Tên một từ dùng chữ đầu; không tạo được chữ cái hợp lệ phải báo lỗi.

- Hậu tố A=1, Z=26, AA=27, CU=99. Giới hạn định danh hiện tại là 99 lớp.
- Đọc được L01...L99 cũ; không đổi tên lớp/MSSV cũ. Tạo lớp tiếp sau STT lớn nhất của cùng ngành/khóa, tính cả lớp đã xóa. L01/L02 đã dùng thì lớp mới tiếp theo là CT8C.
- Trùng tiền tố/className giữa ngành khác nhau được cảnh báo, không tự đổi. Trong cùng ngành + khóa giữ unique className.

## 3. Đọc và đối chiếu file XLSX

Tải mẫu từ endpoint template với majorId và cohortId trước khi nhập. Một file chỉ dành cho một ngành/khóa; không dùng file để đổi scope của plan hoặc tự chia nhiều ngành.

| Vị trí | Nội dung |
|---|---|
| Tên sheet / A1 | Sinh viên trúng tuyển |
| A2 / B2 | Tên ngành / tên hiển thị |
| A3 / B3 | Mã ngành / mã ngành danh mục |
| Dòng 4 | Để trống |
| Dòng 5 | Header |
| Từ dòng 6 | Hồ sơ |

Header mẫu mới: **Mã hồ sơ, CCCD, Họ tên, Điểm đầu vào, Ngày sinh, Giới tính, Email, Số điện thoại**. Bốn cột đầu bắt buộc; các cột sau tùy chọn. Reader chấp nhận header cũ ma_ho_so/cccd/ho_ten/diem_dau_vao/ngay_sinh/gioi_tinh/email/so_dien_thoai; không phụ thuộc thứ tự cột. Chuẩn hóa Unicode, khoảng trắng và hoa/thường; header trùng hoặc hai alias cùng cột đều bị từ chối.

- Chỉ .xlsx không rỗng, đúng một sheet; giới hạn upload 20 MB, mặc định tối đa 50.000 vị trí dòng từ sau header tới dòng cuối sheet, kể cả khoảng trống. Metadata/header không tính vào giới hạn; rowNumber giữ số dòng vật lý Excel.
- Kiểm tra metadata trước mọi thao tác xóa/thay thế/gộp. Mẫu mới chỉ so mã ngành sau chuẩn hóa, không so tên ngành; không có mã khóa trong file, khóa lấy từ lựa chọn trên hệ thống/plan. Mẫu cũ có ma_nganh ở A1/B1 và ma_khoa ở A3/B3 vẫn được đọc, bắt buộc đủ hai mã và đối chiếu cả ngành/khóa như trước. Sai scope trả 400/4140 có errors.majorCode (hoặc cohortCode với mẫu cũ); thiếu metadata trả 400/4139. Plan tạo từ file sai phải rollback; plan có sẵn giữ nguyên dữ liệu và revision.
- CCCD phải là ô text và sau chuẩn hóa gồm 12 chữ số, giữ số 0 đầu; mã hồ sơ tối đa 100 ký tự. Họ tên bắt buộc, tối đa 255.
- Điểm đầu vào bắt buộc, không âm, tối đa hai chữ số thập phân và hợp giới hạn lưu NUMERIC(19,2); hỗ trợ dấu phẩy thập phân.
- Ngày sinh tùy chọn nhưng nếu có phải quá khứ: ISO yyyy-MM-dd, dd/MM/yyyy hoặc ô ngày Excel. Giới tính nếu có thuộc NAM/NỮ/NU/KHÁC/KHAC/MALE/FEMALE/OTHER.
- Email/điện thoại trống thành null; nếu có phải hợp lệ. Email không phải khóa danh tính và được chia sẻ bởi nhiều sinh viên.
- Không chấp nhận công thức/ô lỗi, kể cả cột không được map. Lỗi metadata/header là lỗi toàn file; lỗi ô/điểm/ngày sinh của một hồ sơ được giữ thành INVALID để Admin sửa, không bỏ các dòng hợp lệ khác.

Quy tắc đối chiếu cần bảo toàn:

- Cùng mã hồ sơ và dữ liệu tương đương: bỏ qua; cùng mã nhưng khác dữ liệu/CCCD: CONFLICT, không ghi đè.
- CCCD đã có nhưng mã hồ sơ mới: dùng lại Student/MSSV/User, thêm StudentAdmission. Tài khoản khóa/ngừng hoạt động giữ nguyên và có cảnh báo.
- Email của AdmissionApplicant/StudentAdmission là dữ liệu đầu vào và snapshot của lần nhập học. Tạo người mới chỉ lưu email hiện tại vào User; tái nhập học không tự đổi User.email theo file mới. Xác nhận nhập học lại vẫn gửi tới recipient của lần nhập học, không đồng bộ lịch sử theo email tài khoản thay đổi sau này.
- Một CCCD có nhiều mã hồ sơ trong cùng file đưa ra kiểm tra, không tính một người hai lần. Chỉ trùng họ tên không phải trùng danh tính.
- Import sau khi đã có ENROLLED phải gộp, giữ hồ sơ thành công; không xóa sạch, đổi lớp hoặc đánh số lại người đã hoàn tất.

**Lỗi đã biết — TODO(ADMISSION_IMPORT_VALIDATION_ORDER):** source còn bỏ qua một số kiểm tra mã hồ sơ khi CCCD chưa có trong hệ thống. Vì vậy quy tắc xung đột phía trên chưa được bảo đảm đầy đủ. Cần kiểm tra trùng/xung đột mã trong file/DB trước nhánh người mới; không coi đổi tên/tách parser hoặc việc bỏ integration test là đã sửa lỗi này. Khi sửa cần kiểm thử hồ sơ sai/xung đột cùng hồ sơ hợp lệ, phân biệt nhập lại giống hệt với đổi mã/dữ liệu và bảo toàn tài khoản khóa được dùng lại.

## 4. Phân bổ, điều chỉnh và xác nhận

Phải có hồ sơ thực tế và lớp đã chuẩn bị trước preview. SerpentineClassAllocator sắp điểm giảm dần, bằng điểm theo fullName, chia đi tới rồi đi lùi theo chỉ tiêu. Hoán đổi với lớp liền kề để giảm tên trùng, kiểm tra cả hai phía. Tối đa ba người cùng họ tên trong một lớp là mục tiêu ưu tiên; không tìm được cặp đổi phù hợp chỉ cảnh báo, không chặn xác nhận.

Preview tính lại sĩ số, chỉ tiêu, dự phòng, trung bình điểm và chênh lệch lớn nhất–nhỏ nhất. Lớp rỗng có điểm trung bình null. Điều chỉnh assignments chỉ chuyển người chưa xác nhận, không vượt M+R; kết quả/cảnh báo được tính lại ở server.

- AdmissionConfirmationService chuẩn bị batch → xử lý từng hồ sơ → tổng kết. Mỗi hồ sơ có transaction riêng, gọi AdmissionApplicantEnrollmentService.enroll và facade ghi/khóa Propagation.MANDATORY.
- Một transaction gồm khóa/cấp MSSV, tạo/dùng User/Student, StudentAdmission và hàng đợi. Lỗi một dòng rollback toàn bộ dòng đó, không rollback người đã thành công trước.
- AdmissionConfirmationLeaseService cùng confirmationToken/processingUntil phối hợp worker; token này không phải token đăng nhập. Giữ revision và khóa DB để chống xử lý/cấp trùng; lease hết hạn có thể được tiếp quản theo quy tắc xác nhận.
- Sau lỗi có thể sửa nguyên nhân/nhập lại phần lỗi và xác nhận phần FAILED. Preview giữ người đã ENROLLED, chỉ phân phần mới vào chỉ tiêu còn lại. Nếu không đủ sức chứa hoặc cần chuyển người đã hoàn tất để chia đều thì báo cần phương án khác, không tự chuyển lớp/ngành.
- expectedRevision dùng revision mới nhất sau mỗi thao tác; revision cũ trả 409/4132. Confirm plan đã hoàn tất chỉ trả kết quả, không cấp tài khoản lần nữa.

## MSSV và trạng thái

StudentCodeGenerator tại people.application.service dùng chung cho thêm đơn lẻ/nhập học, StudentCodePolicy chỉ ghép mã từ thành phần đã tải. Thêm đơn lẻ luôn cấp STT tiếp theo trong lớp, không sắp lại mã của sinh viên cũ. admission.student-code-format mặc định [MaNganh][SttKhoa][SttLop][SttSVTrongLop]; mỗi thành phần xuất hiện đúng một lần, có thể thêm dấu phân cách hợp lệ. Mã ngành là mã chữ hoa từ danh mục, **không ánh xạ cứng CNTT thành CT**; khóa, lớp và STT sinh viên có hai chữ số. Tên lớp gợi ý và tiền tố MSSV là hai khái niệm khác nhau.

SV mới được cấp số theo tên gọi A–Z tiếng Việt, rồi họ/tên đệm, rồi mã hồ sơ. MSSV/username đã cấp bất biến; không tái dùng số của lớp/SV cũ. User mới ACTIVE/firstLogin=true, username=MSSV, mật khẩu theo cơ chế khởi tạo hiện hành được BCrypt. Không reset mật khẩu/firstLogin hoặc tự mở khóa tài khoản dùng lại.

| Đối tượng | Trạng thái |
|---|---|
| Plan | DRAFT → CLASSES_READY → PREVIEWED → CONFIRMING → CONFIRMED hoặc PARTIALLY_CONFIRMED; các thao tác hợp lệ kiểm tra trạng thái/revision |
| Applicant | VALID đủ điều kiện; INVALID sai dữ liệu; CONFLICT mâu thuẫn; EXISTING bỏ qua; ENROLLED hoàn tất; FAILED lỗi lưu có thể xử lý lại |
| Hồ sơ học tập mới | STUDYING; Student giữ lớp hiện tại, StudentAdmission giữ snapshot từng lần nhập học |

Thông báo được lưu cùng transaction và chỉ kích hoạt sau commit; lỗi gửi không hoàn tác nhập học đã thành công. Quy tắc lần đầu/retry/template chỉ mô tả tại [NOTIFICATION_README.md](NOTIFICATION_README.md).

## Công việc còn lại

- TODO(CLASS_PREFIX_CONFIG): lưu tiền tố Admin cấu hình cùng gợi ý/cảnh báo ngành trùng. Thay tiền tố chỉ áp dụng lớp mới; đổi tên lớp cũ là thao tác riêng có preview/xác nhận, giữ id/MSSV/username/lịch sử và STT đã cấp. Bộ đọc hiện cần số khóa và hậu tố A..CU đúng; nếu cho sửa tự do phải có STT độc lập trước.
- TODO(ADMISSION_IMPORT_VALIDATION_ORDER): sửa đúng thứ tự đối chiếu và bổ sung unit test hồi quy cho các tình huống đã nêu.
- Chuyển lớp/chuyển ngành và tối ưu phân bổ toàn cục chưa triển khai. Giữ việc này riêng khỏi refactor tổ chức code.
- TODO(AUDIT_LOG): khi được yêu cầu, ghi chọn ngành/khóa, từ chối file, kịch bản/m/M/R, lý do ngoại lệ, lớp tạo/dùng lại, phân bổ trước/sau và kết quả từng hồ sơ đúng sau commit; không log mật khẩu/CCCD đầy đủ.

Hiện kiểm tra parser, capacity, allocator, query/controller bằng unit test theo AGENTS.md; không gửi mail thật. Kiểm chứng rollback Student/User/MSSV/lịch sử/hàng đợi và cạnh tranh database bằng integration test để bổ sung sau, chưa coi các hành vi đó đã được unit test xác nhận.
