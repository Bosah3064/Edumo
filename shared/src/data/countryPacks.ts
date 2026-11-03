// ============================================================
// EDUMO SHARED DATA — Country Packs
// Seed data for Kenya, Uganda, Tanzania, Rwanda, and Generic
// ALL DEFAULT VALUES FLAGGED: VERIFY WITH OFFICIAL SOURCE
// ============================================================
import type { CountryPack } from '../types/countryPack';

/**
 * Kenya Country Pack
 * CBC (Competency-Based Curriculum) + Classic 8-4-4 mode
 * NOTICE: VERIFY ALL OFFICIAL GRADING SCALES AND STATUTORY CODES WITH OFFICIAL SOURCE (KNEC/MoE)
 */
export const KENYA_COUNTRY_PACK: CountryPack = {
  code: 'KE',
  name: 'Kenya',
  _verifyWithOfficialSource: true,

  languages: {
    available: ['en', 'sw'],
    default: 'en',
  },

  currency: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    minorUnits: 2,
  },

  locale: {
    timezone: 'Africa/Nairobi',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 1, // Monday
  },

  curriculum: {
    name: 'Competency Based Curriculum (CBC) / 8-4-4',
    levels: [
      { code: 'PP1', name: 'Pre-Primary 1', category: 'Early Years', order: 1, ageRange: '4' },
      { code: 'PP2', name: 'Pre-Primary 2', category: 'Early Years', order: 2, ageRange: '5' },
      { code: 'G1', name: 'Grade 1', category: 'Lower Primary', order: 3, ageRange: '6' },
      { code: 'G2', name: 'Grade 2', category: 'Lower Primary', order: 4, ageRange: '7' },
      { code: 'G3', name: 'Grade 3', category: 'Lower Primary', order: 5, ageRange: '8' },
      { code: 'G4', name: 'Grade 4', category: 'Upper Primary', order: 6, ageRange: '9' },
      { code: 'G5', name: 'Grade 5', category: 'Upper Primary', order: 7, ageRange: '10' },
      { code: 'G6', name: 'Grade 6', category: 'Upper Primary', order: 8, ageRange: '11' },
      { code: 'JSS7', name: 'Junior Secondary Grade 7', category: 'Junior School', order: 9, ageRange: '12' },
      { code: 'JSS8', name: 'Junior Secondary Grade 8', category: 'Junior School', order: 10, ageRange: '13' },
      { code: 'JSS9', name: 'Junior Secondary Grade 9', category: 'Junior School', order: 11, ageRange: '14' },
      { code: 'SSS10', name: 'Senior School Grade 10', category: 'Senior School', order: 12, ageRange: '15' },
      { code: 'SSS11', name: 'Senior School Grade 11', category: 'Senior School', order: 13, ageRange: '16' },
      { code: 'SSS12', name: 'Senior School Grade 12', category: 'Senior School', order: 14, ageRange: '17' },
    ],
  },

  gradingScales: [
    {
      id: 'cbc_no_aggregate',
      name: 'CBC 8-Level Competency (KJSEA No-Aggregate Mode) [VERIFY WITH OFFICIAL SOURCE]',
      type: 'level',
      direction: 'asc', // Higher point (8) is top performance
      aggregateMode: 'none', // Strictly no mean grade, total points, or ranking across subjects
      allowRanking: false,
      _note: 'KJSEA CBC standard: assessments evaluate strand/sub-strand competencies without mean ranks across subjects.',
      bands: [
        { code: 'EE1', name: 'Exceeding Expectations 1', minScore: 90, maxScore: 100, points: 8, isPassing: true, order: 1, colorHex: '#15803d' },
        { code: 'EE2', name: 'Exceeding Expectations 2', minScore: 75, maxScore: 89, points: 7, isPassing: true, order: 2, colorHex: '#16a34a' },
        { code: 'ME1', name: 'Meeting Expectations 1', minScore: 65, maxScore: 74, points: 6, isPassing: true, order: 3, colorHex: '#0284c7' },
        { code: 'ME2', name: 'Meeting Expectations 2', minScore: 50, maxScore: 64, points: 5, isPassing: true, order: 4, colorHex: '#0ea5e9' },
        { code: 'AE1', name: 'Approaching Expectations 1', minScore: 40, maxScore: 49, points: 4, isPassing: true, order: 5, colorHex: '#eab308' },
        { code: 'AE2', name: 'Approaching Expectations 2', minScore: 30, maxScore: 39, points: 3, isPassing: true, order: 6, colorHex: '#ca8a04' },
        { code: 'BE1', name: 'Below Expectations 1', minScore: 20, maxScore: 29, points: 2, isPassing: false, order: 7, colorHex: '#ea580c' },
        { code: 'BE2', name: 'Below Expectations 2', minScore: 0, maxScore: 19, points: 1, isPassing: false, order: 8, colorHex: '#dc2626' },
      ],
    },
    {
      id: 'classic_marks_rank',
      name: 'Kenya Classic Percentage & Mean Rank Mode [VERIFY WITH OFFICIAL SOURCE]',
      type: 'percentage',
      direction: 'asc',
      aggregateMode: 'mean',
      allowRanking: true,
      _note: 'Traditional 8-4-4 / classic percentage mode for schools utilizing total marks, mean score, and ranking.',
      bands: [
        { code: 'A', name: 'Grade A (Plain)', minScore: 80, maxScore: 100, points: 12, isPassing: true, order: 1, colorHex: '#15803d' },
        { code: 'A-', name: 'Grade A- (Minus)', minScore: 75, maxScore: 79, points: 11, isPassing: true, order: 2, colorHex: '#16a34a' },
        { code: 'B+', name: 'Grade B+ (Plus)', minScore: 70, maxScore: 74, points: 10, isPassing: true, order: 3, colorHex: '#059669' },
        { code: 'B', name: 'Grade B (Plain)', minScore: 65, maxScore: 69, points: 9, isPassing: true, order: 4, colorHex: '#0284c7' },
        { code: 'B-', name: 'Grade B- (Minus)', minScore: 60, maxScore: 64, points: 8, isPassing: true, order: 5, colorHex: '#0ea5e9' },
        { code: 'C+', name: 'Grade C+ (Plus)', minScore: 55, maxScore: 59, points: 7, isPassing: true, order: 6, colorHex: '#3b82f6' },
        { code: 'C', name: 'Grade C (Plain)', minScore: 50, maxScore: 54, points: 6, isPassing: true, order: 7, colorHex: '#eab308' },
        { code: 'C-', name: 'Grade C- (Minus)', minScore: 45, maxScore: 49, points: 5, isPassing: true, order: 8, colorHex: '#ca8a04' },
        { code: 'D+', name: 'Grade D+ (Plus)', minScore: 40, maxScore: 44, points: 4, isPassing: false, order: 9, colorHex: '#ea580c' },
        { code: 'D', name: 'Grade D (Plain)', minScore: 35, maxScore: 39, points: 3, isPassing: false, order: 10, colorHex: '#f97316' },
        { code: 'D-', name: 'Grade D- (Minus)', minScore: 30, maxScore: 34, points: 2, isPassing: false, order: 11, colorHex: '#ef4444' },
        { code: 'E', name: 'Grade E', minScore: 0, maxScore: 29, points: 1, isPassing: false, order: 12, colorHex: '#dc2626' },
      ],
    },
  ],

  academicCalendar: {
    termsPerYear: 3,
    typicalTerms: [
      { number: 1, name: 'Term 1', startMonth: 1, startWeek: 1, durationWeeks: 13 },
      { number: 2, name: 'Term 2', startMonth: 5, startWeek: 1, durationWeeks: 14 },
      { number: 3, name: 'Term 3', startMonth: 8, startWeek: 4, durationWeeks: 9 },
    ],
    _note: 'Standard Kenyan 3-term academic calendar with mid-term breaks. Verify with MoE school calendar.',
  },

  reportFormats: [
    {
      id: 'ke_cbc_report',
      name: 'Kenya CBC Learner Progress Report [VERIFY WITH OFFICIAL SOURCE]',
      type: 'cbc',
      gradingScaleId: 'cbc_no_aggregate',
      showAggregate: false,
      showRanking: false,
      showSubjectComments: true,
      showStrandDetails: true,
      showBehaviour: true,
      showAttendance: true,
      showActivities: true,
      layout: 'standard_portrait',
    },
    {
      id: 'ke_classic_report',
      name: 'Kenya Classic Terminal Report Card [VERIFY WITH OFFICIAL SOURCE]',
      type: 'classic',
      gradingScaleId: 'classic_marks_rank',
      showAggregate: true,
      showRanking: true,
      showSubjectComments: true,
      showStrandDetails: false,
      showBehaviour: true,
      showAttendance: true,
      showActivities: true,
      layout: 'standard_portrait',
    },
  ],

  paymentProviders: [
    {
      id: 'mpesa_daraja',
      name: 'Safaricom M-Pesa Daraja [VERIFY WITH OFFICIAL SOURCE]',
      type: 'mobile_money',
      country: 'KE',
      apiEndpoint: 'https://api.safaricom.co.ke',
      requiredCredentials: ['consumerKey', 'consumerSecret', 'passkey', 'shortcode'],
      callbackPath: '/api/payments/mpesa/callback',
      supportedCurrencies: ['KES'],
      _note: 'Supports STK Push (C2B) and B2C disbursement for student fee collections.',
    },
  ],

  dataProtection: {
    consentRequired: true,
    retentionYears: 7,
    exportFormat: 'xlsx',
    regulatoryBody: 'Office of the Data Protection Commissioner (ODPC Kenya)',
    notes: 'Kenya Data Protection Act 2019 compliance. Consent required for processing minor personal data.',
  },

  governmentExports: [
    {
      id: 'nemis_export',
      name: 'NEMIS Learner Register Export [VERIFY WITH OFFICIAL SOURCE]',
      description: 'Learner export formatted for National Education Management Information System upload.',
      fileType: 'xlsx',
      columns: [
        { key: 'admissionNumber', header: 'UPI / Adm No', required: true },
        { key: 'firstName', header: 'First Name', required: true },
        { key: 'lastName', header: 'Last Name', required: true },
        { key: 'gender', header: 'Gender', required: true },
        { key: 'dateOfBirth', header: 'DOB', required: true },
        { key: 'currentClass', header: 'Grade / Class', required: true },
      ],
      notes: 'Pluggable module. Column mapping requires official NEMIS portal schema verification.',
    },
  ],
};

/**
 * Uganda Country Pack
 * UNEB 9-Band System (D1..F9) + Lower Secondary Competency
 * NOTICE: VERIFY ALL OFFICIAL VALUES WITH OFFICIAL SOURCE (UNEB / MoES Uganda)
 */
export const UGANDA_COUNTRY_PACK: CountryPack = {
  code: 'UG',
  name: 'Uganda',
  _verifyWithOfficialSource: true,

  languages: {
    available: ['en', 'lg'], // English, Luganda
    default: 'en',
  },

  currency: {
    code: 'UGX',
    symbol: 'USh',
    name: 'Ugandan Shilling',
    minorUnits: 0,
  },

  locale: {
    timezone: 'Africa/Kampala',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 1,
  },

  curriculum: {
    name: 'Uganda National Curriculum (Lower Secondary & UNEB)',
    levels: [
      { code: 'P1', name: 'Primary 1', category: 'Primary', order: 1 },
      { code: 'P2', name: 'Primary 2', category: 'Primary', order: 2 },
      { code: 'P3', name: 'Primary 3', category: 'Primary', order: 3 },
      { code: 'P4', name: 'Primary 4', category: 'Primary', order: 4 },
      { code: 'P5', name: 'Primary 5', category: 'Primary', order: 5 },
      { code: 'P6', name: 'Primary 6', category: 'Primary', order: 6 },
      { code: 'P7', name: 'Primary 7', category: 'Primary', order: 7 },
      { code: 'S1', name: 'Senior 1', category: 'O-Level', order: 8 },
      { code: 'S2', name: 'Senior 2', category: 'O-Level', order: 9 },
      { code: 'S3', name: 'Senior 3', category: 'O-Level', order: 10 },
      { code: 'S4', name: 'Senior 4', category: 'O-Level', order: 11 },
      { code: 'S5', name: 'Senior 5', category: 'A-Level', order: 12 },
      { code: 'S6', name: 'Senior 6', category: 'A-Level', order: 13 },
    ],
  },

  gradingScales: [
    {
      id: 'uneb_nine_band',
      name: 'UNEB 9-Band Grading Scale (D1 best, F9 fail) [VERIFY WITH OFFICIAL SOURCE]',
      type: 'division',
      direction: 'desc', // LOWER aggregate points = BETTER performance (e.g., 8 points is aggregate 8)
      aggregateMode: 'best_n',
      aggregateN: 8,
      allowRanking: true,
      _note: 'UNEB D1..F9 direction-aware grading scale. Lower aggregate points indicate higher distinction.',
      bands: [
        { code: 'D1', name: 'Distinction 1', minScore: 80, maxScore: 100, points: 1, isPassing: true, order: 1, colorHex: '#15803d' },
        { code: 'D2', name: 'Distinction 2', minScore: 75, maxScore: 79, points: 2, isPassing: true, order: 2, colorHex: '#16a34a' },
        { code: 'C3', name: 'Credit 3', minScore: 70, maxScore: 74, points: 3, isPassing: true, order: 3, colorHex: '#0284c7' },
        { code: 'C4', name: 'Credit 4', minScore: 65, maxScore: 69, points: 4, isPassing: true, order: 4, colorHex: '#0ea5e9' },
        { code: 'C5', name: 'Credit 5', minScore: 60, maxScore: 64, points: 5, isPassing: true, order: 5, colorHex: '#3b82f6' },
        { code: 'C6', name: 'Credit 6', minScore: 50, maxScore: 59, points: 6, isPassing: true, order: 6, colorHex: '#eab308' },
        { code: 'P7', name: 'Pass 7', minScore: 45, maxScore: 49, points: 7, isPassing: true, order: 7, colorHex: '#ca8a04' },
        { code: 'P8', name: 'Pass 8', minScore: 40, maxScore: 44, points: 8, isPassing: true, order: 8, colorHex: '#ea580c' },
        { code: 'F9', name: 'Fail 9', minScore: 0, maxScore: 39, points: 9, isPassing: false, order: 9, colorHex: '#dc2626' },
      ],
    },
  ],

  academicCalendar: {
    termsPerYear: 3,
    typicalTerms: [
      { number: 1, name: 'Term 1', startMonth: 2, startWeek: 1, durationWeeks: 12 },
      { number: 2, name: 'Term 2', startMonth: 5, startWeek: 3, durationWeeks: 12 },
      { number: 3, name: 'Term 3', startMonth: 9, startWeek: 2, durationWeeks: 11 },
    ],
    _note: 'Ugandan 3-term system. Verify exact term dates with MoES.',
  },

  reportFormats: [
    {
      id: 'ug_uneb_report',
      name: 'Uganda Terminal Report Card (UNEB Bands) [VERIFY WITH OFFICIAL SOURCE]',
      type: 'classic',
      gradingScaleId: 'uneb_nine_band',
      showAggregate: true,
      showRanking: true,
      showSubjectComments: true,
      showStrandDetails: false,
      showBehaviour: true,
      showAttendance: true,
      showActivities: true,
      layout: 'standard_portrait',
    },
  ],

  paymentProviders: [
    {
      id: 'ug_mobile_money_aggregator',
      name: 'MTN MoMo & Airtel Money Uganda [VERIFY WITH OFFICIAL SOURCE]',
      type: 'aggregator',
      country: 'UG',
      requiredCredentials: ['apiKey', 'merchantId', 'secretKey'],
      callbackPath: '/api/payments/ug/callback',
      supportedCurrencies: ['UGX'],
      _note: 'Aggregated integration for MTN Mobile Money Uganda and Airtel Money Uganda.',
    },
  ],

  dataProtection: {
    consentRequired: true,
    retentionYears: 7,
    exportFormat: 'xlsx',
    regulatoryBody: 'Personal Data Protection Office (NITA-U)',
    notes: 'Data Protection and Privacy Act 2019 (Uganda).',
  },

  governmentExports: [
    {
      id: 'emis_uganda_export',
      name: 'Uganda EMIS Learner Register [VERIFY WITH OFFICIAL SOURCE]',
      description: 'Education Management Information System Uganda format.',
      fileType: 'xlsx',
      columns: [
        { key: 'learnerId', header: 'Learner Identification Number (LIN)', required: true },
        { key: 'fullName', header: 'Learner Name', required: true },
        { key: 'gender', header: 'Gender', required: true },
        { key: 'dateOfBirth', header: 'Date of Birth', required: true },
        { key: 'class', header: 'Class', required: true },
      ],
      notes: 'LIN and EMIS verification required.',
    },
  ],
};

/**
 * Tanzania Country Pack
 * NECTA Division I..IV from Best-6 (O-Level) / Best-7 (A-Level)
 * NOTICE: VERIFY BOUNDARIES AND SUBJECT RULES WITH NECTA
 */
export const TANZANIA_COUNTRY_PACK: CountryPack = {
  code: 'TZ',
  name: 'Tanzania',
  _verifyWithOfficialSource: true,

  languages: {
    available: ['sw', 'en'],
    default: 'sw', // Swahili-first
  },

  currency: {
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    minorUnits: 0,
  },

  locale: {
    timezone: 'Africa/Dar_es_Salaam',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 1,
  },

  curriculum: {
    name: 'Mtaala wa Taifa (NECTA)',
    levels: [
      { code: 'STD1', name: 'Darasa la 1', category: 'Msingi', order: 1 },
      { code: 'STD2', name: 'Darasa la 2', category: 'Msingi', order: 2 },
      { code: 'STD3', name: 'Darasa la 3', category: 'Msingi', order: 3 },
      { code: 'STD4', name: 'Darasa la 4', category: 'Msingi', order: 4 },
      { code: 'STD5', name: 'Darasa la 5', category: 'Msingi', order: 5 },
      { code: 'STD6', name: 'Darasa la 6', category: 'Msingi', order: 6 },
      { code: 'STD7', name: 'Darasa la 7', category: 'Msingi', order: 7 },
      { code: 'FORM1', name: 'Kidato cha 1', category: 'Sekondari', order: 8 },
      { code: 'FORM2', name: 'Kidato cha 2', category: 'Sekondari', order: 9 },
      { code: 'FORM3', name: 'Kidato cha 3', category: 'Sekondari', order: 10 },
      { code: 'FORM4', name: 'Kidato cha 4', category: 'Sekondari', order: 11 },
      { code: 'FORM5', name: 'Kidato cha 5', category: 'Sekondari ya Juu', order: 12 },
      { code: 'FORM6', name: 'Kidato cha 6', category: 'Sekondari ya Juu', order: 13 },
    ],
  },

  gradingScales: [
    {
      id: 'necta_division',
      name: 'NECTA Division System (Div I..IV, 0) [VERIFY WITH OFFICIAL SOURCE]',
      type: 'division',
      direction: 'desc', // Lower aggregate points = higher division
      aggregateMode: 'best_n',
      aggregateN: 7, // Best 7 subjects for CSEE
      allowRanking: true,
      _note: 'NECTA CSEE/ACSEE division system with boundary table. Lower aggregate points yields Division I.',
      divisionBoundaries: {
        'Division I': { min: 7, max: 17 },
        'Division II': { min: 18, max: 21 },
        'Division III': { min: 22, max: 25 },
        'Division IV': { min: 26, max: 33 },
        'Division 0': { min: 34, max: null },
      },
      bands: [
        { code: 'A', name: 'Bora Sana (A)', minScore: 75, maxScore: 100, points: 1, isPassing: true, order: 1, colorHex: '#15803d' },
        { code: 'B', name: 'Nzuri (B)', minScore: 65, maxScore: 74, points: 2, isPassing: true, order: 2, colorHex: '#16a34a' },
        { code: 'C', name: 'Wastani (C)', minScore: 45, maxScore: 64, points: 3, isPassing: true, order: 3, colorHex: '#0284c7' },
        { code: 'D', name: 'Inaridhisha (D)', minScore: 30, maxScore: 44, points: 4, isPassing: true, order: 4, colorHex: '#eab308' },
        { code: 'F', name: 'Kushindwa (F)', minScore: 0, maxScore: 29, points: 5, isPassing: false, order: 5, colorHex: '#dc2626' },
      ],
    },
  ],

  academicCalendar: {
    termsPerYear: 2,
    typicalTerms: [
      { number: 1, name: 'Muhula wa Kwanza', startMonth: 1, startWeek: 2, durationWeeks: 20 },
      { number: 2, name: 'Muhula wa Pili', startMonth: 7, startWeek: 1, durationWeeks: 20 },
    ],
    _note: 'Tanzanian two-semester calendar with mid-term breaks.',
  },

  reportFormats: [
    {
      id: 'tz_necta_report',
      name: 'Ripoti ya Maendeleo ya Mwanafunzi (NECTA) [VERIFY WITH OFFICIAL SOURCE]',
      type: 'classic',
      gradingScaleId: 'necta_division',
      showAggregate: true,
      showRanking: true,
      showSubjectComments: true,
      showStrandDetails: false,
      showBehaviour: true,
      showAttendance: true,
      showActivities: true,
      layout: 'standard_portrait',
    },
  ],

  paymentProviders: [
    {
      id: 'tz_mobile_money',
      name: 'M-Pesa / Tigo Pesa / Airtel Money Tanzania [VERIFY WITH OFFICIAL SOURCE]',
      type: 'aggregator',
      country: 'TZ',
      requiredCredentials: ['merchantCode', 'apiKey', 'apiSecret'],
      callbackPath: '/api/payments/tz/callback',
      supportedCurrencies: ['TZS'],
      _note: 'Tanzanian mobile money gateway integration.',
    },
  ],

  dataProtection: {
    consentRequired: true,
    retentionYears: 7,
    exportFormat: 'xlsx',
    regulatoryBody: 'Tanzania Personal Data Protection Commission (PDPC)',
    notes: 'Personal Data Protection Act 2022 (Tanzania).',
  },

  governmentExports: [
    {
      id: 'tz_bwise_export',
      name: 'SEMA / BEMIS Tanzania Export [VERIFY WITH OFFICIAL SOURCE]',
      description: 'Format for regional education management systems in Tanzania.',
      fileType: 'xlsx',
      columns: [
        { key: 'premNumber', header: 'Namba ya PREM', required: true },
        { key: 'jinaKamili', header: 'Jina Kamili', required: true },
        { key: 'jinsia', header: 'Jinsia', required: true },
        { key: 'tareheKuzaliwa', header: 'Tarehe ya Kuzaliwa', required: true },
        { key: 'darasa', header: 'Darasa', required: true },
      ],
      notes: 'PREM number verification required with TAMISEMI.',
    },
  ],
};

/**
 * Rwanda Country Pack
 * REB A..E Scale with Pass Threshold
 * NOTICE: VERIFY OFFICIAL PASS THRESHOLDS AND REB FORMATS
 */
export const RWANDA_COUNTRY_PACK: CountryPack = {
  code: 'RW',
  name: 'Rwanda',
  _verifyWithOfficialSource: true,

  languages: {
    available: ['rw', 'fr', 'en'],
    default: 'en',
  },

  currency: {
    code: 'RWF',
    symbol: 'FRw',
    name: 'Rwandan Franc',
    minorUnits: 0,
  },

  locale: {
    timezone: 'Africa/Kigali',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 1,
  },

  curriculum: {
    name: 'Rwanda Competence-Based Curriculum (REB)',
    levels: [
      { code: 'P1', name: 'Primary 1', category: 'Primary', order: 1 },
      { code: 'P2', name: 'Primary 2', category: 'Primary', order: 2 },
      { code: 'P3', name: 'Primary 3', category: 'Primary', order: 3 },
      { code: 'P4', name: 'Primary 4', category: 'Primary', order: 4 },
      { code: 'P5', name: 'Primary 5', category: 'Primary', order: 5 },
      { code: 'P6', name: 'Primary 6', category: 'Primary', order: 6 },
      { code: 'S1', name: 'Senior 1', category: 'Ordinary Level', order: 7 },
      { code: 'S2', name: 'Senior 2', category: 'Ordinary Level', order: 8 },
      { code: 'S3', name: 'Senior 3', category: 'Ordinary Level', order: 9 },
      { code: 'S4', name: 'Senior 4', category: 'Advanced Level', order: 10 },
      { code: 'S5', name: 'Senior 5', category: 'Advanced Level', order: 11 },
      { code: 'S6', name: 'Senior 6', category: 'Advanced Level', order: 12 },
    ],
  },

  gradingScales: [
    {
      id: 'rwanda_letter_scale',
      name: 'Rwanda REB A-E Scale [VERIFY WITH OFFICIAL SOURCE]',
      type: 'letter',
      direction: 'asc', // Higher percentage/points is better
      aggregateMode: 'mean',
      allowRanking: true,
      passThreshold: 50,
      passThresholdEditable: true,
      _note: 'Rwanda REB letter scale with editable pass threshold.',
      bands: [
        { code: 'A', name: 'Excellent (A)', minScore: 80, maxScore: 100, points: 5, isPassing: true, order: 1, colorHex: '#15803d' },
        { code: 'B', name: 'Very Good (B)', minScore: 70, maxScore: 79, points: 4, isPassing: true, order: 2, colorHex: '#16a34a' },
        { code: 'C', name: 'Good (C)', minScore: 60, maxScore: 69, points: 3, isPassing: true, order: 3, colorHex: '#0284c7' },
        { code: 'D', name: 'Satisfactory (D)', minScore: 50, maxScore: 59, points: 2, isPassing: true, order: 4, colorHex: '#eab308' },
        { code: 'E', name: 'Fail (E)', minScore: 0, maxScore: 49, points: 1, isPassing: false, order: 5, colorHex: '#dc2626' },
      ],
    },
  ],

  academicCalendar: {
    termsPerYear: 3,
    typicalTerms: [
      { number: 1, name: 'Igihembwe cya 1', startMonth: 9, startWeek: 1, durationWeeks: 12 },
      { number: 2, name: 'Igihembwe cya 2', startMonth: 1, startWeek: 2, durationWeeks: 12 },
      { number: 3, name: 'Igihembwe cya 3', startMonth: 4, startWeek: 3, durationWeeks: 11 },
    ],
    _note: 'Rwandan academic calendar operates September through July.',
  },

  reportFormats: [
    {
      id: 'rw_reb_report',
      name: 'Raporo y’Amanota (Rwanda REB Report) [VERIFY WITH OFFICIAL SOURCE]',
      type: 'classic',
      gradingScaleId: 'rwanda_letter_scale',
      showAggregate: true,
      showRanking: true,
      showSubjectComments: true,
      showStrandDetails: false,
      showBehaviour: true,
      showAttendance: true,
      showActivities: true,
      layout: 'standard_portrait',
    },
  ],

  paymentProviders: [
    {
      id: 'rw_momo',
      name: 'MTN Mobile Money Rwanda [VERIFY WITH OFFICIAL SOURCE]',
      type: 'mobile_money',
      country: 'RW',
      requiredCredentials: ['subscriptionKey', 'apiUser', 'apiKey'],
      callbackPath: '/api/payments/rw/callback',
      supportedCurrencies: ['RWF'],
      _note: 'MTN MoMo API Rwanda integration.',
    },
  ],

  dataProtection: {
    consentRequired: true,
    retentionYears: 7,
    exportFormat: 'xlsx',
    regulatoryBody: 'National Cyber Security Authority (NCSA Rwanda)',
    notes: 'Law No. 058/2021 relating to the protection of personal data and privacy.',
  },

  governmentExports: [
    {
      id: 'sdms_rwanda_export',
      name: 'Rwanda SDMS Learner Register [VERIFY WITH OFFICIAL SOURCE]',
      description: 'School Data Management System (SDMS) export format.',
      fileType: 'xlsx',
      columns: [
        { key: 'learnerCode', header: 'Learner SDMS Code', required: true },
        { key: 'names', header: 'Names', required: true },
        { key: 'gender', header: 'Gender', required: true },
        { key: 'dob', header: 'Date of Birth', required: true },
        { key: 'grade', header: 'Grade', required: true },
      ],
      notes: 'Verify with Ministry of Education Rwanda SDMS.',
    },
  ],
};

/**
 * Generic Country Pack
 * Percentage, Letter A-F, GPA
 */
export const GENERIC_COUNTRY_PACK: CountryPack = {
  code: 'GENERIC',
  name: 'Generic / International',
  _verifyWithOfficialSource: false,

  languages: {
    available: ['en', 'sw', 'fr'],
    default: 'en',
  },

  currency: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    minorUnits: 2,
  },

  locale: {
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    firstDayOfWeek: 1,
  },

  curriculum: {
    name: 'Standard K-12 / International',
    levels: [
      { code: 'K1', name: 'Kindergarten', category: 'Early', order: 1 },
      { code: 'G1', name: 'Grade 1', category: 'Primary', order: 2 },
      { code: 'G2', name: 'Grade 2', category: 'Primary', order: 3 },
      { code: 'G3', name: 'Grade 3', category: 'Primary', order: 4 },
      { code: 'G4', name: 'Grade 4', category: 'Primary', order: 5 },
      { code: 'G5', name: 'Grade 5', category: 'Primary', order: 6 },
      { code: 'G6', name: 'Grade 6', category: 'Middle', order: 7 },
      { code: 'G7', name: 'Grade 7', category: 'Middle', order: 8 },
      { code: 'G8', name: 'Grade 8', category: 'Middle', order: 9 },
      { code: 'G9', name: 'Grade 9', category: 'High', order: 10 },
      { code: 'G10', name: 'Grade 10', category: 'High', order: 11 },
      { code: 'G11', name: 'Grade 11', category: 'High', order: 12 },
      { code: 'G12', name: 'Grade 12', category: 'High', order: 13 },
    ],
  },

  gradingScales: [
    {
      id: 'generic_percentage',
      name: 'Standard Percentage Scale (0-100%)',
      type: 'percentage',
      direction: 'asc',
      aggregateMode: 'mean',
      allowRanking: true,
      bands: [
        { code: 'A', name: 'Excellent', minScore: 90, maxScore: 100, points: 4, isPassing: true, order: 1, colorHex: '#15803d' },
        { code: 'B', name: 'Good', minScore: 80, maxScore: 89, points: 3, isPassing: true, order: 2, colorHex: '#16a34a' },
        { code: 'C', name: 'Satisfactory', minScore: 70, maxScore: 79, points: 2, isPassing: true, order: 3, colorHex: '#0284c7' },
        { code: 'D', name: 'Needs Improvement', minScore: 60, maxScore: 69, points: 1, isPassing: true, order: 4, colorHex: '#eab308' },
        { code: 'F', name: 'Failing', minScore: 0, maxScore: 59, points: 0, isPassing: false, order: 5, colorHex: '#dc2626' },
      ],
    },
  ],

  academicCalendar: {
    termsPerYear: 3,
    typicalTerms: [
      { number: 1, name: 'Term 1 / Fall', startMonth: 9, startWeek: 1, durationWeeks: 14 },
      { number: 2, name: 'Term 2 / Spring', startMonth: 1, startWeek: 2, durationWeeks: 14 },
      { number: 3, name: 'Term 3 / Summer', startMonth: 5, startWeek: 1, durationWeeks: 8 },
    ],
  },

  reportFormats: [
    {
      id: 'generic_report',
      name: 'Standard Report Card',
      type: 'classic',
      gradingScaleId: 'generic_percentage',
      showAggregate: true,
      showRanking: true,
      showSubjectComments: true,
      showStrandDetails: false,
      showBehaviour: true,
      showAttendance: true,
      showActivities: true,
      layout: 'standard_portrait',
    },
  ],

  paymentProviders: [],

  dataProtection: {
    consentRequired: true,
    retentionYears: 5,
    exportFormat: 'xlsx',
    regulatoryBody: 'Standard Data Protection Laws',
    notes: 'Default international data protection settings.',
  },

  governmentExports: [],
};

/** All seeded country packs lookup */
export const COUNTRY_PACKS: Record<string, CountryPack> = {
  KE: KENYA_COUNTRY_PACK,
  UG: UGANDA_COUNTRY_PACK,
  TZ: TANZANIA_COUNTRY_PACK,
  RW: RWANDA_COUNTRY_PACK,
  GENERIC: GENERIC_COUNTRY_PACK,
};
