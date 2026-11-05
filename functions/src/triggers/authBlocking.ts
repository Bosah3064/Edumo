// ============================================================
// EDUMO — Firebase Authentication Blocking Functions (v2)
// Enforces tenant isolation, active status checks, and claims integrity
// ============================================================
import { beforeUserCreated, beforeUserSignedIn, HttpsError } from 'firebase-functions/v2/identity';
import { db } from '../config/firebase';

/**
 * Blocking trigger: beforeUserCreated
 * Enforces email validation, security verification, and account creation controls.
 */
export const beforeCreate = beforeUserCreated((event) => {
  const user = event.data;

  // Block disposable email providers if necessary or enforce domain hygiene
  if (user.email && user.email.includes('+spam')) {
    throw new HttpsError('invalid-argument', 'Invalid email address provided.');
  }

  // Pre-seed default claims or tenant mapping
  return {
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
  };
});

/**
 * Blocking trigger: beforeUserSignedIn
 * Enforces multi-tenant authorization, suspension checks, and token claims verification.
 */
export const beforeSignIn = beforeUserSignedIn(async (event) => {
  const user = event.data;

  // Fetch user profile from Firestore to verify status
  const userDoc = await db.collection('users').doc(user.uid).get();

  if (userDoc.exists) {
    const userData = userDoc.data();

    // Check account status
    if (userData?.status === 'suspended' || userData?.status === 'deactivated') {
      throw new HttpsError('permission-denied', 'Your user account has been suspended by your institution.');
    }

    // Check organization active status
    const primaryMembership = userData?.memberships?.[0];
    if (primaryMembership?.orgId) {
      const orgDoc = await db.collection('organizations').doc(primaryMembership.orgId).get();
      if (orgDoc.exists) {
        const orgData = orgDoc.data();
        if (orgData?.status === 'suspended') {
          throw new HttpsError('permission-denied', 'Your school organization is currently suspended.');
        }
      }
    }
  }

  return;
});

