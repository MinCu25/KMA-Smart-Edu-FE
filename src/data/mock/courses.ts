import { moduleClassResponses } from "./dtoFixtures";
import { courseView } from "../../services/adapters";
export const allCourses = moduleClassResponses.map(courseView);
export const initialCourses = allCourses.slice(0, 4);
export const openCourses = allCourses.slice(4);
