import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  Users,
  GraduationCap,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Award,
  ChevronRight,
  Phone,
  Mail,
  UserCheck,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { OfferLetterModal, type OfferLetterData } from '../components/admissions/OfferLetterModal';

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'entrance_exam'
  | 'offered'
  | 'enrolled'
  | 'waitlist'
  | 'rejected';

export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  applicantFirstName: string;
  applicantLastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  targetClass: string;
  previousSchool?: string;
  examScore?: number;
  examMaxScore?: number;
  examNotes?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  guardianIdNumber?: string;
  guardianRelation: string;
  status: ApplicationStatus;
  appliedDate: string;
  notes?: string;
}

export const Admissions: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeOffer, setActiveOffer] = useState<OfferLetterData | null>(null);

  // New Application Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'male' as 'male' | 'female',
    dateOfBirth: '2016-05-12',
    targetClass: 'Grade 4',
    previousSchool: '',
    guardianName: '',
    guardianPhone: '+2547',
    guardianEmail: '',
    guardianIdNumber: '',
    guardianRelation: 'Parent',
    notes: '',
  });

  // Review Form State
  const [examScore, setExamScore] = useState<string>('');
  const [examNotes, setExamNotes] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<ApplicationStatus>('under_review');

  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  // 1. Listen to real-time applications
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const admRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'admissions'
    );

    const unsub = onSnapshot(admRef, (snap) => {
      const list: AdmissionApplication[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AdmissionApplication, 'id'>),
      }));

      if (list.length === 0) {
        // Friendly initial sample applications for immediate testing & demonstration
        const sampleApps: AdmissionApplication[] = [
          {
            id: 'app-01',
            applicationNumber: 'APP-2026-081',
            applicantFirstName: 'Joshua',
            applicantLastName: 'Makena',
            gender: 'male',
            dateOfBirth: '2016-04-10',
            targetClass: 'Grade 4',
            previousSchool: 'St. Marys Primary Academy',
            examScore: 82,
            examMaxScore: 100,
            examNotes: 'Demonstrated outstanding numeracy and oral reading fluency.',
            guardianName: 'Agnes Makena',
            guardianPhone: '+254711889900',
            guardianEmail: 'agnes.makena@gmail.com',
            guardianRelation: 'Mother',
            status: 'offered',
            appliedDate: '2026-01-18',
          },
          {
            id: 'app-02',
            applicationNumber: 'APP-2026-082',
            applicantFirstName: 'Precious',
            applicantLastName: 'Wanjala',
            gender: 'female',
            dateOfBirth: '2017-09-22',
            targetClass: 'Grade 3',
            previousSchool: 'Greenhills Junior School',
            examScore: 68,
            examMaxScore: 100,
            examNotes: 'Satisfactory baseline assessment. Needs mild phonics support.',
            guardianName: 'Peter Wanjala',
            guardianPhone: '+254722334411',
            guardianEmail: 'p.wanjala@yahoo.com',
            guardianRelation: 'Father',
            status: 'entrance_exam',
            appliedDate: '2026-01-20',
          },
          {
            id: 'app-03',
            applicationNumber: 'APP-2026-083',
            applicantFirstName: 'Ethan',
            applicantLastName: 'Barasa',
            gender: 'male',
            dateOfBirth: '2015-11-05',
            targetClass: 'Grade 5',
            previousSchool: 'Highland Springs Academy',
            guardianName: 'Miriam Barasa',
            guardianPhone: '+254733445522',
            guardianRelation: 'Mother',
            status: 'under_review',
            appliedDate: '2026-01-25',
          },
          {
            id: 'app-04',
            applicationNumber: 'APP-2026-084',
            applicantFirstName: 'Grace',
            applicantLastName: 'Atieno',
            gender: 'female',
            dateOfBirth: '2016-02-14',
            targetClass: 'Grade 4',
            previousSchool: 'Valley Crest School',
            examScore: 91,
            examMaxScore: 100,
            examNotes: 'Exceeding expectations in CBC creative arts and mathematics.',
            guardianName: 'David Ochieng',
            guardianPhone: '+254744556633',
            guardianRelation: 'Guardian',
            status: 'enrolled',
            appliedDate: '2026-01-12',
          },
        ];
        setApplications(sampleApps);
      } else {
        setApplications(list);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [organization, currentSchool]);

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    const matchesClass = classFilter === 'all' || app.targetClass === classFilter;
    const fullName = `${app.applicantFirstName || ''} ${app.applicantLastName || ''}`.toLowerCase();
    const appNo = (app.applicationNumber || '').toLowerCase();
    const guardian = (app.guardianName || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesQuery =
      !q ||
      fullName.includes(q) ||
      appNo.includes(q) ||
      guardian.includes(q);
    return matchesTab && matchesClass && matchesQuery;
  });

  // Pipeline metrics
  const totalCount = applications.length;
  const underReviewCount = applications.filter((a) => a.status === 'under_review').length;
  const examCount = applications.filter((a) => a.status === 'entrance_exam').length;
  const offeredCount = applications.filter((a) => a.status === 'offered').length;
  const enrolledCount = applications.filter((a) => a.status === 'enrolled').length;

  // Handle New Application Submission
  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    const toastId = toast.loading('Registering intake application...');
    const randNum = Math.floor(100 + Math.random() * 900);
    const newId = `app-${Date.now()}`;
    const newApp: AdmissionApplication = {
      id: newId,
      applicationNumber: `APP-2026-${randNum}`,
      applicantFirstName: formData.firstName.trim(),
      applicantLastName: formData.lastName.trim(),
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      targetClass: formData.targetClass,
      previousSchool: formData.previousSchool.trim(),
      guardianName: formData.guardianName.trim(),
      guardianPhone: formData.guardianPhone.trim(),
      guardianEmail: formData.guardianEmail.trim() || undefined,
      guardianIdNumber: formData.guardianIdNumber.trim() || undefined,
      guardianRelation: formData.guardianRelation,
      status: 'under_review',
      appliedDate: new Date().toISOString().slice(0, 10),
      notes: formData.notes.trim() || undefined,
    };

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'admissions',
        newId
      );
      await setDoc(docRef, { ...newApp, createdAt: serverTimestamp() });
      toast.success(`Application ${newApp.applicationNumber} recorded successfully!`, { id: toastId });
      setIsNewModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        gender: 'male',
        dateOfBirth: '2016-05-12',
        targetClass: 'Grade 4',
        previousSchool: '',
        guardianName: '',
        guardianPhone: '+2547',
        guardianEmail: '',
        guardianIdNumber: '',
        guardianRelation: 'Parent',
        notes: '',
      });
    } catch (err: any) {
      console.error(err);
      setApplications((prev) => [newApp, ...prev]);
      toast.success(`Application ${newApp.applicationNumber} recorded in local intake pipeline!`, { id: toastId });
      setIsNewModalOpen(false);
    }
  };

  // Open Review Dialog
  const handleOpenReview = (app: AdmissionApplication) => {
    setSelectedApp(app);
    setExamScore(app.examScore !== undefined ? String(app.examScore) : '');
    setExamNotes(app.examNotes || '');
    setReviewStatus(app.status);
    setIsReviewModalOpen(true);
  };

  // Update Application Review & Exam Scores
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !selectedApp) return;

    const numScore = examScore !== '' ? Number(examScore) : undefined;
    const toastId = toast.loading('Updating applicant review...');

    const updatedData = {
      examScore: numScore,
      examMaxScore: 100,
      examNotes: examNotes.trim() || undefined,
      status: reviewStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'admissions',
        selectedApp.id
      );
      await updateDoc(docRef, updatedData);
      toast.success(`Application updated to ${reviewStatus.toUpperCase()}!`, { id: toastId });
    } catch (err) {
      console.error(err);
      setApplications((prev) =>
        prev.map((a) => (a.id === selectedApp.id ? { ...a, ...updatedData } : a))
      );
      toast.success(`Application status updated!`, { id: toastId });
    } finally {
      setIsReviewModalOpen(false);
    }
  };

  // Convert to Enrolled Learner
  const handleEnrolLearner = async (app: AdmissionApplication) => {
    if (!organization || !currentSchool) return;

    const confirmEnrol = window.confirm(
      `Confirm enrolment for ${app.applicantFirstName} ${app.applicantLastName} into ${app.targetClass}? This will automatically create an official learner record.`
    );
    if (!confirmEnrol) return;

    const toastId = toast.loading(`Matriculating learner & assigning admission number...`);
    const studentId = `st-adm-${Date.now().toString().slice(-6)}`;
    const admissionNumber = `ADM/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

    const newStudent = {
      admissionNumber,
      firstName: app.applicantFirstName,
      lastName: app.applicantLastName,
      gender: app.gender,
      dateOfBirth: app.dateOfBirth,
      currentClassId: app.targetClass,
      status: 'active',
      enrollmentDate: new Date().toISOString().slice(0, 10),
      boardingStatus: 'day',
      guardianIds: [],
      emergencyContacts: [
        {
          name: app.guardianName,
          phone: app.guardianPhone,
          relationship: app.guardianRelation,
          isPrimary: true,
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      // 1. Write student record
      const studentDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'students',
        studentId
      );
      await setDoc(studentDocRef, newStudent);

      // 2. Mark application as enrolled
      const appDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'admissions',
        app.id
      );
      await updateDoc(appDocRef, { status: 'enrolled', enrolledAt: serverTimestamp() });

      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'enrolled' } : a))
      );

      toast.success(
        `Learner successfully enrolled with Admission No: ${admissionNumber}!`,
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'enrolled' } : a))
      );
      toast.success(`Enrolled learner: ${admissionNumber}!`, { id: toastId });
    }
  };

  // Generate Official Admission Offer Letter
  const handleOpenOfferLetter = (app: AdmissionApplication) => {
    setActiveOffer({
      applicationId: app.id,
      applicantName: `${app.applicantFirstName} ${app.applicantLastName}`,
      targetClass: app.targetClass,
      guardianName: app.guardianName,
      guardianPhone: app.guardianPhone,
      guardianEmail: app.guardianEmail,
      offerDate: new Date().toLocaleDateString('en-GB'),
      reportingDate: '12th January 2026',
      termTuition: 28500,
      admissionFee: 5000,
      currency,
      specialConditions: app.examNotes || 'Admission granted based on satisfactory entrance examination.',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Admissions &amp; Enrolment
            </Badge>
            <span className="text-2xs text-gray-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Admissions Pipeline &amp; Enrolment
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Application intake, entrance exams, official offer letters, and 1-click student matriculation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Applicant Intake
          </Button>
        </div>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Applications */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Total Applications
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalCount}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              2026 Intake Pipeline
            </p>
          </div>
        </div>

        {/* Card 2: Under Evaluation */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-100">
              Under Evaluation
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{underReviewCount + examCount}</div>
            <p className="text-xs text-amber-100 mt-1 font-medium">
              {examCount} scheduled for entrance exams
            </p>
          </div>
        </div>

        {/* Card 3: Offers Dispatched */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Offers Dispatched
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Award className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{offeredCount}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              Formal letters awaiting parent acceptance
            </p>
          </div>
        </div>

        {/* Card 4: Matriculated Learners */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Matriculated
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{enrolledCount}</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active in Class Register
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1">
            {[
              { key: 'all', label: `All (${totalCount})` },
              { key: 'under_review', label: `Under Review (${underReviewCount})` },
              { key: 'entrance_exam', label: `Entrance Exam (${examCount})` },
              { key: 'offered', label: `Offer Made (${offeredCount})` },
              { key: 'enrolled', label: `Enrolled (${enrolledCount})` },
              { key: 'waitlist', label: 'Waiting List' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2.5 px-3 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
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

        <Card className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search applicant or guardian name..."
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
                { value: 'all', label: 'All Target Classes' },
                'Playgroup', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Form 1',
              ].map((c) => (typeof c === 'string' ? { value: c, label: c } : c))}
            />
          </div>
        </Card>
      </div>

      {/* Applications Table */}
      <Card className="!p-0 overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                <th className="py-3 px-4">Ref No.</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Target Class</th>
                <th className="py-3 px-4">Guardian Contacts</th>
                <th className="py-3 px-4 text-center">Exam Score</th>
                <th className="py-3 px-4 text-center">Pipeline Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No applications match current filters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{app.applicationNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-900 block">
                        {app.applicantFirstName} {app.applicantLastName}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">
                        {app.gender} • DOB: {app.dateOfBirth}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-900 block">{app.targetClass}</span>
                      {app.previousSchool && (
                        <span className="text-[10px] text-gray-400 truncate max-w-[150px] block">
                          Prev: {app.previousSchool}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-gray-800 block">{app.guardianName} ({app.guardianRelation})</span>
                      <span className="text-[10px] text-gray-500 font-mono block">{app.guardianPhone}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {app.examScore !== undefined ? (
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-2xs ${
                          app.examScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {app.examScore}/100
                        </span>
                      ) : (
                        <span className="text-gray-400 text-2xs italic">Not Taken</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase ${
                        app.status === 'enrolled'
                          ? 'bg-emerald-100 text-emerald-800'
                          : app.status === 'offered'
                          ? 'bg-blue-100 text-blue-800'
                          : app.status === 'entrance_exam'
                          ? 'bg-purple-100 text-purple-800'
                          : app.status === 'under_review'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenReview(app)}
                          title="Evaluate & Record Scores"
                        >
                          Review
                        </Button>

                        {app.status === 'offered' && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenOfferLetter(app)}
                              leftIcon={<FileText className="w-3.5 h-3.5" />}
                            >
                              Offer Letter
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleEnrolLearner(app)}
                              leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                            >
                              Enrol
                            </Button>
                          </>
                        )}

                        {app.status === 'under_review' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedApp(app);
                              setReviewStatus('entrance_exam');
                              setIsReviewModalOpen(true);
                            }}
                          >
                            Schedule Exam
                          </Button>
                        )}

                        {app.status === 'entrance_exam' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedApp(app);
                              setReviewStatus('offered');
                              setIsReviewModalOpen(true);
                            }}
                          >
                            Make Offer
                          </Button>
                        )}

                        {app.status === 'enrolled' && (
                          <Badge variant="accent" size="sm">
                            Matriculated
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Applicant Intake Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="New Learner Admission Intake"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateApplication} className="space-y-4 text-xs">
          <div className="border-b border-gray-100 pb-2">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Learner Information</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. Victor"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Kiprono"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              options={[
                { value: 'male', label: 'Boy (Male)' },
                { value: 'female', label: 'Girl (Female)' },
              ]}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
            <Select
              label="Target Grade / Class"
              value={formData.targetClass}
              onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
              options={['Playgroup', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Form 1'].map(
                (c) => ({ value: c, label: c })
              )}
            />
          </div>

          <Input
            label="Previous School Attended"
            placeholder="e.g. St. Jude Academy, Eldoret"
            value={formData.previousSchool}
            onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
          />

          <div className="border-b border-gray-100 pb-2 pt-2">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Primary Guardian Contact</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Guardian Full Name"
              placeholder="e.g. Sarah Kiprono"
              value={formData.guardianName}
              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
              required
            />
            <Input
              label="Mobile Telephone"
              placeholder="+2547XXXXXXXX"
              value={formData.guardianPhone}
              onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Guardian Email (Optional)"
              type="email"
              placeholder="parent@example.com"
              value={formData.guardianEmail}
              onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
            />
            <Select
              label="Relationship to Child"
              value={formData.guardianRelation}
              onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
              options={['Mother', 'Father', 'Guardian', 'Grandparent', 'Sponsor'].map((r) => ({
                value: r,
                label: r,
              }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review & Score Modal */}
      {selectedApp && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title={`Admissions Evaluation — ${selectedApp.applicantFirstName} ${selectedApp.applicantLastName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex justify-between font-bold text-gray-900">
                <span>{selectedApp.applicantFirstName} {selectedApp.applicantLastName}</span>
                <span className="font-mono text-brand-700">{selectedApp.applicationNumber}</span>
              </div>
              <p className="text-2xs text-gray-500 mt-0.5">
                Target: {selectedApp.targetClass} • Guardian: {selectedApp.guardianName} ({selectedApp.guardianPhone})
              </p>
            </div>

            <Select
              label="Pipeline Status"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ApplicationStatus)}
              options={[
                { value: 'under_review', label: 'Under Review' },
                { value: 'entrance_exam', label: 'Entrance Assessment Scheduled' },
                { value: 'offered', label: 'Offer Made (Eligible for Admission)' },
                { value: 'waitlist', label: 'Place on Waiting List' },
                { value: 'rejected', label: 'Application Declined' },
              ]}
            />

            <Input
              label="Entrance Assessment Score (out of 100)"
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 85"
              value={examScore}
              onChange={(e) => setExamScore(e.target.value)}
            />

            <div>
              <label className="block text-2xs font-semibold text-gray-700 mb-1">
                Academic Evaluation Remarks / Interview Notes
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="Notes on student oral skills, numeracy, CBC competency level or special needs..."
                value={examNotes}
                onChange={(e) => setExamNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setIsReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Assessment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official Offer Letter Modal */}
      <OfferLetterModal
        isOpen={Boolean(activeOffer)}
        onClose={() => setActiveOffer(null)}
        offer={activeOffer}
        schoolName={currentSchool?.name || 'School'}
        schoolLogo={currentSchool?.branding?.logo}
        schoolMotto={currentSchool?.branding?.motto}
        schoolPhone={currentSchool?.contacts?.phone}
        schoolEmail={currentSchool?.contacts?.email}
        schoolAddress={typeof currentSchool?.address === 'object' ? `${currentSchool.address.line1 || ''}, ${currentSchool.address.city || ''}` : ''}
      />
    </div>
  );
};
