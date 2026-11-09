import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  collectionGroup,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserClaims, UserRole } from '@edumo/shared';
import { generateDefaultStudentPassword, getCleanAdmissionNumber } from '../utils/admission';

interface AuthContextType {
  currentUser: User | null;
  claims: UserClaims | null;
  loading: boolean;
  signIn: (emailOrIdentifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshClaims: () => Promise<UserClaims | null>;
  isPlatformAdmin: boolean;
  activeOrgId: string | null;
  userProfileRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [userProfileRole, setUserProfileRole] = useState<UserRole | null>(null);
  const [userProfileOrgId, setUserProfileOrgId] = useState<string | null>(() => {
    return localStorage.getItem('edumo_active_org_id');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const customClaims = tokenResult.claims as unknown as UserClaims;
          setClaims(customClaims);
          if (customClaims?.orgId) {
            setUserProfileOrgId(customClaims.orgId);
            localStorage.setItem('edumo_active_org_id', customClaims.orgId);
          } else {
            // Check Firestore for user profile role, membership or owned organization
            try {
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                const uData = userDoc.data();
                const resolvedRole = (uData?.role || uData?.memberships?.[0]?.role || null) as UserRole | null;
                if (resolvedRole) setUserProfileRole(resolvedRole);
                if (uData?.memberships?.[0]?.orgId) {
                  const fetchedOrgId = uData.memberships[0].orgId;
                  setUserProfileOrgId(fetchedOrgId);
                  localStorage.setItem('edumo_active_org_id', fetchedOrgId);
                }
              } else {
                // Check if user is the direct creator/owner of any organization
                const orgsQuery = query(collection(db, 'organizations'), where('ownerId', '==', user.uid), limit(1));
                const orgsSnap = await getDocs(orgsQuery);
                if (!orgsSnap.empty) {
                  const fetchedOrgId = orgsSnap.docs[0].id;
                  setUserProfileOrgId(fetchedOrgId);
                  setUserProfileRole('orgOwner');
                  localStorage.setItem('edumo_active_org_id', fetchedOrgId);
                } else {
                  // Fallback: fetch active live organization from Firestore database
                  const anyOrgQuery = query(collection(db, 'organizations'), limit(1));
                  const anyOrgSnap = await getDocs(anyOrgQuery);
                  if (!anyOrgSnap.empty) {
                    const fetchedOrgId = anyOrgSnap.docs[0].id;
                    setUserProfileOrgId(fetchedOrgId);
                    localStorage.setItem('edumo_active_org_id', fetchedOrgId);
                  }
                }
              }
            } catch (fsErr) {
              console.warn('Could not resolve user profile from Firestore:', fsErr);
            }
          }
        } catch (error) {
          console.error('Error fetching token claims:', error);
          setClaims(null);
        }
      } else {
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshClaims = async (): Promise<UserClaims | null> => {
    if (!auth.currentUser) return null;
    const tokenResult = await auth.currentUser.getIdTokenResult(true); // force refresh
    const updatedClaims = tokenResult.claims as unknown as UserClaims;
    setClaims(updatedClaims);
    if (updatedClaims?.orgId) {
      setUserProfileOrgId(updatedClaims.orgId);
      localStorage.setItem('edumo_active_org_id', updatedClaims.orgId);
    }
    return updatedClaims;
  };

  /**
   * Universal Institutional Sign-In:
   * 1. Signs in existing accounts via Firebase Auth.
   * 2. If account does not exist in Firebase Auth yet, automatically checks if user is an enrolled
   *    student or staff member in Firestore with pre-provisioned credentials.
   *    If matching credentials found, auto-creates their Firebase Auth account and signs them in!
   */
  const signIn = async (emailOrIdentifier: string, password: string) => {
    const rawInput = (emailOrIdentifier || '').trim();
    const normalizedInput = rawInput.toLowerCase();

    // Step 1: Direct Firebase Auth Attempt
    try {
      await signInWithEmailAndPassword(auth, normalizedInput, password);
      return;
    } catch (fbErr: any) {
      const isAuthMiss =
        fbErr?.code === 'auth/user-not-found' ||
        fbErr?.code === 'auth/invalid-credential' ||
        fbErr?.code === 'auth/wrong-password' ||
        fbErr?.code === 'auth/invalid-email';

      if (!isAuthMiss) {
        throw fbErr;
      }
    }

    // Step 2: Automated Student & Staff Institutional Account Provisioning
    try {
      let matchedDoc: any = null;
      let matchedData: any = null;

      // Look up by schoolEmail or institutionalEmail
      if (normalizedInput.includes('@')) {
        const qEmail = query(collectionGroup(db, 'students'), where('schoolEmail', '==', normalizedInput), limit(1));
        const snap = await getDocs(qEmail);
        if (!snap.empty) {
          matchedDoc = snap.docs[0];
          matchedData = snap.docs[0].data();
        } else {
          const qInst = query(collectionGroup(db, 'students'), where('institutionalEmail', '==', normalizedInput), limit(1));
          const snapInst = await getDocs(qInst);
          if (!snapInst.empty) {
            matchedDoc = snapInst.docs[0];
            matchedData = snapInst.docs[0].data();
          }
        }
      }

      // Look up by admissionNumber or cleanAdmissionNumber (e.g. 22/05688 or 2205688)
      if (!matchedDoc) {
        const qAdm = query(collectionGroup(db, 'students'), where('admissionNumber', '==', rawInput), limit(1));
        const snapAdm = await getDocs(qAdm);
        if (!snapAdm.empty) {
          matchedDoc = snapAdm.docs[0];
          matchedData = snapAdm.docs[0].data();
        } else {
          const cleanAdm = getCleanAdmissionNumber(rawInput);
          if (cleanAdm) {
            const qClean = query(collectionGroup(db, 'students'), where('cleanAdmissionNumber', '==', cleanAdm), limit(1));
            const snapClean = await getDocs(qClean);
            if (!snapClean.empty) {
              matchedDoc = snapClean.docs[0];
              matchedData = snapClean.docs[0].data();
            }
          }
        }
      }

      if (matchedDoc && matchedData) {
        const studentAdm = matchedData.admissionNumber || '';
        const cleanAdm = getCleanAdmissionNumber(studentAdm);
        const expectedDefaultPass = matchedData.defaultPassword || generateDefaultStudentPassword(studentAdm);

        const isPasswordCorrect =
          password === expectedDefaultPass ||
          password === `Edumo@${cleanAdm}` ||
          password === matchedData.defaultPassword;

        if (isPasswordCorrect) {
          const studentEmail =
            matchedData.schoolEmail ||
            matchedData.institutionalEmail ||
            `${cleanAdm}@students.${matchedData.schoolDomain || 'edumo.school'}`;

          const studentName =
            matchedData.fullName ||
            `${matchedData.firstName || 'Student'} ${matchedData.lastName || ''}`.trim();

          const segments = matchedDoc.ref.path.split('/');
          const orgId = segments[1] || matchedData.orgId || '';
          const schoolId = segments[3] || matchedData.schoolId || '';

          // Provision the Firebase Auth user on the spot!
          const userCredential = await createUserWithEmailAndPassword(auth, studentEmail, password);
          await updateProfile(userCredential.user, { displayName: studentName });

          // Write user profile to /users/{uid}
          await setDoc(
            doc(db, 'users', userCredential.user.uid),
            {
              email: studentEmail,
              displayName: studentName,
              role: 'student',
              studentId: matchedDoc.id,
              admissionNumber: studentAdm,
              schoolId: schoolId,
              orgId: orgId,
              memberships: [
                {
                  orgId: orgId,
                  schoolId: schoolId,
                  role: 'student',
                },
              ],
              createdAt: serverTimestamp(),
              activatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // Update student document in Firestore
          await updateDoc(matchedDoc.ref, {
            authUid: userCredential.user.uid,
            accountStatus: 'active',
            activatedAt: serverTimestamp(),
          });

          if (orgId) {
            setUserProfileOrgId(orgId);
            localStorage.setItem('edumo_active_org_id', orgId);
          }
          if (schoolId) {
            localStorage.setItem('edumo_active_school_id', schoolId);
          }
          setUserProfileRole('student');
          return;
        }
      }
    } catch (provisionErr) {
      console.warn('Auto student provisioning attempt error:', provisionErr);
    }

    throw new Error('Invalid login credentials. Please verify your institutional email or admission number and password.');
  };

  const signUp = async (email: string, password: string, name: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential.user;
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setClaims(null);
    setCurrentUser(null);
    setUserProfileOrgId(null);
    setUserProfileRole(null);
    localStorage.removeItem('edumo_active_org_id');
    localStorage.removeItem('edumo_active_school_id');
  };

  const isPlatformAdmin = useMemo(() => {
    return Boolean(claims?.platformAdmin || (claims as unknown as { isPlatformAdmin?: boolean })?.isPlatformAdmin);
  }, [claims]);

  const activeOrgId = useMemo(() => {
    if (!currentUser) return null;
    return claims?.orgId || userProfileOrgId || localStorage.getItem('edumo_active_org_id') || null;
  }, [currentUser, claims, userProfileOrgId]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        claims,
        loading,
        signIn,
        signUp,
        signOut,
        refreshClaims,
        isPlatformAdmin,
        activeOrgId,
        userProfileRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
