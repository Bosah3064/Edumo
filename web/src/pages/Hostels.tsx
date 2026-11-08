import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
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
  Home,
  Plus,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  Bed,
  Moon,
  ShieldCheck,
  UserCheck,
  Phone,
  Trash2,
  Pencil,
  Eye,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isSampleHostel,
  purgeMockSchoolData,
  wipeAllSchoolHostels,
} from '../utils/databaseInitializer';

export interface HostelDorm {
  id: string;
  name: string;
  gender: 'boys' | 'girls' | 'co-ed';
  housemaster: string;
  capacity: number;
  occupied: number;
  roomCount?: number;
  rollCallStatusToday: 'completed' | 'pending';
  lastRollCallDate?: string;
  prefectName?: string;
}

export interface BoardingAllocation {
  id: string;
  dormId: string;
  dormName: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  roomNumber: string;
  bedNumber: string;
  guardianPhone?: string;
  medicalNotes?: string;
  allocatedDate: string;
}

interface StaffOption {
  id: string;
  name: string;
  roleTitle?: string;
}

interface StudentOption {
  id: string;
  name: string;
  admissionNumber: string;
  className: string;
  guardianPhone?: string;
}

export const Hostels: React.FC = () => {
  const { organization, currentSchool, currentRole, isStudent, studentProfile } = useTenant();
  const { currentUser } = useAuth();

  const isStudentUser = isStudent || currentRole === 'student' || (currentRole as string) === 'learner';

  // Active view: 'dorms' | 'allocations'
  const [activeTab, setActiveTab] = useState<'dorms' | 'allocations'>('dorms');

  // Real Dorms State
  const [dorms, setDorms] = useState<HostelDorm[]>([]);
  const [loadingDorms, setLoadingDorms] = useState(true);
  const [dormSearch, setDormSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  // Real Allocations State
  const [allocations, setAllocations] = useState<BoardingAllocation[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(true);
  const [allocationSearch, setAllocationSearch] = useState('');
  const [selectedDormFilter, setSelectedDormFilter] = useState('all');

  const myAllocation = useMemo(() => {
    if (!isStudentUser || !studentProfile) return null;
    return allocations.find(
      (a) =>
        (studentProfile.admissionNumber && a.admissionNo?.toLowerCase().trim() === studentProfile.admissionNumber.toLowerCase().trim()) ||
        (studentProfile.id && a.studentId === studentProfile.id) ||
        (studentProfile.firstName && a.studentName?.toLowerCase().includes(studentProfile.firstName.toLowerCase()))
    );
  }, [allocations, isStudentUser, studentProfile]);

  // Real Staff for Housemaster/Matron
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  // Real Students for Boarding Allocation
  const [students, setStudents] = useState<StudentOption[]>([]);

  // Modals
  const [isRegisterDormModalOpen, setIsRegisterDormModalOpen] = useState(false);
  const [dormName, setDormName] = useState('');
  const [dormGender, setDormGender] = useState<'boys' | 'girls' | 'co-ed'>('boys');
  const [dormHousemaster, setDormHousemaster] = useState('Unassigned');
  const [dormCapacity, setDormCapacity] = useState('64');
  const [dormRooms, setDormRooms] = useState('8');
  const [dormPrefect, setDormPrefect] = useState('');
  const [savingDorm, setSavingDorm] = useState(false);

  // Allocate Student Modal
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocateDormId, setAllocateDormId] = useState('');
  const [allocateAdmission, setAllocateAdmission] = useState('');
  const [allocateRoom, setAllocateRoom] = useState('Room 1');
  const [allocateBed, setAllocateBed] = useState('Bed 1');
  const [allocateMedical, setAllocateMedical] = useState('');
  const [savingAllocation, setSavingAllocation] = useState(false);

  // View Residents Modal
  const [viewingDormResidents, setViewingDormResidents] = useState<HostelDorm | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [dormToDelete, setDormToDelete] = useState<HostelDorm | null>(null);
  const [isDeleteDormModalOpen, setIsDeleteDormModalOpen] = useState(false);
  const [isWipeAllDormsModalOpen, setIsWipeAllDormsModalOpen] = useState(false);
  const [isWipingAllDorms, setIsWipingAllDorms] = useState(false);

  // 1. Listen to real dormitories in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const dormsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'hostels'
    );

    const unsubDorms = onSnapshot(
      dormsRef,
      (snap) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const list: HostelDorm[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Dormitory',
            gender: data.gender || 'boys',
            housemaster: data.housemaster || 'Unassigned Housemaster',
            capacity: Number(data.capacity) || 64,
            occupied: Number(data.occupied) || 0,
            roomCount: Number(data.roomCount) || 8,
            rollCallStatusToday: data.lastRollCallDate === todayStr ? (data.rollCallStatusToday || 'completed') : 'pending',
            lastRollCallDate: data.lastRollCallDate,
            prefectName: data.prefectName || 'Student Captain',
          };
        });

        setDorms(list);
        setLoadingDorms(false);
      },
      (err) => {
        console.warn('Error reading hostels:', err);
        setLoadingDorms(false);
      }
    );

    return () => unsubDorms();
  }, [organization, currentSchool]);

  // 2. Listen to real boarding allocations in Firestore
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const allocRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'hostel_allocations'
    );

    const unsubAlloc = onSnapshot(
      allocRef,
      (snap) => {
        const list: BoardingAllocation[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            dormId: data.dormId || '',
            dormName: data.dormName || 'Dormitory',
            studentId: data.studentId || '',
            studentName: data.studentName || 'Student',
            admissionNo: data.admissionNo || '',
            className: data.className || 'Grade 4',
            roomNumber: data.roomNumber || 'Room 1',
            bedNumber: data.bedNumber || 'Bed 1',
            guardianPhone: data.guardianPhone || '',
            medicalNotes: data.medicalNotes || '',
            allocatedDate: data.allocatedDate || new Date().toISOString().split('T')[0],
          };
        });

        setAllocations(list);
        setLoadingAllocations(false);
      },
      (err) => {
        console.warn('Error reading hostel allocations:', err);
        setLoadingAllocations(false);
      }
    );

    return () => unsubAlloc();
  }, [organization, currentSchool]);

  // 3. Listen to staff for Housemaster selection
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
        const list: StaffOption[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || data.fullName || 'Staff Member',
            roleTitle: data.roleTitle || data.role || 'Faculty',
          };
        });
        setStaffOptions(list);
      },
      (err) => {
        console.warn('Error fetching staff for hostel assignment:', err);
      }
    );

    return () => unsubStaff();
  }, [organization, currentSchool]);

  // 4. Listen to students for allocation
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
        const list: StudentOption[] = snap.docs.map((d) => {
          const data = d.data();
          const phone =
            data.guardianPhone ||
            (data.emergencyContacts && data.emergencyContacts[0]?.phone) ||
            '';
          return {
            id: d.id,
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Learner',
            admissionNumber: data.admissionNumber || '',
            className: data.currentClassId || 'Grade 4',
            guardianPhone: phone,
          };
        });
        setStudents(list);
      },
      (err) => {
        console.warn('Error fetching students for hostel allocation:', err);
      }
    );

    return () => unsubStudents();
  }, [organization, currentSchool]);

  // Handle Register Hostel / Dormitory
  const handleRegisterDorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dormName.trim()) {
      toast.error('Hostel/Dormitory name is required');
      return;
    }
    if (!organization || !currentSchool) return;

    setSavingDorm(true);
    const toastId = toast.loading('Registering boarding hostel...');

    try {
      const dormId = `drm-${Date.now()}`;
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'hostels',
        dormId
      );

      await setDoc(docRef, {
        name: dormName.trim(),
        gender: dormGender,
        housemaster: dormHousemaster,
        capacity: parseInt(dormCapacity) || 64,
        occupied: 0,
        roomCount: parseInt(dormRooms) || 8,
        rollCallStatusToday: 'pending',
        prefectName: dormPrefect.trim() || 'Student Captain',
        createdAt: serverTimestamp(),
      });

      toast.success(`Hostel "${dormName.trim()}" registered!`, { id: toastId });
      setIsRegisterDormModalOpen(false);
      setDormName('');
      setDormPrefect('');
      setDormCapacity('64');
      setDormHousemaster('Unassigned');
    } catch (err) {
      console.error('Error registering hostel:', err);
      toast.error('Failed to register hostel', { id: toastId });
    } finally {
      setSavingDorm(false);
    }
  };

  // Handle Allocate Student Bed
  const handleAllocateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocateDormId) {
      toast.error('Please select a destination hostel');
      return;
    }
    if (!allocateAdmission) {
      toast.error('Please choose a student to allocate');
      return;
    }
    if (!organization || !currentSchool) return;

    const targetDorm = dorms.find((d) => d.id === allocateDormId);
    if (!targetDorm) {
      toast.error('Selected hostel not found');
      return;
    }
    if (targetDorm.occupied >= targetDorm.capacity) {
      toast.error(`Hostel "${targetDorm.name}" has reached full bed capacity`);
      return;
    }

    const targetStudent = students.find((s) => s.admissionNumber === allocateAdmission);
    if (!targetStudent) {
      toast.error('Selected learner not found');
      return;
    }

    setSavingAllocation(true);
    const toastId = toast.loading('Allocating boarding bed...');

    try {
      const allocId = `alc-${Date.now()}`;
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'hostel_allocations',
        allocId
      );

      await setDoc(docRef, {
        dormId: targetDorm.id,
        dormName: targetDorm.name,
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        admissionNo: targetStudent.admissionNumber,
        className: targetStudent.className,
        roomNumber: allocateRoom.trim() || 'Room 1',
        bedNumber: allocateBed.trim() || 'Bed 1',
        guardianPhone: targetStudent.guardianPhone || '',
        medicalNotes: allocateMedical.trim() || 'No active medical restrictions',
        allocatedDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      // Update occupied count in dorm doc
      const dormDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'hostels',
        targetDorm.id
      );

      await updateDoc(dormDocRef, {
        occupied: targetDorm.occupied + 1,
        updatedAt: serverTimestamp(),
      });

      toast.success(`${targetStudent.name} assigned to ${targetDorm.name}!`, { id: toastId });
      setIsAllocateModalOpen(false);
      setAllocateAdmission('');
      setAllocateMedical('');
    } catch (err) {
      console.error('Error allocating bed:', err);
      toast.error('Failed to allocate student bed', { id: toastId });
    } finally {
      setSavingAllocation(false);
    }
  };

  // Toggle Night Roll Call
  const handleToggleRollCall = async (dorm: HostelDorm) => {
    if (!organization || !currentSchool) return;
    const newStatus = dorm.rollCallStatusToday === 'completed' ? 'pending' : 'completed';
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const dormDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'hostels',
        dorm.id
      );

      await updateDoc(dormDocRef, {
        rollCallStatusToday: newStatus,
        lastRollCallDate: todayStr,
        updatedAt: serverTimestamp(),
      });

      toast.success(
        `${dorm.name} night roll call marked as ${newStatus.toUpperCase()}!`
      );
    } catch (err) {
      console.error('Error updating roll call:', err);
      toast.error('Failed to update roll call status');
    }
  };

  // Deallocate / Remove Student Bed
  const handleDeallocateStudent = async (alloc: BoardingAllocation) => {
    if (!organization || !currentSchool) return;
    if (!window.confirm(`Deallocate ${alloc.studentName} from ${alloc.dormName}?`)) return;

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'hostel_allocations',
        alloc.id
      );
      await deleteDoc(docRef);

      // Decrement occupied count in dorm if found
      const targetDorm = dorms.find((d) => d.id === alloc.dormId || d.name === alloc.dormName);
      if (targetDorm) {
        const dormDocRef = doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'hostels',
          targetDorm.id
        );
        await updateDoc(dormDocRef, {
          occupied: Math.max(0, targetDorm.occupied - 1),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`${alloc.studentName} deallocated from boarding wing`);
    } catch (err) {
      console.error('Error deallocating bed:', err);
      toast.error('Failed to remove boarding allocation');
    }
  };

  const hasSampleDorms = dorms.some(isSampleHostel);

  const handlePurgeSampleDorms = async () => {
    if (!organization?.id || !currentSchool?.id) return;
    setIsPurging(true);
    const toastId = toast.loading('Purging sample demonstration dormitories...');
    try {
      const res = await purgeMockSchoolData(db, organization.id, currentSchool.id);
      toast.success(`Wiped ${res.hostelsPurged} sample dormitories and demo records!`, { id: toastId });
    } catch (err) {
      console.error('Failed to purge sample dorms:', err);
      toast.error('Failed to purge sample dormitories', { id: toastId });
    } finally {
      setIsPurging(false);
    }
  };

  const handleDeleteDorm = async () => {
    if (!organization?.id || !currentSchool?.id || !dormToDelete) return;
    const toastId = toast.loading(`Deleting "${dormToDelete.name}"...`);
    try {
      await deleteDoc(
        doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'hostels',
          dormToDelete.id
        )
      );
      toast.success(`"${dormToDelete.name}" deleted successfully.`, { id: toastId });
      setIsDeleteDormModalOpen(false);
      setDormToDelete(null);
    } catch (err) {
      console.error('Error deleting dorm:', err);
      toast.error('Failed to delete dormitory', { id: toastId });
    }
  };

  const handleWipeAllDorms = async () => {
    if (!organization?.id || !currentSchool?.id) return;
    setIsWipingAllDorms(true);
    const toastId = toast.loading('Wiping all dormitories for this school...');
    try {
      const res = await wipeAllSchoolHostels(db, organization.id, currentSchool.id);
      toast.success(`Wiped all ${res.deletedCount} dormitories. Clean slate ready!`, { id: toastId });
      setIsWipeAllDormsModalOpen(false);
    } catch (err) {
      console.error('Failed to wipe dormitories:', err);
      toast.error('Failed to wipe dormitories', { id: toastId });
    } finally {
      setIsWipingAllDorms(false);
    }
  };

  // Metrics
  const totalHostels = dorms.length;
  const totalCapacity = dorms.reduce((sum, d) => sum + d.capacity, 0);
  const totalOccupied = dorms.reduce((sum, d) => sum + d.occupied, 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const rollCallCompletedCount = dorms.filter((d) => d.rollCallStatusToday === 'completed').length;

  // Filtered Dorms
  const filteredDorms = dorms.filter((d) => {
    const q = (dormSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.housemaster || '').toLowerCase().includes(q) ||
      ((d.prefectName || '').toLowerCase().includes(q));

    const matchesGender = genderFilter === 'all' || d.gender === genderFilter;

    return matchesSearch && matchesGender;
  });

  // Filtered Allocations
  const filteredAllocations = allocations.filter((a) => {
    const q = (allocationSearch || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (a.studentName || '').toLowerCase().includes(q) ||
      (a.admissionNo || '').toLowerCase().includes(q) ||
      (a.dormName || '').toLowerCase().includes(q) ||
      (a.roomNumber || '').toLowerCase().includes(q);

    const matchesDorm = selectedDormFilter === 'all' || a.dormId === selectedDormFilter || a.dormName === selectedDormFilter;

    return matchesSearch && matchesDorm;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-sm">
              <Home className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              Hostels &amp; Boarding Wing Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dormitory registration, student bed allocations, night roll call inspections, and matron oversight for <strong>{currentSchool?.name || 'School'}</strong>
          </p>
        </div>

        {!isStudentUser && (
          <div className="flex items-center gap-2.5">
            {dorms.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWipeAllDormsModalOpen(true)}
                leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
                className="font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                Wipe All Dorms
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAllocateModalOpen(true)}
              leftIcon={<Bed className="w-4 h-4 text-emerald-600" />}
              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            >
              Allocate Student Bed
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRegisterDormModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="shadow-sm"
            >
              Register New Hostel
            </Button>
          </div>
        )}
      </div>

      {/* Sample demonstration dorms detection banner with 1-click purge */}
      {hasSampleDorms && !isStudentUser && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm text-amber-950">
                Sample Demonstration Dormitories Detected
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Demonstration dorms (e.g. Kilimanjaro House, Serengeti House) are detected in this school branch. Click to wipe all sample boarding records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              variant="danger"
              size="sm"
              onClick={handlePurgeSampleDorms}
              isLoading={isPurging}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="font-bold whitespace-nowrap shadow-xs"
            >
              Wipe Sample Dorms
            </Button>
          </div>
        </div>
      )}

      {/* Student View: My Boarding Allocation */}
      {isStudentUser ? (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {studentProfile?.fullName ? `${studentProfile.fullName}'s Boarding Accommodation` : 'My Boarding Status'}
                    </h2>
                    <Badge variant={myAllocation ? 'success' : 'neutral'}>
                      {myAllocation ? 'Boarding Resident' : 'Day Scholar'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Admission: <strong>{studentProfile?.admissionNumber || 'ADM-000'}</strong> • {currentSchool?.name || 'School Campus'}
                  </p>
                </div>
              </div>
            </div>

            {myAllocation ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-200/60">
                <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <span className="text-2xs font-bold uppercase text-slate-400 block">Dormitory / Wing</span>
                  <span className="text-base font-extrabold text-indigo-900 flex items-center gap-1.5 mt-1">
                    <Building className="w-4 h-4 text-indigo-600" /> {myAllocation.dormName}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <span className="text-2xs font-bold uppercase text-slate-400 block">Room &amp; Bed Number</span>
                  <span className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 mt-1">
                    <Bed className="w-4 h-4 text-emerald-600" /> {myAllocation.roomNumber} • {myAllocation.bedNumber}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <span className="text-2xs font-bold uppercase text-slate-400 block">Housemaster / Matron</span>
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                    <UserCheck className="w-4 h-4 text-blue-600" /> {dorms.find((d) => d.id === myAllocation.dormId)?.housemaster || 'Assigned Housemaster'}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <span className="text-2xs font-bold uppercase text-slate-400 block">Special Diet / Medical</span>
                  <span className="text-xs font-semibold text-slate-700 block mt-1 line-clamp-2">
                    {myAllocation.medicalNotes || 'No special dietary/medical notes recorded.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-6 rounded-xl bg-white border border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-800">You are currently registered as a Day Scholar.</p>
                <p className="text-xs text-slate-500 mt-1">No boarding wing or bed has been assigned. Please consult the school boarding office if you are a boarding resident.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Hostels */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Hostel Buildings
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Building className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalHostels}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              Registered dormitories on campus
            </p>
          </div>
        </div>

        {/* Card 2: Total Bed Capacity */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Total Bed Capacity
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Bed className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalCapacity}</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              Boarder beds in all wings
            </p>
          </div>
        </div>

        {/* Card 3: Boarding Occupancy */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Boarding Occupancy
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalOccupied}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              {occupancyPct}% occupied ({totalCapacity - totalOccupied} vacant beds)
            </p>
          </div>
        </div>

        {/* Card 4: Night Roll Call Status */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-100">
              Night Roll Call
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Moon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">
              {rollCallCompletedCount}/{totalHostels}
            </div>
            <p className="text-xs text-amber-100 mt-1 font-medium">
              {rollCallCompletedCount === totalHostels ? 'All dorms accounted for tonight' : 'Pending evening headcount'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dorms')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'dorms'
              ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Hostel Dormitories ({dorms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('allocations')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
            activeTab === 'allocations'
              ? 'border-[#1d5f99] text-[#1d5f99] bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bed className="w-4 h-4" />
          <span>Student Bed Allocations ({allocations.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: DORMITORIES LIST                                      */}
      {/* ============================================================ */}
      {activeTab === 'dorms' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4 bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dormSearch}
                  onChange={(e) => setDormSearch(e.target.value)}
                  placeholder="Search hostels by name, housemaster, or captain..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setGenderFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    genderFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Dorms
                </button>
                <button
                  onClick={() => setGenderFilter('boys')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    genderFilter === 'boys'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Boys Wings
                </button>
                <button
                  onClick={() => setGenderFilter('girls')}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                    genderFilter === 'girls'
                      ? 'bg-fuchsia-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Girls Wings
                </button>
              </div>
            </div>
          </Card>

          {loadingDorms ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading boarding hostels...</p>
            </div>
          ) : filteredDorms.length === 0 ? (
            <Card className="text-center py-12 text-slate-500">
              <Home className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900">No boarding hostels registered</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Set up campus dormitories, assign housemasters, and allocate beds for boarding learners.
              </p>
              <div className="mt-4">
                <Button size="sm" variant="primary" onClick={() => setIsRegisterDormModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Register First Hostel
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDorms.map((dorm) => {
                const occupancyPercent = dorm.capacity > 0 ? Math.round((dorm.occupied / dorm.capacity) * 100) : 0;
                const isBoys = dorm.gender === 'boys';

                return (
                  <Card key={dorm.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-slate-200">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">{dorm.name}</h3>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                isBoys
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                              }`}
                            >
                              {dorm.gender.toUpperCase()} WING
                            </span>
                          </div>
                          <span className="text-2xs font-semibold text-slate-500 block mt-1">
                            Housemaster / Matron: <strong className="text-slate-800">{dorm.housemaster}</strong>
                          </span>
                        </div>

                        {/* Night Roll Call Button */}
                        <button
                          onClick={() => handleToggleRollCall(dorm)}
                          title="Click to toggle roll call status"
                          className="transition-transform hover:scale-105 shrink-0"
                        >
                          {dorm.rollCallStatusToday === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Checked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Capacity and details */}
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                        <div className="flex justify-between text-2xs font-semibold">
                          <span className="text-slate-500">Boarder Bed Occupancy</span>
                          <span className="font-extrabold text-slate-900">
                            {dorm.occupied} / {dorm.capacity} Beds ({occupancyPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              occupancyPercent > 90
                                ? 'bg-amber-500'
                                : isBoys
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                : 'bg-gradient-to-r from-fuchsia-600 to-pink-600'
                            }`}
                            style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 text-2xs">
                          <div>
                            <span className="text-slate-400 block font-semibold">Rooms / Cubicles</span>
                            <span className="font-bold text-slate-800">{dorm.roomCount || 8} Rooms</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold">Dorm Captain</span>
                            <span className="font-bold text-slate-800 truncate block">{dorm.prefectName || 'Student Prefect'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setViewingDormResidents(dorm)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-[#1d5f99]" />}
                        className="text-2xs py-1 h-7 font-bold flex-1"
                      >
                        View Residents ({dorm.occupied})
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAllocateDormId(dorm.id);
                          setIsAllocateModalOpen(true);
                        }}
                        leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                        className="text-2xs py-1 h-7 font-bold flex-1"
                      >
                        Allocate Bed
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setDormToDelete(dorm);
                          setIsDeleteDormModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                        title="Delete Dormitory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: STUDENT ALLOCATIONS                                   */}
      {/* ============================================================ */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <Card className="p-4 bg-white/80 backdrop-blur-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={allocationSearch}
                  onChange={(e) => setAllocationSearch(e.target.value)}
                  placeholder="Search by learner name, admission no, room, or hostel..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold text-slate-400 uppercase">Hostel:</span>
                <select
                  value={selectedDormFilter}
                  onChange={(e) => setSelectedDormFilter(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
                >
                  <option value="all">All Hostels</option>
                  {dorms.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {loadingAllocations ? (
            <div className="py-16 text-center text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading student bed allocations...</p>
            </div>
          ) : filteredAllocations.length === 0 ? (
            <Card className="text-center py-10 text-slate-500">
              <p className="text-xs font-semibold">No bed allocations match "{allocationSearch || selectedDormFilter}"</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10.5px]">
                    <th className="py-3 px-4">Boarder Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Hostel / Dorm</th>
                    <th className="py-3 px-4">Room &amp; Bed</th>
                    <th className="py-3 px-4">Guardian Contact</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{alloc.studentName}</span>
                        <span className="font-mono text-2xs text-slate-500">{alloc.admissionNo}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{alloc.className}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{alloc.dormName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100 inline-block">
                          {alloc.roomNumber} • {alloc.bedNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {alloc.guardianPhone || 'No contact'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeallocateStudent(alloc)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Deallocate Bed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* ============================================================ */}
      {/* MODAL: REGISTER NEW HOSTEL / DORMITORY                       */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRegisterDormModalOpen}
        onClose={() => setIsRegisterDormModalOpen(false)}
        title="Register Hostel / Dormitory"
        description="Establish a new student residential house, cubicle capacity, and housemaster."
      >
        <form onSubmit={handleRegisterDorm} className="space-y-4">
          <Input
            label="Hostel / House Name"
            placeholder="e.g. Mount Kenya House, Serengeti Girls Dorm"
            value={dormName}
            onChange={(e) => setDormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Gender Designation"
              value={dormGender}
              onChange={(e) => setDormGender(e.target.value as any)}
              options={[
                { label: 'Boys House', value: 'boys' },
                { label: 'Girls House', value: 'girls' },
                { label: 'Junior School Co-Ed', value: 'co-ed' },
              ]}
            />
            <Input
              label="Total Bed Capacity"
              type="number"
              value={dormCapacity}
              onChange={(e) => setDormCapacity(e.target.value)}
              min="10"
              max="200"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Housemaster / Matron</label>
              <select
                value={dormHousemaster}
                onChange={(e) => setDormHousemaster(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Unassigned">Unassigned (Assign Later)</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.roleTitle || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Number of Rooms / Wings"
              type="number"
              value={dormRooms}
              onChange={(e) => setDormRooms(e.target.value)}
              min="1"
              max="50"
              required
            />
          </div>

          <Input
            label="House Prefect / Captain"
            placeholder="e.g. Student Prefect (Head of House)"
            value={dormPrefect}
            onChange={(e) => setDormPrefect(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsRegisterDormModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingDorm} leftIcon={<Plus className="w-4 h-4" />}>
              Save Hostel to Campus
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: ALLOCATE STUDENT BED                                  */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title="Allocate Boarding Bed"
        description="Assign a learner to a specific dormitory, room cubicle, and bed space."
      >
        <form onSubmit={handleAllocateStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Target Hostel / Dormitory</label>
            <select
              value={allocateDormId}
              onChange={(e) => setAllocateDormId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">-- Choose destination hostel --</option>
              {dorms.map((d) => (
                <option key={d.id} value={d.id} disabled={d.occupied >= d.capacity}>
                  {d.name} ({d.gender.toUpperCase()} • {d.capacity - d.occupied} beds vacant)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Select Enrolled Student</label>
            <select
              value={allocateAdmission}
              onChange={(e) => setAllocateAdmission(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">-- Choose student from directory --</option>
              {students.map((s) => (
                <option key={s.id} value={s.admissionNumber}>
                  {s.name} ({s.admissionNumber} • {s.className})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Room / Cubicle No."
              placeholder="e.g. Room 4, Cubicle B"
              value={allocateRoom}
              onChange={(e) => setAllocateRoom(e.target.value)}
              required
            />
            <Input
              label="Bed Number / Position"
              placeholder="e.g. Bed 2A (Lower), Bunk 1"
              value={allocateBed}
              onChange={(e) => setAllocateBed(e.target.value)}
              required
            />
          </div>

          <Input
            label="Medical or Dietary Notes"
            placeholder="e.g. Asthmatic (inhaler in cubicle), Peanut allergy"
            value={allocateMedical}
            onChange={(e) => setAllocateMedical(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingAllocation} leftIcon={<Check className="w-4 h-4" />}>
              Confirm Bed Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: VIEW DORM RESIDENTS                                   */}
      {/* ============================================================ */}
      {viewingDormResidents && (
        <Modal
          isOpen={viewingDormResidents !== null}
          onClose={() => setViewingDormResidents(null)}
          title={`Boarding Residents — ${viewingDormResidents.name}`}
          description={`Housemaster: ${viewingDormResidents.housemaster} • ${viewingDormResidents.occupied} of ${viewingDormResidents.capacity} beds occupied.`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {allocations.filter((a) => a.dormId === viewingDormResidents.id || a.dormName === viewingDormResidents.name).length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                No learners currently allocated to {viewingDormResidents.name}. Click "Allocate Bed" to assign students.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {allocations
                  .filter((a) => a.dormId === viewingDormResidents.id || a.dormName === viewingDormResidents.name)
                  .map((res) => (
                    <div key={res.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{res.studentName}</span>
                        <span className="text-2xs text-slate-500 font-mono">
                          {res.admissionNo} • {res.className} • Guardian: {res.guardianPhone || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-2xs border border-blue-100">
                          {res.roomNumber} - {res.bedNumber}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <Button type="button" variant="primary" onClick={() => setViewingDormResidents(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Dormitory Modal */}
      <Modal
        isOpen={isDeleteDormModalOpen}
        onClose={() => {
          setIsDeleteDormModalOpen(false);
          setDormToDelete(null);
        }}
        title="Delete Dormitory"
        description="Permanently remove this hostel block from the campus"
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <p className="font-bold">Are you sure you want to delete this dormitory?</p>
            <p className="mt-1 font-semibold text-rose-800">
              {dormToDelete?.name} ({dormToDelete?.capacity} Beds)
            </p>
            <p className="mt-1 text-slate-500">
              This action cannot be undone. Any active resident bed allocations in this dorm will also be deallocated.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteDormModalOpen(false);
                setDormToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteDorm}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Wipe All Dorms Modal */}
      <Modal
        isOpen={isWipeAllDormsModalOpen}
        onClose={() => setIsWipeAllDormsModalOpen(false)}
        title="Wipe All Dormitories"
        description="Clear all boarding blocks and resident bed allocations"
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <p className="font-black text-rose-950">⚠️ WARNING: Irreversible Operation</p>
            <p className="mt-1 text-slate-700">
              This will permanently delete <strong>all {dorms.length} hostel dormitories</strong> and all resident bed allocations in{' '}
              <strong>{currentSchool?.name || 'this school branch'}</strong>.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsWipeAllDormsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleWipeAllDorms}
              isLoading={isWipingAllDorms}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Wipe All {dorms.length} Hostels
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

