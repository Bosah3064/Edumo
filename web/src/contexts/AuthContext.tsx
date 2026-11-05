import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserClaims, UserRole } from '@edumo/shared';

interface AuthContextType {
  currentUser: User | null;
  claims: UserClaims | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
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
    return claims?.orgId || userProfileOrgId || localStorage.getItem('edumo_active_org_id') || 'demo-org-edumo';
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
