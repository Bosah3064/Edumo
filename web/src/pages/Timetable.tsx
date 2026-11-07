import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  BookOpen,
  Building,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  periodNumber: number;
  timeRange: string;
  className: string;
  subjectName: string;
  teacherName: string;
  roomName: string;
}

export const Timetable: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [selectedClass, setSelectedClass] = useState('Grade 4');
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Lesson Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [day, setDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [subjectName, setSubjectName] = useState('Mathematics');
  const [teacherName, setTeacherName] = useState('Mr. Peter Kamau');
  const [roomName, setRoomName] = useState('Room 4B');

  // Substitution Modal
  const [substituteSlot, setSubstituteSlot] = useState<TimetableSlot | null>(null);
  const [substituteTeacher, setSubstituteTeacher] = useState('');

  const days: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'> = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ];

  const periods = [
    { number: 1, time: '08:00 - 08:45' },
    { number: 2, time: '08:45 - 09:30' },
    { number: 3, time: '09:30 - 10:15' },
    { number: 4, time: '10:45 - 11:30' },
    { number: 5, time: '11:30 - 12:15' },
    { number: 6, time: '12:15 - 13:00' },
    { number: 7, time: '14:00 - 14:45' },
  ];

  // Real-time school classes from Firestore
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);

  // 1. Listen to real-time classes for class selector
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
      const list = snap.docs.map((d) => d.data().name as string).filter(Boolean);
      list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      setSchoolClasses(list);
      if (list.length > 0 && !list.includes(selectedClass)) {
        setSelectedClass(list[0]);
      }
    });

    return () => unsubClasses();
  }, [organization, currentSchool]);

  // 2. Listen to staff for teacher dropdown
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const staffRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'staff'
    );

    const unsubStaff = onSnapshot(staffRef, (snap) => {
      const names = snap.docs
        .map((d) => {
          const data = d.data();
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
          return (data.name || fullName || data.fullName || '') as string;
        })
        .filter(Boolean);

      setStaffNames(names);
      if (names.length > 0 && !teacherName) setTeacherName(names[0]);
    });

    return () => unsubStaff();
  }, [organization, currentSchool]);

  // 3. Listen to real-time timetable slots
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const timetableRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'timetables'
    );

    const unsubTimetable = onSnapshot(timetableRef, (snap) => {
      const slots: TimetableSlot[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TimetableSlot, 'id'>),
      }));

      setTimetableSlots(slots);
      setLoading(false);
    });

    return () => unsubTimetable();
  }, [organization, currentSchool]);

  // Clash Detection Logic:
  // Detects if the same teacher or room is booked in two different classes at the same day & period
  const findClashes = () => {
    const clashes: Array<{ slotA: TimetableSlot; slotB: TimetableSlot; type: 'teacher' | 'room' }> = [];

    for (let i = 0; i < timetableSlots.length; i++) {
      for (let j = i + 1; j < timetableSlots.length; j++) {
        const a = timetableSlots[i];
        const b = timetableSlots[j];

        if (a.day === b.day && a.periodNumber === b.periodNumber) {
          if (a.teacherName === b.teacherName && a.className !== b.className) {
            clashes.push({ slotA: a, slotB: b, type: 'teacher' });
          } else if (a.roomName === b.roomName && a.className !== b.className) {
            clashes.push({ slotA: a, slotB: b, type: 'room' });
          }
        }
      }
    }
    return clashes;
  };

  const activeClashes = findClashes();

  const handleAssignLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    // Check potential clash before saving
    const existingSlotSameTime = timetableSlots.find(
      (s) =>
        s.day === day &&
        s.periodNumber === periodNumber &&
        s.teacherName === teacherName &&
        s.className !== selectedClass
    );

    if (existingSlotSameTime) {
      if (!window.confirm(`⚠️ Teacher Clash Warning: ${teacherName} is already assigned to ${existingSlotSameTime.className} at ${day} Period ${periodNumber}. Proceed anyway?`)) {
        return;
      }
    }

    const toastId = toast.loading('Scheduling lesson slot...');
    const slotId = `${selectedClass}_${day}_p${periodNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timeRange = periods.find((p) => p.number === periodNumber)?.time || '08:00 - 08:45';

    const newSlot: TimetableSlot = {
      id: slotId,
      day,
      periodNumber,
      timeRange,
      className: selectedClass,
      subjectName,
      teacherName,
      roomName,
    };

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'timetables',
        slotId
      );
      await setDoc(docRef, { ...newSlot, updatedAt: serverTimestamp() });
      toast.success('Lesson scheduled successfully!', { id: toastId });
      setIsAssignModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule lesson slot', { id: toastId });
    }
  };

  const handleSubstitute = async () => {
    if (!organization || !currentSchool || !substituteSlot || !substituteTeacher) return;

    const toastId = toast.loading('Assigning substitute educator...');
    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'timetables',
        substituteSlot.id
      );

      await setDoc(
        docRef,
        {
          teacherName: substituteTeacher,
          originalTeacher: substituteSlot.teacherName,
          substitutedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success(`Substitute teacher ${substituteTeacher} assigned!`, { id: toastId });
      setSubstituteSlot(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign substitute', { id: toastId });
    }
  };

  // Metrics
  const classSlots = timetableSlots.filter((s) => s.className === selectedClass);
  const totalWeeklyPeriods = 35; // 7 periods * 5 days
  const scheduledCount = classSlots.length;
  const coveragePercent = Math.round((scheduledCount / totalWeeklyPeriods) * 100);
  const uniqueTeachersCount = new Set(classSlots.map((s) => s.teacherName).filter(Boolean)).size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-black text-gray-900 tracking-tight">
              Academic Timetable &amp; Relief Substitution
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Automated clash detection, room mapping, and teacher relief substitution for <strong>{currentSchool?.name || 'Main Campus'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAssignModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm font-bold"
          >
            Assign Lesson
          </Button>
        </div>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Scheduled Lessons */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Scheduled Lessons
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{scheduledCount}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              Active periods for {selectedClass}
            </p>
          </div>
        </div>

        {/* Card 2: Weekly Coverage */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Weekly Timetable Fill
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{coveragePercent}%</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              {scheduledCount} of {totalWeeklyPeriods} weekly periods assigned
            </p>
          </div>
        </div>

        {/* Card 3: Teaching Staff */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Faculty Deployed
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{uniqueTeachersCount}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              Instructors teaching {selectedClass}
            </p>
          </div>
        </div>

        {/* Card 4: Clash Status */}
        <div
          className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md ${
            activeClashes.length > 0
              ? 'bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700'
              : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-white/80">
              Schedule Health
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">
              {activeClashes.length === 0 ? '0 Clashes' : `${activeClashes.length} Conflict(s)`}
            </div>
            <p className="text-xs text-white/90 mt-1 font-medium">
              {activeClashes.length === 0 ? 'Optimal collision-free grid' : 'Action required: overlapping slots'}
            </p>
          </div>
        </div>
      </div>

      {/* Clash Alert Banner */}
      {activeClashes.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{activeClashes.length} Schedule Clash Detected!</span>
          </div>
          <p className="text-2xs text-amber-700">
            The following educators or rooms are double-booked at the exact same period across multiple classes:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-2xs font-medium">
            {activeClashes.map((c, idx) => (
              <li key={idx}>
                <strong>{c.type === 'teacher' ? c.slotA.teacherName : c.slotA.roomName}</strong> is
                conflicted on <strong>{c.slotA.day} Period {c.slotA.periodNumber}</strong> between{' '}
                <em>{c.slotA.className} ({c.slotA.subjectName})</em> and{' '}
                <em>{c.slotB.className} ({c.slotB.subjectName})</em>.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Class Selector Bar */}
      <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-brand-600 shrink-0" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Viewing Timetable for:
          </span>
        </div>

        <div className="w-full sm:w-64">
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={
              schoolClasses.length > 0
                ? schoolClasses.map((c) => ({ value: c, label: c }))
                : [
                    'PP1', 'PP2',
                    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
                    'Form 1', 'Form 2', 'Form 3', 'Form 4',
                  ].map((c) => ({ value: c, label: c }))
            }
          />
        </div>
      </Card>

      {/* Weekly Grid */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-bold uppercase text-2xs">
              <th className="py-3 px-3 w-28 text-center border-r border-gray-200">Period / Time</th>
              {days.map((d) => (
                <th key={d} className="py-3 px-3 text-center border-r border-gray-200 last:border-r-0">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {periods.map((p) => (
              <tr key={p.number} className="hover:bg-gray-50/50">
                <td className="py-3 px-3 text-center font-mono border-r border-gray-200 bg-gray-50/70">
                  <span className="font-bold block text-gray-900">Period {p.number}</span>
                  <span className="text-[10px] text-gray-400">{p.time}</span>
                </td>

                {days.map((d) => {
                  const slot = timetableSlots.find(
                    (s) => s.className === selectedClass && s.day === d && s.periodNumber === p.number
                  );

                  return (
                    <td
                      key={d}
                      className="py-2.5 px-2.5 border-r border-gray-200 last:border-r-0 align-top h-24"
                    >
                      {slot ? (
                        <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition space-y-1 h-full flex flex-col justify-between">
                          <div>
                            <span className="font-bold text-gray-900 block leading-tight">
                              {slot.subjectName}
                            </span>
                            <span className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                              <UserCheck className="w-3 h-3 text-blue-600" />
                              {slot.teacherName}
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              📍 {slot.roomName}
                            </span>
                          </div>

                          <div className="pt-1 border-t border-blue-100 flex justify-end">
                            <button
                              onClick={() => {
                                setSubstituteSlot(slot);
                                setSubstituteTeacher('');
                              }}
                              className="text-[10px] text-brand-700 hover:text-brand-900 font-semibold"
                            >
                              Substitute
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setDay(d);
                            setPeriodNumber(p.number);
                            setIsAssignModalOpen(true);
                          }}
                          className="h-full border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 hover:border-brand-400 hover:text-brand-600 cursor-pointer transition text-2xs font-medium"
                        >
                          + Assign
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Lesson Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Schedule Classroom Lesson Slot"
        maxWidth="md"
      >
        <form onSubmit={handleAssignLesson} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Day of Week"
              value={day}
              onChange={(e) => setDay(e.target.value as any)}
              options={days.map((d) => ({ value: d, label: d }))}
            />
            <Select
              label="Period Slot"
              value={String(periodNumber)}
              onChange={(e) => setPeriodNumber(Number(e.target.value))}
              options={periods.map((p) => ({ value: String(p.number), label: `P${p.number} (${p.time})` }))}
            />
          </div>

          <Select
            label="Subject / Learning Area"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            options={[
              'Mathematics',
              'English Language',
              'Kiswahili',
              'Integrated Science',
              'Social Studies',
              'Christian Religious Education (CRE)',
              'Agriculture & Nutrition',
              'Creative Arts & Sports',
              'Pre-Technical Studies',
            ].map((s) => ({ value: s, label: s }))}
          />

          <Select
            label="Assigned Educator"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            options={staffNames.map((s) => ({ value: s, label: s }))}
          />

          <Input
            label="Assigned Room / Venue"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="e.g. Room 4B, Lab 1, Field"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Teacher Relief Substitution Modal */}
      {substituteSlot && (
        <Modal
          isOpen={Boolean(substituteSlot)}
          onClose={() => setSubstituteSlot(null)}
          title="Assign Teacher Relief Substitution"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-2xs text-gray-400 uppercase font-semibold">Lesson Details:</span>
              <p className="font-bold text-gray-900 text-sm">
                {substituteSlot.subjectName} ({substituteSlot.className})
              </p>
              <p className="text-gray-600">
                {substituteSlot.day} • Period {substituteSlot.periodNumber} ({substituteSlot.timeRange})
              </p>
              <p className="text-gray-500">Regular Teacher: {substituteSlot.teacherName}</p>
            </div>

            <Select
              label="Select Available Substitute Educator"
              value={substituteTeacher}
              onChange={(e) => setSubstituteTeacher(e.target.value)}
              options={[
                { value: '', label: '— Choose Available Staff Member —' },
                ...staffNames
                  .filter((name) => name !== substituteSlot.teacherName)
                  .map((s) => ({ value: s, label: s })),
              ]}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setSubstituteSlot(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!substituteTeacher}
                onClick={handleSubstitute}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Assign Relief Teacher
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

