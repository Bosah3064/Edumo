// ============================================================
// EDUMO — Student Management Callable Functions
// createStudent, updateStudent, transferStudent, softDeactivateStudent
// ============================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { writeAuditLog } from '../utils/audit';
import {
  createStudentSchema,
  updateStudentSchema,
  transferStudentSchema,
  softDeactivateStudentSchema,
} from '../schemas';
import { validationError } from '../utils/errors';

/**
 * Server-validated student creation with duplicate admission number check.
 */
export const createStudent = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);

    // Rate limit: 60 per hour per user
    await checkRateLimit(authCtx.uid, 'createStudent', {
      max: 60,
      windowMs: 3600000,
    });

    const parseResult = createStudentSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { orgId, schoolId, student: data } = parseResult.data;

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

    // Duplicate admission number check within school
    const existingSnap = await schoolRef
      .collection('students')
      .where('admissionNumber', '==', data.admissionNumber)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      throw new HttpsError(
        'already-exists',
        `A student with admission number "${data.admissionNumber}" already exists in this school.`
      );
    }

    const now = FieldValue.serverTimestamp();
    const studentRef = schoolRef.collection('students').doc();
    const studentId = studentRef.id;

    const studentRecord = {
      id: studentId,
      admissionNumber: data.admissionNumber,
      firstName: data.firstName,
      middleName: data.middleName || '',
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      nationality: data.nationality || '',
      currentClassId: data.currentClassId,
      currentStreamId: data.currentStreamId || '',
      boardingStatus: data.boardingStatus,
      emergencyContacts: data.emergencyContacts || [],
      address: data.address || null,
      guardianIds: [],
      status: 'active',
      createdAt: now,
      createdBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    };

    const batch = db.batch();
    batch.set(studentRef, studentRecord);

    // Increment summary counter
    const summaryRef = schoolRef.collection('summaries').doc('counts');
    batch.set(
      summaryRef,
      {
        totalStudents: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();

    await writeAuditLog({
      orgId,
      schoolId,
      action: 'student.create',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'student',
      targetId: studentId,
      after: {
        admissionNumber: data.admissionNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        currentClassId: data.currentClassId,
      },
    });

    return {
      studentId,
      admissionNumber: data.admissionNumber,
      message: 'Student created successfully.',
    };
  }
);

/**
 * Server-validated student updates.
 */
export const updateStudent = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = updateStudentSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { orgId, schoolId, studentId, updates } = parseResult.data;

    requireSchoolRole(authCtx, orgId, schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    const studentRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('schools')
      .doc(schoolId)
      .collection('students')
      .doc(studentId);

    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError('not-found', 'Student not found.');
    }

    const before = studentSnap.data()!;
    const now = FieldValue.serverTimestamp();

    const updatePayload: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: authCtx.uid,
    };

    if (updates.firstName !== undefined) updatePayload.firstName = updates.firstName;
    if (updates.middleName !== undefined) updatePayload.middleName = updates.middleName;
    if (updates.lastName !== undefined) updatePayload.lastName = updates.lastName;
    if (updates.dateOfBirth !== undefined) updatePayload.dateOfBirth = updates.dateOfBirth;
    if (updates.gender !== undefined) updatePayload.gender = updates.gender;
    if (updates.nationality !== undefined) updatePayload.nationality = updates.nationality;
    if (updates.currentClassId !== undefined) updatePayload.currentClassId = updates.currentClassId;
    if (updates.currentStreamId !== undefined) updatePayload.currentStreamId = updates.currentStreamId;
    if (updates.boardingStatus !== undefined) updatePayload.boardingStatus = updates.boardingStatus;
    if (updates.emergencyContacts !== undefined) updatePayload.emergencyContacts = updates.emergencyContacts;
    if (updates.address !== undefined) updatePayload.address = updates.address;

    await studentRef.update(updatePayload);

    await writeAuditLog({
      orgId,
      schoolId,
      action: 'student.update',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'student',
      targetId: studentId,
      before: {
        firstName: before.firstName,
        lastName: before.lastName,
        currentClassId: before.currentClassId,
      },
      after: updates,
    });

    return { success: true, message: 'Student updated successfully.' };
  }
);

/**
 * Transfer student to another school/branch while preserving academic history.
 */
export const transferStudent = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = transferStudentSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    // Caller must have admin rights at source school
    requireSchoolRole(authCtx, data.sourceOrgId, data.sourceSchoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    const sourceRef = db
      .collection('organizations')
      .doc(data.sourceOrgId)
      .collection('schools')
      .doc(data.sourceSchoolId)
      .collection('students')
      .doc(data.studentId);

    const sourceSnap = await sourceRef.get();
    if (!sourceSnap.exists) {
      throw new HttpsError('not-found', 'Source student record not found.');
    }

    const sourceStudent = sourceSnap.data()!;
    if (sourceStudent.status === 'transferred') {
      throw new HttpsError('failed-precondition', 'Student is already transferred.');
    }

    const targetSchoolRef = db
      .collection('organizations')
      .doc(data.targetOrgId)
      .collection('schools')
      .doc(data.targetSchoolId);

    const targetSchoolSnap = await targetSchoolRef.get();
    if (!targetSchoolSnap.exists) {
      throw new HttpsError('not-found', 'Target school not found.');
    }

    const now = FieldValue.serverTimestamp();
    const newStudentRef = targetSchoolRef.collection('students').doc();
    const newStudentId = newStudentRef.id;

    const previousHistory = Array.isArray(sourceStudent.transferHistory)
      ? sourceStudent.transferHistory
      : [];

    const newTransferRecord = {
      fromOrgId: data.sourceOrgId,
      fromSchoolId: data.sourceSchoolId,
      fromStudentId: data.studentId,
      transferredAt: new Date().toISOString(),
      reason: data.reason,
      transferredBy: authCtx.uid,
    };

    const batch = db.batch();

    // Mark source student as transferred
    batch.update(sourceRef, {
      status: 'transferred',
      transferredToOrgId: data.targetOrgId,
      transferredToSchoolId: data.targetSchoolId,
      transferredToStudentId: newStudentId,
      transferredAt: now,
      transferReason: data.reason,
      updatedAt: now,
      updatedBy: authCtx.uid,
    });

    // Create student in target school
    batch.set(newStudentRef, {
      ...sourceStudent,
      id: newStudentId,
      currentClassId: data.newClassId,
      currentStreamId: data.newStreamId || '',
      status: 'active',
      transferHistory: [...previousHistory, newTransferRecord],
      createdAt: now,
      createdBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    });

    await batch.commit();

    await writeAuditLog({
      orgId: data.sourceOrgId,
      schoolId: data.sourceSchoolId,
      action: 'student.transfer',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'student',
      targetId: data.studentId,
      after: {
        toOrgId: data.targetOrgId,
        toSchoolId: data.targetSchoolId,
        newStudentId,
        reason: data.reason,
      },
    });

    return {
      newStudentId,
      message: 'Student transferred successfully to target school.',
    };
  }
);

/**
 * Soft deactivate student with retention policy compliance.
 */
export const softDeactivateStudent = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);
    const parseResult = softDeactivateStudentSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const { orgId, schoolId, studentId, reason, notes } = parseResult.data;

    requireSchoolRole(authCtx, orgId, schoolId, [
      'principal',
      'deputy',
      'admin',
    ]);

    const studentRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('schools')
      .doc(schoolId)
      .collection('students')
      .doc(studentId);

    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      throw new HttpsError('not-found', 'Student not found.');
    }

    const now = FieldValue.serverTimestamp();

    await studentRef.update({
      status: 'inactive',
      deactivationReason: reason,
      deactivationNotes: notes || '',
      deactivatedAt: now,
      deactivatedBy: authCtx.uid,
      updatedAt: now,
      updatedBy: authCtx.uid,
    });

    await writeAuditLog({
      orgId,
      schoolId,
      action: 'student.deactivate',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'unknown',
      targetType: 'student',
      targetId: studentId,
      after: { reason, notes },
    });

    return { success: true, message: 'Student soft-deactivated successfully.' };
  }
);

