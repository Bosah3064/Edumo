import type { School } from '@edumo/shared';

export const getCurrentAdmissionYear = (date = new Date()): number => date.getFullYear();

export const formatAdmissionNumber = (year: number, sequence: number): string =>
  `${String(year).slice(-2)}/${String(sequence).padStart(4, '0')}`;

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
  let value = domain.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').replace(/@.*$/, '').trim();
  return value;
};

export const getSchoolEmailDomain = (school: School | null): string => {
  if (!school) return '';

  const settings = school.settings as Record<string, unknown> | undefined;
  const configured = settings?.emailDomain ?? settings?.schoolDomain;
  if (typeof configured === 'string' && configured.trim()) {
    return sanitizeSchoolEmailDomain(configured);
  }

  if (school.contacts?.website) {
    const websiteDomain = sanitizeSchoolEmailDomain(school.contacts.website);
    if (websiteDomain.includes('.')) return websiteDomain;
  }

  return '';
};

export const getSchoolEmailForAdmission = (admissionNumber: string, domain: string): string => {
  const localPart = admissionNumber.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
  const safeDomain = sanitizeSchoolEmailDomain(domain);
  return localPart && safeDomain ? `${localPart}@${safeDomain}` : '';
};
