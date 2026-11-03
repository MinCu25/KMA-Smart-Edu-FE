import type { Course } from "../../types/course";
type ChatInput = {
  question: string;
  target: string;
  selected: Course[];
  credits: number;
  summary?: { cumulativeGpa: number | null; accumulatedCredits: number; totalRequiredCredits: number };
};
export async function getDemoReply({
  question: q,
  target,
  selected,
  credits,
  summary,
}: ChatInput): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  if (/gpa|tốt nghiệp|mục tiêu/i.test(q)) {
    if (!summary || summary.cumulativeGpa == null || !target.trim())
      return "Chưa có đủ bảng điểm và GPA mục tiêu của bạn để tính toán. Vui lòng cập nhật mục tiêu; kết quả tư vấn cần dữ liệu học vụ và chương trình đào tạo chính thức.";
    const remaining = summary.totalRequiredCredits - summary.accumulatedCredits;
    if (remaining <= 0) return "Không còn tín chỉ trong phép tính dự kiến. Điều kiện tốt nghiệp cần được đối chiếu với chương trình đào tạo và kết quả chính thức.";
    const needed = (+target * summary.totalRequiredCredits - summary.cumulativeGpa * summary.accumulatedCredits) / remaining;
    return `Theo dữ liệu học vụ đang có: GPA tích lũy ${summary.cumulativeGpa}, đã hoàn thành ${summary.accumulatedCredits}/${summary.totalRequiredCredits} tín chỉ. ${needed > 4 ? "Mục tiêu này vượt khả năng đạt được chỉ bằng các tín chỉ còn lại." : needed <= 0 ? "GPA hiện tại đã đáp ứng mức mục tiêu trong phép tính dự kiến." : `GPA trung bình cần đạt cho ${remaining} tín chỉ còn lại là ${needed.toFixed(2)}/4.00.`} Đây là ước tính; chưa xét học cải thiện và các điều kiện tốt nghiệp khác.`;
  }
  if (/lịch/i.test(q))
    return `Bạn đã đăng ký ${selected.length} học phần (${credits} tín chỉ). ${selected.map((c) => `${c.name}: thứ ${c.day}, tiết ${c.start}-${c.end}`).join("; ")}.`;
  return "Để đăng ký môn, chọn Đăng ký học phần, kiểm tra điều kiện và bấm Đăng ký tại lớp đủ điều kiện. Những lớp thiếu tiên quyết, trùng lịch hoặc đã đầy sẽ không đăng ký được. ";
}
