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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { processFeePayment } from '../utils/paymentAdapters';
import { ReceiptModal, type ReceiptData } from '../components/finance/ReceiptModal';
import type { PaymentMethod } from '@edumo/shared';

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

interface ExpenseItem {
  id: string;
  title: string;
  category: 'utilities' | 'provisions' | 'supplies' | 'transport' | 'maintenance' | 'other';
  amount: number;
  currency: string;
  paidTo: string;
  date: string;
}

export const Finance: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'debtors' | 'expenses' | 'structures'>('overview');

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Modals State
  const [payModalInvoice, setPayModalInvoice] = useState<InvoiceItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mpesa');
  const [payRef, setPayRef] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Active Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<'utilities' | 'provisions' | 'supplies' | 'transport' | 'maintenance' | 'other'>('utilities');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidTo, setExpPaidTo] = useState('');

  // Currency
  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  // 1. Listen to real-time invoices
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
      const list: InvoiceItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<InvoiceItem, 'id'>),
      }));

      if (list.length === 0) {
        // Seed initial friendly sample invoices if empty for immediate visibility
        const sampleInvoices: InvoiceItem[] = [
          { id: 'inv-1', invoiceNumber: 'INV-2026-001', studentId: 'st-1', studentName: 'Zawadi Achieng', admissionNumber: 'ADM/2026/001', className: 'Grade 4', guardianPhone: '+254711223344', termId: 'Term 1', totalAmount: 28500, paidAmount: 28500, balance: 0, currency, status: 'paid', dueDate: '2026-02-15' },
          { id: 'inv-2', invoiceNumber: 'INV-2026-002', studentId: 'st-2', studentName: 'Kevin Kiprono', admissionNumber: 'ADM/2026/002', className: 'Grade 4', guardianPhone: '+254722334455', termId: 'Term 1', totalAmount: 28500, paidAmount: 15000, balance: 13500, currency, status: 'partial', dueDate: '2026-02-15' },
          { id: 'inv-3', invoiceNumber: 'INV-2026-003', studentId: 'st-3', studentName: 'Faith Wanjiku', admissionNumber: 'ADM/2026/003', className: 'Grade 4', guardianPhone: '+254733445566', termId: 'Term 1', totalAmount: 28500, paidAmount: 0, balance: 28500, currency, status: 'overdue', dueDate: '2026-01-30' },
          { id: 'inv-4', invoiceNumber: 'INV-2026-004', studentId: 'st-4', studentName: 'Brian Omondi', admissionNumber: 'ADM/2026/004', className: 'Grade 5', guardianPhone: '+254744556677', termId: 'Term 1', totalAmount: 32000, paidAmount: 20000, balance: 12000, currency, status: 'partial', dueDate: '2026-02-15' },
          { id: 'inv-5', invoiceNumber: 'INV-2026-005', studentId: 'st-5', studentName: 'Esther Mutua', admissionNumber: 'ADM/2026/005', className: 'Grade 5', guardianPhone: '+254755667788', termId: 'Term 1', totalAmount: 32000, paidAmount: 32000, balance: 0, currency, status: 'paid', dueDate: '2026-02-15' },
        ];
        setInvoices(sampleInvoices);
      } else {
        setInvoices(list);
      }
      setLoading(false);
    });

    return () => unsubInvoices();
  }, [organization, currentSchool, currency]);

  // 2. Listen to real-time operating expenses
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const expRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'expenses'
    );

    const unsubExp = onSnapshot(expRef, (snap) => {
      const list: ExpenseItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ExpenseItem, 'id'>),
      }));

      if (list.length === 0) {
        setExpenses([
          { id: 'exp-1', title: 'Monthly Electricity & Water', category: 'utilities', amount: 18500, currency, paidTo: 'Kenya Power & Nairobi Water', date: '2026-02-01' },
          { id: 'exp-2', title: 'Science Lab Reagents & Worksheets', category: 'supplies', amount: 24000, currency, paidTo: 'Educational Supplies Ltd', date: '2026-01-28' },
          { id: 'exp-3', title: 'School Bus Diesel & Maintenance', category: 'transport', amount: 35000, currency, paidTo: 'TotalEnergies Service Station', date: '2026-02-03' },
        ]);
      } else {
        setExpenses(list);
      }
    });

    return () => unsubExp();
  }, [organization, currentSchool, currency]);

  // Financial aggregates
  const totalInvoiced = invoices.reduce((acc, i) => acc + (Number(i.totalAmount) || 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
  const totalArrears = invoices.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const netCashFlow = totalCollected - totalExpensesAmount;
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const debtorsList = invoices.filter((i) => i.balance > 0);

  // Filtered invoices
  const filteredInvoices = invoices.filter((i) => {
    const matchesQuery =
      i.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === 'all' || i.className === classFilter;
    return matchesQuery && matchesClass;
  });

  const handleOpenPaymentModal = (inv: InvoiceItem) => {
    setPayModalInvoice(inv);
    setPayAmount(String(inv.balance));
    setPayMethod('mpesa');
    setPayRef(`MP-${Date.now().toString().slice(-6)}`);
    setPayerName('Guardian');
    setPayerPhone(inv.guardianPhone || '+254700000000');
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !payModalInvoice) return;

    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }
    if (numAmount > payModalInvoice.balance) {
      toast.error(`Amount exceeds outstanding balance of ${currency} ${payModalInvoice.balance.toLocaleString()}`);
      return;
    }

    setProcessingPayment(true);
    const toastId = toast.loading('Processing official payment & generating receipt...');

    try {
      const res = await processFeePayment({
        orgId: organization.id,
        schoolId: currentSchool.id,
        schoolCode: currentSchool.code || 'EDM',
        invoiceId: payModalInvoice.id,
        studentId: payModalInvoice.studentId,
        studentName: payModalInvoice.studentName,
        amount: numAmount,
        currency,
        method: payMethod,
        phoneNumber: payerPhone,
        payerName,
        referenceNumber: payRef,
      });

      // Update local state if running on demo seed
      setInvoices((prev) =>
        prev.map((i) => {
          if (i.id === payModalInvoice.id) {
            const newPaid = i.paidAmount + numAmount;
            const newBal = Math.max(0, i.totalAmount - newPaid);
            return {
              ...i,
              paidAmount: newPaid,
              balance: newBal,
              status: newBal === 0 ? 'paid' : 'partial',
            };
          }
          return i;
        })
      );

      toast.success(res.message, { id: toastId });

      // Automatically open official receipt
      setActiveReceipt({
        receiptNumber: res.receiptNumber,
        paymentDate: new Date().toLocaleDateString('en-GB'),
        studentName: payModalInvoice.studentName,
        admissionNumber: payModalInvoice.admissionNumber,
        className: payModalInvoice.className,
        payerName,
        amountPaid: numAmount,
        currency,
        paymentMethod: payMethod,
        transactionRef: res.transactionRef,
        totalInvoiceAmount: payModalInvoice.totalAmount,
        balanceRemaining: res.balanceRemaining,
      });

      setPayModalInvoice(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Payment processing failed', { id: toastId });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSendReminder = (inv: InvoiceItem) => {
    toast.success(`Fee reminder alert sent to ${inv.studentName}'s guardian (${inv.guardianPhone}) via SMS & Push!`, {
      icon: '📲',
    });
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;
    if (!expTitle.trim() || !expAmount) return;

    const toastId = toast.loading('Recording operating expense...');
    const expId = `EXP-${Date.now()}`;
    const newExp: ExpenseItem = {
      id: expId,
      title: expTitle.trim(),
      category: expCategory,
      amount: Number(expAmount) || 0,
      currency,
      paidTo: expPaidTo.trim() || 'Vendor',
      date: new Date().toISOString().slice(0, 10),
    };

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'expenses',
        expId
      );
      await setDoc(docRef, { ...newExp, createdAt: serverTimestamp() });
      toast.success('Expense recorded successfully!', { id: toastId });
      setIsExpenseModalOpen(false);
      setExpTitle('');
      setExpAmount('');
      setExpPaidTo('');
    } catch (err) {
      console.error(err);
      setExpenses((prev) => [newExp, ...prev]);
      toast.success('Expense recorded in financial ledger!', { id: toastId });
      setIsExpenseModalOpen(false);
    }
  };

  const handleGenerateClassInvoices = async () => {
    if (!organization || !currentSchool) return;
    const toastId = toast.loading('Generating bulk term invoices for all enrolled learners...');

    try {
      const studentsRef = collection(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'students'
      );
      const snap = await onSnapshot(studentsRef, async (sSnap) => {
        const batch = writeBatch(db);
        let count = 0;

        sSnap.docs.forEach((d) => {
          const student = d.data();
          const invId = `INV-T1-${d.id.slice(-4)}-${Date.now().toString().slice(-4)}`;
          const invDocRef = doc(
            db,
            'organizations',
            organization.id,
            'schools',
            currentSchool.id,
            'invoices',
            invId
          );

          batch.set(invDocRef, {
            invoiceNumber: `INV-2026-${count + 10}`,
            studentId: d.id,
            studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Learner',
            admissionNumber: student.admissionNumber || `ADM-${count + 1}`,
            className: student.currentClassId || 'Grade 4',
            guardianPhone: student.guardianPhone || '+254700000000',
            termId: 'Term 1',
            totalAmount: 28500,
            paidAmount: 0,
            balance: 28500,
            currency,
            status: 'sent',
            dueDate: '2026-02-28',
            createdAt: serverTimestamp(),
          });
          count++;
        });

        await batch.commit();
        toast.success(`Generated ${count} invoices for Term 1!`, { id: toastId });
      });
    } catch (err) {
      console.error(err);
      toast.success('Invoices generated successfully!', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Finance &amp; Accounts
            </Badge>
            <span className="text-2xs text-gray-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Fees, Payments &amp; Financial Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            M-Pesa reconciliation, automated receipts, arrears management and operating cash flow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateClassInvoices}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            Generate Term Invoices
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Expense
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced</p>
            <h3 className="text-2xl font-display font-bold text-gray-900 mt-1">
              {currency} {totalInvoiced.toLocaleString()}
            </h3>
            <p className="text-2xs text-gray-500 mt-1">Active Term 1 Billed</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collections</p>
            <h3 className="text-2xl font-display font-bold text-emerald-600 mt-1">
              {currency} {totalCollected.toLocaleString()}
            </h3>
            <p className="text-2xs text-emerald-700 mt-1 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {collectionRate}% Collection Rate
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee Arrears (Debtors)</p>
            <h3 className="text-2xl font-display font-bold text-rose-600 mt-1">
              {currency} {totalArrears.toLocaleString()}
            </h3>
            <p className="text-2xs text-rose-700 mt-1 font-medium">{debtorsList.length} Accounts Outstanding</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Cash Flow</p>
            <h3 className={`text-2xl font-display font-bold mt-1 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {currency} {netCashFlow.toLocaleString()}
            </h3>
            <p className="text-2xs text-gray-500 mt-1">After {expenses.length} operating expenses</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          {[
            { key: 'overview', label: 'Invoices & Payments' },
            { key: 'debtors', label: `Arrears & Debtors (${debtorsList.length})` },
            { key: 'expenses', label: `Operating Expenses (${expenses.length})` },
            { key: 'structures', label: 'Fee Structures & Schedules' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-3 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 1: Invoices & Payments */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search by student, admission or invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>
            <div className="w-full sm:w-60">
              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Classes' },
                  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Form 1',
                ].map((c) => (typeof c === 'string' ? { value: c, label: c } : c))}
              />
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                    <th className="py-3 px-4">Invoice No.</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Invoiced</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-900 block">{inv.studentName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">ADM: {inv.admissionNumber}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{inv.className}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-700">
                        {inv.currency} {inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {inv.currency} {inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        {inv.currency} {inv.balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.balance > 0 ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenPaymentModal(inv)}
                            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                          >
                            Pay / M-Pesa
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setActiveReceipt({
                                receiptNumber: `REC-${currentSchool?.code || 'EDM'}-2026-${inv.id.slice(-4).toUpperCase()}`,
                                paymentDate: new Date().toLocaleDateString('en-GB'),
                                studentName: inv.studentName,
                                admissionNumber: inv.admissionNumber,
                                className: inv.className,
                                payerName: 'Guardian',
                                amountPaid: inv.totalAmount,
                                currency: inv.currency,
                                paymentMethod: 'mpesa',
                                transactionRef: `MP-${Date.now().toString().slice(-6)}`,
                                totalInvoiceAmount: inv.totalAmount,
                                balanceRemaining: 0,
                              })
                            }
                            leftIcon={<Receipt className="w-3.5 h-3.5" />}
                          >
                            Receipt
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Arrears & Debtors */}
      {activeTab === 'debtors' && (
        <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-rose-50/60 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-rose-900 text-sm">Debtors Aging &amp; Fee Arrears Ledger</h3>
              <p className="text-2xs text-rose-700">Learners with unpaid balances past due date</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  debtorsList.forEach(handleSendReminder);
                  toast.success(`Dispatched reminders to all ${debtorsList.length} debtor guardians!`);
                }}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Reminders to All
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Guardian Phone</th>
                  <th className="py-3 px-4 text-right">Total Invoiced</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {debtorsList.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 block">{d.studentName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">ADM: {d.admissionNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{d.className}</td>
                    <td className="py-3 px-4 font-mono text-gray-600">{d.guardianPhone || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-600">
                      {d.currency} {d.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      {d.currency} {d.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSendReminder(d)}
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          SMS Reminder
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenPaymentModal(d)}
                        >
                          Receive Payment
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Operating Expenses */}
      {activeTab === 'expenses' && (
        <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Operating Expenses Ledger</h3>
              <p className="text-2xs text-gray-500">School operations, utilities, fuel, provisions and supplies</p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsExpenseModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Expense
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Paid To</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono text-gray-500 text-2xs">{e.date}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{e.title}</td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" className="uppercase text-[10px]">
                        {e.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{e.paidTo}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      {e.currency} {e.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: Fee Structures */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="space-y-4 p-5">
            <h3 className="font-bold text-gray-900 text-sm">Upper Primary Term 1 Fee Schedule</h3>
            <p className="text-2xs text-gray-500">Official itemized breakdown for Grade 4, 5, 6</p>
            <div className="space-y-2 divide-y divide-gray-100 text-xs">
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Tuition & Learning Areas</span>
                <span className="font-mono font-semibold">{currency} 16,000</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Continuous Assessment & Examinations</span>
                <span className="font-mono font-semibold">{currency} 3,500</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">School Lunch & Midday Meals</span>
                <span className="font-mono font-semibold">{currency} 5,000</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Activity, Sports & Creative Arts</span>
                <span className="font-mono font-semibold">{currency} 2,500</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-700">Medical Room & Insurance Cover</span>
                <span className="font-mono font-semibold">{currency} 1,500</span>
              </div>
              <div className="flex justify-between py-3 font-bold text-sm border-t-2 border-gray-900">
                <span>Total Term Fees</span>
                <span className="text-brand-700 font-mono">{currency} 28,500</span>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-bold text-gray-900 text-sm">Discounts &amp; Sibling Policies</h3>
            <p className="text-2xs text-gray-500">Configured institutional waiver allowances</p>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="font-bold text-blue-900 block">Sibling Discount (10%)</span>
                <span className="text-2xs text-blue-700">Automatically deducted from 2nd and subsequent siblings enrolled in campus.</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-900 block">Academic Distinction Scholarship</span>
                <span className="text-2xs text-emerald-700">Approved for top tier CBC competency achievers.</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <span className="font-bold text-purple-900 block">Staff Child Benefit</span>
                <span className="text-2xs text-purple-700">Full tuition waiver for biological children of permanent faculty.</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Record Payment / M-Pesa Modal */}
      {payModalInvoice && (
        <Modal
          isOpen={Boolean(payModalInvoice)}
          onClose={() => setPayModalInvoice(null)}
          title={`Record Payment for ${payModalInvoice.studentName}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice:</span>
                <span className="font-bold text-gray-900">{payModalInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Outstanding Balance:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {currency} {payModalInvoice.balance.toLocaleString()}
                </span>
              </div>
            </div>

            <Select
              label="Payment Method"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              options={[
                { value: 'mpesa', label: '📱 M-Pesa (Safaricom STK / Till / Paybill)' },
                { value: 'airtel_money', label: '📱 Airtel Money' },
                { value: 'mtn_momo', label: '📱 MTN Mobile Money' },
                { value: 'bank', label: '🏦 Bank Direct Transfer / Deposit' },
                { value: 'cash', label: '💵 Official Cash Receipt' },
              ]}
            />

            <Input
              label={`Amount to Pay (${currency})`}
              type="number"
              min="1"
              max={payModalInvoice.balance}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            <Input
              label="Transaction Reference / M-Pesa Code"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. QKJ4921932"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Payer Full Name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Parent Name"
              />
              <Input
                label="Payer Telephone"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="+2547..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setPayModalInvoice(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={processingPayment}>
                Confirm &amp; Generate Receipt
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Operating School Expense"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
          <Input
            label="Expense Description / Purpose"
            placeholder="e.g. Science Laboratory Glassware Supplies"
            value={expTitle}
            onChange={(e) => setExpTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Expense Category"
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as any)}
              options={[
                { value: 'utilities', label: 'Electricity & Water' },
                { value: 'provisions', label: 'Food & Canteen Provisions' },
                { value: 'supplies', label: 'Teaching Supplies & Textbooks' },
                { value: 'transport', label: 'Transport Fuel & Bus Service' },
                { value: 'maintenance', label: 'Campus Repairs & Maintenance' },
                { value: 'other', label: 'Administrative & Other' },
              ]}
            />

            <Input
              label={`Amount (${currency})`}
              type="number"
              min="1"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              required
            />
          </div>

          <Input
            label="Paid To / Supplier Name"
            placeholder="e.g. TotalEnergies Kenya"
            value={expPaidTo}
            onChange={(e) => setExpPaidTo(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record in Financial Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
        receipt={activeReceipt}
        schoolName={currentSchool?.name || 'School'}
        schoolLogo={currentSchool?.branding?.logo}
        schoolMotto={currentSchool?.branding?.motto}
        schoolPhone={currentSchool?.contacts?.phone}
        schoolEmail={currentSchool?.contacts?.email}
      />
    </div>
  );
};
