// ============================================================
// EDUMO SHARED TYPES — Fees & Finance Models
// ============================================================
import type {
  DocMeta,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  ISOTimestamp,
} from './common';

/** Fee structure template */
export interface FeeStructure extends DocMeta {
  name: string;
  academicYearId: string;
  termId: string;
  classId: string; // or '*' for all classes
  boardingStatus: 'day' | 'boarding' | 'both';
  items: FeeItem[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'active';
}

export interface FeeItem {
  name: string;
  amount: number;
  category: string;
  optional: boolean;
}

/** Invoice */
export interface Invoice extends DocMeta {
  invoiceNumber: string;
  studentId: string;
  guardianId: string;
  feeStructureId: string;
  termId: string;
  items: FeeItem[];
  totalAmount: number;
  discounts: Discount[];
  scholarshipAmount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: ISOTimestamp;
  sentAt?: ISOTimestamp;
}

export interface Discount {
  type: 'sibling' | 'scholarship' | 'staff_child' | 'early_payment' | 'custom';
  amount: number;
  reason: string;
}

/** Payment record */
export interface Payment extends DocMeta {
  invoiceId: string;
  studentId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  providerRef?: string;
  providerResponse?: Record<string, unknown>;
  receiptNumber: string;
  status: PaymentStatus;
  idempotencyKey: string;
  receivedBy?: string;
  verifiedAt?: ISOTimestamp;
}

/** Parent Payment Pledge (Edumo Standard) */
export interface ParentPledge extends Partial<DocMeta> {
  id?: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  guardianName: string;
  guardianPhone: string;
  amountPledged: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'partially_fulfilled' | 'fulfilled' | 'defaulted';
  amountFulfilled: number;
  balanceRemaining: number;
  linkedInvoiceId?: string;
  notes?: string;
  recordedBy: string;
  recordedAt: ISOTimestamp;
  fulfillmentHistory?: PledgePaymentLink[];
}

export interface PledgePaymentLink {
  paymentId: string;
  receiptNumber: string;
  amount: number;
  date: string;
}

/** Approved School Supplier / Vendor */
export interface Supplier extends Partial<DocMeta> {
  id?: string;
  name: string;
  category: 'food_provisions' | 'stationery' | 'uniforms' | 'lab_equipment' | 'construction' | 'transport_fuel' | 'utilities' | 'other';
  contactPerson: string;
  phone: string;
  email?: string;
  taxPin?: string;
  bankAccount?: string;
  bankName?: string;
  status: 'active' | 'suspended';
}

/** Local Purchase Order (LPO) / Local Service Order (LSO) */
export interface PurchaseOrder extends Partial<DocMeta> {
  id?: string;
  orderNumber: string; // e.g. LPO-2026-0042
  type: 'lpo' | 'lso';
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'approved' | 'delivered' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
}

/** Official Expense Payment Voucher */
export interface PaymentVoucher extends Partial<DocMeta> {
  id?: string;
  voucherNumber: string; // e.g. PV-2026-018
  purchaseOrderId?: string;
  payeeName: string;
  category: 'provisions' | 'stationery' | 'repairs' | 'utilities' | 'fuel' | 'sports' | 'welfare' | 'other';
  amount: number;
  currency: string;
  paymentMethod: 'mpesa_paybill' | 'bank_transfer' | 'cash' | 'cheque';
  referenceNumber?: string;
  description: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'rejected';
  preparedBy: string;
  preparedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

/** Real-time School Cashbook Ledger Entry */
export interface CashbookEntry {
  id?: string;
  date: string;
  type: 'inflow' | 'outflow';
  category: string;
  description: string;
  sourceDocType: 'payment_receipt' | 'payment_voucher' | 'canteen' | 'other';
  sourceDocRef: string;
  amount: number;
  runningBalance: number;
  currency: string;
  reconciled: boolean;
}

/** Import job */
export interface ImportJob {
  id?: string;
  entity: 'students' | 'staff' | 'marks' | 'fees' | 'guardians';
  fileName: string;
  filePath: string;
  status: import('./common').ImportJobStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ImportError[];
  errorsFilePath?: string;
  previewData?: Record<string, unknown>[];
  batchId?: string;
  committedDocIds?: string[];
  startedBy: string;
  startedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
}

export interface ImportError {
  row: number;
  column?: string;
  message: string;
}

/** Export job */
export interface ExportJob {
  id?: string;
  reportType: string;
  parameters: Record<string, unknown>;
  status: import('./common').ExportJobStatus;
  filePath?: string;
  downloadUrl?: string;
  expiresAt?: ISOTimestamp;
  requestedBy: string;
  requestedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
}

/** Audit log entry (Who did what at what time with what reason) */
export interface AuditLog {
  id?: string;
  orgId: string;
  schoolId?: string;
  action: string;
  category: 'auth' | 'data' | 'finance' | 'export' | 'admin';
  actorUid: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  reason?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: ISOTimestamp;
}

/** Invite */
export interface Invite {
  id?: string;
  orgId: string;
  schoolId: string;
  role: string;
  permissions?: string[];
  email?: string;
  phone?: string;
  code: string;
  singleUse: boolean;
  used: boolean;
  usedBy?: string;
  usedAt?: ISOTimestamp;
  expiresAt: ISOTimestamp;
  createdBy: string;
  createdAt: ISOTimestamp;
}

/** Guardian link (top-level) */
export interface GuardianLink {
  id?: string;
  guardianUid: string;
  studentId: string;
  orgId: string;
  schoolId: string;
  relationship: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: ISOTimestamp;
  createdAt: ISOTimestamp;
}

/** User profile (top-level) */
export interface UserProfile {
  displayName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  preferredLanguage: string;
  theme: 'light' | 'dark' | 'system';
  memberships: import('./permissions').Membership[];
  fcmTokens?: string[];
  lastLoginAt?: ISOTimestamp;
  createdAt: ISOTimestamp;
}
