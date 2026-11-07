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

interface ClassItem {
  id: string;
  name: string;
  level: string;
  streams: string[];
  classTeacher: string;
  capacity: number;
  enrolled: number;
  learningAreas: string[];
}

export const Classes: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  // Active view tab: 'classes' | 'units'
  const [activeTab, setActiveTab] = useState<'classes' | 'units'>('classes');

  // Classes State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [studentCountsByClass, setStudentCountsByClass] = useState<Record<string, number>>({});

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newLevel, setNewLevel] = useState('Upper Primary (CBC)');
  const [streamName, setStreamName] = useState('East');
  const [capacity, setCapacity] = useState('40');
  const [savingClass, setSavingClass] = useState(false);

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
  const [unitTeacher, setUnitTeacher] = useState('');
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
  const [editUnitTeacher, setEditUnitTeacher] = useState('');
  const [editUnitClasses, setEditUnitClasses] = useState<string[]>(['all']);
  const [savingEditUnit, setSavingEditUnit] = useState(false);

  // 1. Listen to students to compute enrollment per class
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
      const counts: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const classId = d.data().currentClassId;
        if (classId) {
          counts[classId] = (counts[classId] || 0) + 1;
        }
      });
      setStudentCountsByClass(counts);
    });

    return () => unsubStudents();
  }, [organization, currentSchool]);

  // 2. Listen to real-time classes in Firestore
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
          return {
            id: d.id,
            name: data.name || 'Unnamed Class',
            level: data.level || 'Primary',
            streams: data.streams || ['East'],
            classTeacher: data.classTeacher || 'Unassigned',
            capacity: Number(data.capacity) || 40,
            enrolled: studentCountsByClass[data.name] || studentCountsByClass[d.id] || 0,
            learningAreas: data.learningAreas || ['Core Subjects'],
          };
        });

        setClasses(list);
        setLoadingClasses(false);
      },
      (err) => {
        console.error('Error fetching classes:', err);
        setLoadingClasses(false);
      }
    );

    return () => unsubClasses();
  }, [organization, currentSchool, studentCountsByClass]);

  // 3. Listen to real-time curriculum units/subjects in Firestore
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

  // Handle Create Class
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected.');
      return;
    }

    setSavingClass(true);
    const toastId = toast.loading('Creating class stream...');

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

      await setDoc(docRef, {
        name: newClassName.trim(),
        level: newLevel,
        streams: streamName.trim() ? [streamName.trim()] : ['East'],
        classTeacher: 'Unassigned',
        capacity: parseInt(capacity) || 40,
        learningAreas: ['Core Subjects', 'Literacy', 'Mathematics'],
        createdAt: serverTimestamp(),
      });

      toast.success(`${newClassName} added to academic structure!`, { id: toastId });
      setIsAddClassModalOpen(false);
      setNewClassName('');
    } catch (err) {
      console.error('Error adding class:', err);
      toast.error('Failed to create class', { id: toastId });
    } finally {
      setSavingClass(false);
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
      setUnitTeacher('');
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
            // Unit was for all classes, but now unselected for this class
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

  const handleAddUnitForClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !managingUnitsForClass) return;
    if (!unitName.trim() || !unitCode.trim()) {
      toast.error('Unit name and code are required');
      return;
    }

    const toastId = toast.loading(`Adding ${unitName} to ${managingUnitsForClass.name}...`);
    try {
      const unitId = unitCode.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', unitId);
      await setDoc(docRef, {
        name: unitName.trim(),
        code: unitCode.trim().toUpperCase(),
        isMandatory: unitIsMandatory,
        type: unitIsMandatory ? 'core' : 'elective',
        department: unitDepartment,
        weeklyPeriods: parseInt(unitWeeklyPeriods) || 4,
        teacherName: unitTeacher.trim() || 'Assigned Instructor',
        applicableClasses: [managingUnitsForClass.name],
        createdAt: serverTimestamp(),
      });

      setClassUnitsSelection((prev) => [...prev, unitId]);
      toast.success(`Unit ${unitCode.toUpperCase()} created and assigned to ${managingUnitsForClass.name}!`, { id: toastId });
      setIsAddUnitForClassOpen(false);
      setUnitName('');
      setUnitCode('');
      setUnitTeacher('');
    } catch (err) {
      console.error('Error adding unit for class:', err);
      toast.error('Failed to add unit for class', { id: toastId });
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
    setEditUnitTeacher(sub.teacherName || '');
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
      const country = currentSchool.country || organization.country || 'KE';
      const curriculum = currentSchool.curriculumType || 'CBC';

      let presetUnits: Array<{
        name: string;
        code: string;
        isMandatory: boolean;
        department: string;
        weeklyPeriods: number;
      }> = [];

      if (curriculum.includes('CBC') || country === 'KE') {
        presetUnits = [
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
      } else if (curriculum.includes('UNEB') || country === 'UG') {
        presetUnits = [
          { name: 'Mathematics', code: 'MTH-U1', isMandatory: true, department: 'Sciences', weeklyPeriods: 5 },
          { name: 'English Language', code: 'ENG-U1', isMandatory: true, department: 'Languages', weeklyPeriods: 5 },
          { name: 'Biology', code: 'BIO-U1', isMandatory: true, department: 'Sciences', weeklyPeriods: 4 },
          { name: 'Chemistry', code: 'CHM-U1', isMandatory: true, department: 'Sciences', weeklyPeriods: 4 },
          { name: 'Physics', code: 'PHY-U1', isMandatory: true, department: 'Sciences', weeklyPeriods: 4 },
          { name: 'Geography', code: 'GEO-U1', isMandatory: true, department: 'Humanities', weeklyPeriods: 3 },
          { name: 'History & Political Education', code: 'HIS-U1', isMandatory: true, department: 'Humanities', weeklyPeriods: 3 },
          { name: 'Entrepreneurship Education', code: 'ENT-U2', isMandatory: false, department: 'Business', weeklyPeriods: 3 },
          { name: 'Information & Communications Tech', code: 'ICT-U2', isMandatory: false, department: 'Technical', weeklyPeriods: 2 },
          { name: 'Literature in English', code: 'LIT-U2', isMandatory: false, department: 'Languages', weeklyPeriods: 2 },
        ];
      } else {
        // Cambridge / International Standard
        presetUnits = [
          { name: 'Pure Mathematics', code: 'CAM-M01', isMandatory: true, department: 'Mathematics', weeklyPeriods: 5 },
          { name: 'First Language English', code: 'CAM-E01', isMandatory: true, department: 'Languages', weeklyPeriods: 5 },
          { name: 'Combined Sciences', code: 'CAM-S01', isMandatory: true, department: 'Natural Sciences', weeklyPeriods: 5 },
          { name: 'Global Perspectives', code: 'CAM-G01', isMandatory: true, department: 'Humanities', weeklyPeriods: 3 },
          { name: 'Computer Science', code: 'CAM-CS1', isMandatory: false, department: 'Applied Tech', weeklyPeriods: 4 },
          { name: 'Economics & Business Studies', code: 'CAM-B01', isMandatory: false, department: 'Commerce', weeklyPeriods: 3 },
          { name: 'Art & Design', code: 'CAM-A01', isMandatory: false, department: 'Creative Arts', weeklyPeriods: 3 },
          { name: 'World Literature', code: 'CAM-L01', isMandatory: false, department: 'Languages', weeklyPeriods: 2 },
        ];
      }

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
      toast.success(`Loaded ${presetUnits.length} official curriculum units for ${currentSchool.name}!`, { id: toastId });
    } catch (err) {
      console.error('Error seeding units:', err);
      toast.error('Failed to load standard units', { id: toastId });
    } finally {
      setSeedingCurriculum(false);
    }
  };

  // Filtered Units
  const filteredUnits = subjects.filter((u) => {
    const q = (unitSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.code || '').toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q));

    const matchesType =
      unitTypeFilter === 'all' ||
      (unitTypeFilter === 'mandatory' && u.isMandatory) ||
      (unitTypeFilter === 'optional' && !u.isMandatory);

    const matchesDept = unitDeptFilter === 'all' || u.department === unitDeptFilter;

    return matchesSearch && matchesType && matchesDept;
  });

  const departments = Array.from(new Set(subjects.map((s) => s.department).filter(Boolean))) as string[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Academic Structure &amp; Curriculum Units
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional curriculum management for <strong>{currentSchool?.name || 'School'}</strong> •{' '}
            Curriculum: <span className="font-semibold text-slate-700">{currentSchool?.curriculumType || 'CBC / National'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'classes' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddClassModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
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
              >
                Load Standard Units
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddUnitModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Unit / Subject
              </Button>
            </div>
          )}
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
        <div>
          {classes.length === 0 ? (
            <Card className="text-center py-12 text-slate-500">
              <Layers className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base font-semibold text-slate-900">No classes configured yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Set up your grade levels, streams, and curriculum structure for {currentSchool?.name}.
              </p>
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddClassModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add First Class
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map((cls) => {
                const percentFull = Math.round((cls.enrolled / cls.capacity) * 100);
                const classUnits = subjects.filter(
                  (u) =>
                    !u.applicableClasses ||
                    u.applicableClasses.length === 0 ||
                    u.applicableClasses.includes('all') ||
                    u.applicableClasses.includes(cls.name)
                );
                return (
                  <Card key={cls.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">{cls.name}</h3>
                          <span className="text-2xs font-semibold text-slate-500 block mt-0.5">{cls.level}</span>
                        </div>
                        <Badge variant="brand">{cls.streams.length} Stream(s)</Badge>
                      </div>

                      {/* Streams list */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cls.streams.map((str, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-2xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            Stream: {str}
                          </span>
                        ))}
                      </div>

                      {/* Assigned Curriculum Units */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-bold text-slate-700 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-[#1d5f99]" />
                            Curriculum Units:
                          </span>
                          <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#1d5f99] border border-blue-200">
                            {classUnits.length} Assigned
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {classUnits.slice(0, 3).map((u) => (
                            <span
                              key={u.id || u.code}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 truncate max-w-[120px]"
                              title={u.name}
                            >
                              {u.name}
                            </span>
                          ))}
                          {classUnits.length > 3 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                              +{classUnits.length - 3} more
                            </span>
                          )}
                          {classUnits.length === 0 && (
                            <span className="text-[10px] text-amber-600 italic">No units assigned yet</span>
                          )}
                        </div>
                      </div>

                      {/* Enrollment status bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-2xs">
                          <span className="text-slate-500 font-medium">Enrolled Capacity</span>
                          <span className="font-bold text-slate-800">
                            {cls.enrolled} / {cls.capacity} Learners ({percentFull}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentFull > 90 ? 'bg-amber-500' : 'bg-[#1d5f99]'
                            }`}
                            style={{ width: `${Math.min(percentFull, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-2xs text-slate-500 gap-2">
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cls.classTeacher}</span>
                      </span>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenManageClassUnits(cls)}
                        leftIcon={<FolderTree className="w-3.5 h-3.5 text-[#1d5f99]" />}
                        className="text-2xs py-1 h-7 font-bold"
                      >
                        Manage Class Units
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
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
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
                    <span className="text-slate-600 truncate max-w-[120px]">
                      Teacher: <strong className="text-slate-800">{sub.teacherName || 'Departmental Staff'}</strong>
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
      {/* MODAL: ADD NEW CLASS                                         */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        title="Add Academic Class Stream"
        description="Establish a new grade level, section, or stream in the school structure."
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <Input
            label="Class Title / Name"
            placeholder="e.g. Grade 5, Form 2, Nursery Blue"
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
                { label: 'Early Years (Pre-Primary / PP1 - PP2)', value: 'Early Years' },
                { label: 'Lower Primary (Grade 1 - 3)', value: 'Lower Primary' },
                { label: 'Upper Primary (Grade 4 - 6)', value: 'Upper Primary' },
                { label: 'Junior School (Grade 7 - 9)', value: 'Junior School' },
                { label: 'Senior School / Secondary', value: 'Senior School' },
                { label: 'IGCSE / Cambridge Stage', value: 'Cambridge Stage' },
              ]}
            />
            <Input
              label="Stream Name"
              placeholder="e.g. North, Blue, Sapphire"
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
            />
          </div>

          <Input
            label="Target Class Capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            min="10"
            max="120"
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingClass}>
              Create Class Stream
            </Button>
          </div>
        </form>
      </Modal>

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

          <Input
            label="Assigned Lead Teacher"
            placeholder="e.g. Mr. Peter Kamau, Mrs. Joyce Otieno"
            value={unitTeacher}
            onChange={(e) => setUnitTeacher(e.target.value)}
          />

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
              Mandatory units are auto-assigned to all learners in the designated level. Optional units allow individual student selection.
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
          description={`Configure which learning areas are active for ${managingUnitsForClass.name}. Students in this class will only be evaluated on these units in marks entry and report cards.`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Quick Actions Bar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Quick Actions ({classUnitsSelection.length} of {subjects.length} units active):
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsAddUnitForClassOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-[#1d5f99]" />}
                  className="text-2xs py-1 h-7"
                >
                  Add Custom Unit For This Class
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllUnitsForClass}
                  className="text-2xs px-2.5 py-1 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition"
                >
                  Select All Units ({subjects.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectCoreUnitsForClass}
                  className="text-2xs px-2.5 py-1 rounded-md font-bold bg-blue-50 text-[#1d5f99] border border-blue-200 hover:bg-blue-100 transition"
                >
                  Core / Mandatory Only ({subjects.filter((s) => s.isMandatory).length})
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
      {/* MODAL: ADD CUSTOM UNIT SPECIFICALLY FOR CLASS                */}
      {/* ============================================================ */}
      {isAddUnitForClassOpen && managingUnitsForClass && (
        <Modal
          isOpen={isAddUnitForClassOpen}
          onClose={() => setIsAddUnitForClassOpen(false)}
          title={`Add Unit Specifically for ${managingUnitsForClass.name}`}
          description={`Create a specialized subject (e.g. French, Coding, Art) tailored specifically to ${managingUnitsForClass.name}.`}
        >
          <form onSubmit={handleAddUnitForClassSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Unit Name"
                placeholder="e.g. Aviation Studies, German"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                required
              />
              <Input
                label="Unit Code"
                placeholder="e.g. AVI-301, GER-101"
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Department"
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

            <Input
              label="Assigned Lead Teacher"
              placeholder="e.g. Mr. Peter Kamau"
              value={unitTeacher}
              onChange={(e) => setUnitTeacher(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsAddUnitForClassOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Create &amp; Assign to {managingUnitsForClass.name}
              </Button>
            </div>
          </form>
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

            <Input
              label="Assigned Lead Teacher"
              value={editUnitTeacher}
              onChange={(e) => setEditUnitTeacher(e.target.value)}
            />

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
