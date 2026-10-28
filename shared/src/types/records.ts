// ============================================================
// EDUMO SHARED TYPES — Attendance, Assessment, Announcements
// ============================================================
import type {
  DocMeta,
  AttendanceStatus,
  AssessmentType,
  AnnouncementAudience,
  MessageChannel,
  Priority,
  ISOTimestamp,
} from './common';

/** Attendance record (per class per day/lesson) */
export interface AttendanceRecord extends Omit<DocMeta, 'updatedBy' | 'updatedAt'> {
  date: string; // YYYY-MM-DD
  type: 'daily' | 'lesson';
  classId: string;
  streamId?: string;
  subjectId?: string;
  period?: number;
  termId: string;
  academicYearId: string;
  entries: Record<string, AttendanceEntry>;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  markedBy: string;
  markedAt: ISOTimestamp;
  syncedFromOffline: boolean;
}

export interface AttendanceEntry {
  status: AttendanceStatus;
  note?: string;
}

/** Assessment definition */
export interface Assessment extends DocMeta {
  name: string;
  type: AssessmentType;
  classId: string;
  subjectId: string;
  termId: string;
  academicYearId: string;
  maxMarks: number;
  weight?: number;
  strandId?: string;
  rubric?: Record<string, unknown>;
  dueDate?: ISOTimestamp;
  status: 'draft' | 'open' | 'closed' | 'published';
  lockedAt?: ISOTimestamp;
  lockedBy?: string;
}

/** Individual student mark */
export interface Mark {
  id?: string;
  studentId: string;
  score: number;
  maxMarks: number;
  grade?: string;
  gradePoints?: number;
  comment?: string;
  strandScores?: Record<string, StrandScore>;
  isAbsent: boolean;
  enteredBy: string;
  enteredAt: ISOTimestamp;
  syncedFromOffline: boolean;
  editHistory?: MarkEdit[];
}

export interface StrandScore {
  score: number;
  level: string;
}

export interface MarkEdit {
  previousScore: number;
  changedBy: string;
  changedAt: ISOTimestamp;
  reason: string;
}

/** Report card */
export interface ReportCard extends DocMeta {
  studentId: string;
  classId: string;
  termId: string;
  academicYearId: string;
  gradingSystem: string;
  countryCode: string;
  subjects: ReportCardSubject[];
  totalMarks?: number | null;
  averageMarks?: number | null;
  position?: number | null;
  classSize: number;
  overallGrade?: string | null;
  classTeacherComment?: string;
  principalComment?: string;
  parentComment?: string;
  attendance?: { daysPresent: number; daysAbsent: number; totalDays: number };
  behaviour?: Record<string, unknown>;
  activities?: string[];
  status: 'draft' | 'published';
  publishedAt?: ISOTimestamp;
  publishedBy?: string;
  pdfPath?: string;
}

export interface ReportCardSubject {
  subjectId: string;
  name: string;
  score?: number;
  grade: string;
  comment?: string;
  strandDetails?: Record<string, unknown>;
}

/** Announcement */
export interface Announcement extends DocMeta {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  targetClassIds?: string[];
  targetUserIds?: string[];
  channels: MessageChannel[];
  priority: Priority;
  attachments?: AnnouncementAttachment[];
  scheduledAt?: ISOTimestamp;
  sentAt?: ISOTimestamp;
  deliveryStatus?: Record<string, DeliveryStats>;
}

export interface AnnouncementAttachment {
  name: string;
  path: string;
  type: string;
}

export interface DeliveryStats {
  sent: number;
  delivered: number;
  failed: number;
}

/** Summary document (pre-computed for dashboards) */
export interface Summary {
  id?: string;
  type: 'enrollment' | 'attendance' | 'fees' | 'academics';
  period: 'daily' | 'weekly' | 'monthly' | 'termly' | 'yearly';
  date: string;
  classId?: string;
  data: Record<string, unknown>;
  generatedAt: ISOTimestamp;
}
