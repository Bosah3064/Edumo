// ============================================================
// EDUMO — Tenant Summary Repository (Zero Collection Scans)
// Directive Section 7: Dashboard and Analytics Optimization
// Reads pre-aggregated summary documents from Firestore:
// `/organizations/{orgId}/schools/{schoolId}/summaries/{summaryId}`
// Checks local IndexedDB / memory cache first before hitting network.
// ============================================================

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cacheLocalItem, getLocalItem } from '../services/indexedDbStorage';

export interface FinanceSummaryData {
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  activePledgesCount: number;
  activePledgesAmount: number;
  fulfilledPledgesAmount: number;
  totalExpenditure: number;
  netCashSurplus: number;
  closingCashBalance: number;
  currency: string;
  lastUpdated: string;
}

export interface AcademicSummaryData {
  activeSeriesCount: number;
  totalAssessmentsConducted: number;
  studentsAssessed: number;
  atRiskCount: number;
  atRiskResolvedCount: number;
  meanCohortPerformance: number;
  topSubject: string;
  gradingMode: string;
  lastUpdated: string;
}

export interface OperationsSummaryData {
  totalEnrolledStudents: number;
  activeStaffCount: number;
  todayAttendanceRate: number;
  pendingVouchersCount: number;
  activeBranchesCount: number;
  lastUpdated: string;
}

// In-memory request deduplication map to prevent simultaneous identical Firestore queries
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Fetch a tenant summary document with Local-First strategy
 */
export async function getTenantSummary<T>(
  orgId: string,
  schoolId: string,
  summaryId: 'finance_summary' | 'academic_summary' | 'operations_summary',
  fallbackDefault: T,
  forceRefresh: boolean = false
): Promise<T> {
  const cacheKey = `summary:${summaryId}`;

  // 1. Check local IndexedDB cache first unless forceRefresh is true
  if (!forceRefresh) {
    const cached = await getLocalItem<T>(orgId, schoolId, 'summary', summaryId);
    if (cached) {
      return cached;
    }
  }

  // 2. Request deduplication: if identical query is in flight, reuse existing promise
  const dedupKey = `${orgId}:${schoolId}:${summaryId}`;
  if (inFlightRequests.has(dedupKey)) {
    return inFlightRequests.get(dedupKey) as Promise<T>;
  }

  const fetchPromise = (async () => {
    try {
      const summaryRef = doc(
        db,
        'organizations',
        orgId,
        'schools',
        schoolId,
        'summaries',
        summaryId
      );

      const snap = await getDoc(summaryRef);
      if (snap.exists()) {
        const data = snap.data() as T;
        // Cache locally for 15 minutes
        await cacheLocalItem(orgId, schoolId, 'summary', summaryId, data, 15 * 60 * 1000);
        return data;
      }

      // If document doesn't exist yet, return default and do not fail
      return fallbackDefault;
    } catch (err) {
      console.warn(`[SummaryRepository] Read failed for ${summaryId}, falling back to default:`, err);
      return fallbackDefault;
    } finally {
      inFlightRequests.delete(dedupKey);
    }
  })();

  inFlightRequests.set(dedupKey, fetchPromise);
  return fetchPromise;
}

/**
 * Update a tenant summary document (typically invoked by cloud triggers or authoritative batch sync)
 */
export async function updateTenantSummary<T extends Record<string, unknown>>(
  orgId: string,
  schoolId: string,
  summaryId: 'finance_summary' | 'academic_summary' | 'operations_summary',
  data: Partial<T>
): Promise<void> {
  try {
    const summaryRef = doc(
      db,
      'organizations',
      orgId,
      'schools',
      schoolId,
      'summaries',
      summaryId
    );

    const payload = {
      ...data,
      lastUpdated: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(summaryRef, payload, { merge: true });

    // Invalidate and update local cache
    await cacheLocalItem(orgId, schoolId, 'summary', summaryId, payload, 15 * 60 * 1000);
  } catch (err) {
    console.error(`[SummaryRepository] Failed to update summary ${summaryId}:`, err);
  }
}
