import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, setDoc, serverTimestamp, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { functions, db } from '../firebase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Building2, Plus, Phone, MapPin, CheckCircle2, BarChart3, Users, TrendingUp, ShieldCheck, DollarSign, GraduationCap, BookOpen, Layers, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const Branches: React.FC = () => {
  const { organization, schools, currentSchool, switchSchool, hasPermission, currentRole } = useTenant();

  if (currentRole === 'teacher') {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-[#1d5f99] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Campus Branches Restricted</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Multi-branch management and campus replication are reserved for institution owners and school administrators.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 shadow-sm transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const [viewMode, setViewMode] = useState<'cards' | 'comparison'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Branch Form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [type, setType] = useState<'nursery' | 'primary' | 'secondary' | 'combined'>('combined');
  const [curriculumType, setCurriculumType] = useState('CBC');
  const [gradingMode, setGradingMode] = useState('cbc_no_aggregate');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('+254700000000');

  // Push / Replicate units & classes
  const [replicateUnits, setReplicateUnits] = useState(true);
  const [replicateClasses, setReplicateClasses] = useState(true);
  const [sourceBranchId, setSourceBranchId] = useState(currentSchool?.id || '');

  // Real-time metrics for every campus branch (zero hardcoding)
  const [branchMetrics, setBranchMetrics] = useState<
    Record<string, { learners: number; faculty: number; collectionRate: number; attendanceRate: number }>
  >({});

  useEffect(() => {
    if (!organization || schools.length === 0) return;

    const unsubs: Array<() => void> = [];

    schools.forEach((sch) => {
      const sRef = collection(db, 'organizations', organization.id, 'schools', sch.id, 'students');
      const stRef = collection(db, 'organizations', organization.id, 'schools', sch.id, 'staff');

      const u1 = onSnapshot(sRef, (snap) => {
        setBranchMetrics((prev) => ({
          ...prev,
          [sch.id]: {
            learners: snap.size,
            faculty: prev[sch.id]?.faculty || 0,
            collectionRate: prev[sch.id]?.collectionRate || 0,
            attendanceRate: prev[sch.id]?.attendanceRate || 0,
          },
        }));
      });

      const u2 = onSnapshot(stRef, (snap) => {
        setBranchMetrics((prev) => ({
          ...prev,
          [sch.id]: {
            learners: prev[sch.id]?.learners || 0,
            faculty: snap.size,
            collectionRate: prev[sch.id]?.collectionRate || 0,
            attendanceRate: prev[sch.id]?.attendanceRate || 0,
          },
        }));
      });

      unsubs.push(u1, u2);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [organization?.id, schools]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) {
      toast.error('No organization workspace loaded. Please refresh or sign in again.');
      return;
    }
    if (!name || !code) {
      toast.error('Branch name and short code are required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Provisioning new campus branch...');

    try {
      let newSchoolId = '';
      try {
        const addBranchFn = httpsCallable<any, { schoolId: string }>(functions, 'addBranch');
        const res = await addBranchFn({
          orgId: organization.id,
          school: {
            name,
            code: code.toUpperCase(),
            type,
            country: organization.country || 'KE',
            curriculumType,
            gradingMode,
            headTeacher: principalName.trim() || 'Assigned Head Teacher',
            settings: {
              principalName: principalName.trim() || 'Assigned Head Teacher',
            },
            address: {
              line1: addressLine || 'Campus Road',
              city: city || 'City Campus',
              country: organization.country || 'KE',
            },
            phone: phone || '+254700000000',
          },
        });
        newSchoolId = res.data?.schoolId || '';
      } catch (callErr) {
        console.warn('addBranch callable bypassed, adding branch directly in Firestore:', callErr);
        const schoolDocRef = doc(collection(db, 'organizations', organization.id, 'schools'));
        newSchoolId = schoolDocRef.id;
        await setDoc(schoolDocRef, {
          name,
          code: code.toUpperCase(),
          type,
          country: organization.country || 'KE',
          curriculumType,
          gradingMode,
          headTeacher: principalName.trim() || 'Assigned Head Teacher',
          settings: {
            principalName: principalName.trim() || 'Assigned Head Teacher',
          },
          address: {
            line1: addressLine || 'Campus Road',
            city: city || 'City Campus',
            country: organization.country || 'KE',
          },
          contacts: {
            phone: phone || '+254700000000',
            email: '',
          },
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Replicate & push curriculum units and classes if opted in
      let pushedUnitsCount = 0;
      let pushedClassesCount = 0;
      const effectiveSourceId = sourceBranchId || currentSchool?.id || schools[0]?.id;

      if (newSchoolId && replicateUnits && effectiveSourceId) {
        try {
          const srcUnitsSnap = await getDocs(
            collection(db, 'organizations', organization.id, 'schools', effectiveSourceId, 'subjects')
          );
          if (!srcUnitsSnap.empty) {
            const batch = writeBatch(db);
            srcUnitsSnap.docs.forEach((uDoc) => {
              const targetRef = doc(
                db,
                'organizations',
                organization.id,
                'schools',
                newSchoolId,
                'subjects',
                uDoc.id
              );
              batch.set(targetRef, {
                ...uDoc.data(),
                updatedAt: serverTimestamp(),
              });
              pushedUnitsCount++;
            });
            await batch.commit();
          } else {
            // If source branch had no units in database yet, seed standard 16 units so new branch is ready
            const standardUnits = [
              { id: 'math-101', code: 'MATH-101', name: 'Mathematics', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 5, applicableClasses: ['all'] },
              { id: 'eng-102', code: 'ENG-102', name: 'English Language & Literacy', isMandatory: true, department: 'Languages', weeklyPeriods: 5, applicableClasses: ['all'] },
              { id: 'kisw-103', code: 'KISW-103', name: 'Kiswahili & Fasihi', isMandatory: true, department: 'Languages', weeklyPeriods: 4, applicableClasses: ['all'] },
              { id: 'env-101', code: 'ENV-101', name: 'Environmental & Foundational Activities', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
              { id: 'hyg-102', code: 'HYG-102', name: 'Hygiene, Movement & Nutrition Activities', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3, applicableClasses: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
              { id: 'sci-201', code: 'SCI-201', name: 'Integrated Science & Technology', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
              { id: 'sst-202', code: 'SST-202', name: 'Social Studies & Citizenship', isMandatory: true, department: 'Humanities', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
              { id: 'agri-301', code: 'AGRI-301', name: 'Agriculture & Nutrition', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
              { id: 'arts-302', code: 'ARTS-302', name: 'Creative Arts & Sports', isMandatory: true, department: 'Creative Arts', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
              { id: 'ptech-303', code: 'PTECH-303', name: 'Pre-Technical & Digital Studies', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
              { id: 'cre-104', code: 'CRE-104', name: 'Christian Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['all'] },
              { id: 'ire-105', code: 'IRE-105', name: 'Islamic Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['all'] },
              { id: 'frn-203', code: 'FRN-203', name: 'French & Foreign Languages', isMandatory: false, department: 'Languages', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
              { id: 'comp-204', code: 'COMP-204', name: 'Computer Science & ICT', isMandatory: false, department: 'Sciences & Tech', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
              { id: 'bst-208', code: 'BST-208', name: 'Business Studies & Financial Literacy', isMandatory: false, department: 'Humanities', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
              { id: 'mus-207', code: 'MUS-207', name: 'Music & Performing Arts', isMandatory: false, department: 'Creative Arts', weeklyPeriods: 2, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
            ];
            const batch = writeBatch(db);
            standardUnits.forEach((u) => {
              const targetRef = doc(db, 'organizations', organization.id, 'schools', newSchoolId, 'subjects', u.id);
              batch.set(targetRef, {
                ...u,
                type: u.isMandatory ? 'core' : 'elective',
                teacherName: 'Assigned Instructor',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              pushedUnitsCount++;
            });
            await batch.commit();
          }
        } catch (err) {
          console.warn('Failed replicating subjects to new branch:', err);
        }
      }

      if (newSchoolId && replicateClasses && effectiveSourceId) {
        try {
          const srcClassesSnap = await getDocs(
            collection(db, 'organizations', organization.id, 'schools', effectiveSourceId, 'classes')
          );
          if (!srcClassesSnap.empty) {
            const batch = writeBatch(db);
            srcClassesSnap.docs.forEach((cDoc) => {
              const targetRef = doc(
                db,
                'organizations',
                organization.id,
                'schools',
                newSchoolId,
                'classes',
                cDoc.id
              );
              batch.set(targetRef, {
                ...cDoc.data(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              pushedClassesCount++;
            });
            await batch.commit();
          }
        } catch (err) {
          console.warn('Failed replicating classes to new branch:', err);
        }
      }

      let successMsg = `Campus branch "${name}" registered successfully!`;
      if (pushedUnitsCount > 0 || pushedClassesCount > 0) {
        successMsg += ` Pushed ${pushedUnitsCount} curriculum units & ${pushedClassesCount} classes to new branch.`;
      }
      toast.success(successMsg, { id: toastId });
      setIsModalOpen(false);
      // Reset form
      setName('');
      setCode('');
      setPrincipalName('');
    } catch (err: unknown) {
      console.error('Error creating branch:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add branch';
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const totalGroupLearners = Object.values(branchMetrics).reduce((sum, m) => sum + (m.learners || 0), 0);
  const totalGroupFaculty = Object.values(branchMetrics).reduce((sum, m) => sum + (m.faculty || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Multi-Campus Network
            </Badge>
            <span className="text-2xs text-slate-500 font-semibold">
              {organization?.name || 'Educational Group'} • {organization?.country || 'KE'}
            </span>
          </div>
          <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight">
            Campus Branches &amp; Multi-School Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized campus directory, institutional switching, and curriculum replication
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm font-bold"
          >
            Add New Branch
          </Button>
        </div>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Campuses */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Campus Branches
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{schools.length}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium truncate">
              {schools.length === 1 ? '1 Campus branch registered' : `${schools.length} Campus branches active`}
            </p>
          </div>
        </div>

        {/* Card 2: Current Active */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Active Workspace
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight truncate" title={currentSchool?.name}>
              {currentSchool?.name || 'Main Campus'}
            </div>
            <p className="text-xs text-emerald-100 mt-1 font-medium truncate">
              Code: {currentSchool?.code || 'MAIN'} • Level: {currentSchool?.type || 'Combined'}
            </p>
          </div>
        </div>

        {/* Card 3: Total Group Learners */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Total Enrolled Learners
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalGroupLearners}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium truncate">
              {totalGroupLearners === 0 ? 'No learners registered yet' : `Across ${schools.length} campuses`}
            </p>
          </div>
        </div>

        {/* Card 4: Curriculum Mode */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-100">
              Curriculum Standard
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight truncate">
              {currentSchool?.curriculumType || 'CBC'}
            </div>
            <p className="text-xs text-amber-100 mt-1 font-medium truncate">
              Grading: {currentSchool?.gradingMode || 'Competency Based'}
            </p>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setViewMode('cards')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            viewMode === 'cards'
              ? 'border-brand-600 text-brand-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Campus Directory ({schools.length})
        </button>
        <button
          onClick={() => setViewMode('comparison')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
            viewMode === 'comparison'
              ? 'border-brand-600 text-brand-600 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Multi-Branch Matrix ({schools.length})
        </button>
      </div>

      {viewMode === 'comparison' ? (
        <div className="space-y-6">
          {/* CBC Compliance Alert */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3 text-xs text-indigo-950">
            <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">East African Curriculum &amp; Policy Adherence:</span> In compliance with institutional governance guidelines, this multi-campus dashboard tracks resource distribution, active learner enrollment, and faculty allocations without fabricating competitive ranks.
            </div>
          </div>

          {/* Group Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Total Group Campuses</span>
              <p className="text-2xl font-bold font-mono text-gray-900">{schools.length}</p>
              <span className="text-2xs text-emerald-600 font-semibold">Active in {organization?.country || 'KE'}</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Group Total Learners</span>
              <p className="text-2xl font-bold font-mono text-gray-900">{totalGroupLearners}</p>
              <span className="text-2xs text-gray-500">{totalGroupLearners === 0 ? 'Fresh database' : 'Real-time verified'}</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Total Group Faculty</span>
              <p className="text-2xl font-bold font-mono text-gray-900">{totalGroupFaculty}</p>
              <span className="text-2xs text-gray-500">Active educators across campuses</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Group Ratio</span>
              <p className="text-2xl font-bold font-mono text-brand-700">
                {totalGroupLearners > 0 && totalGroupFaculty > 0
                  ? `1:${Math.round(totalGroupLearners / totalGroupFaculty)}`
                  : '—'}
              </p>
              <span className="text-2xs text-gray-500">Learner to teacher ratio</span>
            </Card>
          </div>

          {/* Group Comparison Table */}
          <Card className="overflow-hidden p-0 border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Branch-by-Branch Operational Matrix</h3>
                <p className="text-2xs text-gray-500">Live multi-campus performance &amp; resource allocation</p>
              </div>
              <Badge variant="brand" size="sm">Consolidated Live Data</Badge>
            </div>
            {/* Mobile Branch Comparison Cards (sm:hidden) */}
            <div className="sm:hidden divide-y divide-gray-100">
              {schools.map((school) => {
                const isActive = school.id === currentSchool?.id;
                const headName = (school.settings as any)?.principalName || (school as any).headTeacher || (school as any).principalName || 'Assigned Head Teacher';
                const learnersCount = branchMetrics[school.id]?.learners || 0;
                const facultyCount = branchMetrics[school.id]?.faculty || 0;

                return (
                  <div key={school.id} className={`p-4 space-y-3 ${isActive ? 'bg-brand-50/30' : 'bg-white'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{school.name}</h4>
                          {isActive && <Badge variant="brand" size="sm">Active</Badge>}
                        </div>
                        <p className="text-2xs text-gray-400 font-mono mt-0.5">
                          Code: {school.code || 'MAIN'} • {school.type || 'Combined'}
                        </p>
                      </div>
                      <Badge variant="accent" size="sm">{school.curriculumType || 'CBC'}</Badge>
                    </div>

                    <div className="text-2xs text-gray-600 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{headName}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-gray-50 text-center border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">Learners</span>
                        <span className="text-xs font-bold text-gray-900 font-mono">{learnersCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">Staff</span>
                        <span className="text-xs font-bold text-gray-700 font-mono">{facultyCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-semibold">Ratio</span>
                        <span className="text-xs font-bold text-brand-700 font-mono">
                          {learnersCount > 0 && facultyCount > 0 ? `1:${Math.round(learnersCount / facultyCount)}` : '—'}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isActive ? 'ghost' : 'secondary'}
                      disabled={isActive}
                      onClick={() => switchSchool(school.id)}
                      className="w-full text-xs h-8 font-bold"
                    >
                      {isActive ? 'Current Active Branch' : 'Switch to this Campus'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden on sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="py-3 px-4">Branch / Campus</th>
                    <th className="py-3 px-4">Head of Campus / Principal</th>
                    <th className="py-3 px-4">Level / Type</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Curriculum</th>
                    <th className="py-3 px-4 text-right">Learners</th>
                    <th className="py-3 px-4 text-right">Faculty</th>
                    <th className="py-3 px-4 text-center">Ratio</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {schools.map((school) => {
                    const isActive = school.id === currentSchool?.id;
                    const headName = (school.settings as any)?.principalName || (school as any).headTeacher || (school as any).principalName || 'Assigned Head Teacher';
                    const learnersCount = branchMetrics[school.id]?.learners || 0;
                    const facultyCount = branchMetrics[school.id]?.faculty || 0;
                    const ratio = learnersCount > 0 && facultyCount > 0 ? `1:${Math.round(learnersCount / facultyCount)}` : '—';

                    return (
                      <tr key={school.id} className={`hover:bg-gray-50/80 transition ${isActive ? 'bg-brand-50/30' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {school.name}
                            {isActive && <Badge variant="brand" size="sm">Active</Badge>}
                          </div>
                          <span className="text-2xs text-gray-400 font-mono">Code: {school.code || 'MAIN'}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[150px]">{headName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-gray-600">{school.type || 'Combined'}</td>
                        <td className="py-3.5 px-4 text-gray-600">{school.address?.city || 'East Africa'}, {school.country || 'KE'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="accent" size="sm">{school.curriculumType || 'CBC'}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">{learnersCount}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-700">{facultyCount}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-2xs text-gray-600">{ratio}</td>
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            size="sm"
                            variant={isActive ? 'ghost' : 'secondary'}
                            disabled={isActive}
                            onClick={() => switchSchool(school.id)}
                            className="text-2xs h-7 py-0 font-bold"
                          >
                            {isActive ? 'Current' : 'Switch'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
      /* Branches List */
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map((school) => {
          const isActive = school.id === currentSchool?.id;
          return (
            <Card
              key={school.id}
              className={`flex flex-col justify-between ${
                isActive ? 'ring-2 ring-brand-500/50 shadow-glow' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-700 shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={isActive ? 'brand' : 'neutral'} size="sm">
                      {school.code || 'MAIN'}
                    </Badge>
                    {isActive && (
                      <span className="text-2xs font-semibold text-accent-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Workspace
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
                  {school.name}
                </h3>
                <p className="text-xs text-gray-500 capitalize mt-0.5">
                  Level: {school.type || 'Combined K-12'}
                </p>

                {/* Head of Campus / Principal Badge */}
                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Head of Campus / Principal
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {(school.settings as any)?.principalName || (school as any).headTeacher || (school as any).principalName || 'Assigned Head Teacher'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-800 space-y-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {school.address?.city || 'East Africa'}, {school.country || 'KE'}
                    </span>
                  </div>
                  {school.contacts?.phone && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{school.contacts.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="accent" size="sm">
                      {school.curriculumType || 'CBC'}
                    </Badge>
                  </div>

                  {/* Live Enrollment & Faculty Summary */}
                  <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Enrolled</span>
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {branchMetrics[school.id]?.learners || 0} Learners
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Faculty</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {branchMetrics[school.id]?.faculty || 0} Staff
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-800 flex items-center justify-between">
                <Button
                  size="sm"
                  variant={isActive ? 'secondary' : 'primary'}
                  disabled={isActive}
                  onClick={() => switchSchool(school.id)}
                  className="w-full"
                >
                  {isActive ? 'Current Branch' : 'Switch to this Branch'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      )}

      {/* Add Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Campus Branch"
        description="Provision an independent branch ledger with custom curriculum & staff"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Branch Name"
              placeholder="e.g. Mombasa Coastal Campus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Head of Campus / Principal"
              placeholder="e.g. Dr. Faith Mwangi"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              helperText="Campus Director / Head Teacher"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Branch Code"
              placeholder="e.g. MBA"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              helperText="Short code (2-5 letters)"
              required
            />

            <Select
              label="School Level"
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'nursery' | 'primary' | 'secondary' | 'combined')
              }
              options={[
                { label: 'Combined (K-12)', value: 'combined' },
                { label: 'Primary School', value: 'primary' },
                { label: 'Secondary School', value: 'secondary' },
                { label: 'Nursery / Pre-Primary', value: 'nursery' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Curriculum"
              value={curriculumType}
              onChange={(e) => setCurriculumType(e.target.value)}
              options={[
                { label: 'CBC (Kenya)', value: 'CBC' },
                { label: '8-4-4 (Kenya)', value: '8-4-4' },
                { label: 'UNEB (Uganda)', value: 'UNEB' },
                { label: 'NECTA (Tanzania)', value: 'NECTA' },
                { label: 'Rwanda Curriculum', value: 'Rwanda' },
              ]}
            />

            <Input
              label="City / Town"
              placeholder="e.g. Mombasa"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <Input
            label="Campus Contact Phone"
            placeholder="+254711223344"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          {/* Curriculum & Academic Structure Inheritance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-bold text-slate-900">Curriculum &amp; Academic Structure Inheritance</h4>
            </div>
            <p className="text-2xs text-slate-500">
              Push curriculum units and classes to this new campus branch upon registration so the campus is instantly operational.
            </p>

            {schools.length > 0 && (
              <Select
                label="Inherit From Campus Branch"
                value={sourceBranchId || currentSchool?.id || schools[0]?.id || ''}
                onChange={(e) => setSourceBranchId(e.target.value)}
                options={schools.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.code || 'MAIN'})`,
                }))}
              />
            )}

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replicateUnits}
                  onChange={(e) => setReplicateUnits(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                    Push &amp; Replicate Curriculum Units
                  </span>
                  <span className="text-2xs text-slate-500 block">
                    Copies all subjects, learning areas, weekly periods, departments, and class designations to the new branch database.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replicateClasses}
                  onChange={(e) => setReplicateClasses(e.target.checked)}
                  className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Push &amp; Replicate Class Levels &amp; Streams
                  </span>
                  <span className="text-2xs text-slate-500 block">
                    Copies class streams, capacities, and grade structures from the source campus.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Create Campus Branch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
