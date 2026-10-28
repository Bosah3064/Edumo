// ============================================================
// EDUMO SHARED TYPES — Organization & School Models
// ============================================================
import type {
  CountryCode,
  Branding,
  DocMeta,
  SoftDeletable,
  OrgType,
  SchoolType,
  CurriculumType,
  GradingMode,
  LanguageCode,
  Address,
  ContactInfo,
  ISOTimestamp,
} from './common';

/** Organization (tenant root) */
export interface Organization extends DocMeta, SoftDeletable {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  country: CountryCode;
  countryPackId: string;
  branding: Branding;
  plan: 'trial' | 'starter' | 'growth' | 'enterprise';
  planExpiresAt: ISOTimestamp;
  maxStudents: number;
  maxBranches: number;
  verified: boolean;
  status: 'pending' | 'active' | 'suspended' | 'deactivated';
  settings: OrgSettings;
  ownerId: string;
}

export interface OrgSettings {
  defaultLanguage: LanguageCode;
  timezone: string;
  dateFormat: string;
  smsCredits: number;
  features: Record<string, boolean>;
}

/** School / Branch */
export interface School extends DocMeta {
  id: string;
  name: string;
  code: string;
  type: SchoolType;
  country: CountryCode;
  countryPackId?: string; // Overrides org-level
  address: Address;
  contacts: ContactInfo;
  branding?: Branding;
  curriculumType: CurriculumType;
  gradingMode: GradingMode;
  gradingConfig?: Record<string, unknown>;
  settings: Record<string, unknown>;
  academicCalendar?: AcademicCalendarConfig;
  status: 'active' | 'suspended' | 'merged';
  mergedInto?: string;
}

export interface AcademicCalendarConfig {
  termsPerYear: number;
  currentAcademicYearId?: string;
  currentTermId?: string;
}

/** Academic Year */
export interface AcademicYear {
  id?: string;
  label: string;
  startDate: ISOTimestamp;
  endDate: ISOTimestamp;
  isCurrent: boolean;
  status: 'planning' | 'active' | 'closed';
}

/** Term within an academic year */
export interface Term {
  id?: string;
  name: string;
  number: number;
  startDate: ISOTimestamp;
  endDate: ISOTimestamp;
  isCurrent: boolean;
  status: 'planning' | 'active' | 'closed';
}
