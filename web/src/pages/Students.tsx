import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  HeartPulse,
  Phone,
  Calendar,
  Sparkles,
  Download,
  Printer,
  ArrowRightLeft,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatAdmissionNumber,
  getCurrentAdmissionYear,
  getNextAdmissionNumber,
  getSchoolEmailDomain,
  getSchoolEmailForAdmission,
} from '../utils/admission';
import {
  isSampleLearner,
  purgeMockSchoolData,
  wipeAllSchoolStudents,
} from '../utils/databaseInitializer';
import { exportLearnerMasterList } from '../utils/excelExport';
import { ExamCardModal } from '../components/students/ExamCardModal';
import { TransferStudentModal } from '../components/students/TransferStudentModal';

interface StudentRecord {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  currentClassId?: string;
  currentStreamId?: string;
  gender?: string;
  boardingStatus?: 'day' | 'boarding';
  status: string;
  guardianPhone?: string;
  schoolEmail?: string;
  createdAt?: unknown;
}

export const Students: React.FC = () => {
  const { organization, currentSchool, schools, currentRole, isStudent, isAdmin, studentProfile } = useTenant();
  const isStudentUser = isStudent || currentRole === 'student' || (currentRole as string) === 'learner';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [examCardStudent, setExamCardStudent] = useState<StudentRecord | null>(null);
  const [transferStudent, setTransferStudent] = useState<StudentRecord | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<StudentRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWipeAllModalOpen, setIsWipeAllModalOpen] = useState(false);
  const [isWipingAll, setIsWipingAll] = useState(false);

  // Form State
  const [admissionNo, setAdmissionNo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('Grade 4');
  const [gender, setGender] = useState('male');
  const [boardingStatus, setBoardingStatus] = useState<'day' | 'boarding'>('day');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('+254700000000');
  const [allergies, setAllergies] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    const unsub = onSnapshot(
      studentsRef,
      (snapshot) => {
        const list: StudentRecord[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as DocumentData),
        })) as StudentRecord[];

        // Filter out any mock/sample learners so only 100% genuine database records are shown
        const realList = list.filter((s) => !isSampleLearner(s));

        // Auto-purge any lingering sample records from Firestore in the background
        if (list.length !== realList.length && organization?.id && currentSchool?.id) {
          purgeMockSchoolData(db, organization.id, currentSchool.id).catch(() => {});
        }

        // Set real live data
        setStudents(realList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching students:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [organization, currentSchool]);

  // Auto-generate admission number whenever modal is opened
  useEffect(() => {
    if (isEnrollModalOpen && !admissionNo) {
      setAdmissionNo(getNextAdmissionNumber(students, getCurrentAdmissionYear()));
    }
  }, [isEnrollModalOpen, students]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected. Please choose a school first.');
      return;
    }

    const admToUse = admissionNo || getNextAdmissionNumber(students, getCurrentAdmissionYear());

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Enrolling learner...');

    try {
      const year = getCurrentAdmissionYear();
      const yearPrefix = String(year).slice(-2);
      const fallbackAdmission = admToUse;
      const fallbackSequence = Number(fallbackAdmission.split('/')[1]) || 1;
      const counterRef = doc(
        db,
        'organizations', organization.id,
        'schools', currentSchool.id,
        'counters', `admissions-${yearPrefix}`
      );

      let generatedAdmission = fallbackAdmission;
      try {
        generatedAdmission = await runTransaction(db, async (transaction) => {
          const counterSnapshot = await transaction.get(counterRef);
          const counterSequence = counterSnapshot.exists()
            ? Number(counterSnapshot.data().lastSequence || 0)
            : 0;
          const sequence = Math.max(counterSequence, fallbackSequence - 1) + 1;
          const nextAdmission = formatAdmissionNumber(year, sequence);

          transaction.set(counterRef, {
            lastSequence: sequence,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          return nextAdmission;
        });
      } catch (counterErr) {
        console.warn('Counter transaction fallback:', counterErr);
        generatedAdmission = fallbackAdmission;
      }

      const schoolEmailDomain = getSchoolEmailDomain(currentSchool);
      const schoolEmail = getSchoolEmailForAdmission(generatedAdmission, schoolEmailDomain);
      const studentDocRef = doc(
        collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'students'
        )
      );

      // Save Student Document
      await setDoc(studentDocRef, {
        admissionNumber: generatedAdmission,
        schoolEmail: schoolEmail || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        currentClassId: className,
        gender,
        boardingStatus,
        status: 'active',
        emergencyContacts: [
          {
            name: guardianName || 'Primary Guardian',
            phone: guardianPhone || '+254700000000',
            relationship: 'Parent/Guardian',
          },
        ],
        createdAt: serverTimestamp(),
      });

      // Save Medical subcollection if allergies specified (isolated by security rules)
      if (allergies.trim()) {
        const medicalRef = doc(studentDocRef, 'medical', 'record');
        await setDoc(medicalRef, {
          allergies: allergies.split(',').map((s) => s.trim()),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`${firstName} enrolled successfully!`, { id: toastId });
      setIsEnrollModalOpen(false);

      // Reset form
      setAdmissionNo('');
      setFirstName('');
      setLastName('');
      setAllergies('');
    } catch (err: unknown) {
      console.error('Enroll error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to enroll student';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!currentSchool) return;
    if (students.length === 0) {
      toast.error('No enrolled learners to export');
      return;
    }
    setExportingExcel(true);
    const toastId = toast.loading('Generating Official Learner Master Roster (.xlsx)...');
    try {
      await exportLearnerMasterList(
        currentSchool.name,
        currentSchool.code || 'CAMPUS',
        students.map((s) => ({
          admissionNumber: s.admissionNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          className: s.currentClassId,
          gender: s.gender,
          boardingStatus: s.boardingStatus,
          guardianPhone: s.guardianPhone,
          schoolEmail: s.schoolEmail,
          status: s.status,
        }))
      );
      toast.success('Learner Master List exported (.xlsx)!', { id: toastId });
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel roster', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  const handlePurgeSampleData = async () => {
    if (!organization?.id || !currentSchool?.id) return;
    setIsPurging(true);
    const toastId = toast.loading('Purging mock demonstration learners and records...');
    try {
      const res = await purgeMockSchoolData(db, organization.id, currentSchool.id);
      toast.success(
        `Wiped ${res.studentsPurged} sample learners and associated mock records!`,
        { id: toastId }
      );
    } catch (err) {
      console.error('Failed to purge sample records:', err);
      toast.error('Failed to purge sample records. Please check permissions.', { id: toastId });
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!organization?.id || !currentSchool?.id || !studentToDelete) return;
    const toastId = toast.loading(`Deleting ${studentToDelete.firstName}...`);
    try {
      await deleteDoc(
        doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'students',
          studentToDelete.id
        )
      );
      toast.success(
        `${studentToDelete.firstName} ${studentToDelete.lastName} deleted successfully.`,
        { id: toastId }
      );
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Failed to delete student:', err);
      toast.error('Failed to delete learner record.', { id: toastId });
    }
  };

  const handleWipeAllLearners = async () => {
    if (!organization?.id || !currentSchool?.id) return;
    setIsWipingAll(true);
    const toastId = toast.loading('Wiping all learners for this school...');
    try {
      const res = await wipeAllSchoolStudents(db, organization.id, currentSchool.id);
      toast.success(
        `Successfully wiped all ${res.deletedCount} learners. Clean slate ready!`,
        { id: toastId }
      );
      setIsWipeAllModalOpen(false);
    } catch (err) {
      console.error('Failed to wipe learners:', err);
      toast.error('Failed to wipe learners.', { id: toastId });
    } finally {
      setIsWipingAll(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const fullName = `${s.firstName || ''} ${s.lastName || ''} ${s.admissionNumber || ''}`.toLowerCase();
    const matchesSearch = !q || fullName.includes(q);
    const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalLearners = students.length;
  const dayLearners = students.filter((s) => (s.boardingStatus || 'day') === 'day').length;
  const boardingLearners = students.filter((s) => s.boardingStatus === 'boarding').length;
  const activeLearners = students.filter((s) => (s.status || 'active') === 'active').length;

  const myStudentRow: StudentRecord | null = isStudentUser
    ? students.find(
        (s) =>
          s.admissionNumber === studentProfile?.admissionNumber ||
          s.id === studentProfile?.id
      ) || {
        id: studentProfile?.id || 'learner',
        admissionNumber: studentProfile?.admissionNumber || 'ADM-000',
        firstName: studentProfile?.firstName || 'Learner',
        lastName: studentProfile?.lastName || '',
        currentClassId: studentProfile?.currentClassId || 'Grade 4',
        currentStreamId: studentProfile?.currentStreamId || 'East',
        boardingStatus: 'day',
        status: 'active',
        schoolEmail: studentProfile?.schoolEmail || studentProfile?.studentEmail || '',
      }
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {isStudentUser ? (
        <div className="space-y-6 animate-fade-in">
          {/* Student Profile Hero */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl text-white shadow-inner border border-white/20">
                  {myStudentRow?.firstName ? myStudentRow.firstName[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black">
                      {myStudentRow?.firstName} {myStudentRow?.lastName}
                    </h2>
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                      {myStudentRow?.currentClassId || 'Enrolled Class'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                      Active Learner
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-1 font-medium">
                    Admission No: <strong className="font-mono text-white">{myStudentRow?.admissionNumber}</strong>
                    {myStudentRow?.currentStreamId ? ` • Stream: ${myStudentRow.currentStreamId}` : ''}
                    {' • '}{currentSchool?.name || 'Main Campus'}
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setExamCardStudent(myStudentRow)}
                leftIcon={<Printer className="w-4 h-4 text-brand-600" />}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md text-xs shrink-0"
              >
                Print Examination Card
              </Button>
            </div>
          </div>

          {/* Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                Institutional Enrolment Information
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Full Legal Name</span>
                  <span className="font-bold text-slate-900">{myStudentRow?.firstName} {myStudentRow?.lastName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Admission Number</span>
                  <span className="font-mono font-bold text-slate-900">{myStudentRow?.admissionNumber}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Class / Grade</span>
                  <span className="font-bold text-slate-900">{myStudentRow?.currentClassId || 'Not Assigned'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Stream</span>
                  <span className="font-bold text-slate-900">{myStudentRow?.currentStreamId || 'East'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Boarding Status</span>
                  <span className="font-bold capitalize text-slate-900">{myStudentRow?.boardingStatus || 'Day Scholar'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Institutional Email</span>
                  <span className="font-mono text-slate-700">{myStudentRow?.schoolEmail || '—'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                Guardian &amp; Medical Contacts
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Guardian Phone</span>
                  <span className="font-mono font-bold text-slate-900">{myStudentRow?.guardianPhone || 'On File'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">School Campus</span>
                  <span className="font-bold text-slate-900">{currentSchool?.name || 'Main Campus'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Academic Year</span>
                  <span className="font-bold text-slate-900">2026 Academic Calendar</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Emergency Status</span>
                  <span className="text-emerald-700 font-bold">Standard clearance</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-black text-gray-900 tracking-tight">
              Learners &amp; Student Directory
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enrolled learner records and institutional register for <strong>{currentSchool?.name || 'Main Campus'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && totalLearners > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWipeAllModalOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
              className="font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              Wipe All Learners
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            isLoading={exportingExcel}
            leftIcon={<Download className="w-4 h-4" />}
            className="font-bold"
          >
            Export Excel (.xlsx)
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAdmissionNo(getNextAdmissionNumber(students, getCurrentAdmissionYear()));
                setIsEnrollModalOpen(true);
              }}
              leftIcon={<UserPlus className="w-4 h-4" />}
              className="shadow-sm font-bold"
            >
              Enroll New Learner
            </Button>
          )}
        </div>
      </div>

      {/* Top Colorful Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Learners</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{totalLearners}</p>
            <p className="text-2xs text-blue-100 mt-0.5 font-medium">Active learner admissions</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Active Roster</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{activeLearners}</p>
            <p className="text-2xs text-emerald-100 mt-0.5 font-medium">Currently in class attendance</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-100">Day Scholars</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{dayLearners}</p>
            <p className="text-2xs text-purple-100 mt-0.5 font-medium">Daily commute students</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Boarding Wing</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{boardingLearners}</p>
            <p className="text-2xs text-amber-100 mt-0.5 font-medium">Campus residency students</p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 !p-4">
        <div className="w-full sm:w-96 relative">
          <Input
            placeholder="Search by name or admission no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="!py-2"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Transferred', value: 'transferred' },
              { label: 'Graduated', value: 'graduated' },
            ]}
            className="!py-2 text-xs"
          />
        </div>
      </Card>

      {/* Students Table */}
      <Card className="!p-0 overflow-hidden">
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No students found"
            description="No learners match your search query or enrolled list is currently empty."
            actionLabel="Enroll First Student"
            onAction={() => {
              setAdmissionNo(getNextAdmissionNumber(students, getCurrentAdmissionYear()));
              setIsEnrollModalOpen(true);
            }}
          />
        ) : (
          <>
            {/* Mobile Card List View (sm:hidden) */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 bg-white hover:bg-gray-50/80 transition flex items-center justify-between gap-3 cursor-pointer active:bg-gray-100/60"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 font-bold flex items-center justify-center shrink-0 text-sm">
                      {student.firstName.charAt(0)}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-bold text-gray-900 text-xs truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-2xs text-gray-500 font-semibold">{student.admissionNumber}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-2xs text-slate-600 font-medium">{student.currentClassId || 'Grade 4'}</span>
                        <span className="text-gray-300">•</span>
                        <Badge variant="brand" size="sm" dot>
                          {student.status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExamCardStudent(student);
                      }}
                      className="p-2 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Print Examination Pass / ID"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {schools.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransferStudent(student);
                        }}
                        className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Transfer Branch"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudentToDelete(student);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Learner Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden on sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-2xs font-semibold">
                    <th className="py-3.5 px-4">Learner</th>
                    <th className="py-3.5 px-4">Admission No.</th>
                    <th className="py-3.5 px-4">Class</th>
                    <th className="py-3.5 px-4">Mode</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 font-semibold flex items-center justify-center shrink-0">
                            {student.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-2xs text-gray-500 capitalize">
                              {student.gender || 'Learner'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-600">
                        {student.admissionNumber}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        {student.currentClassId || 'Grade 4'}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <Badge
                          variant={student.boardingStatus === 'boarding' ? 'accent' : 'neutral'}
                          size="sm"
                        >
                          {student.boardingStatus || 'Day'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="brand" size="sm" dot>
                          {student.status || 'Active'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExamCardStudent(student);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Print Examination Card / ID"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {isAdmin && schools.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransferStudent(student);
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Inter-Branch Campus Transfer"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(student);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-100 transition-colors"
                            title="View Learner Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStudentToDelete(student);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Learner Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
      </>
      )}

      {/* Enroll Student Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Enroll New Learner"
        description="Add student record with guardian details and isolated medical subcollection"
        maxWidth="lg"
      >
        <form onSubmit={handleEnroll} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Admission No."
              value={admissionNo}
              readOnly
              helperText="Generated automatically for the current year"
              required
            />
            <Select
              label="Current Class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              options={[
                { label: 'PP1 (Pre-Primary 1)', value: 'PP1' },
                { label: 'PP2 (Pre-Primary 2)', value: 'PP2' },
                { label: 'Grade 1', value: 'Grade 1' },
                { label: 'Grade 2', value: 'Grade 2' },
                { label: 'Grade 3', value: 'Grade 3' },
                { label: 'Grade 4', value: 'Grade 4' },
                { label: 'Grade 5', value: 'Grade 5' },
                { label: 'Grade 6', value: 'Grade 6' },
                { label: 'Junior School (Grade 7)', value: 'Grade 7' },
                { label: 'Form 1 (Senior)', value: 'Form 1' },
              ]}
            />
          </div>

          <Input
            label="School Email"
            value={getSchoolEmailForAdmission(
              admissionNo,
              getSchoolEmailDomain(currentSchool)
            )}
            readOnly
            helperText={
              getSchoolEmailDomain(currentSchool)
                ? 'Generated from the admission number and school email domain'
                : 'Set a school email domain in Institution Settings'
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Samuel"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Otieno"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
              ]}
            />
            <Select
              label="Boarding Status"
              value={boardingStatus}
              onChange={(e) => setBoardingStatus(e.target.value as 'day' | 'boarding')}
              options={[
                { label: 'Day Scholar', value: 'day' },
                { label: 'Boarding', value: 'boarding' },
              ]}
            />
          </div>

          {/* Guardian Info */}
          <div className="pt-2 border-t border-gray-200 space-y-3">
            <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">
              Primary Guardian & Emergency Contact
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Guardian Full Name"
                placeholder="Mary Otieno"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
              <Input
                label="Guardian Phone"
                placeholder="+254711223344"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                helperText="Used for SMS & OTP logins"
              />
            </div>
          </div>

          {/* Medical Subcollection Alert */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <HeartPulse className="w-3.5 h-3.5 text-red-500" />
              <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                Medical & Allergy Alerts (Restricted Subcollection)
              </p>
            </div>
            <Input
              placeholder="e.g. Asthmatic, Peanut allergy, Penicillin allergy"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              helperText="Encrypted and isolated in /medical subcollection per security plan"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEnrollModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Enroll Learner
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Student Details Modal */}
      {selectedStudent && (
        <Modal
          isOpen={Boolean(selectedStudent)}
          onClose={() => setSelectedStudent(null)}
          title={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
          description={`Admission No: ${selectedStudent.admissionNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200">
              <div>
                <span className="text-gray-500 block text-2xs">Class</span>
                <span className="font-semibold text-gray-900">
                  {selectedStudent.currentClassId || 'Grade 4'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-2xs">Status</span>
                <Badge variant="brand" size="sm">
                  {selectedStudent.status}
                </Badge>
              </div>
              <div>
                <span className="text-gray-500 block text-2xs">Boarding</span>
                <span className="capitalize font-medium text-gray-700">
                  {selectedStudent.boardingStatus || 'Day'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-2xs">Campus</span>
                <span className="font-medium text-gray-700">
                  {currentSchool?.name}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-2xs font-semibold text-gray-500 uppercase tracking-wider">
                Guardian Emergency Contact
              </span>
              <p className="text-gray-700 font-medium">
                Phone: {selectedStudent.guardianPhone || '+254712345678'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const st = selectedStudent;
                    setSelectedStudent(null);
                    setExamCardStudent(st);
                  }}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Exam Card
                </Button>
                {schools.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const st = selectedStudent;
                      setSelectedStudent(null);
                      setTransferStudent(st);
                    }}
                    leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                  >
                    Transfer
                  </Button>
                )}
              </div>
              <Button size="sm" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Exam Card Modal */}
      <ExamCardModal
        isOpen={Boolean(examCardStudent)}
        onClose={() => setExamCardStudent(null)}
        student={examCardStudent}
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
        templateKey={currentSchool?.branding?.examCardTemplate || 'classic'}
        primaryColor={currentSchool?.branding?.primaryColor || '#1d5f99'}
        secondaryColor={currentSchool?.branding?.secondaryColor || '#683669'}
      />

      {/* Campus Transfer Modal */}
      <TransferStudentModal
        isOpen={Boolean(transferStudent)}
        onClose={() => setTransferStudent(null)}
        student={transferStudent}
        orgId={organization?.id || ''}
        currentSchoolId={currentSchool?.id || ''}
        availableSchools={schools}
      />

      {/* Delete Single Learner Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStudentToDelete(null);
        }}
        title="Delete Learner Record"
        description="Permanently remove this student from your school branch database"
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <p className="font-bold">Are you sure you want to permanently delete this learner?</p>
            <p className="mt-1 font-semibold text-rose-800">
              {studentToDelete?.firstName} {studentToDelete?.lastName} ({studentToDelete?.admissionNumber})
            </p>
            <p className="mt-1 text-slate-500">
              This action cannot be undone. Their admission profile and records will be deleted from the database.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setStudentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteStudent}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Wipe All Learners Confirmation Modal */}
      <Modal
        isOpen={isWipeAllModalOpen}
        onClose={() => setIsWipeAllModalOpen(false)}
        title="Wipe All Learners"
        description="Clear all enrolled learners to start with a 100% clean slate"
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <p className="font-black text-rose-950">⚠️ WARNING: Irreversible Operation</p>
            <p className="mt-1 text-slate-700">
              This will permanently delete <strong>all {totalLearners} learner records</strong> in{' '}
              <strong>{currentSchool?.name || 'this school branch'}</strong>.
            </p>
            <p className="mt-1 text-slate-500">
              Use this when you want to wipe demo/test students and enroll or import your real school master roster from Excel (.xlsx).
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsWipeAllModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleWipeAllLearners}
              isLoading={isWipingAll}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Wipe All {totalLearners} Learners
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
