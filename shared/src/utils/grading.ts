// ============================================================
// EDUMO — Direction-Aware Country-Pack Grading Engine
// Implements Master Spec Section 6 (Country Packs) & Phase 2
// Handles:
// - Kenya CBC (EE1..BE2, strictly NO-AGGREGATE / NO-RANK)
// - Kenya Classic 8-4-4 (A..E, mean grade, total points, ranking)
// - Uganda UNEB (D1..F9 direction-aware desc sorting)
// - Tanzania NECTA (Best-6 / Best-7 aggregates with Division I..IV boundaries)
// - Rwanda Competence (A..E with subject pass thresholds)
// ============================================================

import type { GradingScale, GradingBand } from '../types/countryPack';

export interface SubjectScore {
  subjectId: string;
  subjectName: string;
  rawScore: number;
  maxScore: number;
  percentageScore: number;
  band: GradingBand | null;
  comments?: string;
}

export interface StudentAssessmentAggregate {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  subjects: SubjectScore[];
  /** Total score or points (undefined if aggregateMode === 'none') */
  totalScore?: number;
  /** Mean percentage (undefined if aggregateMode === 'none') */
  meanScore?: number;
  /** Overall mean or summary band (undefined if aggregateMode === 'none') */
  summaryBand?: GradingBand | null;
  /** NECTA Division or UNEB division (e.g. Division I) */
  division?: string;
  /** Ranked position (1, 2, 3...) — null if allowRanking === false or CBC */
  rank?: number | null;
  isNoAggregate: boolean;
  complianceNotice?: string;
}

/**
 * Determine the matching grading band for a given percentage score
 */
export function calculateGradeBand(
  percentageScore: number,
  scale: GradingScale
): GradingBand | null {
  const normalized = Math.max(0, Math.min(100, Math.round(percentageScore * 10) / 10));

  for (const band of scale.bands) {
    if (normalized >= band.minScore && normalized <= band.maxScore) {
      return band;
    }
  }

  // Fallback to lowest or highest band on extreme boundary
  if (scale.bands.length > 0) {
    if (normalized >= 100) return scale.bands[0];
    return scale.bands[scale.bands.length - 1];
  }

  return null;
}

/**
 * Direction-aware comparison between two grades
 * Returns positive if A is better than B, negative if B is better than A, 0 if equal.
 */
export function compareGrades(
  bandA: GradingBand,
  bandB: GradingBand,
  scale: GradingScale
): number {
  if (scale.direction === 'desc') {
    // Lower points or lower order is better (e.g. UNEB D1 = order 1 is best)
    const orderA = bandA.order ?? bandA.points ?? 999;
    const orderB = bandB.order ?? bandB.points ?? 999;
    return orderB - orderA;
  } else {
    // Higher points or score is better (e.g. CBC EE1 = 8 points, A = 12 points)
    const pointsA = bandA.points ?? bandA.minScore;
    const pointsB = bandB.points ?? bandB.minScore;
    return pointsA - pointsB;
  }
}

/**
 * Compute assessment aggregate for a student across all their subjects.
 * Strictly enforces NO-AGGREGATE rules for CBC!
 */
export function computeStudentAggregate(
  studentId: string,
  studentName: string,
  admissionNumber: string,
  rawSubjects: Array<{
    subjectId: string;
    subjectName: string;
    rawScore: number;
    maxScore: number;
    comments?: string;
  }>,
  scale: GradingScale
): StudentAssessmentAggregate {
  const scoredSubjects: SubjectScore[] = rawSubjects.map((s) => {
    const max = s.maxScore > 0 ? s.maxScore : 100;
    const percentage = (s.rawScore / max) * 100;
    const band = calculateGradeBand(percentage, scale);
    return {
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      rawScore: s.rawScore,
      maxScore: max,
      percentageScore: Math.round(percentage * 10) / 10,
      band,
      comments: s.comments,
    };
  });

  // Strict CBC No-Aggregate check
  if (scale.aggregateMode === 'none' || scale.id === 'cbc_no_aggregate') {
    return {
      studentId,
      studentName,
      admissionNumber,
      subjects: scoredSubjects,
      isNoAggregate: true,
      complianceNotice:
        'CBC Assessment Standard: No mean grade, total points, or class ranking permitted across learning areas.',
      rank: null,
    };
  }

  // Mean Aggregate Mode (Classic 8-4-4 / Percentage)
  if (scale.aggregateMode === 'mean') {
    const totalPercentage = scoredSubjects.reduce((acc, s) => acc + s.percentageScore, 0);
    const mean = scoredSubjects.length > 0 ? totalPercentage / scoredSubjects.length : 0;
    const meanRounded = Math.round(mean * 10) / 10;
    const summaryBand = calculateGradeBand(meanRounded, scale);

    return {
      studentId,
      studentName,
      admissionNumber,
      subjects: scoredSubjects,
      totalScore: Math.round(totalPercentage * 10) / 10,
      meanScore: meanRounded,
      summaryBand,
      isNoAggregate: false,
    };
  }

  // Best-N Mode (NECTA O-Level Best-6 / A-Level Best-7)
  if (scale.aggregateMode === 'best_n') {
    const n = scale.aggregateN || 6;
    // Sort subjects by best performance (highest points or lowest order for NECTA points)
    const sorted = [...scoredSubjects].sort((a, b) => {
      const pA = a.band?.points ?? 7;
      const pB = b.band?.points ?? 7;
      return pA - pB; // In NECTA 1 point is best (Division I)
    });

    const bestN = sorted.slice(0, n);
    const pointsSum = bestN.reduce((acc, s) => acc + (s.band?.points || 7), 0);

    // Calculate Division from boundaries
    let division = 'Division 0 / Fail';
    if (scale.divisionBoundaries) {
      for (const [divName, boundary] of Object.entries(scale.divisionBoundaries)) {
        const meetsMin = boundary.min === null || pointsSum >= boundary.min;
        const meetsMax = boundary.max === null || pointsSum <= boundary.max;
        if (meetsMin && meetsMax) {
          division = divName;
          break;
        }
      }
    }

    return {
      studentId,
      studentName,
      admissionNumber,
      subjects: scoredSubjects,
      totalScore: pointsSum,
      division,
      isNoAggregate: false,
    };
  }

  // Default Total Points Mode
  const totalPoints = scoredSubjects.reduce((acc, s) => acc + (s.band?.points || 0), 0);
  return {
    studentId,
    studentName,
    admissionNumber,
    subjects: scoredSubjects,
    totalScore: totalPoints,
    isNoAggregate: false,
  };
}

/**
 * Assign ranks across a cohort of students.
 * Skips ranking entirely if scale.allowRanking === false or CBC mode!
 */
export function rankCohort(
  cohort: StudentAssessmentAggregate[],
  scale: GradingScale
): StudentAssessmentAggregate[] {
  if (!scale.allowRanking || scale.aggregateMode === 'none') {
    return cohort.map((s) => ({ ...s, rank: null }));
  }

  // Sort descending by totalScore or meanScore
  const sorted = [...cohort].sort((a, b) => {
    const valA = a.meanScore ?? a.totalScore ?? 0;
    const valB = b.meanScore ?? b.totalScore ?? 0;
    return valB - valA;
  });

  return sorted.map((student, index) => ({
    ...student,
    rank: index + 1,
  }));
}

