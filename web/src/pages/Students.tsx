import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatAdmissionNumber,
  getCurrentAdmissionYear,
  getNextAdmissionNumber,
  getSchoolEmailDomain,
  getSchoolEmailForAdmission,
} from '../utils/admission';
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
  const { organization, currentSchool, schools } = useTenant();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [examCardStudent, setExamCardStudent] = useState<StudentRecord | null>(null);
  const [transferStudent, setTransferStudent] = useState<StudentRecord | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

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

        // Set real live data
        setStudents(list);
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

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      `${s.firstName} ${s.lastName} ${s.admissionNumber}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Students & Learners
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Enrolled learners at {currentSchool?.name || 'Main Campus'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            isLoading={exportingExcel}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Excel (.xlsx)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAdmissionNo(getNextAdmissionNumber(students, getCurrentAdmissionYear()));
              setIsEnrollModalOpen(true);
            }}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Enroll New Student
          </Button>
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
                          {schools.length > 1 && (
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
    </div>
  );
};
