# Notification: gửi email và hàng đợi nhập học

Notification sở hữu gửi email/template, QueuedAdmissionNotification, trạng thái gửi, async/scheduler và retry. Hiện chưa kết nối notification-service ngoài hoặc multichannel. [MODULE_CONTRACT.md](MODULE_CONTRACT.md) mô tả facade; [DATABASE_DESIGN.md](DATABASE_DESIGN.md) mô tả lưu trữ; REST nghiệp vụ vẫn ở module gọi, không có controller notification riêng.

## Thành phần và hai nhánh facade

| Thành phần | Vai trò |
|---|---|
| NotificationFacade.ImmediateEmail / ImmediateEmailNotificationFacadeImpl | Gửi đồng bộ email tài khoản/reset hoặc xác nhận nhập học, trả EmailDeliveryResponse(sent,error) |
| NotificationFacade.AdmissionQueue / AdmissionNotificationQueueFacadeImpl | Enqueue thông báo nhập học và đọc trạng thái theo admissionId, chỉ trao đổi ID/DTO |
| QueuedAdmissionNotificationSender | Kiểm tra điều kiện, gửi một lần và ghi kết quả vào bản ghi thông báo nhập học |
| NotificationRetryPolicy | allowsInitialAttempt, allowsScheduledAttempt, giới hạn lượt và thời gian chờ |
| AdmissionNotificationQueued / AdmissionNotificationDispatcher | Sự kiện sau commit, async lần đầu và kích hoạt quét định kỳ |
| AdmissionNotificationDispatchService | Truy vấn lô thông báo đến hạn và gọi sender qua bean riêng cho từng lần gửi |
| EmailTemplateRenderer | Validate request, chọn template, dựng context và render HTML/text |
| SmtpEmailSender | Chuẩn bị MIME UTF-8 và gửi qua JavaMailSender |
| EmailTemplateConfiguration / NotificationEmailExecutionConfiguration / NotificationMailSettings | Template engine, executor/scheduling và cấu hình hiển thị email |

Facade dùng SendAccountEmailRequest, SendAdmissionConfirmationEmailRequest và QueueAdmissionNotificationRequest trong notification.api.dto.request; EmailDeliveryResponse và AdmissionNotificationResponse ở notification.api.dto.response. Admission dùng chung response trạng thái qua facade và REST. Không có controller notification riêng. RenderedEmail ở infrastructure.template, chỉ tồn tại trong bộ nhớ giữa renderer và SMTP.

IdentityFacade kiểm tra User/firstLogin/trạng thái/mật khẩu khởi tạo trước mỗi lần gửi thông tin tài khoản; kết quả là AccountNotificationResponse, dùng được cho cả SV/GV. Sender không đọc User/Student entity/repository module khác. PeopleFacade.Admission chỉ cung cấp sinh viên để xác định tài khoản; sender không ghi trạng thái/lỗi gửi vào Student. Admission tự xác định lịch sử thuộc plan rồi nhờ AdmissionQueue truy vấn theo lô.

Consumer chỉ truyền userId khi gửi tài khoản. Identity đọc mật khẩu khởi tạo từ cùng nguồn cấu hình dùng lúc tạo User; sender không giữ mật khẩu mặc định riêng. Nếu cấu hình đổi khiến hash không còn khớp, gửi lại thất bại INITIAL_PASSWORD_NO_LONGER_VALID, không reset mật khẩu để gửi. Contract/cấu hình xem MODULE_CONTRACT.md và ARCHITECTURE.md.

Email hiện tại để gửi thông tin tài khoản/reset lấy từ User; Student/Lecturer không còn bản sao email. recipient trong hàng đợi vẫn giữ địa chỉ của lần nhập học: INITIAL_ACCOUNT tiếp tục gửi qua kiểm tra User hiện tại, RE_ENROLLMENT gửi xác nhận tới recipient đã chốt. Không sửa recipient/lịch sử khi người dùng đổi email tài khoản.

Hai implementation facade tách biệt: queue chỉ lưu/phát sự kiện; ImmediateEmail chỉ render/gửi. Chuỗi queued sender → IdentityFacade → ImmediateEmail → SMTP không quay lại queue/sender, tránh vòng khởi tạo Spring bean.

## Transaction và hành vi gửi

| Luồng | Thời điểm và kết quả |
|---|---|
| Nhập học | Enqueue Propagation.MANDATORY trong transaction từng hồ sơ; rollback thì không có queue/sự kiện gửi sau commit |
| Thêm SV đơn lẻ/GV | Gửi đồng bộ sau commit tạo hồ sơ/tài khoản; gửi lỗi giữ hồ sơ đã tạo, chỉ trả kết quả trong response, không mở transaction ghi kết quả lên hồ sơ |
| Reset mật khẩu | Gửi đồng bộ trong transaction Identity; lỗi gửi/render trả PASSWORD_EMAIL_FAILED và rollback reset |

ImmediateEmail dùng Propagation.SUPPORTS, không tự thêm queue/retry. Lỗi template trả EMAIL_TEMPLATE_RENDER_FAILED; lỗi MailException trả EMAIL_SEND_FAILED. Không log exception/context có thể chứa mật khẩu, địa chỉ/nội dung thư. Không lưu plain-text password hoặc RenderedEmail trong database/log.

Đã chấp nhận không tra cứu lại kết quả gửi của luồng tạo SV đơn lẻ và tạo GV sau thao tác. Student/Lecturer và LecturerResponse không giữ trạng thái/lỗi gửi; response create vẫn có notificationStatus/notificationError. Hai luồng này chỉ gửi đồng bộ một lần, không có endpoint resend, retry hoặc lịch sử lưu lâu dài. Lỗi riêng ở bước gửi sau commit, kể cả exception không dự kiến, được trả FAILED mà không hoàn tác hồ sơ; lỗi tạo dữ liệu/commit vẫn truyền ra và không gửi email. Bản ghi QueuedAdmissionNotification vẫn cần cho scheduler nhập học, không được bỏ state/failureCount/nextAttemptAt/lastError chỉ vì chưa cần lịch sử gửi chung.

Reset mật khẩu có giới hạn giao nhận: SMTP có thể đã gửi thành công nhưng transaction Identity commit thất bại sau đó; rollback database không thu hồi được email đã gửi, nên mật khẩu trong thư có thể không dùng được. TODO(NOTIFICATION_DELIVERY) còn áp dụng cho nhánh này; chưa chuyển reset sang queue hoặc thay đổi cơ chế gửi đồng bộ.

## Hàng đợi và retry

1. AdmissionNotificationQueueFacadeImpl lưu queue rồi phát AdmissionNotificationQueued trong cùng transaction. recipient null → SKIPPED/NO_EMAIL; không tiêu tốn lượt.
2. AdmissionNotificationDispatcher.onAdmissionNotificationQueued dùng @TransactionalEventListener(AFTER_COMMIT) và @Async, gọi sendInitialAttempt.
3. sendInitialAttempt chỉ xử lý PENDING, failureCount=0 và đến hạn. Async kickoff đến muộn không được dùng để retry một lần đã thất bại.
4. Dispatcher kích hoạt AdmissionNotificationDispatchService.sendDueNotifications để truy vấn PENDING/FAILED đến hạn với failureCount<4, theo lô 100. Service không mở transaction bao quanh cả lô; sendScheduledAttempt trên bean sender riêng vẫn dùng transaction REQUIRES_NEW và khóa hàng queue. Scheduler xử lý được cả PENDING bị bỏ lỡ lần kickoff.
5. Thất bại tăng failureCount, giữ error tối đa 255 ký tự và đặt lần tiếp theo sau một phút. Thành công chuyển SENT, xóa lastError nhưng không reset lịch sử failureCount.
6. Sau lần đầu thất bại chỉ có tối đa ba scheduled retry, tổng bốn lần thất bại. Hết lượt giữ FAILED, WARN tại lần cuối và loại khỏi truy vấn đến hạn; SENT/SKIPPED không gửi lại.
7. Chỉ lưu trạng thái/lỗi trên QueuedAdmissionNotification; không đồng bộ bản sao sang Student/Lecturer. Không có API retry nhập học/reset bộ đếm hoặc resend tài khoản SV cũ để vượt chính sách.

Thông báo INITIAL_ACCOUNT gửi thông tin tài khoản mới sau khi Identity xác nhận còn phù hợp; RE_ENROLLMENT chỉ gửi xác nhận, dùng mật khẩu hiện tại và không reset/mở khóa User. SMTP thành công rồi lưu trạng thái thất bại vẫn có rủi ro phát trùng; hiện chưa bảo đảm exactly-once.

QueuedAdmissionNotification tiếp tục dùng admission_notifications; admission_id/student_id là scalar ID ở Java, FK SQL giữ nguyên. Đổi tên class không đổi bảng, migration hay dữ liệu cũ. Thông báo cũ có ba thất bại còn có thể được xét lượt cuối; không reset chúng khi khởi động.

## Template và MIME email

Nguồn: [templates/mail](../src/main/resources/templates/mail).

| Mục đích | EmailTemplateType | Template HTML/text |
|---|---|---|
| Cấp tài khoản SV/GV | ACCOUNT_CREATED | account-created.html / account-created.txt |
| Reset mật khẩu | PASSWORD_RESET | password-reset.html / password-reset.txt |
| Nhập học lại | ADMISSION_CONFIRMED | admission-confirmed.html / admission-confirmed.txt |

- SendAccountEmailRequest phải có templateType ACCOUNT_CREATED hoặc PASSWORD_RESET và temporaryPassword không blank; ACCOUNT_CREATED còn cần username. Không suy mục đích từ username null/có giá trị.
- SendAdmissionConfirmationEmailRequest chỉ có recipient/username, không truyền mật khẩu.
- EmailTemplateRenderer chỉ dùng request/config, không truy vấn DB. Thymeleaf core có engine riêng, không thêm Thymeleaf MVC. Template cache khi chạy, sửa resource cần build/restart.
- HTML dùng fragments/layout.html, CSS inline, th:text escape dữ liệu. Text dùng TemplateMode.TEXT để giữ ký tự mật khẩu; không ghép HTML thành plain text.
- SmtpEmailSender chỉ nhận recipient và RenderedEmail(subject,textBody,htmlBody), dùng MimeMessageHelper tạo multipart/alternative UTF-8; không chọn template hoặc dựng nội dung nghiệp vụ.
- EmailTemplateType không lưu DB; AdmissionNotificationKind giữ giá trị INITIAL_ACCOUNT/RE_ENROLLMENT.

## Cấu hình

SMTP dùng spring.mail với GMAIL_ADDRESS/GMAIL_APP_PASSWORD. Timeout kết nối/đọc/ghi hiện 10 giây, Gmail STARTTLS port 587. Không ghi secret thật vào tài liệu hoặc log.

| Property | Biến môi trường / alias | Mặc định |
|---|---|---|
| notification.mail.brand-name | NOTIFICATION_MAIL_BRAND_NAME | EduHub |
| notification.mail.login-url | NOTIFICATION_MAIL_LOGIN_URL | Trống, không hiển thị link đăng nhập |
| notification.mail.support-email | NOTIFICATION_MAIL_SUPPORT_EMAIL | Trống, hướng dẫn liên hệ học vụ |
| notification.admission-enabled | admission.notifications-enabled | true |
| notification.mail-retry-delay-ms | admission.mail-retry-delay-ms | 60000 |

Khóa notification được ưu tiên khi có cả alias admission. Flag chỉ điều khiển queue nhập học, không tắt các luồng gửi đồng bộ. Delay scheduler và nextAttemptAt sau lỗi là hai điều kiện riêng: quét định kỳ nhưng chỉ gửi bản ghi đã đến hạn.

login-url nếu có phải http:// hoặc https:// và không có whitespace theo validation hiện tại; support-email nếu có phải email hợp lệ. Chưa có frontend URL thì không gửi link minh họa cho người nhận.

Executor có tên notificationMailExecutor và alias admissionMailExecutor: core 2, max 4, queue 1000, DiscardPolicy. Quá tải/tắt executor có thể bỏ async task nhưng queue database vẫn còn để scheduler xử lý. Shutdown chờ tác vụ đã nhận tối đa 15 giây, không bảo đảm tất cả hoàn thành.

## Công việc còn lại

- TODO(NOTIFICATION_SERVICE): chốt API/message của notification-service cá nhân, adapter HTTP/message, mã tương quan, quyền sở hữu template và templateCode/data. Giữ kiểm tra tài khoản/mật khẩu ở Identity theo hợp đồng thống nhất trước khi chuyển gửi ra ngoài.
- TODO(NOTIFICATION_STORAGE): khi cần theo dõi/retry ngoài admission, mở mô hình nguồn sourceType/sourceId, contract facade và migration phù hợp. Tạo SV đơn lẻ/GV hiện chỉ trả kết quả ngay; không thể khôi phục những lần gửi chưa lưu. Không tạo AdmissionPlan/StudentAdmission giả chỉ để gửi email, không dựng lại lịch sử từ hồ sơ hoặc lưu mật khẩu/nội dung thư làm hàng đợi.
- TODO(NOTIFICATION_DELIVERY): Với create đơn lẻ, tiến trình dừng sau commit trước khi gửi hoặc gửi lỗi có thể khiến tài khoản tồn tại nhưng chưa nhận email. Khi có yêu cầu phục hồi mới thiết kế lưu nguồn thông báo/cơ chế gửi phù hợp; không thể dựng lại lịch sử chưa lưu và không POST tạo lại hồ sơ để gửi mail. Với queue/reset, còn cần thống nhất idempotency/outbox/phục hồi khi đã gửi nhưng chưa lưu được trạng thái hoặc dịch vụ ngoài timeout.
- TODO(AUDIT_LOG): bổ sung lịch sử lần đầu, từng retry và hết lượt đúng sau commit khi được yêu cầu; không lưu mật khẩu, nội dung mail, hash hoặc CCCD đầy đủ.

## Kiểm tra khi thay đổi

Unit test policy/sender phải giữ một lần đầu + ba retry, dừng ở SENT/SKIPPED/hết lượt, tôn trọng nextAttemptAt, không retry qua delayed kickoff và không reset failureCount khi thành công. Test queue kiểm tra điều phối và đọc DTO theo lô bằng mock. Test template/SMTP kiểm tra mục đích rõ ràng, escape, HTML/text, UTF-8 và phân biệt lỗi render với lỗi transport.

Integration test nhập học/queue và kiểm chứng transaction thực tế sẽ bổ sung sau theo AGENTS.md; hiện unit test không xác nhận rollback Student/User/MSSV/lịch sử khi lưu queue lỗi. Không gửi email thật chỉ để kiểm chứng refactor. Unit test MIME/template và preview trình duyệt không chứng minh hiển thị trên mọi Gmail/Outlook client.
