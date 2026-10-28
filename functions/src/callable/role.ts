// ============================================================
// EDUMO — Role Management Callable Functions
// assignRole, removeRole
// ============================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, auth } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';
import { assignRoleSchema, removeRoleSchema } from '../schemas';
import { validationError } from '../utils/errors';
import { DEFAULT_ROLE_PERMISSIONS, type SchoolRole } from '@edumo/shared';

/**
 * Assign or change a user's role and permissions for a school.
 * Only callable by users with settings.roles permission.
 */
export const assignRole = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = assignRoleSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    // Caller must be orgOwner or principal with settings.roles permission
    requireSchoolRole(authCtx, data.orgId, data.schoolId, [
      'principal',
    ]);

    // Cannot assign role to yourself
    if (data.uid === authCtx.uid) {
      throw new HttpsError(
        'invalid-argument',
        'You cannot change your own role.'
      );
    }

    // Verify target user exists
    let targetUser;
    try {
      targetUser = await auth.getUser(data.uid);
    } catch {
      throw new HttpsError('not-found', 'User not found.');
    }

    const currentClaims = targetUser.customClaims || {};

    // Build new claims
    const newSchoolIds = [
      ...new Set([
        ...((currentClaims.schoolIds as string[]) || []),
        data.schoolId,
      ]),
    ];
    const newSchoolRoles = {
      ...((currentClaims.schoolRoles as Record<string, string>) || {}),
      [data.schoolId]: data.role,
    };

    // Compute permissions
    const defaultPerms =
      DEFAULT_ROLE_PERMISSIONS[data.role as SchoolRole] || [];
    const customPerms = data.permissions || [];
    const rolePerms = customPerms.length > 0 ? customPerms : defaultPerms;

    // Merge with existing permissions from other schools
    const existingPerms = (currentClaims.permissions as string[]) || [];
    const newPermissions = [...new Set([...existingPerms, ...rolePerms])];

    const isGuardian =
      data.role === 'guardian' || currentClaims.isGuardian;

    const newClaims = {
      ...currentClaims,
      orgId: data.orgId,
      schoolIds: newSchoolIds,
      schoolRoles: newSchoolRoles,
      permissions: newPermissions,
      isGuardian: isGuardian || undefined,
      pv: ((currentClaims.pv as number) || 0) + 1,
    };

    await auth.setCustomUserClaims(data.uid, newClaims);

    // Update user profile memberships
    const orgSnap = await db.collection('organizations').doc(data.orgId).get();
    const orgName = orgSnap.data()?.name || 'Unknown';

    const userRef = db.collection('users').doc(data.uid);
    await userRef.set(
      {
        memberships: FieldValue.arrayUnion({
          orgId: data.orgId,
          orgName,
          schoolIds: [data.schoolId],
          role: data.role,
          joinedAt: new Date().toISOString(),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Audit log
    await writeAuditLog({
      orgId: data.orgId,
      schoolId: data.schoolId,
      action: 'role.assign',
      category: 'auth',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'user',
      targetId: data.uid,
      before: {
        role: currentClaims.schoolRoles?.[data.schoolId],
        permissions: existingPerms,
      },
      after: { role: data.role, permissions: rolePerms },
    });

    return {
      success: true,
      message: `Role ${data.role} assigned to user. They must refresh their session.`,
    };
  }
);

/**
 * Remove a user's role for a specific school.
 */
export const removeRole = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = removeRoleSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    requireSchoolRole(authCtx, data.orgId, data.schoolId, ['principal']);

    if (data.uid === authCtx.uid) {
      throw new HttpsError(
        'invalid-argument',
        'You cannot remove your own role.'
      );
    }

    const targetUser = await auth.getUser(data.uid);
    const currentClaims = targetUser.customClaims || {};

    const schoolIds = (
      (currentClaims.schoolIds as string[]) || []
    ).filter((id) => id !== data.schoolId);

    const schoolRoles = {
      ...((currentClaims.schoolRoles as Record<string, string>) || {}),
    };
    const removedRole = schoolRoles[data.schoolId];
    delete schoolRoles[data.schoolId];

    const newClaims: Record<string, any> = {
      ...currentClaims,
      schoolIds,
      schoolRoles,
      pv: ((currentClaims.pv as number) || 0) + 1,
    };

    // If no schools left, clear org claims
    if (schoolIds.length === 0) {
      delete newClaims.orgId;
      delete newClaims.orgRole;
      newClaims.permissions = [];
    }

    await auth.setCustomUserClaims(data.uid, newClaims);

    await writeAuditLog({
      orgId: data.orgId,
      schoolId: data.schoolId,
      action: 'role.remove',
      category: 'auth',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'user',
      targetId: data.uid,
      before: { role: removedRole },
    });

    return { success: true, message: 'Role removed.' };
  }
);
