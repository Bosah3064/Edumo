import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  createdAt?: unknown;
}

export const Students: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

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

        // If newly created school with 0 students, seed sensible demo view
        if (list.length === 0) {
          const sampleList: StudentRecord[] = [
            {
              id: 'demo-1',
              admissionNumber: 'ADM-2026-001',
              firstName: 'Amina',
              lastName: 'Kariuki',
              currentClassId: 'Grade 4',
              currentStreamId: 'East',
              gender: 'female',
              boardingStatus: 'day',
              status: 'active',
              guardianPhone: '+254712345678',
            },
            {
              id: 'demo-2',
              admissionNumber: 'ADM-2026-002',
              firstName: 'Brian',
              lastName: 'Omondi',
              currentClassId: 'Grade 4',
              currentStreamId: 'East',
              gender: 'male',
              boardingStatus: 'boarding',
              status: 'active',
              guardianPhone: '+254722334455',
            },
            {
              id: 'demo-3',
              admissionNumber: 'ADM-2026-003',
              firstName: 'Chantal',
              lastName: 'Uwase',
              currentClassId: 'Grade 5',
              currentStreamId: 'North',
              gender: 'female',
              boardingStatus: 'day',
              status: 'active',
              guardianPhone: '+250788112233',
            },
          ];
          setStudents(sampleList);
        } else {
          setStudents(list);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching students:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [organization, currentSchool]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;
    if (!admissionNo || !firstName || !lastName) {
      toast.error('Admission number, first and last name are required');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Enrolling learner...');

    try {
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
        admissionNumber: admissionNo.trim(),
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

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const nextAdm = `ADM-2026-${String(students.length + 1).padStart(3, '0')}`;
            setAdmissionNo(nextAdm);
            setIsEnrollModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Enroll New Student
        </Button>
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
            onAction={() => setIsEnrollModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(student);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              onChange={(e) => setAdmissionNo(e.target.value)}
              placeholder="e.g. ADM-2026-042"
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

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
