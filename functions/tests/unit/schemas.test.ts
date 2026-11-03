// ============================================================
// EDUMO — Schema & Validation Unit Tests
// Tests Zod validation schemas for all Phase 0 callables
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  addBranchSchema,
  mergeBranchSchema,
  createInviteSchema,
  assignRoleSchema,
  createStudentSchema,
  updateStudentSchema,
  transferStudentSchema,
  softDeactivateStudentSchema,
  createStaffSchema,
  updateStaffSchema,
  markAttendanceSchema,
} from '../../src/schemas';

describe('Zod Schemas Validation', () => {
  describe('createOrganizationSchema', () => {
    it('validates a valid organization creation payload', () => {
      const payload = {
        name: 'St. Mary High School',
        type: 'standalone',
        country: 'KE',
        school: {
          name: 'Main Campus',
          type: 'secondary',
          curriculumType: 'CBC',
          gradingMode: 'cbc_no_aggregate',
          address: {
            line1: '123 Education Road',
            city: 'Nairobi',
            country: 'KE',
          },
          phone: '+254712345678',
        },
      };
      const result = createOrganizationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid country or phone', () => {
      const payload = {
        name: 'Test',
        type: 'secondary',
        country: 'INVALID_COUNTRY',
        school: {
          name: 'Main',
          type: 'secondary',
          curriculumType: 'cbc',
          gradingMode: 'cbc_no_aggregate',
          address: { line1: 'St', city: 'City', country: 'KE' },
          phone: '12345',
        },
      };
      const result = createOrganizationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('mergeBranchSchema', () => {
    it('validates merge branch input', () => {
      const payload = {
        orgId: 'org-123',
        sourceSchoolId: 'school-old',
        targetSchoolId: 'school-new',
        reason: 'Consolidating secondary campuses',
      };
      const result = mergeBranchSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('createStudentSchema & updateStudentSchema', () => {
    it('validates a valid student payload', () => {
      const payload = {
        orgId: 'org-123',
        schoolId: 'school-456',
        student: {
          admissionNumber: 'ADM-2026-001',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '2010-05-15',
          gender: 'male',
          currentClassId: 'class-g7',
          boardingStatus: 'day',
        },
      };
      const result = createStudentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates student updates', () => {
      const payload = {
        orgId: 'org-123',
        schoolId: 'school-456',
        studentId: 'stud-123',
        updates: {
          firstName: 'Jonathan',
          boardingStatus: 'boarding',
        },
      };
      const result = updateStudentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates student transfer', () => {
      const payload = {
        sourceOrgId: 'org-1',
        sourceSchoolId: 'school-1',
        targetOrgId: 'org-1',
        targetSchoolId: 'school-2',
        studentId: 'stud-1',
        newClassId: 'class-new',
        reason: 'Family relocated to Mombasa campus',
      };
      const result = transferStudentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates soft deactivation', () => {
      const payload = {
        orgId: 'org-1',
        schoolId: 'school-1',
        studentId: 'stud-1',
        reason: 'graduated',
        notes: 'Class of 2026 completion',
      };
      const result = softDeactivateStudentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('createStaffSchema & updateStaffSchema', () => {
    it('validates staff creation', () => {
      const payload = {
        orgId: 'org-1',
        schoolId: 'school-1',
        staff: {
          firstName: 'Grace',
          lastName: 'Muthoni',
          phone: '+254700112233',
          email: 'grace.m@edumo.example',
          role: 'teacher',
          department: 'Sciences',
          contractType: 'permanent',
        },
      };
      const result = createStaffSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('markAttendanceSchema', () => {
    it('validates daily attendance entry', () => {
      const payload = {
        orgId: 'org-1',
        schoolId: 'school-1',
        classId: 'class-1',
        date: '2026-11-03',
        type: 'daily',
        termId: 'term-1',
        academicYearId: 'ay-2026',
        entries: {
          'stud-1': { status: 'present' },
          'stud-2': { status: 'absent', note: 'Medical appointment' },
          'stud-3': { status: 'late' },
        },
      };
      const result = markAttendanceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});

