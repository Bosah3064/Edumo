// ============================================================
// EDUMO SHARED TYPES — Common types used across modules
// ============================================================

/** ISO 3166-1 alpha-2 country codes supported */
export type CountryCode = 'KE' | 'UG' | 'TZ' | 'RW';

/** ISO 4217 currency codes supported */
export type CurrencyCode = 'KES' | 'UGX' | 'TZS' | 'RWF' | 'USD';

/** Supported languages */
export type LanguageCode = 'en' | 'sw' | 'rw' | 'fr' | 'lg';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string; // county (KE), district (UG/TZ/RW)
  postalCode?: string;
  country: CountryCode;
}

export interface PhoneNumber {
  /** Full international format, e.g. +254712345678 */
  number: string;
  /** Is this a verified number? */
  verified?: boolean;
}

export interface ContactInfo {
  phone: string;
  altPhone?: string;
  email?: string;
  website?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

/** Timestamp placeholder — resolves to Firestore Timestamp on server, Date on client */
export type ISOTimestamp = string;

/** Firestore document metadata */
export interface DocMeta {
  id?: string;
  createdAt: ISOTimestamp;
  createdBy: string;
  updatedAt: ISOTimestamp;
  updatedBy?: string;
}

/** Soft-delete fields */
export interface SoftDeletable {
  deletedAt?: ISOTimestamp;
  deletedBy?: string;
}

/** Branding configuration */
export interface Branding {
  logo?: string; // Storage path
  primaryColor?: string; // Hex
  secondaryColor?: string; // Hex
  motto?: string;
}

/** Attendance status options */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

/** Common entity statuses */
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'archived';

/** Student enrollment statuses */
export type StudentStatus =
  | 'active'
  | 'graduated'
  | 'transferred'
  | 'withdrawn'
  | 'suspended'
  | 'alumni';

/** Staff contract types */
export type ContractType = 'permanent' | 'contract' | 'partTime' | 'intern';

/** Boarding status */
export type BoardingStatus = 'day' | 'boarding';

/** Gender options */
export type Gender = 'male' | 'female' | 'other';

/** Communication preference */
export type CommunicationPreference = 'push' | 'sms' | 'whatsapp' | 'email';

/** Announcement audience types */
export type AnnouncementAudience =
  | 'all'
  | 'class'
  | 'stream'
  | 'individual'
  | 'staff'
  | 'parents';

/** Message channels */
export type MessageChannel = 'push' | 'sms' | 'whatsapp' | 'inApp';

/** Priority levels */
export type Priority = 'normal' | 'urgent';

/** Assessment types */
export type AssessmentType =
  | 'exam'
  | 'cat'
  | 'assignment'
  | 'cbc_strand'
  | 'practical'
  | 'quiz';

/** Payment methods */
export type PaymentMethod =
  | 'mpesa'
  | 'bank'
  | 'cash'
  | 'mtnMomo'
  | 'airtelMoney'
  | 'cheque';

/** Payment status */
export type PaymentStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'reversed'
  | 'refunded';

/** Invoice status */
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled';

/** Import job status */
export type ImportJobStatus =
  | 'uploaded'
  | 'parsing'
  | 'dryRunComplete'
  | 'confirming'
  | 'committing'
  | 'complete'
  | 'failed'
  | 'rolledBack';

/** Export job status */
export type ExportJobStatus =
  | 'queued'
  | 'generating'
  | 'ready'
  | 'expired';

/** School types */
export type SchoolType = 'nursery' | 'primary' | 'secondary' | 'combined';

/** Organization types */
export type OrgType = 'standalone' | 'group';

/** Grading modes */
export type GradingMode =
  | 'cbc_no_aggregate'
  | 'classic_marks_rank'
  | 'uneb'
  | 'necta'
  | 'rwanda'
  | 'custom';

/** Curriculum types */
export type CurriculumType =
  | 'CBC'
  | '8-4-4'
  | 'UNEB'
  | 'NECTA'
  | 'Rwanda'
  | 'custom';
