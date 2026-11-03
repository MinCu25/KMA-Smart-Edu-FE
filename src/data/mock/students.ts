import { studentResponses } from "./dtoFixtures";
import { studentView } from "../../services/adapters";
export const students = studentResponses.map(studentView);
