import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, setDoc, updateDoc, deleteDoc, DocumentData } from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  GraduationCap,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Copy,
  Check,
  Search,
  Download,
  ShieldCheck,
  CheckCircle,
  BookOpen,
  Share2,
  Key,
  Plus,
  X,
  Lock,
  MessageSquare,
  Trash2,
  Edit3,
  AlertTriangle,
  UserX,
  UserCheck,
  Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatSchoolId, getNextSchoolId, getSchoolEmail } from '../utils/schoolId';
import { getSchoolEmailDomain } from '../utils/admission';
import { exportStaffDirectory } from '../utils/excelExport';
import { READY_ROLES, computeCombinedCapabilities } from '../utils/roles';

const DEFAULT_COMMON_UNITS = [
  'Mathematics',
  'English Language',
  'Kiswahili',
  'Integrated Science',
  'Social Studies',
  'CRE / Religious Studies',
  'Agriculture & Nutrition',
  'Pre-Technical Studies',
  'Creative Arts & Sports',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'History & Government',
  'Geography',
  'Business Studies',
];

interface StaffMember {
  id: string;
  name: string;
  role: string;
  roles?: string[];
  roleTitle?: string;
  email: string;
  phone: string;
  tscNumber?: string;
  assignedClasses: string[];
  assignedClass?: string;
  assignedSubjects?: string[];
  capabilities?: string[];
  permissions?: string[];
  status: string;
  schoolId?: string;
  schoolEmail?: string;
  inviteCode?: string;
}

export const Staff: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Administrator Actions States: Delete & Edit
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffTsc, setEditStaffTsc] = useState('');
  const [editStaffClass, setEditStaffClass] = useState('');
  const [editStaffSubjects, setEditStaffSubjects] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Invite Form
  const [staffName, setStaffName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('+254700000000');
  const [inviteRole, setInviteRole] = useState('class_teacher');
  const [additionalRoles, setAdditionalRoles] = useState<string[]>([]);
  const [assignedClass, setAssignedClass] = useState('');
  const [assignedSubject, setAssignedSubject] = useState('');
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [schoolUnits, setSchoolUnits] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [createLoginAccount, setCreateLoginAccount] = useState(true);
  const [tempPassword, setTempPassword] = useState('Edumo@2026');
  const [classesList, setClassesList] = useState<Array<{ id: string; name: string }>>([]);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);
  const [generatedSchoolId, setGeneratedSchoolId] = useState<string>('');

  // Manage Roles Modal for existing staff
  const [manageRolesStaff, setManageRolesStaff] = useState<StaffMember | null>(null);

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

    const unsub = onSnapshot(
      staffRef,
      (snap) => {
        const list: StaffMember[] = snap.docs.map((d) => {
          const data = d.data();
          const memberRoles: string[] = data.roles && Array.isArray(data.roles) && data.roles.length > 0
            ? data.roles
            : [data.role || 'teacher'];
          return {
            id: d.id,
            name: data.name || data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Staff Member',
            role: data.role || memberRoles[0] || 'teacher',
            roles: memberRoles,
            roleTitle: data.roleTitle,
            email: data.email || '',
            phone: data.phone || '',
            tscNumber: data.tscNumber,
            assignedClasses: data.assignedClasses || (data.assignedClass ? [data.assignedClass] : []),
            assignedClass: data.assignedClass,
            assignedSubjects: data.assignedSubjects || [],
            capabilities: data.capabilities,
            permissions: data.permissions,
            status: data.status || 'active',
            schoolId: data.schoolId,
            schoolEmail: data.schoolEmail,
            inviteCode: data.inviteCode,
          };
        });
        setStaffList(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching staff:', err);
        setLoading(false);
      }
    );

    const classesRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'classes');
    const unsubClasses = onSnapshot(classesRef, (snap) => {
      const cls = snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
      setClassesList(cls);
      if (cls.length > 0 && !assignedClass) {
        setAssignedClass(cls[0].name);
      }
    });

    const subjectsRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects');
    const unsubSubjects = onSnapshot(subjectsRef, (snap) => {
      const units = snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name || d.id).trim(),
        code: d.data().code,
      }));
      setSchoolUnits(units);
    });

    return () => {
      unsub();
      unsubClasses();
      unsubSubjects();
    };
  }, [organization, currentSchool]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected. Please choose a school first.');
      return;
    }

    setInviting(true);
    const toastId = toast.loading('Registering faculty member and configuring roles...');

    try {
      const roleDef = READY_ROLES[inviteRole] || READY_ROLES.teacher;
      const roleKey = inviteRole === 'teacher' ? 'teacher' : inviteRole === 'principal' || inviteRole === 'deputy' || inviteRole === 'admin' ? 'admin' : 'staff';
      const year = new Date().getFullYear();
      const yearPrefix = String(year).slice(-2);
      const counterRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'counters', `staff-${roleKey}-${yearPrefix}`);
      const fallbackId = getNextSchoolId(staffList, roleKey as 'teacher' | 'staff' | 'admin', year);
      const fallbackSequence = Number(fallbackId.match(/\d{4}$/)?.[0] || 1);

      let schoolId = fallbackId;
      try {
        schoolId = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(counterRef);
          const last = snapshot.exists() ? Number(snapshot.data().lastSequence || 0) : 0;
          const sequence = Math.max(last, fallbackSequence - 1) + 1;
          const id = formatSchoolId(roleKey as 'teacher' | 'staff' | 'admin', sequence, year);
          transaction.set(counterRef, { lastSequence: sequence, updatedAt: serverTimestamp() }, { merge: true });
          return id;
        });
      } catch (cErr) {
        console.warn('Staff counter fallback:', cErr);
        schoolId = fallbackId;
      }
      setGeneratedSchoolId(schoolId);

      const allAssignedRoles = Array.from(new Set([inviteRole, ...additionalRoles]));
      const { capabilities, permissions, primaryRoleTitle } = computeCombinedCapabilities(allAssignedRoles);

      let code = `EDM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const finalSubjects = assignedSubjects.length > 0
        ? assignedSubjects
        : assignedSubject
        ? assignedSubject.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Create staff record directly with role capabilities and permissions
      const newStaffRef = doc(collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'staff'));
      await setDoc(newStaffRef, {
        schoolId,
        name: staffName.trim() || (inviteEmail ? inviteEmail.split('@')[0] : 'Faculty Educator'),
        role: inviteRole,
        roles: allAssignedRoles,
        roleTitle: primaryRoleTitle,
        email: inviteEmail || getSchoolEmail(schoolId, getSchoolEmailDomain(currentSchool)) || '',
        phone: invitePhone || '',
        schoolEmail: getSchoolEmail(schoolId, getSchoolEmailDomain(currentSchool)) || '',
        status: 'active',
        inviteCode: code,
        assignedClasses: assignedClass ? [assignedClass] : [],
        assignedClass: assignedClass || '',
        assignedSubjects: finalSubjects,
        assignedSubject: finalSubjects.join(', '),
        capabilities,
        permissions,
        hasLoginAccount: createLoginAccount,
        tempPassword: createLoginAccount ? tempPassword : '',
        createdAt: serverTimestamp(),
      });

      // Store invitation record in root and school invitations collection for instant code verification
      try {
        const invitePayload = {
          code,
          schoolId: currentSchool.id,
          schoolName: currentSchool.name,
          orgId: organization.id,
          staffId: newStaffRef.id,
          schoolStaffId: schoolId,
          staffName: staffName.trim() || 'Faculty Educator',
          email: (inviteEmail || '').trim().toLowerCase(),
          phone: (invitePhone || '').trim(),
          role: inviteRole,
          roles: allAssignedRoles,
          assignedSubjects: finalSubjects,
          assignedClass: assignedClass || '',
          tempPassword: createLoginAccount ? tempPassword : '',
          status: 'pending',
          createdAt: serverTimestamp(),
        };

        // 1. Root collection for direct lookup by code without index requirements
        await setDoc(doc(db, 'invitations', code), invitePayload);
        // 2. School-scoped subcollection
        await setDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'invitations', code), invitePayload);
      } catch (invErr) {
        console.warn('Invitation doc write deferred:', invErr);
      }

      // If this is a class teacher, update the class record so the class reflects its assigned teacher!
      if (allAssignedRoles.includes('class_teacher') && assignedClass) {
        const matchingClass = classesList.find((c) => c.name === assignedClass || c.id === assignedClass);
        if (matchingClass) {
          const classDocRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'classes', matchingClass.id);
          await setDoc(classDocRef, {
            classTeacher: staffName.trim() || 'Assigned Class Teacher',
            classTeacherId: schoolId,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      setGeneratedInviteCode(code);
      toast.success(`${primaryRoleTitle} provisioned with ready capabilities!`, { id: toastId });
    } catch (err: unknown) {
      console.error('Staff creation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to register staff';
      toast.error(msg, { id: toastId });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveStaffRole = async (member: StaffMember, roleIdToRemove: string) => {
    if (!organization || !currentSchool) return;
    const currentRoles = member.roles && member.roles.length > 0
      ? member.roles
      : [member.role];

    if (currentRoles.length <= 1) {
      toast.error('Cannot remove role. Each staff member must retain at least one active role.');
      return;
    }

    const newRoles = currentRoles.filter((r) => r !== roleIdToRemove);
    const { capabilities, permissions, primaryRoleTitle } = computeCombinedCapabilities(newRoles);

    const toastId = toast.loading(`Removing ${READY_ROLES[roleIdToRemove]?.name || roleIdToRemove} role...`);
    try {
      const staffRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'staff', member.id);
      await updateDoc(staffRef, {
        roles: newRoles,
        role: newRoles[0],
        roleTitle: primaryRoleTitle,
        capabilities,
        permissions,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Role removed. Updated active roles: ${primaryRoleTitle}`, { id: toastId });
    } catch (err) {
      console.error('Error removing role:', err);
      toast.error('Failed to remove role', { id: toastId });
    }
  };

  const handleToggleStaffRole = async (member: StaffMember, roleId: string) => {
    if (!organization || !currentSchool) return;
    const currentRoles = member.roles && member.roles.length > 0
      ? [...member.roles]
      : [member.role];

    let newRoles: string[];
    if (currentRoles.includes(roleId)) {
      if (currentRoles.length <= 1) {
        toast.error('Staff member must have at least one active role.');
        return;
      }
      newRoles = currentRoles.filter((r) => r !== roleId);
    } else {
      newRoles = [...currentRoles, roleId];
    }

    const { capabilities, permissions, primaryRoleTitle } = computeCombinedCapabilities(newRoles);

    const toastId = toast.loading(`Updating roles for ${member.name}...`);
    try {
      const staffRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'staff', member.id);
      await updateDoc(staffRef, {
        roles: newRoles,
        role: newRoles[0],
        roleTitle: primaryRoleTitle,
        capabilities,
        permissions,
        updatedAt: serverTimestamp(),
      });
      setManageRolesStaff((prev) =>
        prev && prev.id === member.id
          ? { ...prev, roles: newRoles, role: newRoles[0], roleTitle: primaryRoleTitle, capabilities, permissions }
          : null
      );
      toast.success(`Roles updated: ${primaryRoleTitle}`, { id: toastId });
    } catch (err) {
      console.error('Error toggling role:', err);
      toast.error('Failed to update roles', { id: toastId });
    }
  };

  // Administrator Actions
  const handleDeleteStaff = async () => {
    if (!staffToDelete || !organization || !currentSchool) return;
    setIsDeletingStaff(true);
    const toastId = toast.loading(`Deleting ${staffToDelete.name} from school records...`);
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'staff', staffToDelete.id));
      if (staffToDelete.inviteCode) {
        try {
          await deleteDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'invitations', staffToDelete.inviteCode));
        } catch {
          // Non-fatal
        }
      }
      toast.success(`${staffToDelete.name} deleted successfully!`, { id: toastId });
      setStaffToDelete(null);
    } catch (err) {
      console.error('Delete staff error:', err);
      toast.error('Failed to delete staff member', { id: toastId });
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (member: StaffMember) => {
    if (!organization || !currentSchool) return;
    const newStatus = member.status === 'suspended' ? 'active' : 'suspended';
    const actionText = newStatus === 'suspended' ? 'Suspended access for' : 'Reactivated access for';
    const toastId = toast.loading(`${newStatus === 'suspended' ? 'Suspending' : 'Reactivating'} ${member.name}...`);
    try {
      const staffRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'staff', member.id);
      await updateDoc(staffRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`${actionText} ${member.name}!`, { id: toastId });
    } catch (err) {
      console.error('Status toggle error:', err);
      toast.error('Failed to update status', { id: toastId });
    }
  };

  const handleOpenEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setEditStaffName(member.name);
    setEditStaffEmail(member.email);
    setEditStaffPhone(member.phone);
    setEditStaffTsc(member.tscNumber || '');
    setEditStaffClass(member.assignedClass || member.assignedClasses[0] || '');
    setEditStaffSubjects(member.assignedSubjects || []);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !organization || !currentSchool) return;
    setIsSavingEdit(true);
    const toastId = toast.loading(`Updating ${editStaffName}...`);
    try {
      const staffRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'staff', editingStaff.id);
      await updateDoc(staffRef, {
        name: editStaffName.trim(),
        email: editStaffEmail.trim(),
        phone: editStaffPhone.trim(),
        tscNumber: editStaffTsc.trim(),
        assignedClass: editStaffClass,
        assignedClasses: editStaffClass ? [editStaffClass] : [],
        assignedSubjects: editStaffSubjects,
        assignedSubject: editStaffSubjects.join(', '),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Updated ${editStaffName} successfully!`, { id: toastId });
      setEditingStaff(null);
    } catch (err) {
      console.error('Update staff error:', err);
      toast.error('Failed to update staff member', { id: toastId });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const roleColors: Record<string, 'brand' | 'accent' | 'warning' | 'danger' | 'neutral'> = {
    principal: 'danger',
    admin: 'danger',
    class_teacher: 'accent',
    deputy: 'brand',
    teacher: 'brand',
    bursar: 'warning',
    support: 'neutral',
  };

  const selectedRoleDef = READY_ROLES[inviteRole] || READY_ROLES.teacher;

  const handleExportStaff = async () => {
    if (!currentSchool) return;
    if (staffList.length === 0) {
      toast.error('No staff members to export');
      return;
    }
    setExportingExcel(true);
    const toastId = toast.loading('Exporting Faculty & Staff Directory (.xlsx)...');
    try {
      await exportStaffDirectory(
        currentSchool.name,
        staffList.map((st) => ({
          schoolId: st.schoolId || st.id,
          name: st.name,
          role: st.role,
          email: st.email,
          phone: st.phone,
          status: st.status,
        }))
      );
      toast.success('Staff Directory exported (.xlsx)!', { id: toastId });
    } catch (err) {
      console.error('Staff export error:', err);
      toast.error('Failed to export Staff Directory', { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  if (currentRole === 'teacher') {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-[#1d5f99] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Faculty & Staff Directory</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Staff management, directory administration, and credential invitations are reserved for school administrators and principals. Please use your Educator Portal for classes and student marks.
          </p>
          <a
            href="/educator-portal"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#1d5f99] to-[#683669] text-white font-semibold text-sm hover:opacity-95 shadow-sm transition-all"
          >
            Go to Educator Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Staff & Educators
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Faculty and administrators at {currentSchool?.name || 'Main Campus'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportStaff}
            isLoading={exportingExcel}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Staff (.xlsx)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setGeneratedInviteCode(null);
              setIsInviteModalOpen(true);
            }}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Invite Staff Member
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="w-full sm:w-96 relative">
          <Input
            placeholder="Search staff by name, email or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="!py-2"
          />
        </div>
      </div>

      {/* Staff Grid */}
      {staffList.filter((m) =>
        `${m.name} ${m.email} ${m.role} ${m.tscNumber || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ).length === 0 ? (
        <Card className="text-center py-12 text-gray-500">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">No staff members found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No staff members match your search criteria.'
              : 'Get started by inviting educators and administrators to your campus.'}
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setGeneratedInviteCode(null);
                setIsInviteModalOpen(true);
              }}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Invite First Staff Member
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList
            .filter((m) =>
              `${m.name} ${m.email} ${m.role} ${m.tscNumber || ''}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            )
            .map((member) => (
              <Card key={member.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-edumoPurple-500/10 border border-edumoPurple-500/20 flex items-center justify-center text-edumoPurple-500 font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <Badge variant={roleColors[member.role] || 'neutral'} size="sm">
                      {member.role.toUpperCase()}
                    </Badge>
                  </div>

                  <h3 className="text-base font-semibold text-gray-900">{member.name}</h3>
                  
                  {/* Multi-Role Badges with 1-Click Role Removal */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {(member.roles || [member.role]).map((rId) => {
                      const rDef = READY_ROLES[rId];
                      return (
                        <span
                          key={rId}
                          className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs"
                        >
                          <span>
                            {rId === 'class_teacher' && member.assignedClass
                              ? `Class Teacher: ${member.assignedClass}`
                              : rDef?.shortLabel || rId.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStaffRole(member, rId);
                            }}
                            title={`Remove ${rDef?.name || rId} role`}
                            className="w-3.5 h-3.5 rounded-full hover:bg-rose-100 hover:text-rose-600 text-blue-400 flex items-center justify-center transition"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setManageRolesStaff(member)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                    >
                      + Manage Roles
                    </button>
                    {member.schoolId && (
                      <span className="text-2xs font-mono font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-auto">
                        ID: {member.schoolId}
                      </span>
                    )}
                  </div>
                  {member.tscNumber && (
                    <p className="text-2xs font-mono text-brand-600 mt-1">
                      TSC No: {member.tscNumber}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-200 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  </div>

                  {member.capabilities && member.capabilities.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        Assigned Capabilities:
                      </span>
                      <div className="space-y-0.5">
                        {member.capabilities.slice(0, 2).map((cap, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-2xs text-gray-700">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{cap}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.assignedClasses.map((cls) => (
                      <span
                        key={cls}
                        className="text-2xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 font-semibold"
                      >
                        Class: {cls}
                      </span>
                    ))}
                  </div>

                  {member.assignedSubjects && member.assignedSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {member.assignedSubjects.map((subj) => (
                        <span
                          key={subj}
                          className="text-2xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-semibold flex items-center gap-1"
                        >
                          <BookOpen className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                          Unit: {subj}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-2xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        member.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {member.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>
                  </div>

                  {/* Administrator Action Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditStaff(member)}
                      title="Edit Staff Member"
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStaffStatus(member)}
                      title={member.status === 'suspended' ? 'Reactivate Staff Access' : 'Suspend Staff Access'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        member.status === 'suspended'
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setStaffToDelete(member)}
                      title="Delete Faculty Member"
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Provision Faculty & Staff Member"
        description="Select a ready-role template with automatic capabilities and class assignments"
        maxWidth="lg"
      >
        {!generatedInviteCode ? (
          <form onSubmit={handleSendInvite} className="space-y-4 mt-2">
            <Input
              label="Staff Full Name"
              placeholder="e.g. Mwalimu David Otieno"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              required
            />

            <Select
              label="Primary Institutional Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              options={[
                { label: 'Subject Teacher / Course Instructor (Subject marks & assignments)', value: 'teacher' },
                { label: 'Examination Department / Exam Officer (Exams series, locked grade sheets & passes)', value: 'exam_officer' },
                { label: 'Class Teacher / Homeroom (Roll calls, marks, report remarks & promotion)', value: 'class_teacher' },
                { label: 'Super Administrator / School Head (Holds all roles & permissions)', value: 'admin' },
                { label: 'Dean of Studies / Academic Deputy (Exams, broadsheets & timetable)', value: 'deputy' },
                { label: 'Bursar / Finance Officer (Fee structures, receipts & reconciliation)', value: 'bursar' },
                { label: 'School Nurse / Health & Support Officer', value: 'support' },
              ]}
            />

            {/* Concurrent Roles Checkbox Grid */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800 block mb-0.5">
                Concurrent Roles (Optional Multi-Role Assignment)
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Enable secondary roles (e.g. Teacher can also serve on the Examination Team)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'exam_officer', label: 'Examination Department' },
                  { id: 'class_teacher', label: 'Class Teacher' },
                  { id: 'teacher', label: 'Subject Teacher' },
                  { id: 'deputy', label: 'Dean of Studies' },
                  { id: 'bursar', label: 'Bursar / Finance' },
                ]
                  .filter((r) => r.id !== inviteRole)
                  .map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 hover:border-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={additionalRoles.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAdditionalRoles([...additionalRoles, r.id]);
                          } else {
                            setAdditionalRoles(additionalRoles.filter((x) => x !== r.id));
                          }
                        }}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="truncate">{r.label}</span>
                    </label>
                  ))}
              </div>
            </div>

            {/* If Class Teacher is selected in primary or concurrent, prompt for Class Assignment */}
            {(inviteRole === 'class_teacher' || additionalRoles.includes('class_teacher')) && (
              <Select
                label="Assigned Class / Stream (Class Teacher Responsibility)"
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                options={
                  classesList.length > 0
                    ? classesList.map((c) => ({ label: c.name, value: c.name }))
                    : [
                        { label: 'Grade 1 East', value: 'Grade 1 East' },
                        { label: 'Grade 2 West', value: 'Grade 2 West' },
                        { label: 'Grade 3 East', value: 'Grade 3 East' },
                        { label: 'Grade 4 East', value: 'Grade 4 East' },
                        { label: 'Grade 7 Alpha', value: 'Grade 7 Alpha' },
                      ]
                }
                helperText="This educator will be the designated Class Teacher for daily attendance, promotion, and report cards"
              />
            )}

            {/* Multi-Unit Teaching Assignment */}
            {(inviteRole === 'teacher' || additionalRoles.includes('teacher') || true) && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                      Assigned Learning Areas / Units (Multi-Unit Teaching)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Select all subjects this educator teaches. A teacher can be assigned multiple units across classes.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                    {assignedSubjects.length} Selected
                  </span>
                </div>

                {/* Selected Unit Badges */}
                {assignedSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-slate-200 max-h-24 overflow-y-auto">
                    {assignedSubjects.map((subj) => (
                      <span
                        key={subj}
                        className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200"
                      >
                        {subj}
                        <button
                          type="button"
                          onClick={() => setAssignedSubjects(assignedSubjects.filter((s) => s !== subj))}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Unit Suggestion Pills */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Available School Units (Click to toggle):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1">
                    {Array.from(new Set([...schoolUnits.map((u) => u.name), ...DEFAULT_COMMON_UNITS])).map((unitName) => {
                      const isSelected = assignedSubjects.includes(unitName);
                      return (
                        <button
                          type="button"
                          key={unitName}
                          onClick={() => {
                            if (isSelected) {
                              setAssignedSubjects(assignedSubjects.filter((s) => s !== unitName));
                            } else {
                              setAssignedSubjects([...assignedSubjects, unitName]);
                            }
                          }}
                          className={`text-2xs px-2 py-1 rounded-md border font-medium transition-all ${
                            isSelected
                              ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{unitName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Unit Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Type custom unit (e.g. Robotics, French, Aviation)..."
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customSubjectInput.trim() && !assignedSubjects.includes(customSubjectInput.trim())) {
                          setAssignedSubjects([...assignedSubjects, customSubjectInput.trim()]);
                          setCustomSubjectInput('');
                        }
                      }
                    }}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customSubjectInput.trim() && !assignedSubjects.includes(customSubjectInput.trim())) {
                        setAssignedSubjects([...assignedSubjects, customSubjectInput.trim()]);
                        setCustomSubjectInput('');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Capabilities Checklist Preview Box */}
            {(() => {
              const combined = computeCombinedCapabilities([inviteRole, ...additionalRoles]);
              return (
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 text-xs text-blue-950">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    Combined Capabilities for "{combined.primaryRoleTitle}":
                  </div>
                  <div className="space-y-1 mt-1.5 max-h-36 overflow-y-auto">
                    {combined.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-2xs text-blue-950">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Login Account Setup */}
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-950">
                <input
                  type="checkbox"
                  checked={createLoginAccount}
                  onChange={(e) => setCreateLoginAccount(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <Key className="w-3.5 h-3.5 text-amber-600" />
                Enable System Login &amp; Issue Temporary Password
              </label>
              {createLoginAccount && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Initial Temporary Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        className="w-full text-xs font-mono pl-8 pr-2.5 py-1.5 rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="e.g. Edumo@2026"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-800 flex items-center">
                    The teacher will receive this password and can update it immediately upon login.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Staff Email (Login Username)"
                type="email"
                placeholder="teacher@academy.ac.ke"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                helperText="Primary email used to sign in to Edumo"
              />

              <Input
                label="Mobile Phone"
                placeholder="+254712345678"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                helperText="For SMS delivery of single-use token"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={inviting}>
                Register &amp; Assign Roles
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-left py-2 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                Educator Provisioned Successfully!
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Account active in <strong>{currentSchool?.name}</strong>. Share credentials with the educator below.
              </p>
            </div>

            {/* Summary Credentials Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">{staffName || 'Faculty Educator'}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{inviteRole.replace(/_/g, ' ')}</p>
                </div>
                {generatedSchoolId && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-700">
                    ID: {generatedSchoolId}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Login Email</span>
                  <p className="font-mono text-xs font-semibold text-slate-800 truncate">
                    {inviteEmail || getSchoolEmail(generatedSchoolId, getSchoolEmailDomain(currentSchool))}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Initial Password</span>
                  <p className="font-mono text-xs font-bold text-amber-700">
                    {tempPassword}
                  </p>
                </div>
              </div>

              {/* Campus Join Code */}
              <div className="p-2.5 bg-brand-50/70 rounded-xl border border-brand-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-800 block">Campus Join Code</span>
                  <span className="font-mono text-sm font-black text-brand-900">{generatedInviteCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (generatedInviteCode) {
                      navigator.clipboard.writeText(generatedInviteCode);
                      toast.success('Join code copied!');
                    }
                  }}
                  className="p-1.5 rounded-lg bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors"
                  title="Copy Join Code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Units & Class summary */}
              <div className="text-xs space-y-1">
                {assignedClass && (
                  <p className="text-[11px] text-slate-600">
                    <strong className="text-slate-800">Assigned Class:</strong> {assignedClass}
                  </p>
                )}
                {assignedSubjects.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 block mb-1">
                      Assigned Teaching Units ({assignedSubjects.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {assignedSubjects.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  const portalUrl = 'https://edumo-3dfc9.web.app/login';
                  const email = inviteEmail || getSchoolEmail(generatedSchoolId, getSchoolEmailDomain(currentSchool));
                  const units = assignedSubjects.length > 0 ? assignedSubjects.join(', ') : 'Assigned Subjects';
                  const message = `*Welcome to ${currentSchool?.name} on Edumo!*\n\nHello Mwalimu ${staffName},\nYour official faculty account has been created.\n\n*Login Details:*\n- Portal: ${portalUrl}\n- Email: ${email}\n- Temporary Password: ${tempPassword}\n- School ID: ${generatedSchoolId}\n- Join Code: ${generatedInviteCode}\n\n*Assigned Units:* ${units}\n*Assigned Class:* ${assignedClass || 'General'}\n\nPlease sign in and update your password upon first entry.`;
                  
                  navigator.clipboard.writeText(message);
                  toast.success('WhatsApp / SMS invitation copied to clipboard!');
                }}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                Copy WhatsApp Message
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  const email = inviteEmail || getSchoolEmail(generatedSchoolId, getSchoolEmailDomain(currentSchool));
                  const text = `Email: ${email}\nPassword: ${tempPassword}\nSchool ID: ${generatedSchoolId}\nJoin Code: ${generatedInviteCode}`;
                  navigator.clipboard.writeText(text);
                  toast.success('Login credentials copied!');
                }}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                Copy Credentials Only
              </Button>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStaffName('');
                  setInviteEmail('');
                  setInvitePhone('+254700000000');
                  setAssignedSubjects([]);
                  setGeneratedInviteCode(null);
                  setGeneratedSchoolId('');
                }}
              >
                + Add Another Teacher
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setGeneratedInviteCode(null);
                }}
              >
                Close &amp; Finish
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage Roles Modal for Existing Staff Members */}
      {manageRolesStaff && (
        <Modal
          isOpen={Boolean(manageRolesStaff)}
          onClose={() => setManageRolesStaff(null)}
          title={`Institutional Roles — ${manageRolesStaff.name}`}
          description="Enable or remove roles for this staff member (e.g. Teacher + Examination Department)"
          maxWidth="md"
        >
          <div className="space-y-4 mt-2">
            <p className="text-xs text-slate-500">
              Click any role to toggle it on or off. Capabilities and system permissions update automatically.
            </p>

            <div className="space-y-2">
              {[
                { id: 'admin', label: 'Super Administrator / School Head', desc: 'Full institutional access across all modules & settings' },
                { id: 'exam_officer', label: 'Examination Department / Exam Officer', desc: 'Manage exams series, lock mark sheets, broadsheets & admit passes' },
                { id: 'class_teacher', label: 'Class Teacher / Homeroom Educator', desc: 'Daily attendance roll calls, report remarks & student promotion' },
                { id: 'teacher', label: 'Subject Teacher / Course Instructor', desc: 'Enter marks for assigned learning areas & grade assignments' },
                { id: 'deputy', label: 'Dean of Studies / Academic Deputy', desc: 'Master timetable, academic broadsheets & grading standards' },
                { id: 'bursar', label: 'Bursar / Finance Officer', desc: 'Student fee structures, invoicing & M-Pesa receipts' },
                { id: 'support', label: 'Support Staff / Nurse', desc: 'Health records and general administrative assistance' },
              ].map((r) => {
                const active = (manageRolesStaff.roles || [manageRolesStaff.role]).includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleToggleStaffRole(manageRolesStaff, r.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                      active
                        ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{r.label}</span>
                      <span className="text-2xs text-slate-500 block mt-0.5">{r.desc}</span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        active ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button size="sm" variant="primary" onClick={() => setManageRolesStaff(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <Modal
          isOpen={Boolean(staffToDelete)}
          onClose={() => setStaffToDelete(null)}
          title="Delete Staff Member"
          description="Permanently remove this educator from the school staff directory"
          maxWidth="md"
        >
          <div className="space-y-4 mt-2">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-bold">
                  Are you sure you want to delete {staffToDelete.name}?
                </p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  This action permanently revokes their portal login access and unbinds all assigned classes and teaching subjects. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <p><strong>Educator Name:</strong> {staffToDelete.name}</p>
              <p><strong>School ID:</strong> {staffToDelete.schoolId || 'N/A'}</p>
              <p><strong>Email:</strong> {staffToDelete.email || 'N/A'}</p>
              <p><strong>Primary Role:</strong> {staffToDelete.role}</p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStaffToDelete(null)}
                disabled={isDeletingStaff}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteStaff}
                isLoading={isDeletingStaff}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Yes, Delete Staff Member
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Staff Details Modal */}
      {editingStaff && (
        <Modal
          isOpen={Boolean(editingStaff)}
          onClose={() => setEditingStaff(null)}
          title={`Edit Profile — ${editingStaff.name}`}
          description="Update contact information, assigned stream, and teaching units"
          maxWidth="lg"
        >
          <form onSubmit={handleSaveEditStaff} className="space-y-4 mt-2">
            <Input
              label="Staff Full Name"
              value={editStaffName}
              onChange={(e) => setEditStaffName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Login Email"
                type="email"
                value={editStaffEmail}
                onChange={(e) => setEditStaffEmail(e.target.value)}
                required
              />
              <Input
                label="Mobile Phone"
                value={editStaffPhone}
                onChange={(e) => setEditStaffPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="TSC / Registration Number"
                value={editStaffTsc}
                onChange={(e) => setEditStaffTsc(e.target.value)}
                placeholder="e.g. TSC-48921"
              />
              <Select
                label="Assigned Class / Stream"
                value={editStaffClass}
                onChange={(e) => setEditStaffClass(e.target.value)}
                options={[
                  { label: 'None / Subject Specialist', value: '' },
                  ...classesList.map((c) => ({ label: c.name, value: c.name })),
                ]}
              />
            </div>

            {/* Assigned Units Multi-Select */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Assigned Teaching Units / Learning Areas ({editStaffSubjects.length})
              </span>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1">
                {Array.from(new Set([...schoolUnits.map((u) => u.name), ...DEFAULT_COMMON_UNITS])).map((uName) => {
                  const isSel = editStaffSubjects.includes(uName);
                  return (
                    <button
                      type="button"
                      key={uName}
                      onClick={() => {
                        if (isSel) {
                          setEditStaffSubjects(editStaffSubjects.filter((s) => s !== uName));
                        } else {
                          setEditStaffSubjects([...editStaffSubjects, uName]);
                        }
                      }}
                      className={`text-2xs px-2 py-1 rounded-md border font-medium transition-all ${
                        isSel
                          ? 'bg-purple-600 text-white border-purple-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSel ? '✓ ' : '+ '}{uName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setEditingStaff(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSavingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
