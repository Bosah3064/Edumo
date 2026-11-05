// ============================================================
// EDUMO — Cloud Functions Barrel Export
// All functions must be exported from this file
// ============================================================

// === Callable Functions ===
export {
  createOrganization,
  updateOrganization,
  addBranch,
  mergeBranch,
} from './callable/organization';

export {
  createInvite,
  acceptInvite,
  revokeInvite,
} from './callable/invite';

export {
  assignRole,
  removeRole,
} from './callable/role';

export {
  linkGuardian,
  verifyGuardianLink,
} from './callable/guardian';

export {
  createStudent,
  updateStudent,
  transferStudent,
  softDeactivateStudent,
} from './callable/student';

export {
  createStaff,
  updateStaff,
} from './callable/staff';

export {
  markAttendance,
} from './callable/attendance';

// === Auth Triggers & Blocking Functions ===
export { onUserCreate } from './triggers/onUserCreate';
export { beforeCreate, beforeSignIn } from './triggers/authBlocking';

export { createAssignment, releaseAssignmentResults, submitAssignment } from './callable/assignment';
export { bulkImport, rollbackImport } from './callable/import';
