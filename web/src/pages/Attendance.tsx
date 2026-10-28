import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import {
  CalendarCheck2,
  Check,
  X,
  Clock,
  Shield,
  Save,
  CheckCheck,
  WifiOff,
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

  const [selectedClass, setSelectedClass] = useState('Grade 4');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);

  // Student roster for selected class
  const [roster, setRoster] = useState<StudentAttendanceEntry[]>([
    { studentId: 'stud-1', admissionNo: 'ADM-001', name: 'Amina Kariuki', status: 'present' },
    { studentId: 'stud-2', admissionNo: 'ADM-002', name: 'Brian Omondi', status: 'present' },
    { studentId: 'stud-3', admissionNo: 'ADM-003', name: 'David Mwangi', status: 'present' },
    { studentId: 'stud-4', admissionNo: 'ADM-004', name: 'Faith Wanjiku', status: 'present' },
    { studentId: 'stud-5', admissionNo: 'ADM-005', name: 'Grace Mutua', status: 'present' },
    { studentId: 'stud-6', admissionNo: 'ADM-006', name: 'Hassan Abdi', status: 'present' },
    { studentId: 'stud-7', admissionNo: 'ADM-007', name: 'Ian Kiprop', status: 'absent' },
    { studentId: 'stud-8', admissionNo: 'ADM-008', name: 'Joy Chebet', status: 'present' },
    { studentId: 'stud-9', admissionNo: 'ADM-009', name: 'Kevin Mutiso', status: 'late' },
    { studentId: 'stud-10', admissionNo: 'ADM-010', name: 'Lucy Njeri', status: 'present' },
  ]);

  // Load existing attendance record for this date + class if exists
  useEffect(() => {
    if (!organization || !currentSchool) return;

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
          setRoster((prev) =>
            prev.map((student) => ({
              ...student,
              status: entries[student.studentId]?.status || student.status,
            }))
          );
        }
      })
      .catch((err) => {
        // Likely offline or new record; keep local roster
        console.warn('Attendance load fallback:', err);
      });
  }, [organization, currentSchool, selectedDate, selectedClass]);

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
    const entriesMap: Record<string, { status: string; markedAt: number }> = {};
    roster.forEach((student) => {
      entriesMap[student.studentId] = {
        status: student.status,
        markedAt: Date.now(),
      };
    });

    const payload = {
      date: selectedDate,
      type: 'daily',
      classId: selectedClass,
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
      // Offline queue save
      queueOfflineAction('SAVE_ATTENDANCE', {
        recordId,
        orgId: organization.id,
        schoolId: currentSchool.id,
        ...payload,
      });
      toast.success('Attendance saved locally! Will sync when connection is restored.', {
        icon: '💾',
      });
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
        'attendance',
        recordId
      );
      await setDoc(docRef, payload, { merge: true });
      toast.success('Attendance register submitted successfully!');
    } catch (err: unknown) {
      console.error('Attendance write error:', err);
      // Fallback queue
      queueOfflineAction('SAVE_ATTENDANCE', {
        recordId,
        orgId: organization.id,
        schoolId: currentSchool.id,
        ...payload,
      });
      toast.success('Saved to offline storage (will retry sync)', { icon: '💾' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Daily Attendance Register
            </h1>
            {!isOnline && (
              <Badge variant="warning" size="sm" dot>
                Offline Storage Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-surface-400 mt-1">
            Fast tap-to-mark daily attendance for {currentSchool?.name || 'Main Campus'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAllStatus('present')}
            leftIcon={<CheckCheck className="w-4 h-4 text-accent-400" />}
          >
            Mark All Present
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
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
          <label className="block text-2xs font-semibold uppercase text-surface-400 mb-1">
            Class Stream
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="Grade 1">Grade 1 - CBC</option>
            <option value="Grade 2">Grade 2 - CBC</option>
            <option value="Grade 3">Grade 3 - CBC</option>
            <option value="Grade 4">Grade 4 - CBC East</option>
            <option value="Grade 5">Grade 5 - CBC</option>
            <option value="Grade 6">Grade 6 - CBC</option>
            <option value="Form 1">Form 1 - Secondary</option>
          </select>
        </div>

        <div>
          <label className="block text-2xs font-semibold uppercase text-surface-400 mb-1">
            Register Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-xs text-white"
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-around p-2 rounded-xl bg-surface-900/60 border border-surface-800 text-center">
          <div>
            <span className="text-2xs text-accent-400 font-semibold block">Present</span>
            <span className="text-lg font-bold text-white">{counts.present}</span>
          </div>
          <div className="w-px h-8 bg-surface-800" />
          <div>
            <span className="text-2xs text-danger-400 font-semibold block">Absent</span>
            <span className="text-lg font-bold text-white">{counts.absent}</span>
          </div>
          <div className="w-px h-8 bg-surface-800" />
          <div>
            <span className="text-2xs text-warning-400 font-semibold block">Late</span>
            <span className="text-lg font-bold text-white">{counts.late}</span>
          </div>
          <div className="w-px h-8 bg-surface-800" />
          <div>
            <span className="text-2xs text-brand-400 font-semibold block">Excused</span>
            <span className="text-lg font-bold text-white">{counts.excused}</span>
          </div>
        </div>
      </Card>

      {/* Roster List */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-800 bg-surface-900/60 text-surface-400 uppercase tracking-wider text-2xs font-semibold">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Learner Name</th>
                <th className="py-3 px-4">Admission No.</th>
                <th className="py-3 px-4 text-center">Quick Tap Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {roster.map((student, idx) => (
                <tr key={student.studentId} className="hover:bg-surface-800/30 transition-colors">
                  <td className="py-3 px-4 text-surface-500 font-mono text-2xs">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-white">{student.name}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-surface-400">
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
                            : 'bg-surface-800 text-surface-400 hover:text-white'
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
                            : 'bg-surface-800 text-surface-400 hover:text-white'
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
                            : 'bg-surface-800 text-surface-400 hover:text-white'
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
                            : 'bg-surface-800 text-surface-400 hover:text-white'
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
      </Card>
    </div>
  );
};
