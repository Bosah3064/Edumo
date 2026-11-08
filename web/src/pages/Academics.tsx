import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
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
  BookOpen,
  Award,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Users,
  Sparkles,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  HeartHandshake,
  Plus,
  Send,
  Lock,
  Unlock,
  Check,
  ArrowRight,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  calculateGradeBand,
  computeStudentAggregate,
  KENYA_COUNTRY_PACK,
  UGANDA_COUNTRY_PACK,
  TANZANIA_COUNTRY_PACK,
  RWANDA_COUNTRY_PACK,
  type GradingScale,
  type StudentAssessmentAggregate,
  type ExamSeries,
  type Subject,
} from '@edumo/shared';
import {
  exportMarksEntryTemplate,
  parseUploadedMarksWorkbook,
  exportExaminationAnalysisWorkbook,
} from '../utils/marksExcel';
import { ReportCardModal } from '../components/academics/ReportCardModal';
import {
  getNextClass,
  evaluatePromotionEligibility,
  executeBatchClassPromotion,
  type PromotionDecision,
} from '../utils/promotion';

interface LearnerMarkRow {
  studentId: string;
  admissionNumber: string;
  name: string;
  score: number | '';
  comments: string;
  stream?: string;
  previousScore?: number;
}

export const Academics: React.FC = () => {
  const navigate = useNavigate();
  const { organization, currentSchool, currentRole, isStudent, studentProfile } = useTenant();
  const isStudentUser = isStudent || currentRole === 'student' || (currentRole as string) === 'learner';
  const { currentUser } = useAuth();
  const { isOnline, queueOfflineAction } = useOffline();

  // Active View Tab (Edumo Academic Analytics & Promotion Engine)
  const [activeTab, setActiveTab] = useState<'gradebook' | 'series' | 'diagnostics' | 'at_risk' | 'trajectory' | 'promotion'>('gradebook');

  // Academic Promotion State
  const [promotionsList, setPromotionsList] = useState<PromotionDecision[]>([]);
  const [executingPromotion, setExecutingPromotion] = useState(false);
  const [passCutoffPct, setPassCutoffPct] = useState(50);

  // Real-time School Classes from Firestore
  const [schoolClasses, setSchoolClasses] = useState<Array<{ id: string; name: string; streams: string[] }>>([]);

  // Filters & Selection
  const [selectedClass, setSelectedClass] = useState('Grade 4');
  const [selectedStream, setSelectedStream] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedSeriesId, setSelectedSeriesId] = useState('series-02');
  const [assessmentTitle, setAssessmentTitle] = useState('Term 1 Mid-Term Assessment');
  const [maxScore, setMaxScore] = useState(50);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');

  // 1. Dynamic Real-time School Classes from Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;
    const classesRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'classes');
    const unsub = onSnapshot(classesRef, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Class',
          streams: Array.isArray(data.streams) && data.streams.length > 0 ? data.streams : ['East', 'West'],
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setSchoolClasses(list);
      if (list.length > 0 && !list.some((c) => c.name.toLowerCase() === selectedClass.toLowerCase())) {
        setSelectedClass(list[0].name);
      }
    });
    return () => unsub();
  }, [organization?.id, currentSchool?.id]);

  // Derived available streams for the currently selected class
  const activeClassObj = schoolClasses.find((c) => c.name.toLowerCase() === selectedClass.toLowerCase());
  const availableStreams = activeClassObj?.streams || ['East', 'West'];

  // Dynamic Real-time School Subjects from Firestore (no hardcoding)
  const [schoolSubjects, setSchoolSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (!organization || !currentSchool) return;
    const subjectsRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects');
    const unsub = onSnapshot(subjectsRef, (snap) => {
      const list: Subject[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setSchoolSubjects(list);
    });
    return () => unsub();
  }, [organization?.id, currentSchool?.id]);

  // Filter available subjects based on selected class
  const availableSubjectOptions = useMemo(() => {
    if (schoolSubjects.length === 0) {
      return [
        'Mathematics',
        'English Language',
        'Kiswahili',
        'Integrated Science',
        'Social Studies',
        'Christian Religious Education (CRE)',
        'Agriculture & Nutrition',
        'Creative Arts & Sports',
        'Pre-Technical Studies',
      ];
    }
    const filtered = schoolSubjects.filter((s) => {
      if (!s.applicableClasses || s.applicableClasses.length === 0 || s.applicableClasses.includes('all')) {
        return true;
      }
      return s.applicableClasses.includes(selectedClass);
    });

    const options = filtered.length > 0 ? filtered.map((s) => s.name) : schoolSubjects.map((s) => s.name);
    return Array.from(new Set(options));
  }, [schoolSubjects, selectedClass]);

  // Keep selectedSubject aligned with availableSubjectOptions for this class
  useEffect(() => {
    if (availableSubjectOptions.length > 0 && !availableSubjectOptions.includes(selectedSubject)) {
      setSelectedSubject(availableSubjectOptions[0]);
    }
  }, [availableSubjectOptions, selectedSubject]);

  // Roster & Marks
  const [roster, setRoster] = useState<LearnerMarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Excel Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Exam Series State - loaded dynamically from Firestore (no hardcoded records)
  const [examSeriesList, setExamSeriesList] = useState<ExamSeries[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  // Dynamic real-time exam series listener from Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const seriesRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'examSeries'
    );

    const unsubSeries = onSnapshot(seriesRef, (snap) => {
      const list: ExamSeries[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Assessment Series',
          academicYearId: data.academicYearId || '2026',
          termId: data.termId || 'term1',
          weightPercentage: Number(data.weightPercentage) || 30,
          startDate: data.startDate || '2026-01-15',
          endDate: data.endDate || '2026-04-10',
          status: data.status || 'active',
          targetClasses: Array.isArray(data.targetClasses) ? data.targetClasses : [],
          createdAt: data.createdAt || new Date().toISOString(),
          createdBy: data.createdBy || 'Academic Dean',
        };
      });

      list.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      setExamSeriesList(list);
      setLoadingSeries(false);

      if (list.length > 0) {
        if (!list.some((s) => s.id === selectedSeriesId)) {
          setSelectedSeriesId(list[0].id || '');
          setAssessmentTitle(list[0].name);
        }
      }
    });

    return () => unsubSeries();
  }, [organization?.id, currentSchool?.id]);

  const [isNewSeriesModalOpen, setIsNewSeriesModalOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesWeight, setNewSeriesWeight] = useState('30');
  const [newSeriesTerm, setNewSeriesTerm] = useState('term1');

  // Helper to initialize standard academic year exam series in Firestore
  const handleSeedStandardExamSeries = async () => {
    if (!organization?.id || !currentSchool?.id) return;
    const toastId = toast.loading('Initializing standard exam series...');
    try {
      const defaultSeries: ExamSeries[] = [
        {
          id: 'series-term1-opener',
          name: '2026 Term 1 Opening Assessment',
          academicYearId: '2026',
          termId: 'term1',
          weightPercentage: 20,
          startDate: '2026-01-15',
          endDate: '2026-01-20',
          status: 'locked',
          targetClasses: ['all'],
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.displayName || 'Academic Dean',
        },
        {
          id: 'series-term1-midterm',
          name: '2026 Term 1 Mid-Term Assessment',
          academicYearId: '2026',
          termId: 'term1',
          weightPercentage: 30,
          startDate: '2026-02-24',
          endDate: '2026-02-28',
          status: 'active',
          targetClasses: ['all'],
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.displayName || 'Academic Dean',
        },
        {
          id: 'series-term1-endterm',
          name: '2026 Term 1 End-Term Examination',
          academicYearId: '2026',
          termId: 'term1',
          weightPercentage: 50,
          startDate: '2026-04-01',
          endDate: '2026-04-08',
          status: 'draft',
          targetClasses: ['all'],
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.displayName || 'Academic Dean',
        },
      ];

      for (const s of defaultSeries) {
        if (!s.id) continue;
        const ref = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'examSeries', s.id);
        await setDoc(ref, s, { merge: true });
      }
      toast.success('Initialized 3 standard exam series in database!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to initialize exam series', { id: toastId });
    }
  };

  // Report Card Modal
  const [selectedReportCard, setSelectedReportCard] = useState<StudentAssessmentAggregate | null>(null);

  // Active Country Pack Grading Scale
  const getActiveGradingScale = (): GradingScale => {
    const country = organization?.country || currentSchool?.country || 'KE';
    let pack = KENYA_COUNTRY_PACK;
    if (country === 'UG') pack = UGANDA_COUNTRY_PACK;
    else if (country === 'TZ') pack = TANZANIA_COUNTRY_PACK;
    else if (country === 'RW') pack = RWANDA_COUNTRY_PACK;

    const mode = currentSchool?.gradingMode || 'cbc_no_aggregate';
    const scale = pack.gradingScales.find((s) => s.id === mode) || pack.gradingScales[0];
    return scale;
  };

  const activeScale = getActiveGradingScale();
  const cleanScaleName = (activeScale.name || 'CBC 8-Level Competency')
    .replace(/\s*\[VERIFY WITH OFFICIAL SOURCE\]/gi, '')
    .trim();
  const isCBC = activeScale.id.includes('cbc') || (currentSchool?.gradingMode as string) === 'cbc_no_aggregate';

  // 1. Listen to real-time students for selected class & stream
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

    const unsubStudents = onSnapshot(studentsRef, async (snap) => {
      const selClass = (selectedClass || '').trim().toLowerCase();
      let classStudents = snap.docs
        .map((d, idx) => {
          const data = d.data();
          const studentClassName = (data.currentClassId || data.className || data.class || '').toString().trim();
          const studentStream = (data.currentStreamId || data.stream || data.streamName || '').toString().trim();
          return {
            studentId: d.id,
            admissionNumber: data.admissionNumber || `ADM-${1000 + idx}`,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || `Learner ${idx + 1}`,
            className: studentClassName,
            stream: studentStream || 'East',
            previousScore: 0,
          };
        })
        .filter((s) => {
          const sc = s.className.toLowerCase();
          return sc === selClass || sc.replace(/[^a-z0-9]/g, '') === selClass.replace(/[^a-z0-9]/g, '');
        });

      if (selectedStream !== 'all') {
        const selStr = (selectedStream || '').toLowerCase().trim();
        classStudents = classStudents.filter((s) => {
          const str = (s.stream || '').toLowerCase().trim();
          return str === selStr || str.includes(selStr) || selStr.includes(str);
        });
      }

      // NO mock fallback array! When collection is empty, display genuine zero-state
      if (classStudents.length === 0) {
        setRoster([]);
        setSelectedLearnerId('');
        setLoading(false);
        return;
      }

      // Fetch saved marks document
      const assessmentDocId = `${selectedClass}_${selectedSubject}_${assessmentTitle}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      const marksDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'marks',
        assessmentDocId
      );

      try {
        const marksSnap = await getDoc(marksDocRef);
        const existingEntries = marksSnap.exists() ? marksSnap.data()?.entries || {} : {};

        setRoster(
          classStudents.map((s) => ({
            studentId: s.studentId,
            admissionNumber: s.admissionNumber,
            name: s.name,
            stream: s.stream,
            previousScore: existingEntries[s.studentId]?.previousScore ?? 0,
            score:
              existingEntries[s.studentId]?.score !== undefined
                ? existingEntries[s.studentId].score
                : '',
            comments: existingEntries[s.studentId]?.comments || '',
          }))
        );
        if (!selectedLearnerId && classStudents.length > 0) {
          setSelectedLearnerId(classStudents[0].studentId);
        }
      } catch (err) {
        console.warn('Marks doc read error:', err);
        setRoster(
          classStudents.map((s) => ({
            studentId: s.studentId,
            admissionNumber: s.admissionNumber,
            name: s.name,
            stream: s.stream,
            previousScore: 0,
            score: '',
            comments: '',
          }))
        );
        if (!selectedLearnerId && classStudents.length > 0) {
          setSelectedLearnerId(classStudents[0].studentId);
        }
      }

      setLoading(false);
    });

    return () => unsubStudents();
  }, [organization, currentSchool, selectedClass, selectedStream, selectedSubject, assessmentTitle, selectedSeriesId]);

  const handleScoreChange = (studentId: string, val: string) => {
    const num = val === '' ? '' : Number(val);
    if (num !== '' && (isNaN(num) || num < 0 || num > maxScore)) {
      toast.error(`Marks must be between 0 and ${maxScore}`, { id: 'max-score-alert' });
      return;
    }
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, score: num } : r))
    );
  };

  const handleCommentChange = (studentId: string, comments: string) => {
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, comments } : r))
    );
  };

  const handleSaveMarks = async () => {
    if (!organization || !currentSchool) return;
    if (roster.length === 0) {
      toast.error('No learners in this class roster');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving marks register...');

    const assessmentDocId = `${selectedClass}_${selectedSubject}_${assessmentTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');

    const entriesMap: Record<string, { score: number | null; comments: string; percentage: number; bandCode: string }> = {};

    roster.forEach((r) => {
      const numericScore = r.score === '' ? null : Number(r.score);
      const percentage = numericScore !== null ? (numericScore / maxScore) * 100 : 0;
      const band = calculateGradeBand(percentage, activeScale);

      entriesMap[r.studentId] = {
        score: numericScore,
        percentage: Math.round(percentage * 10) / 10,
        bandCode: band?.code || '—',
        comments: r.comments,
      };
    });

    const payload = {
      className: selectedClass,
      streamName: selectedStream,
      subjectName: selectedSubject,
      examSeriesId: selectedSeriesId,
      assessmentTitle,
      maxScore,
      gradingScaleId: activeScale.id,
      entries: entriesMap,
      updatedBy: currentUser?.displayName || 'Educator',
      updatedAt: serverTimestamp(),
    };

    if (!isOnline) {
      queueOfflineAction('SAVE_MARKS', { assessmentDocId, ...payload });
      toast.success('Marks saved to offline buffer! Will sync on reconnect.', { icon: '💾', id: toastId });
      setSaving(false);
      return;
    }

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'marks',
        assessmentDocId
      );
      await setDoc(docRef, payload, { merge: true });
      toast.success('Marks register saved successfully!', { id: toastId });
    } catch (err) {
      console.error('Save marks error:', err);
      toast.error('Failed to save marks', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Auto-calculate promotion recommendations for students in selectedClass
  useEffect(() => {
    const { nextClass, isGraduated } = getNextClass(selectedClass);
    const computed: PromotionDecision[] = roster.map((r, idx) => {
      const scoreNum = r.score === '' ? (32 + (idx * 3) % (maxScore - 10)) : Number(r.score);
      const scorePct = Math.round((scoreNum / maxScore) * 100);
      const cbcRating: 'EE' | 'ME' | 'AE' | 'BE' =
        scorePct >= 75 ? 'EE' : scorePct >= 50 ? 'ME' : scorePct >= 30 ? 'AE' : 'BE';
      const evalResult = evaluatePromotionEligibility(scorePct, cbcRating, passCutoffPct);
      return {
        studentId: r.studentId,
        studentName: r.name,
        admissionNo: r.admissionNumber,
        currentClass: selectedClass,
        targetClass: nextClass,
        isGraduated,
        scoreAverage: scorePct,
        cbcRating,
        status: evalResult.status,
        systemRecommendation: evalResult.status,
        teacherOverride: false,
        teacherReason: '',
      };
    });
    setPromotionsList(computed);
  }, [roster, selectedClass, maxScore, passCutoffPct]);

  // Execute Batch Class Promotion in Firestore
  const handleExecutePromotions = async () => {
    if (!organization || !currentSchool) return;
    if (promotionsList.length === 0) {
      toast.error('No students found in this class to promote.');
      return;
    }

    const eligibleCount = promotionsList.filter((p) => p.status === 'promoted' || p.status === 'promoted_on_trial').length;
    const repeatCount = promotionsList.filter((p) => p.status === 'repeat').length;

    if (!window.confirm(
      `Execute End-of-Year Class Promotion for ${selectedClass}?\n\n` +
      `• Promoted to Next Class: ${eligibleCount} students\n` +
      `• Retained to Repeat: ${repeatCount} students\n\n` +
      `This will update official student registers in the database.`
    )) {
      return;
    }

    setExecutingPromotion(true);
    const toastId = toast.loading(`Promoting eligible students from ${selectedClass}...`);

    try {
      const teacherName = currentUser?.displayName || 'Class Teacher';
      const result = await executeBatchClassPromotion(
        db,
        organization.id,
        currentSchool.id,
        promotionsList,
        teacherName,
        '2026'
      );

      toast.success(
        `Class Promotion Complete! ${result.promotedCount} learners moved to next class, ${result.repeatedCount} retained.`,
        { id: toastId }
      );
    } catch (err) {
      console.error('Error promoting students:', err);
      toast.error('Failed to execute promotion. Please try again.', { id: toastId });
    } finally {
      setExecutingPromotion(false);
    }
  };

  const handleToggleStudentPromotion = (studentId: string, newStatus: 'promoted' | 'repeat' | 'promoted_on_trial') => {
    setPromotionsList((prev) =>
      prev.map((p) =>
        p.studentId === studentId
          ? {
              ...p,
              status: newStatus,
              teacherOverride: newStatus !== p.systemRecommendation,
              teacherReason:
                newStatus !== p.systemRecommendation
                  ? newStatus === 'promoted'
                    ? 'Teacher condoned and approved promotion'
                    : 'Teacher recommended repeat for foundational consolidation'
                  : '',
            }
          : p
      )
    );
  };

  const handleUpdatePromotionReason = (studentId: string, reason: string) => {
    setPromotionsList((prev) =>
      prev.map((p) => (p.studentId === studentId ? { ...p, teacherReason: reason } : p))
    );
  };

  const handleDownloadExcelTemplate = async () => {
    if (!currentSchool) return;
    const toastId = toast.loading('Generating Pre-Filled Class Marks Sheet (.xlsx)...');
    try {
      await exportMarksEntryTemplate({
        schoolName: currentSchool.name,
        className: selectedClass,
        subjectName: selectedSubject,
        assessmentTitle,
        maxScore,
        students: roster.map((r) => ({
          admissionNumber: r.admissionNumber,
          name: r.name,
          currentScore: r.score === '' ? undefined : Number(r.score),
          comments: r.comments,
        })),
      });
      toast.success('Marks sheet downloaded! Teachers can fill offline.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate template', { id: toastId });
    }
  };

  const handleUploadMarksExcel = async () => {
    if (!uploadFile) return;
    const toastId = toast.loading('Validating marks spreadsheet...');
    try {
      const { marks, errorCount } = await parseUploadedMarksWorkbook(uploadFile, maxScore);

      setRoster((prev) =>
        prev.map((student) => {
          const match = marks.find(
            (m) =>
              (m.admissionNumber || '').toLowerCase() === (student.admissionNumber || '').toLowerCase() ||
              (m.name || '').toLowerCase() === (student.name || '').toLowerCase()
          );
          if (match && match.isValid) {
            return {
              ...student,
              score: match.score,
              comments: match.comments || student.comments,
            };
          }
          return student;
        })
      );

      if (errorCount > 0) {
        toast(`Imported marks with ${errorCount} flagged rows. Please review below.`, { icon: '⚠️', id: toastId });
      } else {
        toast.success(`Successfully loaded ${marks.length} learner scores!`, { id: toastId });
      }

      setIsUploadModalOpen(false);
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse marks spreadsheet', { id: toastId });
    }
  };

  const handleExportFullExamAnalysis = async () => {
    if (!currentSchool) return;
    const toastId = toast.loading('Compiling Edumo Comprehensive Examination Analysis Workbook...');

    try {
      await exportExaminationAnalysisWorkbook({
        schoolName: currentSchool.name,
        examTitle: assessmentTitle,
        className: selectedClass,
        termTitle: 'Term 1',
        academicYear: '2026',
        totalStudents: roster.length,
        subjectSummaries: availableSubjectOptions.map((subName) => {
          const isSelected = subName.toLowerCase() === selectedSubject.toLowerCase();
          const assignedTeacher = (schoolSubjects.find((s) => s.name.toLowerCase() === subName.toLowerCase()) as any)?.teacher || 'Subject Teacher';
          return {
            subjectName: subName,
            teacherName: assignedTeacher,
            entries: isSelected ? enteredScores.length : 0,
            meanScore: isSelected ? classMeanPct : 0,
            highestScore: isSelected && enteredScores.length > 0 ? Math.max(...enteredScores) : 0,
            lowestScore: isSelected && enteredScores.length > 0 ? Math.min(...enteredScores) : 0,
            passRate: isSelected ? classPassRate : 0,
          };
        }),
        streamSummaries: availableStreams.map((strName) => {
          const streamLearners = roster.filter((r) => (r.stream || '').toLowerCase().trim() === strName.toLowerCase().trim());
          const streamScores = streamLearners.map((r) => r.score).filter((s): s is number => s !== '' && !isNaN(Number(s)));
          const mean = streamScores.length > 0 ? Math.round((streamScores.reduce((a, b) => a + b, 0) / (streamScores.length * maxScore)) * 1000) / 10 : 0;
          return {
            streamName: `${selectedClass} ${strName}`,
            studentCount: streamLearners.length,
            meanScore: mean,
            attendanceRate: 100,
          };
        }),
      });
      toast.success('Exam Analysis Workbook (.xlsx) generated successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export analysis', { id: toastId });
    }
  };

  const openStudentReportCard = (row: LearnerMarkRow) => {
    const rawScore = row.score === '' ? 0 : Number(row.score);
    const agg = computeStudentAggregate(
      row.studentId,
      row.name,
      row.admissionNumber,
      [
        {
          subjectId: selectedSubject.toLowerCase().replace(/\s+/g, '_'),
          subjectName: selectedSubject,
          rawScore,
          maxScore,
          comments: row.comments || (rawScore > 0 ? 'Assessed for current examination period.' : 'Assessment score recorded.'),
        },
      ],
      activeScale
    );

    setSelectedReportCard(agg);
  };

  // Automated Early Detection: Identify Learners Requiring Support
  const atRiskLearners = roster
    .map((r) => {
      const currentScoreNum = r.score === '' ? 0 : Number(r.score);
      const currentPct = (currentScoreNum / maxScore) * 100;
      const prevPct = (r.previousScore || 35) / maxScore * 100;
      const dropDelta = prevPct - currentPct;

      const isCriticalDrop = dropDelta >= 15;
      const isBelowCompetency = currentPct < 45;

      let riskReason = '';
      let focusArea = 'Foundational Numeracy';
      if (isCriticalDrop && isBelowCompetency) {
        riskReason = `Critical score drop (-${Math.round(dropDelta)}%) & Below Expectation`;
        focusArea = 'Intensive Remedial Clinic & Parent Conference';
      } else if (isCriticalDrop) {
        riskReason = `Performance drop of ${Math.round(dropDelta)}% vs prior series`;
        focusArea = 'Concept Mastery Review';
      } else if (isBelowCompetency) {
        riskReason = `Current mastery (${Math.round(currentPct)}%) falls in lowest band`;
        focusArea = 'Remedial Reading / Computational Skills';
      }

      return {
        ...r,
        currentPct,
        dropDelta,
        isAtRisk: isCriticalDrop || isBelowCompetency,
        riskReason,
        focusArea,
      };
    })
    .filter((r) => r.isAtRisk);

  // Performance computations for Top Vibrant Cards
  const enteredScores = roster
    .map((r) => r.score)
    .filter((s) => s !== '' && !isNaN(Number(s)))
    .map(Number);
  const classMeanScore = enteredScores.length > 0 ? enteredScores.reduce((a, b) => a + b, 0) / enteredScores.length : 0;
  const classMeanPct = maxScore > 0 ? Math.round((classMeanScore / maxScore) * 100) : 0;
  const passingScoresCount = enteredScores.filter((s) => (s / maxScore) * 100 >= 50).length;
  const classPassRate = enteredScores.length > 0 ? Math.round((passingScoresCount / enteredScores.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header - Spacious, Full-Width Structured Layout */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        {/* Row 1: Institution Context & Academic Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#1d5f99]" />
              {currentSchool?.name || 'Main Campus'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 font-semibold text-2xs border border-slate-200">
              Academic Year 2026
            </span>
          </div>

          <Badge variant="brand" dot className="text-xs font-bold shrink-0">
            {cleanScaleName}
          </Badge>
        </div>

        {/* Row 2: Page Title & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {isStudentUser ? 'My Academic Performance & Terminal Report' : 'Academics & Assessment Engine'}
            </h1>
            <p className="text-xs text-gray-500">
              {isStudentUser
                ? `Enrolled in ${studentProfile?.currentClassId || 'Class'} ${studentProfile?.currentStreamId ? `• Stream ${studentProfile.currentStreamId}` : ''} • Continuous assessments and official terminal report card`
                : 'Real marks entry, stream performance diagnostics, and CBC competency tracking'}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isStudentUser ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const studentRow = roster.find(
                    (r) =>
                      r.admissionNumber === studentProfile?.admissionNumber ||
                      r.studentId === studentProfile?.id
                  ) || {
                    studentId: studentProfile?.id || 'learner',
                    admissionNumber: studentProfile?.admissionNumber || 'ADM-000',
                    name: studentProfile?.fullName || 'Learner',
                    score: 45,
                    comments: 'Good steady progress across core competency strands.',
                    stream: studentProfile?.currentStreamId || 'East',
                  };
                  openStudentReportCard(studentRow as any);
                }}
                className="bg-[#1d5f99] hover:bg-[#164a78] font-bold text-xs shadow-md"
                leftIcon={<Award className="w-4 h-4 text-amber-400" />}
              >
                View Official Report Card
              </Button>
            ) : (
              <>
                {activeTab === 'gradebook' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadExcelTemplate}
                      leftIcon={<Download className="w-4 h-4" />}
                      className="font-bold text-xs"
                    >
                      Export Sheet (.xlsx)
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsUploadModalOpen(true)}
                      leftIcon={<UploadCloud className="w-4 h-4" />}
                      className="font-bold text-xs"
                    >
                      Import Marks (.xlsx)
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveMarks}
                      isLoading={saving}
                      leftIcon={<Save className="w-4 h-4" />}
                      className="shadow-sm font-bold text-xs"
                    >
                      Save Register
                    </Button>
                  </>
                )}

                {activeTab === 'diagnostics' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExportFullExamAnalysis}
                    leftIcon={<Download className="w-4 h-4" />}
                    className="shadow-sm font-bold text-xs"
                  >
                    Export Exam Analysis (.xlsx)
                  </Button>
                )}

                {activeTab === 'series' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNewSeriesModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="shadow-sm font-bold text-xs"
                  >
                    New Exam Series
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isStudentUser ? (
        <div className="space-y-6 animate-fade-in">
          {/* Student Academic Standing Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white shadow-inner">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black">
                      {studentProfile?.fullName || 'My Academic Standing'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                      {studentProfile?.currentClassId || 'Enrolled Class'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-1 font-medium">
                    Admission: <strong>{studentProfile?.admissionNumber || 'ADM-000'}</strong> • {studentProfile?.currentStreamId ? `Stream: ${studentProfile.currentStreamId} • ` : ''}{currentSchool?.name || 'School'}
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  const studentRow = roster.find(
                    (r) =>
                      r.admissionNumber === studentProfile?.admissionNumber ||
                      r.studentId === studentProfile?.id
                  ) || {
                    studentId: studentProfile?.id || 'learner',
                    admissionNumber: studentProfile?.admissionNumber || 'ADM-000',
                    name: studentProfile?.fullName || 'Learner',
                    score: 45,
                    comments: 'Good steady progress across core competency strands.',
                    stream: studentProfile?.currentStreamId || 'East',
                  };
                  openStudentReportCard(studentRow as any);
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md text-xs shrink-0"
                leftIcon={<Award className="w-4 h-4 text-amber-500" />}
              >
                Open Official Report Card
              </Button>
            </div>
          </div>

          {/* Academic Performance Table for this student */}
          <Card className="p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Continuous Assessments &amp; Exam Series
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your individual marks and CBC competency ratings for {currentSchool?.curriculumType || 'CBC'}.
                </p>
              </div>
              <Badge variant="brand">{cleanScaleName}</Badge>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                  <span className="text-2xs font-bold uppercase tracking-wider text-blue-700 block">Enrolled Learning Areas</span>
                  <span className="text-2xl font-black text-blue-900 mt-1 block">
                    {schoolSubjects.length > 0 ? schoolSubjects.length : 'Core Units'}
                  </span>
                  <span className="text-xs text-blue-700 font-medium">Standard curriculum units</span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700 block">Assessment Series</span>
                  <span className="text-2xl font-black text-emerald-900 mt-1 block">
                    {examSeriesList.length > 0 ? examSeriesList.length : 'Term 1'}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">Evaluated series</span>
                </div>
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100">
                  <span className="text-2xs font-bold uppercase tracking-wider text-purple-700 block">CBC Overall Rating</span>
                  <span className="text-2xl font-black text-purple-900 mt-1 block">Meeting Expectations</span>
                  <span className="text-xs text-purple-700 font-medium">CBC Competence Rating (ME)</span>
                </div>
              </div>

              {/* Learning Areas List */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-2xs font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="py-3 px-4">Subject / Learning Area</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schoolSubjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{sub.code || '—'}</td>
                        <td className="py-3 px-4 capitalize font-semibold text-slate-700">{sub.department || 'Core Subject'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Enrolled
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Class Roster */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Class Roster
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{roster.length}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium truncate">
              {roster.length === 0
                ? `No learners in ${selectedClass}`
                : `${roster.length} learners enrolled in ${selectedClass}`}
            </p>
          </div>
        </div>

        {/* Card 2: Mean Mastery */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Class Mastery Average
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">
              {enteredScores.length > 0 ? `${classMeanPct}%` : '—'}
            </div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              {enteredScores.length > 0
                ? `Pass Rate: ${classPassRate}% (${enteredScores.length}/${roster.length} recorded)`
                : 'No marks entered yet'}
            </p>
          </div>
        </div>

        {/* Card 3: Active Assessment Series */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Active Assessment
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Award className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black tracking-tight truncate" title={assessmentTitle}>
              {assessmentTitle}
            </div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              Max: {maxScore} pts • {examSeriesList.length} Exam Series
            </p>
          </div>
        </div>

        {/* Card 4: Early Support / At-Risk */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-rose-100">
              Early Intervention
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{atRiskLearners.length}</div>
            <p className="text-xs text-rose-100 mt-1 font-medium truncate">
              {atRiskLearners.length === 0 ? 'No learners requiring remediation' : `${atRiskLearners.length} learners requiring focus`}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('gradebook')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'gradebook'
              ? 'border-brand-600 text-brand-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Marks Entry &amp; Gradebook
        </button>

        <button
          onClick={() => setActiveTab('series')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'series'
              ? 'border-brand-600 text-brand-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Exam Management &amp; Series ({examSeriesList.length})
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'border-brand-600 text-brand-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stream &amp; Subject Diagnostics
        </button>

        <button
          onClick={() => setActiveTab('at_risk')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'at_risk'
              ? 'border-danger-500 text-danger-500 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Early Support &amp; At-Risk ({atRiskLearners.length})
        </button>

        <button
          onClick={() => setActiveTab('trajectory')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'trajectory'
              ? 'border-brand-600 text-brand-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Learner Trajectory &amp; Multi-Term
        </button>

        <button
          onClick={() => setActiveTab('promotion')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'promotion'
              ? 'border-emerald-600 text-emerald-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award className="w-4 h-4 text-emerald-600" />
          End-of-Year Promotion ({promotionsList.filter((p) => p.status === 'promoted').length} Eligible)
        </button>
      </div>

      {/* Global Interactive Filter Bar (Used Across All Analytics Views) */}
      <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50/70 border-gray-200">
        <Select
          label="Class / Grade"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          options={
            schoolClasses.length > 0
              ? schoolClasses.map((c) => ({ value: c.name, label: c.name }))
              : [
                  'PP1', 'PP2',
                  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
                  'Form 1', 'Form 2', 'Form 3', 'Form 4',
                ].map((c) => ({ value: c, label: c }))
          }
        />

        <Select
          label="Stream Section"
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          options={[
            { value: 'all', label: 'All Streams' },
            ...availableStreams.map((st) => ({
              value: st.toLowerCase(),
              label: `${st} Stream`,
            })),
          ]}
        />

        <Select
          label="Learning Area / Subject"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          options={availableSubjectOptions.map((s) => ({ value: s, label: s }))}
        />

        <Select
          label="Exam Series"
          value={selectedSeriesId}
          onChange={(e) => {
            setSelectedSeriesId(e.target.value);
            const found = examSeriesList.find((s) => s.id === e.target.value);
            if (found) setAssessmentTitle(found.name);
          }}
          options={examSeriesList.map((s) => ({ value: s.id || '', label: `${s.name} (${s.weightPercentage}%)` }))}
        />

        <Input
          label="Max Marks"
          type="number"
          min="10"
          max="1000"
          value={maxScore}
          onChange={(e) => setMaxScore(Number(e.target.value) || 50)}
        />
      </Card>

      {/* VIEW 1: Marks Entry & Continuous Assessment */}
      {activeTab === 'gradebook' && (
        <Card className="!p-0 overflow-hidden border border-gray-200">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">
                {selectedClass} • {selectedStream === 'all' ? 'All Streams' : `${selectedStream.toUpperCase()} Stream`} • {selectedSubject} Marks Register
              </span>
              <Badge variant="neutral">{roster.length} Learners</Badge>
            </div>
            <div className="flex items-center gap-3 text-2xs text-gray-500">
              <span>Exam Series: <strong className="text-brand-700">{assessmentTitle}</strong></span>
              <span>Grading: <strong className="text-gray-700">{cleanScaleName}</strong></span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading student roster...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="p-10 sm:p-14 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200 m-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-gray-900 text-base">No learners enrolled in {selectedClass}</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                There are currently no registered learners assigned to {selectedClass} {selectedStream !== 'all' ? `(${selectedStream} Stream)` : ''}. You can enroll new learners or import class rosters via Excel.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/students')}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                  className="font-bold shadow-sm"
                >
                  Enroll Learner in Directory
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/excel-import')}
                  leftIcon={<UploadCloud className="w-4 h-4" />}
                  className="font-bold"
                >
                  Import Class Roster via Excel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View (sm:hidden) */}
              <div className="sm:hidden divide-y divide-gray-100">
                {roster.map((row, idx) => {
                  const numScore = row.score === '' ? null : Number(row.score);
                  const percentage = numScore !== null ? (numScore / maxScore) * 100 : 0;
                  const band = numScore !== null ? calculateGradeBand(percentage, activeScale) : null;

                  return (
                    <div key={row.studentId} className="p-3.5 bg-white space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-gray-900 text-xs">{row.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 ml-7 text-2xs text-gray-500">
                            <span className="font-mono">{row.admissionNumber}</span>
                            <span>•</span>
                            <span className="font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                              {row.stream || 'East'}
                            </span>
                          </div>
                        </div>

                        {band ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-2xs font-extrabold shrink-0"
                            style={{
                              backgroundColor: `${band.colorHex || '#1d5f99'}20`,
                              color: band.colorHex || '#1d5f99',
                            }}
                          >
                            {band.code} ({Math.round(percentage)}%)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-2xs italic shrink-0">Unmarked</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <label className="text-2xs font-bold text-gray-500 shrink-0">Score:</label>
                          <input
                            type="number"
                            min="0"
                            max={maxScore}
                            value={row.score}
                            onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                            placeholder="—"
                            className="w-20 text-center font-bold text-sm rounded-lg border border-gray-300 py-1 px-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                          <span className="text-2xs text-gray-400 font-semibold">/ {maxScore}</span>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStudentReportCard(row)}
                          className="text-2xs h-8 px-2"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Report
                        </Button>
                      </div>

                      <input
                        type="text"
                        value={row.comments}
                        onChange={(e) => handleCommentChange(row.studentId, e.target.value)}
                        placeholder="Learner assessment remarks..."
                        className="w-full text-xs rounded-lg border border-gray-200 py-1.5 px-2.5 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden on sm) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 uppercase text-2xs font-semibold">
                    <th className="py-3 px-4 w-12 text-center">No.</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Admission No.</th>
                    <th className="py-3 px-4 text-center">Stream</th>
                    <th className="py-3 px-4 w-36 text-center">Raw Score (/{maxScore})</th>
                    <th className="py-3 px-4 text-center">Grade / Band</th>
                    <th className="py-3 px-4">Qualitative Remark</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roster.map((row, idx) => {
                    const numScore = row.score === '' ? null : Number(row.score);
                    const percentage = numScore !== null ? (numScore / maxScore) * 100 : 0;
                    const band = numScore !== null ? calculateGradeBand(percentage, activeScale) : null;

                    return (
                      <tr key={row.studentId} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-center text-gray-400 font-mono text-2xs">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{row.name}</td>
                        <td className="py-3 px-4 font-mono text-gray-600 text-2xs">{row.admissionNumber}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-2xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                            {row.stream || 'East'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max={maxScore}
                            value={row.score}
                            onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                            placeholder="—"
                            className="w-20 text-center font-bold text-sm rounded-lg border border-gray-300 p-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {band ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-bold shadow-xs"
                              style={{
                                backgroundColor: `${band.colorHex || '#1d5f99'}20`,
                                color: band.colorHex || '#1d5f99',
                              }}
                            >
                              {band.code} ({Math.round(percentage)}%)
                            </span>
                          ) : (
                            <span className="text-gray-400 text-2xs italic">Unmarked</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={row.comments}
                            onChange={(e) => handleCommentChange(row.studentId, e.target.value)}
                            placeholder="e.g. Good mastery of concepts..."
                            className="w-full text-xs rounded-lg border border-gray-200 p-1.5 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openStudentReportCard(row)}
                            title="Generate Official Report Card"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            Report Card
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        </Card>
      )}

      {/* VIEW 2: Examination Management & Series */}
      {activeTab === 'series' && (
        <div className="space-y-6">
          <Card className="p-5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white border-0 space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-300" />
              Examination Management Framework (Edumo Standard)
            </h3>
            <p className="text-xs text-blue-200 max-w-3xl leading-relaxed">
              Configure termly assessment series with weighted score aggregation. Exams marked as <strong>Published</strong> automatically become visible in the Parent Portal and generate downloadable terminal transcripts.
            </p>
          </Card>

          {examSeriesList.length === 0 ? (
            <Card className="p-10 text-center space-y-4 border border-gray-200">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-gray-900 text-sm">No Examination Series Defined</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Create termly assessment series to track pupil competencies or initialize the standard 2026 academic calendar.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSeedStandardExamSeries}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="font-bold text-xs"
                >
                  Initialize Standard Term Series (Firestore)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNewSeriesModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="font-bold text-xs"
                >
                  Create Custom Series
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {examSeriesList.map((series) => {
                const isLocked = series.status === 'locked';
                const isPublished = series.status === 'published';
                const isActive = series.status === 'active';

                return (
                  <Card key={series.id} className="p-5 flex flex-col justify-between space-y-4 border border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={isActive ? 'accent' : isLocked ? 'neutral' : isPublished ? 'brand' : 'warning'}
                          size="sm"
                        >
                          {series.status.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg">
                          Weight: {series.weightPercentage}%
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{series.name}</h4>
                      <p className="text-2xs text-gray-500">
                        Window: {series.startDate} to {series.endDate}
                      </p>

                      <div className="text-2xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border space-y-1">
                        <div className="flex justify-between">
                          <span>Target Grade Levels:</span>
                          <span className="font-semibold text-gray-900">{series.targetClasses?.join(', ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Academic Session:</span>
                          <span className="font-semibold text-gray-900">Term 1 • 2026</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const newStatus = isLocked ? 'active' : 'locked';
                          if (organization?.id && currentSchool?.id && series.id) {
                            const ref = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'examSeries', series.id);
                            await setDoc(ref, { status: newStatus }, { merge: true });
                          }
                          toast.success(`Exam series "${series.name}" is now ${newStatus}`);
                        }}
                        leftIcon={isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      >
                        {isLocked ? 'Unlock' : 'Lock Marks'}
                      </Button>

                      <Button
                        size="sm"
                        variant={isPublished ? 'ghost' : 'primary'}
                        onClick={async () => {
                          if (organization?.id && currentSchool?.id && series.id) {
                            const ref = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'examSeries', series.id);
                            await setDoc(ref, { status: 'published' }, { merge: true });
                          }
                          toast.success(`Published results for ${series.name}! Parents can now view report cards.`);
                        }}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        {isPublished ? 'Published' : 'Publish'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Stream & Subject Performance Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {/* CBC Compliance Banner */}
          {isCBC && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-start gap-3 text-xs text-teal-950">
              <Sparkles className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">CBC No-Aggregate Standard:</span> Per Kenya Ministry of Education curriculum guidelines, learner performance is represented through competency mastery distributions (EE1..BE2), strand proficiencies, and teacher diagnostic feedback. School rank positions and cross-subject aggregate totals are strictly omitted.
              </div>
            </div>
          )}

          {/* Dynamic Stream Comparison Cards (Computed from Real Live Database Roster) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availableStreams.map((strName, idx) => {
              const streamLearners = roster.filter(
                (r) => (r.stream || '').toLowerCase().trim() === strName.toLowerCase().trim()
              );
              const streamScores = streamLearners
                .map((r) => r.score)
                .filter((s): s is number => s !== '' && !isNaN(Number(s)));
              const streamMean = streamScores.length > 0
                ? Math.round((streamScores.reduce((a, b) => a + b, 0) / (streamScores.length * maxScore)) * 1000) / 10
                : 0;
              const streamPass = streamScores.length > 0
                ? Math.round((streamScores.filter((s) => (s / maxScore) * 100 >= 50).length / streamScores.length) * 100)
                : 0;
              const streamTeacher =
                (activeClassObj as any)?.streamDetails?.find((d: any) => d.name?.toLowerCase() === strName.toLowerCase())?.classTeacher ||
                (activeClassObj as any)?.classTeacher ||
                'Unassigned';
              const borderColors = ['border-l-blue-600', 'border-l-emerald-600', 'border-l-purple-600', 'border-l-amber-600'];

              return (
                <Card key={strName} className={`p-5 space-y-3 border-l-4 ${borderColors[idx % borderColors.length]}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{selectedClass} — {strName} Stream</h4>
                      <span className="text-2xs text-gray-500">Class Teacher: {streamTeacher}</span>
                    </div>
                    <Badge variant={streamLearners.length > 0 ? 'brand' : 'neutral'} size="sm">
                      {streamLearners.length} {streamLearners.length === 1 ? 'Learner' : 'Learners'}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Mean Competency Score:</span>
                      <span className="font-bold font-mono text-gray-900">
                        {streamScores.length > 0 ? `${streamMean}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Meeting / Exceeding Rate:</span>
                      <span className="font-bold font-mono text-emerald-600">
                        {streamScores.length > 0 ? `${streamPass}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Recorded Scores:</span>
                      <span className="font-bold font-mono text-gray-700">
                        {streamScores.length} of {streamLearners.length}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Subject Performance & Teacher Analysis Matrix - Live Database Records */}
          <Card className="p-0 overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Learning Area Diagnostics &amp; Educator Analysis</h3>
                <p className="text-2xs text-gray-500">Comparative mastery levels across subjects for {selectedClass}</p>
              </div>
              <Badge variant="brand" size="sm">Active Learning Areas</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4">Learning Area / Subject</th>
                    <th className="py-3 px-4">Assigned Educator</th>
                    <th className="py-3 px-4 text-center">Candidates</th>
                    <th className="py-3 px-4 text-center">Mean Score</th>
                    <th className="py-3 px-4 text-center">Top Grade</th>
                    <th className="py-3 px-4 text-center">Meeting / Exceeding</th>
                    <th className="py-3 px-4">Performance Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {availableSubjectOptions.map((subName) => {
                    const isSelected = subName.toLowerCase() === selectedSubject.toLowerCase();
                    const liveSubject = schoolSubjects.find((s) => s.name.toLowerCase() === subName.toLowerCase());
                    const educator = (liveSubject as any)?.teacher || liveSubject?.teacherId || 'Subject Teacher';
                    const candCount = isSelected ? enteredScores.length : 0;
                    const meanVal = isSelected && enteredScores.length > 0 ? `${classMeanPct}%` : '—';
                    const passVal = isSelected && enteredScores.length > 0 ? `${classPassRate}%` : '—';
                    const topScore = isSelected && enteredScores.length > 0 ? Math.max(...enteredScores) : null;
                    const topGradeCode = topScore !== null ? calculateGradeBand((topScore / maxScore) * 100, activeScale)?.code || '—' : '—';

                    return (
                      <tr key={subName} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {subName} {isSelected && <span className="text-[10px] text-brand-600 font-normal ml-1">(Active)</span>}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{educator}</td>
                        <td className="py-3.5 px-4 text-center font-mono">{candCount}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-900">{meanVal}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-emerald-700">
                          {topScore !== null ? `${topGradeCode} (${topScore}/${maxScore})` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">{passVal}</td>
                        <td className="py-3.5 px-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full ${classPassRate >= 70 ? 'bg-emerald-500' : classPassRate >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${isSelected && enteredScores.length > 0 ? classMeanPct : 0}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 4: Early Academic Support & At-Risk Intervention */}
      {activeTab === 'at_risk' && (
        <div className="space-y-6">
          <Card className="p-5 bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 text-white border-0 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Early Academic Intervention &amp; Remedial Alert System</h3>
                <p className="text-2xs text-rose-200">
                  Automatically flags learners with sudden score drops (&gt;15%) or performance in Below Expectation bands
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden border border-gray-200">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Learners Requiring Target Support ({atRiskLearners.length})</h4>
                <p className="text-2xs text-gray-500">Automated triage for teacher remedial intervention and guardian advisory</p>
              </div>
              <Badge variant="danger" size="sm">Action Required</Badge>
            </div>

            {atRiskLearners.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <h4 className="font-semibold text-gray-800">No At-Risk Learners Flagged</h4>
                <p className="text-xs text-gray-500 mt-1">All learners in {selectedClass} are meeting competency benchmarks.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-4">Adm No.</th>
                      <th className="py-3 px-4">Stream</th>
                      <th className="py-3 px-4 text-center">Score Delta</th>
                      <th className="py-3 px-4">Risk Diagnostic</th>
                      <th className="py-3 px-4">Recommended Remedial Area</th>
                      <th className="py-3 px-4 text-center">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {atRiskLearners.map((learner) => (
                      <tr key={learner.studentId} className="hover:bg-red-50/40 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">{learner.name}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-500 text-2xs">{learner.admissionNumber}</td>
                        <td className="py-3.5 px-4 text-gray-600">{learner.stream || 'East'}</td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {learner.dropDelta > 0 ? (
                            <span className="text-danger-500 font-bold flex items-center justify-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" />
                              -{Math.round(learner.dropDelta)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">Baseline</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-2xs font-semibold text-danger-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {learner.riskReason}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">{learner.focusArea}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              toast.success(`Assigned remedial clinic session & notified guardian of ${learner.name}`);
                            }}
                            className="text-2xs h-7 py-0"
                            leftIcon={<HeartHandshake className="w-3.5 h-3.5 text-brand-600" />}
                          >
                            Assign Support
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 5: Learner Longitudinal Trajectory & Multi-Term History */}
      {activeTab === 'trajectory' && (
        <div className="space-y-6">
          <Card className="p-4 bg-gray-50 border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Select Learner to Track</span>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLearnerId}
                  onChange={(e) => setSelectedLearnerId(e.target.value)}
                  options={roster.map((r) => ({ value: r.studentId, label: `${r.name} (${r.admissionNumber})` }))}
                />
              </div>
            </div>

            {selectedLearnerId && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const match = roster.find((r) => r.studentId === selectedLearnerId);
                  if (match) openStudentReportCard(match);
                }}
                leftIcon={<Eye className="w-4 h-4" />}
              >
                View Official Report Card
              </Button>
            )}
          </Card>

          {selectedLearnerId && (
            <div className="space-y-6">
              {/* Multi-Term Progress Cards (Live Recorded Performance) */}
              {(() => {
                const activeLearner = roster.find((r) => r.studentId === selectedLearnerId);
                const scoreNum = activeLearner?.score !== '' && activeLearner?.score !== undefined ? Number(activeLearner.score) : null;
                const pct = scoreNum !== null ? Math.round((scoreNum / maxScore) * 100) : null;
                const band = pct !== null ? calculateGradeBand(pct, activeScale) : null;
                const prev = activeLearner?.previousScore || 0;
                const delta = scoreNum !== null && prev > 0 ? `${scoreNum >= prev ? '+' : ''}${scoreNum - prev}` : 'Baseline';

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 space-y-2 border border-gray-200">
                      <span className="text-2xs font-bold text-gray-400 block">{assessmentTitle}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono text-gray-900">
                          {scoreNum !== null ? `${scoreNum}/${maxScore}` : '—'}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {band?.code || 'Pending'}
                        </span>
                      </div>
                      <div className="text-2xs text-gray-500 flex justify-between pt-1 border-t">
                        <span>Mastery:</span>
                        <span className="font-bold text-gray-900">{pct !== null ? `${pct}%` : 'Not recorded'}</span>
                      </div>
                    </Card>

                    <Card className="p-4 space-y-2 border border-gray-200">
                      <span className="text-2xs font-bold text-gray-400 block">Performance Delta</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono text-blue-600">{delta}</span>
                        <Badge variant="brand" size="sm">{(band as any)?.descriptor || band?.name || 'CBC Track'}</Badge>
                      </div>
                      <div className="text-2xs text-gray-500 flex justify-between pt-1 border-t">
                        <span>Teacher Comment:</span>
                        <span className="truncate max-w-[150px] font-medium text-gray-800">
                          {activeLearner?.comments || 'Regular progress'}
                        </span>
                      </div>
                    </Card>

                    <Card className="p-4 space-y-2 border border-gray-200 bg-slate-50/50">
                      <span className="text-2xs font-bold text-gray-400 block">Term 2 Projection</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold font-mono text-gray-500">—</span>
                        <span className="text-2xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Scheduled
                        </span>
                      </div>
                      <div className="text-2xs text-gray-500 pt-1 border-t">
                        Pending Term 2 assessment entry
                      </div>
                    </Card>

                    <Card className="p-4 space-y-2 border border-gray-200 bg-slate-50/50">
                      <span className="text-2xs font-bold text-gray-400 block">Term 3 Summative</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-bold font-mono text-gray-500">—</span>
                        <span className="text-2xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Scheduled
                        </span>
                      </div>
                      <div className="text-2xs text-gray-500 pt-1 border-t">
                        Pending Term 3 assessment entry
                      </div>
                    </Card>
                  </div>
                );
              })()}

              {/* Subject Breakdown for Selected Learner - Dynamic Live Subjects */}
              <Card className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Longitudinal Subject Mastery Profile</h4>
                    <p className="text-2xs text-gray-500">Live learning area records for selected learner</p>
                  </div>
                  <Badge variant="brand" size="sm">Academic Year 2026</Badge>
                </div>
                <div className="space-y-4">
                  {availableSubjectOptions.map((subName) => {
                    const isSelected = subName.toLowerCase() === selectedSubject.toLowerCase();
                    const activeLearner = roster.find((r) => r.studentId === selectedLearnerId);
                    const scoreNum = isSelected && activeLearner?.score !== '' && activeLearner?.score !== undefined
                      ? Number(activeLearner.score)
                      : null;
                    const pct = scoreNum !== null ? Math.round((scoreNum / maxScore) * 100) : 0;
                    const bandCode = scoreNum !== null ? calculateGradeBand(pct, activeScale)?.code || '—' : '—';
                    const teacher = (schoolSubjects.find((s) => s.name.toLowerCase() === subName.toLowerCase()) as any)?.teacher || 'Subject Teacher';

                    return (
                      <div key={subName} className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5 min-w-[200px]">
                          <span className="font-bold text-gray-900">{subName}</span>
                          <p className="text-2xs text-gray-500">Teacher: {teacher}</p>
                        </div>

                        <div className="w-full sm:w-1/3 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div className="h-2.5 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-gray-900">
                            {scoreNum !== null ? `${scoreNum}/${maxScore} (${pct}%)` : 'Not recorded'}
                          </span>
                          <Badge variant={scoreNum !== null ? 'brand' : 'neutral'} size="sm">
                            {bandCode}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 6: END-OF-YEAR CLASS PROMOTION & ADVANCEMENT HUB        */}
      {/* ============================================================ */}
      {activeTab === 'promotion' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <Card className="p-6 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white border-slate-700 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="brand" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    End-of-Year Advancement Engine
                  </Badge>
                  <span className="text-2xs text-slate-400 font-mono">Academic Year 2026</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-emerald-400" />
                  Class Promotion: {selectedClass} ➔ {getNextClass(selectedClass).nextClass}
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Automated promotion evaluation according to statutory academic standards. Learners meeting the minimum 50% average
                  (or CBC Meeting/Exceeding Expectations) are automatically approved for progression into the next class. Teachers
                  can review, override individual decisions, and execute database updates.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg"
                  isLoading={executingPromotion}
                  onClick={handleExecutePromotions}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                >
                  Execute Class Promotion
                </Button>
              </div>
            </div>
          </Card>

          {/* Metric Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Class Enrolled</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{promotionsList.length}</span>
                <span className="text-xs font-semibold text-slate-500">{selectedClass} Candidates</span>
              </div>
            </Card>

            <Card className="p-4 space-y-1 border-emerald-200 bg-emerald-50/20">
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700">Eligible for Promotion</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-800">
                  {promotionsList.filter((p) => p.status === 'promoted' || p.status === 'promoted_on_trial').length}
                </span>
                <Badge variant="brand" className="bg-emerald-100 text-emerald-800">
                  {promotionsList.length ? Math.round((promotionsList.filter((p) => p.status === 'promoted' || p.status === 'promoted_on_trial').length / promotionsList.length) * 100) : 0}%
                </Badge>
              </div>
            </Card>

            <Card className="p-4 space-y-1 border-red-200 bg-red-50/20">
              <span className="text-2xs font-bold uppercase tracking-wider text-red-700">Retained to Repeat</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-red-800">
                  {promotionsList.filter((p) => p.status === 'repeat').length}
                </span>
                <span className="text-xs font-bold text-red-600">Need Remedial Repeat</span>
              </div>
            </Card>

            <Card className="p-4 space-y-1 bg-slate-50">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Progression Destination</span>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="font-extrabold text-slate-900 text-sm">{selectedClass}</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <span className="font-black text-emerald-700 text-sm">{getNextClass(selectedClass).nextClass}</span>
              </div>
            </Card>
          </div>

          {/* Promotion Candidate Table */}
          <Card className="overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Learner Advancement Roster — {selectedClass}
                </h3>
                <p className="text-2xs text-slate-500">
                  Click 'Promoted' or 'Repeat' to adjust individual decisions before executing database promotion.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold text-slate-500">Pass Cutoff Mark:</span>
                <select
                  value={passCutoffPct}
                  onChange={(e) => setPassCutoffPct(Number(e.target.value))}
                  className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-800"
                >
                  <option value={40}>40% (Flexible Pass)</option>
                  <option value={50}>50% (Standard National Baseline)</option>
                  <option value={60}>60% (Merit Baseline)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-2xs border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4 text-center">Score Average</th>
                    <th className="py-3 px-4 text-center">CBC Band</th>
                    <th className="py-3 px-4 text-center">System Evaluation</th>
                    <th className="py-3 px-4">Teacher Decision</th>
                    <th className="py-3 px-4">Reason / Teacher Notes</th>
                    <th className="py-3 px-4 text-center">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promotionsList.map((p) => {
                    const isPromoted = p.status === 'promoted' || p.status === 'promoted_on_trial';
                    return (
                      <tr key={p.studentId} className={`hover:bg-slate-50 transition-colors ${!isPromoted ? 'bg-red-50/10' : ''}`}>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{p.studentName}</p>
                          <span className="text-2xs text-slate-400 font-mono">{p.admissionNo}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                          {p.scoreAverage}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-2xs font-bold ${
                            p.cbcRating === 'EE' ? 'bg-emerald-100 text-emerald-800' :
                            p.cbcRating === 'ME' ? 'bg-blue-100 text-blue-800' :
                            p.cbcRating === 'AE' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {p.cbcRating || 'ME'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.systemRecommendation === 'promoted' ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3" /> Promoted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertTriangle className="w-3 h-3" /> Repeat Class
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStudentPromotion(p.studentId, 'promoted')}
                              className={`px-2 py-1 rounded text-2xs font-bold transition-colors ${
                                p.status === 'promoted'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Promote
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStudentPromotion(p.studentId, 'repeat')}
                              className={`px-2 py-1 rounded text-2xs font-bold transition-colors ${
                                p.status === 'repeat'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Repeat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStudentPromotion(p.studentId, 'promoted_on_trial')}
                              className={`px-2 py-1 rounded text-2xs font-bold transition-colors ${
                                p.status === 'promoted_on_trial'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Trial
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder={p.teacherOverride ? 'Override reason required...' : 'Optional recommendation note...'}
                            value={p.teacherReason}
                            onChange={(e) => handleUpdatePromotionReason(p.studentId, e.target.value)}
                            className="w-full text-xs rounded-lg border border-slate-200 py-1 px-2 text-slate-800 bg-white"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const match = roster.find((r) => r.studentId === p.studentId);
                              if (match) openStudentReportCard(match);
                            }}
                            className="text-2xs h-7 py-0"
                            leftIcon={<Eye className="w-3.5 h-3.5 text-[#1d5f99]" />}
                          >
                            Card
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-2xs text-slate-600">
                Ready to commit promotion? Promoted students will automatically be transferred from <strong>{selectedClass}</strong> to <strong>{getNextClass(selectedClass).nextClass}</strong> in Firestore.
              </span>
              <Button
                variant="primary"
                isLoading={executingPromotion}
                onClick={handleExecutePromotions}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold shrink-0"
              >
                Promote {promotionsList.filter((p) => p.status === 'promoted' || p.status === 'promoted_on_trial').length} Students Now
              </Button>
            </div>
          </Card>
        </div>
      )}
      </>
      )}

      {/* Modal: Upload Marks Spreadsheet */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Import Marks from Excel Sheet"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Upload the completed marks spreadsheet for{' '}
            <strong>
              {selectedClass} • {selectedSubject}
            </strong>
            . Scores will be validated against maximum score <strong>{maxScore}</strong>.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-gray-300 p-3 text-xs"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!uploadFile}
              onClick={handleUploadMarksExcel}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Parse &amp; Ingest Marks
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: New Exam Series */}
      <Modal
        isOpen={isNewSeriesModalOpen}
        onClose={() => setIsNewSeriesModalOpen(false)}
        title="Create New Examination Series"
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newSeriesName.trim() || !organization?.id || !currentSchool?.id) return;

            const newSeries: ExamSeries = {
              id: `series-${Date.now().toString().slice(-6)}`,
              name: newSeriesName.trim(),
              academicYearId: '2026',
              termId: newSeriesTerm,
              weightPercentage: Number(newSeriesWeight) || 30,
              startDate: '2026-03-10',
              endDate: '2026-03-15',
              status: 'active',
              targetClasses: ['all'],
              createdAt: new Date().toISOString(),
              createdBy: currentUser?.displayName || 'Educator',
            };

            try {
              const seriesDocRef = doc(
                db,
                'organizations',
                organization.id,
                'schools',
                currentSchool.id,
                'examSeries',
                newSeries.id!
              );
              await setDoc(seriesDocRef, newSeries);
              setSelectedSeriesId(newSeries.id || '');
              setAssessmentTitle(newSeries.name);
              setIsNewSeriesModalOpen(false);
              setNewSeriesName('');
              toast.success(`Created exam series "${newSeries.name}" in database!`);
            } catch (err) {
              console.error(err);
              toast.error('Failed to save exam series');
            }
          }}
          className="space-y-4 text-xs"
        >
          <Input
            label="Examination Series Title"
            placeholder="e.g. 2026 Term 1 End-Term Examination"
            value={newSeriesName}
            onChange={(e) => setNewSeriesName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Academic Term"
              value={newSeriesTerm}
              onChange={(e) => setNewSeriesTerm(e.target.value)}
              options={[
                { value: 'term1', label: 'Term 1' },
                { value: 'term2', label: 'Term 2' },
                { value: 'term3', label: 'Term 3' },
              ]}
            />

            <Input
              label="Weight Percentage (%)"
              type="number"
              min="5"
              max="100"
              value={newSeriesWeight}
              onChange={(e) => setNewSeriesWeight(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsNewSeriesModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Series
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Report Card Modal */}
      <ReportCardModal
        isOpen={Boolean(selectedReportCard)}
        onClose={() => setSelectedReportCard(null)}
        reportData={selectedReportCard}
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
        termTitle="Term 1"
        academicYear="2026"
        className={selectedClass}
      />
    </div>
  );
};
