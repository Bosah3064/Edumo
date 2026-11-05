// ============================================================
// EDUMO — Academic Analytics Repository
// Directive Section 3, 4, 9: Academic and Attendance Optimization
// Manages exam series, subject diagnostics, at-risk alerts, and CBC grading
// Strictly enforces local-first retrieval, no unbounded scans, and CBC no-aggregate rules.
// ============================================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  ExamSeries,
  SubjectPerformance,
  AtRiskLearnerAlert,
  LearnerTermProgress,
} from '@edumo/shared';
import { cacheLocalItem, getLocalItem } from '../services/indexedDbStorage';

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Fetch exam series for an academic year and term (cached locally)
 */
export async function getExamSeriesList(
  orgId: string,
  schoolId: string,
  academicYearId?: string,
  termId?: string
): Promise<ExamSeries[]> {
  const cacheKey = `series_${academicYearId || 'current'}_${termId || 'all'}`;
  const cached = await getLocalItem<ExamSeries[]>(orgId, schoolId, 'examSeries', cacheKey);
  if (cached) return cached;

  const dedupKey = `${orgId}:${schoolId}:${cacheKey}`;
  if (inFlight.has(dedupKey)) {
    return inFlight.get(dedupKey) as Promise<ExamSeries[]>;
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'examSeries');
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list: ExamSeries[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as ExamSeries) }));

      await cacheLocalItem(orgId, schoolId, 'examSeries', cacheKey, list, 15 * 60 * 1000);
      return list;
    } catch (err) {
      console.warn('[AcademicRepo] Failed to fetch exam series:', err);
      return [];
    } finally {
      inFlight.delete(dedupKey);
    }
  })();

  inFlight.set(dedupKey, promise);
  return promise;
}

/**
 * Save or publish an Exam Series
 */
export async function saveExamSeries(
  orgId: string,
  schoolId: string,
  series: Omit<ExamSeries, 'id' | 'createdAt'>,
  seriesId?: string
): Promise<ExamSeries> {
  const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'examSeries');
  const targetDoc = seriesId ? doc(colRef, seriesId) : doc(colRef);
  const data: ExamSeries = {
    ...series,
    id: targetDoc.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(targetDoc, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return data;
}

/**
 * Fetch at-risk early intervention alerts
 */
export async function getAtRiskAlerts(
  orgId: string,
  schoolId: string,
  resolvedFilter: boolean = false
): Promise<AtRiskLearnerAlert[]> {
  const cacheKey = `at_risk_${resolvedFilter ? 'resolved' : 'active'}`;
  const cached = await getLocalItem<AtRiskLearnerAlert[]>(orgId, schoolId, 'atRisk', cacheKey);
  if (cached) return cached;

  try {
    const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'atRiskAlerts');
    const q = query(
      colRef,
      where('resolved', '==', resolvedFilter),
      orderBy('detectedAt', 'desc'),
      limit(100)
    );
    const snap = await getDocs(q);
    const alerts: AtRiskLearnerAlert[] = [];
    snap.forEach((d) => alerts.push({ id: d.id, ...(d.data() as AtRiskLearnerAlert) }));

    await cacheLocalItem(orgId, schoolId, 'atRisk', cacheKey, alerts, 10 * 60 * 1000);
    return alerts;
  } catch (err) {
    console.warn('[AcademicRepo] Failed to fetch at-risk alerts:', err);
    return [];
  }
}

