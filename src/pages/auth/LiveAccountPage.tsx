import { LiveRoomsPage } from "../academic-admin/RoomsPage";
import { useEffect, useState } from "react";
import { catalog } from "../live/catalog";
import { ListPage } from "../live/ListPage";
import { Admission } from "../live/Admission";
import { PendingPage } from "../live/PendingPage";
import { LiveAccounts } from "../system-admin/AccountsPage";
import { ProfileForm } from "../shared/ProfilePage";
import { useLiveRequest } from "../live/client";
import type {
  StudentResponse,
  UpdateMyStudentProfileRequest,
} from "../../services/api/backendContract";
import type { Page, PageProps } from "../../types/navigation";
import { Card } from "../../components/common/Card";
import "../live/live.css";
function StudentProfile() {
  const request = useLiveRequest(),
    [profile, setProfile] = useState<StudentResponse>(),
    [error, setError] = useState(""),
    [revision, reload] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    request<StudentResponse>("myStudentGet")
      .then((r) => {
        if (active) setProfile(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request, revision]);
  async function save(patch: UpdateMyStudentProfileRequest) {
    setProfile(
      await request<StudentResponse>("myStudentUpdate", undefined, patch),
    );
  }
  if (!profile)
    return (
      <Card title="Tài khoản cá nhân">
        <p role="status">{error || "Đang tải hồ sơ…"}</p>
        {error && (
          <button className="btn" onClick={() => reload((n) => n + 1)}>
            Thử lại
          </button>
        )}
      </Card>
    );
  return (
    <ProfileForm
      currentStudent={profile}
      target={String(profile.targetGpa ?? "")}
      live
      saveContact={(_, phone) => save({ phone: phone || null })}
      saveTarget={(value) =>
        save({ targetGpa: value === "" ? null : Number(value) })
      }
    />
  );
}
export function LiveAccountPage({
  page,
  onNavigate,
}: { page: Page } & PageProps) {
  if (page === "profile") return <StudentProfile />;
  if (page === "rooms") return <LiveRoomsPage />;
  if (page === "accounts") return <LiveAccounts />;
  if (page === "admissions") return <Admission />;
  if (page in catalog) return <ListPage key={page} page={page} />;
  return <PendingPage page={page} onNavigate={onNavigate} />;
}
