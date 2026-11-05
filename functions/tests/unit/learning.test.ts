// ============================================================
// EDUMO — Digital Learning Platform Unit Tests (Phase 3)
// Master Spec Section 4 (Zeraki Learning Equivalent)
// Tests:
// 1. Quiz auto-marking calculation for MCQ, True/False, and Short Answer
// 2. Topic-based diagnostic percentage breakdown
// 3. Question randomization & Fisher-Yates shuffling
// 4. Answer key security sanitization (explanations stripped before release)
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  gradeQuizSubmission,
  sanitizeQuizForStudent,
  shuffleQuestions,
  Quiz,
  QuizAnswerKey,
} from '@edumo/shared';

describe('Digital Learning Platform Engine (Phase 3)', () => {
  const mockQuiz: Quiz = {
    id: 'quiz-bio-101',
    title: 'Cell Biology & Photosynthesis',
    subject: 'Biology',
    grade: 'Form 2',
    topic: 'Cell Physiology',
    timeLimitMinutes: 15,
    maxAttempts: 2,
    passingPercentage: 60,
    isRandomized: true,
    status: 'published',
    keysReleased: false,
    createdBy: 'teacher-1',
    createdByName: 'Mwalimu Okoth',
    createdAt: '2026-03-01T10:00:00Z',
    questions: [
      {
        id: 'q1',
        question: 'Which organelle is known as the powerhouse of the cell?',
        type: 'mcq',
        options: ['Ribosome', 'Mitochondria', 'Chloroplast', 'Golgi apparatus'],
        maxScore: 2,
        topicTag: 'Cell Structure',
        explanation: 'Mitochondria generate most of the chemical energy needed to power the cell.',
      },
      {
        id: 'q2',
        question: 'Photosynthesis occurs in both plant and animal cells.',
        type: 'true_false',
        maxScore: 1,
        topicTag: 'Photosynthesis',
        explanation: 'False. Only plant cells and autotrophic organisms have chloroplasts for photosynthesis.',
      },
      {
        id: 'q3',
        question: 'What green pigment absorbs light during photosynthesis?',
        type: 'short_answer',
        maxScore: 2,
        topicTag: 'Photosynthesis',
        explanation: 'Chlorophyll is the primary pigment.',
      },
    ],
  };

  const mockAnswerKeys: Record<string, QuizAnswerKey> = {
    q1: { questionId: 'q1', correctOptionIndex: 1 },
    q2: { questionId: 'q2', correctBoolean: false },
    q3: {
      questionId: 'q3',
      acceptableAnswers: ['chlorophyll', 'chlorophyl', 'chlorophyll a'],
    },
  };

  describe('Server-Authoritative Quiz Auto-Marking', () => {
    it('correctly grades a perfect score attempt with topic diagnostics', () => {
      const studentAnswers = {
        q1: { selectedOption: 1 },
        q2: { booleanAnswer: false },
        q3: { textAnswer: 'Chlorophyll' }, // case-insensitive check
      };

      const result = gradeQuizSubmission(mockQuiz, mockAnswerKeys, studentAnswers);

      expect(result.score).toBe(5);
      expect(result.maxPossibleScore).toBe(5);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);

      // Verify topic breakdown
      expect(result.topicDiagnostics['Cell Structure'].percentage).toBe(100);
      expect(result.topicDiagnostics['Photosynthesis'].percentage).toBe(100);
    });

    it('correctly grades partial scores and identifies weak topic areas', () => {
      const studentAnswers = {
        q1: { selectedOption: 1 }, // Correct: 2 pts (Cell Structure)
        q2: { booleanAnswer: true }, // Incorrect: 0 pts (Photosynthesis)
        q3: { textAnswer: 'Melanin' }, // Incorrect: 0 pts (Photosynthesis)
      };

      const result = gradeQuizSubmission(mockQuiz, mockAnswerKeys, studentAnswers);

      expect(result.score).toBe(2);
      expect(result.maxPossibleScore).toBe(5);
      expect(result.percentage).toBe(40);
      expect(result.passed).toBe(false); // below 60%

      // Cell Structure: 2/2 = 100%
      expect(result.topicDiagnostics['Cell Structure'].percentage).toBe(100);
      // Photosynthesis: 0/3 = 0%
      expect(result.topicDiagnostics['Photosynthesis'].percentage).toBe(0);
    });
  });

  describe('Answer Key Protection (Section 4 Security Requirement)', () => {
    it('strips explanations from student questions before release time', () => {
      const sanitized = sanitizeQuizForStudent(mockQuiz);

      for (const q of sanitized.questions) {
        expect(q.explanation).toBeUndefined();
      }
    });

    it('preserves explanations once keys are officially released', () => {
      const releasedQuiz = { ...mockQuiz, keysReleased: true };
      const sanitized = sanitizeQuizForStudent(releasedQuiz);

      expect(sanitized.questions[0].explanation).toBeDefined();
    });
  });

  describe('Randomized Question Shuffling', () => {
    it('returns an array containing all original elements', () => {
      const questions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
      const shuffled = shuffleQuestions(questions);

      expect(shuffled).toHaveLength(questions.length);
      for (const q of questions) {
        expect(shuffled).toContain(q);
      }
    });
  });
});

