import { useAcademic } from "../context/AcademicContext";
import { schedulesOverlap } from "../utils/classSchedules";
import { useState } from "react";

import { useManagement } from "../context/ManagementContext";
import { useDemoData } from "../context/DemoDataContext";
import { useUI } from "../context/UIContext";
import type { AlertMessage } from "../types/ui";
import type { Course } from "../types/course";
export function useEnrollment() {
  const { ids, saveIds, selected, credits } = useDemoData();
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const { term } = useManagement();
  const academic = useAcademic();
  const { setDialog, notify, notifyError } = useUI();
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  function occupancy(c: Course) {
    return c.dto.currentSize;
  }
  function conflict(c: Course) {
    return selected.find(
      (s) =>
        s.id !== c.id &&
        s.dto.schedules.some((a) =>
          c.dto.schedules.some((b) => schedulesOverlap(a, b)),
        ),
    );
  }
  function registeredAlternative(c: Course) {
    return selected.find(other => other.id !== c.id && other.dto.subjectCode === c.dto.subjectCode && other.dto.semesterCode === c.dto.semesterCode);
  }
  function condition(c: Course) {
    if (ids.includes(c.id)) return "registered";
    if (!term.registration) return "closed";
    if (registeredAlternative(c)) return "duplicate";
    if (conflict(c)) return "conflict";
    if (occupancy(c) >= c.capacity) return "full";
    if (credits + c.credits > 24) return "creditLimit";
    if (c.missing) return "missing";
    return "available";
  }
  function conditionDetails(c: Course) {
    const reasons: string[] = [];
    if (!term.registration) reasons.push("Đợt đăng ký đã đóng hoặc chưa mở.");
    if (credits + c.credits > 24) reasons.push(`Đang có ${credits} TC, lớp ${c.id} thêm ${c.credits} TC, tổng ${credits + c.credits} TC vượt tối đa 24 TC/kỳ.`);
    const other = registeredAlternative(c);
    if (other) reasons.push("Bạn đã đăng ký lớp " + other.id + " của học phần " + c.name + ". Hãy hủy lớp đó nếu muốn chuyển sang lớp " + c.id + ".");
    const clash = conflict(c);
    if (c.missing) reasons.push(`Thiếu tiên quyết: ${c.missing}.`);
    if (clash)
      reasons.push(
        `Trùng lịch với lớp ${clash.id} – ${clash.name}: ${c.dto.schedules
          .filter((a) =>
            clash.dto.schedules.some((b) => schedulesOverlap(a, b)),
          )
          .map(
            (t) =>
              `${t.dayOfWeek === 8 ? "Chủ nhật" : `Thứ ${t.dayOfWeek}`}, tiết ${t.lessonOrderStart}–${t.lessonOrderEnd}`,
          )
          .join("; ")}.`,
      );
    if (occupancy(c) >= c.capacity)
      reasons.push(`Lớp đã đủ ${occupancy(c)}/${c.capacity} chỗ.`);
    return reasons.join(" ");
  }
  function fail(message: string) {
    notifyError(message);
  }
  function showReason(c: Course) {
    setInspectedId(c.id);
    const state = condition(c);
    const reasons = conditionDetails(c);
    if (state === "creditLimit") {
      setAlert({ tone: "red", text: reasons });
      return;
    }
    setAlert(null);
    notify(
      `Lớp ${c.id}: ${reasons || "Đợt đăng ký đã đóng hoặc chưa mở."}`,
      state === "missing"
        ? "warning"
        : state === "available"
          ? "info"
          : "error",
      "",
    );
  }
  function register(c: Course) {
    setInspectedId(c.id);
    if (!term.registration)
      return fail("Không thể đăng ký: đợt đăng ký đã đóng hoặc chưa mở.");
    if (c.dto.status !== "OPEN") return fail("Lớp chưa được công bố đăng ký.");
    if (ids.includes(c.id)) {
      notify(`Bạn đã đăng ký lớp ${c.id}.`, "info");
      return;
    }
    if (condition(c) !== "available") {
      showReason(c);
      return;
    }
    setAlert(null);
    setDialog({
      title: "Xác nhận đăng ký học phần",
      body: `${c.id} · ${c.name}\n${c.credits} tín chỉ · Thứ ${c.day}, tiết ${c.start}-${c.end} · Phòng ${c.room}`,
      confirm: "Đăng ký",
      action: () => {
        try {
          const request = { moduleClassId: c.dto.id };
          academic.setData((old) => ({
            ...old,
            classes: old.classes.map((x) =>
              x.id === request.moduleClassId
                ? { ...x, currentSize: x.currentSize + 1 }
                : x,
            ),
          }));
          academic.setEnrollmentHistory((old) =>
            old.includes(c.id) ? old : [...old, c.id],
          );
          saveIds([...ids, c.id]);
          setAlert(null);
          notify(
            `Đã đăng ký lớp ${c.id} – ${c.name}. Thời khóa biểu đã cập nhật.`,
          );
        } catch (e) {
          fail(e instanceof Error ? e.message : "Không thể đăng ký học phần.");
        }
      },
    });
  }
  function cancel(c: Course, onCancelled?: () => void) {
    if (!term.registration)
      return fail("Không thể hủy: đợt đăng ký đã đóng hoặc chưa mở.");
    setDialog({
      title: `Hủy đăng ký lớp ${c.id}?`,
      body: `Bạn muốn hủy học phần ${c.name}? Số tín chỉ và thời khóa biểu sẽ được cập nhật.`,
      confirm: "Xác nhận hủy",
      action: () => {
        academic.setEnrollmentHistory((old) =>
          old.includes(c.id) ? old : [...old, c.id],
        );
        saveIds(ids.filter((id) => id !== c.id));
        academic.setData((old) => ({
          ...old,
          classes: old.classes.map((x) =>
            x.id === c.dto.id
              ? { ...x, currentSize: Math.max(0, x.currentSize - 1) }
              : x,
          ),
        }));
        notify(`Đã hủy đăng ký lớp ${c.id}.`);
        setAlert(null);
        setInspectedId(null);
        onCancelled?.();
      },
    });
  }
  return {
    ids,
    selected,
    credits,
    alert:
      credits < 12
        ? {
            tone: "red" as const,
            text: `Bạn đang đăng ký ${credits} tín chỉ, dưới ngưỡng tối thiểu 12 tín chỉ. Cần đăng ký thêm ít nhất ${12 - credits} tín chỉ.`,
          }
        : alert,
    inspectedId,
    occupancy,
    condition,
    conditionDetails,
    showReason,
    register,
    cancel,
  };
}
