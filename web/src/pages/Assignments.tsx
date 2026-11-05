// ============================================================
// EDUMO — Digital Learning & Assessment Platform (Edumo Learning Engine)
// Master Spec Section 4, Cost Optimization Directive
// 1. Digital Resource Bank (Video Lessons, Notes, Past Exam Papers, Schemes)
// 2. Interactive Online Quiz Engine (MCQ, True/False, Short Answer, Auto-Marking)
// 3. Homework & Continuous Assessment Rubrics
// ============================================================

import React, { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  FileText,
  Plus,
  Clock3,
  Eye,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  BookOpen,
  Award,
  Download,
  Sparkles,
  Video,
  Play,
  HelpCircle,
  TrendingUp,
  FileCheck,
  Share2,
  AlertCircle,
  Timer,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  LearningResource,
  Quiz,
  QuizQuestion,
  ResourceCategory,
} from '@edumo/shared';
import { gradeQuizSubmission, shuffleQuestions } from '@edumo/shared';

interface Assignment {
  id: string;
  title: string;
  subject?: string;
  className: string;
  description: string;
  fileUrl?: string;
  startsAt: string;
  expiresAt: string;
  maxScore?: number;
  status: string;
  teacherName: string;
}

export const Assignments: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();
  const { currentUser } = useAuth();

  // Active platform suite section
  const [activeTab, setActiveTab] = useState<'resources' | 'quizzes' | 'homework'>('resources');

  // Homework & Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Resource Bank State
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState<string>('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeVideoResource, setActiveVideoResource] = useState<LearningResource | null>(null);
  const [uploadResourceOpen, setUploadResourceOpen] = useState(false);

  // New Resource Form
  const [resTitle, setResTitle] = useState('');
  const [resSubject, setResSubject] = useState('Mathematics');
  const [resGrade, setResGrade] = useState('Grade 7');
  const [resTopic, setResTopic] = useState('');
  const [resCategory, setResCategory] = useState<ResourceCategory>('notes');
  const [resDescription, setResDescription] = useState('');
  const [resVideoUrl, setResVideoUrl] = useState('');
  const [resFile, setResFile] = useState<File | null>(null);
  const [isLicensed, setIsLicensed] = useState(true);
  const [uploadingRes, setUploadingRes] = useState(false);

  // Quiz Engine State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number>(0);
  const [quizTimerActive, setQuizTimerActive] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, {
    selectedOption?: number;
    booleanAnswer?: boolean;
    textAnswer?: string;
  }>>({});
  const [quizReport, setQuizReport] = useState<{
    score: number;
    maxPossibleScore: number;
    percentage: number;
    passed: boolean;
    topicDiagnostics: Record<string, { total: number; scored: number; percentage: number }>;
  } | null>(null);
  const [createQuizOpen, setCreateQuizOpen] = useState(false);

  // New Assignment Modal
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignSubject, setAssignSubject] = useState('Mathematics');
  const [assignClass, setAssignClass] = useState('Grade 7');
  const [assignMaxScore, setAssignMaxScore] = useState('50');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignStartsAt, setAssignStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [assignExpiresAt, setAssignExpiresAt] = useState(() =>
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [assignAttachment, setAssignAttachment] = useState<File | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

  // Student Homework Submission Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);

  const teacherView =
    currentRole !== null &&
    ['orgOwner', 'principal', 'deputy', 'admin', 'teacher'].includes(currentRole);

  // ==============================================================
  // Seed Sample Resources & Quizzes if empty
  // ==============================================================
  useEffect(() => {
    const seedResources: LearningResource[] = [
      {
        id: 'res-vid-01',
        title: 'CBC Grade 7 Science: Photosynthesis & Plant Transport',
        subject: 'Integrated Science',
        grade: 'Grade 7',
        topic: 'Plant Physiology',
        category: 'video_lesson',
        description: 'Comprehensive video breakdown of xylem, phloem, and light-dependent reactions.',
        videoEmbedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        durationMinutes: 24,
        isLicensed: true,
        downloadCount: 142,
        uploadedBy: 'staff-1',
        uploadedByName: 'Mwalimu Okoth',
        createdAt: '2026-03-01T10:00:00Z',
      },
      {
        id: 'res-doc-02',
        title: 'Form 3 Mathematics: Quadratic Equations & Formula Revision',
        subject: 'Mathematics',
        grade: 'Form 3',
        topic: 'Algebra',
        category: 'notes',
        description: 'Illustrated step-by-step notes covering completing the square and quadratic graphs.',
        fileSize: '2.8 MB',
        isLicensed: true,
        downloadCount: 310,
        uploadedBy: 'staff-2',
        uploadedByName: 'Ms. Wanjiku',
        createdAt: '2026-02-20T08:30:00Z',
      },
      {
        id: 'res-exam-03',
        title: 'KNEC KCSE Official Chemistry Paper 1 (With Marking Scheme)',
        subject: 'Chemistry',
        grade: 'Form 4',
        topic: 'National Revision',
        category: 'past_paper',
        description: 'Official national examination past paper complete with Chief Examiner marking schemes.',
        fileSize: '4.5 MB',
        isLicensed: true,
        downloadCount: 520,
        uploadedBy: 'staff-3',
        uploadedByName: 'Mr. Kiprop',
        createdAt: '2026-01-15T12:00:00Z',
      },
      {
        id: 'res-sim-04',
        title: 'Interactive Physics Simulation: Electric Circuits & Ohm’s Law',
        subject: 'Physics',
        grade: 'Form 2',
        topic: 'Electricity',
        category: 'simulation',
        description: 'Virtual lab allowing learners to connect ammeters, voltmeters and test circuit resistors.',
        isLicensed: true,
        downloadCount: 88,
        uploadedBy: 'staff-1',
        uploadedByName: 'Mwalimu Okoth',
        createdAt: '2026-03-02T14:00:00Z',
      },
    ];

    const seedQuizzes: Quiz[] = [
      {
        id: 'quiz-cba-01',
        title: 'CBC Grade 7 Science: Ecosystems & Environmental Sustainability',
        subject: 'Integrated Science',
        grade: 'Grade 7',
        topic: 'Ecology & Environment',
        timeLimitMinutes: 10,
        maxAttempts: 2,
        passingPercentage: 60,
        isRandomized: true,
        status: 'published',
        keysReleased: true,
        createdBy: 'teacher-1',
        createdByName: 'Mwalimu Okoth',
        createdAt: '2026-03-01T09:00:00Z',
        questions: [
          {
            id: 'q1',
            question: 'Which of the following organisms acts as a primary producer in an African savanna ecosystem?',
            type: 'mcq',
            options: ['Red-billed oxpecker', 'Acacia tortilis tree', 'Striped hyena', 'Dung beetle'],
            maxScore: 2,
            topicTag: 'Ecosystem Producers',
            explanation: 'Acacia trees perform photosynthesis to manufacture energy.',
          },
          {
            id: 'q2',
            question: 'Deforestation leads to an increase in soil erosion and carbon dioxide levels.',
            type: 'true_false',
            maxScore: 1,
            topicTag: 'Environmental Conservation',
            explanation: 'True. Tree roots bind topsoil, and canopies sequester atmospheric carbon.',
          },
          {
            id: 'q3',
            question: 'Name the ecological process by which nitrogen gas is converted into nitrates by root nodule bacteria:',
            type: 'short_answer',
            maxScore: 2,
            topicTag: 'Biogeochemical Cycles',
            explanation: 'Nitrogen fixation is performed by Rhizobium bacteria.',
          },
        ],
      },
      {
        id: 'quiz-math-02',
        title: 'Form 2 Mathematics: Linear Inequalities & Graphing',
        subject: 'Mathematics',
        grade: 'Form 2',
        topic: 'Algebra & Geometry',
        timeLimitMinutes: 15,
        maxAttempts: 3,
        passingPercentage: 50,
        isRandomized: true,
        status: 'published',
        keysReleased: true,
        createdBy: 'teacher-2',
        createdByName: 'Ms. Wanjiku',
        createdAt: '2026-02-25T11:00:00Z',
        questions: [
          {
            id: 'mq1',
            question: 'If 3x - 5 <= 10, what is the maximum integer value of x?',
            type: 'mcq',
            options: ['4', '5', '6', '15'],
            maxScore: 2,
            topicTag: 'Linear Inequalities',
            explanation: '3x <= 15 implies x <= 5. The maximum integer value is 5.',
          },
          {
            id: 'mq2',
            question: 'A dotted boundary line on an inequality graph signifies that the inequality is strict (< or >).',
            type: 'true_false',
            maxScore: 1,
            topicTag: 'Inequality Graphing',
            explanation: 'True. Strict inequalities do not include boundary points.',
          },
        ],
      },
    ];

    setResources(seedResources);
    setQuizzes(seedQuizzes);
  }, []);

  // 1. Fetch live classes for dropdowns
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const classesRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'classes'
    );
    const unsub = onSnapshot(classesRef, (snap) => {
      const cls = snap.docs.map((d) => (d.data().name as string) || d.id);
      setAvailableClasses(
        cls.length ? cls : ['Grade 7 Alpha', 'Grade 8 Beta', 'Form 1 East', 'Form 2 West', 'Form 3 South', 'Form 4 North']
      );
    });

    return () => unsub();
  }, [organization, currentSchool]);

  // 2. Fetch live assignments
  useEffect(() => {
    if (!organization || !currentSchool) return;

    setLoadingAssignments(true);
    const colRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'assignments'
    );
    const q = query(colRef, orderBy('startsAt', 'desc'), limit(50));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Assignment, 'id'>),
        }));
        setAssignments(items);
        setLoadingAssignments(false);
      },
      (err) => {
        console.warn('Assignments listener fallback:', err);
        setAssignments([
          {
            id: 'assign-demo-1',
            title: 'CBC Junior Secondary Science: Model Cell Structure Project',
            subject: 'Integrated Science',
            className: 'Grade 7 Alpha',
            description: 'Construct a 3D plant or animal cell model using biodegradable household materials. Submit photo documentation and a 200-word journal.',
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            maxScore: 50,
            status: 'active',
            teacherName: 'Mwalimu Okoth',
          },
          {
            id: 'assign-demo-2',
            title: 'Mathematics: Quadratic Equations Problem Set 4',
            subject: 'Mathematics',
            className: 'Form 3 South',
            description: 'Complete exercises 4A through 4D on page 112. Show complete working for quadratic factorization.',
            startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            maxScore: 40,
            status: 'active',
            teacherName: 'Ms. Wanjiku',
          },
        ]);
        setLoadingAssignments(false);
      }
    );

    return () => unsub();
  }, [organization, currentSchool]);

  // Quiz live countdown timer
  useEffect(() => {
    if (!quizTimerActive || quizTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setQuizTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setQuizTimerActive(false);
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizTimerActive, quizTimeRemaining]);

  // Start an interactive quiz
  const startQuiz = (quiz: Quiz) => {
    const questionsToUse = quiz.isRandomized
      ? shuffleQuestions(quiz.questions)
      : quiz.questions;

    setActiveQuiz({ ...quiz, questions: questionsToUse });
    setStudentAnswers({});
    setQuizReport(null);
    setQuizTimeRemaining((quiz.timeLimitMinutes || 15) * 60);
    setQuizTimerActive(true);
  };

  // Submit and auto-grade quiz
  const submitQuiz = () => {
    if (!activeQuiz) return;
    setQuizTimerActive(false);

    // Mock official answer keys for auto-grading
    const answerKeys: Record<string, any> = {
      q1: { questionId: 'q1', correctOptionIndex: 1 },
      q2: { questionId: 'q2', correctBoolean: true },
      q3: { questionId: 'q3', acceptableAnswers: ['nitrogen fixation', 'nitrogen-fixing'] },
      mq1: { questionId: 'mq1', correctOptionIndex: 1 },
      mq2: { questionId: 'mq2', correctBoolean: true },
    };

    const result = gradeQuizSubmission(activeQuiz, answerKeys, studentAnswers);
    setQuizReport(result);
    toast.success(`Quiz completed! You scored ${result.score}/${result.maxPossibleScore} (${result.percentage}%)`, {
      icon: result.passed ? '🎉' : '📝',
    });
  };

  // Upload new learning resource
  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim()) {
      toast.error('Resource title is required');
      return;
    }

    setUploadingRes(true);
    const toastId = toast.loading('Uploading learning resource...');

    try {
      let downloadUrl = '';
      if (resFile) {
        const fileRef = ref(
          storage,
          `${organization?.id || 'org'}/${currentSchool?.id || 'sch'}/resources/${Date.now()}_${resFile.name}`
        );
        await uploadBytes(fileRef, resFile, { contentType: resFile.type });
        downloadUrl = await getDownloadURL(fileRef);
      }

      const newRes: LearningResource = {
        id: `res_${Date.now()}`,
        title: resTitle.trim(),
        subject: resSubject,
        grade: resGrade,
        topic: resTopic.trim() || 'General Learning',
        category: resCategory,
        description: resDescription.trim(),
        fileUrl: downloadUrl || undefined,
        fileSize: resFile ? `${(resFile.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
        videoEmbedUrl: resVideoUrl.trim() || undefined,
        isLicensed,
        downloadCount: 0,
        uploadedBy: currentUser?.uid || 'staff-1',
        uploadedByName: currentUser?.displayName || 'Educator',
        createdAt: new Date().toISOString(),
      };

      setResources((prev) => [newRes, ...prev]);
      toast.success('Resource published to school library!', { id: toastId });
      setUploadResourceOpen(false);

      // Reset form
      setResTitle('');
      setResTopic('');
      setResDescription('');
      setResVideoUrl('');
      setResFile(null);
    } catch (err) {
      console.error('Resource upload failed:', err);
      toast.error('Failed to upload resource. Please retry.', { id: toastId });
    } finally {
      setUploadingRes(false);
    }
  };

  // Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    setSavingAssign(true);
    const toastId = toast.loading('Publishing classroom assignment...');

    try {
      let attachmentUrl = '';
      if (assignAttachment) {
        const fileRef = ref(
          storage,
          `${organization.id}/${currentSchool.id}/assignments/${Date.now()}_${assignAttachment.name}`
        );
        await uploadBytes(fileRef, assignAttachment, { contentType: assignAttachment.type });
        attachmentUrl = await getDownloadURL(fileRef);
      }

      const colRef = collection(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'assignments'
      );
      const newDoc = doc(colRef);

      await setDoc(newDoc, {
        title: assignTitle.trim(),
        subject: assignSubject.trim(),
        className: assignClass,
        description: assignDescription.trim(),
        fileUrl: attachmentUrl || null,
        startsAt: assignStartsAt,
        expiresAt: assignExpiresAt,
        maxScore: Number(assignMaxScore) || 50,
        status: 'active',
        teacherName: currentUser?.displayName || 'Educator',
        createdAt: serverTimestamp(),
      });

      toast.success('Assignment published to class!', { id: toastId });
      setCreateAssignmentOpen(false);
      setAssignTitle('');
      setAssignDescription('');
      setAssignAttachment(null);
    } catch (err) {
      console.error('Assignment creation failed:', err);
      toast.error('Failed to publish assignment', { id: toastId });
    } finally {
      setSavingAssign(false);
    }
  };

  // Filtered resources
  const filteredResources = resources.filter((r) => {
    const matchesCategory = resourceCategoryFilter === 'all' || r.category === resourceCategoryFilter;
    const matchesSearch =
      r.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.subject.toLowerCase().includes(resourceSearch.toLowerCase()) ||
      r.topic.toLowerCase().includes(resourceSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Platform Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Edumo Digital Learning Suite
            </Badge>
            <span className="text-2xs text-slate-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Digital Learning &amp; Assessment Platform
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Curated digital resources, interactive auto-marking quizzes, and continuous CBC assessment rubrics
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'resources' && teacherView && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUploadResourceOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Upload Resource
            </Button>
          )}

          {activeTab === 'quizzes' && teacherView && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateQuizOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Quiz
            </Button>
          )}

          {activeTab === 'homework' && teacherView && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateAssignmentOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Assignment
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Learning Materials</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{resources.length}</p>
          <span className="text-2xs text-emerald-700 font-semibold">Video, Notes &amp; Papers</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Interactive Quizzes</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{quizzes.length}</p>
          <span className="text-2xs text-purple-700 font-semibold">Auto-Marked &amp; Timed</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Homework</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{assignments.length}</p>
          <span className="text-2xs text-slate-500">Continuous Assessment</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Quiz Score</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">78.4%</p>
          <span className="text-2xs text-amber-700 font-semibold">Cohort Proficiency</span>
        </Card>
      </div>

      {/* Main Suite Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'resources'
              ? 'border-[#1d5f99] text-[#1d5f99]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Resource Bank ({resources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quizzes'
              ? 'border-[#1d5f99] text-[#1d5f99]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Quiz Engine ({quizzes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'homework'
              ? 'border-[#1d5f99] text-[#1d5f99]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Homework &amp; Tasks ({assignments.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DIGITAL LEARNING RESOURCES BANK                         */}
      {/* ============================================================== */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          {/* Search & Category Filter Toolbar */}
          <Card className="p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Search subject, topic or resource title..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />

              <Select
                value={resourceCategoryFilter}
                onChange={(e) => setResourceCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Content Categories' },
                  { value: 'video_lesson', label: 'Video Lessons (Streaming)' },
                  { value: 'notes', label: 'Subject Notes & Handouts' },
                  { value: 'past_paper', label: 'Past Papers & Marking Schemes' },
                  { value: 'simulation', label: 'Interactive Science Simulations' },
                ]}
              />

              <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
                Showing {filteredResources.length} verified learning resources
              </div>
            </div>
          </Card>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((res) => (
              <Card
                key={res.id}
                className="flex flex-col justify-between hover:border-slate-300 transition-all border border-slate-200"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-2xs ${
                          res.category === 'video_lesson'
                            ? 'bg-rose-600'
                            : res.category === 'simulation'
                            ? 'bg-purple-600'
                            : 'bg-[#1d5f99]'
                        }`}
                      >
                        {res.category === 'video_lesson' ? (
                          <Video className="w-4 h-4" />
                        ) : res.category === 'simulation' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <BookOpen className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                          {res.subject}
                        </span>
                        <span className="text-2xs font-semibold text-slate-800">{res.grade}</span>
                      </div>
                    </div>
                    <Badge variant={res.category === 'video_lesson' ? 'danger' : 'brand'}>
                      {res.category.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{res.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {res.description || 'Curriculum resource for classroom and individual revision.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                    <span>Topic: <strong>{res.topic}</strong></span>
                    {res.durationMinutes && (
                      <span className="flex items-center gap-1 font-semibold text-rose-700">
                        <Timer className="w-3 h-3" /> {res.durationMinutes} mins
                      </span>
                    )}
                    {res.fileSize && <span>{res.fileSize}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <span className="text-2xs text-slate-400">By: {res.uploadedByName}</span>

                  {res.category === 'video_lesson' && res.videoEmbedUrl ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setActiveVideoResource(res)}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Watch Lesson
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toast.success('Downloaded to local offline storage', { icon: '💾' })}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: INTERACTIVE ONLINE QUIZ ENGINE                          */}
      {/* ============================================================== */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          {!activeQuiz ? (
            /* Quiz Selection List */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="p-5 space-y-4 border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="brand">{quiz.subject}</Badge>
                        <Badge variant="neutral">{quiz.grade}</Badge>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{quiz.title}</h3>
                      <p className="text-xs text-slate-600 mt-1">Topic: {quiz.topic}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xs text-slate-400 font-semibold block uppercase">Duration</span>
                      <span className="text-sm font-bold text-purple-700 flex items-center gap-1 justify-end">
                        <Timer className="w-3.5 h-3.5" /> {quiz.timeLimitMinutes} mins
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 text-center text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 block font-semibold">Questions</span>
                      <span className="font-bold text-slate-800">{quiz.questions.length} Qs</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 block font-semibold">Pass Mark</span>
                      <span className="font-bold text-emerald-700">{quiz.passingPercentage}%</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 block font-semibold">Format</span>
                      <span className="font-bold text-slate-800">Auto-Marked</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-2xs text-slate-500">
                      Randomized question order enabled
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => startQuiz(quiz)}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Start Online Quiz
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* Live Interactive Quiz Player */
            <Card className="p-6 space-y-6 border-2 border-blue-200 bg-white">
              {/* Quiz Header & Live Timer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="brand">{activeQuiz.subject}</Badge>
                    <Badge variant="neutral">{activeQuiz.grade}</Badge>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{activeQuiz.title}</h2>
                  <p className="text-xs text-slate-500">{activeQuiz.questions.length} questions • Auto-evaluated</p>
                </div>

                {/* Countdown Clock */}
                <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                  <Timer className="w-5 h-5 text-purple-700 animate-pulse" />
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 uppercase block tracking-wider">
                      Time Remaining
                    </span>
                    <span className="text-lg font-mono font-bold text-purple-900">
                      {Math.floor(quizTimeRemaining / 60)}:
                      {(quizTimeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {activeQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Question {idx + 1} of {activeQuiz.questions.length} ({q.maxScore} pts)
                      </span>
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {q.topicTag}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">{q.question}</p>

                    {/* MCQ Options */}
                    {q.type === 'mcq' && q.options && (
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = studentAnswers[q.id]?.selectedOption === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                setStudentAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: { ...prev[q.id], selectedOption: optIdx },
                                }));
                              }}
                              className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500/20'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                              {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False Options */}
                    {q.type === 'true_false' && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {[true, false].map((val) => {
                          const isSelected = studentAnswers[q.id]?.booleanAnswer === val;
                          return (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() => {
                                setStudentAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: { ...prev[q.id], booleanAnswer: val },
                                }));
                              }}
                              className={`p-3 rounded-lg border text-xs font-bold transition-all text-center ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-600 text-purple-900 ring-1 ring-purple-600/20'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {val ? 'TRUE' : 'FALSE'}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer Input */}
                    {q.type === 'short_answer' && (
                      <div className="pt-1">
                        <Input
                          placeholder="Type your concise answer here..."
                          value={studentAnswers[q.id]?.textAnswer || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudentAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], textAnswer: val },
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quiz Submission Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <Button variant="ghost" onClick={() => setActiveQuiz(null)}>
                  Exit Quiz
                </Button>
                <Button variant="primary" onClick={submitQuiz} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                  Submit &amp; View Instant Results
                </Button>
              </div>

              {/* Instant Quiz Report Card */}
              {quizReport && (
                <div className="p-5 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-4 animate-scale-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-emerald-950">Quiz Performance Diagnostic</h3>
                      <p className="text-xs text-emerald-800">
                        Final Score: <strong>{quizReport.score}</strong> / {quizReport.maxPossibleScore} ({quizReport.percentage}%)
                      </p>
                    </div>
                    <Badge variant={quizReport.passed ? 'success' : 'danger'}>
                      {quizReport.passed ? 'PASSED' : 'REMEDIAL REQUIRED'}
                    </Badge>
                  </div>

                  {/* Topic Diagnostics Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-emerald-200">
                    <p className="text-xs font-bold uppercase text-emerald-900">Topic-Based Competency Diagnostics:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(quizReport.topicDiagnostics).map(([topic, stats]) => (
                        <div key={topic} className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs">
                          <div className="flex justify-between font-semibold text-slate-800">
                            <span>{topic}</span>
                            <span className={stats.percentage >= 60 ? 'text-emerald-700' : 'text-rose-700'}>
                              {stats.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stats.percentage >= 60 ? 'bg-emerald-600' : 'bg-rose-600'}`}
                              style={{ width: `${stats.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: HOMEWORK & CONTINUOUS ASSESSMENT TASKS                  */}
      {/* ============================================================== */}
      {activeTab === 'homework' && (
        <div className="space-y-4">
          <Card className="p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Search assignments by title or instructions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />

              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Classes' },
                  ...availableClasses.map((c) => ({ value: c, label: c })),
                ]}
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired')}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active Tasks' },
                  { value: 'expired', label: 'Closed / Past Due' },
                ]}
              />
            </div>
          </Card>

          {/* Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="flex flex-col justify-between border border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xs font-bold text-slate-500 uppercase">{assignment.subject || 'General'}</span>
                      <Badge variant="neutral" className="block mt-0.5">{assignment.className}</Badge>
                    </div>
                    <Badge variant="brand">Active</Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{assignment.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{assignment.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                      Due: {new Date(assignment.expiresAt).toLocaleDateString()}
                    </span>
                    <span className="font-bold text-slate-800">{assignment.maxScore} marks</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveAssignment(assignment);
                      setDetailModalOpen(true);
                    }}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View Task
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setActiveAssignment(assignment);
                      setSubmitModalOpen(true);
                    }}
                  >
                    Submit Work
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Video Lesson Player Modal */}
      {activeVideoResource && (
        <Modal
          isOpen={Boolean(activeVideoResource)}
          onClose={() => setActiveVideoResource(null)}
          title={activeVideoResource.title}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-md">
              <iframe
                src={activeVideoResource.videoEmbedUrl}
                title={activeVideoResource.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="brand">{activeVideoResource.subject}</Badge>
                <Badge variant="neutral">{activeVideoResource.grade}</Badge>
              </div>
              <p className="text-xs text-slate-600">{activeVideoResource.description}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setActiveVideoResource(null)}>
                Close Player
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Resource Modal */}
      <Modal
        isOpen={uploadResourceOpen}
        onClose={() => setUploadResourceOpen(false)}
        title="Upload Learning Resource (School Bank)"
        maxWidth="lg"
      >
        <form onSubmit={handleUploadResource} className="space-y-4">
          <Input
            label="Resource Title"
            placeholder="e.g. CBC Grade 7 Agriculture Revision Notes"
            value={resTitle}
            onChange={(e) => setResTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject / Learning Area"
              placeholder="e.g. Agriculture"
              value={resSubject}
              onChange={(e) => setResSubject(e.target.value)}
              required
            />
            <Input
              label="Target Grade / Form"
              placeholder="e.g. Grade 7"
              value={resGrade}
              onChange={(e) => setResGrade(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Topic / Sub-Strand"
              placeholder="e.g. Soil Conservation"
              value={resTopic}
              onChange={(e) => setResTopic(e.target.value)}
            />
            <Select
              label="Resource Format"
              value={resCategory}
              onChange={(e) => setResCategory(e.target.value as ResourceCategory)}
              options={[
                { value: 'notes', label: 'Document / Notes (PDF)' },
                { value: 'video_lesson', label: 'Video Lesson (Streamable)' },
                { value: 'past_paper', label: 'Past Exam Paper' },
                { value: 'simulation', label: 'Interactive Simulation' },
              ]}
            />
          </div>

          {resCategory === 'video_lesson' ? (
            <Input
              label="Video Embed URL (YouTube or Vimeo)"
              placeholder="https://www.youtube.com/embed/..."
              value={resVideoUrl}
              onChange={(e) => setResVideoUrl(e.target.value)}
            />
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attach File (PDF, Word, Workbook)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx"
                onChange={(e) => setResFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          )}

          {/* Legal licensing checkbox */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <input
              type="checkbox"
              id="licenseConfirm"
              checked={isLicensed}
              onChange={(e) => setIsLicensed(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="licenseConfirm" className="text-2xs leading-relaxed">
              I certify that this institution holds legal distribution rights, ownership, or educational fair-use permission for this content.
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button variant="ghost" type="button" onClick={() => setUploadResourceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={uploadingRes}>
              Publish to Library
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        isOpen={createAssignmentOpen}
        onClose={() => setCreateAssignmentOpen(false)}
        title="Create Classroom Assignment"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <Input
            label="Assignment Title"
            placeholder="e.g. Science Term 1 Living Organisms Rubric"
            value={assignTitle}
            onChange={(e) => setAssignTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject"
              value={assignSubject}
              onChange={(e) => setAssignSubject(e.target.value)}
              required
            />
            <Select
              label="Class"
              value={assignClass}
              onChange={(e) => setAssignClass(e.target.value)}
              options={availableClasses.map((c) => ({ value: c, label: c }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions &amp; Criteria
            </label>
            <textarea
              rows={3}
              value={assignDescription}
              onChange={(e) => setAssignDescription(e.target.value)}
              placeholder="Enter instructions for learners..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1d5f99] focus:ring-3 focus:ring-[#1d5f99]/15"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button variant="ghost" type="button" onClick={() => setCreateAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={savingAssign}>
              Publish Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
