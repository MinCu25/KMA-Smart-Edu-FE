// UI view model / form state. Use types/dto.ts at service boundaries.
export type Course = {
  id: string;
  dto: import("./dto").ModuleClassResponse;
  name: string;
  credits: number;
  teacher: string;
  day: number;
  start: number;
  end: number;
  room: string;
  seats: number;
  capacity: number;
  missing?: string;
};
