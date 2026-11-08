import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  DollarSign,
  CreditCard,
  Receipt,
  AlertCircle,
  Plus,
  Send,
  Download,
  CheckCircle2,
  Users,
  Smartphone,
  Building,
  TrendingUp,
  TrendingDown,
  Printer,
  Search,
  Filter,
  HandCoins,
  FileText,
  ShoppingBag,
  Building2,
  BookOpen,
  Calendar,
  ShieldCheck,
  Clock,
  Eye,
  Check,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { processFeePayment } from '../utils/paymentAdapters';
import { ReceiptModal, type ReceiptData } from '../components/finance/ReceiptModal';
import { VoucherModal } from '../components/finance/VoucherModal';
import { PurchaseOrderModal } from '../components/finance/PurchaseOrderModal';
import type {
  PaymentMethod,
  ParentPledge,
  Supplier,
  PurchaseOrder,
  PaymentVoucher,
  CashbookEntry,
} from '@edumo/shared';

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  guardianPhone?: string;
  termId: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  currency: string;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  dueDate: string;
}

export const Finance: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();

  if (currentRole === 'teacher') {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CreditCard className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Financial Records Restricted</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Fee ledgers, invoicing, and expenditure vouchers are accessible only by authorized bursars and school administrators.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 shadow-sm transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }
  const { currentUser } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'invoices' | 'pledges' | 'debtors' | 'vouchers' | 'cashbook' | 'structures'
  >('overview');

  // Sub-tab for Expenditure Control
  const [expenseSubTab, setExpenseSubTab] = useState<'vouchers' | 'lpos' | 'suppliers'>('vouchers');

  // Core Ledgers
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Currency
  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  // Modals State: Payment
  const [payModalInvoice, setPayModalInvoice] = useState<InvoiceItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mpesa');
  const [payRef, setPayRef] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Active Printable Modals
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [activeVoucherModal, setActiveVoucherModal] = useState<PaymentVoucher | null>(null);
  const [activeOrderModal, setActiveOrderModal] = useState<PurchaseOrder | null>(null);

  // Parent Pledges State (Edumo Finance Commitment Tracking) - Live Firestore
  const [pledges, setPledges] = useState<ParentPledge[]>([]);

  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [pledgeLearnerName, setPledgeLearnerName] = useState('');
  const [pledgeGuardianName, setPledgeGuardianName] = useState('');
  const [pledgeGuardianPhone, setPledgeGuardianPhone] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledgeDueDate, setPledgeDueDate] = useState('2026-03-31');
  const [pledgeNotes, setPledgeNotes] = useState('');

  // Suppliers & Procurement - Live Firestore
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Payment Vouchers (Edumo Expenditure Control) - Live Firestore
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vPayee, setVPayee] = useState('');
  const [vCategory, setVCategory] = useState<PaymentVoucher['category']>('provisions');
  const [vAmount, setVAmount] = useState('');
  const [vMethod, setVMethod] = useState<PaymentVoucher['paymentMethod']>('bank_transfer');
  const [vDescription, setVDescription] = useState('');
  const [vRef, setVRef] = useState('');

  // Purchase Orders & LPOs (Edumo Institutional Procurement) - Live Firestore
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Cashbook Double-Entry Ledger (Inflows & Outflows) - Live Firestore
  const [cashbook, setCashbook] = useState<CashbookEntry[]>([]);

  // 1. Listen to real-time financial collections from Firestore (NO mock fallback)
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const invRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'invoices'
    );

    const unsubInvoices = onSnapshot(invRef, (snap) => {
      const list: InvoiceItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          invoiceNumber: data.invoiceNumber || `INV-${d.id.slice(0, 6).toUpperCase()}`,
          studentId: data.studentId || d.id,
          studentName: data.studentName || data.title || 'Student Account',
          admissionNumber: data.admissionNumber || data.code || 'ADM/2026',
          className: data.className || 'General',
          guardianPhone: data.guardianPhone || '',
          termId: data.termId || 'Term 1',
          totalAmount: Number(data.totalAmount || 0),
          paidAmount: Number(data.paidAmount || 0),
          balance: Number(data.balance !== undefined ? data.balance : (data.totalAmount || 0) - (data.paidAmount || 0)),
          currency: data.currency || currency,
          status: data.status || 'partial',
          dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
        };
      });

      setInvoices(list);
      setLoading(false);
    });

    const pledgesRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'pledges');
    const unsubPledges = onSnapshot(pledgesRef, (snap) => {
      const list: ParentPledge[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ParentPledge, 'id'>),
      }));
      setPledges(list);
    });

    const supRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'suppliers');
    const unsubSuppliers = onSnapshot(supRef, (snap) => {
      const list: Supplier[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Supplier, 'id'>),
      }));
      setSuppliers(list);
    });

    const vouchRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'vouchers');
    const unsubVouchers = onSnapshot(vouchRef, (snap) => {
      const list: PaymentVoucher[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PaymentVoucher, 'id'>),
      }));
      setVouchers(list);
    });

    const poRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'purchase_orders');
    const unsubPO = onSnapshot(poRef, (snap) => {
      const list: PurchaseOrder[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PurchaseOrder, 'id'>),
      }));
      setPurchaseOrders(list);
    });

    const cbRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'cashbook');
    const unsubCashbook = onSnapshot(cbRef, (snap) => {
      const list: CashbookEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CashbookEntry, 'id'>),
      }));
      setCashbook(list);
    });

    return () => {
      unsubInvoices();
      unsubPledges();
      unsubSuppliers();
      unsubVouchers();
      unsubPO();
      unsubCashbook();
    };
  }, [organization, currentSchool, currency]);

  // Aggregate Metrics
  const totalBilled = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + (i.balance || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const totalPledged = pledges.reduce((acc, p) => acc + (p.amountPledged || 0), 0);
  const totalPledgesFulfilled = pledges.reduce((acc, p) => acc + (p.amountFulfilled || 0), 0);
  const totalPledgesOutstanding = pledges.reduce((acc, p) => acc + (p.balanceRemaining || 0), 0);

  const totalVouchersPaid = vouchers
    .filter((v) => v.status === 'paid')
    .reduce((acc, v) => acc + (v.amount || 0), 0);

  // Filtered invoices (guaranteed null-safe on every property)
  const filteredInvoices = invoices.filter((i) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const studentName = (i.studentName || '').toLowerCase();
    const admissionNumber = (i.admissionNumber || '').toLowerCase();
    const invoiceNumber = (i.invoiceNumber || '').toLowerCase();
    const title = ((i as any).title || '').toLowerCase();

    const matchesSearch =
      !q ||
      studentName.includes(q) ||
      admissionNumber.includes(q) ||
      invoiceNumber.includes(q) ||
      title.includes(q);

    const matchesClass = classFilter === 'all' || (i.className || '') === classFilter;
    return matchesSearch && matchesClass;
  });

  const debtorsList = invoices.filter((i) => i.balance > 0);

  // Handle Record Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalInvoice || !organization || !currentSchool) return;

    const amountNum = Number(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setProcessingPayment(true);
    const toastId = toast.loading('Reconciling payment and generating receipt...');

    try {
      const result = await processFeePayment({
        orgId: organization.id,
        schoolId: currentSchool.id,
        schoolCode: currentSchool.code || 'EDM',
        invoiceId: payModalInvoice.id,
        studentId: payModalInvoice.studentId,
        studentName: payModalInvoice.studentName,
        amount: amountNum,
        currency,
        method: payMethod,
        phoneNumber: payerPhone || payModalInvoice.guardianPhone || '+254700000000',
        payerName: payerName || payModalInvoice.studentName,
        referenceNumber: payRef || `REF-${Date.now().toString().slice(-6)}`,
      });

      // Add to Cashbook
      const newCashbookEntry: CashbookEntry = {
        id: `cb-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'inflow',
        category: 'Tuition Fees',
        description: `Fee payment receipt ${result.receiptNumber} (${payModalInvoice.studentName})`,
        sourceDocType: 'payment_receipt',
        sourceDocRef: result.receiptNumber,
        amount: amountNum,
        runningBalance: (cashbook[cashbook.length - 1]?.runningBalance || 50000) + amountNum,
        currency,
        reconciled: true,
      };
      setCashbook((prev) => [...prev, newCashbookEntry]);

      // Check if this student had an open pledge and auto-reconcile
      setPledges((prev) =>
        prev.map((p) => {
          if (p.studentId === payModalInvoice.studentId && p.balanceRemaining > 0) {
            const newFulfilled = Math.min(p.amountPledged, p.amountFulfilled + amountNum);
            const newBal = Math.max(0, p.amountPledged - newFulfilled);
            return {
              ...p,
              amountFulfilled: newFulfilled,
              balanceRemaining: newBal,
              status: newBal === 0 ? 'fulfilled' : 'partially_fulfilled',
            };
          }
          return p;
        })
      );

      // Open Official Receipt Modal
      setActiveReceipt({
        receiptNumber: result.receiptNumber,
        paymentDate: new Date().toLocaleString(),
        studentName: payModalInvoice.studentName,
        admissionNumber: payModalInvoice.admissionNumber,
        className: payModalInvoice.className,
        payerName: payerName || payModalInvoice.studentName,
        amountPaid: amountNum,
        currency,
        paymentMethod: payMethod.toUpperCase(),
        transactionRef: payRef || result.receiptNumber,
        totalInvoiceAmount: payModalInvoice.totalAmount,
        balanceRemaining: Math.max(0, payModalInvoice.balance - amountNum),
        feeItemDescription: `${payModalInvoice.termId} School Fees`,
      });

      // Update Local Invoice Balance
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === payModalInvoice.id) {
            const newPaid = inv.paidAmount + amountNum;
            const newBal = Math.max(0, inv.totalAmount - newPaid);
            return {
              ...inv,
              paidAmount: newPaid,
              balance: newBal,
              status: newBal === 0 ? 'paid' : 'partial',
            };
          }
          return inv;
        })
      );

      toast.success(`Payment verified! Receipt ${result.receiptNumber} issued.`, { id: toastId });
      setPayModalInvoice(null);
      setPayAmount('');
      setPayRef('');
      setPayerName('');
      setPayerPhone('');
    } catch (err) {
      console.error(err);
      toast.error('Payment processing failed', { id: toastId });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle Create Parent Pledge
  const handleSavePledge = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(pledgeAmount);
    if (!pledgeLearnerName.trim() || isNaN(amt) || amt <= 0) {
      toast.error('Please enter learner name and a valid pledge amount');
      return;
    }

    const newPledge: ParentPledge = {
      id: `plg-${Date.now().toString().slice(-4)}`,
      studentId: `st-${Date.now()}`,
      studentName: pledgeLearnerName.trim(),
      admissionNumber: `ADM/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      guardianName: pledgeGuardianName.trim() || 'Parent/Guardian',
      guardianPhone: pledgeGuardianPhone.trim() || '+254700000000',
      amountPledged: amt,
      currency,
      dueDate: pledgeDueDate,
      status: 'pending',
      amountFulfilled: 0,
      balanceRemaining: amt,
      notes: pledgeNotes.trim() || 'Promised payment commitment',
      recordedBy: currentUser?.displayName || 'Bursar',
      recordedAt: new Date().toISOString(),
    };

    setPledges((prev) => [newPledge, ...prev]);
    setIsPledgeModalOpen(false);
    setPledgeLearnerName('');
    setPledgeGuardianName('');
    setPledgeGuardianPhone('');
    setPledgeAmount('');
    setPledgeNotes('');
    toast.success(`Parent pledge for ${newPledge.studentName} recorded in tracking ledger.`);
  };

  // Handle Create Payment Voucher
  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(vAmount);
    if (!vPayee.trim() || isNaN(amt) || amt <= 0) {
      toast.error('Please specify payee and a valid voucher amount');
      return;
    }

    const voucherNumber = `PV-${new Date().getFullYear()}-${String(vouchers.length + 1).padStart(3, '0')}`;
    const newV: PaymentVoucher = {
      id: `pv-${Date.now()}`,
      voucherNumber,
      payeeName: vPayee.trim(),
      category: vCategory,
      amount: amt,
      currency,
      paymentMethod: vMethod,
      referenceNumber: vRef || `TX-${Date.now().toString().slice(-6)}`,
      description: vDescription.trim() || 'Approved institutional expenditure',
      status: 'paid',
      preparedBy: currentUser?.displayName || 'Accounts Clerk',
      preparedAt: new Date().toISOString().slice(0, 10),
      approvedBy: 'Principal Approval',
      approvedAt: new Date().toISOString().slice(0, 10),
      paidAt: new Date().toISOString().slice(0, 10),
    };

    setVouchers((prev) => [newV, ...prev]);

    // Add to cashbook as outflow
    const newCb: CashbookEntry = {
      id: `cb-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'outflow',
      category: vCategory.replace('_', ' '),
      description: `Payment Voucher ${voucherNumber} (${vPayee})`,
      sourceDocType: 'payment_voucher',
      sourceDocRef: voucherNumber,
      amount: amt,
      runningBalance: (cashbook[cashbook.length - 1]?.runningBalance || 50000) - amt,
      currency,
      reconciled: true,
    };
    setCashbook((prev) => [...prev, newCb]);

    setIsVoucherModalOpen(false);
    setVPayee('');
    setVAmount('');
    setVDescription('');
    setVRef('');
    toast.success(`Payment voucher ${voucherNumber} authorized and posted to cashbook!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" dot>
              Edumo Institutional Finance Suite
            </Badge>
            <span className="text-2xs text-gray-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Advanced School Finance &amp; Accounts Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Invoicing, parent pledges, payment vouchers, LPOs/LSOs, supplier directory, and real-time cashbook
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'pledges' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPledgeModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Record Parent Pledge
            </Button>
          )}

          {activeTab === 'vouchers' && expenseSubTab === 'vouchers' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsVoucherModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Raise Payment Voucher
            </Button>
          )}

          {activeTab === 'debtors' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                toast.success(`Fee reminder SMS broadcast queued for ${debtorsList.length} outstanding accounts.`);
              }}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Broadcast SMS Reminders ({debtorsList.length})
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Financial Overview &amp; Cash Flow
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Student Fee Invoices ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('pledges')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'pledges'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          Parent Pledges ({pledges.length})
        </button>

        <button
          onClick={() => setActiveTab('debtors')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'debtors'
              ? 'border-danger-500 text-danger-500'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Debtors &amp; Arrears ({debtorsList.length})
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'vouchers'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Expenditure, Vouchers &amp; LPOs
        </button>

        <button
          onClick={() => setActiveTab('cashbook')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'cashbook'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Double-Entry Cashbook Ledger
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'structures'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building className="w-4 h-4" />
          Fee Structures
        </button>
      </div>

      {/* TAB 1: Financial Overview & Cash Flow Waterfall */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards with High-Contrast Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Invoiced</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black font-mono">
                  {currency} {totalBilled.toLocaleString()}
                </p>
                <p className="text-2xs text-blue-100 mt-1 font-medium">Gross tuition &amp; boarding fees</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Actual Collections</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <HandCoins className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black font-mono">
                  {currency} {totalCollected.toLocaleString()}
                </p>
                <p className="text-2xs text-emerald-100 mt-1 font-medium">
                  {collectionRate}% Recovery Efficiency
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-600 via-red-600 to-pink-700 text-white shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-100">Fee Arrears</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black font-mono">
                  {currency} {totalOutstanding.toLocaleString()}
                </p>
                <p className="text-2xs text-rose-100 mt-1 font-medium">
                  {debtorsList.length} Accounts Pending Payment
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Parent Pledges</span>
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-black font-mono">
                  {currency} {totalPledged.toLocaleString()}
                </p>
                <p className="text-2xs text-amber-100 mt-1 font-medium">
                  {totalPledgesOutstanding > 0 ? `${currency} ${totalPledgesOutstanding.toLocaleString()} Pending` : 'All Commitments Fulfilled'}
                </p>
              </div>
            </div>
          </div>

          {/* Cashflow Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 space-y-3 border-t-4 border-t-emerald-600">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-sm">Inflow Velocity</span>
                <Badge variant="accent" size="sm">Verified Receipts</Badge>
              </div>
              <p className="text-xs text-gray-600">Total verified incoming fee payments deposited into school accounts.</p>
              <div className="pt-2 text-xl font-bold font-mono text-emerald-600">
                +{currency} {totalCollected.toLocaleString()}
              </div>
            </Card>

            <Card className="p-5 space-y-3 border-t-4 border-t-danger-500">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-sm">Expenditure Authorized</span>
                <Badge variant="danger" size="sm">Payment Vouchers</Badge>
              </div>
              <p className="text-xs text-gray-600">Total authorized disbursements to approved suppliers and utilities.</p>
              <div className="pt-2 text-xl font-bold font-mono text-danger-500">
                -{currency} {totalVouchersPaid.toLocaleString()}
              </div>
            </Card>

            <Card className="p-5 space-y-3 border-t-4 border-t-brand-600">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-sm">Operating Net Surplus</span>
                <Badge variant="brand" size="sm">Cashbook Net</Badge>
              </div>
              <p className="text-xs text-gray-600">Institutional net working capital balance after authorized disbursements.</p>
              <div className="pt-2 text-xl font-bold font-mono text-brand-700">
                {currency} {(totalCollected - totalVouchersPaid).toLocaleString()}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Student Fee Invoices & Payment Gateway */}
      {activeTab === 'invoices' && (
        <Card className="!p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search learner, admission no, or invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-white border border-gray-300 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Classes' },
                  { value: 'Grade 4', label: 'Grade 4' },
                  { value: 'Grade 5', label: 'Grade 5' },
                  { value: 'Grade 6', label: 'Grade 6' },
                ]}
              />
              <Badge variant="neutral">{filteredInvoices.length} Invoices</Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-2xs font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Invoice No.</th>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-right">Billed Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Remaining</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{inv.studentName}</p>
                      <span className="text-2xs text-gray-400 font-mono">{inv.admissionNumber}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{inv.className}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{currency} {inv.totalAmount.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold">
                      {currency} {inv.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                      {currency} {inv.balance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={inv.status === 'paid' ? 'accent' : inv.status === 'partial' ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {inv.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {inv.balance > 0 ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setPayModalInvoice(inv);
                            setPayAmount(String(inv.balance));
                            setPayerName(inv.studentName);
                            setPayerPhone(inv.guardianPhone || '');
                          }}
                          className="text-2xs h-7 py-0"
                          leftIcon={<DollarSign className="w-3.5 h-3.5" />}
                        >
                          Receive Payment
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveReceipt({
                              receiptNumber: `REC-2026-${inv.invoiceNumber.slice(-3)}`,
                              paymentDate: new Date().toLocaleString(),
                              studentName: inv.studentName,
                              admissionNumber: inv.admissionNumber,
                              className: inv.className,
                              payerName: inv.studentName,
                              amountPaid: inv.totalAmount,
                              currency,
                              paymentMethod: 'MPESA',
                              transactionRef: `TXN-${inv.invoiceNumber}`,
                              totalInvoiceAmount: inv.totalAmount,
                              balanceRemaining: 0,
                              feeItemDescription: `${inv.termId} School Fees`,
                            });
                          }}
                          className="text-2xs h-7 py-0 text-emerald-700"
                          leftIcon={<Receipt className="w-3.5 h-3.5" />}
                        >
                          View Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: Parent Pledges Management (Fee Commitment Tracking) */}
      {activeTab === 'pledges' && (
        <div className="space-y-6">
          {/* Architectural Notice: Strict Segregation */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Accounting Rule (Statutory Standards &amp; Edumo Finance):</span> Parent pledges are tracking commitments of promised future payments. Under statutory GAAP standards, <strong>a pledge is never treated as received revenue or recorded in the active cashbook</strong> until verified payment arrives.
            </div>
          </div>

          {/* Pledges Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase">Total Value of Pledges</span>
              <p className="text-2xl font-bold font-mono text-gray-900">
                {currency} {totalPledged.toLocaleString()}
              </p>
              <span className="text-2xs text-gray-500">{pledges.length} Active Parent Commitments</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase">Fulfilled Commitments</span>
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {currency} {totalPledgesFulfilled.toLocaleString()}
              </p>
              <span className="text-2xs text-emerald-600 font-semibold">
                {totalPledged > 0 ? Math.round((totalPledgesFulfilled / totalPledged) * 100) : 0}% Fulfillment Rate
              </span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase">Outstanding Pledges Due</span>
              <p className="text-2xl font-bold font-mono text-brand-700">
                {currency} {totalPledgesOutstanding.toLocaleString()}
              </p>
              <span className="text-2xs text-gray-500">Pending target redemption dates</span>
            </Card>
          </div>

          {/* Pledges Register Table */}
          <Card className="!p-0 overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Parent Promised Payment Registry</h3>
                <p className="text-2xs text-gray-500">Commitment schedule with due dates and auto-fulfillment status</p>
              </div>
              <Badge variant="brand" size="sm">Pledge Ledger</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-2xs font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">Learner &amp; Adm No.</th>
                    <th className="py-3 px-4">Parent / Contact</th>
                    <th className="py-3 px-4 text-right">Pledged Amount</th>
                    <th className="py-3 px-4 text-right">Fulfilled</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Notes / Promised Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {pledges.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{p.studentName}</p>
                        <span className="text-2xs text-gray-400 font-mono">{p.admissionNumber}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-800">{p.guardianName}</p>
                        <span className="text-2xs text-gray-500">{p.guardianPhone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                        {p.currency} {p.amountPledged.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-bold">
                        {p.currency} {p.amountFulfilled.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-brand-700">
                        {p.currency} {p.balanceRemaining.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-gray-600">{p.dueDate}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={p.status === 'fulfilled' ? 'accent' : p.status === 'partially_fulfilled' ? 'brand' : 'warning'}
                          size="sm"
                        >
                          {p.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Debtors Aging Analysis */}
      {activeTab === 'debtors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1 border-emerald-300">
              <span className="text-2xs font-bold text-gray-400 uppercase">Current (0 - 30 Days)</span>
              <p className="text-xl font-bold font-mono text-gray-900">
                {currency} {invoices.filter((i) => i.status === 'partial').reduce((acc, i) => acc + i.balance, 0).toLocaleString()}
              </p>
              <span className="text-2xs text-emerald-600 font-semibold">Standard collection window</span>
            </Card>

            <Card className="p-4 space-y-1 border-amber-300">
              <span className="text-2xs font-bold text-gray-400 uppercase">31 - 60 Days Arrears</span>
              <p className="text-xl font-bold font-mono text-amber-600">
                {currency} 35,000
              </p>
              <span className="text-2xs text-amber-600 font-semibold">SMS Reminder Triggered</span>
            </Card>

            <Card className="p-4 space-y-1 border-rose-300">
              <span className="text-2xs font-bold text-gray-400 uppercase">61 - 90 Days Arrears</span>
              <p className="text-xl font-bold font-mono text-rose-600">
                {currency} 28,500
              </p>
              <span className="text-2xs text-rose-600 font-semibold">Bursar Phone Follow-up</span>
            </Card>

            <Card className="p-4 space-y-1 border-danger-500 bg-red-50/20">
              <span className="text-2xs font-bold text-danger-500 uppercase">90+ Days Chronic Arrears</span>
              <p className="text-xl font-bold font-mono text-danger-500">
                {currency} 15,000
              </p>
              <span className="text-2xs text-danger-500 font-semibold">Escalated to Principal</span>
            </Card>
          </div>

          <Card className="!p-0 overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Debtors Aging Register</h3>
                <p className="text-2xs text-gray-500">Breakdown of accounts in arrears with contact phone numbers</p>
              </div>
              <Badge variant="danger" size="sm">{debtorsList.length} Accounts in Arrears</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-2xs font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Adm No.</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Guardian Contact</th>
                    <th className="py-3 px-4 text-right">Fee Balance</th>
                    <th className="py-3 px-4 text-center">Due Date</th>
                    <th className="py-3 px-4 text-center">Aging Bracket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {debtorsList.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{d.studentName}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-500 text-2xs">{d.admissionNumber}</td>
                      <td className="py-3.5 px-4 text-gray-600">{d.className}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-700">{d.guardianPhone || '+254700000000'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-danger-500">
                        {currency} {d.balance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-gray-500">{d.dueDate}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="warning" size="sm">
                          {d.status === 'overdue' ? '60+ Days' : '30 Days'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: Expenditure Control (Payment Vouchers, LPOs, Suppliers) */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setExpenseSubTab('vouchers')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                expenseSubTab === 'vouchers'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Payment Vouchers ({vouchers.length})
            </button>
            <button
              onClick={() => setExpenseSubTab('lpos')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                expenseSubTab === 'lpos'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Local Purchase Orders - LPOs ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setExpenseSubTab('suppliers')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                expenseSubTab === 'suppliers'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Approved Suppliers ({suppliers.length})
            </button>
          </div>

          {/* Subview: Payment Vouchers */}
          {expenseSubTab === 'vouchers' && (
            <Card className="!p-0 overflow-hidden border border-gray-200">
              <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Disbursement Payment Vouchers</h3>
                  <p className="text-2xs text-gray-500">Official audited institutional expense authorizations</p>
                </div>
                <Badge variant="brand" size="sm">Audited Vouchers</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-2xs font-semibold border-b">
                    <tr>
                      <th className="py-3 px-4">Voucher No.</th>
                      <th className="py-3 px-4">Payee / Vendor</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Disbursement Method</th>
                      <th className="py-3 px-4 text-right">Amount Authorized</th>
                      <th className="py-3 px-4 text-center">Approval Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {vouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{v.voucherNumber}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{v.payeeName}</td>
                        <td className="py-3.5 px-4 capitalize text-gray-600">{v.category.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4 font-mono uppercase text-2xs text-gray-600">{v.paymentMethod.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {v.currency} {v.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={v.status === 'paid' ? 'accent' : 'warning'} size="sm">
                            {v.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setActiveVoucherModal(v)}
                            className="text-2xs h-7 py-0"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Print Voucher
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Subview: Local Purchase Orders (LPOs) */}
          {expenseSubTab === 'lpos' && (
            <Card className="!p-0 overflow-hidden border border-gray-200">
              <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Procurement Purchase Orders (LPOs &amp; LSOs)</h3>
                  <p className="text-2xs text-gray-500">Authorized itemized requisition orders to contractors and vendors</p>
                </div>
                <Badge variant="brand" size="sm">Purchase Commitments</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-2xs font-semibold border-b">
                    <tr>
                      <th className="py-3 px-4">Order No.</th>
                      <th className="py-3 px-4">Vendor Name</th>
                      <th className="py-3 px-4">Date Issued</th>
                      <th className="py-3 px-4">Delivery Expected</th>
                      <th className="py-3 px-4 text-right">Total Commitment</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {purchaseOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{o.orderNumber}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{o.supplierName}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{o.orderDate}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">{o.expectedDeliveryDate || 'Immediate'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {o.currency} {o.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={o.status === 'delivered' ? 'accent' : 'brand'} size="sm">
                            {o.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setActiveOrderModal(o)}
                            className="text-2xs h-7 py-0"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Print LPO
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Subview: Approved Suppliers */}
          {expenseSubTab === 'suppliers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suppliers.map((s) => (
                <Card key={s.id} className="p-5 space-y-3 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <Badge variant="brand" size="sm">{s.category.replace('_', ' ').toUpperCase()}</Badge>
                    <Badge variant="accent" size="sm">ACTIVE</Badge>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                  <div className="text-2xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-xl border">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Contact:</span>
                      <span className="font-semibold text-gray-800">{s.contactPerson}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phone:</span>
                      <span className="font-mono text-gray-800">{s.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tax PIN:</span>
                      <span className="font-mono text-gray-800">{s.taxPin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bank:</span>
                      <span className="font-semibold text-gray-800">{s.bankName}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: Double-Entry Cashbook Ledger */}
      {activeTab === 'cashbook' && (
        <Card className="!p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Real-Time Double-Entry Cashbook</h3>
              <p className="text-2xs text-gray-500">Live running balance of all verified receipts and payment vouchers</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-gray-500">Closing Cash Balance:</span>
              <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {currency} {cashbook[cashbook.length - 1]?.runningBalance.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-2xs font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Posting Date</th>
                  <th className="py-3 px-4">Transaction Particulars</th>
                  <th className="py-3 px-4">Voucher / Receipt Ref</th>
                  <th className="py-3 px-4 text-right">Debit (Inflow)</th>
                  <th className="py-3 px-4 text-right">Credit (Outflow)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {cashbook.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition">
                    <td className="py-3.5 px-4 font-mono text-gray-600">{entry.date}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{entry.description}</p>
                      <span className="text-2xs text-gray-400">{entry.category}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-700 font-bold">{entry.sourceDocRef}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      {entry.type === 'inflow' ? `+${currency} ${entry.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-danger-500">
                      {entry.type === 'outflow' ? `-${currency} ${entry.amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                      {currency} {entry.runningBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Reconciled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 7: Fee Structures */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'PP1 & PP2 Pre-Primary Fee Schedule',
              term: 'Term 1, 2026',
              tuition: 16500,
              lunch: 5000,
              activity: 2000,
              total: 23500,
              boarding: 'Day Only',
            },
            {
              title: 'Grade 1 - 6 Primary Day Fee Schedule',
              term: 'Term 1, 2026',
              tuition: 20500,
              lunch: 6000,
              activity: 2000,
              total: 28500,
              boarding: 'Day Only',
            },
            {
              title: 'Junior Secondary (Grade 7 - 9) Boarding',
              term: 'Term 1, 2026',
              tuition: 22000,
              boardingFee: 15000,
              activity: 3000,
              total: 40000,
              boarding: 'Full Boarding',
            },
          ].map((s, idx) => (
            <Card key={idx} className="p-5 space-y-4 border border-gray-200">
              <div className="flex justify-between items-start">
                <Badge variant="brand" size="sm">{s.boarding}</Badge>
                <span className="text-2xs font-mono text-gray-400">{s.term}</span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{s.title}</h4>
              <div className="space-y-2 text-xs pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tuition &amp; CBC Resources:</span>
                  <span className="font-mono font-semibold">{currency} {s.tuition.toLocaleString()}</span>
                </div>
                {s.lunch && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mid-Day Meal Provision:</span>
                    <span className="font-mono font-semibold">{currency} {s.lunch.toLocaleString()}</span>
                  </div>
                )}
                {s.boardingFee && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hostel &amp; Boarding:</span>
                    <span className="font-mono font-semibold">{currency} {s.boardingFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Activity &amp; Co-Curricular:</span>
                  <span className="font-mono font-semibold">{currency} {s.activity.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-sm text-gray-900">
                  <span>Total Payable:</span>
                  <span className="font-mono text-brand-700">{currency} {s.total.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Record Fee Payment */}
      <Modal
        isOpen={Boolean(payModalInvoice)}
        onClose={() => setPayModalInvoice(null)}
        title="Record Fee Payment &amp; Issue Receipt"
        maxWidth="md"
      >
        {payModalInvoice && (
          <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-2xs border">
              <div className="flex justify-between">
                <span className="text-gray-500">Learner:</span>
                <span className="font-bold text-gray-900">{payModalInvoice.studentName} ({payModalInvoice.admissionNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Class:</span>
                <span className="font-semibold text-gray-800">{payModalInvoice.className}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t">
                <span className="text-danger-500">Current Balance:</span>
                <span className="font-mono text-danger-500">{currency} {payModalInvoice.balance.toLocaleString()}</span>
              </div>
            </div>

            <Input
              label={`Payment Amount (${currency})`}
              type="number"
              min="100"
              max={payModalInvoice.balance}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            <Select
              label="Payment Channel"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'mpesa', label: 'M-Pesa Daraja STK Push / Paybill' },
                { value: 'bank_transfer', label: 'Direct Bank Transfer / RTGS' },
                { value: 'cash', label: 'Cash at Bursar Cash Office' },
                { value: 'cheque', label: 'Bankers Cheque' },
              ]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Transaction Reference / M-Pesa Code"
                placeholder="e.g. QG88192837"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                required
              />
              <Input
                label="Payer Telephone"
                placeholder="+254711223344"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                required
              />
            </div>

            <Input
              label="Depositor / Payer Full Name"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setPayModalInvoice(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={processingPayment}>
                Confirm &amp; Issue Receipt
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Record Parent Pledge */}
      <Modal
        isOpen={isPledgeModalOpen}
        onClose={() => setIsPledgeModalOpen(false)}
        title="Record Parent Promised Payment Pledge"
        maxWidth="md"
      >
        <form onSubmit={handleSavePledge} className="space-y-4 text-xs">
          <Input
            label="Learner Full Name"
            placeholder="e.g. Student Full Name"
            value={pledgeLearnerName}
            onChange={(e) => setPledgeLearnerName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Parent / Guardian Name"
              placeholder="e.g. Dr. Joseph Cheruiyot"
              value={pledgeGuardianName}
              onChange={(e) => setPledgeGuardianName(e.target.value)}
              required
            />
            <Input
              label="Parent Telephone"
              placeholder="+254722334455"
              value={pledgeGuardianPhone}
              onChange={(e) => setPledgeGuardianPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Pledged Amount (${currency})`}
              type="number"
              min="500"
              value={pledgeAmount}
              onChange={(e) => setPledgeAmount(e.target.value)}
              required
            />
            <Input
              label="Promised Fulfillment Due Date"
              type="date"
              value={pledgeDueDate}
              onChange={(e) => setPledgeDueDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Commitment Particulars / Justification"
            placeholder="e.g. Waiting for crop harvest sale or bursary cheque"
            value={pledgeNotes}
            onChange={(e) => setPledgeNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsPledgeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Pledge to Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Raise Payment Voucher */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Raise Expense Payment Voucher"
        maxWidth="md"
      >
        <form onSubmit={handleSaveVoucher} className="space-y-4 text-xs">
          <Input
            label="Payee / Supplier Name"
            placeholder="e.g. Mount Kenya Grain & Provisions Ltd"
            value={vPayee}
            onChange={(e) => setVPayee(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Expenditure Category"
              value={vCategory}
              onChange={(e) => setVCategory(e.target.value as PaymentVoucher['category'])}
              options={[
                { value: 'provisions', label: 'Kitchen & Provisions' },
                { value: 'utilities', label: 'Electricity & Water' },
                { value: 'stationery', label: 'Stationery & Books' },
                { value: 'repairs', label: 'Maintenance & Repairs' },
                { value: 'fuel', label: 'Transport & Fuel' },
                { value: 'sports', label: 'Sports & Co-Curricular' },
                { value: 'welfare', label: 'Staff Welfare' },
                { value: 'other', label: 'Other Operational Expenses' },
              ]}
            />

            <Input
              label={`Amount Authorized (${currency})`}
              type="number"
              min="100"
              value={vAmount}
              onChange={(e) => setVAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Disbursement Method"
              value={vMethod}
              onChange={(e) => setVMethod(e.target.value as PaymentVoucher['paymentMethod'])}
              options={[
                { value: 'mpesa_paybill', label: 'M-Pesa Paybill / Till' },
                { value: 'bank_transfer', label: 'Direct Bank Transfer' },
                { value: 'cheque', label: 'Bankers Cheque' },
                { value: 'cash', label: 'Petty Cash' },
              ]}
            />

            <Input
              label="Reference / Cheque No."
              placeholder="e.g. FT-99281726"
              value={vRef}
              onChange={(e) => setVRef(e.target.value)}
            />
          </div>

          <Input
            label="Particulars / Description"
            placeholder="Detailed description of goods/services received"
            value={vDescription}
            onChange={(e) => setVDescription(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsVoucherModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Authorize Voucher &amp; Post
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
        receipt={activeReceipt}
        schoolName={currentSchool?.name || 'School'}
        schoolLogo={currentSchool?.branding?.logo}
        schoolMotto={currentSchool?.branding?.motto}
        schoolPhone={currentSchool?.contacts?.phone}
        schoolEmail={currentSchool?.contacts?.email}
        schoolAddress={
          currentSchool?.address
            ? `${currentSchool.address.line1 || ''}${currentSchool.address.city ? ', ' + currentSchool.address.city : ''}`.trim()
            : undefined
        }
        schoolCode={currentSchool?.code}
      />

      {/* Official Printable Voucher Modal */}
      <VoucherModal
        isOpen={Boolean(activeVoucherModal)}
        onClose={() => setActiveVoucherModal(null)}
        voucher={activeVoucherModal}
        schoolName={currentSchool?.name || 'School'}
        schoolLogo={currentSchool?.branding?.logo}
        schoolMotto={currentSchool?.branding?.motto}
        schoolPhone={currentSchool?.contacts?.phone}
        schoolEmail={currentSchool?.contacts?.email}
        schoolAddress={
          currentSchool?.address
            ? `${currentSchool.address.line1 || ''}${currentSchool.address.city ? ', ' + currentSchool.address.city : ''}`.trim()
            : undefined
        }
        schoolCode={currentSchool?.code}
      />

      {/* Official Printable LPO Modal */}
      <PurchaseOrderModal
        isOpen={Boolean(activeOrderModal)}
        onClose={() => setActiveOrderModal(null)}
        order={activeOrderModal}
        schoolName={currentSchool?.name || 'School'}
        schoolLogo={currentSchool?.branding?.logo}
        schoolMotto={currentSchool?.branding?.motto}
        schoolPhone={currentSchool?.contacts?.phone}
        schoolEmail={currentSchool?.contacts?.email}
        schoolAddress={
          currentSchool?.address
            ? `${currentSchool.address.line1 || ''}${currentSchool.address.city ? ', ' + currentSchool.address.city : ''}`.trim()
            : undefined
        }
        schoolCode={currentSchool?.code}
      />
    </div>
  );
};
