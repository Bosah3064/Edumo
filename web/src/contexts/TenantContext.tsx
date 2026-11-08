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
import { purgeMockSchoolData } from '../utils/databaseInitializer';

export interface ActiveStudentProfile {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  currentClassId: string;
  currentStreamId?: string;
  gender?: string;
  boardingStatus?: 'day' | 'boarding';
  schoolEmail?: string;
  studentEmail?: string;
  userId?: string;
  guardianPhone?: string;
}

interface TenantContextType {
  organization: Organization | null;
  schools: School[];
  currentSchool: School | null;
  currentRole: UserRole | null;
  isStudent: boolean;
  isGuardian: boolean;
  isTeacher: boolean;
  isBursar: boolean;
  isAdmin: boolean;
  studentProfile: ActiveStudentProfile | null;
  userPermissions: Permission[];
  loading: boolean;
  switchSchool: (schoolId: string) => void;
  hasPermission: (permission: Permission) => boolean;
  setRoleOverride: (role: string | null) => void;
  previewRole: string | null;
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
          setOrganization(null);
        }
      },
      (error) => {
        console.error('Error listening to organization:', error);
        setOrganization(null);
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

        setSchools(fetchedSchools);

        if (fetchedSchools.length > 0) {
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
            return fetchedSchools[0]?.id || null;
          });
        } else {
          setCurrentSchoolId(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error listening to schools:', error);
        setSchools([]);
        setCurrentSchoolId(null);
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

  // One-time automatic background purge of legacy mock / demonstration records for active school
  useEffect(() => {
    if (!activeOrgId || !currentSchool?.id) return;
    const sessionKey = `edumo_mock_purged_${activeOrgId}_${currentSchool.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) return;

    purgeMockSchoolData(db, activeOrgId, currentSchool.id)
      .then(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, 'true');
        }
      })
      .catch((err) => {
        console.warn('Background school data cleanup skipped:', err);
      });
  }, [activeOrgId, currentSchool?.id]);

  const [previewRole, setPreviewRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    localStorage.removeItem('edumo_preview_role');
    return null;
  });

  const setRoleOverride = (_role: string | null) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('edumo_preview_role');
    }
    setPreviewRole(null);
  };

  const [databaseStaffRole, setDatabaseStaffRole] = useState<UserRole | null>(null);

  // Listen to staff roster to resolve user's real database role in this school
  useEffect(() => {
    if (!activeOrgId || !currentSchoolId || !currentUser) {
      setDatabaseStaffRole(null);
      return;
    }
    const staffRef = collection(db, 'organizations', activeOrgId, 'schools', currentSchoolId, 'staff');
    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        const email = (currentUser.email || '').toLowerCase().trim();
        const uid = currentUser.uid;
        const matchedStaff = snap.docs.find((d) => {
          const data = d.data();
          if (data.userId && data.userId === uid) return true;
          if (email && data.schoolEmail && data.schoolEmail.toLowerCase().trim() === email) return true;
          if (email && data.email && data.email.toLowerCase().trim() === email) return true;
          return false;
        });
        if (matchedStaff) {
          const d = matchedStaff.data();
          const roleFound = (d.role || d.roles?.[0] || 'teacher') as UserRole;
          setDatabaseStaffRole(roleFound);
        } else {
          setDatabaseStaffRole(null);
        }
      },
      () => setDatabaseStaffRole(null)
    );

    return () => unsubStaff();
  }, [activeOrgId, currentSchoolId, currentUser]);

  const [studentProfile, setStudentProfile] = useState<ActiveStudentProfile | null>(null);

  // Listen to student profile in active school from Firestore
  useEffect(() => {
    if (!activeOrgId || !currentSchoolId || !currentUser) {
      setStudentProfile(null);
      return;
    }

    const studentsRef = collection(db, 'organizations', activeOrgId, 'schools', currentSchoolId, 'students');
    const unsub = onSnapshot(
      studentsRef,
      (snapshot) => {
        const list: Array<{ id: string; [key: string]: any }> = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const userUid = currentUser.uid;
        const claimAdmission = (((claims as any)?.admissionNumber || (claims as any)?.studentId || '') as string).toLowerCase().trim();

        // 1. Match by UID
        let matched = list.find((s) => userUid && s.userId === userUid);

        // 2. Match by schoolEmail or studentEmail
        if (!matched && userEmail) {
          matched = list.find((s) => {
            const se = (s.schoolEmail || s.studentEmail || '').toLowerCase().trim();
            return se === userEmail;
          });
        }

        // 3. Match by admission number
        if (!matched && (claimAdmission || userEmail)) {
          matched = list.find((s) => {
            const adm = (s.admissionNumber || '').toLowerCase().trim();
            if (claimAdmission && adm === claimAdmission) return true;
            if (userEmail && adm) {
              const cleanAdm = adm.replace(/[^a-z0-9]/g, '');
              const cleanUser = userEmail.split('@')[0].replace(/[^a-z0-9]/g, '');
              if (cleanAdm && cleanUser && (cleanUser.includes(cleanAdm) || cleanAdm.includes(cleanUser))) {
                return true;
              }
            }
            return false;
          });
        }

        if (matched) {
          const fn = matched.firstName || 'Learner';
          const ln = matched.lastName || '';
          setStudentProfile({
            id: matched.id,
            admissionNumber: matched.admissionNumber || '',
            firstName: fn,
            lastName: ln,
            fullName: `${fn} ${ln}`.trim(),
            currentClassId: matched.currentClassId || '',
            currentStreamId: matched.currentStreamId || '',
            gender: matched.gender || 'unspecified',
            boardingStatus: matched.boardingStatus || 'day',
            schoolEmail: matched.schoolEmail || matched.studentEmail || currentUser.email || '',
            studentEmail: matched.studentEmail,
            userId: matched.userId,
            guardianPhone: matched.guardianPhone,
          });
        } else {
          setStudentProfile(null);
        }
      },
      (err) => {
        console.warn('Error listening to student profile:', err);
        setStudentProfile(null);
      }
    );

    return () => unsub();
  }, [activeOrgId, currentSchoolId, currentUser, claims]);

  // Determine current user's role in this school accurately from authenticated claims and profile
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
    // 5. Real staff role from database in this school
    if (databaseStaffRole) {
      return databaseStaffRole;
    }
    // 6. Real student matched in database
    if (studentProfile) {
      return 'student';
    }
    // 7. Default for educators/members: 'teacher'
    return 'teacher';
  }, [claims, currentSchoolId, userProfileRole, organization?.ownerId, currentUser?.uid, databaseStaffRole, studentProfile]);

  const isStudent = useMemo(() => {
    return currentRole === 'student' || (currentRole as string) === 'learner';
  }, [currentRole]);

  const isGuardian = useMemo(() => {
    return currentRole === 'guardian' || (currentRole as string) === 'parent' || Boolean(claims?.isGuardian);
  }, [currentRole, claims?.isGuardian]);

  const isTeacher = useMemo(() => {
    return currentRole === 'teacher' || (currentRole as string) === 'educator';
  }, [currentRole]);

  const isBursar = useMemo(() => {
    return currentRole === 'bursar' || (currentRole as string) === 'accountant' || (currentRole as string) === 'finance_officer';
  }, [currentRole]);

  const isAdmin = useMemo(() => {
    const r = (currentRole as string) || '';
    return (
      r === 'principal' ||
      r === 'deputy' ||
      r === 'admin' ||
      r === 'orgOwner' ||
      r === 'platformAdmin' ||
      r === 'schoolAdmin' ||
      r === 'it_admin'
    );
  }, [currentRole]);

  // Compute permissions for current role
  const userPermissions = useMemo<Permission[]>(() => {
    if (!currentRole) return [];
    const r = currentRole as string;
    if (
      r === 'orgOwner' ||
      r === 'platformAdmin' ||
      r === 'schoolAdmin' ||
      r === 'admin' ||
      r === 'it_admin'
    ) {
      return Object.values(DEFAULT_ROLE_PERMISSIONS).flat();
    }
    if (r === 'exam_officer' || r === 'exams') {
      return [
        'academics.read',
        'academics.write',
        'academics.publish',
        'academics.reports',
        'students.read',
        'attendance.read',
        'reports.generate',
        'reports.custom',
        'comms.send',
      ];
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
        isStudent,
        isGuardian,
        isTeacher,
        isBursar,
        isAdmin,
        studentProfile,
        userPermissions,
        loading,
        switchSchool,
        hasPermission,
        setRoleOverride,
        previewRole,
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
