// ============================================================
// EDUMO — Cloud Functions Barrel Export
// All functions must be exported from this file
// ============================================================

// === Callable Functions ===
export {
  createOrganization,
  updateOrganization,
  addBranch,
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

// === Auth Triggers ===
export { onUserCreate } from './triggers/onUserCreate';
