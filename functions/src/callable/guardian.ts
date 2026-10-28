// ============================================================
// EDUMO — Guardian Link Callable Functions
// linkGuardian, verifyGuardianLink
// ============================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { writeAuditLog } from '../utils/audit';
import { linkGuardianSchema, verifyGuardianLinkSchema } from '../schemas';
import { validationError } from '../utils/errors';

/**
 * Create a guardian-student link.
 * Deterministic doc ID: {guardianUid}_{orgId}_{schoolId}_{studentId}
 * This pattern allows Firestore security rules to do exists() checks
 * without needing a query.
 */
export const linkGuardian = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = linkGuardianSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    requireSchoolRole(authCtx, data.orgId, data.schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    // Verify student exists
    const studentRef = db
      .collection('organizations')
      .doc(data.orgId)
      .collection('schools')
      .doc(data.schoolId)
      .collection('students')
      .doc(data.studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError('not-found', 'Student not found.');
    }

    // Deterministic link ID
    const linkId = `${data.guardianUid}_${data.orgId}_${data.schoolId}_${data.studentId}`;
    const linkRef = db.collection('guardianLinks').doc(linkId);

    // Check if link already exists
    const existing = await linkRef.get();
    if (existing.exists) {
      throw new HttpsError(
        'already-exists',
        'This guardian-student link already exists.'
      );
    }

    await linkRef.set({
      guardianUid: data.guardianUid,
      studentId: data.studentId,
      orgId: data.orgId,
      schoolId: data.schoolId,
      relationship: data.relationship,
      verified: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update student's guardianIds array
    await studentRef.update({
      guardianIds: FieldValue.arrayUnion(data.guardianUid),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authCtx.uid,
    });

    await writeAuditLog({
      orgId: data.orgId,
      schoolId: data.schoolId,
      action: 'guardian.link',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'guardianLink',
      targetId: linkId,
      after: {
        guardianUid: data.guardianUid,
        studentId: data.studentId,
        relationship: data.relationship,
      },
    });

    return { linkId, message: 'Guardian linked. Verification pending.' };
  }
);

/**
 * Verify a guardian link (school admin confirms the guardian's identity).
 */
export const verifyGuardianLink = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = verifyGuardianLinkSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { linkId } = parseResult.data;

    const linkRef = db.collection('guardianLinks').doc(linkId);
    const linkSnap = await linkRef.get();
    if (!linkSnap.exists) {
      throw new HttpsError('not-found', 'Guardian link not found.');
    }

    const link = linkSnap.data()!;

    requireSchoolRole(authCtx, link.orgId, link.schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    await linkRef.update({
      verified: true,
      verifiedBy: authCtx.uid,
      verifiedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      orgId: link.orgId,
      schoolId: link.schoolId,
      action: 'guardian.verify',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'guardianLink',
      targetId: linkId,
    });

    return { success: true, message: 'Guardian link verified.' };
  }
);
