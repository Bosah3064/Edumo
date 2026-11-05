// ============================================================
// EDUMO — Academic Progression & Student Promotion Engine
// Supports CBC, 8-4-4, Cambridge, and East African Progression Standards
// ============================================================

import { doc, writeBatch, arrayUnion, serverTimestamp, type Firestore } from 'firebase/firestore';

export interface PromotionDecision {
  studentId: string;
  studentName: string;
  admissionNo: string;
  currentClass: string;
  targetClass: string;
  isGraduated: boolean;
  scoreAverage: number;
  cbcRating?: 'EE' | 'ME' | 'AE' | 'BE';
  status: 'promoted' | 'repeat' | 'promoted_on_trial';
  systemRecommendation: 'promoted' | 'repeat';
  teacherOverride?: boolean;
  teacherReason?: string;
}

/**
 * Standard progression map across East African CBC, 8-4-4, and International curricula
 */
const CLASS_PROGRESSION_ORDER = [
  'Daycare',
  'Playgroup',
  'PP1',
  'PP2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Graduated Alumni',
];

const TRADITIONAL_844_ORDER = [
  'Nursery',
  'Pre-Unit',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Graduated Alumni',
];

/**
 * Calculate the next class in succession
 * Supports stream preservation (e.g., "Grade 4 East" -> "Grade 5 East")
 */
export function getNextClass(currentClass: string): { nextClass: string; isGraduated: boolean } {
  const trimmed = (currentClass || '').trim();
  if (!trimmed) return { nextClass: 'Grade 1', isGraduated: false };

  // Separate stream if present (e.g. "Grade 4 East", "PP2 Blue")
  const streamMatch = trimmed.match(/^(.*?)\s+(East|West|North|South|Red|Blue|Green|Yellow|Alpha|Beta|[A-Z])$/i);
  const baseClassName = streamMatch ? streamMatch[1].trim() : trimmed;
  const streamSuffix = streamMatch ? ` ${streamMatch[2].trim()}` : '';

  // 1. Check in CBC Order
  const cbcIdx = CLASS_PROGRESSION_ORDER.findIndex(
    (c) => c.toLowerCase() === baseClassName.toLowerCase()
  );
  if (cbcIdx !== -1) {
    if (cbcIdx >= CLASS_PROGRESSION_ORDER.length - 2) {
      return { nextClass: 'Graduated Alumni', isGraduated: true };
    }
    const nextBase = CLASS_PROGRESSION_ORDER[cbcIdx + 1];
    return { nextClass: `${nextBase}${streamSuffix}`, isGraduated: false };
  }

  // 2. Check in 8-4-4 / Traditional Order
  const tradIdx = TRADITIONAL_844_ORDER.findIndex(
    (c) => c.toLowerCase() === baseClassName.toLowerCase()
  );
  if (tradIdx !== -1) {
    if (tradIdx >= TRADITIONAL_844_ORDER.length - 2) {
      return { nextClass: 'Graduated Alumni', isGraduated: true };
    }
    const nextBase = TRADITIONAL_844_ORDER[tradIdx + 1];
    return { nextClass: `${nextBase}${streamSuffix}`, isGraduated: false };
  }

  // 3. Regex Numeric Progression (Grade X -> Grade X+1, Form X -> Form X+1, Year X -> Year X+1)
  const numMatch = baseClassName.match(/^([a-zA-Z\s]+?)(\d+)$/);
  if (numMatch) {
    const prefix = numMatch[1].trim();
    const currentNum = parseInt(numMatch[2], 10);
    const nextNum = currentNum + 1;

    // Check high school exit
    if ((prefix.toLowerCase() === 'form' && currentNum >= 4) ||
        (prefix.toLowerCase() === 'grade' && currentNum >= 12) ||
        (prefix.toLowerCase() === 'year' && currentNum >= 13)) {
      return { nextClass: 'Graduated Alumni', isGraduated: true };
    }

    return { nextClass: `${prefix} ${nextNum}${streamSuffix}`, isGraduated: false };
  }

  // Fallback
  return { nextClass: `${trimmed} (Next Level)`, isGraduated: false };
}

/**
 * Determine promotion status based on average score or CBC rating
 * Standard default pass mark is 50% or Meeting Expectations (ME)
 */
export function evaluatePromotionEligibility(
  scoreAverage: number,
  cbcRating?: string,
  passThreshold = 50
): { status: 'promoted' | 'repeat'; reason: string } {
  // CBC evaluation
  if (cbcRating) {
    const normalized = cbcRating.toUpperCase();
    if (normalized.includes('EE') || normalized.includes('EXCEEDING') ||
        normalized.includes('ME') || normalized.includes('MEETING')) {
      return {
        status: 'promoted',
        reason: `Satisfied CBC learning competency thresholds (${cbcRating}).`,
      };
    }
    if (normalized.includes('BE') || normalized.includes('BELOW')) {
      return {
        status: 'repeat',
        reason: `Below expectation in foundational CBC strands (${cbcRating}). Consolidation required.`,
      };
    }
  }

  // Marks / Percentage evaluation
  if (scoreAverage >= passThreshold) {
    return {
      status: 'promoted',
      reason: `Overall average of ${scoreAverage.toFixed(1)}% meets the ${passThreshold}% advancement threshold.`,
    };
  }

  return {
    status: 'repeat',
    reason: `Overall average of ${scoreAverage.toFixed(1)}% is below the required ${passThreshold}% pass threshold.`,
  };
}

/**
 * Batch update student records in Firestore to execute promotions
 */
export async function executeBatchClassPromotion(
  db: Firestore,
  orgId: string,
  schoolId: string,
  promotions: PromotionDecision[],
  promotedBy: string,
  academicYear: string = '2026'
): Promise<{ promotedCount: number; repeatedCount: number }> {
  const batch = writeBatch(db);
  let promotedCount = 0;
  let repeatedCount = 0;

  const nowIso = new Date().toISOString();

  promotions.forEach((p) => {
    const studentRef = doc(db, 'organizations', orgId, 'schools', schoolId, 'students', p.studentId);

    const isPromoted = p.status === 'promoted' || p.status === 'promoted_on_trial';
    const targetClass = isPromoted ? p.targetClass : p.currentClass;

    if (isPromoted) {
      promotedCount++;
    } else {
      repeatedCount++;
    }

    batch.update(studentRef, {
      currentClassId: targetClass,
      promotionStatus: p.status,
      lastPromotion: {
        fromClass: p.currentClass,
        toClass: targetClass,
        academicYear,
        status: p.status,
        scoreAverage: p.scoreAverage,
        promotedAt: nowIso,
        promotedBy,
        reason: p.teacherReason || (isPromoted ? 'Satisfied end of year academic threshold' : 'Recommended to repeat class'),
      },
      promotionHistory: arrayUnion({
        fromClass: p.currentClass,
        toClass: targetClass,
        academicYear,
        status: p.status,
        scoreAverage: p.scoreAverage,
        promotedAt: nowIso,
        promotedBy,
        reason: p.teacherReason || (isPromoted ? 'Satisfied end of year academic threshold' : 'Recommended to repeat class'),
      }),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return { promotedCount, repeatedCount };
}

