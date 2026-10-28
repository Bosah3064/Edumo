import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<UserClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const customClaims = tokenResult.claims as unknown as UserClaims;
          setClaims(customClaims);
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
  };

  const isPlatformAdmin = useMemo(() => {
    return Boolean(claims?.platformAdmin || (claims as unknown as { isPlatformAdmin?: boolean })?.isPlatformAdmin);
  }, [claims]);

  const activeOrgId = useMemo(() => {
    return claims?.orgId || null;
  }, [claims]);

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
