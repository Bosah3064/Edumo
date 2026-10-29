export type SchoolIdRole = 'student' | 'teacher' | 'staff' | 'parent' | 'admin';

const ROLE_PREFIX: Record<SchoolIdRole, string> = {
  student: 'S', teacher: 'T', staff: 'W', parent: 'P', admin: 'A',
};

export const getSchoolIdPrefix = (role: SchoolIdRole, year = new Date().getFullYear()) =>
  `${String(year).slice(-2)}/${ROLE_PREFIX[role]}`;

export const formatSchoolId = (role: SchoolIdRole, sequence: number, year = new Date().getFullYear()) =>
  `${getSchoolIdPrefix(role, year)}${String(sequence).padStart(4, '0')}`;

export const getNextSchoolId = (
  records: Array<{ schoolId?: string }>, role: SchoolIdRole, year = new Date().getFullYear()
) => {
  const prefix = getSchoolIdPrefix(role, year);
  let highest = 0;
  for (const record of records) {
    const match = record.schoolId?.match(new RegExp(`^${prefix}(\\d{4,})$`));
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return formatSchoolId(role, highest + 1, year);
};

export const getSchoolEmail = (schoolId: string, domain: string) => {
  const local = schoolId.replace(/[^0-9A-Za-z]/g, '').toLowerCase();
  const safeDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return local && safeDomain ? `${local}@${safeDomain}` : '';
};
