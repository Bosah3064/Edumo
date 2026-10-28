// ============================================================
// EDUMO — Invite Callable Functions
// createInvite, acceptInvite, revokeInvite
// ============================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, auth } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { writeAuditLog } from '../utils/audit';
import { createInviteSchema, acceptInviteSchema } from '../schemas';
import { validationError } from '../utils/errors';
import { DEFAULT_ROLE_PERMISSIONS, type SchoolRole } from '@edumo/shared';

/**
 * Generate a short invite code (6 chars, alphanumeric).
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I/L)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create an invite link/code for a user to join a school with a specific role.
 */
export const createInvite = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);

    // Rate limit: 20 per hour
    await checkRateLimit(authCtx.uid, 'createInvite', {
      max: 20,
      windowMs: 3600000,
    });

    const parseResult = createInviteSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    // Caller must have settings.roles permission or be orgOwner/principal
    requireSchoolRole(authCtx, data.orgId, data.schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    // Verify org and school exist
    const schoolRef = db
      .collection('organizations')
      .doc(data.orgId)
      .collection('schools')
      .doc(data.schoolId);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
      throw new HttpsError('not-found', 'School not found.');
    }

    const code = generateInviteCode();
    const inviteRef = db.collection('invites').doc();

    await inviteRef.set({
      orgId: data.orgId,
      schoolId: data.schoolId,
      role: data.role,
      permissions: data.permissions || [],
      email: data.email || null,
      phone: data.phone || null,
      code,
      singleUse: true,
      used: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdBy: authCtx.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      orgId: data.orgId,
      schoolId: data.schoolId,
      action: 'invite.create',
      category: 'auth',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'invite',
      targetId: inviteRef.id,
      after: {
        role: data.role,
        email: data.email,
        phone: data.phone,
      },
    });

    return {
      inviteId: inviteRef.id,
      code,
      expiresIn: '7 days',
    };
  }
);

/**
 * Accept an invite: validate code, set claims, mark as used.
 */
export const acceptInvite = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);

    await checkRateLimit(authCtx.uid, 'acceptInvite', {
      max: 10,
      windowMs: 3600000,
    });

    const parseResult = acceptInviteSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { inviteId, code } = parseResult.data;

    const inviteRef = db.collection('invites').doc(inviteId);

    const result = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) {
        throw new HttpsError('not-found', 'Invite not found.');
      }

      const invite = inviteSnap.data()!;

      // Validate
      if (invite.used) {
        throw new HttpsError(
          'failed-precondition',
          'This invite has already been used.'
        );
      }
      if (invite.code !== code) {
        throw new HttpsError(
          'permission-denied',
          'Invalid invite code.'
        );
      }
      const expiresAt = invite.expiresAt?.toDate
        ? invite.expiresAt.toDate()
        : new Date(invite.expiresAt);
      if (expiresAt < new Date()) {
        throw new HttpsError(
          'failed-precondition',
          'This invite has expired.'
        );
      }

      // If invite has email/phone, verify it matches
      if (invite.email && authCtx.email && invite.email !== authCtx.email) {
        throw new HttpsError(
          'permission-denied',
          'This invite was sent to a different email address.'
        );
      }

      // Mark as used
      tx.update(inviteRef, {
        used: true,
        usedBy: authCtx.uid,
        usedAt: FieldValue.serverTimestamp(),
      });

      return invite;
    });

    const { orgId, schoolId, role } = result;

    // Get org name for memberships
    const orgSnap = await db.collection('organizations').doc(orgId).get();
    const orgName = orgSnap.data()?.name || 'Unknown';

    // Set custom claims
    const currentClaims =
      (await auth.getUser(authCtx.uid)).customClaims || {};

    const newSchoolIds = [
      ...new Set([
        ...((currentClaims.schoolIds as string[]) || []),
        schoolId,
      ]),
    ];
    const newSchoolRoles = {
      ...((currentClaims.schoolRoles as Record<string, string>) || {}),
      [schoolId]: role,
    };

    // Determine permissions
    const defaultPerms =
      DEFAULT_ROLE_PERMISSIONS[role as SchoolRole] || [];
    const customPerms = result.permissions || [];
    const newPermissions = [
      ...new Set([
        ...((currentClaims.permissions as string[]) || []),
        ...(customPerms.length > 0 ? customPerms : defaultPerms),
      ]),
    ];

    const isGuardian = role === 'guardian' || currentClaims.isGuardian;

    await auth.setCustomUserClaims(authCtx.uid, {
      ...currentClaims,
      orgId,
      orgRole: currentClaims.orgRole || (role === 'principal' ? 'orgOwner' : undefined),
      schoolIds: newSchoolIds,
      schoolRoles: newSchoolRoles,
      permissions: newPermissions,
      isGuardian: isGuardian || undefined,
      pv: ((currentClaims.pv as number) || 0) + 1,
    });

    // Update user profile
    const userRef = db.collection('users').doc(authCtx.uid);
    await userRef.set(
      {
        memberships: FieldValue.arrayUnion({
          orgId,
          orgName,
          schoolIds: [schoolId],
          role,
          joinedAt: new Date().toISOString(),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await writeAuditLog({
      orgId,
      schoolId,
      action: 'invite.accept',
      category: 'auth',
      actorUid: authCtx.uid,
      actorRole: role,
      targetType: 'invite',
      targetId: inviteId,
      after: { role, schoolId },
    });

    return {
      orgId,
      schoolId,
      role,
      message: 'Invite accepted. Please refresh your session.',
    };
  }
);

/**
 * Revoke a pending invite.
 */
export const revokeInvite = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);

    const { inviteId } = request.data as { inviteId: string };
    if (!inviteId) {
      throw new HttpsError('invalid-argument', 'inviteId is required.');
    }

    const inviteRef = db.collection('invites').doc(inviteId);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invite not found.');
    }

    const invite = inviteSnap.data()!;

    // Verify caller has permission
    requireSchoolRole(authCtx, invite.orgId, invite.schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    await inviteRef.delete();

    return { success: true };
  }
);
