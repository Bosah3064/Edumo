// ============================================================
// EDUMO — Zod Schemas for Callable Function Validation
// ============================================================
import { z } from 'zod';

// ===== Common validators =====

const phoneRegex = /^\+[1-9]\d{7,14}$/;

export const phoneSchema = z
  .string()
  .regex(phoneRegex, 'Phone must be in international format, e.g. +254712345678');

export const emailSchema = z.string().email().max(255);

export const slugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase, alphanumeric with hyphens');

const countryCodeSchema = z.enum(['KE', 'UG', 'TZ', 'RW']);

const schoolTypeSchema = z.enum(['nursery', 'primary', 'secondary', 'combined']);

const gradingModeSchema = z.enum([
  'cbc_no_aggregate',
  'classic_marks_rank',
  'uneb',
  'necta',
  'rwanda',
  'custom',
]);

const curriculumTypeSchema = z.enum([
  'CBC', '8-4-4', 'UNEB', 'NECTA', 'Rwanda', 'custom',
]);

// ===== Organization =====

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(['standalone', 'group']),
  country: countryCodeSchema,
  // First school details
  school: z.object({
    name: z.string().min(2).max(200),
    type: schoolTypeSchema,
    curriculumType: curriculumTypeSchema,
    gradingMode: gradingModeSchema,
    address: z.object({
      line1: z.string().min(1).max(500),
      line2: z.string().max(500).optional(),
      city: z.string().min(1).max(100),
      county: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: countryCodeSchema,
    }),
    phone: phoneSchema,
    email: emailSchema.optional(),
  }),
  // Admin user info (will come from auth token)
  adminDisplayName: z.string().min(2).max(100).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  orgId: z.string().min(1),
  updates: z.object({
    name: z.string().min(2).max(200).optional(),
    branding: z.object({
      logo: z.string().max(500).optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      motto: z.string().max(500).optional(),
    }).optional(),
    settings: z.object({
      defaultLanguage: z.enum(['en', 'sw', 'rw', 'fr']).optional(),
      timezone: z.string().max(50).optional(),
      dateFormat: z.string().max(20).optional(),
    }).optional(),
  }),
});

// ===== School / Branch =====

export const addBranchSchema = z.object({
  orgId: z.string().min(1),
  school: z.object({
    name: z.string().min(2).max(200),
    code: z.string().min(1).max(20),
    type: schoolTypeSchema,
    country: countryCodeSchema,
    curriculumType: curriculumTypeSchema,
    gradingMode: gradingModeSchema,
    address: z.object({
      line1: z.string().min(1).max(500),
      line2: z.string().max(500).optional(),
      city: z.string().min(1).max(100),
      county: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
      country: countryCodeSchema,
    }),
    phone: phoneSchema,
    email: emailSchema.optional(),
  }),
});

export type AddBranchInput = z.infer<typeof addBranchSchema>;

// ===== Invites =====

export const createInviteSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  role: z.enum([
    'principal', 'deputy', 'admin', 'bursar',
    'teacher', 'support', 'guardian',
  ]),
  permissions: z.array(z.string()).max(50).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Either email or phone is required' }
);

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  inviteId: z.string().min(1),
  code: z.string().min(4).max(20),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// ===== Roles =====

export const assignRoleSchema = z.object({
  uid: z.string().min(1),
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  role: z.enum([
    'principal', 'deputy', 'admin', 'bursar',
    'teacher', 'support', 'guardian', 'student',
  ]),
  permissions: z.array(z.string()).max(50).optional(),
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const removeRoleSchema = z.object({
  uid: z.string().min(1),
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
});

// ===== Guardian Links =====

export const linkGuardianSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  guardianUid: z.string().min(1),
  studentId: z.string().min(1),
  relationship: z.string().min(1).max(50),
});

export type LinkGuardianInput = z.infer<typeof linkGuardianSchema>;

export const verifyGuardianLinkSchema = z.object({
  linkId: z.string().min(1),
});

// ===== Students (for CRUD validation) =====

export const createStudentSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  student: z.object({
    admissionNumber: z.string().min(1).max(50),
    firstName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional(),
    lastName: z.string().min(1).max(100),
    dateOfBirth: z.string().min(1),
    gender: z.enum(['male', 'female', 'other']),
    nationality: z.string().max(50).optional(),
    currentClassId: z.string().min(1),
    currentStreamId: z.string().optional(),
    boardingStatus: z.enum(['day', 'boarding']),
    emergencyContacts: z.array(z.object({
      name: z.string().min(1).max(100),
      phone: phoneSchema,
      relationship: z.string().min(1).max(50),
    })).max(5).optional(),
    address: z.object({
      line1: z.string().min(1).max(500),
      city: z.string().min(1).max(100),
      country: countryCodeSchema,
    }).optional(),
  }),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// ===== Staff =====

export const createStaffSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  staff: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: phoneSchema,
    email: emailSchema.optional(),
    role: z.string().min(1).max(50),
    department: z.string().max(100).optional(),
    qualification: z.string().max(200).optional(),
    tscNumber: z.string().max(50).optional(),
    contractType: z.enum(['permanent', 'contract', 'partTime', 'intern']),
  }),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// ===== Attendance =====

export const attendanceEntrySchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']),
  note: z.string().max(200).optional(),
});

export const markAttendanceSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  streamId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['daily', 'lesson']),
  subjectId: z.string().optional(),
  period: z.number().int().min(1).max(20).optional(),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  entries: z.record(z.string(), attendanceEntrySchema),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

// ===== Announcements =====

export const createAnnouncementSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  audience: z.enum(['all', 'class', 'stream', 'individual', 'staff', 'parents']),
  targetClassIds: z.array(z.string()).max(50).optional(),
  targetUserIds: z.array(z.string()).max(200).optional(),
  channels: z.array(z.enum(['push', 'sms', 'whatsapp', 'inApp'])).min(1),
  priority: z.enum(['normal', 'urgent']).default('normal'),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

// ===== Assignments =====

export const createAssignmentSchema = z.object({
  schoolId: z.string().min(1).max(100),
  assignmentId: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200),
  className: z.string().min(1).max(100),
  classId: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).default(''),
  fileUrl: z.string().url().max(1000).optional().or(z.literal('')),
  startsAt: z.string().min(1).max(100).refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid start time'),
  expiresAt: z.string().min(1).max(100).refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid expiry time'),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  resultReleaseMode: z.enum(['immediate', 'afterExpiry', 'manual']).default('immediate'),
  reviewAllowed: z.boolean(),
  questions: z.array(z.object({
    id: z.string().min(1).max(100),
    text: z.string().min(1).max(5000),
    type: z.enum(['objective']).default('objective'),
    options: z.array(z.string().min(1).max(1000)).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    points: z.number().int().min(1).max(1000),
  })).max(200).default([]),
}).refine((data) => new Date(data.expiresAt) > new Date(data.startsAt), {
  message: 'Expiry time must be after start time',
  path: ['expiresAt'],
});

export const submitAssignmentSchema = z.object({
  schoolId: z.string().min(1).max(100),
  assignmentId: z.string().min(1).max(100),
  answers: z.record(z.string().min(1).max(100), z.number().int().min(0).max(3)),
  operationId: z.string().min(8).max(100).optional(),
});

export const releaseAssignmentSchema = z.object({
  schoolId: z.string().min(1).max(100),
  assignmentId: z.string().min(1).max(100),
});

// ===== Import / Export =====

export const requestImportSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  entity: z.enum(['students', 'staff', 'marks', 'fees', 'guardians']),
  filePath: z.string().min(1).max(500),
  fileName: z.string().min(1).max(200),
});

export const confirmImportSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  jobId: z.string().min(1),
});

export const bulkImportSchema = z.object({
  schoolId: z.string().min(1).max(100),
  entityType: z.enum(['students', 'staff']),
  rows: z.array(z.object({
    rowNum: z.number().int().min(2).max(100000),
    name: z.string().max(300).optional(),
    admissionNumber: z.string().max(100).optional(),
    schoolId: z.string().max(100).optional(),
    className: z.string().max(100).optional(),
    guardianPhone: z.string().max(30).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().max(255).optional(),
    gender: z.string().max(30).optional(),
    role: z.string().max(30).optional(),
  })).min(1).max(400),
});

export const rollbackImportSchema = z.object({
  schoolId: z.string().min(1).max(100),
  batchId: z.string().min(1).max(100),
});

export const requestExportSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  reportType: z.string().min(1).max(50),
  parameters: z.record(z.unknown()).optional(),
});

// ===== Classes =====

export const createClassSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  name: z.string().min(1).max(100),
  level: z.string().min(1).max(50),
  section: z.string().max(50).optional(),
  academicYearId: z.string().min(1),
  capacity: z.number().int().min(1).max(500).optional(),
  order: z.number().int().min(0).max(100),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

export const createSubjectSchema = z.object({
  orgId: z.string().min(1),
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  type: z.enum(['core', 'elective', 'optional']),
  category: z.string().max(100).optional(),
  maxMarks: z.number().int().min(1).max(10000).optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
