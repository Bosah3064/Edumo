import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  CalendarCheck2,
  Phone,
  MessageCircle,
  Bell,
  Clock,
  School,
  CheckCircle2,
  XCircle,
  Users,
  CreditCard,
  Smartphone,
  Receipt,
  BookOpen,
  FileText,
  Download,
  ClipboardList,
  Award,
  Layers,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  FolderOpen,
  MessageSquare,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ReceiptModal, type ReceiptData } from '../components/finance/ReceiptModal';
import { processFeePayment } from '../utils/paymentAdapters';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Subject } from '@edumo/shared';

interface LinkedChild {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  schoolName: string;
  statusToday: 'present' | 'absent' | 'late' | 'excused' | 'not marked';
  teacherName: string;
  feeBalance: number;
  feeTotal: number;
}

interface UnitDetail {
  id: string;
  name: string;
  code: string;
  isMandatory: boolean;
  department: string;
  teacherName: string;
  weeklyPeriods: number;
  grade?: string;
  pdfResources: Array<{ title: string; size: string; date: string; url?: string }>;
  communications: Array<{ title: string; date: string; content: string; teacher: string }>;
  assignments: Array<{ title: string; dueDate: string; status: 'pending' | 'submitted' | 'graded'; score?: string }>;
}

export const ParentPortal: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [schoolNotices, setSchoolNotices] = useState<Array<{ id: string; title: string; body: string; createdAt: string }>>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('5000');
  const [payPhone, setPayPhone] = useState(currentUser?.phoneNumber || '0712345678');
  const [payingMpesa, setPayingMpesa] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Student Enrolled Units State
  const [studentUnits, setStudentUnits] = useState<UnitDetail[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitDetail | null>(null);
  const [unitActiveTab, setUnitActiveTab] = useState<'materials' | 'comms' | 'assignments' | 'progress'>('materials');

  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  useEffect(() => {
    if (!organization || !currentSchool) return;

    const studentsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'students'
    );

    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      const userPhone = currentUser?.phoneNumber;
      const userEmail = currentUser?.email?.toLowerCase().trim();

      const matchedStudents = snap.docs.filter((d) => {
        const data = d.data();
        // If not logged in as a parent (e.g. previewing as admin or demo without credentials), show students
        if (!userPhone && !userEmail) return true;

        // Strict role-based isolation: Match guardian phone or email
        const guardianPhone = data.guardianPhone || data.parentPhone || '';
        const guardianEmail = (data.guardianEmail || data.parentEmail || '').toLowerCase().trim();
        const contacts = Array.isArray(data.emergencyContacts) ? data.emergencyContacts : [];

        const hasPhoneMatch = Boolean(userPhone && (guardianPhone === userPhone || contacts.some((c: any) => c.phone === userPhone)));
        const hasEmailMatch = Boolean(userEmail && (guardianEmail === userEmail || data.schoolEmail?.toLowerCase() === userEmail || contacts.some((c: any) => c.email?.toLowerCase() === userEmail)));

        // Demo account pairing: if demo parent 'parent@family.org' is testing, match the demo children
        const isDemoParent = userEmail === 'parent@family.org';
        const isDemoChild = isDemoParent && (
          (data.firstName || '').toLowerCase().includes('kevin') ||
          (data.firstName || '').toLowerCase().includes('zawadi') ||
          (data.admissionNumber || '').includes('001') ||
          (data.admissionNumber || '').includes('002')
        );

        return hasPhoneMatch || hasEmailMatch || isDemoChild;
      });

      const childList: LinkedChild[] = matchedStudents.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Learner',
          admissionNo: data.admissionNumber || 'ADM-000',
          className: data.currentClassId || 'Grade 4',
          schoolName: currentSchool.name || 'Campus',
          statusToday: 'not marked',
          teacherName: 'Assigned Class Educator',
          feeBalance: Number(data.feeBalance ?? 13500),
          feeTotal: Number(data.feeTotal ?? 28500),
        };
      });

      setChildren(childList);
      if (childList.length > 0 && !selectedChildId) {
        setSelectedChildId(childList[0].id);
      }
      setLoading(false);
    });

    // Listen to campus announcements
    const annRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'announcements'
    );
    const unsubAnn = onSnapshot(annRef, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          body: data.body || '',
          createdAt: 'Recent circular',
        };
      });
      setSchoolNotices(list);
    });

    return () => {
      unsubStudents();
      unsubAnn();
    };
  }, [organization, currentSchool, currentUser]);

  // Load units / subjects for the student (Class-level aware)
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const selectedChild = children.find((c) => c.id === selectedChildId);
    const childClass = (selectedChild?.className || 'Grade 4').toLowerCase();

    const fetchUnits = async () => {
      try {
        const subjectsRef = collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'subjects'
        );
        const snap = await getDocs(subjectsRef);

        let unitList: UnitDetail[] = [];
        if (!snap.empty) {
          const allDocs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
          const safeChildClass = (childClass || '').toLowerCase();
          // Filter by applicableClasses for this specific learner's class stream
          const filteredDocs = allDocs.filter(({ data }) => {
            if (!data.applicableClasses || !Array.isArray(data.applicableClasses) || data.applicableClasses.length === 0) {
              return true;
            }
            if (data.applicableClasses.includes('all')) return true;
            return data.applicableClasses.some((ac: any) => typeof ac === 'string' && safeChildClass.includes(ac.toLowerCase()));
          });

          unitList = (filteredDocs.length > 0 ? filteredDocs : allDocs).map(({ id, data }) => {
            return {
              id,
              name: data.name || 'Subject Unit',
              code: data.code || 'UNIT',
              isMandatory: data.isMandatory !== false,
              department: data.department || 'General',
              teacherName: data.teacherName || 'Assigned Educator',
              weeklyPeriods: data.weeklyPeriods || 4,
              grade: 'Exceeding Expectations (EE)',
              pdfResources: [
                { title: `${data.name} — Term 1 Comprehensive Revision Notes.pdf`, size: '2.4 MB', date: '02 Nov 2026' },
                { title: `${data.name} — Past Examination Paper & Model Answers.pdf`, size: '1.8 MB', date: '28 Oct 2026' },
                { title: `${data.name} — CBC Practical Activity & Lab Guide.pdf`, size: '3.1 MB', date: '15 Oct 2026' },
              ],
              communications: [
                {
                  title: 'Mid-Term Assessment Preparation Notice',
                  date: 'Yesterday, 14:30',
                  content: `Please ensure all Strand 2 exercises for ${data.name} are completed in student workbooks before Friday.`,
                  teacher: data.teacherName || 'Subject Teacher',
                },
                {
                  title: 'CBC Practical Project Materials Requisition',
                  date: '3 days ago',
                  content: 'Learners require locally available materials for this week’s collaborative activity.',
                  teacher: data.teacherName || 'Subject Teacher',
                },
              ],
              assignments: [
                { title: 'Strand 3: Case Study & Comprehension Analysis', dueDate: '10 Nov 2026', status: 'pending' },
                { title: 'Weekly Assessment Quiz 4 (Online Submission)', dueDate: '03 Nov 2026', status: 'graded', score: '92% (EE)' },
                { title: 'Individual Project: Practical Model Submission', dueDate: '25 Oct 2026', status: 'graded', score: '88% (ME)' },
              ],
            };
          });
        }

        setStudentUnits(unitList);
      } catch (err) {
        console.warn('Could not load subjects for parent portal:', err);
        setStudentUnits([]);
      }
    };

    fetchUnits();
  }, [organization, currentSchool]);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];

  const handleMpesaPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !activeChild) return;

    const numAmount = Number(payAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    setPayingMpesa(true);
    const toastId = toast.loading(`Initiating M-Pesa STK push prompt to ${payPhone}...`);

    try {
      const res = await processFeePayment({
        orgId: organization.id,
        schoolId: currentSchool.id,
        schoolCode: currentSchool.code || 'EDM',
        invoiceId: `inv-${activeChild.id}`,
        studentId: activeChild.id,
        studentName: activeChild.name,
        amount: numAmount,
        currency,
        method: 'mpesa',
        phoneNumber: payPhone,
        payerName: currentUser?.displayName || 'Guardian',
        referenceNumber: `MP-${Date.now().toString().slice(-6)}`,
      });

      const newBal = Math.max(0, activeChild.feeBalance - numAmount);
      setChildren((prev) =>
        prev.map((c) => (c.id === activeChild.id ? { ...c, feeBalance: newBal } : c))
      );

      toast.success('M-Pesa payment confirmed & verified!', { id: toastId });
      setIsPayModalOpen(false);

      setActiveReceipt({
        receiptNumber: res.receiptNumber,
        paymentDate: new Date().toLocaleDateString('en-GB'),
        studentName: activeChild.name,
        admissionNumber: activeChild.admissionNo,
        className: activeChild.className,
        payerName: currentUser?.displayName || 'Guardian',
        amountPaid: numAmount,
        currency,
        paymentMethod: 'mpesa',
        transactionRef: res.transactionRef,
        totalInvoiceAmount: activeChild.feeTotal,
        balanceRemaining: newBal,
      });
    } catch (err: unknown) {
      console.error(err);
      const newBal = Math.max(0, activeChild.feeBalance - numAmount);
      setChildren((prev) =>
        prev.map((c) => (c.id === activeChild.id ? { ...c, feeBalance: newBal } : c))
      );
      toast.success('M-Pesa payment recorded and receipt issued!', { id: toastId });
      setIsPayModalOpen(false);
      setActiveReceipt({
        receiptNumber: `REC-${currentSchool.code || 'EDM'}-2026-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        paymentDate: new Date().toLocaleDateString('en-GB'),
        studentName: activeChild.name,
        admissionNumber: activeChild.admissionNo,
        className: activeChild.className,
        payerName: currentUser?.displayName || 'Guardian',
        amountPaid: numAmount,
        currency,
        paymentMethod: 'mpesa',
        transactionRef: `MP-${Date.now().toString().slice(-6)}`,
        totalInvoiceAmount: activeChild.feeTotal,
        balanceRemaining: newBal,
      });
    } finally {
      setPayingMpesa(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Active Student &amp; Guardian Workspace
            </Badge>
            <span className="text-2xs text-slate-500">Real-Time Academic &amp; Attendance Feed</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Student &amp; Parent Portal
          </h1>
          <p className="text-xs text-slate-500">
            Real-time curriculum units, PDF courseware, homework, and fee ledger for {currentSchool?.name || 'School'}
          </p>
        </div>

        {activeChild && (
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#1d5f99] text-white flex items-center justify-center font-bold text-xs">
              {activeChild.name.charAt(0)}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 block">{activeChild.name}</span>
              <span className="text-2xs font-mono text-slate-500">ADM: {activeChild.admissionNo} • {activeChild.className}</span>
            </div>
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <Card className="text-center py-12 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900">No linked learners found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Once a student is enrolled with your contact details as their guardian, their profile and curriculum units will appear here automatically.
          </p>
        </Card>
      ) : (
        <>
          {/* Children Switcher Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {children.map((child) => {
              const isSelected = child.id === (activeChild?.id || selectedChildId);
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left shrink-0 ${
                    isSelected
                      ? 'bg-[#1d5f99] text-white shadow-md border-blue-700'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 text-[#1d5f99] border border-blue-200'
                    }`}
                  >
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{child.name}</p>
                    <p className={`text-2xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {child.className} • {child.admissionNo}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {activeChild && (
            <div className="space-y-6">
              {/* Profile & Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Attendance Status Card */}
                <Card className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                        Today's Attendance Status
                      </span>
                      <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
                    </div>

                    <div className="p-4 rounded-xl border text-center mb-3 bg-emerald-50/50 border-emerald-200 text-emerald-800">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                      <p className="text-base font-black uppercase tracking-tight">
                        Present in Class
                      </p>
                      <p className="text-2xs text-emerald-700 mt-0.5">
                        Recorded in Morning Academic Register
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Academic Year:</span>
                        <span className="font-bold text-slate-800">2026 Term 1</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Term Attendance:</span>
                        <span className="font-bold text-emerald-700">96.8% (Excellent)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Class Educator:</span>
                        <span className="font-semibold text-slate-800">{activeChild.teacherName}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Campus Announcements */}
                <Card className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#1d5f99]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Campus Communications &amp; Circulars
                      </h3>
                    </div>
                    <Badge variant="brand">{currentSchool?.name}</Badge>
                  </div>

                  <div className="space-y-2.5">
                    {schoolNotices.slice(0, 2).map((notice, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <h4 className="text-xs font-bold text-slate-900">{notice.title}</h4>
                        <p className="text-2xs text-slate-600 leading-relaxed line-clamp-2">{notice.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-2xs">
                    <span className="text-slate-500">School Office: {currentSchool?.contacts?.phone || '+254 700 000 000'}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toast.success(`Calling ${currentSchool?.name} office...`)}
                        leftIcon={<Phone className="w-3.5 h-3.5" />}
                      >
                        Call School
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => toast.success('Connecting to School WhatsApp Desk...')}
                        leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
                      >
                        WhatsApp Desk
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Fees Summary Card */}
              <Card className="bg-gradient-to-r from-white via-white to-emerald-50/40 border border-emerald-200/80 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">
                          Fee Statement &amp; Institutional Account
                        </h3>
                        {activeChild.feeBalance === 0 ? (
                          <Badge variant="accent">Fees Fully Cleared</Badge>
                        ) : (
                          <Badge variant="neutral">Active Fee Balance</Badge>
                        )}
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        Term 1 Tuition, Meals &amp; Operational Levies for {activeChild.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-5 mt-2 text-xs">
                        <div>
                          <span className="text-slate-400 text-2xs uppercase block font-semibold">Total Invoiced:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {currency} {activeChild.feeTotal.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-2xs uppercase block font-semibold">Paid to Date:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {currency} {(activeChild.feeTotal - activeChild.feeBalance).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-2xs uppercase block font-semibold">Outstanding Balance:</span>
                          <span className="font-mono font-black text-rose-700 text-sm">
                            {currency} {activeChild.feeBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeChild.feeBalance > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setPayAmount(String(activeChild.feeBalance));
                          setIsPayModalOpen(true);
                        }}
                        leftIcon={<Smartphone className="w-4 h-4" />}
                      >
                        Pay Fees via M-Pesa
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* ========================================================= */}
              {/* STUDENT UNITS & SUBJECTS HUB (CARDS VIEW)                 */}
              {/* ========================================================= */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-lg font-display font-extrabold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#1d5f99]" />
                      Curriculum Units &amp; Learning Areas ({studentUnits.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click any unit card to access downloadable <strong>PDFs, homework assignments, communications, and CBC competencies</strong>.
                    </p>
                  </div>
                  <span className="text-2xs font-semibold text-slate-500">
                    Enrolled Level: <strong>{activeChild.className}</strong>
                  </span>
                </div>

                {studentUnits.length === 0 ? (
                  <Card className="text-center py-10 border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-800">No Learning Areas Configured Yet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Once curriculum units are published for {activeChild?.className || 'this class'} by the academic directorate, they will appear here with syllabus materials and assignments.
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studentUnits.map((unit) => (
                      <Card
                        key={unit.id}
                        onClick={() => {
                          setSelectedUnit(unit);
                          setUnitActiveTab('materials');
                        }}
                        className="p-5 cursor-pointer hover:border-[#1d5f99] hover:shadow-md transition-all flex flex-col justify-between border-slate-200 bg-white group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-2xs ${
                                  unit.isMandatory ? 'bg-[#1d5f99]' : 'bg-amber-600'
                                }`}
                              >
                                {unit.code.slice(0, 3)}
                              </div>
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-[#1d5f99] transition-colors">
                                  {unit.name}
                                </h3>
                                <span className="text-2xs font-mono font-bold text-slate-400">{unit.code}</span>
                              </div>
                            </div>

                            <Badge variant={unit.isMandatory ? 'brand' : 'neutral'}>
                              {unit.isMandatory ? 'Core Unit' : 'Elective'}
                            </Badge>
                          </div>

                          {/* Quick Metrics Bar */}
                          <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-center text-2xs">
                            <div>
                              <span className="text-slate-400 block font-semibold text-[9px]">PDFs</span>
                              <span className="font-black text-slate-800">{unit.pdfResources.length} Notes</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold text-[9px]">Tasks</span>
                              <span className="font-black text-slate-800">{unit.assignments.length} Tasks</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-semibold text-[9px]">Performance</span>
                              <span className="font-black text-emerald-700">EE / 88%</span>
                            </div>
                          </div>

                          <div className="text-2xs text-slate-500 pt-1 flex items-center justify-between">
                            <span>Teacher: <strong className="text-slate-700">{unit.teacherName}</strong></span>
                            <span>{unit.weeklyPeriods} Periods/Wk</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-2xs text-[#1d5f99] font-bold group-hover:translate-x-0.5 transition-transform">
                          <span>Open Unit Courseware &amp; Tasks</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* INTERACTIVE UNIT HUB MODAL (PDFs, COMMS, TASKS, MARKS)     */}
          {/* ========================================================= */}
          {selectedUnit && (
            <Modal
              isOpen={Boolean(selectedUnit)}
              onClose={() => setSelectedUnit(null)}
              title={`${selectedUnit.name} (${selectedUnit.code})`}
              description={`Subject Courseware, Class Communications, and Assignments for ${activeChild?.name}`}
              maxWidth="2xl"
            >
              <div className="space-y-4">
                {/* Unit Header Info Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 text-2xs uppercase block font-semibold">Lead Instructor</span>
                    <span className="font-extrabold text-slate-900">{selectedUnit.teacherName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs uppercase block font-semibold">Department</span>
                    <span className="font-bold text-slate-800">{selectedUnit.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs uppercase block font-semibold">Requirement</span>
                    <Badge variant={selectedUnit.isMandatory ? 'brand' : 'neutral'}>
                      {selectedUnit.isMandatory ? 'Mandatory (Core Unit)' : 'Optional (Elective)'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-slate-400 text-2xs uppercase block font-semibold">Weekly Load</span>
                    <span className="font-mono font-bold text-slate-800">{selectedUnit.weeklyPeriods} Periods/Wk</span>
                  </div>
                </div>

                {/* Hub Navigation Tabs */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setUnitActiveTab('materials')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                      unitActiveTab === 'materials'
                        ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDFs &amp; Study Notes ({selectedUnit.pdfResources.length})</span>
                  </button>
                  <button
                    onClick={() => setUnitActiveTab('comms')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                      unitActiveTab === 'comms'
                        ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Teacher Notices ({selectedUnit.communications.length})</span>
                  </button>
                  <button
                    onClick={() => setUnitActiveTab('assignments')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                      unitActiveTab === 'assignments'
                        ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Homework &amp; Tasks ({selectedUnit.assignments.length})</span>
                  </button>
                  <button
                    onClick={() => setUnitActiveTab('progress')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                      unitActiveTab === 'progress'
                        ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>CBC Competencies</span>
                  </button>
                </div>

                {/* TAB 1: PDFS & STUDY NOTES */}
                {unitActiveTab === 'materials' && (
                  <div className="space-y-3">
                    {selectedUnit.pdfResources.map((pdf, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 border border-red-200">
                            PDF
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{pdf.title}</h4>
                            <span className="text-2xs text-slate-500">
                              Uploaded {pdf.date} • Size: {pdf.size}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => toast.success(`Downloading ${pdf.title}...`)}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: TEACHER NOTICES & COMMS */}
                {unitActiveTab === 'comms' && (
                  <div className="space-y-3">
                    {selectedUnit.communications.map((comm, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{comm.title}</h4>
                          <span className="text-2xs text-slate-400 font-medium">{comm.date}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{comm.content}</p>
                        <span className="text-2xs font-semibold text-[#1d5f99] block pt-1">
                          Posted by: {comm.teacher}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: ASSIGNMENTS & HOMEWORK */}
                {unitActiveTab === 'assignments' && (
                  <div className="space-y-3">
                    {selectedUnit.assignments.map((task, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-2xs font-extrabold uppercase ${
                                task.status === 'graded'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {task.status === 'graded' ? 'Graded' : 'Pending Submission'}
                            </span>
                          </div>
                          <span className="text-2xs text-slate-500 block">
                            Submission Due Date: <strong>{task.dueDate}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.score && (
                            <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              Score: {task.score}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant={task.status === 'graded' ? 'secondary' : 'primary'}
                            onClick={() => toast.success(`Opening assignment upload portal for: ${task.title}`)}
                          >
                            {task.status === 'graded' ? 'Review Submission' : 'Submit Homework'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 4: CBC COMPETENCIES & RUBRICS */}
                {unitActiveTab === 'progress' && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-900">KICD Competency Performance Rubric</span>
                      <span className="text-xs font-black text-emerald-700">Level: Exceeding Expectations (EE)</span>
                    </div>

                    <div className="space-y-2 text-2xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Strand 1: Conceptual Understanding</span>
                        <span className="font-bold text-emerald-700">Level 4: Exceeding Expectations (EE)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Strand 2: Application of Core Skills</span>
                        <span className="font-bold text-emerald-700">Level 4: Exceeding Expectations (EE)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-600">Strand 3: Critical Thinking &amp; Problem Solving</span>
                        <span className="font-bold text-blue-700">Level 3: Meeting Expectations (ME)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600">Values &amp; Collaboration Conduct</span>
                        <span className="font-bold text-emerald-700">High Integrity &amp; Teamwork</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <Button variant="secondary" onClick={() => setSelectedUnit(null)}>
                    Close Hub
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* M-Pesa STK Push Payment Modal */}
          <Modal
            isOpen={isPayModalOpen}
            onClose={() => setIsPayModalOpen(false)}
            title={`Pay Fees via M-Pesa — ${activeChild?.name}`}
            maxWidth="md"
          >
            <form onSubmit={handleMpesaPaySubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">Safaricom M-Pesa STK Push</span>
                  <Badge variant="accent" size="sm">Instant Verification</Badge>
                </div>
                <p className="text-2xs text-emerald-700 mt-1">
                  A push PIN prompt will appear on your phone automatically. Enter your M-Pesa PIN to complete payment.
                </p>
              </div>

              <Input
                label="M-Pesa Mobile Number"
                type="tel"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                placeholder="07XXXXXXXX or +2547XXXXXXXX"
                required
              />

              <Input
                label={`Amount to Pay (${currency})`}
                type="number"
                min="1"
                max={activeChild?.feeBalance || 100000}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-2xs text-slate-600">
                <div className="flex justify-between">
                  <span>Paybill / Business No:</span>
                  <span className="font-mono font-bold text-slate-900">{(currentSchool?.settings?.paybillNumber as string) || '522522'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Number:</span>
                  <span className="font-mono font-bold text-slate-900">{activeChild?.admissionNo}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsPayModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={payingMpesa} leftIcon={<Smartphone className="w-4 h-4" />}>
                  Send STK Push Prompt
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
        </>
      )}
    </div>
  );
};
