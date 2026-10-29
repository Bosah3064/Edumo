// ============================================================
// EDUMO SHARED TYPES — Student, Guardian, Staff Models
// ============================================================
import type {
  DocMeta,
  StudentStatus,
  Gender,
  BoardingStatus,
  ContractType,
  CommunicationPreference,
  Address,
  EmergencyContact,
  ISOTimestamp,
  CountryCode,
} from './common';

/** Student profile */
export interface Student extends DocMeta {
  admissionNumber: string;
  schoolEmail?: string | null;
  nationalId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: ISOTimestamp;
  gender: Gender;
  nationality?: string;
  photo?: string; // Storage path
  currentClassId: string;
  currentStreamId?: string;
  enrollmentDate: ISOTimestamp;
  status: StudentStatus;
  guardianIds: string[];
  emergencyContacts: EmergencyContact[];
  address?: Address;
  boardingStatus: BoardingStatus;
  transportRouteId?: string;
  specialNeeds?: SpecialNeedsInfo;
  previousSchools?: TransferRecord[];
  tags?: string[];
}

export interface SpecialNeedsInfo {
  hasSEN: boolean;
  category?: string;
  plan?: string;
  notes?: string;
}

export interface TransferRecord {
  schoolName: string;
  country: CountryCode;
  dateLeft: ISOTimestamp;
  dateJoined?: ISOTimestamp;
  gradingSystem?: string;
  lastGrades?: Record<string, unknown>;
  reason?: string;
}

/** Medical info (restricted subcollection) */
export interface MedicalInfo {
  bloodGroup?: string;
  allergies: string[];
  conditions: MedicalCondition[];
  medications: Medication[];
  insuranceInfo?: InsuranceInfo;
  doctorContact?: DoctorContact;
  updatedAt: ISOTimestamp;
  updatedBy: string;
}

export interface MedicalCondition {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
  diagnosedDate?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  notes?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  expiryDate?: string;
}

export interface DoctorContact {
  name: string;
  phone: string;
  hospital?: string;
}

/** Guardian profile (within a school) */
export interface Guardian extends Omit<DocMeta, 'updatedBy'> {
  uid?: string; // Firebase Auth UID when linked
  firstName: string;
  lastName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  idNumber?: string;
  relationship: string;
  studentIds: string[];
  isEmergencyContact: boolean;
  communicationPreference: CommunicationPreference;
  verified: boolean;
}

/** Staff profile */
export interface Staff extends DocMeta {
  uid: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: string;
  department?: string;
  qualification?: string;
  tscNumber?: string;
  dateJoined: ISOTimestamp;
  contractType: ContractType;
  assignedClasses: string[];
  assignedSubjects: SubjectAssignment[];
  isClassTeacher: boolean;
  classTeacherOf?: string;
  permissions: string[];
  status: 'active' | 'onLeave' | 'terminated';
}

export interface SubjectAssignment {
  classId: string;
  subjectId: string;
}

/** Class */
export interface SchoolClass extends DocMeta {
  name: string;
  level: string;
  section?: string;
  academicYearId: string;
  classTeacherId?: string;
  capacity: number;
  currentCount: number;
  order: number;
}

/** Stream within a class */
export interface Stream {
  id?: string;
  name: string;
  classTeacherId?: string;
  studentCount: number;
}

/** Subject within a class */
export interface Subject {
  id?: string;
  name: string;
  code: string;
  type: 'core' | 'elective' | 'optional';
  category?: string; // CBC learning area
  maxMarks?: number;
  teacherId?: string;
  strands?: Strand[];
  gradingScaleOverride?: Record<string, unknown>;
}

export interface Strand {
  code: string;
  name: string;
  subStrands?: SubStrand[];
}

export interface SubStrand {
  code: string;
  name: string;
  maxScore?: number;
}
