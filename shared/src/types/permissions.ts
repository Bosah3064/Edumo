// ============================================================
// EDUMO SHARED TYPES — Roles & Permissions
// ============================================================

/** Organization-level roles */
export type OrgRole = 'orgOwner';

/** School-level roles */
export type SchoolRole =
  | 'principal'
  | 'deputy'
  | 'admin'
  | 'bursar'
  | 'teacher'
  | 'support'
  | 'student'
  | 'guardian';

/** All roles */
export type UserRole = OrgRole | SchoolRole | 'platformAdmin';

/** Custom claims set on Firebase Auth tokens */
export interface EdumoCustomClaims {
  /** Platform admin flag */
  platformAdmin?: boolean;
  /** Primary organization ID */
  orgId?: string;
  /** Role at the organization level */
  orgRole?: OrgRole;
  /** School IDs this user can access */
  schoolIds?: string[];
  /** Per-school role mapping */
  schoolRoles?: Record<string, SchoolRole>;
  /** Fine-grained permission codes */
  permissions?: string[];
  /** Guardian flag */
  isGuardian?: boolean;
  /** Permissions version — incremented on role change to bust token cache */
  pv?: number;
}

export type UserClaims = EdumoCustomClaims;

/** User membership entry (stored in /users/{uid}) */
export interface Membership {
  orgId: string;
  orgName: string;
  schoolIds: string[];
  role: UserRole;
  joinedAt: string;
}

/**
 * Permission code definitions.
 * Each code is a dot-separated string: domain.action
 */
export const PERMISSIONS = {
  // Students
  'students.read': 'View student profiles',
  'students.write': 'Create/edit students',
  'students.delete': 'Deactivate students',
  'students.import': 'Import students',
  'students.export': 'Export student data',
  'students.medical.read': 'View medical records',
  'students.medical.write': 'Edit medical records',

  // Attendance
  'attendance.read': 'View attendance',
  'attendance.write': 'Mark attendance',
  'attendance.reports': 'View attendance reports',

  // Academics
  'academics.read': 'View grades/assessments',
  'academics.write': 'Enter/edit marks',
  'academics.publish': 'Publish results',
  'academics.reports': 'View academic reports',

  // Fees
  'fees.read': 'View fee records',
  'fees.write': 'Create invoices/record payments',
  'fees.refund': 'Process refunds',
  'fees.reports': 'View financial reports',

  // Staff/HR
  'staff.read': 'View staff records',
  'staff.write': 'Manage staff',
  'staff.payroll': 'Access payroll',

  // Communication
  'comms.send': 'Send announcements/messages',
  'comms.sms': 'Send SMS (uses credits)',
  'comms.broadcast': 'Emergency broadcasts',

  // Settings
  'settings.read': 'View school settings',
  'settings.write': 'Modify settings',
  'settings.roles': 'Manage roles/permissions',

  // Reports
  'reports.generate': 'Generate reports',
  'reports.custom': 'Custom report builder',

  // Audit
  'audit.read': 'View audit logs',

  // Operations
  'transport.manage': 'Manage transport',
  'library.manage': 'Manage library',
  'behaviour.read': 'View behaviour records',
  'behaviour.write': 'Record behaviour',
  'welfare.read': 'View counselling/safeguarding (RESTRICTED)',
  'welfare.write': 'Create welfare records (RESTRICTED)',
  'health.read': 'View health records',
  'health.write': 'Record health visits',

  // Admissions
  'admissions.read': 'View applications',
  'admissions.write': 'Process admissions',

  // Platform
  'platform.admin': 'Platform administration',
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;
export type Permission = PermissionCode;

/** Default permissions per school role */
export const DEFAULT_ROLE_PERMISSIONS: Record<SchoolRole, PermissionCode[]> = {
  principal: Object.keys(PERMISSIONS) as PermissionCode[],
  deputy: (Object.keys(PERMISSIONS) as PermissionCode[]).filter(
    (p) => p !== 'settings.roles' && p !== 'platform.admin'
  ),
  admin: [
    'students.read', 'students.write', 'students.delete',
    'students.import', 'students.export',
    'staff.read',
    'attendance.read', 'attendance.write', 'attendance.reports',
    'comms.send',
    'reports.generate',
    'admissions.read', 'admissions.write',
    'settings.read',
  ],
  bursar: [
    'fees.read', 'fees.write', 'fees.reports',
    'students.read',
    'reports.generate',
    'staff.payroll',
  ],
  teacher: [
    'students.read',
    'attendance.read', 'attendance.write',
    'academics.read', 'academics.write',
    'comms.send',
    'behaviour.read', 'behaviour.write',
  ],
  support: [
    'students.read',
    'attendance.read',
  ],
  student: [],
  guardian: [],
};
