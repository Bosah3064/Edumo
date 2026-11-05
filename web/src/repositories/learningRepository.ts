// ============================================================
// EDUMO — Digital Learning Repository (Zeraki Learning)
// Directive Section 3 & 4: Local-First Retrieval & Read Minimization
// Manages digital resources, quizzes, and assignment submissions.
// Checks IndexedDB first before querying Firestore.
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
  LearningResource,
  Quiz,
  QuizAttempt,
  AssignmentSubmission,
} from '@edumo/shared';
import { cacheLocalItem, getLocalItem } from '../services/indexedDbStorage';

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Fetch digital learning resources with local IndexedDB caching
 */
export async function getLearningResources(
  orgId: string,
  schoolId: string,
  categoryFilter?: string,
  gradeFilter?: string
): Promise<LearningResource[]> {
  const cacheKey = `res_${categoryFilter || 'all'}_${gradeFilter || 'all'}`;
  const cached = await getLocalItem<LearningResource[]>(orgId, schoolId, 'resource', cacheKey);
  if (cached) return cached;

  const dedupKey = `${orgId}:${schoolId}:${cacheKey}`;
  if (inFlight.has(dedupKey)) {
    return inFlight.get(dedupKey) as Promise<LearningResource[]>;
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'learningResources');
      let q = query(colRef, orderBy('createdAt', 'desc'), limit(100));

      if (categoryFilter && categoryFilter !== 'all') {
        q = query(colRef, where('category', '==', categoryFilter), orderBy('createdAt', 'desc'), limit(100));
      }

      const snap = await getDocs(q);
      const resources: LearningResource[] = [];
      snap.forEach((d) => resources.push({ id: d.id, ...(d.data() as LearningResource) }));

      await cacheLocalItem(orgId, schoolId, 'resource', cacheKey, resources, 20 * 60 * 1000);
      return resources;
    } catch (err) {
      console.warn('[LearningRepo] Failed to fetch resources:', err);
      return [];
    } finally {
      inFlight.delete(dedupKey);
    }
  })();

  inFlight.set(dedupKey, promise);
  return promise;
}

/**
 * Upload a new learning resource
 */
export async function saveLearningResource(
  orgId: string,
  schoolId: string,
  resource: Omit<LearningResource, 'id' | 'createdAt'>
): Promise<LearningResource> {
  const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'learningResources');
  const targetDoc = doc(colRef);
  const data: LearningResource = {
    ...resource,
    id: targetDoc.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(targetDoc, {
    ...data,
    createdAt: serverTimestamp(),
  });

  return data;
}

/**
 * Fetch published quizzes for a class
 */
export async function getQuizzes(
  orgId: string,
  schoolId: string,
  gradeFilter?: string
): Promise<Quiz[]> {
  const cacheKey = `quizzes_${gradeFilter || 'all'}`;
  const cached = await getLocalItem<Quiz[]>(orgId, schoolId, 'quiz', cacheKey);
  if (cached) return cached;

  try {
    const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'quizzes');
    const q = query(colRef, where('status', '==', 'published'), limit(50));
    const snap = await getDocs(q);
    const quizzes: Quiz[] = [];
    snap.forEach((d) => quizzes.push({ id: d.id, ...(d.data() as Quiz) }));

    await cacheLocalItem(orgId, schoolId, 'quiz', cacheKey, quizzes, 15 * 60 * 1000);
    return quizzes;
  } catch (err) {
    console.warn('[LearningRepo] Failed to fetch quizzes:', err);
    return [];
  }
}

/**
 * Record a student quiz attempt
 */
export async function recordQuizAttempt(
  orgId: string,
  schoolId: string,
  quizId: string,
  attempt: Omit<QuizAttempt, 'id' | 'completedAt'>
): Promise<QuizAttempt> {
  const colRef = collection(
    db,
    'organizations',
    orgId,
    'schools',
    schoolId,
    'quizzes',
    quizId,
    'attempts'
  );
  const targetDoc = doc(colRef);
  const data: QuizAttempt = {
    ...attempt,
    id: targetDoc.id,
    completedAt: new Date().toISOString(),
  };

  await setDoc(targetDoc, {
    ...data,
    completedAt: serverTimestamp(),
  });

  return data;
}

