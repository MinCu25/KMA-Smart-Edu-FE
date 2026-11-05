import { useEffect, useState } from "react";
import type {
  SemesterResponse,
  SubjectResponse,
  OpeningSubjectResponse,
  ModuleClassResponse,
} from "../../services/api/backendContract";
import { readAllPages, useLiveRequest } from "./client";
import { message, errorMap, show } from "./ActionForm";
import { useUI } from "../../context/UIContext";
type Group = { subjectId: string; capacities: string[]; confirmed: boolean };
const empty = (): Group => ({
  subjectId: "",
  capacities: ["80"],
  confirmed: false,
});
export function Opening({ back }: { back: () => void }) {
  const request = useLiveRequest(),
    { notify } = useUI();
  const [terms, setTerms] = useState<SemesterResponse[]>([]),
    [subjects, setSubjects] = useState<SubjectResponse[]>([]),
    [term, setTerm] = useState(""),
    [groups, setGroups] = useState<Group[]>([empty()]),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [suggest, setSuggest] = useState<OpeningSubjectResponse[]>(),
    [created, setCreated] = useState<ModuleClassResponse[]>(),
    [ready, setReady] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([
      readAllPages<SemesterResponse>(
        request,
        "semestersSearch",
        undefined,
        () => active,
      ),
      readAllPages<SubjectResponse>(
        request,
        "subjectsSearch",
        new URLSearchParams({ status: "ACTIVE" }),
        () => active,
      ),
    ])
      .then(([t, s]) => {
        if (active) {
          setTerms(t.filter((x) => !x.isLocked && x.status !== "ENDED"));
          setSubjects(s);
          setReady(true);
          setErrors({});
        }
      })
      .catch((e) => {
        if (active) setErrors({ general: message(e) });
      });
    return () => {
      active = false;
    };
  }, [request, retry]);
  function edit(i: number, patch: Partial<Group>) {
    setGroups(groups.map((g, j) => (i === j ? { ...g, ...patch } : g)));
  }
  return (
    <section className="card">
      <button className="btn" disabled={busy} onClick={back}>
        ← Danh sách lớp
      </button>
      <h2>Mở lớp học phần theo kỳ</h2>
      {!ready && (
        <p>
          {errors.general || "Đang tải kỳ và môn học…"}{" "}
          {errors.general && (
            <button className="btn" onClick={() => setRetry((n) => n + 1)}>
              Thử lại
            </button>
          )}
        </p>
      )}
      {created ? (
        <>
          <h3>Đã mở {created.length} lớp</h3>
          {created.map((c) => (
            <p key={c.id}>
              {c.moduleClassCode} · {c.subjectName} · Sức chứa {c.maxCapacity}
            </p>
          ))}
        </>
      ) : (
        <fieldset disabled={busy || !ready}>
          <label>
            Kỳ học
            <select
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setSuggest(undefined);
                setGroups([empty()]);
                setErrors({});
              }}
            >
              <option value="">Chọn kỳ học</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {show("semesterName", t.semesterName)}
                </option>
              ))}
            </select>
          </label>
          {errors.term && <p className="field-error">{errors.term}</p>}
          <button
            className="btn"
            disabled={!term}
            onClick={async () => {
              setBusy(true);
              setErrors({});
              try {
                setSuggest(
                  await request<OpeningSubjectResponse[]>(
                    "openingSubjects",
                    Number(term),
                  ),
                );
              } catch (e) {
                setErrors({ suggest: message(e) });
              } finally {
                setBusy(false);
              }
            }}
          >
            Xem gợi ý học phần
          </button>
          {errors.suggest && (
            <p role="alert">
              {errors.suggest} Bạn vẫn có thể chọn học phần bên dưới.
            </p>
          )}
          {suggest && (
            <div className="live-scroll">
              <p>{suggest.length} học phần được gợi ý</p>
              {suggest.map((s) => (
                <p key={s.subjectId}>
                  {s.subjectCode} · {s.subjectName} · {s.expectedStudentCount}{" "}
                  sinh viên (đúng kỳ {s.onTimeStudentCount}, học lại{" "}
                  {s.retakeStudentCount}, học chậm {s.missedStudentCount}) · Đề
                  xuất {s.recommendedClassCount} lớp · Hiện có{" "}
                  {s.existingClassCount} lớp
                </p>
              ))}
            </div>
          )}
          <h3>Danh sách lớp cần mở</h3>
          {groups.map((g, i) => (
            <div key={i} className="card">
              <label>
                Học phần
                <select
                  value={g.subjectId}
                  onChange={(e) =>
                    edit(i, { subjectId: e.target.value, confirmed: false })
                  }
                >
                  <option value="">Chọn học phần</option>
                  {subjects.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.subjectCode} · {s.subjectName}
                    </option>
                  ))}
                </select>
              </label>
              {g.capacities.map((v, j) => (
                <div key={j} className="opening-row">
                  <label>
                    Sức chứa lớp {j + 1}
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={v}
                      onChange={(e) =>
                        edit(i, {
                          capacities: g.capacities.map((n, k) =>
                            k === j ? e.target.value : n,
                          ),
                        })
                      }
                    />
                  </label>
                  {g.capacities.length > 1 && (
                    <button
                      className="btn"
                      onClick={() =>
                        edit(i, {
                          capacities: g.capacities.filter((_, k) => k !== j),
                        })
                      }
                    >
                      Bỏ lớp {j + 1}
                    </button>
                  )}
                </div>
              ))}
              <button
                className="btn"
                onClick={() => edit(i, { capacities: [...g.capacities, "80"] })}
              >
                Thêm lớp cho học phần
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={g.confirmed}
                  onChange={(e) => edit(i, { confirmed: e.target.checked })}
                />{" "}
                Tôi đồng ý mở thêm nếu môn này đã có lớp
              </label>
              {Object.entries(errors)
                .filter(([k]) => k.startsWith("subjects[" + i + "]"))
                .map(([k, v]) => (
                  <p key={k} className="field-error">
                    {v}
                  </p>
                ))}
              {groups.length > 1 && (
                <button
                  className="btn"
                  onClick={() => setGroups(groups.filter((_, j) => i !== j))}
                >
                  Bỏ học phần
                </button>
              )}
            </div>
          ))}
          <div className="live-tools">
            <button
              className="btn"
              onClick={() => setGroups([...groups, empty()])}
            >
              Thêm học phần
            </button>
            <button
              className="btn"
              onClick={async () => {
                const err: Record<string, string> = {};
                if (!term) err.term = "Vui lòng chọn kỳ.";
                const body = {
                  subjects: groups.map((g, i) => {
                    const caps = g.capacities.map(Number);
                    if (
                      !g.subjectId ||
                      groups.some(
                        (other, j) => j < i && other.subjectId === g.subjectId,
                      )
                    )
                      err["subjects[" + i + "].subjectId"] =
                        "Chọn học phần khác với các dòng còn lại.";
                    if (
                      caps.some((n) => !Number.isInteger(n) || n < 1 || n > 80)
                    )
                      err["subjects[" + i + "].classes"] =
                        "Mỗi sức chứa phải là số nguyên từ 1 đến 80.";
                    return {
                      subjectId: Number(g.subjectId),
                      confirmAdditionalClasses: g.confirmed,
                      classes: caps.map((maxCapacity) => ({ maxCapacity })),
                    };
                  }),
                };
                setErrors(err);
                if (Object.keys(err).length) return;
                setBusy(true);
                try {
                  setCreated(
                    await request<ModuleClassResponse[]>(
                      "moduleClassesCreateBatch",
                      Number(term),
                      body,
                    ),
                  );
                  notify("Đã mở các lớp học phần.");
                } catch (e) {
                  setErrors({ ...errorMap(e), general: message(e) });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xác nhận mở lớp
            </button>
          </div>
          {errors.general && <p role="alert">{errors.general}</p>}
        </fieldset>
      )}
    </section>
  );
}
