// ============================================================
// EDUMO SHARED — Digital Learning Platform Engine (Zeraki-Inspired)
// Master Spec Section 4
// Logic for:
// 1. Auto-marking MCQs, True/False, and Short Answers
// 2. Randomized question order shuffling
// 3. Topic-based performance diagnostics
// 4. Secure answer-key stripping before sending to student client
// ============================================================

import type {
  Quiz,
  QuizQuestion,
  QuizAnswerKey,
  QuizAttempt,
} from '../types/learning';

/**
 * Strips explanations from quiz questions for students if answer keys are not yet released
 */
export function sanitizeQuizForStudent(quiz: Quiz): Quiz {
  if (quiz.keysReleased) {
    return quiz;
  }

  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      const sanitized = { ...q };
      delete sanitized.explanation;
      return sanitized;
    }),
  };
}

/**
 * Shuffles questions pseudorandomly using Fisher-Yates algorithm
 */
export function shuffleQuestions<T>(questions: T[]): T[] {
  const array = [...questions];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export interface StudentAnswerPayload {
  selectedOption?: number;
  booleanAnswer?: boolean;
  textAnswer?: string;
}

/**
 * Server-authoritative Quiz Auto-Marking Engine
 * Evaluates student responses against official answer keys in `_private` subcollection.
 */
export function gradeQuizSubmission(
  quiz: Quiz,
  answerKeys: Record<string, QuizAnswerKey>,
  studentAnswers: Record<string, StudentAnswerPayload>
): {
  score: number;
  maxPossibleScore: number;
  percentage: number;
  passed: boolean;
  detailedAnswers: QuizAttempt['answers'];
  topicDiagnostics: QuizAttempt['topicDiagnostics'];
} {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const detailedAnswers: QuizAttempt['answers'] = {};
  const topicStats: Record<string, { total: number; scored: number }> = {};

  for (const q of quiz.questions) {
    const key = answerKeys[q.id];
    const studentAns = studentAnswers[q.id];
    const qMax = q.maxScore || 1;
    maxPossibleScore += qMax;

    // Track topic bucket
    const topic = q.topicTag || 'General';
    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, scored: 0 };
    }
    topicStats[topic].total += qMax;

    let isCorrect = false;
    let awarded = 0;

    if (key && studentAns) {
      if (q.type === 'mcq') {
        if (
          key.correctOptionIndex !== undefined &&
          studentAns.selectedOption === key.correctOptionIndex
        ) {
          isCorrect = true;
          awarded = qMax;
        }
      } else if (q.type === 'true_false') {
        if (
          key.correctBoolean !== undefined &&
          studentAns.booleanAnswer === key.correctBoolean
        ) {
          isCorrect = true;
          awarded = qMax;
        }
      } else if (q.type === 'short_answer') {
        if (key.acceptableAnswers && studentAns.textAnswer) {
          const cleanStudentText = studentAns.textAnswer.trim().toLowerCase();
          const match = key.acceptableAnswers.some(
            (ans) => ans.trim().toLowerCase() === cleanStudentText
          );
          if (match) {
            isCorrect = true;
            awarded = qMax;
          }
        }
      }
    }

    totalScore += awarded;
    topicStats[topic].scored += awarded;

    detailedAnswers[q.id] = {
      selectedOption: studentAns?.selectedOption,
      booleanAnswer: studentAns?.booleanAnswer,
      textAnswer: studentAns?.textAnswer,
      isCorrect,
      awardedScore: awarded,
    };
  }

  const percentage =
    maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
  const passed = percentage >= (quiz.passingPercentage || 50);

  const topicDiagnostics: QuizAttempt['topicDiagnostics'] = {};
  for (const [topic, stats] of Object.entries(topicStats)) {
    topicDiagnostics[topic] = {
      total: stats.total,
      scored: stats.scored,
      percentage: stats.total > 0 ? Math.round((stats.scored / stats.total) * 100) : 0,
    };
  }

  return {
    score: totalScore,
    maxPossibleScore,
    percentage,
    passed,
    detailedAnswers,
    topicDiagnostics,
  };
}

