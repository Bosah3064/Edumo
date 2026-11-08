import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import {
  Users,
  CalendarCheck2,
  GraduationCap,
  Building2,
  UserPlus,
  ArrowRight,
  Megaphone,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Bell,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import { TeacherTaskTracker } from '../components/dashboard/TeacherTaskTracker';
import { isSampleLearner } from '../utils/databaseInitializer';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { organization, currentSchool, schools, currentRole, isStudent, isAdmin, isTeacher, isBursar, studentProfile } = useTenant();
  const isStudentUser = isStudent || currentRole === 'student' || (currentRole as string) === 'learner';
  const isTeacherUser = isTeacher || currentRole === 'teacher';
  const isBursarUser = isBursar || currentRole === 'bursar' || (currentRole as string) === 'accounts';
  const navigate = useNavigate();

  const [studentCount, setStudentCount] = useState<number>(0);
  const [genderStats, setGenderStats] = useState<{ male: number; female: number }>({ male: 0, female: 0 });
  const [staffCount, setStaffCount] = useState<number>(0);
  const [classCount, setClassCount] = useState<number>(0);
  const [todayAttendance, setTodayAttendance] = useState<{
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: string;
    hasData: boolean;
  }>({
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    rate: '—',
    hasData: false,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [taskClasses, setTaskClasses] = useState<
    Array<{ name: string; studentCount: number; attendanceMarked: boolean }>
  >([]);
  const [assignmentCount, setAssignmentCount] = useState<number>(0);
  const [financeSummary, setFinanceSummary] = useState<{
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    collectionRate: number;
    hasData: boolean;
  }>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalBalance: 0,
    collectionRate: 0,
    hasData: false,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<
    Array<{ id: string; title: string; body: string; targetRole: string; authorName?: string; pinned?: boolean }>
  >([]);

  useEffect(() => {
    if (!organization || !currentSchool) return;

    const todayDate = new Date().toISOString().split('T')[0];

    let rawClassNames: string[] = [];
    let studentCountsByClass: Record<string, number> = {};
    let markedClassesToday = new Set<string>();

    const updateClassTasks = () => {
      const fallbackList = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
      const activeNames = rawClassNames.length > 0 ? rawClassNames : fallbackList;
      setTaskClasses(
        activeNames.map((name) => ({
          name,
          studentCount: studentCountsByClass[name] || 0,
          attendanceMarked: markedClassesToday.has(name) || markedClassesToday.has(name.replace(/\s+/g, '_')),
        }))
      );
    };

    const schoolBase = `organizations/${organization.id}/schools/${currentSchool.id}`;
    const studentsRef = collection(db, schoolBase, 'students');
    const staffRef = collection(db, schoolBase, 'staff');
    const classesRef = collection(db, schoolBase, 'classes');
    const attendanceRef = collection(db, schoolBase, 'attendance');
    const assignmentsRef = collection(db, schoolBase, 'assignments');
    const invoicesRef = collection(db, schoolBase, 'invoices');
    const announcementsRef = collection(db, schoolBase, 'announcements');

    // 1. Real Students Query
    const unsubStudents = onSnapshot(
      studentsRef,
      (snap) => {
        const realDocs = snap.docs.filter((d) => !isSampleLearner(d.data()));
        setStudentCount(realDocs.length);
        let m = 0;
        let f = 0;
        const counts: Record<string, number> = {};
        realDocs.forEach((d) => {
          const data = d.data();
          if (data.gender === 'male') m++;
          if (data.gender === 'female') f++;
          const cId = data.currentClassId;
          if (cId) counts[cId] = (counts[cId] || 0) + 1;
        });
        setGenderStats({ male: m, female: f });
        studentCountsByClass = counts;
        updateClassTasks();
        setLoadingStats(false);
      },
      (err) => console.error('Dashboard students count error:', err)
    );

    // 2. Real Staff Query
    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        setStaffCount(snap.size);
      },
      (err) => console.error('Dashboard staff count error:', err)
    );

    // 3. Real Classes Query
    const unsubClasses = onSnapshot(
      classesRef,
      (snap) => {
        setClassCount(snap.size);
        rawClassNames = snap.docs.map((d) => d.data().name as string).filter(Boolean);
        updateClassTasks();
      },
      (err) => console.error('Dashboard classes count error:', err)
    );

    // 4. Assignments Query
    const unsubAssignments = onSnapshot(
      assignmentsRef,
      (snap) => {
        setAssignmentCount(snap.size);
      },
      (err) => console.error('Dashboard assignments error:', err)
    );

    // 5. Today's Attendance Query
    const todayAttendanceQuery = query(attendanceRef, where('date', '==', todayDate));
    const unsubAttendance = onSnapshot(
      todayAttendanceQuery,
      (snap) => {
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        let totalExcused = 0;
        const markedSet = new Set<string>();

        snap.forEach((doc) => {
          const data = doc.data();
          if (data.classId) markedSet.add(data.classId);
          totalPresent += data.totalPresent || 0;
          totalAbsent += data.totalAbsent || 0;
          totalLate += data.totalLate || 0;
          totalExcused += data.totalExcused || 0;
        });

        markedClassesToday = markedSet;
        updateClassTasks();

        const totalEnrolledMarked = totalPresent + totalAbsent + totalLate + totalExcused;
        if (totalEnrolledMarked > 0) {
          const rate = ((totalPresent + totalLate) / totalEnrolledMarked) * 100;
          setTodayAttendance({
            present: totalPresent,
            absent: totalAbsent,
            late: totalLate,
            excused: totalExcused,
            rate: `${rate.toFixed(1)}%`,
            hasData: true,
          });
        } else {
          setTodayAttendance({
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            rate: '—',
            hasData: false,
          });
        }
      },
      (err) => console.error('Dashboard attendance listener error:', err)
    );

    // 6. Real Financial Invoices & Collection Ledger
    const unsubInvoices = onSnapshot(
      invoicesRef,
      (snap) => {
        let invoiced = 0;
        let paid = 0;
        let balance = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          invoiced += Number(data.totalAmount) || 0;
          paid += Number(data.paidAmount) || 0;
          balance += Number(data.balance) || 0;
        });
        const rate = invoiced > 0 ? Math.round((paid / invoiced) * 100) : 0;
        setFinanceSummary({
          totalInvoiced: invoiced,
          totalPaid: paid,
          totalBalance: balance,
          collectionRate: rate,
          hasData: snap.size > 0,
        });
      },
      (err) => console.error('Dashboard invoices error:', err)
    );

    // 7. Real Announcements Feed
    const unsubAnnouncements = onSnapshot(
      announcementsRef,
      (snap) => {
        const notices = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || 'School Notice',
          body: d.data().body || '',
          targetRole: d.data().targetRole || 'all',
          authorName: d.data().authorName || 'Office of the Principal',
          pinned: d.data().pinned || false,
        }));
        setRecentAnnouncements(notices.slice(0, 3));
      },
      (err) => console.error('Dashboard announcements error:', err)
    );

    return () => {
      unsubStudents();
      unsubStaff();
      unsubClasses();
      unsubAttendance();
      unsubAssignments();
      unsubInvoices();
      unsubAnnouncements();
    };
  }, [organization, currentSchool]);

  const curriculumLabels: Record<string, string> = {
    CBC: '🇰🇪 Kenya CBC (Competency-Based)',
    '8-4-4': '🇰🇪 Kenya 8-4-4 Classic',
    UNEB: '🇺🇬 Uganda UNEB (O & A Level)',
    NECTA: '🇹🇿 Tanzania NECTA',
    Rwanda: '🇷🇼 Rwanda Competence Curriculum',
    custom: 'International / Custom',
  };

  const formatKES = (num: number) => {
    return 'KES ' + num.toLocaleString('en-KE');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {isStudentUser ? (
        <div className="space-y-6 animate-fade-in">
          {/* Student Welcome Banner */}
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#1d5f99] via-[#683669] to-[#a5243d] p-5 sm:p-7 md:p-8 overflow-hidden shadow-xl sm:shadow-2xl text-white">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                    {studentProfile?.currentClassId || 'Enrolled Class'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-2xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    Active Learner
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
                  Jambo, {studentProfile?.firstName || currentUser?.displayName || 'Learner'} 👋
                </h1>
                <p className="text-xs sm:text-sm text-white/90">
                  Admission No:{' '}
                  <strong className="font-mono text-white">
                    {studentProfile?.admissionNumber || 'ADM-000'}
                  </strong>
                  {studentProfile?.currentStreamId ? ` • Stream: ${studentProfile.currentStreamId}` : ''}
                  {' • '}
                  {currentSchool?.name || 'Main Campus'} • Academic Year 2026
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => navigate('/assignments')}
                  leftIcon={<Sparkles className="w-4 h-4 text-white" />}
                  className="font-bold text-xs"
                >
                  My Assignments
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/timetable')}
                  leftIcon={<Clock className="w-4 h-4" />}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold border-white/30 text-xs"
                >
                  My Timetable
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/academics')}
                  leftIcon={<GraduationCap className="w-4 h-4" />}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold border-white/30 text-xs"
                >
                  My Grades &amp; Reports
                </Button>
              </div>
            </div>
          </div>

          {/* Student 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100 block">
                Class &amp; Stream
              </span>
              <p className="text-2xl font-black mt-1">
                {studentProfile?.currentClassId || 'Grade 4'}
              </p>
              <p className="text-2xs text-blue-100 mt-0.5 font-medium">
                {studentProfile?.currentStreamId || 'East'} Stream
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100 block">
                Learning Areas
              </span>
              <p className="text-2xl font-black mt-1">Core CBC</p>
              <p className="text-2xs text-emerald-100 mt-0.5 font-medium">
                Standard Kenyan Curriculum
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100 block">
                Assignments
              </span>
              <p className="text-2xl font-black mt-1">{assignmentCount}</p>
              <p className="text-2xs text-purple-100 mt-0.5 font-medium">
                Class homework &amp; tasks
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-100 block">
                School Status
              </span>
              <p className="text-2xl font-black mt-1">Cleared</p>
              <p className="text-2xs text-amber-100 mt-0.5 font-medium">Term 1 Session</p>
            </div>
          </div>

          {/* Student Main Hub: Notices & Quick Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Notices (2 cols) */}
            <Card className="lg:col-span-2 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-sm">
                      School Announcements &amp; Term Updates
                    </h3>
                    <p className="text-2xs text-slate-500">
                      Official notices broadcast to learners and parents
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {recentAnnouncements.length > 0 ? (
                  recentAnnouncements.map((notice) => (
                    <div
                      key={notice.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900">{notice.title}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                          {notice.targetRole}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{notice.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                    No active school notices at this time. Check back later for term updates.
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Student Navigation (1 col) */}
            <Card className="space-y-3">
              <h3 className="text-base font-display font-semibold text-gray-900 mb-2">
                My Student Tools
              </h3>

              <button
                onClick={() => navigate('/assignments')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">My Assignments</p>
                    <p className="text-2xs text-gray-500">Homework &amp; Quizzes</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/timetable')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Class Timetable</p>
                    <p className="text-2xs text-gray-500">Daily lesson schedule</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/academics')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Terminal Report Card</p>
                    <p className="text-2xs text-gray-500">Continuous assessments</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/library')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Library Books</p>
                    <p className="text-2xs text-gray-500">Borrowed volumes &amp; catalog</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/finance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Fee Statement &amp; Receipts</p>
                    <p className="text-2xs text-gray-500">M-Pesa payment records</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => navigate('/students')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">My Learner Profile</p>
                    <p className="text-2xs text-gray-500">Print Examination Card</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            </Card>
          </div>
        </div>
      ) : (
        <>
      {/* Top Welcome Banner (Master Spec Hero Card - Responsive for any mobile/tablet/desktop screen) */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#1d5f99] via-[#683669] to-[#a5243d] p-4 sm:p-6 md:p-8 overflow-hidden shadow-xl sm:shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 min-w-0">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Badges container: wraps cleanly on small screens, never overflows */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Badge
                variant="brand"
                dot
                size="sm"
                className="bg-white/15 text-white border-white/20 backdrop-blur-xs font-semibold text-2xs sm:text-xs"
              >
                {curriculumLabels[currentSchool?.curriculumType || 'CBC'] || 'East Africa Standard'}
              </Badge>
              {organization?.type === 'group' && (
                <Badge
                  variant="accent"
                  size="sm"
                  className="bg-white/15 text-white border-white/20 backdrop-blur-xs font-semibold text-2xs sm:text-xs"
                >
                  {schools.length} Campus Branches
                </Badge>
              )}
            </div>

            {/* Greeting: responsive sizing + break-words so long names fit seamlessly on phones */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white tracking-tight break-words leading-tight">
              Jambo, {currentUser?.displayName || 'Administrator'} 👋
            </h1>

            {/* Campus & Term Details: wrapped with min-w-0 */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-white/90 min-w-0">
              <span className="break-words">
                Active Campus:{' '}
                <strong className="font-semibold text-white">
                  {currentSchool?.name || 'Main Campus'}
                </strong>
              </span>
              <span className="text-white/40">•</span>
              <span className="text-white/85 whitespace-nowrap">
                Term 1 Academic Session
              </span>
            </div>
          </div>

          {/* Action Buttons: balanced grid on phone screens, inline on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0 pt-1 md:pt-0">
            {isBursarUser ? (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 shadow-sm font-bold active:scale-98 transition-transform cursor-pointer"
                  onClick={() => navigate('/finance')}
                  leftIcon={<CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                >
                  Post Payment
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 shadow-sm font-bold active:scale-98 transition-transform cursor-pointer"
                  onClick={() => navigate('/finance')}
                  leftIcon={<DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                >
                  Fee Register
                </Button>
              </>
            ) : isTeacherUser ? (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 shadow-sm font-bold active:scale-98 transition-transform cursor-pointer"
                  onClick={() => navigate('/attendance')}
                  leftIcon={<CalendarCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                >
                  Take Attendance
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 shadow-sm font-bold active:scale-98 transition-transform cursor-pointer"
                  onClick={() => navigate('/assignments')}
                  leftIcon={<BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                >
                  Class Tasks
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 shadow-sm font-bold active:scale-98 transition-transform cursor-pointer"
                  onClick={() => navigate('/attendance')}
                  leftIcon={<CalendarCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                >
                  Take Attendance
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 shadow-sm font-bold active:scale-98 transition-transform cursor-pointer"
                  onClick={() => navigate('/students')}
                  leftIcon={<UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                >
                  Enroll Student
                </Button>
              </>
            )}
            {studentCount === 0 && !isBursarUser && (
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 sm:col-span-1 w-full sm:w-auto justify-center text-xs sm:text-sm !py-2.5 sm:!py-2 bg-white/20 hover:bg-white/30 text-white border-white/30 font-bold active:scale-98 transition-transform cursor-pointer"
                onClick={() => navigate('/students')}
                leftIcon={<Users className="w-3.5 h-3.5 text-white shrink-0" />}
              >
                Learner Directory
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards - Fully responsive without clipped text on narrow screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
        <Card className="flex items-center justify-between !p-3 sm:!p-4 md:!p-5 min-w-0 hover:shadow-md transition-shadow">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
              Learners
            </p>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-0.5 truncate">
              {loadingStats ? '...' : studentCount}
            </h3>
            <p className="text-[10px] sm:text-xs text-accent-600 mt-0.5 flex items-center gap-1 font-medium truncate">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>
                {genderStats.male > 0 || genderStats.female > 0
                  ? `${genderStats.male}B • ${genderStats.female}G`
                  : 'Real-time'}
              </span>
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
            <Users className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between !p-3 sm:!p-4 md:!p-5 min-w-0 hover:shadow-md transition-shadow">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
              Attendance
            </p>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-accent-600 mt-0.5 truncate">
              {todayAttendance.rate}
            </h3>
            <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 font-medium flex items-center gap-1 flex-wrap">
              {todayAttendance.hasData ? (
                <>
                  <span className="text-emerald-700 font-bold whitespace-nowrap">{todayAttendance.present} In</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-rose-700 font-bold whitespace-nowrap">{todayAttendance.absent} Out</span>
                </>
              ) : (
                <span className="text-gray-500">Not marked yet</span>
              )}
            </div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-600 shrink-0">
            <CalendarCheck2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between !p-3 sm:!p-4 md:!p-5 min-w-0 hover:shadow-md transition-shadow">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
              Faculty / Staff
            </p>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-0.5 truncate">
              {loadingStats ? '...' : staffCount}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 font-medium truncate">
              {staffCount > 0 && studentCount > 0
                ? `${Math.round(studentCount / staffCount)}:1 Learner Ratio`
                : 'Active staff'}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-edumoPurple-500/10 border border-edumoPurple-500/20 flex items-center justify-center text-edumoPurple-500 shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between !p-3 sm:!p-4 md:!p-5 min-w-0 hover:shadow-md transition-shadow">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
              Classes
            </p>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-gray-900 mt-0.5 truncate">
              {loadingStats ? '...' : classCount}
            </h3>
            <p className="text-[10px] sm:text-xs text-brand-600 mt-0.5 font-medium truncate">
              Active streams
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center text-warning-600 shrink-0">
            <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </Card>
      </div>

      {/* Real Financial Overview & Notice Board Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* If Teacher: Academic Tasks Card. If Admin/Bursar: Term Financial Collections Card */}
        {isTeacherUser ? (
          <Card className="space-y-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">
                    Class Tasks &amp; Assessments
                  </h3>
                  <p className="text-2xs text-slate-500">Active homework and continuous evaluation</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => navigate('/assignments')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                All Tasks
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block">Assigned</span>
                <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                  {assignmentCount} Tasks
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100">
                <span className="text-2xs font-semibold text-purple-700 uppercase tracking-wider block">Classes</span>
                <p className="text-sm sm:text-base font-bold text-purple-800 mt-0.5">
                  {classCount} Active
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider block">Assessments</span>
                <p className="text-sm sm:text-base font-bold text-emerald-800 mt-0.5">
                  Continuous
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Ready to record continuous marks?</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => navigate('/academics')}
                className="text-xs font-bold"
                leftIcon={<GraduationCap className="w-4 h-4" />}
              >
                Enter Marks
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="space-y-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm">
                    Term 1 Fee Collections
                  </h3>
                  <p className="text-2xs text-slate-500">Live school revenue and fee clearance ledger</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => navigate('/finance')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Fee Register
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-2xs font-semibold text-slate-500 uppercase tracking-wider block">Invoiced</span>
                <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                  {formatKES(financeSummary.totalInvoiced || 0)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-2xs font-semibold text-emerald-700 uppercase tracking-wider block">Collected</span>
                <p className="text-sm sm:text-base font-bold text-emerald-800 mt-0.5">
                  {formatKES(financeSummary.totalPaid || 0)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                <span className="text-2xs font-semibold text-amber-700 uppercase tracking-wider block">Balance</span>
                <p className="text-sm sm:text-base font-bold text-amber-900 mt-0.5">
                  {formatKES(financeSummary.totalBalance || 0)}
                </p>
              </div>
            </div>

            {/* Collection Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-2xs font-semibold text-slate-600">
                <span>Term Collection Clearance</span>
                <span className="text-emerald-700 font-bold">
                  {financeSummary.collectionRate || 0}% Completed
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1d5f99] to-emerald-600 transition-all duration-700"
                  style={{ width: `${financeSummary.collectionRate || 0}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Live School Notice Board & Official Broadcasts Card */}
        <Card className="space-y-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Campus Bulletins &amp; Notices
                </h3>
                <p className="text-2xs text-slate-500">Official broadcasts to guardians and educators</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => navigate('/announcements')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Post Notice
            </Button>
          </div>

          <div className="space-y-2.5">
            {recentAnnouncements.length > 0 ? (
              recentAnnouncements.map((notice) => (
                <div
                  key={notice.id}
                  className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 truncate">{notice.title}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                      {notice.targetRole}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-600 line-clamp-2 leading-relaxed">{notice.body}</p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-500">
                No active announcements for this campus.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Teacher Task Tracker (Master Spec Section 1 & 7.H) */}
      <TeacherTaskTracker
        classes={taskClasses}
        assignmentCount={assignmentCount}
        todayDateStr={new Date().toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      />

      {/* Quick Action Hub & Multi-Branch Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (6 Real System Operations) */}
        <Card className="lg:col-span-1 space-y-3">
          <h3 className="text-base font-display font-semibold text-gray-900 mb-2">
            Operational Shortcuts
          </h3>

          <button
            onClick={() => navigate('/attendance')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-500/10 text-accent-600 flex items-center justify-center">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-accent-600">
                  Daily Attendance Register
                </p>
                <p className="text-2xs text-gray-500">1-tap fast mark (offline-ready)</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/students')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-500">
                  Learner Directory
                </p>
                <p className="text-2xs text-gray-500">Admissions & emergency contacts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/finance')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-emerald-600">
                  Fee Payments &amp; Invoices
                </p>
                <p className="text-2xs text-gray-500">Record receipts & balance clearances</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/academics')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600">
                  Assessment Marks &amp; Exams
                </p>
                <p className="text-2xs text-gray-500">CBC rubrics &amp; report cards</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/excel-import')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning-500/10 text-warning-600 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-warning-600">
                  Excel Bulk Import
                </p>
                <p className="text-2xs text-gray-500">Sanitized import with rollback</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/announcements')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-edumoPurple-500/10 text-edumoPurple-500 flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-edumoPurple-500">
                  Send Parent Notice
                </p>
                <p className="text-2xs text-gray-500">Broadcast via Push, SMS & Portal</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </Card>

        {/* Multi-Branch Campus Overview */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-display font-semibold text-gray-900">
                Campus Branches
              </h3>
              <p className="text-xs text-gray-500">
                Multi-branch status and configuration
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/branches')}
            >
              Manage Branches
            </Button>
          </div>

          <div className="space-y-3">
            {schools.map((branch) => {
              const isActive = branch.id === currentSchool?.id;
              return (
                <div
                  key={branch.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-brand-500/5 border-brand-500/30'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-brand-500 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {branch.name}
                        </h4>
                        {isActive && (
                          <Badge variant="brand" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xs text-gray-500 mt-0.5 truncate">
                        Code: {branch.code || 'MAIN'} • Level: {branch.type || 'Combined'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs pt-1 sm:pt-0">
                    <div>
                      <span className="text-2xs text-gray-500 block">Learners</span>
                      <span className="font-semibold text-gray-900">
                        {isActive ? studentCount : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xs text-gray-500 block">Today's Rate</span>
                      <span className="font-semibold text-accent-600">
                        {isActive ? todayAttendance.rate : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xs text-gray-500 block">Curriculum</span>
                      <Badge variant="neutral" size="sm">
                        {branch.curriculumType || 'CBC'}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      </>
      )}
    </div>
  );
};
