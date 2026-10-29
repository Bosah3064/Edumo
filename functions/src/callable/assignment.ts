import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { createAssignmentSchema, submitAssignmentSchema, releaseAssignmentSchema } from '../schemas';
import { validationError } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { FieldValue } from 'firebase-admin/firestore';

export const createAssignment = onCall({ cors: true }, async (request) => {
  const authCtx = requireAuth(request);
  const parsed = createAssignmentSchema.safeParse(request.data);
  if (!parsed.success) throw validationError(parsed.error.issues.map((issue) => ({
    path: issue.path.map(String), message: issue.message,
  })));

  const data = parsed.data;
  await checkRateLimit(authCtx.uid, 'createAssignment', { max: 30, windowMs: 3600000 });

  const orgId = authCtx.claims.orgId;
  if (!orgId) throw new HttpsError('permission-denied', 'Organization membership is required.');
  requireSchoolRole(authCtx, orgId, data.schoolId, ['principal', 'deputy', 'admin', 'teacher']);

  const assignmentRef = data.assignmentId
    ? db.collection('organizations').doc(orgId).collection('schools').doc(data.schoolId).collection('assignments').doc(data.assignmentId)
    : db.collection('organizations').doc(orgId).collection('schools').doc(data.schoolId).collection('assignments').doc();

  const publicQuestions = data.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question);
  const now = Date.now();
  const startsAtMs = new Date(data.startsAt).getTime();
  const status = now < startsAtMs ? 'scheduled' : 'open';

  await db.runTransaction(async (transaction) => {
    const assignmentSnapshot = await transaction.get(assignmentRef);
    if (data.assignmentId && assignmentSnapshot.exists && assignmentSnapshot.data()?.createdBy !== authCtx.uid && !authCtx.claims.platformAdmin) {
      throw new HttpsError('permission-denied', 'Only the creating teacher may update this assignment.');
    }

    transaction.set(assignmentRef, {
      orgId,
      schoolId: data.schoolId,
      title: data.title,
      className: data.className,
      classId: data.classId || null,
      description: data.description,
      fileUrl: data.fileUrl || null,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      maxAttempts: data.maxAttempts,
      resultReleaseMode: data.resultReleaseMode,
      reviewAllowed: data.reviewAllowed,
      questions: publicQuestions,
      status,
      createdBy: assignmentSnapshot.exists ? assignmentSnapshot.data()?.createdBy : authCtx.uid,
      updatedBy: authCtx.uid,
      createdAt: assignmentSnapshot.exists ? assignmentSnapshot.data()?.createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: (assignmentSnapshot.data()?.version || 0) + 1,
    });

    transaction.set(assignmentRef.collection('_private').doc('answers'), {
      orgId,
      schoolId: data.schoolId,
      questions: data.questions,
      createdBy: assignmentSnapshot.exists ? assignmentSnapshot.data()?.createdBy : authCtx.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await writeAuditLog({
    orgId,
    schoolId: data.schoolId,
    action: data.assignmentId ? 'assignment.update' : 'assignment.create',
    category: 'data',
    actorUid: authCtx.uid,
    actorRole: authCtx.claims.schoolRoles?.[data.schoolId] || authCtx.claims.orgRole || 'unknown',
    targetType: 'assignment',
    targetId: assignmentRef.id,
    after: { title: data.title, className: data.className, startsAt: data.startsAt, expiresAt: data.expiresAt },
  });

  return { success: true, assignmentId: assignmentRef.id };
});

export const releaseAssignmentResults = onCall({ cors: true }, async (request) => {
  const authCtx = requireAuth(request);
  const parsed = releaseAssignmentSchema.safeParse(request.data);
  if (!parsed.success) throw validationError(parsed.error.issues.map((issue) => ({
    path: issue.path.map(String), message: issue.message,
  })));

  const { schoolId, assignmentId } = parsed.data;
  const orgId = authCtx.claims.orgId;
  if (!orgId) throw new HttpsError('permission-denied', 'Organization membership is required.');
  requireSchoolRole(authCtx, orgId, schoolId, ['principal', 'deputy', 'admin', 'teacher']);

  const assignmentRef = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId).collection('assignments').doc(assignmentId);
  await db.runTransaction(async (transaction) => {
    const assignmentSnap = await transaction.get(assignmentRef);
    if (!assignmentSnap.exists) throw new HttpsError('not-found', 'Assignment not found.');
    const assignment = assignmentSnap.data()!;
    if (assignment.createdBy !== authCtx.uid && !authCtx.claims.platformAdmin && authCtx.claims.orgRole !== 'orgOwner') {
      throw new HttpsError('permission-denied', 'Only the creating teacher or school administration may release results.');
    }

    const submissionsSnap = await transaction.get(assignmentRef.collection('submissions'));
    submissionsSnap.docs.forEach((submission) => {
      if (submission.data().status === 'pendingRelease') {
        transaction.update(submission.ref, { status: 'submitted', releasedAt: FieldValue.serverTimestamp(), releasedBy: authCtx.uid });
      }
    });
    transaction.update(assignmentRef, { resultReleaseMode: 'immediate', resultsReleasedAt: FieldValue.serverTimestamp(), resultsReleasedBy: authCtx.uid, updatedAt: FieldValue.serverTimestamp() });
  });

  await writeAuditLog({
    orgId, schoolId, action: 'assignment.resultsRelease', category: 'admin',
    actorUid: authCtx.uid,
    actorRole: authCtx.claims.schoolRoles?.[schoolId] || authCtx.claims.orgRole || 'unknown',
    targetType: 'assignment', targetId: assignmentId,
  });

  return { success: true };
});

export const submitAssignment = onCall({ cors: true }, async (request) => {
  const authCtx = requireAuth(request);
  const parsed = submitAssignmentSchema.safeParse(request.data);
  if (!parsed.success) throw validationError(parsed.error.issues.map((issue) => ({
    path: issue.path.map(String), message: issue.message,
  })));

  const { schoolId, assignmentId, answers, operationId } = parsed.data;
  const orgId = authCtx.claims.orgId;
  if (!orgId) throw new HttpsError('permission-denied', 'Organization membership is required.');
  requireSchoolRole(authCtx, orgId, schoolId, ['student']);
  await checkRateLimit(authCtx.uid, 'submitAssignment', { max: 20, windowMs: 3600000 });

  const assignmentRef = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId).collection('assignments').doc(assignmentId);
  const result = await db.runTransaction(async (transaction) => {
    const assignmentSnap = await transaction.get(assignmentRef);
    if (!assignmentSnap.exists) throw new HttpsError('not-found', 'Assignment not found.');
    const assignment = assignmentSnap.data()!;
    const now = Date.now();
    const startsAt = new Date(assignment.startsAt).getTime();
    const expiresAt = new Date(assignment.expiresAt).getTime();
    if (now < startsAt) throw new HttpsError('failed-precondition', 'Assignment is not open yet.');
    if (now > expiresAt) throw new HttpsError('failed-precondition', 'Assignment has expired.');

    const keySnap = await transaction.get(assignmentRef.collection('_private').doc('answers'));
    if (!keySnap.exists) throw new HttpsError('failed-precondition', 'Assignment answer key is unavailable.');
    const keyQuestions = keySnap.data()?.questions || [];

    const submissionsRef = assignmentRef.collection('submissions');
    const studentAttemptsSnap = await transaction.get(
      submissionsRef.where('studentUid', '==', authCtx.uid)
    );
    const studentAttempts = studentAttemptsSnap.docs;

    if (operationId) {
      const duplicate = studentAttempts.find((doc) => doc.data().operationId === operationId);
      if (duplicate) {
        const duplicateData = duplicate.data();
        const released = assignment.resultReleaseMode === 'immediate' ||
          (assignment.resultReleaseMode === 'afterExpiry' && now >= expiresAt);
        return {
          duplicate: true,
          score: duplicateData.score || 0,
          total: duplicateData.total || 0,
          released,
          reviewAllowed: released && assignment.reviewAllowed === true,
          results: released && assignment.reviewAllowed === true ? (duplicateData.results || {}) : undefined,
        };
      }
    }

    const maxAttempts = Math.max(1, Math.min(10, Number(assignment.maxAttempts || 1)));
    if (studentAttempts.length >= maxAttempts) {
      throw new HttpsError('resource-exhausted', `Maximum attempts (${maxAttempts}) reached.`);
    }

    // Verify that the student belongs to this school and, when class audience is
    // stored with the assignment, that the student is in the selected class.
    const studentSnap = await transaction.get(
      db.collection('organizations').doc(orgId).collection('schools').doc(schoolId)
        .collection('students').where('uid', '==', authCtx.uid).limit(1)
    );
    if (studentSnap.empty) {
      throw new HttpsError('failed-precondition', 'Student record is not available for this school.');
    }
    const student = studentSnap.docs[0].data();
    if (assignment.classId && student.classId && student.classId !== assignment.classId) {
      throw new HttpsError('permission-denied', 'This assignment is not for your class.');
    }
    if (!assignment.classId && assignment.className && student.className && student.className !== assignment.className) {
      throw new HttpsError('permission-denied', 'This assignment is not for your class.');
    }

    let score = 0;
    let total = 0;
    const questionResults: Record<string, { selected: number; correct: boolean }> = {};
    for (const question of keyQuestions) {
      if (!(question.id in answers)) throw new HttpsError('invalid-argument', `Answer missing for question ${question.id}.`);
      const selected = Number(answers[question.id]);
      const correct = selected === Number(question.correctAnswer);
      total += Number(question.points || 1);
      if (correct) score += Number(question.points || 1);
      questionResults[question.id] = { selected, correct };
    }

    const submissionId = operationId ? `${authCtx.uid}_${operationId}` : authCtx.uid;
    const submissionRef = submissionsRef.doc(submissionId);
    const released = assignment.resultReleaseMode === 'immediate' ||
      (assignment.resultReleaseMode === 'afterExpiry' && now >= expiresAt);

    transaction.set(submissionRef, {
      orgId,
      schoolId,
      assignmentId,
      studentUid: authCtx.uid,
      studentName: student.displayName || student.name || 'Student',
      answers,
      results: questionResults,
      score,
      total,
      status: assignment.resultReleaseMode === 'manual' || !released ? 'pendingRelease' : 'submitted',
      operationId: operationId || submissionId,
      submittedAt: FieldValue.serverTimestamp(),
    }, { merge: false });

    return {
      duplicate: false,
      score,
      total,
      released,
      reviewAllowed: released && assignment.reviewAllowed === true,
      results: released && assignment.reviewAllowed === true ? questionResults : undefined,
    };
  });

  await writeAuditLog({
    orgId,
    schoolId,
    action: 'assignment.submit',
    category: 'data',
    actorUid: authCtx.uid,
    actorRole: authCtx.claims.schoolRoles?.[schoolId] || 'student',
    targetType: 'assignmentSubmission',
    targetId: assignmentId,
    after: { score: result.score, total: result.total, duplicate: result.duplicate },
  });

  return {
    success: true,
    duplicate: result.duplicate,
    score: result.released ? result.score : undefined,
    total: result.released ? result.total : undefined,
    released: result.released,
    reviewAllowed: result.reviewAllowed,
    results: result.results,
  };
});
