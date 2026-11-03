import type {
  BatchImportStudentRequest,
  BatchUpdateScoreRequest,
} from "../../types/dto";
export function studentImportForm(
  request: BatchImportStudentRequest,
): FormData {
  const data = new FormData();
  data.set("majorId", String(request.majorId));
  data.set("cohortId", String(request.cohortId));
  if (request.file) data.set("file", request.file);
  return data;
}
export function scoreImportForm(request: BatchUpdateScoreRequest): FormData {
  const data = new FormData();
  data.set("moduleClassId", String(request.moduleClassId));
  if (request.file) data.set("file", request.file);
  return data;
}
