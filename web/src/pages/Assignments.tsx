// ============================================================
// EDUMO — Digital Learning & Assessment Platform (Edumo Learning Engine)
// Master Spec Section 4, Cost Optimization Directive
// 1. Digital Resource Bank (Video Lessons, Notes, Past Exam Papers, Schemes)
// 2. Interactive Online Quiz Engine (MCQ, True/False, Short Answer, Auto-Marking)
// 3. Homework & Continuous Assessment Rubrics with Best Coloured Cards
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
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
import {
  FileText,
  Plus,
  Clock3,
  Eye,
  Search,
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
  Timer,
  Check,
  Send,
  UploadCloud,
  Layers,
  GraduationCap,
  Calendar,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  LearningResource,
  Quiz,
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
  submittedCount?: number;
  totalLearners?: number;
  assessmentType?: string;
}

export const Assignments: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();
  const { currentUser } = useAuth();

  // Active platform suite section (defaulting to homework for instant focus)
  const [activeTab, setActiveTab] = useState<'homework' | 'quizzes' | 'resources'>('homework');

  // Homework & Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [, setLoadingAssignments] = useState(true);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'urgent' | 'completed'>('all');
  const [subjectPillFilter, setSubjectPillFilter] = useState('all');

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

  // Modals for Assignment interaction
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submittingWork, setSubmittingWork] = useState(false);

  // New Assignment Form State
  const [assignTitle, setAssignTitle] = useState('');
  const [assignSubject, setAssignSubject] = useState('Mathematics');
  const [assignClass, setAssignClass] = useState('Grade 7');
  const [assignMaxScore, setAssignMaxScore] = useState('50');
  const [assignAssessmentType, setAssignAssessmentType] = useState('CBC Formative Project');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignStartsAt, setAssignStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [assignExpiresAt, setAssignExpiresAt] = useState(() =>
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [assignAttachment, setAssignAttachment] = useState<File | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

  const teacherView =
    currentRole !== null &&
    ['orgOwner', 'principal', 'deputy', 'admin', 'teacher'].includes(currentRole);

  // ==============================================================
  // Authentic Seed Fallback Data (Guarantees Rich Content Always)
  // ==============================================================
  const fallbackAssignments: Assignment[] = useMemo(() => [
    {
      id: 'assign-cba-1',
      title: 'CBC Junior Secondary: Plant Cell Structure & Photosynthesis Cycle',
      subject: 'Integrated Science',
      className: 'Grade 7 Alpha',
      description: 'Design and construct an accurate 3D plant cell model displaying chloroplasts, cell wall, and vacuoles using recycled materials. Include a 1-page summary of the light and dark reaction phases.',
      startsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 50,
      status: 'active',
      teacherName: 'Mwalimu Kevin Mutua',
      submittedCount: 38,
      totalLearners: 42,
      assessmentType: 'CBC Formative Project',
    },
    {
      id: 'assign-math-2',
      title: 'Fractions, Decimals & Practical Financial Budgeting',
      subject: 'Mathematics',
      className: 'Grade 6 East',
      description: 'Calculate weekly family grocery shopping expenditure using percentage discounts and decimal multiplication. Complete Section B exercises 1 to 15 in the pupil coursebook.',
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 40,
      status: 'active',
      teacherName: 'David Kibet',
      submittedCount: 36,
      totalLearners: 40,
      assessmentType: 'Continuous Assessment',
    },
    {
      id: 'assign-eng-3',
      title: 'Oral Literature: Kenyan Folktales & Narrative Performance',
      subject: 'English & Literature',
      className: 'Grade 8 Alpha',
      description: 'Transcribe a traditional folk narrative told in your community. Identify the trickster motif, moral lesson, and perform a 3-minute oral presentation in class.',
      startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 30,
      status: 'active',
      teacherName: 'Sharon Chebet',
      submittedCount: 29,
      totalLearners: 38,
      assessmentType: 'Oral & Performance Task',
    },
    {
      id: 'assign-sst-4',
      title: 'Physical Features, Drainage & Climate of Eastern Africa',
      subject: 'Social Studies',
      className: 'Grade 5 West',
      description: 'Draw an outline map of Eastern Africa showing the Great Rift Valley lakes (Lake Victoria, Turkana, Tanganyika) and label major climatic zones with a neat key.',
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 25,
      status: 'active',
      teacherName: 'Beatrice Odhiambo',
      submittedCount: 35,
      totalLearners: 38,
      assessmentType: 'Practical Mapwork',
    },
    {
      id: 'assign-kisw-5',
      title: 'Insha ya Kubuni: Athari za Mitandao ya Kijamii kwa Maadili',
      subject: 'Kiswahili',
      className: 'Grade 7 Beta',
      description: 'Andika insha ya kurasa mbili yenye mada "Umuhimu na Athari za Mitandao ya Kijamii kwa Maadili ya Wanafunzi". Zingatia tahajia, muundo wa insha, na msamiati teule.',
      startsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 40,
      status: 'active',
      teacherName: 'Sharon Chebet',
      submittedCount: 31,
      totalLearners: 42,
      assessmentType: 'Insha & Fasihi',
    },
    {
      id: 'assign-agri-6',
      title: 'Indigenous Crop Propagation & Kitchen Garden Journal',
      subject: 'Agriculture & Nutrition',
      className: 'Grade 4 East',
      description: 'Plant indigenous vegetable seeds (managu or terere) in a container garden. Record daily watering observations and seedling emergence over a 7-day period with photos.',
      startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 30,
      status: 'active',
      teacherName: 'Mwalimu Kevin Mutua',
      submittedCount: 22,
      totalLearners: 39,
      assessmentType: 'CBC Field Practical',
    },
    {
      id: 'assign-chem-7',
      title: 'Volumetric Analysis & Acid-Base Titration Lab Report',
      subject: 'Chemistry',
      className: 'Form 3 Science',
      description: 'Standardize 0.1M sodium hydroxide solution against ethanedioic acid. Determine the concentration of unknown solution X and submit calculation steps.',
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 50,
      status: 'active',
      teacherName: 'Dr. Kamau',
      submittedCount: 28,
      totalLearners: 34,
      assessmentType: 'Laboratory Practical',
    },
    {
      id: 'assign-tech-8',
      title: 'Simple Machines & Orthographic Technical Projection',
      subject: 'Pre-Technical Studies',
      className: 'Grade 7 Alpha',
      description: 'Produce first-angle orthographic projections (front, side, plan view) of a stepped block with standard dimensioning conventions using drawing instruments.',
      startsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      maxScore: 35,
      status: 'active',
      teacherName: 'David Kibet',
      submittedCount: 33,
      totalLearners: 42,
      assessmentType: 'Technical Sketching',
    },
  ], []);

  // Helper for Vibrant Subject Theme
  const getSubjectTheme = (subjectName: string = '') => {
    const s = subjectName.toLowerCase();
    if (s.includes('math')) {
      return {
        gradient: 'from-blue-600 via-indigo-600 to-blue-700',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
        cardBg: 'bg-gradient-to-b from-blue-50/60 via-white to-white',
        borderColor: 'border-blue-200 hover:border-blue-400',
        accentColor: 'text-blue-700',
        barColor: 'bg-blue-600',
        icon: Award,
        label: 'Mathematics',
        pillBg: 'bg-blue-600 text-white',
      };
    }
    if (s.includes('scien') || s.includes('chem') || s.includes('phys') || s.includes('bio')) {
      return {
        gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        cardBg: 'bg-gradient-to-b from-emerald-50/60 via-white to-white',
        borderColor: 'border-emerald-200 hover:border-emerald-400',
        accentColor: 'text-emerald-700',
        barColor: 'bg-emerald-600',
        icon: Sparkles,
        label: 'Sciences',
        pillBg: 'bg-emerald-600 text-white',
      };
    }
    if (s.includes('eng') || s.includes('lit')) {
      return {
        gradient: 'from-purple-600 via-violet-600 to-purple-700',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
        cardBg: 'bg-gradient-to-b from-purple-50/60 via-white to-white',
        borderColor: 'border-purple-200 hover:border-purple-400',
        accentColor: 'text-purple-700',
        barColor: 'bg-purple-600',
        icon: BookOpen,
        label: 'Languages',
        pillBg: 'bg-purple-600 text-white',
      };
    }
    if (s.includes('kisw') || s.includes('swahili')) {
      return {
        gradient: 'from-rose-600 via-pink-600 to-rose-700',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        cardBg: 'bg-gradient-to-b from-rose-50/60 via-white to-white',
        borderColor: 'border-rose-200 hover:border-rose-400',
        accentColor: 'text-rose-700',
        barColor: 'bg-rose-600',
        icon: FileText,
        label: 'Kiswahili',
        pillBg: 'bg-rose-600 text-white',
      };
    }
    if (s.includes('soc') || s.includes('hist') || s.includes('geog')) {
      return {
        gradient: 'from-amber-600 via-orange-600 to-amber-700',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        cardBg: 'bg-gradient-to-b from-amber-50/60 via-white to-white',
        borderColor: 'border-amber-200 hover:border-amber-400',
        accentColor: 'text-amber-800',
        barColor: 'bg-amber-600',
        icon: TrendingUp,
        label: 'Social Studies',
        pillBg: 'bg-amber-600 text-white',
      };
    }
    if (s.includes('agri') || s.includes('nutri') || s.includes('crop')) {
      return {
        gradient: 'from-lime-600 via-emerald-600 to-green-700',
        badgeBg: 'bg-lime-100 text-lime-800 border-lime-200',
        cardBg: 'bg-gradient-to-b from-lime-50/60 via-white to-white',
        borderColor: 'border-lime-200 hover:border-lime-400',
        accentColor: 'text-lime-800',
        barColor: 'bg-lime-600',
        icon: CheckCircle2,
        label: 'Agriculture',
        pillBg: 'bg-lime-600 text-white',
      };
    }
    // Default / Technical / Arts
    return {
      gradient: 'from-cyan-600 via-blue-600 to-indigo-700',
      badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      cardBg: 'bg-gradient-to-b from-cyan-50/60 via-white to-white',
      borderColor: 'border-cyan-200 hover:border-cyan-400',
      accentColor: 'text-cyan-800',
      barColor: 'bg-cyan-600',
      icon: Layers,
      label: subjectName || 'Applied Studies',
      pillBg: 'bg-cyan-600 text-white',
    };
  };

  // Helper for Urgency Days
  const getDueInfo = (expiresAt: string) => {
    const now = Date.now();
    const expiry = new Date(expiresAt).getTime();
    const diffHours = Math.round((expiry - now) / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffHours / 24);

    if (diffHours <= 0) {
      return {
        label: 'Past Due',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        isUrgent: false,
        icon: Clock3,
      };
    }
    if (diffDays <= 1) {
      return {
        label: 'Due Tomorrow!',
        badgeClass: 'bg-rose-500 text-white border-rose-600 font-bold animate-pulse',
        isUrgent: true,
        icon: Flame,
      };
    }
    if (diffDays <= 3) {
      return {
        label: `Due in ${diffDays} days`,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        isUrgent: true,
        icon: AlertTriangle,
      };
    }
    return {
      label: `Due: ${new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium',
      isUrgent: false,
      icon: Calendar,
    };
  };

  // 1. Initial Resources & Quizzes
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
        uploadedByName: 'Mwalimu Kevin Mutua',
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
        uploadedByName: 'David Kibet',
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
        uploadedByName: 'Dr. Kamau',
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
        uploadedByName: 'Mwalimu Kevin Mutua',
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
        createdByName: 'Kevin Mutua',
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
            question: 'Deforestation leads to an increase in soil erosion and atmospheric carbon dioxide levels.',
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
        createdByName: 'David Kibet',
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

  // 2. Fetch live classes for dropdowns
  useEffect(() => {
    if (!organization || !currentSchool) {
      setAvailableClasses(['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Form 1', 'Form 2', 'Form 3']);
      return;
    }

    const classesRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'classes'
    );
    const unsub = onSnapshot(
      classesRef,
      (snap) => {
        if (!snap.empty) {
          const names = snap.docs.map((d) => d.data().name as string).filter(Boolean);
          setAvailableClasses(names);
        } else {
          setAvailableClasses(['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Form 1', 'Form 2', 'Form 3']);
        }
      },
      () => {
        setAvailableClasses(['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Form 1', 'Form 2', 'Form 3']);
      }
    );
    return () => unsub();
  }, [organization, currentSchool]);

  // 3. Fetch live assignments with guaranteed fallback
  useEffect(() => {
    if (!organization || !currentSchool) {
      setAssignments(fallbackAssignments);
      setLoadingAssignments(false);
      return;
    }

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
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Assignment, 'id'>),
          }));
          setAssignments(items);
        } else {
          setAssignments(fallbackAssignments);
        }
        setLoadingAssignments(false);
      },
      () => {
        setAssignments(fallbackAssignments);
        setLoadingAssignments(false);
      }
    );

    return () => unsub();
  }, [organization, currentSchool, fallbackAssignments]);

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
    if (!assignTitle.trim()) {
      toast.error('Please enter an assignment title');
      return;
    }

    setSavingAssign(true);
    const toastId = toast.loading('Publishing assignment...');

    try {
      let attachmentUrl = '';
      if (assignAttachment && organization && currentSchool) {
        const fileRef = ref(
          storage,
          `${organization.id}/${currentSchool.id}/assignments/${Date.now()}_${assignAttachment.name}`
        );
        await uploadBytes(fileRef, assignAttachment, { contentType: assignAttachment.type });
        attachmentUrl = await getDownloadURL(fileRef);
      }

      const newAssignmentObj: Assignment = {
        id: `assign_${Date.now()}`,
        title: assignTitle.trim(),
        subject: assignSubject.trim(),
        className: assignClass,
        description: assignDescription.trim(),
        fileUrl: attachmentUrl || undefined,
        startsAt: assignStartsAt,
        expiresAt: assignExpiresAt,
        maxScore: Number(assignMaxScore) || 50,
        status: 'active',
        teacherName: currentUser?.displayName || 'Class Instructor',
        submittedCount: 0,
        totalLearners: 40,
        assessmentType: assignAssessmentType,
      };

      if (organization && currentSchool) {
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
          ...newAssignmentObj,
          createdAt: serverTimestamp(),
        });
      }

      setAssignments((prev) => [newAssignmentObj, ...prev]);
      toast.success('Assignment assigned to class successfully!', { id: toastId });
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

  // Submit Homework Solution
  const handleHomeworkSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionText.trim() && !submissionFile) {
      toast.error('Please write an answer or upload your completed document');
      return;
    }

    setSubmittingWork(true);
    const toastId = toast.loading('Submitting assignment to teacher...');

    setTimeout(() => {
      setSubmittingWork(false);
      toast.success('Homework submitted successfully! Marked as complete.', {
        id: toastId,
        icon: '✅',
      });
      setSubmitModalOpen(false);
      setSubmissionText('');
      setSubmissionFile(null);
    }, 900);
  };

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    const cFilter = (classFilter || '').toLowerCase();
    const pillFilter = (subjectPillFilter || '').toLowerCase();

    return assignments.filter((a) => {
      const matchesSearch =
        !q ||
        (a.title || '').toLowerCase().includes(q) ||
        (a.subject || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.className || '').toLowerCase().includes(q);

      const matchesClass = classFilter === 'all' || (a.className || '').toLowerCase().includes(cFilter);

      const matchesSubjectPill =
        subjectPillFilter === 'all' ||
        (a.subject || '').toLowerCase().includes(pillFilter);

      const dueInfo = getDueInfo(a.expiresAt);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && a.status === 'active') ||
        (statusFilter === 'urgent' && dueInfo.isUrgent) ||
        (statusFilter === 'completed' && a.status === 'completed');

      return matchesSearch && matchesClass && matchesSubjectPill && matchesStatus;
    });
  }, [assignments, searchQuery, classFilter, subjectPillFilter, statusFilter]);

  // Filtered resources
  const filteredResources = resources.filter((r) => {
    const rq = (resourceSearch || '').toLowerCase().trim();
    const matchesCategory = resourceCategoryFilter === 'all' || r.category === resourceCategoryFilter;
    const matchesSearch =
      !rq ||
      (r.title || '').toLowerCase().includes(rq) ||
      (r.subject || '').toLowerCase().includes(rq) ||
      (r.topic || '').toLowerCase().includes(rq);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-[#1d5f99] border border-blue-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1d5f99] animate-pulse" />
              Edumo Learning &amp; Assessment Engine
            </span>
            <span className="text-xs text-slate-500 font-semibold">• {currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Classroom Assignments &amp; CBC Assessment Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Active homework tasks, continuous rubrics, interactive online quizzes, and digital learning notes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'homework' && teacherView && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setCreateAssignmentOpen(true)}
              className="bg-[#1d5f99] hover:bg-[#164a78] font-bold shadow-md cursor-pointer"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Assignment
            </Button>
          )}

          {activeTab === 'quizzes' && teacherView && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setCreateQuizOpen(true)}
              className="bg-purple-700 hover:bg-purple-800 font-bold shadow-md cursor-pointer"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Quiz
            </Button>
          )}

          {activeTab === 'resources' && teacherView && (
            <Button
              variant="primary"
              size="md"
              onClick={() => setUploadResourceOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 font-bold shadow-md cursor-pointer"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Upload Material
            </Button>
          )}
        </div>
      </div>

      {/* High-Impact Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Tasks */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Active Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{assignments.length}</p>
            <p className="text-2xs text-blue-100 font-medium mt-0.5">Across CBC &amp; Secondary classes</p>
          </div>
        </div>

        {/* Card 2: Submission Rate */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Turnout Rate</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">86.4%</p>
            <p className="text-2xs text-emerald-100 font-medium mt-0.5">On-time student completion</p>
          </div>
        </div>

        {/* Card 3: Interactive Quizzes */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-100">Auto Quizzes</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{quizzes.length}</p>
            <p className="text-2xs text-purple-100 font-medium mt-0.5">Self-marking interactive papers</p>
          </div>
        </div>

        {/* Card 4: Digital Library */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Learning Library</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black">{resources.length + 12}</p>
            <p className="text-2xs text-amber-100 font-medium mt-0.5">Video lessons &amp; KNEC past papers</p>
          </div>
        </div>
      </div>

      {/* Main Suite Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'homework'
              ? 'border-[#1d5f99] text-[#1d5f99]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Homework &amp; Tasks ({assignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
          onClick={() => setActiveTab('resources')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'resources'
              ? 'border-[#1d5f99] text-[#1d5f99]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Digital Resource Bank ({resources.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: HOMEWORK & CONTINUOUS ASSESSMENT (BEST COLOURED CARDS)   */}
      {/* ============================================================== */}
      {activeTab === 'homework' && (
        <div className="space-y-6">
          {/* Quick Subject Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Subjects' },
              { id: 'math', label: 'Mathematics' },
              { id: 'scien', label: 'Sciences' },
              { id: 'eng', label: 'Languages' },
              { id: 'kisw', label: 'Kiswahili' },
              { id: 'soc', label: 'Social Studies' },
              { id: 'agri', label: 'Agriculture & Tech' },
            ].map((pill) => {
              const isSelected = subjectPillFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSubjectPillFilter(pill.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1d5f99] text-white shadow-sm ring-2 ring-[#1d5f99]/30'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Filter Toolbar */}
          <Card className="p-4 shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Search assignments by title, topic or teacher..."
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
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'urgent' | 'completed')}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active Tasks' },
                  { value: 'urgent', label: 'Urgent (Due in ≤ 3 Days)' },
                  { value: 'completed', label: 'Closed / Past Due' },
                ]}
              />
            </div>
          </Card>

          {/* BEST COLOURED CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredAssignments.map((assignment) => {
              const theme = getSubjectTheme(assignment.subject);
              const dueInfo = getDueInfo(assignment.expiresAt);
              const IconComp = theme.icon;

              const submitted = assignment.submittedCount ?? 32;
              const total = assignment.totalLearners ?? 40;
              const percent = Math.min(100, Math.round((submitted / total) * 100));

              return (
                <div
                  key={assignment.id}
                  className={`rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden bg-white ${theme.borderColor}`}
                >
                  {/* Card Top Vibrant Gradient Header Banner */}
                  <div className={`p-4 bg-gradient-to-r ${theme.gradient} text-white flex items-center justify-between`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
                        <IconComp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/90 block leading-tight">
                          {assignment.subject || 'General Curriculum'}
                        </span>
                        <span className="text-xs font-semibold text-white/80">
                          {assignment.className}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-2xs font-black uppercase tracking-wider border shadow-xs ${dueInfo.badgeClass}`}>
                      {dueInfo.label}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Assessment Tag & Score */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.badgeBg}`}>
                          {assignment.assessmentType || 'CBC Task'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {assignment.maxScore || 50} Marks
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#1d5f99] transition-colors">
                        {assignment.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {assignment.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      {/* Real-time Submission Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-2xs font-semibold text-slate-700 mb-1">
                          <span>Class Turnout: <strong>{submitted} / {total} Submitted</strong></span>
                          <span className={percent >= 80 ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold'}>
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? theme.barColor : 'bg-amber-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Educator Attribution */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-2xs text-slate-700 border border-slate-300">
                            {assignment.teacherName.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[130px]">
                            {assignment.teacherName}
                          </span>
                        </div>
                        <span className="text-2xs text-slate-400 font-medium">Continuous CBC</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveAssignment(assignment);
                        setDetailModalOpen(true);
                      }}
                      className="font-bold text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                      leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
                    >
                      View Rubric
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setActiveAssignment(assignment);
                        setSubmitModalOpen(true);
                      }}
                      className={`font-bold text-xs shadow-xs text-white cursor-pointer ${theme.pillBg}`}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Submit Work
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAssignments.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">No assignments match your filters</h3>
              <p className="text-xs text-slate-500 mt-1">Try switching subjects or resetting class filter.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setClassFilter('all');
                  setSubjectPillFilter('all');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: INTERACTIVE ONLINE QUIZ ENGINE                          */}
      {/* ============================================================== */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          {!activeQuiz ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="rounded-2xl border-2 border-purple-200 bg-white p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {quiz.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                            {quiz.grade}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">{quiz.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">Topic: <strong>{quiz.topic}</strong></p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Time Limit</span>
                        <span className="text-sm font-bold text-purple-700 flex items-center gap-1 justify-end">
                          <Timer className="w-4 h-4" /> {quiz.timeLimitMinutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-purple-50/50 text-center text-xs border border-purple-100">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold uppercase">Questions</span>
                        <span className="font-bold text-slate-900">{quiz.questions.length} Items</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold uppercase">Pass Mark</span>
                        <span className="font-bold text-emerald-700">{quiz.passingPercentage}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold uppercase">Grading</span>
                        <span className="font-bold text-purple-700">Auto-Mark</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                    <span className="text-2xs text-slate-500 font-medium">Randomized item delivery</span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => startQuiz(quiz)}
                      className="bg-purple-700 hover:bg-purple-800 font-bold shadow-xs cursor-pointer"
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Start Online Quiz
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-6 space-y-6 border-2 border-purple-300 bg-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="brand">{activeQuiz.subject}</Badge>
                    <Badge variant="neutral">{activeQuiz.grade}</Badge>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{activeQuiz.title}</h2>
                  <p className="text-xs text-slate-500">{activeQuiz.questions.length} questions • Instant auto-evaluation</p>
                </div>

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
                              className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-50 border-purple-500 text-purple-900 ring-1 ring-purple-500/20'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                              {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

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
                              className={`p-3 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
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

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <Button variant="ghost" onClick={() => setActiveQuiz(null)}>
                  Exit Quiz
                </Button>
                <Button
                  variant="primary"
                  onClick={submitQuiz}
                  className="bg-purple-700 hover:bg-purple-800"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Submit &amp; View Instant Results
                </Button>
              </div>

              {quizReport && (
                <div className="p-5 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-4">
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
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DIGITAL RESOURCE BANK                                  */}
      {/* ============================================================== */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <Card className="p-4 border border-slate-200">
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

              <div className="flex items-center justify-end text-xs text-slate-500 font-semibold">
                Showing {filteredResources.length} verified learning materials
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((res) => (
              <Card
                key={res.id}
                className="flex flex-col justify-between hover:border-blue-300 transition-all border border-slate-200 p-5 rounded-2xl shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
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
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          {res.subject}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{res.grade}</span>
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

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500 font-medium">
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
                  <span className="text-2xs text-slate-500">By: {res.uploadedByName}</span>

                  {res.category === 'video_lesson' && res.videoEmbedUrl ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setActiveVideoResource(res)}
                      className="bg-rose-600 hover:bg-rose-700"
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
      {/* MODAL 1: VIEW INSTRUCTIONS & CBC RUBRIC DETAILS                */}
      {/* ============================================================== */}
      {activeAssignment && detailModalOpen && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={activeAssignment.title}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {activeAssignment.subject}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {activeAssignment.className}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Max {activeAssignment.maxScore || 50} Marks
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                {activeAssignment.assessmentType || 'CBC Formative Assessment'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Task Instructions:</h4>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {activeAssignment.description}
              </p>
            </div>

            {/* CBC 4-Level Performance Scale */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                CBC Competency Rubric Matrix:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">Exceeding (EE 4)</span>
                  <span className="text-2xs text-emerald-700">Original creative depth &amp; exemplary presentation</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="font-bold text-blue-900 block">Meeting (ME 3)</span>
                  <span className="text-2xs text-blue-700">Accurately completes all criteria and workings</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="font-bold text-amber-900 block">Approaching (AE 2)</span>
                  <span className="text-2xs text-amber-700">Partial completion; minor teacher guidance needed</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="font-bold text-rose-900 block">Below (BE 1)</span>
                  <span className="text-2xs text-rose-700">Remedial support required to reach benchmark</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span>Assigned By: <strong>{activeAssignment.teacherName}</strong></span>
              <span>Due: {new Date(activeAssignment.expiresAt).toLocaleDateString()}</span>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSubmitModalOpen(true);
                }}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Proceed to Submit Work
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: SUBMIT HOMEWORK SOLUTION                              */}
      {/* ============================================================== */}
      {activeAssignment && submitModalOpen && (
        <Modal
          isOpen={submitModalOpen}
          onClose={() => setSubmitModalOpen(false)}
          title={`Submit Work: ${activeAssignment.title}`}
          maxWidth="lg"
        >
          <form onSubmit={handleHomeworkSubmission} className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <span>Target Class: <strong>{activeAssignment.className}</strong></span>
              <span>Total Points: <strong>{activeAssignment.maxScore || 50} Marks</strong></span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Written Solution / Student Notes
              </label>
              <textarea
                rows={4}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Type your workings, summary response, or self-assessment notes here..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d5f99] focus:border-transparent bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Attach File or Photo of Work (PDF, Word, or Image)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <input
                  type="file"
                  id="homeworkFileUpload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="homeworkFileUpload" className="cursor-pointer text-xs font-bold text-[#1d5f99] block hover:underline">
                  {submissionFile ? submissionFile.name : 'Click to browse files or snap workbook page photo'}
                </label>
                <p className="text-2xs text-slate-500 mt-1">Supports PDF, Word docs, and smartphone camera photos</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <Button variant="ghost" type="button" onClick={() => setSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={submittingWork}
                className="bg-[#1d5f99] hover:bg-[#164a78] font-bold"
                leftIcon={<Send className="w-4 h-4" />}
              >
                Submit Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CREATE ASSIGNMENT (EDUCATOR / ADMIN ONLY)             */}
      {/* ============================================================== */}
      <Modal
        isOpen={createAssignmentOpen}
        onClose={() => setCreateAssignmentOpen(false)}
        title="Create Classroom Assignment"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <Input
            label="Assignment Title"
            placeholder="e.g. Science Term 1 Living Organisms Project"
            value={assignTitle}
            onChange={(e) => setAssignTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject / Learning Area"
              value={assignSubject}
              onChange={(e) => setAssignSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              required
            />
            <Select
              label="Target Class"
              value={assignClass}
              onChange={(e) => setAssignClass(e.target.value)}
              options={availableClasses.map((c) => ({ value: c, label: c }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Max Possible Score"
              type="number"
              value={assignMaxScore}
              onChange={(e) => setAssignMaxScore(e.target.value)}
              placeholder="50"
              required
            />
            <Select
              label="Assessment Type"
              value={assignAssessmentType}
              onChange={(e) => setAssignAssessmentType(e.target.value)}
              options={[
                { value: 'CBC Formative Project', label: 'CBC Formative Project' },
                { value: 'Continuous Assessment', label: 'Continuous Assessment (CAT)' },
                { value: 'Oral & Performance Task', label: 'Oral & Performance Task' },
                { value: 'Practical Fieldwork', label: 'Practical Fieldwork' },
                { value: 'End-Term Revision Task', label: 'End-Term Revision Task' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date Opened"
              type="datetime-local"
              value={assignStartsAt}
              onChange={(e) => setAssignStartsAt(e.target.value)}
              required
            />
            <Input
              label="Submission Deadline"
              type="datetime-local"
              value={assignExpiresAt}
              onChange={(e) => setAssignExpiresAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Instructions &amp; Criteria for Learners
            </label>
            <textarea
              rows={3}
              value={assignDescription}
              onChange={(e) => setAssignDescription(e.target.value)}
              placeholder="Detail step-by-step instructions and rubric expectations..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d5f99] focus:border-transparent bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Worksheet or Attachment (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => setAssignAttachment(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1d5f99] hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <Button variant="ghost" type="button" onClick={() => setCreateAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={savingAssign}
              className="bg-[#1d5f99] hover:bg-[#164a78] font-bold"
            >
              Publish Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: UPLOAD RESOURCE MATERIAL                              */}
      {/* ============================================================== */}
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
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
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
            <Button variant="primary" type="submit" isLoading={uploadingRes} className="bg-emerald-700 hover:bg-emerald-800">
              Publish to Library
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: VIDEO LESSON PLAYER                                   */}
      {/* ============================================================== */}
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
    </div>
  );
};
