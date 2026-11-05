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
import { initializeSchoolTables } from '../utils/databaseInitializer';

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
  const { currentUser, claims, activeOrgId, userProfileRole } = useAuth();
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

  // Ensure all core school database collections/tables are initialized in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;
    initializeSchoolTables(
      db,
      organization.id,
      currentSchool.id,
      currentSchool.name,
      currentSchool.curriculumType,
      currentSchool.country || organization.country
    ).catch((err) => {
      console.warn('Auto table initialization deferred:', err);
    });
  }, [organization?.id, currentSchool?.id]);

  // Apply school custom branding colors dynamically to CSS custom properties
  // Guarantees each school/branch has its own visual identity without affecting other schools
  useEffect(() => {
    if (!currentSchool) return;
    const b = currentSchool.branding || {};
    const primary = b.primaryColor || '#1d5f99';
    const secondary = b.secondaryColor || '#683669';
    const accent = b.accentColor || '#10B981';
    const font = b.fontFamily || 'Plus Jakarta Sans';
    const sidebarTheme = b.sidebarTheme || 'school_primary';

    const root = document.documentElement;
    root.style.setProperty('--school-primary', primary);
    root.style.setProperty('--school-secondary', secondary);
    root.style.setProperty('--school-accent', accent);
    root.style.setProperty('--color-blue', primary);
    root.style.setProperty('--color-purple', secondary);

    // Apply font
    const fontStack = font === 'Outfit'
      ? "'Outfit', 'Plus Jakarta Sans', sans-serif"
      : font === 'Lexend'
      ? "'Lexend', 'Inter', sans-serif"
      : font === 'Inter'
      ? "'Inter', system-ui, sans-serif"
      : "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
    root.style.setProperty('--font-main', fontStack);

    // Apply sidebar theme
    if (sidebarTheme === 'school_primary') {
      root.style.setProperty('--sidebar-bg', primary);
      root.style.setProperty('--sidebar-text', '#ffffff');
      root.style.setProperty('--sidebar-text-muted', 'rgba(255, 255, 255, 0.75)');
      root.style.setProperty('--sidebar-active-bg', 'rgba(255, 255, 255, 0.18)');
      root.style.setProperty('--sidebar-active-text', '#ffffff');
      root.style.setProperty('--sidebar-border', 'rgba(255, 255, 255, 0.12)');
    } else if (sidebarTheme === 'dark_slate') {
      root.style.setProperty('--sidebar-bg', '#0f172a');
      root.style.setProperty('--sidebar-text', '#f1f5f9');
      root.style.setProperty('--sidebar-text-muted', '#94a3b8');
      root.style.setProperty('--sidebar-active-bg', primary);
      root.style.setProperty('--sidebar-active-text', '#ffffff');
      root.style.setProperty('--sidebar-border', '#1e293b');
    } else if (sidebarTheme === 'custom' && b.sidebarBg) {
      root.style.setProperty('--sidebar-bg', b.sidebarBg);
      root.style.setProperty('--sidebar-text', b.sidebarText || '#ffffff');
      root.style.setProperty('--sidebar-text-muted', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--sidebar-active-bg', 'rgba(255, 255, 255, 0.18)');
      root.style.setProperty('--sidebar-active-text', '#ffffff');
      root.style.setProperty('--sidebar-border', 'rgba(255, 255, 255, 0.15)');
    } else {
      // clean_light default
      root.style.setProperty('--sidebar-bg', '#ffffff');
      root.style.setProperty('--sidebar-text', '#334155');
      root.style.setProperty('--sidebar-text-muted', '#64748b');
      root.style.setProperty('--sidebar-active-bg', `color-mix(in srgb, ${primary} 12%, white)`);
      root.style.setProperty('--sidebar-active-text', primary);
      root.style.setProperty('--sidebar-border', '#e2e8f0');
    }
  }, [currentSchool]);

  // Determine current user's role in this school accurately
  const currentRole = useMemo<UserRole | null>(() => {
    // 1. Explicit per-school role from token claims
    if (currentSchoolId && claims?.schoolRoles?.[currentSchoolId]) {
      return claims.schoolRoles[currentSchoolId] as UserRole;
    }
    // 2. Organization role from token claims
    if (claims?.orgRole) {
      return claims.orgRole as UserRole;
    }
    // 3. User profile role from Firestore (users/{uid}.role or memberships)
    if (userProfileRole) {
      return userProfileRole as UserRole;
    }
    // 4. If current user is the actual creator/owner of this organization
    if (organization?.ownerId && currentUser?.uid && organization.ownerId === currentUser.uid) {
      return 'orgOwner';
    }
    // 5. Default for educators/members: 'teacher' (Never default unprivileged users to orgOwner!)
    return 'teacher';
  }, [claims, currentSchoolId, userProfileRole, organization?.ownerId, currentUser?.uid]);

  // Compute permissions for current role
  const userPermissions = useMemo<Permission[]>(() => {
    if (!currentRole) return [];
    if (
      currentRole === 'orgOwner' ||
      currentRole === 'platformAdmin' ||
      (currentRole as string) === 'schoolAdmin' ||
      (currentRole as string) === 'admin'
    ) {
      return Object.values(DEFAULT_ROLE_PERMISSIONS).flat();
    }
    return (DEFAULT_ROLE_PERMISSIONS as Record<string, Permission[]>)[currentRole] || [];
  }, [currentRole]);

  const hasPermission = (permission: Permission): boolean => {
    if (!currentRole) return false;
    if (
      currentRole === 'orgOwner' ||
      currentRole === 'platformAdmin' ||
      (currentRole as string) === 'schoolAdmin' ||
      (currentRole as string) === 'admin' ||
      claims?.platformAdmin
    ) {
      return true;
    }
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
