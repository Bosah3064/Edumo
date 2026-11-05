// ============================================================
// EDUMO SHARED — Advanced School Finance Engine (Zeraki-Inspired)
// Master Spec Section 3 & 11
// Core business rules:
// 1. Strict separation of parent pledges from cashbook/revenue
// 2. Double-entry cashbook running balance calculation & integrity
// 3. Multi-tier payment voucher approval workflow
// 4. Aging debtor classification
// 5. Payment idempotency & deduplication
// ============================================================

import type {
  ParentPledge,
  CashbookEntry,
  PaymentVoucher,
  Payment,
} from '../types/finance';

/**
 * Validates that parent pledges are NEVER calculated as realized cashflow or revenue.
 * Realized revenue is strictly derived from verified payments.
 */
export function calculateFinancialSummary(
  payments: Array<Pick<Payment, 'amount' | 'status'>>,
  vouchers: Array<Pick<PaymentVoucher, 'amount' | 'status'>>,
  pledges: Array<Pick<ParentPledge, 'amountPledged' | 'amountFulfilled' | 'status'>>,
  openingBalance: number = 0
): {
  openingBalance: number;
  totalRealizedRevenue: number;
  totalExpenditure: number;
  netCashSurplus: number;
  closingCashBalance: number;
  totalPledgedAmount: number;
  unfulfilledPledgesAmount: number;
  pledgeFulfillmentRate: number;
} {
  // Only confirmed/verified payments count as revenue
  const totalRealizedRevenue = payments
    .filter((p) => p.status === 'confirmed' || (p.status as string) === 'verified')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Only paid vouchers count as actual expenditure
  const totalExpenditure = vouchers
    .filter((v) => v.status === 'paid')
    .reduce((sum, v) => sum + Number(v.amount || 0), 0);

  const netCashSurplus = totalRealizedRevenue - totalExpenditure;
  const closingCashBalance = openingBalance + netCashSurplus;

  // Pledges tracked in isolation — NEVER added to cash balance
  const totalPledgedAmount = pledges.reduce(
    (sum, pl) => sum + Number(pl.amountPledged || 0),
    0
  );
  const totalFulfilledPledges = pledges.reduce(
    (sum, pl) => sum + Number(pl.amountFulfilled || 0),
    0
  );
  const unfulfilledPledgesAmount = Math.max(0, totalPledgedAmount - totalFulfilledPledges);
  const pledgeFulfillmentRate =
    totalPledgedAmount > 0
      ? Math.round((totalFulfilledPledges / totalPledgedAmount) * 100)
      : 0;

  return {
    openingBalance,
    totalRealizedRevenue,
    totalExpenditure,
    netCashSurplus,
    closingCashBalance,
    totalPledgedAmount,
    unfulfilledPledgesAmount,
    pledgeFulfillmentRate,
  };
}

/**
 * Calculates running balances for cashbook entries sequentially.
 * Inflows increase the running balance, outflows decrease it.
 * Pledges are forbidden from being entered into the cashbook.
 */
export function calculateCashbookLedger(
  entries: Array<Omit<CashbookEntry, 'runningBalance'>>,
  openingBalance: number = 0
): CashbookEntry[] {
  let currentBalance = openingBalance;

  return entries.map((entry) => {
    // Validate entry integrity
    const amount = Number(entry.amount || 0);
    if (isNaN(amount) || amount < 0) {
      throw new Error(`Invalid cashbook entry amount: ${entry.amount}`);
    }

    if (entry.type === 'inflow') {
      currentBalance += amount;
    } else if (entry.type === 'outflow') {
      currentBalance -= amount;
    } else {
      throw new Error(`Invalid cashbook entry type: ${entry.type}`);
    }

    return {
      ...entry,
      runningBalance: currentBalance,
    };
  });
}

/**
 * Validates and updates a Parent Pledge when a partial or full payment is received.
 * Returns the updated pledge without modifying original object.
 */
export function allocatePaymentToPledge(
  pledge: ParentPledge,
  paymentAmount: number,
  receiptNumber: string,
  paymentId: string,
  paymentDate: string
): ParentPledge {
  if (paymentAmount <= 0) {
    throw new Error('Payment amount allocated to pledge must be greater than zero');
  }

  const currentFulfilled = Number(pledge.amountFulfilled || 0);
  const totalPledged = Number(pledge.amountPledged || 0);

  const newFulfilled = Math.min(totalPledged, currentFulfilled + paymentAmount);
  const newBalance = Math.max(0, totalPledged - newFulfilled);
  const newStatus: ParentPledge['status'] =
    newBalance === 0
      ? 'fulfilled'
      : newFulfilled > 0
      ? 'partially_fulfilled'
      : 'pending';

  const history = pledge.fulfillmentHistory ? [...pledge.fulfillmentHistory] : [];
  history.push({
    paymentId,
    receiptNumber,
    amount: paymentAmount,
    date: paymentDate,
  });

  return {
    ...pledge,
    amountFulfilled: newFulfilled,
    balanceRemaining: newBalance,
    status: newStatus,
    fulfillmentHistory: history,
  };
}

/**
 * Allowed status transitions for Payment Vouchers
 * Follows 3-tier governance: draft -> pending_approval -> approved -> paid (or rejected)
 */
export const VOUCHER_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_approval', 'rejected'],
  pending_approval: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [], // Terminal state
  rejected: ['draft'], // Can be reset to draft for correction
};

/**
 * Validates whether a voucher transition is permitted based on role & status
 */
export function canTransitionVoucher(
  currentStatus: PaymentVoucher['status'],
  targetStatus: PaymentVoucher['status'],
  userRole: string
): { allowed: boolean; reason?: string } {
  const allowedNext = VOUCHER_TRANSITIONS[currentStatus || 'draft'] || [];

  if (!allowedNext.includes(targetStatus || '')) {
    return {
      allowed: false,
      reason: `Cannot transition voucher from '${currentStatus}' to '${targetStatus}'`,
    };
  }

  // Approval requires administrative or bursar/principal authority
  if (targetStatus === 'approved') {
    const approverRoles = ['principal', 'deputy_principal', 'bursar', 'admin', 'org_owner'];
    if (!approverRoles.includes(userRole.toLowerCase())) {
      return {
        allowed: false,
        reason: 'Only authorized administrators or bursars can approve payment vouchers',
      };
    }
  }

  // Marking as paid requires bursar, accountant, or finance officer
  if (targetStatus === 'paid') {
    const paymentRoles = ['bursar', 'accountant', 'finance_officer', 'admin', 'org_owner'];
    if (!paymentRoles.includes(userRole.toLowerCase())) {
      return {
        allowed: false,
        reason: 'Only finance personnel can mark payment vouchers as paid',
      };
    }
  }

  return { allowed: true };
}

/**
 * Categorizes a fee balance into aging debtor buckets based on due date.
 * Buckets: 'current' (0-30 days), '30_days' (31-60), '60_days' (61-90), '90_plus_days' (>90 days past due)
 */
export function categorizeDebtorAging(
  dueDateStr: string,
  asOfDateStr?: string
): 'current' | '30_days' | '60_days' | '90_plus_days' {
  const dueDate = new Date(dueDateStr);
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();

  // If dueDate is in the future or within 30 days past due
  const diffTime = asOf.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return 'current';
  } else if (diffDays <= 60) {
    return '30_days';
  } else if (diffDays <= 90) {
    return '60_days';
  } else {
    return '90_plus_days';
  }
}

/**
 * Checks for duplicate payments using idempotency key.
 */
export function checkDuplicatePayment(
  existingIdempotencyKeys: Set<string> | string[],
  key: string
): boolean {
  if (existingIdempotencyKeys instanceof Set) {
    return existingIdempotencyKeys.has(key);
  }
  return existingIdempotencyKeys.includes(key);
}
