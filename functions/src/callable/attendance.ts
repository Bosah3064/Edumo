// ============================================================
// EDUMO — Attendance Management Callable Functions
// markAttendance
// ============================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireSchoolRole } from '../middleware/auth';
import { checkRateLimit } from '../middleware/rateLimiter';
import { writeAuditLog } from '../utils/audit';
import { markAttendanceSchema } from '../schemas';
import { validationError } from '../utils/errors';

/**
 * Server-validated attendance marking (daily or per-lesson).
 */
export const markAttendance = onCall(
  { cors: true },
  async (request) => {
    const authCtx = requireAuth(request);

    // Rate limit: 120 per hour
    await checkRateLimit(authCtx.uid, 'markAttendance', {
      max: 120,
      windowMs: 3600000,
    });

    const parseResult = markAttendanceSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw validationError(
        parseResult.error.issues.map((i) => ({
          path: i.path.map(String),
          message: i.message,
        }))
      );
    }
    const data = parseResult.data;

    // Caller must be teacher or administrator in the school
    requireSchoolRole(authCtx, data.orgId, data.schoolId, [
      'principal',
      'deputy',
      'admin',
      'teacher',
    ]);

    const schoolRef = db
      .collection('organizations')
      .doc(data.orgId)
      .collection('schools')
      .doc(data.schoolId);

    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists) {
      throw new HttpsError('not-found', 'School not found.');
    }

    // Verify class exists
    const classRef = schoolRef.collection('classes').doc(data.classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) {
      throw new HttpsError('not-found', 'Class not found.');
    }

    // Compute stats
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    Object.values(data.entries).forEach((entry) => {
      switch (entry.status) {
        case 'present':
          presentCount++;
          break;
        case 'absent':
          absentCount++;
          break;
        case 'late':
          lateCount++;
          break;
        case 'excused':
          excusedCount++;
          break;
      }
    });

    const totalStudents = Object.keys(data.entries).length;

    // Deterministic record ID: classId_date_type(_period)
    const recordId = data.type === 'lesson'
      ? `${data.classId}_${data.date}_lesson_${data.period || 1}_${data.subjectId || 'any'}`
      : `${data.classId}_${data.date}_daily`;

    const attendanceRef = schoolRef.collection('attendance').doc(recordId);
    const now = FieldValue.serverTimestamp();

    const recordData = {
      id: recordId,
      orgId: data.orgId,
      schoolId: data.schoolId,
      classId: data.classId,
      streamId: data.streamId || null,
      date: data.date,
      type: data.type,
      subjectId: data.subjectId || null,
      period: data.period || null,
      termId: data.termId,
      academicYearId: data.academicYearId,
      entries: data.entries,
      stats: {
        total: totalStudents,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        attendanceRate: totalStudents > 0 ? (presentCount + lateCount) / totalStudents : 1.0,
      },
      markedBy: authCtx.uid,
      markedAt: now,
      updatedAt: now,
    };

    await attendanceRef.set(recordData, { merge: true });

    await writeAuditLog({
      orgId: data.orgId,
      schoolId: data.schoolId,
      action: 'attendance.mark',
      category: 'data',
      actorUid: authCtx.uid,
      actorRole: authCtx.claims.orgRole || 'teacher',
      targetType: 'attendance',
      targetId: recordId,
      after: {
        classId: data.classId,
        date: data.date,
        type: data.type,
        total: totalStudents,
        absent: absentCount,
      },
    });

    return {
      recordId,
      stats: recordData.stats,
      message: 'Attendance recorded successfully.',
    };
  }
);

