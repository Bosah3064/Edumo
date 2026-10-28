// ============================================================
// EDUMO — Custom Error Types
// ============================================================
import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';

/**
 * Create a structured HttpsError with a consistent format.
 */
export function createError(
  code: FunctionsErrorCode,
  message: string,
  details?: Record<string, unknown>
): HttpsError {
  return new HttpsError(code, message, details);
}

/**
 * Wrap a Zod validation error into a user-friendly HttpsError.
 */
export function validationError(
  errors: Array<{ path: string[]; message: string }>
): HttpsError {
  const details = errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return new HttpsError(
    'invalid-argument',
    `Validation failed: ${details.join('; ')}`,
    { errors }
  );
}
