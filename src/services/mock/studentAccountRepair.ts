import type { Student } from '../../types/student';
import type { UserInfoResponse } from '../../types/dto';
import { studentResponses } from '../../data/mock/dtoFixtures';

// Repair only bundled demo profiles. API accounts and user-created profiles
// remain owned by their existing provisioning workflows.
export function repairDemoStudentAccounts(users: UserInfoResponse[], students: Student[]) {
  const seedCodes = new Set(studentResponses.map(s => s.studentCode));
  const names = new Set(users.map(u => u.username));
  let nextId = Math.max(0, ...users.map(u => u.id));
  const additions: UserInfoResponse[] = [];
  for (const { dto } of students) {
    if (!seedCodes.has(dto.studentCode) || names.has(dto.studentCode) || dto.activityStatus === 'DELETED') continue;
    names.add(dto.studentCode);
    additions.push({
      id: ++nextId, username: dto.studentCode, fullName: dto.fullName,
      email: dto.email || null, role: 'STUDENT',
      status: dto.activityStatus === 'DEACTIVATED' ? 'DISABLED' : 'ACTIVE',
      firstLogin: true,
    });
  }
  return additions.length ? [...users, ...additions] : users;
}
