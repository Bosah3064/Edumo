import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  query,
  where,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import type {
  Organization,
  School,
  UserRole,
  Permission,
} from '@edumo/shared';
import { DEFAULT_ROLE_PERMISSIONS } from '@edumo/shared';

interface TenantContextType {
  organization: Organization | null;
  schools: School[];
  currentSchool: School | null;
  currentRole: UserRole | null;
  userPermissions: Permission[];
  loading: boolean;
  switchSchool: (schoolId: string) => void;
  hasPermission: (permission: Permission) => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, claims, activeOrgId } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Listen to Organization Document
  useEffect(() => {
    if (!activeOrgId) {
      setOrganization(null);
      setSchools([]);
      setLoading(false);
      return;
    }

    const orgRef = doc(db, 'organizations', activeOrgId);
    const unsubOrg = onSnapshot(
      orgRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setOrganization({ id: snapshot.id, ...(snapshot.data() as DocumentData) } as Organization);
        } else {
          // Fallback demo organization if not found
          setOrganization({
            id: activeOrgId,
            name: 'Edumo Demonstration Academy',
            type: 'group',
            country: 'KE',
            status: 'active',
          } as Organization);
        }
      },
      (error) => {
        console.error('Error listening to organization:', error);
        setOrganization({
          id: activeOrgId,
          name: 'Edumo Demonstration Academy',
          type: 'group',
          country: 'KE',
          status: 'active',
        } as Organization);
      }
    );

    // 2. Listen to Schools subcollection
    const schoolsRef = collection(db, 'organizations', activeOrgId, 'schools');
    const unsubSchools = onSnapshot(
      schoolsRef,
      (snapshot) => {
        const fetchedSchools = snapshot.docs.map(
          (d) => ({ id: d.id, ...(d.data() as DocumentData) } as School)
        );

        if (fetchedSchools.length === 0) {
          // Provide fallback school structure if empty
          const defaultSchool = {
            id: 'main-campus',
            name: 'Edumo Nairobi Main Campus',
            code: 'MAIN',
            type: 'combined',
            country: 'KE',
            curriculumType: 'CBC',
            gradingMode: 'cbc_no_aggregate',
            status: 'active',
          } as School;
          setSchools([defaultSchool]);
          setCurrentSchoolId('main-campus');
        } else {
          setSchools(fetchedSchools);

          // Auto-select initial school if none selected or current is invalid
          setCurrentSchoolId((prev) => {
            if (prev && fetchedSchools.some((s) => s.id === prev)) {
              return prev;
            }
            const savedSchool = localStorage.getItem('edumo_active_school_id');
            if (savedSchool && fetchedSchools.some((s) => s.id === savedSchool)) {
              return savedSchool;
            }
            // Prioritize first branch accessible to user according to claims
            if (claims?.schoolRoles) {
              const accessibleId = Object.keys(claims.schoolRoles).find((sid) =>
                fetchedSchools.some((s) => s.id === sid)
              );
              if (accessibleId) return accessibleId;
            }
            return fetchedSchools[0]?.id || 'main-campus';
          });
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error listening to schools:', error);
        const defaultSchool = {
          id: 'main-campus',
          name: 'Edumo Nairobi Main Campus',
          code: 'MAIN',
          type: 'combined',
          country: 'KE',
          curriculumType: 'CBC',
          gradingMode: 'cbc_no_aggregate',
          status: 'active',
        } as School;
        setSchools([defaultSchool]);
        setCurrentSchoolId('main-campus');
        setLoading(false);
      }
    );

    return () => {
      unsubOrg();
      unsubSchools();
    };
  }, [activeOrgId, claims]);

  const currentSchool = useMemo(() => {
    return schools.find((s) => s.id === currentSchoolId) || schools[0] || null;
  }, [schools, currentSchoolId]);

  // Determine current user's role in this school
  const currentRole = useMemo<UserRole | null>(() => {
    if (!claims) return 'orgOwner';
    if (claims.orgRole === 'orgOwner') return 'orgOwner';
    if (!currentSchoolId || !claims.schoolRoles) return claims.orgRole || 'orgOwner';
    const role = claims.schoolRoles[currentSchoolId];
    return (role as UserRole) || claims.orgRole || 'orgOwner';
  }, [claims, currentSchoolId]);

  // Compute permissions for current role
  const userPermissions = useMemo<Permission[]>(() => {
    if (!currentRole) return Object.values(DEFAULT_ROLE_PERMISSIONS).flat();
    if (currentRole === 'orgOwner' || currentRole === 'platformAdmin') {
      return Object.values(DEFAULT_ROLE_PERMISSIONS).flat();
    }
    return (DEFAULT_ROLE_PERMISSIONS as Record<string, Permission[]>)[currentRole] || [];
  }, [currentRole]);

  const hasPermission = (permission: Permission): boolean => {
    if (!currentRole || currentRole === 'orgOwner' || claims?.platformAdmin) return true;
    return userPermissions.includes(permission);
  };

  const switchSchool = (schoolId: string) => {
    if (schools.some((s) => s.id === schoolId)) {
      setCurrentSchoolId(schoolId);
      localStorage.setItem('edumo_active_school_id', schoolId);
      if (activeOrgId) {
        localStorage.setItem(`edumo_active_school_${activeOrgId}`, schoolId);
      }
    }
  };

  return (
    <TenantContext.Provider
      value={{
        organization,
        schools,
        currentSchool,
        currentRole,
        userPermissions,
        loading,
        switchSchool,
        hasPermission,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
