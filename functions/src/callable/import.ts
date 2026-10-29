import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { bulkImportSchema, rollbackImportSchema } from '../schemas';
import { validationError } from '../utils/errors';
import { sanitizeCellFromImport } from '../excel/sanitizer';
import { writeAuditLog } from '../utils/audit';

function clean(value: unknown): string {
  return typeof value === 'string' ? String(sanitizeCellFromImport(value)).trim() : '';
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

export const bulkImport = onCall({ cors: true }, async (request) => {
  const authCtx = requireAuth(request);
  const parsed = bulkImportSchema.safeParse(request.data);
  if (!parsed.success) throw validationError(parsed.error.issues.map((issue) => ({
    path: issue.path.map(String), message: issue.message,
  })));

  const { schoolId, entityType, rows } = parsed.data;
  const orgId = authCtx.claims.orgId;
  if (!orgId) throw new HttpsError('permission-denied', 'Organization membership is required.');
  requireSchoolRole(authCtx, orgId, schoolId, ['principal', 'deputy', 'admin']);

  const schoolRef = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId);
  const schoolSnap = await schoolRef.get();
  if (!schoolSnap.exists) throw new HttpsError('not-found', 'School not found.');
  const schoolData = schoolSnap.data() || {};
  const settings = schoolData.settings as Record<string, unknown> | undefined;
  const emailDomain = clean(settings?.emailDomain || schoolData.contacts?.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].replace(/@.*$/, '').toLowerCase();
  const yearPrefix = String(new Date().getFullYear()).slice(-2);
  const batchId = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId).collection('importJobs').doc().id;
  const batch = db.batch();
  let imported = 0;
  let admissionSequence: number | null = null;
  const staffSequences: Record<string, number> = {};
  const errors: Array<{ rowNum: number; error: string }> = [];

  for (const input of rows) {
    const name = clean(input.name);
    if (!name) {
      errors.push({ rowNum: input.rowNum, error: 'Name is required.' });
      continue;
    }

    if (entityType === 'students') {
      const counterRef = schoolRef.collection('counters').doc(`admissions-${yearPrefix}`);
      if (admissionSequence === null) {
        const counterSnap = await counterRef.get();
        admissionSequence = Number(counterSnap.data()?.lastSequence || 0);
      }
      admissionSequence++;
      const sequence = admissionSequence;
      const admissionNumber = clean(input.admissionNumber) || `${yearPrefix}/${String(sequence).padStart(4, '0')}`;
      batch.set(counterRef, { lastSequence: sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      const localPart = admissionNumber.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
      const schoolEmail = localPart && emailDomain ? `${localPart}@${emailDomain}` : null;
      const { firstName, lastName } = splitName(name);
      if (!firstName) {
        errors.push({ rowNum: input.rowNum, error: 'A first name is required.' });
        continue;
      }
      const ref = schoolRef.collection('students').doc();
      batch.set(ref, {
        admissionNumber,
        schoolEmail,
        firstName,
        lastName,
        currentClassId: clean(input.className) || null,
        gender: clean(input.gender) || null,
        status: 'active',
        guardianPhone: clean(input.guardianPhone) || null,
        importBatchId: batchId,
        createdAt: FieldValue.serverTimestamp(),
      });
      imported++;
    } else {
      const role = clean(input.role).toLowerCase();
      const allowedRoles = ['principal', 'deputy', 'admin', 'bursar', 'teacher', 'support'];
      const staffRole = allowedRoles.includes(role) ? role : 'support';
      const roleKey = staffRole === 'teacher' ? 'teacher' : ['principal', 'deputy', 'admin'].includes(staffRole) ? 'admin' : 'staff';
      const letter = roleKey === 'teacher' ? 'T' : roleKey === 'admin' ? 'A' : 'W';
      const counterName = `staff-${roleKey}-${yearPrefix}`;
      const counterRef = schoolRef.collection('counters').doc(counterName);
      if (staffSequences[counterName] === undefined) {
        const counterSnap = await counterRef.get();
        staffSequences[counterName] = Number(counterSnap.data()?.lastSequence || 0);
      }
      staffSequences[counterName]++;
      const sequence = staffSequences[counterName];
      const generatedSchoolId = `${yearPrefix}/${letter}${String(sequence).padStart(4, '0')}`;
      batch.set(counterRef, { lastSequence: sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      const { firstName, lastName } = splitName(name);
      const schoolEmail = emailDomain ? `${generatedSchoolId.replace(/[^0-9A-Za-z]/g, '').toLowerCase()}@${emailDomain}` : null;
      const ref = schoolRef.collection('staff').doc();
      batch.set(ref, {
        name,
        firstName,
        lastName,
        role: staffRole,
        schoolId: clean(input.schoolId) || generatedSchoolId,
        schoolEmail,
        email: clean(input.email) || schoolEmail,
        phone: clean(input.phone) || null,
        status: 'active',
        importBatchId: batchId,
        createdAt: FieldValue.serverTimestamp(),
      });
      imported++;
    }
  }

  batch.set(schoolRef.collection('importJobs').doc(batchId), {
    orgId, schoolId, entityType, batchId, status: 'committed', totalRows: rows.length,
    importedRows: imported, errorCount: errors.length, errors, createdBy: authCtx.uid,
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await writeAuditLog({
    orgId, schoolId, action: 'bulkImport.commit', category: 'data', actorUid: authCtx.uid,
    actorRole: authCtx.claims.schoolRoles?.[schoolId] || authCtx.claims.orgRole || 'unknown',
    targetType: 'importJob', targetId: batchId,
    after: { entityType, importedRows: imported, errorCount: errors.length },
  });
  return { success: true, batchId, importedRows: imported, errorCount: errors.length, errors };
});

export const rollbackImport = onCall({ cors: true }, async (request) => {
  const authCtx = requireAuth(request);
  const parsed = rollbackImportSchema.safeParse(request.data);
  if (!parsed.success) throw validationError(parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })));
  const { schoolId, batchId } = parsed.data;
  const orgId = authCtx.claims.orgId;
  if (!orgId) throw new HttpsError('permission-denied', 'Organization membership is required.');
  requireSchoolRole(authCtx, orgId, schoolId, ['principal', 'deputy', 'admin']);
  const schoolRef = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId);
  const jobRef = schoolRef.collection('importJobs').doc(batchId);
  const job = await jobRef.get();
  if (!job.exists) throw new HttpsError('not-found', 'Import batch not found.');
  if (job.data()?.status === 'rolledBack') return { success: true, removedRows: 0, alreadyRolledBack: true };
  const entityType = job.data()?.entityType as 'students' | 'staff';
  const collectionRef = schoolRef.collection(entityType);
  const docs = await collectionRef.where('importBatchId', '==', batchId).get();
  const batch = db.batch();
  docs.forEach((doc) => batch.delete(doc.ref));
  batch.set(jobRef, { status: 'rolledBack', rolledBackAt: FieldValue.serverTimestamp(), rolledBackBy: authCtx.uid }, { merge: true });
  await batch.commit();
  await writeAuditLog({ orgId, schoolId, action: 'bulkImport.rollback', category: 'admin', actorUid: authCtx.uid, actorRole: authCtx.claims.schoolRoles?.[schoolId] || 'unknown', targetType: 'importJob', targetId: batchId, after: { removedRows: docs.size } });
  return { success: true, removedRows: docs.size };
});
