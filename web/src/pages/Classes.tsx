import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  BookOpen,
  Plus,
  Users,
  Layers,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
  GraduationCap,
  Search,
  Filter,
  Check,
  Tag,
  FolderTree,
  Pencil,
  X,
  UserCheck,
  ChevronRight,
  TrendingUp,
  School,
  Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Subject } from '@edumo/shared';

export interface StreamDetail {
  id: string;
  name: string;
  classTeacher?: string;
  capacity?: number;
  enrolled?: number;
}

export interface ClassItem {
  id: string;
  name: string;
  level: string;
  streams: string[];
  streamDetails?: StreamDetail[];
  classTeacher: string;
  capacity: number;
  enrolled: number;
  learningAreas: string[];
}

interface StaffOption {
  id: string;
  name: string;
  roleTitle?: string;
}

const LEVEL_COLORS: Record<string, { badge: string; border: string; bg: string }> = {
  'Early Years': { badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/20' },
  'Pre-Primary': { badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/20' },
  'Lower Primary': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-200', bg: 'bg-emerald-50/20' },
  'Upper Primary': { badge: 'bg-sky-50 text-sky-700 border-sky-200', border: 'border-sky-200', bg: 'bg-sky-50/20' },
  'Junior School': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-200', bg: 'bg-indigo-50/20' },
  'Junior Secondary': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-200', bg: 'bg-indigo-50/20' },
  'Senior School': { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-200', bg: 'bg-amber-50/20' },
  'Secondary': { badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-200', bg: 'bg-amber-50/20' },
  'Cambridge Stage': { badge: 'bg-purple-50 text-purple-700 border-purple-200', border: 'border-purple-200', bg: 'bg-purple-50/20' },
};

export const Classes: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  // Active view tab: 'classes' | 'units'
  const [activeTab, setActiveTab] = useState<'classes' | 'units'>('classes');

  // Classes State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [studentCountsByClass, setStudentCountsByClass] = useState<Record<string, number>>({});
  const [studentCountsByStream, setStudentCountsByStream] = useState<Record<string, number>>({});

  // Real Staff State for teacher assignments
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  // Add Class Modal State
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newLevel, setNewLevel] = useState('Lower Primary');
  const [streamList, setStreamList] = useState<string[]>(['East', 'West']);
  const [singleStreamInput, setSingleStreamInput] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [assignedClassTeacher, setAssignedClassTeacher] = useState('Unassigned');
  const [savingClass, setSavingClass] = useState(false);

  // Edit Class Modal State
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editCapacity, setEditCapacity] = useState('40');
  const [editClassTeacher, setEditClassTeacher] = useState('Unassigned');
  const [savingEditClass, setSavingEditClass] = useState(false);

  // Manage Streams Modal State
  const [managingStreamsClass, setManagingStreamsClass] = useState<ClassItem | null>(null);
  const [streamDetailDrafts, setStreamDetailDrafts] = useState<StreamDetail[]>([]);
  const [newStreamDraftName, setNewStreamDraftName] = useState('');
  const [savingStreams, setSavingStreams] = useState(false);

  // Units / Subjects State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState<'all' | 'mandatory' | 'optional'>('all');
  const [unitDeptFilter, setUnitDeptFilter] = useState('all');

  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitCode, setUnitCode] = useState('');
  const [unitDepartment, setUnitDepartment] = useState('Sciences & Tech');
  const [unitIsMandatory, setUnitIsMandatory] = useState<boolean>(true);
  const [unitWeeklyPeriods, setUnitWeeklyPeriods] = useState('5');
  const [unitTeacher, setUnitTeacher] = useState('Departmental Staff');
  const [savingUnit, setSavingUnit] = useState(false);
  const [seedingCurriculum, setSeedingCurriculum] = useState(false);
  const [newUnitClasses, setNewUnitClasses] = useState<string[]>(['all']);

  // Manage Class Units Modal State
  const [managingUnitsForClass, setManagingUnitsForClass] = useState<ClassItem | null>(null);
  const [classUnitsSelection, setClassUnitsSelection] = useState<string[]>([]);
  const [savingClassUnits, setSavingClassUnits] = useState(false);
  const [classUnitSearch, setClassUnitSearch] = useState('');
  const [isAddUnitForClassOpen, setIsAddUnitForClassOpen] = useState(false);

  // Edit Unit Modal State
  const [editingUnit, setEditingUnit] = useState<Subject | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editUnitDepartment, setEditUnitDepartment] = useState('Sciences & Tech');
  const [editUnitIsMandatory, setEditUnitIsMandatory] = useState(true);
  const [editUnitWeeklyPeriods, setEditUnitWeeklyPeriods] = useState('4');
  const [editUnitTeacher, setEditUnitTeacher] = useState('Departmental Staff');
  const [editUnitClasses, setEditUnitClasses] = useState<string[]>(['all']);
  const [savingEditUnit, setSavingEditUnit] = useState(false);

  // Search filter for classes
  const [classSearch, setClassSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  // 1. Listen to real-time staff in Firestore for real teacher assignment
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

    const unsubStaff = onSnapshot(
      staffRef,
      (snap) => {
        const staffList: StaffOption[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || data.fullName || 'Staff Member',
            roleTitle: data.roleTitle || data.role || 'Teacher',
          };
        });
        setStaffOptions(staffList);
      },
      (err) => {
        console.warn('Error fetching staff for class assignment:', err);
      }
    );

    return () => unsubStaff();
  }, [organization, currentSchool]);

  // 2. Listen to real students to compute enrollment per class AND per stream
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

    const unsubStudents = onSnapshot(
      studentsRef,
      (snap) => {
        const classCounts: Record<string, number> = {};
        const streamCounts: Record<string, number> = {};

        snap.docs.forEach((d) => {
          const data = d.data();
          const cName = (data.currentClassId || data.className || data.class || '').toString().trim();
          const sName = (data.stream || data.currentStreamId || data.streamName || '').toString().trim();

          if (cName) {
            classCounts[cName] = (classCounts[cName] || 0) + 1;
            classCounts[cName.toLowerCase()] = (classCounts[cName.toLowerCase()] || 0) + 1;

            if (sName) {
              const streamKey = `${cName}_${sName}`;
              const streamKeyLower = `${cName.toLowerCase()}_${sName.toLowerCase()}`;
              streamCounts[streamKey] = (streamCounts[streamKey] || 0) + 1;
              streamCounts[streamKeyLower] = (streamCounts[streamKeyLower] || 0) + 1;
            }
          }
        });

        setStudentCountsByClass(classCounts);
        setStudentCountsByStream(streamCounts);
      },
      (err) => {
        console.warn('Error computing student enrollment:', err);
      }
    );

    return () => unsubStudents();
  }, [organization, currentSchool]);

  // 3. Listen to real-time classes in Firestore
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

    const unsubClasses = onSnapshot(
      classesRef,
      (snap) => {
        const list: ClassItem[] = snap.docs.map((d) => {
          const data = d.data();
          const rawStreams: string[] = Array.isArray(data.streams) && data.streams.length > 0 ? data.streams : ['East'];
          const rawStreamDetails: any[] = Array.isArray(data.streamDetails) ? data.streamDetails : [];

          // Map and hydrate stream details with live student counts
          const streamDetails: StreamDetail[] = rawStreams.map((strName: string, idx: number) => {
            const existing = rawStreamDetails.find((item) => item && (item.name === strName || item.id === strName));
            const streamKey = `${data.name || d.id}_${strName}`;
            const streamKeyLower = `${(data.name || d.id).toLowerCase()}_${strName.toLowerCase()}`;

            return {
              id: existing?.id || `str-${idx}-${strName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: strName,
              classTeacher: existing?.classTeacher || data.classTeacher || 'Unassigned',
              capacity: Number(existing?.capacity) || Math.round((Number(data.capacity) || 40) / Math.max(1, rawStreams.length)),
              enrolled: studentCountsByStream[streamKey] || studentCountsByStream[streamKeyLower] || 0,
            };
          });

          const enrolled =
            studentCountsByClass[data.name] ||
            studentCountsByClass[d.id] ||
            studentCountsByClass[(data.name || '').toLowerCase()] ||
            0;

          return {
            id: d.id,
            name: data.name || 'Unnamed Class',
            level: data.level || 'Lower Primary',
            streams: rawStreams,
            streamDetails,
            classTeacher: data.classTeacher || 'Unassigned',
            capacity: Number(data.capacity) || 40,
            enrolled,
            learningAreas: Array.isArray(data.learningAreas) ? data.learningAreas : ['Core Learning Areas'],
          };
        });

        // Sort by natural academic level progression
        list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        setClasses(list);
        setLoadingClasses(false);
      },
      (err) => {
        console.error('Error fetching classes:', err);
        setLoadingClasses(false);
      }
    );

    return () => unsubClasses();
  }, [organization, currentSchool, studentCountsByClass, studentCountsByStream]);

  // 4. Listen to real-time curriculum units/subjects in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const subjectsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'subjects'
    );

    const unsubSubjects = onSnapshot(
      subjectsRef,
      (snap) => {
        const list: Subject[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Untitled Unit',
            code: data.code || 'UNIT-001',
            type: data.type || (data.isMandatory !== false ? 'core' : 'elective'),
            isMandatory: data.isMandatory !== false,
            category: data.category || 'General',
            department: data.department || 'Academics',
            weeklyPeriods: data.weeklyPeriods || 4,
            applicableClasses: data.applicableClasses || [],
            teacherName: data.teacherName || 'Departmental Staff',
            description: data.description || '',
          };
        });

        setSubjects(list);
        setLoadingSubjects(false);
      },
      (err) => {
        console.error('Error fetching subjects/units:', err);
        setLoadingSubjects(false);
      }
    );

    return () => unsubSubjects();
  }, [organization, currentSchool]);

  // Stream Management Helpers in Add Class Modal
  const handleAddStreamToNewClass = () => {
    const trimmed = singleStreamInput.trim();
    if (!trimmed) return;
    if (streamList.includes(trimmed)) {
      toast.error(`Stream "${trimmed}" already added`);
      return;
    }
    setStreamList([...streamList, trimmed]);
    setSingleStreamInput('');
  };

  const handleRemoveStreamFromNewClass = (str: string) => {
    if (streamList.length <= 1) {
      toast.error('A class must have at least one stream');
      return;
    }
    setStreamList(streamList.filter((s) => s !== str));
  };

  const handleApplyPresetStreams = (preset: string[]) => {
    setStreamList(preset);
  };

  // Handle Create Class
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.error('Class title is required (e.g. Grade 1)');
      return;
    }
    if (streamList.length === 0) {
      toast.error('Please configure at least one stream');
      return;
    }
    if (!organization || !currentSchool) {
      toast.error('No active school selected.');
      return;
    }

    setSavingClass(true);
    const toastId = toast.loading(`Creating ${newClassName.trim()} with ${streamList.length} stream(s)...`);

    try {
      const classId = newClassName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'classes',
        classId
      );

      const parsedCapacity = parseInt(capacity) || 40;
      const initialStreamDetails: StreamDetail[] = streamList.map((str, idx) => ({
        id: `str-${idx}-${str.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: str,
        classTeacher: assignedClassTeacher,
        capacity: Math.round(parsedCapacity / streamList.length),
        enrolled: 0,
      }));

      await setDoc(docRef, {
        name: newClassName.trim(),
        level: newLevel,
        streams: streamList,
        streamDetails: initialStreamDetails,
        classTeacher: assignedClassTeacher,
        capacity: parsedCapacity,
        learningAreas: ['Core CBC Learning Areas'],
        createdAt: serverTimestamp(),
      });

      toast.success(`${newClassName.trim()} with ${streamList.length} stream(s) established!`, { id: toastId });
      setIsAddClassModalOpen(false);
      setNewClassName('');
      setStreamList(['East', 'West']);
      setAssignedClassTeacher('Unassigned');
    } catch (err) {
      console.error('Error adding class:', err);
      toast.error('Failed to create class', { id: toastId });
    } finally {
      setSavingClass(false);
    }
  };

  // Open Edit Class Modal
  const handleOpenEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditLevel(cls.level);
    setEditCapacity(String(cls.capacity));
    setEditClassTeacher(cls.classTeacher || 'Unassigned');
  };

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !editingClass) return;

    setSavingEditClass(true);
    const toastId = toast.loading(`Updating ${editClassName}...`);

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'classes',
        editingClass.id
      );

      await updateDoc(docRef, {
        name: editClassName.trim(),
        level: editLevel,
        capacity: parseInt(editCapacity) || 40,
        classTeacher: editClassTeacher,
        updatedAt: serverTimestamp(),
      });

      toast.success(`${editClassName} updated successfully!`, { id: toastId });
      setEditingClass(null);
    } catch (err) {
      console.error('Error updating class:', err);
      toast.error('Failed to update class', { id: toastId });
    } finally {
      setSavingEditClass(false);
    }
  };

  // Delete Class
  const handleDeleteClass = async (cls: ClassItem) => {
    if (!organization || !currentSchool) return;
    if (!window.confirm(`Are you sure you want to delete "${cls.name}" and all its streams? This cannot be undone.`)) {
      return;
    }

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'classes',
        cls.id
      );
      await deleteDoc(docRef);
      toast.success(`Class "${cls.name}" removed from school structure`);
    } catch (err) {
      console.error('Error deleting class:', err);
      toast.error('Failed to delete class');
    }
  };

  // Open Manage Streams Modal
  const handleOpenManageStreams = (cls: ClassItem) => {
    setManagingStreamsClass(cls);
    setStreamDetailDrafts(
      cls.streamDetails && cls.streamDetails.length > 0
        ? cls.streamDetails
        : cls.streams.map((str, idx) => ({
            id: `str-${idx}-${str.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            name: str,
            classTeacher: cls.classTeacher || 'Unassigned',
            capacity: Math.round(cls.capacity / Math.max(1, cls.streams.length)),
            enrolled: 0,
          }))
    );
    setNewStreamDraftName('');
  };

  const handleAddStreamToDrafts = () => {
    const trimmed = newStreamDraftName.trim();
    if (!trimmed) return;
    if (streamDetailDrafts.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Stream "${trimmed}" already exists`);
      return;
    }

    const newDetail: StreamDetail = {
      id: `str-${Date.now()}-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: trimmed,
      classTeacher: managingStreamsClass?.classTeacher || 'Unassigned',
      capacity: 40,
      enrolled: 0,
    };

    setStreamDetailDrafts([...streamDetailDrafts, newDetail]);
    setNewStreamDraftName('');
  };

  const handleRemoveStreamFromDrafts = (idOrName: string) => {
    if (streamDetailDrafts.length <= 1) {
      toast.error('A class must have at least one stream');
      return;
    }
    setStreamDetailDrafts(streamDetailDrafts.filter((s) => s.id !== idOrName && s.name !== idOrName));
  };

  const handleUpdateStreamDraftField = (
    id: string,
    field: 'name' | 'classTeacher' | 'capacity',
    value: any
  ) => {
    setStreamDetailDrafts(
      streamDetailDrafts.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleSaveManageStreams = async () => {
    if (!organization || !currentSchool || !managingStreamsClass) return;
    if (streamDetailDrafts.length === 0) {
      toast.error('Class must have at least one stream');
      return;
    }

    setSavingStreams(true);
    const toastId = toast.loading(`Saving streams for ${managingStreamsClass.name}...`);

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'classes',
        managingStreamsClass.id
      );

      const streamNames = streamDetailDrafts.map((s) => s.name.trim());
      const totalStreamCapacity = streamDetailDrafts.reduce((sum, s) => sum + (Number(s.capacity) || 40), 0);

      await updateDoc(docRef, {
        streams: streamNames,
        streamDetails: streamDetailDrafts,
        capacity: totalStreamCapacity,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Updated ${streamNames.length} stream(s) for ${managingStreamsClass.name}!`, { id: toastId });
      setManagingStreamsClass(null);
    } catch (err) {
      console.error('Error saving streams:', err);
      toast.error('Failed to update streams', { id: toastId });
    } finally {
      setSavingStreams(false);
    }
  };

  // 1-Click Auto Setup Complete Standard School Structure
  const handleSeedStandardClasses = async () => {
    if (!organization || !currentSchool) return;
    if (!window.confirm('This will establish standard CBC grade levels (PP1 through Grade 9) with dual streams (East & West). Continue?')) {
      return;
    }

    const toastId = toast.loading('Establishing full CBC academic structure...');
    try {
      const standardClasses = [
        { id: 'pp1', name: 'PP1', level: 'Pre-Primary', capacity: 35, streams: ['East', 'West'] },
        { id: 'pp2', name: 'PP2', level: 'Pre-Primary', capacity: 35, streams: ['East', 'West'] },
        { id: 'grade-1', name: 'Grade 1', level: 'Lower Primary', capacity: 40, streams: ['East', 'West'] },
        { id: 'grade-2', name: 'Grade 2', level: 'Lower Primary', capacity: 40, streams: ['East', 'West'] },
        { id: 'grade-3', name: 'Grade 3', level: 'Lower Primary', capacity: 40, streams: ['East', 'West'] },
        { id: 'grade-4', name: 'Grade 4', level: 'Upper Primary', capacity: 45, streams: ['East', 'West'] },
        { id: 'grade-5', name: 'Grade 5', level: 'Upper Primary', capacity: 45, streams: ['East', 'West'] },
        { id: 'grade-6', name: 'Grade 6', level: 'Upper Primary', capacity: 45, streams: ['East', 'West'] },
        { id: 'grade-7', name: 'Grade 7', level: 'Junior Secondary', capacity: 50, streams: ['East', 'West'] },
        { id: 'grade-8', name: 'Grade 8', level: 'Junior Secondary', capacity: 50, streams: ['East', 'West'] },
        { id: 'grade-9', name: 'Grade 9', level: 'Junior Secondary', capacity: 50, streams: ['East', 'West'] },
      ];

      const batch = writeBatch(db);
      standardClasses.forEach((c) => {
        const docRef = doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'classes',
          c.id
        );
        const streamDetails: StreamDetail[] = c.streams.map((str, idx) => ({
          id: `str-${idx}-${str.toLowerCase()}`,
          name: str,
          classTeacher: 'Unassigned',
          capacity: Math.round(c.capacity / 2),
          enrolled: 0,
        }));

        batch.set(docRef, {
          ...c,
          streamDetails,
          classTeacher: 'Unassigned',
          learningAreas: ['Core CBC Learning Areas'],
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
      toast.success('Complete CBC Academic Structure initialized!', { id: toastId });
    } catch (err) {
      console.error('Error seeding classes:', err);
      toast.error('Failed to setup standard classes', { id: toastId });
    }
  };

  // Handle Create Unit
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitCode.trim()) {
      toast.error('Unit name and code are required');
      return;
    }
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected.');
      return;
    }

    setSavingUnit(true);
    const toastId = toast.loading('Registering curriculum unit...');

    try {
      const unitId = unitCode.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'subjects',
        unitId
      );

      await setDoc(docRef, {
        name: unitName.trim(),
        code: unitCode.trim().toUpperCase(),
        isMandatory: unitIsMandatory,
        type: unitIsMandatory ? 'core' : 'elective',
        department: unitDepartment,
        weeklyPeriods: parseInt(unitWeeklyPeriods) || 4,
        teacherName: unitTeacher.trim() || 'Assigned Instructor',
        applicableClasses: newUnitClasses.length === 0 ? ['all'] : newUnitClasses,
        createdAt: serverTimestamp(),
      });

      toast.success(`Unit ${unitCode.toUpperCase()} (${unitName}) created!`, { id: toastId });
      setIsAddUnitModalOpen(false);
      setUnitName('');
      setUnitCode('');
      setUnitTeacher('Departmental Staff');
      setNewUnitClasses(['all']);
    } catch (err) {
      console.error('Error creating unit:', err);
      toast.error('Failed to register curriculum unit', { id: toastId });
    } finally {
      setSavingUnit(false);
    }
  };

  // Open Manage Class Units
  const handleOpenManageClassUnits = (cls: ClassItem) => {
    setManagingUnitsForClass(cls);
    setClassUnitSearch('');
    const activeSubjectIds = subjects
      .filter(
        (s) =>
          !s.applicableClasses ||
          s.applicableClasses.length === 0 ||
          s.applicableClasses.includes('all') ||
          s.applicableClasses.includes(cls.name)
      )
      .map((s) => s.id)
      .filter(Boolean) as string[];
    setClassUnitsSelection(activeSubjectIds);
  };

  const handleToggleUnitForClass = (subId: string) => {
    if (classUnitsSelection.includes(subId)) {
      setClassUnitsSelection(classUnitsSelection.filter((id) => id !== subId));
    } else {
      setClassUnitsSelection([...classUnitsSelection, subId]);
    }
  };

  const handleSelectAllUnitsForClass = () => {
    setClassUnitsSelection(subjects.map((s) => s.id).filter(Boolean) as string[]);
  };

  const handleSelectCoreUnitsForClass = () => {
    setClassUnitsSelection(subjects.filter((s) => s.isMandatory).map((s) => s.id).filter(Boolean) as string[]);
  };

  const handleClearUnitsForClass = () => {
    setClassUnitsSelection([]);
  };

  const handleSaveClassUnits = async () => {
    if (!organization || !currentSchool || !managingUnitsForClass) return;
    setSavingClassUnits(true);
    const toastId = toast.loading(`Saving designated units for ${managingUnitsForClass.name}...`);

    try {
      const batch = writeBatch(db);
      const allClassNames = classes.map((c) => c.name);

      for (const sub of subjects) {
        if (!sub.id) continue;
        const subDocRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', sub.id);
        const isSelected = classUnitsSelection.includes(sub.id);
        const currentApplicable = sub.applicableClasses || [];

        if (currentApplicable.length === 0 || currentApplicable.includes('all')) {
          if (!isSelected) {
            const otherClasses = allClassNames.filter((n) => n !== managingUnitsForClass.name);
            batch.update(subDocRef, {
              applicableClasses: otherClasses,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const hasCurrent = currentApplicable.includes(managingUnitsForClass.name);
          if (isSelected && !hasCurrent) {
            batch.update(subDocRef, {
              applicableClasses: [...currentApplicable, managingUnitsForClass.name],
              updatedAt: serverTimestamp(),
            });
          } else if (!isSelected && hasCurrent) {
            batch.update(subDocRef, {
              applicableClasses: currentApplicable.filter((n) => n !== managingUnitsForClass.name),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      await batch.commit();
      toast.success(`Assigned ${classUnitsSelection.length} units to ${managingUnitsForClass.name}!`, { id: toastId });
      setManagingUnitsForClass(null);
    } catch (err) {
      console.error('Error saving class units:', err);
      toast.error('Failed to update class units', { id: toastId });
    } finally {
      setSavingClassUnits(false);
    }
  };

  // Edit Unit
  const handleOpenEditUnit = (sub: Subject) => {
    setEditingUnit(sub);
    setEditUnitName(sub.name);
    setEditUnitCode(sub.code);
    setEditUnitDepartment(sub.department || 'Sciences & Tech');
    setEditUnitIsMandatory(sub.isMandatory !== false);
    setEditUnitWeeklyPeriods(String(sub.weeklyPeriods || 4));
    setEditUnitTeacher(sub.teacherName || 'Departmental Staff');
    setEditUnitClasses(sub.applicableClasses && sub.applicableClasses.length > 0 ? sub.applicableClasses : ['all']);
  };

  const handleSaveEditUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !editingUnit || !editingUnit.id) return;
    if (!editUnitName.trim() || !editUnitCode.trim()) {
      toast.error('Unit name and code are required');
      return;
    }

    setSavingEditUnit(true);
    const toastId = toast.loading(`Updating ${editUnitName}...`);
    try {
      const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', editingUnit.id);
      await updateDoc(docRef, {
        name: editUnitName.trim(),
        code: editUnitCode.trim().toUpperCase(),
        department: editUnitDepartment,
        weeklyPeriods: parseInt(editUnitWeeklyPeriods) || 4,
        isMandatory: editUnitIsMandatory,
        type: editUnitIsMandatory ? 'core' : 'elective',
        teacherName: editUnitTeacher.trim() || 'Assigned Instructor',
        applicableClasses: editUnitClasses.length === 0 ? ['all'] : editUnitClasses,
        updatedAt: serverTimestamp(),
      });

      toast.success(`Unit ${editUnitName} updated successfully!`, { id: toastId });
      setEditingUnit(null);
    } catch (err) {
      console.error('Error updating unit:', err);
      toast.error('Failed to update curriculum unit', { id: toastId });
    } finally {
      setSavingEditUnit(false);
    }
  };

  // Toggle Mandatory vs Optional status
  const handleToggleMandatory = async (subject: Subject) => {
    if (!organization || !currentSchool || !subject.id) return;
    const newMandatory = !subject.isMandatory;

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'subjects',
        subject.id
      );

      await updateDoc(docRef, {
        isMandatory: newMandatory,
        type: newMandatory ? 'core' : 'elective',
        updatedAt: serverTimestamp(),
      });

      toast.success(
        `${subject.name} marked as ${newMandatory ? 'MANDATORY (Core)' : 'OPTIONAL (Elective)'}`
      );
    } catch (err) {
      console.error('Error updating unit status:', err);
      toast.error('Failed to update unit requirement');
    }
  };

  // Delete Unit
  const handleDeleteUnit = async (subject: Subject) => {
    if (!organization || !currentSchool || !subject.id) return;
    if (!window.confirm(`Are you sure you want to delete unit "${subject.name}"?`)) return;

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'subjects',
        subject.id
      );

      await deleteDoc(docRef);
      toast.success(`Unit "${subject.name}" deleted from catalog`);
    } catch (err) {
      console.error('Error deleting unit:', err);
      toast.error('Failed to delete unit');
    }
  };

  // 1-Click Load Standard Curriculum Units
  const handleSeedStandardUnits = async () => {
    if (!organization || !currentSchool) return;
    setSeedingCurriculum(true);
    const toastId = toast.loading('Seeding standard national curriculum units...');

    try {
      const presetUnits = [
        { name: 'Mathematics', code: 'MATH-101', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 5 },
        { name: 'English Language & Literacy', code: 'ENG-102', isMandatory: true, department: 'Languages', weeklyPeriods: 5 },
        { name: 'Kiswahili & Fasihi', code: 'KISW-103', isMandatory: true, department: 'Languages', weeklyPeriods: 4 },
        { name: 'Integrated Science', code: 'SCI-201', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4 },
        { name: 'Social Studies & Citizenship', code: 'SST-202', isMandatory: true, department: 'Humanities', weeklyPeriods: 3 },
        { name: 'Agriculture & Nutrition', code: 'AGRI-301', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3 },
        { name: 'Creative Arts & Sports', code: 'ARTS-302', isMandatory: true, department: 'Creative Arts', weeklyPeriods: 3 },
        { name: 'Christian Religious Education (CRE)', code: 'CRE-104', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2 },
        { name: 'Islamic Religious Education (IRE)', code: 'IRE-105', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2 },
        { name: 'French Language', code: 'FRE-205', isMandatory: false, department: 'Languages', weeklyPeriods: 2 },
        { name: 'Computer Science & Digital Literacy', code: 'ICT-401', isMandatory: false, department: 'Sciences & Tech', weeklyPeriods: 3 },
      ];

      const batch = writeBatch(db);
      presetUnits.forEach((u) => {
        const docRef = doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'subjects',
          u.code.toLowerCase()
        );
        batch.set(docRef, {
          ...u,
          applicableClasses: classes.map((c) => c.name),
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
      toast.success(`Loaded ${presetUnits.length} official curriculum units!`, { id: toastId });
    } catch (err) {
      console.error('Error seeding units:', err);
      toast.error('Failed to load standard units', { id: toastId });
    } finally {
      setSeedingCurriculum(false);
    }
  };

  // Metrics Calculations
  const totalClassesCount = classes.length;
  const totalStreamsCount = classes.reduce((acc, c) => acc + (c.streams ? c.streams.length : 1), 0);
  const totalLearnersEnrolled = classes.reduce((acc, c) => acc + (c.enrolled || 0), 0);
  const totalCapacity = classes.reduce((acc, c) => acc + (c.capacity || 0), 0);
  const coreUnitsCount = subjects.filter((s) => s.isMandatory).length;
  const electiveUnitsCount = subjects.filter((s) => !s.isMandatory).length;

  // Filtered Classes
  const filteredClasses = classes.filter((cls) => {
    const q = (classSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (cls.name || '').toLowerCase().includes(q) ||
      (cls.level || '').toLowerCase().includes(q) ||
      ((cls.classTeacher || '').toLowerCase().includes(q)) ||
      (cls.streams || []).some((s) => (s || '').toLowerCase().includes(q));

    const matchesLevel = levelFilter === 'all' || (cls.level || '').toLowerCase().includes((levelFilter || '').toLowerCase());

    return matchesSearch && matchesLevel;
  });

  // Filtered Units
  const filteredUnits = subjects.filter((u) => {
    const q = (unitSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.code || '').toLowerCase().includes(q) ||
      ((u.department || '').toLowerCase().includes(q));

    const matchesType =
      unitTypeFilter === 'all' ||
      (unitTypeFilter === 'mandatory' && u.isMandatory) ||
      (unitTypeFilter === 'optional' && !u.isMandatory);

    const matchesDept = unitDeptFilter === 'all' || u.department === unitDeptFilter;

    return matchesSearch && matchesType && matchesDept;
  });

  const departments = Array.from(new Set(subjects.map((s) => s.department).filter(Boolean))) as string[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              {currentSchool?.curriculumType || 'CBC Curriculum'}
            </Badge>
            <span className="text-2xs text-slate-500 font-semibold">
              {currentSchool?.name || 'Main Campus'}
            </span>
          </div>
          <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight">
            Classes &amp; Stream Architecture
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure academic grade levels, multi-stream cohorts, and learning area distributions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {classes.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSeedStandardClasses}
              leftIcon={<Sparkles className="w-4 h-4 text-brand-600" />}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold"
            >
              Setup Standard CBC Structure
            </Button>
          )}

          {activeTab === 'classes' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddClassModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="shadow-sm font-bold"
            >
              Add New Class
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSeedStandardUnits}
                isLoading={seedingCurriculum}
                leftIcon={<Sparkles className="w-4 h-4 text-brand-600" />}
                className="font-bold"
              >
                Load Standard Units
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddUnitModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
                className="shadow-sm font-bold"
              >
                Add Unit / Subject
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Classes */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Classes &amp; Grades
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Layers className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalClassesCount}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              Grade levels configured
            </p>
          </div>
        </div>

        {/* Card 2: Active Streams */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Active Streams
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <FolderTree className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalStreamsCount}</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              Class sections across school
            </p>
          </div>
        </div>

        {/* Card 3: Enrolled Learners */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Total Enrolled
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalLearnersEnrolled}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              Capacity: {totalCapacity} learners ({totalCapacity > 0 ? Math.round((totalLearnersEnrolled / totalCapacity) * 100) : 0}% full)
            </p>
          </div>
        </div>

        {/* Card 4: Curriculum Units */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-100">
              Curriculum Units
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{subjects.length}</div>
            <p className="text-xs text-amber-100 mt-1 font-medium">
              {coreUnitsCount} Core • {electiveUnitsCount} Elective
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'classes'
              ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Classes &amp; Streams ({classes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'units'
              ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Curriculum Units &amp; Learning Areas ({subjects.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: CLASSES & STREAMS                                     */}
      {/* ============================================================ */}
      {activeTab === 'classes' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <Card className="p-4 bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Search classes, streams or assigned teachers..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold text-slate-400 uppercase">Level:</span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
                >
                  <option value="all">All Levels</option>
                  <option value="pre-primary">Pre-Primary (PP1 - PP2)</option>
                  <option value="lower primary">Lower Primary (Grade 1 - 3)</option>
                  <option value="upper primary">Upper Primary (Grade 4 - 6)</option>
                  <option value="junior">Junior Secondary (Grade 7 - 9)</option>
                  <option value="secondary">Senior Secondary (Form 1 - 4)</option>
                </select>
              </div>
            </div>
          </Card>

          {loadingClasses ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading real classes &amp; stream structures...</p>
            </div>
          ) : classes.length === 0 ? (
            <Card className="text-center py-14 text-slate-500 border-dashed border-2">
              <Layers className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900">No classes configured yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Set up your grade levels and streams for {currentSchool?.name || 'this school'}. You can quickly establish standard CBC classes or add custom classes.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSeedStandardClasses}
                  leftIcon={<Sparkles className="w-4 h-4 text-brand-600" />}
                >
                  Setup Standard CBC Structure
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddClassModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Custom Class
                </Button>
              </div>
            </Card>
          ) : filteredClasses.length === 0 ? (
            <Card className="text-center py-10 text-slate-500">
              <p className="text-xs font-semibold">No classes match your filter "{classSearch || levelFilter}"</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClasses.map((cls) => {
                const percentFull = cls.capacity > 0 ? Math.round((cls.enrolled / cls.capacity) * 100) : 0;
                const levelConfig = LEVEL_COLORS[cls.level] || {
                  badge: 'bg-blue-50 text-blue-700 border-blue-200',
                  border: 'border-blue-100',
                  bg: 'bg-white',
                };

                const classUnits = subjects.filter(
                  (u) =>
                    !u.applicableClasses ||
                    u.applicableClasses.length === 0 ||
                    u.applicableClasses.includes('all') ||
                    u.applicableClasses.includes(cls.name)
                );
                const coreCount = classUnits.filter((u) => u.isMandatory).length;
                const electiveCount = classUnits.filter((u) => !u.isMandatory).length;

                return (
                  <Card
                    key={cls.id}
                    className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-slate-200/80 hover:border-blue-300 relative group"
                  >
                    <div className="space-y-3.5">
                      {/* Card Top: Class Name, Level, Edit/Delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">{cls.name}</h3>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${levelConfig.badge}`}
                            >
                              {cls.level}
                            </span>
                          </div>
                          <span className="text-2xs font-semibold text-slate-500 block mt-1 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Lead Teacher: <strong className="text-slate-800">{cls.classTeacher}</strong>
                          </span>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditClass(cls)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Class Information"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stream Breakdown Section */}
                      <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <FolderTree className="w-3 h-3 text-[#1d5f99]" />
                            Streams ({cls.streams.length})
                          </span>
                          <button
                            onClick={() => handleOpenManageStreams(cls)}
                            className="text-[10.5px] font-bold text-[#1d5f99] hover:underline flex items-center gap-0.5"
                          >
                            Manage Streams <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Stream pills with real data */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {cls.streamDetails && cls.streamDetails.length > 0 ? (
                            cls.streamDetails.map((stream) => (
                              <div
                                key={stream.id || stream.name}
                                className="p-2 rounded-lg bg-white border border-slate-200/90 shadow-2xs text-2xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-slate-900 truncate">
                                    Stream {stream.name}
                                  </span>
                                  <span className="font-bold text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                    {stream.enrolled || 0} learners
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  Tr: <span className="font-medium text-slate-700">{stream.classTeacher || cls.classTeacher}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            cls.streams.map((str, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-white border border-slate-200 text-2xs font-bold text-slate-800"
                              >
                                Stream {str}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Assigned Curriculum Units Info */}
                      <div className="p-2.5 rounded-xl bg-blue-50/30 border border-blue-100/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-bold text-slate-700 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-[#1d5f99]" />
                            Curriculum Units
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100/60 text-[#1d5f99]">
                            {classUnits.length} Assigned ({coreCount} Core, {electiveCount} Elective)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {classUnits.slice(0, 4).map((u) => (
                            <span
                              key={u.id || u.code}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200/80 truncate max-w-[130px]"
                              title={u.name}
                            >
                              {u.name}
                            </span>
                          ))}
                          {classUnits.length > 4 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                              +{classUnits.length - 4} more
                            </span>
                          )}
                          {classUnits.length === 0 && (
                            <span className="text-[10px] text-amber-600 italic">No units assigned yet</span>
                          )}
                        </div>
                      </div>

                      {/* Enrollment status bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-2xs">
                          <span className="text-slate-500 font-semibold">Total Class Enrollment</span>
                          <span className="font-extrabold text-slate-800">
                            {cls.enrolled} / {cls.capacity} Learners ({percentFull}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentFull > 90
                                ? 'bg-amber-500'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                            }`}
                            style={{ width: `${Math.min(percentFull, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 mt-4 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenManageStreams(cls)}
                        leftIcon={<FolderTree className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        className="text-2xs py-1 h-8 font-bold justify-center"
                      >
                        <span className="truncate">Streams ({cls.streams.length})</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenManageClassUnits(cls)}
                        leftIcon={<BookOpen className="w-3.5 h-3.5 text-[#1d5f99] shrink-0" />}
                        className="text-2xs py-1 h-8 font-bold justify-center"
                      >
                        <span className="truncate">Units ({classUnits.length})</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: CURRICULUM UNITS & SUBJECTS                           */}
      {/* ============================================================ */}
      {activeTab === 'units' && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <Card className="p-4 bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Search units by name, code or department..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setUnitTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                      unitTypeFilter === 'all'
                        ? 'bg-[#1d5f99] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({subjects.length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('mandatory')}
                    className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                      unitTypeFilter === 'mandatory'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Mandatory Core ({subjects.filter((s) => s.isMandatory).length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('optional')}
                    className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                      unitTypeFilter === 'optional'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Optional Elective ({subjects.filter((s) => !s.isMandatory).length})
                  </button>
                </div>
              </div>

              {departments.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-bold text-slate-400 uppercase">Department:</span>
                  <select
                    value={unitDeptFilter}
                    onChange={(e) => setUnitDeptFilter(e.target.value)}
                    className="text-xs py-1 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </Card>

          {/* Units Grid */}
          {filteredUnits.length === 0 ? (
            <Card className="text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-900">No curriculum units found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No subjects matched your criteria. You can load national curriculum presets or add custom learning units.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSeedStandardUnits}
                  isLoading={seedingCurriculum}
                  leftIcon={<Sparkles className="w-4 h-4 text-brand-600" />}
                >
                  Load Standard Units
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddUnitModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Custom Unit
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnits.map((sub) => (
                <Card
                  key={sub.id || sub.code}
                  className="p-5 flex flex-col justify-between border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-2xs ${
                            sub.isMandatory ? 'bg-[#1d5f99]' : 'bg-amber-600'
                          }`}
                        >
                          {sub.code.slice(0, 3)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{sub.name}</h4>
                          <span className="text-2xs font-mono font-bold text-slate-500">{sub.code}</span>
                        </div>
                      </div>

                      {/* Mandatory / Optional Badge with 1-click toggle */}
                      <button
                        onClick={() => handleToggleMandatory(sub)}
                        title="Click to toggle Mandatory vs Optional"
                        className="transition-transform hover:scale-105"
                      >
                        {sub.isMandatory ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer">
                            <Check className="w-3 h-3 text-blue-600" />
                            Mandatory (Core)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer">
                            Optional (Elective)
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-2xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-semibold">Department</span>
                        <span className="font-bold text-slate-800 truncate block">{sub.department || 'General'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold">Weekly Load</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {sub.weeklyPeriods || 4} Periods / Wk
                        </span>
                      </div>
                    </div>

                    {/* Designated Classes */}
                    <div className="flex items-center gap-1.5 text-2xs text-slate-600 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/60">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">
                        {!sub.applicableClasses || sub.applicableClasses.length === 0 || sub.applicableClasses.includes('all')
                          ? 'Designated for All Classes'
                          : `Active for: ${sub.applicableClasses.join(', ')}`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-2xs">
                    <span className="text-slate-600 truncate max-w-[140px]">
                      Lead: <strong className="text-slate-800">{sub.teacherName || 'Departmental Staff'}</strong>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditUnit(sub)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-[#1d5f99] hover:bg-blue-50 transition-colors"
                        title="Edit unit details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(sub)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD NEW CLASS (WITH MULTI-STREAM CONFIG)              */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        title="Create Academic Class &amp; Streams"
        description="Establish a new grade level and configure all sections or streams."
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <Input
            label="Class Title / Name"
            placeholder="e.g. Grade 1, Grade 7, Form 2"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Curriculum Level"
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value)}
              options={[
                { label: 'Pre-Primary (PP1 - PP2)', value: 'Pre-Primary' },
                { label: 'Lower Primary (Grade 1 - 3)', value: 'Lower Primary' },
                { label: 'Upper Primary (Grade 4 - 6)', value: 'Upper Primary' },
                { label: 'Junior Secondary (Grade 7 - 9)', value: 'Junior Secondary' },
                { label: 'Senior Secondary (Form 1 - 4)', value: 'Senior Secondary' },
                { label: 'Cambridge / IGCSE Stage', value: 'Cambridge Stage' },
              ]}
            />
            <Input
              label="Total Enrolment Target"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min="10"
              max="250"
              required
            />
          </div>

          {/* Lead Class Teacher from real staff */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Lead Class Teacher / Coordinator
            </label>
            <select
              value={assignedClassTeacher}
              onChange={(e) => setAssignedClassTeacher(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Unassigned">Unassigned (Assign Later)</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name} ({staff.roleTitle || 'Faculty'})
                </option>
              ))}
            </select>
          </div>

          {/* MULTI-STREAM CONFIGURATION */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Configure Streams for this Class ({streamList.length})
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                Click preset or add custom
              </span>
            </div>

            {/* Stream Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPresetStreams(['East', 'West'])}
                className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
              >
                East / West
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetStreams(['North', 'South', 'East', 'West'])}
                className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
              >
                4 Cardinals (N, S, E, W)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetStreams(['Blue', 'Green', 'Red', 'Yellow'])}
                className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
              >
                Colors (Blue, Green, Red)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetStreams(['Stream A', 'Stream B', 'Stream C'])}
                className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
              >
                A / B / C
              </button>
            </div>

            {/* Current Active Streams Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {streamList.map((str) => (
                <span
                  key={str}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-800 shadow-2xs"
                >
                  Stream: {str}
                  <button
                    type="button"
                    onClick={() => handleRemoveStreamFromNewClass(str)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Custom Stream Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom stream (e.g. Sapphire, Gold, Kilimanjaro)..."
                value={singleStreamInput}
                onChange={(e) => setSingleStreamInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStreamToNewClass();
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddStreamToNewClass}
                className="text-2xs py-1.5 h-8 font-bold"
              >
                + Add Stream
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingClass}>
              Create Class &amp; Streams
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: EDIT CLASS                                            */}
      {/* ============================================================ */}
      {editingClass && (
        <Modal
          isOpen={editingClass !== null}
          onClose={() => setEditingClass(null)}
          title={`Edit Class — ${editingClass.name}`}
          description="Update class title, academic level, target capacity, and assigned coordinator."
        >
          <form onSubmit={handleSaveEditClass} className="space-y-4">
            <Input
              label="Class Name"
              value={editClassName}
              onChange={(e) => setEditClassName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Curriculum Level"
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value)}
                options={[
                  { label: 'Pre-Primary (PP1 - PP2)', value: 'Pre-Primary' },
                  { label: 'Lower Primary (Grade 1 - 3)', value: 'Lower Primary' },
                  { label: 'Upper Primary (Grade 4 - 6)', value: 'Upper Primary' },
                  { label: 'Junior Secondary (Grade 7 - 9)', value: 'Junior Secondary' },
                  { label: 'Senior Secondary (Form 1 - 4)', value: 'Senior Secondary' },
                  { label: 'Cambridge / IGCSE Stage', value: 'Cambridge Stage' },
                ]}
              />
              <Input
                label="Target Capacity"
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                min="10"
                max="250"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Lead Class Teacher
              </label>
              <select
                value={editClassTeacher}
                onChange={(e) => setEditClassTeacher(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Unassigned">Unassigned</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.name}>
                    {staff.name} ({staff.roleTitle || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setEditingClass(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={savingEditClass}>
                Save Class Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* MODAL: MANAGE STREAMS FOR A CLASS                            */}
      {/* ============================================================ */}
      {managingStreamsClass && (
        <Modal
          isOpen={managingStreamsClass !== null}
          onClose={() => setManagingStreamsClass(null)}
          title={`Manage Streams — ${managingStreamsClass.name}`}
          description={`Add, edit, or adjust stream teachers and capacities for ${managingStreamsClass.name}.`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Quick Stream Adder */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Add new stream (e.g. North, Blue, Sapphire)..."
                value={newStreamDraftName}
                onChange={(e) => setNewStreamDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStreamToDrafts();
                  }
                }}
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddStreamToDrafts}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-2xs py-1.5 h-8 font-bold"
              >
                Add Stream
              </Button>
            </div>

            {/* List of Streams with Teacher and Capacity fields */}
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {streamDetailDrafts.map((stream, idx) => (
                <div
                  key={stream.id || idx}
                  className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center border border-emerald-200">
                      #{idx + 1}
                    </span>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block">Stream Name</label>
                      <input
                        type="text"
                        value={stream.name}
                        onChange={(e) => handleUpdateStreamDraftField(stream.id, 'name', e.target.value)}
                        className="text-xs font-bold text-slate-900 border-b border-slate-200 focus:border-blue-500 bg-transparent py-0.5 focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  {/* Teacher Selector from real staff */}
                  <div className="w-full sm:w-44">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Stream Teacher</label>
                    <select
                      value={stream.classTeacher || 'Unassigned'}
                      onChange={(e) => handleUpdateStreamDraftField(stream.id, 'classTeacher', e.target.value)}
                      className="w-full text-2xs py-1 px-2 rounded border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {staffOptions.map((staff) => (
                        <option key={staff.id} value={staff.name}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity */}
                  <div className="w-20">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Capacity</label>
                    <input
                      type="number"
                      value={stream.capacity || 40}
                      onChange={(e) => handleUpdateStreamDraftField(stream.id, 'capacity', parseInt(e.target.value) || 40)}
                      className="w-full text-xs font-semibold text-slate-800 py-1 px-2 rounded border border-slate-300 bg-white"
                      min="5"
                      max="100"
                    />
                  </div>

                  {/* Delete Stream */}
                  <button
                    type="button"
                    onClick={() => handleRemoveStreamFromDrafts(stream.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Remove this stream"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setManagingStreamsClass(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveManageStreams}
                isLoading={savingStreams}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save All Streams ({streamDetailDrafts.length})
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD CURRICULUM UNIT / SUBJECT                         */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddUnitModalOpen}
        onClose={() => setIsAddUnitModalOpen(false)}
        title="Register Curriculum Unit / Subject"
        description="Define a new teaching subject, learning area, or elective module."
      >
        <form onSubmit={handleAddUnit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unit / Subject Name"
              placeholder="e.g. Chemistry, French, Agriculture"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              required
            />
            <Input
              label="Unit Code"
              placeholder="e.g. CHM-201, FRE-102"
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department / Field"
              value={unitDepartment}
              onChange={(e) => setUnitDepartment(e.target.value)}
              options={[
                { label: 'Sciences & Technology', value: 'Sciences & Tech' },
                { label: 'Languages & Literature', value: 'Languages' },
                { label: 'Humanities & Social Studies', value: 'Humanities' },
                { label: 'Creative Arts & Physical Education', value: 'Creative Arts' },
                { label: 'Applied Sciences & Agriculture', value: 'Applied Sciences' },
                { label: 'Religious & Moral Education', value: 'Religious Studies' },
                { label: 'Commerce & Business', value: 'Business Studies' },
              ]}
            />
            <Input
              label="Weekly Periods"
              type="number"
              value={unitWeeklyPeriods}
              onChange={(e) => setUnitWeeklyPeriods(e.target.value)}
              min="1"
              max="15"
              required
            />
          </div>

          {/* Lead Teacher from real staff */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Assigned Lead Instructor
            </label>
            <select
              value={unitTeacher}
              onChange={(e) => setUnitTeacher(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
            >
              <option value="Departmental Staff">Departmental Staff (Default)</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name} ({staff.roleTitle || 'Faculty'})
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory vs Optional Toggle */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <label className="block text-xs font-bold text-slate-800">Curriculum Requirement Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  unitIsMandatory
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="unit_requirement"
                  checked={unitIsMandatory}
                  onChange={() => setUnitIsMandatory(true)}
                  className="text-blue-600"
                />
                <span className="text-xs">Mandatory (Core Unit)</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  !unitIsMandatory
                    ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="unit_requirement"
                  checked={!unitIsMandatory}
                  onChange={() => setUnitIsMandatory(false)}
                  className="text-amber-600"
                />
                <span className="text-xs">Optional (Elective)</span>
              </label>
            </div>
            <p className="text-2xs text-slate-500">
              Mandatory units are auto-assigned to all learners in designated levels. Optional units allow individual student selection.
            </p>
          </div>

          {/* Target Classes Selection */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Designated Classes / Levels
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                {newUnitClasses.includes('all') ? 'All School Classes' : `${newUnitClasses.length} class(es) selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNewUnitClasses(['all'])}
                className={`text-[10.5px] px-2 py-0.5 rounded font-bold border ${
                  newUnitClasses.includes('all')
                    ? 'bg-[#1d5f99] text-white border-[#1d5f99]'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                All Classes
              </button>
              {classes.map((c) => {
                const isSelected = newUnitClasses.includes('all') || newUnitClasses.includes(c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (newUnitClasses.includes('all')) {
                        setNewUnitClasses(classes.filter((item) => item.name !== c.name).map((item) => item.name));
                      } else if (newUnitClasses.includes(c.name)) {
                        setNewUnitClasses(newUnitClasses.filter((name) => name !== c.name));
                      } else {
                        const next = [...newUnitClasses, c.name];
                        if (next.length === classes.length) {
                          setNewUnitClasses(['all']);
                        } else {
                          setNewUnitClasses(next);
                        }
                      }
                    }}
                    className={`text-[10.5px] px-2 py-0.5 rounded font-bold border ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddUnitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingUnit}>
              Save Curriculum Unit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: MANAGE CLASS UNITS                                    */}
      {/* ============================================================ */}
      {managingUnitsForClass && (
        <Modal
          isOpen={managingUnitsForClass !== null}
          onClose={() => setManagingUnitsForClass(null)}
          title={`Manage Curriculum Units — ${managingUnitsForClass.name}`}
          description={`Configure which learning areas are active for ${managingUnitsForClass.name}. Students in this class will only be evaluated on these units.`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Quick Actions Bar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Quick Actions ({classUnitsSelection.length} of {subjects.length} units active):
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllUnitsForClass}
                  className="text-2xs px-2.5 py-1 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleSelectCoreUnitsForClass}
                  className="text-2xs px-2.5 py-1 rounded-md font-bold bg-blue-50 text-[#1d5f99] border border-blue-200 hover:bg-blue-100 transition"
                >
                  Core Only ({subjects.filter((s) => s.isMandatory).length})
                </button>
                <button
                  type="button"
                  onClick={handleClearUnitsForClass}
                  className="text-2xs px-2.5 py-1 rounded-md font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search school curriculum units..."
                value={classUnitSearch}
                onChange={(e) => setClassUnitSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20"
              />
            </div>

            {/* Units Checklist */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {subjects
                .filter((s) => {
                  if (!classUnitSearch.trim()) return true;
                  const term = classUnitSearch.toLowerCase();
                  return (
                    (s.name || '').toLowerCase().includes(term) ||
                    (s.code || '').toLowerCase().includes(term) ||
                    (s.department && s.department.toLowerCase().includes(term))
                  );
                })
                .map((sub) => {
                  const isChecked = sub.id ? classUnitsSelection.includes(sub.id) : false;
                  return (
                    <label
                      key={sub.id || sub.code}
                      className={`flex items-center justify-between p-3 cursor-pointer transition ${
                        isChecked ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => sub.id && handleToggleUnitForClass(sub.id)}
                          className="rounded text-[#1d5f99] focus:ring-[#1d5f99] w-4 h-4"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{sub.name}</span>
                            <span className="font-mono text-2xs text-slate-500 font-semibold">{sub.code}</span>
                          </div>
                          <span className="text-2xs text-slate-500 block">
                            {sub.department || 'General'} • {sub.weeklyPeriods || 4} Periods/Wk
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sub.isMandatory ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            Core
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                            Elective
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setManagingUnitsForClass(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveClassUnits}
                isLoading={savingClassUnits}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Class Units ({classUnitsSelection.length} Active)
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT CURRICULUM UNIT                                  */}
      {/* ============================================================ */}
      {editingUnit && (
        <Modal
          isOpen={editingUnit !== null}
          onClose={() => setEditingUnit(null)}
          title={`Edit Curriculum Unit — ${editingUnit.name} (${editingUnit.code})`}
          description="Update subject details, load periods, requirement mode, and designated grade levels."
        >
          <form onSubmit={handleSaveEditUnit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Unit Name"
                value={editUnitName}
                onChange={(e) => setEditUnitName(e.target.value)}
                required
              />
              <Input
                label="Unit Code"
                value={editUnitCode}
                onChange={(e) => setEditUnitCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Department"
                value={editUnitDepartment}
                onChange={(e) => setEditUnitDepartment(e.target.value)}
                options={[
                  { label: 'Sciences & Technology', value: 'Sciences & Tech' },
                  { label: 'Languages & Literature', value: 'Languages' },
                  { label: 'Humanities & Social Studies', value: 'Humanities' },
                  { label: 'Creative Arts & Physical Education', value: 'Creative Arts' },
                  { label: 'Applied Sciences & Agriculture', value: 'Applied Sciences' },
                  { label: 'Religious & Moral Education', value: 'Religious Studies' },
                  { label: 'Commerce & Business', value: 'Business Studies' },
                ]}
              />
              <Input
                label="Weekly Periods"
                type="number"
                value={editUnitWeeklyPeriods}
                onChange={(e) => setEditUnitWeeklyPeriods(e.target.value)}
                min="1"
                max="15"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Assigned Lead Teacher
              </label>
              <select
                value={editUnitTeacher}
                onChange={(e) => setEditUnitTeacher(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="Departmental Staff">Departmental Staff</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id} value={staff.name}>
                    {staff.name} ({staff.roleTitle || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            {/* Mandatory vs Optional Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">Curriculum Requirement Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    editUnitIsMandatory
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_unit_requirement"
                    checked={editUnitIsMandatory}
                    onChange={() => setEditUnitIsMandatory(true)}
                    className="text-blue-600"
                  />
                  <span className="text-xs">Mandatory (Core Unit)</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    !editUnitIsMandatory
                      ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_unit_requirement"
                    checked={!editUnitIsMandatory}
                    onChange={() => setEditUnitIsMandatory(false)}
                    className="text-amber-600"
                  />
                  <span className="text-xs">Optional (Elective)</span>
                </label>
              </div>
            </div>

            {/* Applicable Classes */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Designated Classes
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {editUnitClasses.includes('all') ? 'All School Classes' : `${editUnitClasses.length} class(es) selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['all'])}
                  className={`text-[10.5px] px-2 py-0.5 rounded font-bold border ${
                    editUnitClasses.includes('all')
                      ? 'bg-[#1d5f99] text-white border-[#1d5f99]'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  All Classes
                </button>
                {classes.map((c) => {
                  const isSelected = editUnitClasses.includes('all') || editUnitClasses.includes(c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (editUnitClasses.includes('all')) {
                          setEditUnitClasses(classes.filter((item) => item.name !== c.name).map((item) => item.name));
                        } else if (editUnitClasses.includes(c.name)) {
                          setEditUnitClasses(editUnitClasses.filter((name) => name !== c.name));
                        } else {
                          const next = [...editUnitClasses, c.name];
                          if (next.length === classes.length) {
                            setEditUnitClasses(['all']);
                          } else {
                            setEditUnitClasses(next);
                          }
                        }
                      }}
                      className={`text-[10.5px] px-2 py-0.5 rounded font-bold border ${
                        isSelected
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setEditingUnit(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={savingEditUnit} leftIcon={<Check className="w-4 h-4" />}>
                Save Changes to Unit
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
