// ============================================================
// EDUMO — Advanced School Finance Unit Tests (Phase 2)
// Master Spec Section 3 & 11, Cost & Efficiency Directive Section 10
// Tests:
// 1. Strict separation of parent pledges from cashbook/revenue
// 2. Double-entry cashbook running balance calculation & integrity
// 3. Parent pledge allocation and fulfillment tracking
// 4. Multi-tier payment voucher approval workflow transitions
// 5. Debtors aging bucket classification (0-30, 31-60, 61-90, 90+)
// 6. Idempotent payment processing & duplicate prevention
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateFinancialSummary,
  calculateCashbookLedger,
  allocatePaymentToPledge,
  canTransitionVoucher,
  categorizeDebtorAging,
  checkDuplicatePayment,
  ParentPledge,
} from '@edumo/shared';

describe('Advanced School Finance Engine (Phase 2)', () => {
  describe('Pledge vs Actual Payment Separation (Directive Section 10)', () => {
    it('NEVER treats parent pledges as realized revenue or cashbook receipts', () => {
      const mockPayments = [
        { amount: 50000, status: 'confirmed' as const },
        { amount: 35000, status: 'confirmed' as const },
        { amount: 15000, status: 'pending' as const }, // unconfirmed should not count
      ];

      const mockVouchers = [
        { amount: 20000, status: 'paid' as const },
        { amount: 15000, status: 'pending_approval' as const }, // unapproved should not count
      ];

      const mockPledges = [
        { amountPledged: 100000, amountFulfilled: 30000, status: 'partially_fulfilled' as const },
        { amountPledged: 50000, amountFulfilled: 0, status: 'pending' as const },
      ];

      const summary = calculateFinancialSummary(mockPayments, mockVouchers, mockPledges, 10000);

      // Realized revenue MUST strictly equal only confirmed payments (50k + 35k = 85k)
      expect(summary.totalRealizedRevenue).toBe(85000);

      // Expenditure MUST strictly equal only paid vouchers (20k)
      expect(summary.totalExpenditure).toBe(20000);

      // Net surplus = 85k - 20k = 65k
      expect(summary.netCashSurplus).toBe(65000);

      // Closing cash balance = 10k opening + 65k net = 75k
      expect(summary.closingCashBalance).toBe(75000);

      // Pledges are tracked purely as commitments, never added into cash balance
      expect(summary.totalPledgedAmount).toBe(150000);
      expect(summary.unfulfilledPledgesAmount).toBe(120000);
      expect(summary.pledgeFulfillmentRate).toBe(20); // 30k / 150k = 20%
    });
  });

  describe('Double-Entry Cashbook Running Balance', () => {
    it('correctly calculates sequential running balances for inflows and outflows', () => {
      const entries = [
        {
          date: '2026-02-01',
          type: 'inflow' as const,
          category: 'fees',
          description: 'Term 1 Fee Collections',
          sourceDocType: 'payment_receipt' as const,
          sourceDocRef: 'REC-2026-001',
          amount: 100000,
          currency: 'KES',
          reconciled: true,
        },
        {
          date: '2026-02-02',
          type: 'outflow' as const,
          category: 'provisions',
          description: 'Dry Maize & Beans (Kijabe Millers)',
          sourceDocType: 'payment_voucher' as const,
          sourceDocRef: 'PV-2026-018',
          amount: 35000,
          currency: 'KES',
          reconciled: true,
        },
        {
          date: '2026-02-03',
          type: 'inflow' as const,
          category: 'fees',
          description: 'M-Pesa STK Collections',
          sourceDocType: 'payment_receipt' as const,
          sourceDocRef: 'REC-2026-002',
          amount: 25000,
          currency: 'KES',
          reconciled: false,
        },
      ];

      const ledger = calculateCashbookLedger(entries, 50000); // 50,000 opening balance

      expect(ledger[0].runningBalance).toBe(150000); // 50k + 100k
      expect(ledger[1].runningBalance).toBe(115000); // 150k - 35k
      expect(ledger[2].runningBalance).toBe(140000); // 115k + 25k
    });

    it('rejects invalid or negative cashbook entry amounts', () => {
      const invalidEntries = [
        {
          date: '2026-02-01',
          type: 'inflow' as const,
          category: 'fees',
          description: 'Invalid',
          sourceDocType: 'payment_receipt' as const,
          sourceDocRef: 'REC-ERR',
          amount: -500,
          currency: 'KES',
          reconciled: false,
        },
      ];

      expect(() => calculateCashbookLedger(invalidEntries, 0)).toThrow('Invalid cashbook entry amount');
    });
  });

  describe('Parent Pledge Allocation & Fulfillment Tracking', () => {
    it('progressively updates pledge fulfillment status upon partial and full payment', () => {
      const initialPledge: ParentPledge = {
        id: 'PLG-001',
        studentId: 'STU-001',
        studentName: 'Faith Mutua',
        admissionNumber: 'ADM/2026/088',
        guardianName: 'Samuel Mutua',
        guardianPhone: '+254711223344',
        amountPledged: 40000,
        currency: 'KES',
        dueDate: '2026-03-15',
        status: 'pending',
        amountFulfilled: 0,
        balanceRemaining: 40000,
        recordedBy: 'bursar-1',
        recordedAt: '2026-01-15T08:00:00Z',
      };

      // 1. First partial payment of 15,000
      const partialPledge = allocatePaymentToPledge(
        initialPledge,
        15000,
        'REC-2026-045',
        'PAY-045',
        '2026-02-01'
      );

      expect(partialPledge.amountFulfilled).toBe(15000);
      expect(partialPledge.balanceRemaining).toBe(25000);
      expect(partialPledge.status).toBe('partially_fulfilled');
      expect(partialPledge.fulfillmentHistory).toHaveLength(1);
      expect(partialPledge.fulfillmentHistory?.[0].receiptNumber).toBe('REC-2026-045');

      // 2. Final payment of remaining 25,000
      const fulfilledPledge = allocatePaymentToPledge(
        partialPledge,
        25000,
        'REC-2026-090',
        'PAY-090',
        '2026-02-15'
      );

      expect(fulfilledPledge.amountFulfilled).toBe(40000);
      expect(fulfilledPledge.balanceRemaining).toBe(0);
      expect(fulfilledPledge.status).toBe('fulfilled');
      expect(fulfilledPledge.fulfillmentHistory).toHaveLength(2);
    });
  });

  describe('3-Tier Payment Voucher Governance Workflow', () => {
    it('allows bursar/principal to approve pending vouchers', () => {
      const check = canTransitionVoucher('pending_approval', 'approved', 'principal');
      expect(check.allowed).toBe(true);
    });

    it('rejects unauthorized roles from approving vouchers', () => {
      const check = canTransitionVoucher('pending_approval', 'approved', 'teacher');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Only authorized administrators or bursars');
    });

    it('prevents invalid status jumps (e.g. draft directly to paid)', () => {
      const check = canTransitionVoucher('draft', 'paid', 'bursar');
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Cannot transition voucher from 'draft' to 'paid'");
    });

    it('allows finance officer to mark approved voucher as paid', () => {
      const check = canTransitionVoucher('approved', 'paid', 'accountant');
      expect(check.allowed).toBe(true);
    });
  });

  describe('Aging Debtors Classification', () => {
    it('correctly maps overdue dates to aging buckets', () => {
      const asOf = '2026-04-15T00:00:00Z';

      // Due 10 days ago -> current (0-30 days)
      expect(categorizeDebtorAging('2026-04-05T00:00:00Z', asOf)).toBe('current');

      // Due 45 days ago -> 30_days bucket (31-60 days)
      expect(categorizeDebtorAging('2026-03-01T00:00:00Z', asOf)).toBe('30_days');

      // Due 75 days ago -> 60_days bucket (61-90 days)
      expect(categorizeDebtorAging('2026-01-30T00:00:00Z', asOf)).toBe('60_days');

      // Due 120 days ago -> 90_plus_days
      expect(categorizeDebtorAging('2025-12-16T00:00:00Z', asOf)).toBe('90_plus_days');
    });
  });

  describe('Payment Idempotency & Duplicate Prevention', () => {
    it('detects duplicate payment attempts with the same idempotency key', () => {
      const existingKeys = new Set(['inv_001_15000_REF123', 'inv_002_20000_REF456']);

      expect(checkDuplicatePayment(existingKeys, 'inv_001_15000_REF123')).toBe(true);
      expect(checkDuplicatePayment(existingKeys, 'inv_003_10000_REF789')).toBe(false);
    });
  });
});
