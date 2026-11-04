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
} from 'lucide-react';
import { TeacherTaskTracker } from '../components/dashboard/TeacherTaskTracker';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { organization, currentSchool, schools } = useTenant();
  const navigate = useNavigate();

  const [studentCount, setStudentCount] = useState<number>(0);
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

    const studentsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'students'
    );
    const staffRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'staff'
    );
    const classesRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'classes'
    );
    const attendanceRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'attendance'
    );
    const assignmentsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'assignments'
    );

    const unsubStudents = onSnapshot(
      studentsRef,
      (snap) => {
        setStudentCount(snap.size);
        const counts: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const cId = d.data().currentClassId;
          if (cId) counts[cId] = (counts[cId] || 0) + 1;
        });
        studentCountsByClass = counts;
        updateClassTasks();
        setLoadingStats(false);
      },
      (err) => console.error('Dashboard students count error:', err)
    );

    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        setStaffCount(snap.size);
      },
      (err) => console.error('Dashboard staff count error:', err)
    );

    const unsubClasses = onSnapshot(
      classesRef,
      (snap) => {
        setClassCount(snap.size);
        rawClassNames = snap.docs.map((d) => d.data().name as string).filter(Boolean);
        updateClassTasks();
      },
      (err) => console.error('Dashboard classes count error:', err)
    );

    const unsubAssignments = onSnapshot(
      assignmentsRef,
      (snap) => {
        setAssignmentCount(snap.size);
      },
      (err) => console.error('Dashboard assignments error:', err)
    );

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

    return () => {
      unsubStudents();
      unsubStaff();
      unsubClasses();
      unsubAttendance();
      unsubAssignments();
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

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#1d5f99] via-[#683669] to-[#a5243d] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="brand" dot>
                {curriculumLabels[currentSchool?.curriculumType || 'CBC'] || 'East Africa Standard'}
              </Badge>
              {organization?.type === 'group' && (
                <Badge variant="accent">
                  {schools.length} Campus Branches
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Jambo, {currentUser?.displayName || 'Administrator'} 👋
            </h1>
            <p className="text-sm text-white/80 mt-1">
              Active Campus:{' '}
              <span className="font-semibold text-white">
                {currentSchool?.name || 'Main Campus'}
              </span>{' '}
              — Term 1 Academic Session
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="accent"
              size="sm"
              onClick={() => navigate('/attendance')}
              leftIcon={<CalendarCheck2 className="w-4 h-4" />}
            >
              Take Attendance
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/students')}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Enroll Student
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Enrolled Learners
            </p>
            <h3 className="text-2xl font-display font-bold text-gray-900 mt-1">
              {loadingStats ? '...' : studentCount}
            </h3>
            <p className="text-2xs text-accent-600 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Real-time enrollment</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today's Attendance
            </p>
            <h3 className="text-2xl font-display font-bold text-accent-600 mt-1">
              {todayAttendance.rate}
            </h3>
            <p className="text-2xs text-gray-500 mt-1 font-medium">
              {todayAttendance.hasData
                ? `${todayAttendance.present} Present • ${todayAttendance.absent} Absent`
                : 'Not marked yet today'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center text-accent-600">
            <CalendarCheck2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Teaching & Staff
            </p>
            <h3 className="text-2xl font-display font-bold text-gray-900 mt-1">
              {loadingStats ? '...' : staffCount}
            </h3>
            <p className="text-2xs text-gray-500 mt-1 font-medium">
              Active registered staff
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-edumoPurple-500/10 border border-edumoPurple-500/20 flex items-center justify-center text-edumoPurple-500">
            <GraduationCap className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Active Classes
            </p>
            <h3 className="text-2xl font-display font-bold text-gray-900 mt-1">
              {loadingStats ? '...' : classCount}
            </h3>
            <p className="text-2xs text-brand-600 mt-1 font-medium">
              Configured class streams
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center text-warning-600">
            <Building2 className="w-6 h-6" />
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
        {/* Quick Actions */}
        <Card className="lg:col-span-1 space-y-3">
          <h3 className="text-base font-display font-semibold text-gray-900 mb-2">
            Quick Actions
          </h3>

          <button
            onClick={() => navigate('/attendance')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group"
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
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-500">
                  Learner Directory
                </p>
                <p className="text-2xs text-gray-500">Manage admissions & emergency contacts</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => navigate('/excel-import')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group"
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
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all text-left group"
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-brand-500">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {branch.name}
                        </h4>
                        {isActive && (
                          <Badge variant="brand" size="sm">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xs text-gray-500 mt-0.5">
                        Code: {branch.code || 'MAIN'} • Level: {branch.type || 'Combined'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
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
    </div>
  );
};
