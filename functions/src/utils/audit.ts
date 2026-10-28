// ============================================================
// EDUMO — Audit Log Writer
// Written ONLY by Cloud Functions, never by clients
// ============================================================
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export interface AuditEntry {
  orgId: string;
  schoolId?: string;
  action: string;
  category: 'auth' | 'data' | 'finance' | 'export' | 'admin';
  actorUid: string;
  actorName?: string;
  actorRole?: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry. This is the ONLY way audit logs are created.
 * Called exclusively from Cloud Functions after sensitive operations.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<string> {
  const docRef = db.collection('auditLogs').doc();

  await docRef.set({
    ...entry,
    actorName: entry.actorName || 'Unknown',
    actorRole: entry.actorRole || 'unknown',
    timestamp: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Read audit logs with pagination (called from callable functions with permission checks).
 */
export async function readAuditLogs(params: {
  orgId: string;
  schoolId?: string;
  category?: string;
  actorUid?: string;
  limit?: number;
  startAfterTimestamp?: FirebaseFirestore.Timestamp;
}) {
  let query = db
    .collection('auditLogs')
    .where('orgId', '==', params.orgId)
    .orderBy('timestamp', 'desc');

  if (params.schoolId) {
    query = query.where('schoolId', '==', params.schoolId);
  }
  if (params.category) {
    query = query.where('category', '==', params.category);
  }
  if (params.actorUid) {
    query = query.where('actorUid', '==', params.actorUid);
  }
  if (params.startAfterTimestamp) {
    query = query.startAfter(params.startAfterTimestamp);
  }

  const limit = Math.min(params.limit || 50, 100);
  const snap = await query.limit(limit).get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
