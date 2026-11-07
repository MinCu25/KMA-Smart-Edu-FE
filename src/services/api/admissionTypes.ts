export interface Capacity {
  minimum: number;
  maximum: number;
  reserve: number;
}
export interface AdmissionApplicant {
  id: number;
  rowNumber: number;
  applicationCode: string;
  fullName: string;
  email: string;
  entranceScore: number | null;
  state: string;
  error: string | null;
  assignedClassId: number | null;
  studentCode: string | null;
  reusingAccount: boolean;
  warnings: string[];
}
export interface AdmissionScenario {
  classCount: number;
  targetSizes: number[];
  reserveUsed: number;
  belowMinimum: boolean;
  insufficientRooms: boolean;
  suitableRooms: number;
  requiredRoomCapacity: number;
  recommended: boolean;
  warnings: string[];
}
export interface AdmissionPlan {
  id: number;
  revision: number;
  majorId: number;
  cohortId: number;
  totalStudents: number;
  capacity: Capacity;
  state: string;
  selectedClassCount: number | null;
  scenarios: AdmissionScenario[];
  classes: {
    id: number;
    className: string;
    targetSize: number;
    assignedSize: number;
    currentSize: number;
    minimum: number;
    maximum: number;
    reserve: number;
    reserveUsed: number;
    averageScore: number | null;
  }[];
  applicants: AdmissionApplicant[];
  averageScoreDifference: number | null;
  warnings: string[];
}
export interface AdmissionConfirmation {
  planId: number;
  revision: number;
  state: string;
  enrolled: number;
  failed: number;
  skipped: number;
  applicants: AdmissionApplicant[];
}
export interface AdmissionNotification {
  id: number;
  admissionId: number;
  state: string;
  failureCount: number;
  error: string | null;
}
