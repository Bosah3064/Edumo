// ============================================================
// EDUMO — Auth Trigger: onUserCreate
// Creates user profile document on signup
// ============================================================
import * as functions from 'firebase-functions';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * When a new user signs up, create their /users/{uid} profile document.
 * This trigger fires for all auth methods (email, phone, Google, etc).
 */
export const onUserCreate = functions.auth.user().onCreate(async (user: functions.auth.UserRecord) => {
  const userRef = db.collection('users').doc(user.uid);

  // Check if doc already exists (could be created by createOrganization)
  const existing = await userRef.get();
  if (existing.exists) {
    return;
  }

  await userRef.set({
    displayName: user.displayName || user.email || user.phoneNumber || 'User',
    email: user.email || '',
    phone: user.phoneNumber || '',
    photoUrl: user.photoURL || '',
    preferredLanguage: 'en',
    theme: 'system',
    memberships: [],
    fcmTokens: [],
    lastLoginAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
});
