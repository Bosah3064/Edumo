// ============================================================
// EDUMO — Staff Management Callable Functions
// createStaff, updateStaff
// ============================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { writeAuditLog } from '../utils/audit';
import { createStaffSchema, updateStaffSchema } from '../schemas';
import { validationError } from '../utils/errors';

/**
 * Server-validated staff member creation.
 */
export const createStaff = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);

    // Rate limit: 30 per hour
    await checkRateLimit(authCtx.uid, 'createStaff', {
      max: 30,
      windowMs: 3600000,
    });

    const parseResult = createStaffSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { orgId, schoolId, staff: data } = parseResult.data;

    requireSchoolRole(authCtx, orgId, schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    const schoolRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('schools')
      .doc(schoolId);

    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
      throw new HttpsError('not-found', 'School not found.');
    }

    const now = FieldValue.serverTimestamp();
    const staffRef = schoolRef.collection('staff').doc();
    const staffId = staffRef.id;

    const staffRecord = {
      id: staffId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || null,
      role: data.role,
      department: data.department || '',
      qualification: data.qualification || '',
      tscNumber: data.tscNumber || '',
      contractType: data.contractType,
      status: 'active',
      createdAt: now,
      createdBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    };

    const batch = db.batch();
    batch.set(staffRef, staffRecord);

    // Update counts summary
    const summaryRef = schoolRef.collection('summaries').doc('counts');
    batch.set(
      summaryRef,
      {
        totalStaff: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();

    await writeAuditLog({
      orgId,
      schoolId,
      action: 'staff.create',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'staff',
      targetId: staffId,
      after: {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        department: data.department,
      },
    });

    return { staffId, message: 'Staff member created successfully.' };
  }
);

/**
 * Server-validated staff member updates.
 */
export const updateStaff = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = updateStaffSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { orgId, schoolId, staffId, updates } = parseResult.data;

    requireSchoolRole(authCtx, orgId, schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    const staffRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('schools')
      .doc(schoolId)
      .collection('staff')
      .doc(staffId);

    const staffSnap = await staffRef.get();
    if (!staffSnap.exists) {
      throw new HttpsError('not-found', 'Staff member not found.');
    }

    const before = staffSnap.data()!;
    const now = FieldValue.serverTimestamp();

    const updatePayload: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: authCtx.uid,
    };

    if (updates.firstName !== undefined) updatePayload.firstName = updates.firstName;
    if (updates.lastName !== undefined) updatePayload.lastName = updates.lastName;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone;
    if (updates.email !== undefined) updatePayload.email = updates.email;
    if (updates.role !== undefined) updatePayload.role = updates.role;
    if (updates.department !== undefined) updatePayload.department = updates.department;
    if (updates.qualification !== undefined) updatePayload.qualification = updates.qualification;
    if (updates.tscNumber !== undefined) updatePayload.tscNumber = updates.tscNumber;
    if (updates.contractType !== undefined) updatePayload.contractType = updates.contractType;
    if (updates.status !== undefined) updatePayload.status = updates.status;

    await staffRef.update(updatePayload);

    await writeAuditLog({
      orgId,
      schoolId,
      action: 'staff.update',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'staff',
      targetId: staffId,
      before: {
        firstName: before.firstName,
        lastName: before.lastName,
        role: before.role,
      },
      after: updates,
    });

    return { success: true, message: 'Staff member updated successfully.' };
  }
);

