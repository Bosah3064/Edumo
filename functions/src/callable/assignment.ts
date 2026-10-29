import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { requireAuth } from '../middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const submitAssignment = onCall({ cors: true }, async (request) => {
  const authCtx = requireAuth(request);
  const { orgId, schoolId, assignmentId, answers } = request.data || {};
  if (!orgId || !schoolId || !assignmentId || !answers || typeof answers !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing assignment submission data.');
  }

  const assignmentRef = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId).collection('assignments').doc(assignmentId);
  const assignmentSnap = await assignmentRef.get();
  if (!assignmentSnap.exists) throw new HttpsError('not-found', 'Assignment not found.');
  const assignment = assignmentSnap.data()!;
  const now = Date.now();
  const startsAt = new Date(assignment.startsAt).getTime();
  const expiresAt = new Date(assignment.expiresAt).getTime();
  if (now < startsAt) throw new HttpsError('failed-precondition', 'Assignment is not open yet.');
  if (now > expiresAt) throw new HttpsError('failed-precondition', 'Assignment has expired.');

  const keyRef = assignmentRef.collection('_private').doc('answers');
  const keySnap = await keyRef.get();
  const key = keySnap.exists ? (keySnap.data()?.questions || []) : [];
  let score = 0;
  let total = 0;
  const publicResults: Record<string, { selected: number; correct: boolean }> = {};
  for (const question of key) {
    const selected = Number((answers as Record<string, number>)[question.id]);
    const correct = selected === Number(question.correctAnswer);
    total += Number(question.points || 1);
    if (correct) score += Number(question.points || 1);
    publicResults[question.id] = { selected, correct };
  }

  await assignmentRef.collection('submissions').doc(authCtx.uid).set({
    studentUid: authCtx.uid,
    studentName: 'Student',
    answers,
    results: publicResults,
    score,
    total,
    submittedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, score, total, reviewAllowed: Boolean(assignment.reviewAllowed) };
});
