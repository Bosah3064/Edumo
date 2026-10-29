import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { createAssignmentSchema, submitAssignmentSchema } from '../schemas';
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

    const submissionId = operationId || authCtx.uid;
    const submissionRef = assignmentRef.collection('submissions').doc(submissionId);
    const existing = await transaction.get(submissionRef);
    if (existing.exists && !operationId) throw new HttpsError('already-exists', 'This assignment has already been submitted.');
    if (existing.exists && operationId && existing.data()?.operationId === operationId) {
      return { duplicate: true, score: existing.data()?.score || 0, total: existing.data()?.total || 0 };
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

    transaction.set(submissionRef, {
      orgId,
      schoolId,
      assignmentId,
      studentUid: authCtx.uid,
      studentName: 'Student',
      answers,
      results: questionResults,
      score,
      total,
      status: assignment.resultReleaseMode === 'manual' ? 'pendingRelease' : 'submitted',
      operationId: submissionId,
      submittedAt: FieldValue.serverTimestamp(),
    }, { merge: false });

    return { duplicate: false, score, total };
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
    score: result.score,
    total: result.total,
  };
});
