import { describe, it, expect } from 'vitest';
import {
  calculateGradeBand,
  computeStudentAggregate,
  rankCohort,
  compareGrades,
  KENYA_COUNTRY_PACK,
  UGANDA_COUNTRY_PACK,
  TANZANIA_COUNTRY_PACK,
} from '@edumo/shared';

describe('Country Pack Grading Engine (Master Spec Section 6)', () => {
  const cbcScale = KENYA_COUNTRY_PACK.gradingScales.find((s) => s.id === 'cbc_no_aggregate')!;
  const classicScale = KENYA_COUNTRY_PACK.gradingScales.find((s) => s.id === 'classic_marks_rank')!;
  const unebScale = UGANDA_COUNTRY_PACK.gradingScales.find((s) => s.id === 'uneb_nine_band')!;
  const nectaScale = TANZANIA_COUNTRY_PACK.gradingScales.find((s) => s.id === 'necta_division')!;

  describe('Kenya CBC 8-Level Competency', () => {
    it('correctly maps boundary scores to CBC bands', () => {
      expect(calculateGradeBand(95, cbcScale)?.code).toBe('EE1');
      expect(calculateGradeBand(90, cbcScale)?.code).toBe('EE1');
      expect(calculateGradeBand(75, cbcScale)?.code).toBe('EE2');
      expect(calculateGradeBand(65, cbcScale)?.code).toBe('ME1');
      expect(calculateGradeBand(50, cbcScale)?.code).toBe('ME2');
      expect(calculateGradeBand(40, cbcScale)?.code).toBe('AE1');
      expect(calculateGradeBand(20, cbcScale)?.code).toBe('BE1');
      expect(calculateGradeBand(10, cbcScale)?.code).toBe('BE2');
      expect(calculateGradeBand(0, cbcScale)?.code).toBe('BE2');
    });

    it('enforces STRICT NO-AGGREGATE mode for CBC (no mean grade, no rank)', () => {
      const result = computeStudentAggregate(
        'student-1',
        'Zawadi Achieng',
        'ADM/2026/001',
        [
          { subjectId: 'math', subjectName: 'Mathematics', rawScore: 85, maxScore: 100 },
          { subjectId: 'eng', subjectName: 'English Language', rawScore: 70, maxScore: 100 },
          { subjectId: 'kis', subjectName: 'Kiswahili', rawScore: 60, maxScore: 100 },
        ],
        cbcScale
      );

      expect(result.isNoAggregate).toBe(true);
      expect(result.totalScore).toBeUndefined();
      expect(result.meanScore).toBeUndefined();
      expect(result.summaryBand).toBeUndefined();
      expect(result.rank).toBeNull();
      expect(result.complianceNotice).toContain('CBC Assessment Standard');
    });

    it('denies cohort ranking when allowRanking is false', () => {
      const studentA = computeStudentAggregate('s1', 'Learner 1', 'ADM-1', [{ subjectId: 'm', subjectName: 'Math', rawScore: 90, maxScore: 100 }], cbcScale);
      const studentB = computeStudentAggregate('s2', 'Learner 2', 'ADM-2', [{ subjectId: 'm', subjectName: 'Math', rawScore: 50, maxScore: 100 }], cbcScale);

      const ranked = rankCohort([studentA, studentB], cbcScale);
      expect(ranked[0].rank).toBeNull();
      expect(ranked[1].rank).toBeNull();
    });
  });

  describe('Kenya Classic 8-4-4 Mode', () => {
    it('computes total percentage, mean grade, and cohort ranks', () => {
      const studentA = computeStudentAggregate(
        's1',
        'Kevin Kiprono',
        'ADM-001',
        [
          { subjectId: 'math', subjectName: 'Mathematics', rawScore: 85, maxScore: 100 },
          { subjectId: 'eng', subjectName: 'English', rawScore: 75, maxScore: 100 },
        ],
        classicScale
      );

      const studentB = computeStudentAggregate(
        's2',
        'Faith Wanjiku',
        'ADM-002',
        [
          { subjectId: 'math', subjectName: 'Mathematics', rawScore: 60, maxScore: 100 },
          { subjectId: 'eng', subjectName: 'English', rawScore: 50, maxScore: 100 },
        ],
        classicScale
      );

      expect(studentA.meanScore).toBe(80);
      expect(studentA.summaryBand?.code).toBe('A');

      const ranked = rankCohort([studentB, studentA], classicScale);
      expect(ranked[0].studentId).toBe('s1');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].studentId).toBe('s2');
      expect(ranked[1].rank).toBe(2);
    });
  });

  describe('Direction-Aware Grading (Uganda UNEB & Tanzania NECTA)', () => {
    it('handles UNEB descending scale where D1 (order 1) is better than F9 (order 9)', () => {
      const bandD1 = unebScale.bands.find((b) => b.code === 'D1')!;
      const bandF9 = unebScale.bands.find((b) => b.code === 'F9')!;

      // compareGrades returns positive if first is better than second
      const comp = compareGrades(bandD1, bandF9, unebScale);
      expect(comp).toBeGreaterThan(0);
    });

    it('correctly maps NECTA percentage to Division bands', () => {
      const result = computeStudentAggregate(
        'tz-1',
        'Baraka Juma',
        'TZ-100',
        [
          { subjectId: 's1', subjectName: 'Hisabati', rawScore: 85, maxScore: 100 },
          { subjectId: 's2', subjectName: 'Kiswahili', rawScore: 80, maxScore: 100 },
          { subjectId: 's3', subjectName: 'Kiingereza', rawScore: 78, maxScore: 100 },
          { subjectId: 's4', subjectName: 'Sayansi', rawScore: 75, maxScore: 100 },
          { subjectId: 's5', subjectName: 'Maarifa ya Jamii', rawScore: 76, maxScore: 100 },
          { subjectId: 's6', subjectName: 'Uraia', rawScore: 82, maxScore: 100 },
        ],
        nectaScale
      );

      expect(result.division).toBeDefined();
    });
  });
});

