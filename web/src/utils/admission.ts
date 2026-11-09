import type { School } from '@edumo/shared';

export const getCurrentAdmissionYear = (date = new Date()): number => date.getFullYear();

export const formatAdmissionNumber = (year: number, sequence: number): string =>
  `${String(year).slice(-2)}/${String(sequence).padStart(4, '0')}`;

export const getCleanAdmissionNumber = (admissionNumber: string): string =>
  admissionNumber.replace(/[^0-9A-Za-z]/g, '').toLowerCase();

export const getNextAdmissionNumber = (
  students: Array<{ admissionNumber?: string }>,
  year = getCurrentAdmissionYear()
): string => {
  const yearPrefix = String(year).slice(-2);
  let highest = 0;

  for (const student of students) {
    const match = student.admissionNumber?.match(/^(\d{2})\/(\d{4,})$/);
    if (match && match[1] === yearPrefix) {
      highest = Math.max(highest, Number(match[2]));
    }
  }

  return formatAdmissionNumber(year, highest + 1);
};

export const sanitizeSchoolEmailDomain = (domain: string): string => {
  let value = (domain || '').trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').replace(/@.*$/, '').trim();
  return value;
};

export const deriveSchoolDomainFromName = (schoolName: string): string => {
  if (!schoolName) return 'edumo.school';
  const clean = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let slug = '';
  if (clean.length > 1) {
    if (clean[0].length <= 5) {
      slug = clean.slice(0, 2).join('');
    } else {
      slug = clean.map((w) => w[0]).join('');
    }
  } else if (clean.length === 1) {
    slug = clean[0];
  }
  slug = slug.replace(/[^a-z0-9]/g, '').slice(0, 15);
  return `${slug || 'campus'}.edumo.school`;
};

export const getSchoolEmailDomain = (school: School | null): string => {
  if (!school) return 'edumo.school';

  const settings = school.settings as Record<string, unknown> | undefined;
  const configured = settings?.emailDomain ?? settings?.schoolDomain;
  if (typeof configured === 'string' && configured.trim()) {
    return sanitizeSchoolEmailDomain(configured);
  }

  if (school.contacts?.website) {
    const websiteDomain = sanitizeSchoolEmailDomain(school.contacts.website);
    if (websiteDomain.includes('.')) return websiteDomain;
  }

  return deriveSchoolDomainFromName(school.name || '');
};

/**
 * Returns student institutional email in the format: 2205688@students.kcau.ac
 * where admission is 22/05688 and domain is kcau.ac
 */
export const getSchoolEmailForAdmission = (admissionNumber: string, baseDomain: string): string => {
  const localPart = getCleanAdmissionNumber(admissionNumber);
  const safeBase = sanitizeSchoolEmailDomain(baseDomain);
  if (!localPart || !safeBase) return '';
  const studentDomain = safeBase.startsWith('students.') ? safeBase : `students.${safeBase}`;
  return `${localPart}@${studentDomain}`;
};

/**
 * Returns teacher institutional email in the format: username@teacher.kcau.ac.ke
 */
export const getTeacherEmailForSchool = (usernameOrId: string, baseDomain: string): string => {
  const localPart = (usernameOrId || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const safeBase = sanitizeSchoolEmailDomain(baseDomain);
  if (!localPart || !safeBase) return '';
  const teacherDomain = safeBase.startsWith('teacher.') || safeBase.startsWith('teachers.')
    ? safeBase
    : `teacher.${safeBase}`;
  return `${localPart}@${teacherDomain}`;
};

/**
 * Returns staff institutional email in the format: username@staff.kcau.ac.ke
 */
export const getStaffEmailForSchool = (usernameOrId: string, baseDomain: string): string => {
  const localPart = (usernameOrId || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const safeBase = sanitizeSchoolEmailDomain(baseDomain);
  if (!localPart || !safeBase) return '';
  const staffDomain = safeBase.startsWith('staff.') ? safeBase : `staff.${safeBase}`;
  return `${localPart}@${staffDomain}`;
};

/**
 * Generates initial secure default password for student based on admission number:
 * e.g., admission 22/05688 -> Edumo@2205688
 */
export const generateDefaultStudentPassword = (admissionNumber: string): string => {
  const clean = admissionNumber.replace(/[^0-9A-Za-z]/g, '');
  return `Edumo@${clean}`;
};
