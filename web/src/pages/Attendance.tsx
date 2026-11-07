import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Check,
  X,
  Clock,
  Shield,
  Save,
  CheckCheck,
  Users,
  Download,
  XCircle,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportAttendanceRegister } from '../utils/excelExport';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendanceEntry {
  studentId: string;
  admissionNo: string;
  name: string;
  status: AttendanceStatus;
}

export const Attendance: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();
  const { isOnline, queueOfflineAction } = useOffline();

  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('Grade 4');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [allStudents, setAllStudents] = useState<Array<{
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    currentClassId?: string;
  }>>([]);

  // Student roster for selected class
  const [roster, setRoster] = useState<StudentAttendanceEntry[]>([]);

  // 1. Listen to real-time classes in school
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

    const unsubClasses = onSnapshot(classesRef, (snap) => {
      const classNames = snap.docs.map((d) => d.data().name as string).filter(Boolean);
      if (classNames.length > 0) {
        setAvailableClasses((prev) => Array.from(new Set([...prev, ...classNames])));
      }
    });

    return () => unsubClasses();
  }, [organization, currentSchool]);

  // 2. Listen to real-time students in school
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
      const studentsList = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          admissionNumber: data.admissionNumber || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          currentClassId: data.currentClassId || 'Grade 4',
        };
      });
      setAllStudents(studentsList);

      // Extract all student classes to enrich class dropdown
      const studentClasses = studentsList
        .map((s) => s.currentClassId)
        .filter((c): c is string => Boolean(c));

      setAvailableClasses((prev) => {
        const combined = Array.from(new Set([...prev, ...studentClasses]));
        const defaults = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Form 1'];
        return combined.length > 0 ? combined : defaults;
      });
    });

    return () => unsubStudents();
  }, [organization, currentSchool]);

  // 3. Update roster when selected class or students change
  useEffect(() => {
    const classStudents = allStudents.filter(
      (s) => (s.currentClassId || 'Grade 4') === selectedClass
    );

    const initialRoster: StudentAttendanceEntry[] = classStudents.map((s) => ({
      studentId: s.id,
      admissionNo: s.admissionNumber || '—',
      name: `${s.firstName} ${s.lastName}`.trim() || 'Learner',
      status: 'present',
    }));

    if (!organization || !currentSchool) {
      setRoster(initialRoster);
      return;
    }

    // Check if an attendance doc exists for this date and class
    const recordId = `${selectedDate}_${selectedClass.replace(/\s+/g, '_')}`;
    const docRef = doc(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'attendance',
      recordId
    );

    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const entries = data.entries || {};
          setRoster(
            initialRoster.map((student) => ({
              ...student,
              status: entries[student.studentId]?.status || 'present',
            }))
          );
        } else {
          setRoster(initialRoster);
        }
      })
      .catch((err) => {
        console.warn('Attendance load fallback:', err);
        setRoster(initialRoster);
      });
  }, [organization, currentSchool, selectedDate, selectedClass, allStudents]);

  const setAllStatus = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((s) => ({ ...s, status })));
    toast.success(`Marked all students as ${status}`, { id: 'bulk-mark' });
  };

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const counts = {
    present: roster.filter((r) => r.status === 'present').length,
    absent: roster.filter((r) => r.status === 'absent').length,
    late: roster.filter((r) => r.status === 'late').length,
    excused: roster.filter((r) => r.status === 'excused').length,
  };

  const handleSave = async () => {
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected. Please choose a school first.');
      return;
    }
    if (roster.length === 0) {
      toast.error('No learners in this class to mark attendance for.');
      return;
    }
    setSaving(true);

    const recordId = `${selectedDate}_${selectedClass.replace(/\s+/g, '_')}`;
    const entriesMap: Record<string, { status: AttendanceStatus; markedAt?: number }> = {};
    roster.forEach((student) => {
      entriesMap[student.studentId] = {
        status: student.status,
        markedAt: Date.now(),
      };
    });

    const payload = {
      orgId: organization.id,
      schoolId: currentSchool.id,
      classId: selectedClass,
      date: selectedDate,
      type: 'daily' as const,
      termId: 'Term 1',
      academicYearId: '2026',
      entries: entriesMap,
      totalPresent: counts.present,
      totalAbsent: counts.absent,
      totalLate: counts.late,
      totalExcused: counts.excused,
      markedBy: currentUser?.uid || 'teacher-offline',
      markedAt: serverTimestamp(),
      syncedFromOffline: !isOnline,
    };

    if (!isOnline) {
      queueOfflineAction('SAVE_ATTENDANCE', {
        recordId,
        ...payload,
      });
      toast.success('Attendance saved locally! Will sync when connection is restored.', {
        icon: '💾',
      });
      setSaving(false);
      return;
    }

    try {
      // 1. Direct resilient Firestore setDoc write (zero CORS errors on GitHub Pages/custom domains, instant local offline cache)
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'attendance',
        recordId
      );
      await setDoc(docRef, payload, { merge: true });

      // 2. Non-blocking background sync notification if online (swallows CORS/network errors gracefully)
      try {
        const markAttendanceFn = httpsCallable(functions, 'markAttendance');
        markAttendanceFn({
          orgId: organization.id,
          schoolId: currentSchool.id,
          classId: selectedClass,
          date: selectedDate,
          type: 'daily',
          termId: 'Term 1',
          academicYearId: '2026',
          entries: Object.fromEntries(
            Object.entries(entriesMap).map(([id, val]) => [id, { status: val.status }])
          ),
        }).catch((fnErr) => {
          console.debug('Background attendance callable notification skipped:', fnErr);
        });
      } catch {
        // Non-blocking
      }

      toast.success('Attendance register submitted successfully!');
    } catch (err: unknown) {
      console.error('Attendance write error:', err);
      queueOfflineAction('SAVE_ATTENDANCE', {
        recordId,
        ...payload,
      });
      toast.success('Saved to offline storage (will retry sync)', { icon: '💾' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportRegister = async () => {
    if (!currentSchool) return;
    if (roster.length === 0) {
      toast.error('No learners in this class register to export');
      return;
    }
    setExportingExcel(true);
    const toastId = toast.loading('Exporting Attendance Register (.xlsx)...');
    try {
      await exportAttendanceRegister(
        currentSchool.name,
        selectedClass,
        selectedDate,
        roster.map((r) => ({
          admissionNo: r.admissionNo,
          name: r.name,
          status: r.status,
        }))
      );
      toast.success('Attendance Register exported (.xlsx)!', { id: toastId });
    } catch (err) {
      console.error('Attendance export error:', err);
      toast.error('Failed to export Attendance Register', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  const classOptions = availableClasses.length > 0
    ? availableClasses
    : ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Form 1'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
              Daily Attendance Register
            </h1>
            {!isOnline && (
              <Badge variant="warning" size="sm" dot>
                Offline Storage Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fast tap-to-mark daily attendance for {currentSchool?.name || 'Main Campus'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportRegister}
            disabled={roster.length === 0}
            isLoading={exportingExcel}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Register (.xlsx)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAllStatus('present')}
            disabled={roster.length === 0}
            leftIcon={<CheckCheck className="w-4 h-4 text-accent-700" />}
          >
            Mark All Present
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={roster.length === 0}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Register
          </Button>
        </div>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Present */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Present Today
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <CheckCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{counts.present}</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              {roster.length > 0 ? `${Math.round((counts.present / roster.length) * 100)}% attendance rate` : 'Class attendance'}
            </p>
          </div>
        </div>

        {/* Card 2: Absent */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-rose-100">
              Absent
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <XCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{counts.absent}</div>
            <p className="text-xs text-rose-100 mt-1 font-medium">
              Unexcused learner absence
            </p>
          </div>
        </div>

        {/* Card 3: Late */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-100">
              Late Arrivals
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{counts.late}</div>
            <p className="text-xs text-amber-100 mt-1 font-medium">
              Tardy check-ins recorded
            </p>
          </div>
        </div>

        {/* Card 4: Excused */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Excused / Medical
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{counts.excused}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              Official parent permission
            </p>
          </div>
        </div>
      </div>

      {/* Class and Date Selectors */}
      <Card className="grid grid-cols-1 sm:grid-cols-2 gap-4 !p-4 bg-white/90">
        <div>
          <label className="block text-2xs font-bold uppercase text-gray-500 mb-1">
            Class Stream
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-white border border-surface-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900"
          >
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-2xs font-bold uppercase text-gray-500 mb-1">
            Register Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-white border border-surface-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900"
          />
        </div>
      </Card>

      {/* Roster List */}
      <Card className="!p-0 overflow-hidden">
        {roster.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              No learners found in {selectedClass}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Enroll learners into this class in the Learner Directory to take their attendance.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Touch-Optimized Cards (sm:hidden) */}
            <div className="sm:hidden divide-y divide-gray-100">
              {roster.map((student, idx) => (
                <div key={student.studentId} className="p-3 bg-white hover:bg-gray-50/80 transition space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono text-2xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-gray-900 text-xs truncate">{student.name}</p>
                        <p className="font-mono text-2xs text-gray-400">{student.admissionNo}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                        student.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : student.status === 'absent'
                          ? 'bg-rose-100 text-rose-800'
                          : student.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {student.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => updateStudentStatus(student.studentId, 'present')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
                        student.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStudentStatus(student.studentId, 'absent')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
                        student.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStudentStatus(student.studentId, 'late')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
                        student.status === 'late'
                          ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Late</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStudentStatus(student.studentId, 'excused')}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 ${
                        student.status === 'excused'
                          ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Excused</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden on sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-surface-800 bg-white/60 text-gray-500 uppercase tracking-wider text-2xs font-semibold">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Learner Name</th>
                    <th className="py-3 px-4">Admission No.</th>
                    <th className="py-3 px-4 text-center">Quick Tap Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {roster.map((student, idx) => (
                    <tr key={student.studentId} className="hover:bg-gray-100/30 transition-colors">
                      <td className="py-3 px-4 text-gray-600 font-mono text-2xs">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900">{student.name}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-500">
                        {student.admissionNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => updateStudentStatus(student.studentId, 'present')}
                            className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all flex items-center gap-1 ${
                              student.status === 'present'
                                ? 'bg-accent-600 text-white shadow-md shadow-accent-600/25 ring-2 ring-accent-400'
                                : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStudentStatus(student.studentId, 'absent')}
                            className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all flex items-center gap-1 ${
                              student.status === 'absent'
                                ? 'bg-danger-600 text-white shadow-md shadow-danger-600/25 ring-2 ring-danger-400'
                                : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStudentStatus(student.studentId, 'late')}
                            className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all flex items-center gap-1 ${
                              student.status === 'late'
                                ? 'bg-warning-600 text-white shadow-md shadow-warning-600/25 ring-2 ring-warning-400'
                                : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Late</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStudentStatus(student.studentId, 'excused')}
                            className={`px-3 py-1.5 rounded-xl font-medium text-xs transition-all flex items-center gap-1 ${
                              student.status === 'excused'
                                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-2 ring-brand-400'
                                : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Excused</span>
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
    </div>
  );
};
