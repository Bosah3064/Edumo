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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    if (!organization || !currentSchool) return;
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
      // Try callable first
      try {
        const markAttendanceFn = httpsCallable(functions, 'markAttendance');
        await markAttendanceFn({
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
        });
      } catch (callErr) {
        // Fallback to direct doc write if callable needs token refresh
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

        <div className="flex items-center gap-2">
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

      {/* Class and Date Selectors + Stats bar */}
      <Card className="grid grid-cols-1 md:grid-cols-4 gap-4 !p-4">
        <div>
          <label className="block text-2xs font-semibold uppercase text-gray-500 mb-1">
            Class Stream
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-white border border-surface-700 rounded-xl px-3 py-2 text-xs text-gray-900"
          >
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-2xs font-semibold uppercase text-gray-500 mb-1">
            Register Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-white border border-surface-700 rounded-xl px-3 py-2 text-xs text-gray-900"
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-around p-2 rounded-xl bg-white/60 border border-surface-800 text-center">
          <div>
            <span className="text-2xs text-accent-700 font-semibold block">Present</span>
            <span className="text-lg font-bold text-gray-900">{counts.present}</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <span className="text-2xs text-danger-700 font-semibold block">Absent</span>
            <span className="text-lg font-bold text-gray-900">{counts.absent}</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <span className="text-2xs text-warning-800 font-semibold block">Late</span>
            <span className="text-lg font-bold text-gray-900">{counts.late}</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <span className="text-2xs text-brand-700 font-semibold block">Excused</span>
            <span className="text-lg font-bold text-gray-900">{counts.excused}</span>
          </div>
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
          <div className="overflow-x-auto">
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
        )}
      </Card>
    </div>
  );
};
