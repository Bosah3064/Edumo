// ============================================================
// EDUMO — Organization Callable Functions
// createOrganization, updateOrganization, addBranch
// ============================================================
import { onCall } from 'firebase-functions/v2/https';
import { db, auth } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireOrgOwner } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { writeAuditLog } from '../utils/audit';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addBranchSchema,
} from '../schemas';
import { validationError } from '../utils/errors';
import { DEFAULT_ROLE_PERMISSIONS } from '@edumo/shared';

/**
 * Create a new organization with its first school/branch.
 * Sets the caller as orgOwner with full permissions.
 */
export const createOrganization = onCall(
  {
    // enforceAppCheck: true, // Enable in production
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    const authCtx = requireAuth(request);

    // Rate limit: 5 per hour per user
    await checkRateLimit(authCtx.uid, 'createOrg', {
      max: 5,
      windowMs: 3600000,
    });

    // Validate input
    const parseResult = createOrganizationSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    // Generate IDs
    const orgRef = db.collection('organizations').doc();
    const schoolRef = orgRef.collection('schools').doc();
    const orgId = orgRef.id;
    const schoolId = schoolRef.id;

    // Determine country pack
    const countryPackId = data.country;

    // Generate slug from org name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const now = FieldValue.serverTimestamp();

    // Create org + school in a batch
    const batch = db.batch();

    batch.set(orgRef, {
      name: data.name,
      slug,
      type: data.type,
      country: data.country,
      countryPackId,
      branding: {},
      plan: 'trial',
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      maxStudents: 100,
      maxBranches: 1,
      verified: false,
      status: 'active',
      settings: {
        defaultLanguage: 'en',
        timezone: getTimezone(data.country),
        dateFormat: 'DD/MM/YYYY',
        smsCredits: 0,
        features: {},
      },
      ownerId: authCtx.uid,
      createdAt: now,
      createdBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    });

    batch.set(schoolRef, {
      name: data.school.name,
      code: 'MAIN',
      type: data.school.type,
      country: data.school.address.country,
      countryPackId,
      address: data.school.address,
      contacts: {
        phone: data.school.phone,
        email: data.school.email || '',
      },
      curriculumType: data.school.curriculumType,
      gradingMode: data.school.gradingMode,
      gradingConfig: {},
      settings: {},
      status: 'active',
      createdAt: now,
      createdBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    });

    // Create user profile doc
    const userRef = db.collection('users').doc(authCtx.uid);
    batch.set(
      userRef,
      {
        displayName:
          data.adminDisplayName || authCtx.email || authCtx.phone || 'Admin',
        email: authCtx.email || '',
        phone: authCtx.phone || '',
        preferredLanguage: 'en',
        theme: 'system',
        memberships: [
          {
            orgId,
            orgName: data.name,
            schoolIds: [schoolId],
            role: 'orgOwner',
            joinedAt: new Date().toISOString(),
          },
        ],
        createdAt: now,
      },
      { merge: true }
    );

    await batch.commit();

    // Set custom claims — orgOwner with full permissions
    const allPermissions = Object.keys(DEFAULT_ROLE_PERMISSIONS.principal);
    await auth.setCustomUserClaims(authCtx.uid, {
      orgId,
      orgRole: 'orgOwner',
      schoolIds: [schoolId],
      schoolRoles: { [schoolId]: 'principal' },
      permissions: allPermissions,
      pv: 1,
    });

    // Audit log
    await writeAuditLog({
      orgId,
      schoolId,
      action: 'org.create',
      category: 'admin',
      actorUid: authCtx.uid,
      actorName:
        data.adminDisplayName || authCtx.email || authCtx.phone || 'Admin',
      actorRole: 'orgOwner',
      targetType: 'organization',
      targetId: orgId,
      after: { name: data.name, country: data.country, type: data.type },
    });

    return {
      orgId,
      schoolId,
      message: 'Organization created successfully. Please refresh your session.',
    };
  }
);

/**
 * Update organization settings (name, branding, settings).
 */
export const updateOrganization = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = updateOrganizationSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { orgId, updates } = parseResult.data;

    requireOrgOwner(authCtx, orgId);

    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      throw new Error('Organization not found');
    }

    const before = orgSnap.data();

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authCtx.uid,
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.branding) {
      Object.entries(updates.branding).forEach(([key, val]) => {
        if (val !== undefined) updateData[`branding.${key}`] = val;
      });
    }
    if (updates.settings) {
      Object.entries(updates.settings).forEach(([key, val]) => {
        if (val !== undefined) updateData[`settings.${key}`] = val;
      });
    }

    await orgRef.update(updateData);

    await writeAuditLog({
      orgId,
      action: 'org.update',
      category: 'admin',
      actorUid: authCtx.uid,
      actorRole: 'orgOwner',
      targetType: 'organization',
      targetId: orgId,
      before: before as Record<string, unknown>,
      after: updateData,
    });

    return { success: true };
  }
);

/**
 * Add a new branch/school to an organization.
 */
export const addBranch = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = addBranchSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    requireOrgOwner(authCtx, data.orgId);

    // Check branch limit
    const orgSnap = await db
      .collection('organizations')
      .doc(data.orgId)
      .get();
    if (!orgSnap.exists) {
      throw new Error('Organization not found');
    }

    const org = orgSnap.data()!;
    const schoolsSnap = await db
      .collection('organizations')
      .doc(data.orgId)
      .collection('schools')
      .where('status', '==', 'active')
      .count()
      .get();

    if (schoolsSnap.data().count >= (org.maxBranches || 1)) {
      throw new Error(
        `Branch limit reached (${org.maxBranches}). Upgrade your plan to add more branches.`
      );
    }

    const schoolRef = db
      .collection('organizations')
      .doc(data.orgId)
      .collection('schools')
      .doc();
    const schoolId = schoolRef.id;
    const now = FieldValue.serverTimestamp();

    await schoolRef.set({
      name: data.school.name,
      code: data.school.code,
      type: data.school.type,
      country: data.school.country,
      countryPackId: data.school.country,
      address: data.school.address,
      contacts: {
        phone: data.school.phone,
        email: data.school.email || '',
      },
      curriculumType: data.school.curriculumType,
      gradingMode: data.school.gradingMode,
      gradingConfig: {},
      settings: {},
      status: 'active',
      createdAt: now,
      createdBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    });

    // Update owner's claims to include new school
    const currentClaims =
      (await auth.getUser(authCtx.uid)).customClaims || {};
    const currentSchoolIds = (currentClaims.schoolIds as string[]) || [];
    const currentSchoolRoles =
      (currentClaims.schoolRoles as Record<string, string>) || {};

    await auth.setCustomUserClaims(authCtx.uid, {
      ...currentClaims,
      schoolIds: [...currentSchoolIds, schoolId],
      schoolRoles: { ...currentSchoolRoles, [schoolId]: 'principal' },
      pv: ((currentClaims.pv as number) || 0) + 1,
    });

    // Update user memberships
    const userRef = db.collection('users').doc(authCtx.uid);
    await userRef.update({
      memberships: FieldValue.arrayUnion({
        orgId: data.orgId,
        orgName: org.name,
        schoolIds: [schoolId],
        role: 'orgOwner',
        joinedAt: new Date().toISOString(),
      }),
    });

    await writeAuditLog({
      orgId: data.orgId,
      schoolId,
      action: 'school.create',
      category: 'admin',
      actorUid: authCtx.uid,
      actorRole: 'orgOwner',
      targetType: 'school',
      targetId: schoolId,
      after: { name: data.school.name, country: data.school.country },
    });

    return { schoolId, message: 'Branch added successfully.' };
  }
);

// Helper
function getTimezone(country: string): string {
  const tzMap: Record<string, string> = {
    KE: 'Africa/Nairobi',
    UG: 'Africa/Kampala',
    TZ: 'Africa/Dar_es_Salaam',
    RW: 'Africa/Kigali',
  };
  return tzMap[country] || 'Africa/Nairobi';
}
