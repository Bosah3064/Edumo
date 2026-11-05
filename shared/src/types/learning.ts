// ============================================================
// EDUMO SHARED TYPES — Digital Learning Platform (Phase 3)
// Master Spec Section 4 (Edumo Digital Learning)
// 1. Digital Resource Bank (Video Lessons, Notes, Past Papers, Schemes)
// 2. Interactive Quiz Engine (MCQ, True/False, Short Answer, Timed, Auto-Marking)
// 3. Assignment Submissions & Rubric Grading
// ============================================================

import type { DocMeta, ISOTimestamp } from './common';

export type ResourceCategory =
  | 'video_lesson'
  | 'notes'
  | 'revision_paper'
  | 'past_paper'
  | 'marking_scheme'
  | 'simulation'
  | 'external_link';

/** Digital Learning Resource Document */
export interface LearningResource extends Partial<DocMeta> {
  id?: string;
  title: string;
  subject: string;
  grade: string; // e.g. "Grade 7", "Form 3"
  topic: string; // e.g. "Algebra", "Photosynthesis", "East African Trade"
  category: ResourceCategory;
  description?: string;
  fileUrl?: string;
  fileSize?: string;
  videoEmbedUrl?: string; // YouTube, Vimeo, or direct MP4 URL
  durationMinutes?: number;
  isLicensed: boolean; // Confirms school has legal distribution right
  downloadCount: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: ISOTimestamp;
}

export type QuestionType = 'mcq' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[]; // For MCQ (e.g. 4 options)
  maxScore: number;
  topicTag: string; // For topic-based diagnostics
  explanation?: string; // Revealed after permitted release time
}

/** Answer key stored strictly in `_private` subcollection, inaccessible to student clients */
export interface QuizAnswerKey {
  questionId: string;
  correctOptionIndex?: number; // For MCQ
  correctBoolean?: boolean; // For true_false
  acceptableAnswers?: string[]; // For short_answer (case-insensitive)
  rubricNotes?: string;
}

/** Quiz Document */
export interface Quiz extends Partial<DocMeta> {
  id?: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  timeLimitMinutes: number;
  maxAttempts: number; // 0 = unlimited
  passingPercentage: number;
  isRandomized: boolean; // Shuffles questions per learner
  questions: QuizQuestion[];
  status: 'draft' | 'published' | 'archived';
  keysReleased: boolean; // When true, students can review explanations & answer keys
  createdBy: string;
  createdByName: string;
  createdAt: ISOTimestamp;
}

/** Student Quiz Attempt & Diagnostics */
export interface QuizAttempt extends Partial<DocMeta> {
  id?: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  score: number;
  maxPossibleScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  answers: Record<string, {
    selectedOption?: number;
    booleanAnswer?: boolean;
    textAnswer?: string;
    isCorrect?: boolean;
    awardedScore: number;
  }>;
  topicDiagnostics: Record<string, {
    total: number;
    scored: number;
    percentage: number;
  }>;
  completedAt: ISOTimestamp;
}

/** Student Assignment Submission */
export interface AssignmentSubmission extends Partial<DocMeta> {
  id?: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  submissionText?: string;
  fileUrl?: string;
  fileName?: string;
  submittedAt: ISOTimestamp;
  status: 'submitted' | 'graded' | 'returned';
  score?: number;
  maxScore?: number;
  rubricBand?: 'EE' | 'ME' | 'AE' | 'BE'; // CBC rubric level
  teacherFeedback?: string;
  gradedBy?: string;
  gradedAt?: ISOTimestamp;
}

