import type {
  AdmissionClassPreview,
  AdmissionScenario,
} from "../../services/api/backendContract";

export function admissionExceptionErrors(
  scenario: AdmissionScenario | undefined,
  classes: AdmissionClassPreview[],
  confirming: boolean,
  acceptReserve: boolean,
  acceptBelow: boolean,
  reason: string,
): Record<string, string> {
  const reserve = confirming
    ? classes.some((c) => c.assignedSize > c.maximum)
    : !!scenario?.reserveUsed;
  const below = confirming
    ? classes.some((c) => c.assignedSize < c.minimum)
    : !!scenario?.belowMinimum;
  const errors: Record<string, string> = {};
  if (reserve && !acceptReserve)
    errors.acceptReserve = "Cần xác nhận sử dụng sĩ số dự phòng.";
  if (below && !acceptBelow)
    errors.acceptBelowMinimum = "Cần xác nhận phương án dưới tối thiểu.";
  if (below && !reason.trim())
    errors.reason = "Vui lòng nhập lý do chọn phương án dưới tối thiểu.";
  if (reason.trim().length > 500) errors.reason = "Lý do tối đa 500 ký tự.";
  return errors;
}
