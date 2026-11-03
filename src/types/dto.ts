// Baseline: CanhhTran-01/edu-hub develop @ 8253c0e2965b53bab1a3ab47e068a472a2e99255
// All DTOs rechecked on develop 2026-11-03; see docs/API-READINESS.md.
// Dates are ISO strings; numeric IDs are distinct from display codes.
export interface BatchUpdateScoreRequest {
  moduleClassId: number;
  file?: File;
}
export interface SemesterGradeResponse {
  semesterCode: string;
  semesterGpa: number | null;
  credits: number;
  courses: EnrollmentResponse[];
}
export interface StudentAcademicSummaryResponse {
  studentCode: string;
  fullName: string;
  className: string;
  majorName: string;
  cohortCode: string;
  cumulativeGpa: number | null;
  accumulatedCredits: number;
  totalRequiredCredits: number;
  targetGpa: number | null;
  academicWarningStatus: string;
  semesterGrades: SemesterGradeResponse[];
}
export interface UpdateProcessScoreRequest {
  enrollmentId: number;
  componentScore1?: number | null;
  componentScore2?: number | null;
  note?: string;
}
export interface ChatRequest {
  sessionId?: string | null;
  message: string;
}
export interface ChatResponse {
  sessionId: string | null;
  messageId: string;
  content: string;
  intent: AiIntent;
  citations: CitationResponse[];
  scenario: GraduationScenarioResponse | null;
}
export interface CitationResponse {
  sourceTitle: string;
  sectionTitle: string;
  pageNumber: number | null;
  snippet: string;
}
export interface GraduationScenarioResponse {
  targetGpa: number | null;
  currentGpa: number | null;
  requiredGpa: number | null;
  maxPossibleGpa: number | null;
  viabilityStatus: string;
  roadmap: unknown;
}
export type ViabilityStatus = "VIABLE" | "NOT_VIABLE" | "CERTAIN";
export interface CreateSubjectRequest {
  subjectCode: string;
  subjectName: string;
  credits: number;
  description?: string;
}
export interface CurriculumResponse {
  id: number;
  majorName: string;
  cohortCode: string;
  trainingType: string;
  totalCredits: number;
  subjects: CurriculumSubjectResponse[];
}
export interface CurriculumSubjectResponse {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
  recommendSemester: number;
  subjectType: SubjectType;
}
export interface SetPrerequisiteRequest {
  prerequisiteSubjectIds: number[];
}
export interface SubjectResponse {
  description: string | null;
  id: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
  status: SubjectStatus;
  prerequisites: SubjectSimpleResponse[];
  requiredBy: SubjectSimpleResponse[];
}
export interface SubjectSimpleResponse {
  id: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
}
export interface UpdateSubjectRequest {
  subjectCode?: string;
  subjectName: string;
  credits: number;
  description?: string;
}
export type SubjectStatus = "ACTIVE" | "INACTIVE";
export type SubjectType = "REQUIRED" | "ELECTIVE";
export interface EnrollmentResponse {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  moduleClassId: number;
  moduleClassCode: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  registeredAt: string | null;
  status: string;
  componentScore1: number | null;
  componentScore2: number | null;
  processScore: number | null;
  finalExamScore: number | null;
  courseScore10: number | null;
  courseScoreLetter: string | null;
  courseScore4: number | null;
}
export interface RegisterModuleClassRequest {
  moduleClassId: number;
}
export interface RegistrationResult {
  success: boolean;
  message: string;
  enrollment: EnrollmentResponse;
}
export type EnrollmentStatus =
  "REGISTERED" | "DROPPED" | "COMPLETED" | "FAILED";
export interface ChangePasswordRequest {
  currentPassword?: string | null;
  newPassword: string;
  confirmPassword: string;
}
export interface LockUserRequest {
  userId: number;
  reason: string;
}
export interface LoginRequest {
  username: string;
  password: string;
}
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserInfoResponse;
  requirePasswordChange: boolean;
}
export interface ResetPasswordRequest {
  userId: number;
  reason?: string;
}
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface UserInfoResponse {
  id: number;
  username: string;
  email: string | null;
  role: string;
  fullName: string;
  firstLogin: boolean;
  status: string;
}
export interface AdministrativeClassResponse {
  id: number;
  className: string;
  majorCode: string;
  majorName: string;
  cohortCode: string;
  trainingType: TrainingType;
  currentSize: number | null;
  maxCapacity: number | null;
}
export interface BatchImportStudentRequest {
  majorId: number;
  cohortId: number;
  file?: File;
}
export interface CreateLecturerRequest {
  fullName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  facultyId: number;
  reason?: string;
}
export interface CreateStudentRequest {
  fullName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  majorId: number;
  cohortId: number;
  administrativeClassId: number;
  entranceScore?: number;
  reason?: string;
}
export interface LecturerResponse {
  id: number;
  lecturerCode: string;
  fullName: string;
  email: string;
  phone: string;
  facultyName: string;
  status: string;
}
export interface StudentResponse {
  citizenId?: string | null;
  id: number;
  studentCode: string;
  fullName: string;
  dateOfBirth: string | null;
  email: string;
  phone: string;
  majorName: string;
  cohortCode: string;
  className: string;
  trainingType: string;
  entranceScore: number | null;
  targetGpa: number | null;
  activityStatus: ActivityStatus;
  academicWarningStatus: string;
  statusReason: string;
  createdAt: string | null;
}
export interface StudentSearchRequest {
  keyword?: string;
  majorId?: number;
  cohortId?: number;
  classId?: number;
  activityStatus?: string;
  academicWarningStatus?: string;
}
export interface UpdateStudentRequest {
  studentCode?: string;
  academicWarningStatus?: string;
  fullName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  citizenId?: string;
  administrativeClassId?: number;
  targetGpa?: number;
  statusReason?: string;
}
export interface ClassScheduleResponse {
  id: number;
  moduleClassId: number;
  roomCode: string;
  buildingCode: string;
  roomNumber: string;
  dayOfWeek: number | null;
  lessonOrderStart: number | null;
  lessonOrderEnd: number | null;
  startDate: string | null;
  endDate: string | null;
}
export interface CreateClassScheduleRequest {
  moduleClassId: number;
  roomId: number;
  dayOfWeek: number;
  lessonOrderStart: number;
  lessonOrderEnd: number;
  startDate?: string;
  endDate?: string;
}
// Scheduling requests rechecked against develop on 2026-11-03.
export interface CreateModuleClassRequest {
  maxCapacity: number;
}
export interface SubjectClassesRequest {
  subjectId: number;
  confirmAdditionalClasses: boolean;
  classes: CreateModuleClassRequest[];
}
export interface CreateModuleClassesRequest {
  subjects: SubjectClassesRequest[];
}
export interface UpdateModuleClassRequest {
  maxCapacity: number;
  reason: string;
}
export interface CancelModuleClassRequest {
  reason: string;
}
export interface ModuleClassSearchRequest {
  keyword?: string;
  semesterId?: number;
  subjectId?: number;
  lecturerId?: number;
  status?: ModuleClassStatus;
  page: number;
  size: number;
}
export interface ModuleClassResponse {
  id: number;
  // Optional for legacy browser fixtures; backend responses provide these fields.
  semesterId?: number;
  subjectId?: number;
  lecturerId?: number | null;
  classSequence?: number;
  dataSource?: string;
  moduleClassCode: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  lecturerName: string | null;
  semesterCode: string;
  maxCapacity: number;
  currentSize: number;
  status: ModuleClassStatus;
  schedules: ClassScheduleResponse[];
}
export interface SemesterResponse {
  status?: "UPCOMING" | "ONGOING" | "ENDED";
  id: number;
  semesterCode: string;
  semesterName: string;
  startDate: string | null;
  endDate: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  isLocked: boolean | null;
  lockedGrade: boolean | null;
}
export interface TimetableResponse {
  weekLabel: string;
  slots: TimetableSlot[];
}
export interface TimetableSlot {
  dayOfWeek: number;
  lessonStart: number;
  lessonEnd: number;
  subjectName: string;
  moduleClassCode: string;
  roomCode: string;
  lecturerName: string;
}
export type ModuleClassStatus =
  "UNSCHEDULED" | "SCHEDULED" | "OPEN" | "CANCELLED";
export interface ApiResponse<T> {
  success: boolean;
  code?: number | null;
  message: string;
  data?: T;
  errors?: FieldErrorDetail[];
  path?: string;
  timestamp: string | null;
}
export interface FieldErrorDetail {
  field: string;
  message: string;
}
export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
export type ActivityStatus = "STUDYING" | "DEACTIVATED" | "DELETED";
export type AiIntent = "KNOWLEDGE" | "GRADUATION" | "OUT_OF_SCOPE";
export type TrainingType = "CHINH_QUY" | "LIEN_THONG" | "VAN_BANG_2";
export interface SubjectActionRequest {
  reason: string;
  confirmed: boolean;
}
export interface SubjectSearchRequest {
  keyword?: string;
  subjectCode?: string;
  subjectName?: string;
  credits?: number;
  status?: SubjectStatus;
  withoutPrerequisites: boolean;
  page: number;
  size: number;
}

export interface OpeningSubjectResponse {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
  onTimeStudentCount: number;
  retakeStudentCount: number;
  missedStudentCount: number;
  expectedStudentCount: number;
  recommendedClassCount: number;
  existingClassCount: number;
  dataSource: string;
  historyComplete: boolean;
}

export interface CurriculumOpeningSubjectResponse {
  curriculumCode: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
  recommendSemester: number;
}
export interface LogoutRequest {
  refreshToken: string;
}
export interface LecturerSearchRequest {
  keyword?: string;
  lecturerCode?: string;
  fullName?: string;
  facultyId?: number;
  status?: string;
}
export interface CreateSemesterRequest {
  semesterName: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
}
export interface UpdateSemesterRequest {
  semesterName: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  confirmDateChange: boolean;
}
export interface SemesterSearchRequest {
  keyword?: string;
  status?: "UPCOMING" | "ONGOING" | "ENDED";
  page?: number;
  size?: number;
}

export type CatalogStatus = "ACTIVE" | "INACTIVE";
export type UserStatus = "ACTIVE" | "LOCKED" | "DISABLED";
export type LecturerStatus = "ACTIVE" | "INACTIVE";
export type SemesterStatus = "UPCOMING" | "ONGOING" | "ENDED";
export type RoleName =
  "STUDENT" | "LECTURER" | "ACADEMIC_ADMIN" | "SYSTEM_ADMIN";
