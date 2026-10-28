// ============================================================
// EDUMO — Rate Limiter for Cloud Functions
// Token-bucket style, backed by Firestore
// ============================================================
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

interface RateLimitConfig {
  /** Maximum number of requests in the window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Check rate limit for a given key (usually uid + operation).
 * Throws RESOURCE_EXHAUSTED if limit is exceeded.
 *
 * Uses Firestore for persistence (works across function instances).
 * For high-traffic endpoints, consider Redis/Memcached instead.
 */
export async function checkRateLimit(
  key: string,
  operation: string,
  config: RateLimitConfig
): Promise<void> {
  const docId = `${operation}_${key}`;
  const ref = db.collection('_rateLimits').doc(docId);

  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();

    if (!data) {
      // First request — create entry
      tx.set(ref, {
        count: 1,
        windowStart: now,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const windowStart = data.windowStart as number;
    const count = data.count as number;

    if (now - windowStart > config.windowMs) {
      // Window expired — reset
      tx.update(ref, {
        count: 1,
        windowStart: now,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    if (count >= config.max) {
      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${operation}. Maximum ${config.max} requests per ${Math.round(config.windowMs / 60000)} minutes. Please try again later.`
      );
    }

    tx.update(ref, {
      count: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
