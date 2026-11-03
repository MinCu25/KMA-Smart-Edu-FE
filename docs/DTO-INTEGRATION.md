# Đối chiếu DTO

Xem [API-READINESS.md](API-READINESS.md). Bộ kiểm tra hiện dùng duy nhất `develop-contract.json` tại commit `8253c0e2965b53bab1a3ab47e068a472a2e99255`, bao phủ 57 DTO/common và enum ActivityStatus. Snapshot cũ giữ làm lịch sử, không dùng nghiệm thu hiện tại.

Khớp tên trường không đủ chứng minh API chạy đúng. Cần kiểm tra kiểu/null/boolean JSON thực tế, controller path/body, quyền server, quy tắc nghiệp vụ và đồng bộ sau mutation. Các trường mới optional trong TS để đọc được browser data cũ, không có nghĩa BE không trả chúng.
