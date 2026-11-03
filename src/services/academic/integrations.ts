/** Ports for capabilities whose backend contract is not yet supplied.
 * Bind an adapter after agreeing HTTP/auth/payload with BE. No guessed URLs.
 */
export interface KnowledgeJob {
  id: string;
  stage: "EXTRACTING" | "CHUNKING" | "EMBEDDING" | "READY" | "FAILED";
  progress: number;
  error?: string;
}
export interface AcademicIntegrations {
  setKnowledgeActive: (jobId: string, active: boolean) => Promise<void>;
  deleteKnowledge: (jobId: string) => Promise<void>;
  resendAccountEmail: (username: string) => Promise<void>;
  processKnowledge: (
    file: Blob,
    metadata: {
      title: string;
      kind: string;
      from: string;
      to: string;
      versionOf?: number;
    },
    onProgress: (job: KnowledgeJob) => void,
  ) => Promise<KnowledgeJob>;
}
let adapter: AcademicIntegrations | undefined;
export function configureAcademicIntegrations(value: AcademicIntegrations) {
  adapter = value;
}
export async function resendAccountEmail(username: string) {
  if (!adapter)
    throw Error(
      "Chưa kết nối dịch vụ email. Tài khoản được giữ nguyên; email chưa được gửi.",
    );
  await adapter.resendAccountEmail(username);
}
export async function processKnowledge(
  ...args: Parameters<AcademicIntegrations["processKnowledge"]>
) {
  if (!adapter)
    throw Error(
      "Chưa kết nối dịch vụ xử lý tài liệu. Tệp vẫn được giữ để gửi lại sau.",
    );
  return adapter.processKnowledge(...args);
}

export async function setKnowledgeActive(jobId: string, active: boolean) {
  if (!adapter)
    throw Error("Chưa kết nối dịch vụ quản lý chỉ mục. Chưa thay đổi nguồn.");
  await adapter.setKnowledgeActive(jobId, active);
}
export async function deleteKnowledge(jobId: string) {
  if (!adapter)
    throw Error("Chưa kết nối dịch vụ quản lý chỉ mục. Chưa xóa nguồn.");
  await adapter.deleteKnowledge(jobId);
}
