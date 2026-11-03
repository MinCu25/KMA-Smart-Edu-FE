// UI view model / form state. Use types/dto.ts at service boundaries.
export type Student = {
  id: string;
  dto: import("./dto").StudentResponse;
  name: string;
  className: string;
  major: string;
  cohort: string;
  status: string;
};
