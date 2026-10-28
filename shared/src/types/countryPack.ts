// ============================================================
// EDUMO SHARED TYPES — Country Pack Schema
// ============================================================

export interface CountryPack {
  code: string;
  name: string;
  _verifyWithOfficialSource: boolean;

  languages: {
    available: string[];
    default: string;
  };

  currency: CurrencyConfig;
  locale: LocaleConfig;
  curriculum: CurriculumConfig;
  gradingScales: GradingScale[];
  academicCalendar: AcademicCalendarDefaults;
  reportFormats: ReportFormat[];
  paymentProviders: PaymentProviderConfig[];
  dataProtection: DataProtectionConfig;
  governmentExports: GovernmentExportFormat[];
  updatedAt?: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  minorUnits: number;
}

export interface LocaleConfig {
  timezone: string;
  dateFormat: string;
  firstDayOfWeek: number;
}

export interface CurriculumConfig {
  name: string;
  levels: CurriculumLevel[];
  learningAreas?: LearningArea[];
}

export interface CurriculumLevel {
  code: string;
  name: string;
  category: string;
  order: number;
  ageRange?: string;
}

export interface LearningArea {
  code: string;
  name: string;
  category: string;
  levels: string[];
  strands?: CurriculumStrand[];
}

export interface CurriculumStrand {
  code: string;
  name: string;
  subStrands?: CurriculumSubStrand[];
}

export interface CurriculumSubStrand {
  code: string;
  name: string;
  maxScore?: number;
}

export interface GradingScale {
  id: string;
  name: string;
  type: 'level' | 'points' | 'percentage' | 'letter' | 'division' | 'custom';
  /** asc = higher score is better (e.g. percentage), desc = lower is better (e.g. UNEB points) */
  direction: 'asc' | 'desc';
  /** How to aggregate across subjects */
  aggregateMode: 'none' | 'total' | 'mean' | 'best_n' | 'points';
  /** Number of subjects to use for best_n aggregate */
  aggregateN?: number;
  allowRanking: boolean;
  bands: GradingBand[];
  applicableLevels?: string[];
  /** Division boundaries for NECTA-style systems */
  divisionBoundaries?: Record<string, { min: number; max: number | null }>;
  /** Pass threshold override */
  passThreshold?: number;
  passThresholdEditable?: boolean;
  _note?: string;
}

export interface GradingBand {
  code: string;
  name: string;
  minScore: number;
  maxScore: number;
  points?: number;
  colorHex?: string;
  isPassing: boolean;
  order: number;
}

export interface AcademicCalendarDefaults {
  termsPerYear: number;
  typicalTerms: TermTemplate[];
  holidays?: HolidayTemplate[];
  _note?: string;
}

export interface TermTemplate {
  number: number;
  name: string;
  startMonth: number;
  startWeek: number;
  durationWeeks: number;
}

export interface HolidayTemplate {
  name: string;
  month: number;
  day: number;
}

export interface ReportFormat {
  id: string;
  name: string;
  type: string;
  gradingScaleId: string;
  showAggregate: boolean;
  showRanking: boolean;
  showSubjectComments: boolean;
  showStrandDetails: boolean;
  showBehaviour: boolean;
  showAttendance: boolean;
  showActivities: boolean;
  layout: string;
}

export interface PaymentProviderConfig {
  id: string;
  name: string;
  type: string;
  country: string;
  apiEndpoint?: string;
  requiredCredentials: string[];
  callbackPath: string;
  supportedCurrencies: string[];
  _note?: string;
}

export interface DataProtectionConfig {
  consentRequired: boolean;
  retentionYears: number;
  exportFormat: string;
  regulatoryBody: string;
  notes: string;
}

export interface GovernmentExportFormat {
  id: string;
  name: string;
  description: string;
  fileType: string;
  columns: ExportColumn[];
  notes: string;
}

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  required?: boolean;
}
