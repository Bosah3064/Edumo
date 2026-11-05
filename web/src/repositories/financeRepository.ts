// ============================================================
// EDUMO — Advanced School Finance Repository
// Directive Section 3, 4, 5, 10
// Manages fee structures, invoices, pledges, vouchers, LPOs, suppliers & cashbook
// Enforces local-first cached reading, bounded queries, and server-side payment safety.
// ============================================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  ParentPledge,
  Supplier,
  PurchaseOrder,
  PaymentVoucher,
  CashbookEntry,
  Invoice,
} from '@edumo/shared';
import { cacheLocalItem, getLocalItem } from '../services/indexedDbStorage';

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Fetch school Parent Pledges (cached locally, segregated from cashbook)
 */
export async function getSchoolPledges(
  orgId: string,
  schoolId: string,
  statusFilter?: string
): Promise<ParentPledge[]> {
  const cacheKey = `pledges_${statusFilter || 'all'}`;
  const cached = await getLocalItem<ParentPledge[]>(orgId, schoolId, 'pledges', cacheKey);
  if (cached) return cached;

  const dedupKey = `${orgId}:${schoolId}:${cacheKey}`;
  if (inFlight.has(dedupKey)) {
    return inFlight.get(dedupKey) as Promise<ParentPledge[]>;
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'pledges');
      let q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
      if (statusFilter && statusFilter !== 'all') {
        q = query(colRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(100));
      }
      const snap = await getDocs(q);
      const pledges: ParentPledge[] = [];
      snap.forEach((d) => pledges.push({ id: d.id, ...(d.data() as ParentPledge) }));

      await cacheLocalItem(orgId, schoolId, 'pledges', cacheKey, pledges, 10 * 60 * 1000);
      return pledges;
    } catch (err) {
      console.warn('[FinanceRepo] Failed to fetch pledges from Firestore:', err);
      return [];
    } finally {
      inFlight.delete(dedupKey);
    }
  })();

  inFlight.set(dedupKey, promise);
  return promise;
}

/**
 * Record a new Parent Pledge
 */
export async function recordParentPledge(
  orgId: string,
  schoolId: string,
  pledge: Omit<ParentPledge, 'id' | 'createdAt'>
): Promise<ParentPledge> {
  const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'pledges');
  const newDoc = doc(colRef);
  const data: ParentPledge = {
    ...pledge,
    id: newDoc.id,
    createdAt: new Date().toISOString(),
  };

  await setDoc(newDoc, {
    ...data,
    createdAt: serverTimestamp(),
  });

  return data;
}

/**
 * Fetch Payment Vouchers with multi-tier workflow status
 */
export async function getPaymentVouchers(
  orgId: string,
  schoolId: string,
  statusFilter?: string
): Promise<PaymentVoucher[]> {
  const cacheKey = `vouchers_${statusFilter || 'all'}`;
  const cached = await getLocalItem<PaymentVoucher[]>(orgId, schoolId, 'vouchers', cacheKey);
  if (cached) return cached;

  const dedupKey = `${orgId}:${schoolId}:${cacheKey}`;
  if (inFlight.has(dedupKey)) {
    return inFlight.get(dedupKey) as Promise<PaymentVoucher[]>;
  }

  const promise = (async () => {
    try {
      const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'paymentVouchers');
      let q = query(colRef, orderBy('preparedAt', 'desc'), limit(100));
      if (statusFilter && statusFilter !== 'all') {
        q = query(colRef, where('status', '==', statusFilter), orderBy('preparedAt', 'desc'), limit(100));
      }
      const snap = await getDocs(q);
      const vouchers: PaymentVoucher[] = [];
      snap.forEach((d) => vouchers.push({ id: d.id, ...(d.data() as PaymentVoucher) }));

      await cacheLocalItem(orgId, schoolId, 'vouchers', cacheKey, vouchers, 10 * 60 * 1000);
      return vouchers;
    } catch (err) {
      console.warn('[FinanceRepo] Failed to fetch vouchers:', err);
      return [];
    } finally {
      inFlight.delete(dedupKey);
    }
  })();

  inFlight.set(dedupKey, promise);
  return promise;
}

/**
 * Transition Payment Voucher status (e.g. Draft -> Pending -> Approved -> Paid)
 */
export async function updateVoucherStatus(
  orgId: string,
  schoolId: string,
  voucherId: string,
  status: PaymentVoucher['status'],
  actorName: string
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId, 'schools', schoolId, 'paymentVouchers', voucherId);
  const updatePayload: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'approved') {
    updatePayload.approvedBy = actorName;
    updatePayload.approvedAt = new Date().toISOString();
  } else if (status === 'paid') {
    updatePayload.paidAt = new Date().toISOString();
  }

  await updateDoc(docRef, updatePayload);
}

/**
 * Fetch Suppliers Registry
 */
export async function getSuppliers(orgId: string, schoolId: string): Promise<Supplier[]> {
  const cached = await getLocalItem<Supplier[]>(orgId, schoolId, 'suppliers', 'all');
  if (cached) return cached;

  try {
    const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'suppliers');
    const snap = await getDocs(query(colRef, where('status', '==', 'active'), limit(100)));
    const suppliers: Supplier[] = [];
    snap.forEach((d) => suppliers.push({ id: d.id, ...(d.data() as Supplier) }));
    await cacheLocalItem(orgId, schoolId, 'suppliers', 'all', suppliers, 30 * 60 * 1000);
    return suppliers;
  } catch (err) {
    console.warn('[FinanceRepo] Failed to fetch suppliers:', err);
    return [];
  }
}

/**
 * Fetch Purchase Orders (LPO/LSO)
 */
export async function getPurchaseOrders(orgId: string, schoolId: string): Promise<PurchaseOrder[]> {
  const cached = await getLocalItem<PurchaseOrder[]>(orgId, schoolId, 'purchaseOrders', 'all');
  if (cached) return cached;

  try {
    const colRef = collection(db, 'organizations', orgId, 'schools', schoolId, 'purchaseOrders');
    const snap = await getDocs(query(colRef, orderBy('orderDate', 'desc'), limit(100)));
    const orders: PurchaseOrder[] = [];
    snap.forEach((d) => orders.push({ id: d.id, ...(d.data() as PurchaseOrder) }));
    await cacheLocalItem(orgId, schoolId, 'purchaseOrders', 'all', orders, 15 * 60 * 1000);
    return orders;
  } catch (err) {
    console.warn('[FinanceRepo] Failed to fetch purchase orders:', err);
    return [];
  }
}

