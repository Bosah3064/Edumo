// ============================================================
// EDUMO — Auth Middleware for Cloud Functions
// Extracts and validates authentication context from requests
// ============================================================
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { EdumoCustomClaims, PermissionCode } from '@edumo/shared';

export interface AuthContext {
  uid: string;
  email?: string;
  phone?: string;
  claims: EdumoCustomClaims;
}

/**
 * Extract and validate auth from a callable request.
 * Throws UNAUTHENTICATED if no auth context.
 */
export function requireAuth(request: CallableRequest): AuthContext {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const token = request.auth.token;

  return {
    uid: request.auth.uid,
    email: token.email as string | undefined,
    phone: token.phone_number as string | undefined,
    claims: {
      platformAdmin: token.platformAdmin as boolean | undefined,
      orgId: token.orgId as string | undefined,
      orgRole: token.orgRole as EdumoCustomClaims['orgRole'],
      schoolIds: token.schoolIds as string[] | undefined,
      schoolRoles: token.schoolRoles as Record<string, string> | undefined,
      permissions: token.permissions as string[] | undefined,
      isGuardian: token.isGuardian as boolean | undefined,
      pv: token.pv as number | undefined,
    } as EdumoCustomClaims,
  };
}

/**
 * Require the caller to be a platform admin.
 */
export function requirePlatformAdmin(auth: AuthContext): void {
  if (!auth.claims.platformAdmin) {
    throw new HttpsError(
      'permission-denied',
      'This operation requires platform admin access.'
    );
  }
}

/**
 * Require the caller to be a member of the specified organization.
 */
export function requireOrgMember(auth: AuthContext, orgId: string): void {
  if (!auth.claims.platformAdmin && auth.claims.orgId !== orgId) {
    throw new HttpsError(
      'permission-denied',
      'You do not have access to this organization.'
    );
  }
}

/**
 * Require the caller to be the owner of the specified organization.
 */
export function requireOrgOwner(auth: AuthContext, orgId: string): void {
  if (!auth.claims.platformAdmin) {
    if (auth.claims.orgId !== orgId || auth.claims.orgRole !== 'orgOwner') {
      throw new HttpsError(
        'permission-denied',
        'This operation requires organization owner access.'
      );
    }
  }
}

/**
 * Require the caller to have access to a specific school.
 */
export function requireSchoolAccess(
  auth: AuthContext,
  orgId: string,
  schoolId: string
): void {
  if (auth.claims.platformAdmin) return;

  requireOrgMember(auth, orgId);

  if (auth.claims.orgRole === 'orgOwner') return;

  if (!auth.claims.schoolIds?.includes(schoolId)) {
    throw new HttpsError(
      'permission-denied',
      'You do not have access to this school.'
    );
  }
}

/**
 * Require the caller to have one of the specified school roles.
 */
export function requireSchoolRole(
  auth: AuthContext,
  orgId: string,
  schoolId: string,
  allowedRoles: string[]
): void {
  if (auth.claims.platformAdmin) return;

  requireSchoolAccess(auth, orgId, schoolId);

  if (auth.claims.orgRole === 'orgOwner') return;

  const userRole = auth.claims.schoolRoles?.[schoolId];
  if (!userRole || !allowedRoles.includes(userRole)) {
    throw new HttpsError(
      'permission-denied',
      `This operation requires one of: ${allowedRoles.join(', ')}.`
    );
  }
}

/**
 * Require the caller to have a specific permission.
 */
export function requirePermission(
  auth: AuthContext,
  permission: PermissionCode
): void {
  if (auth.claims.platformAdmin) return;
  if (auth.claims.orgRole === 'orgOwner') return;

  if (!auth.claims.permissions?.includes(permission)) {
    throw new HttpsError(
      'permission-denied',
      `Missing required permission: ${permission}.`
    );
  }
}
