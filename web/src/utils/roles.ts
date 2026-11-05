// ============================================================
// EDUMO — Ready Role-Based Access Control (RBAC) System
// Pre-configured role templates with automatic capabilities & permissions
// Supports multi-role staff assignments (e.g. Teacher + Exam Department)
// ============================================================

export interface RoleDefinition {
  id: string;
  name: string;
  shortLabel: string;
  category: 'admin' | 'faculty' | 'finance' | 'student' | 'parent';
  badgeColor: 'brand' | 'accent' | 'warning' | 'danger' | 'neutral';
  description: string;
  requiresClassAssignment?: boolean;
  requiresSubjectAssignment?: boolean;
  capabilities: string[];
  permissions: string[];
}

export const READY_ROLES: Record<string, RoleDefinition> = {
  admin: {
    id: 'admin',
    name: 'School Administrator / Head of School',
    shortLabel: 'Super Admin',
    category: 'admin',
    badgeColor: 'danger',
    description: 'Holds all roles, permissions, and administrative controls across all modules in this campus.',
    capabilities: [
      'Full administrative access across all modules',
      'Manage school settings, branding, and academic calendar',
      'Manage staff onboarding, roles, and class assignments',
      'Oversee student admissions and master roster',
      'Execute batch end-of-year class promotions',
      'Approve and publish examination series and broadsheets',
      'Fee structure configuration and financial audit access',
      'Security audit trail inspection and data exports',
    ],
    permissions: [
      'org:manage',
      'school:manage',
      'students:read',
      'students:write',
      'staff:read',
      'staff:write',
      'marks:read',
      'marks:write',
      'marks:lock',
      'attendance:read',
      'attendance:write',
      'finance:read',
      'finance:write',
      'reports:read',
      'reports:generate',
      'settings:write',
    ],
  },
  exam_officer: {
    id: 'exam_officer',
    name: 'Examination Department / Exam Officer',
    shortLabel: 'Exams Dept',
    category: 'faculty',
    badgeColor: 'brand',
    description: 'Coordinates examination series, mark entry deadlines, locked grade sheets, broadsheets, and exam passes.',
    capabilities: [
      'Create and schedule examination series (Opener, Mid-Term, End-Term)',
      'Set mark entry deadlines and lock/unlock teacher grade sheets',
      'Generate, verify, and publish termly examination broadsheets',
      'Audit marks for score anomalies, grade distributions, and missing entries',
      'Generate and bulk print candidate examination admit cards',
      'Coordinate terminal report card generation and release batches',
      'Enforce institutional grading scale and CBC rubric thresholds',
    ],
    permissions: [
      'students:read',
      'marks:read',
      'marks:write',
      'marks:lock',
      'reports:read',
      'reports:generate',
    ],
  },
  class_teacher: {
    id: 'class_teacher',
    name: 'Class Teacher / Homeroom Educator',
    shortLabel: 'Class Teacher',
    category: 'faculty',
    badgeColor: 'accent',
    description: 'Assigned to a specific class/stream to manage daily roll calls, marks, report card remarks, and promotion recommendations.',
    requiresClassAssignment: true,
    capabilities: [
      'Daily morning & afternoon attendance roll call for assigned class',
      'Enter formative and summative marks for learners in assigned class',
      'Author official Class Teacher remarks on termly report forms',
      'End-of-Year student progression recommendation (Promote / Repeat)',
      'Generate and print official report cards for assigned class',
      'Issue examination admit cards for class learners',
      'Communicate with guardians and parents of class learners',
      'Create and track class assignments and homework',
    ],
    permissions: [
      'students:read',
      'attendance:read',
      'attendance:write',
      'marks:read',
      'marks:write',
      'reports:read',
      'reports:generate',
    ],
  },
  teacher: {
    id: 'teacher',
    name: 'Subject Teacher / Course Instructor',
    shortLabel: 'Teacher',
    category: 'faculty',
    badgeColor: 'brand',
    description: 'Teaches specific learning areas across multiple classes and streams.',
    requiresSubjectAssignment: true,
    capabilities: [
      'Enter marks and competency ratings for assigned learning areas',
      'View student roster enrolled in assigned subjects',
      'Create, distribute, and grade assignments and learning tasks',
      'Track subject-level learner competency mastery trajectory',
      'Record classroom observations and formative notes',
    ],
    permissions: [
      'students:read',
      'marks:read',
      'marks:write',
      'reports:read',
    ],
  },
  deputy: {
    id: 'deputy',
    name: 'Dean of Studies / Academic Deputy',
    shortLabel: 'Dean of Studies',
    category: 'admin',
    badgeColor: 'brand',
    description: 'Coordinates exams, master timetable, grading scales, and academic performance standards.',
    capabilities: [
      'Configure exam series and weighted assessment formulas',
      'Oversee school-wide master timetable and stream schedules',
      'Review and approve subject grade entries across all classes',
      'Generate termly academic broadsheets and merit lists',
      'Validate End-of-Year promotion rosters before final commit',
      'Monitor teacher grading completion rates',
    ],
    permissions: [
      'students:read',
      'marks:read',
      'marks:write',
      'marks:lock',
      'attendance:read',
      'reports:read',
      'reports:generate',
    ],
  },
  bursar: {
    id: 'bursar',
    name: 'Bursar / Finance Officer',
    shortLabel: 'Bursar',
    category: 'finance',
    badgeColor: 'warning',
    description: 'Administers student fee billing, M-Pesa receipts reconciliation, and financial records.',
    capabilities: [
      'Configure termly fee structures and mandatory voteheads',
      'Generate learner invoices and fee demand notes',
      'Process cash, bank deposit, and M-Pesa automated receipts',
      'View real-time fee collection balances and arrears',
      'Export financial ledgers and collection reports (.xlsx)',
    ],
    permissions: [
      'students:read',
      'finance:read',
      'finance:write',
      'reports:read',
    ],
  },
  student: {
    id: 'student',
    name: 'Student / Learner',
    shortLabel: 'Student',
    category: 'student',
    badgeColor: 'neutral',
    description: 'Accesses learner portal to view enrolled subjects, attendance, assignments, and report cards.',
    capabilities: [
      'View enrolled Core & Elective curriculum learning areas',
      'View personal attendance roll call history',
      'Download termly report forms and academic transcripts',
      'Download assignments, homework sheets, and study materials',
      'View and print personal examination admit card pass',
      'Check academic growth trajectory and competency mastery',
    ],
    permissions: [
      'reports:read',
    ],
  },
  parent: {
    id: 'parent',
    name: 'Parent / Legal Guardian',
    shortLabel: 'Parent',
    category: 'parent',
    badgeColor: 'accent',
    description: 'Accesses parent portal to track student academic growth, daily attendance, fee balances, M-Pesa receipts, and download official report forms.',
    capabilities: [
      'Real-time daily attendance roll call alerts (Present, Absent, Late)',
      'View formative and summative assessment marks and CBC competency progress',
      'Download official termly report cards and transcripts with principal seal',
      'View fee billing statements, outstanding balances, and payment history',
      'Make instant M-Pesa fee payments and download automated receipts',
      'Download student examination passes and admit cards',
      'Direct messaging and consultation with assigned class teacher',
      'View homework assignments, school events, and term dates calendar',
    ],
    permissions: [
      'reports:read',
      'attendance:read',
      'finance:read',
    ],
  },
};

/**
 * Combines capabilities and permissions across multiple assigned roles
 */
export function computeCombinedCapabilities(roleIds: string[]): {
  capabilities: string[];
  permissions: string[];
  primaryRoleTitle: string;
} {
  const capSet = new Set<string>();
  const permSet = new Set<string>();
  const titles: string[] = [];

  for (const rId of roleIds) {
    const def = READY_ROLES[rId];
    if (def) {
      def.capabilities.forEach((c) => capSet.add(c));
      def.permissions.forEach((p) => permSet.add(p));
      titles.push(def.shortLabel);
    }
  }

  return {
    capabilities: Array.from(capSet),
    permissions: Array.from(permSet),
    primaryRoleTitle: titles.join(' & ') || 'Faculty Member',
  };
}
