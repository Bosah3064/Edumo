import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, setDoc, updateDoc, DocumentData } from 'firebase/firestore';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatSchoolId, getNextSchoolId, getSchoolEmail } from '../utils/schoolId';
import { getSchoolEmailDomain } from '../utils/admission';
import { exportStaffDirectory } from '../utils/excelExport';
import { READY_ROLES, computeCombinedCapabilities } from '../utils/roles';

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
}

export const Staff: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Invite Form
  const [staffName, setStaffName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('+254700000000');
  const [inviteRole, setInviteRole] = useState('class_teacher');
  const [additionalRoles, setAdditionalRoles] = useState<string[]>([]);
  const [assignedClass, setAssignedClass] = useState('');
  const [assignedSubject, setAssignedSubject] = useState('');
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

    return () => {
      unsub();
      unsubClasses();
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
        assignedSubjects: assignedSubject ? [assignedSubject] : [],
        capabilities,
        permissions,
        createdAt: serverTimestamp(),
      });

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
                        className="text-2xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 font-semibold"
                      >
                        Class: {cls}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-200 flex justify-between items-center text-2xs text-gray-500">
                  <span>Status: Active</span>
                  <span className="text-accent-600 font-medium">Verified Credentials</span>
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

            {/* If Subject Teacher is selected, prompt for Subject */}
            {(inviteRole === 'teacher' || additionalRoles.includes('teacher')) && (
              <Input
                label="Assigned Learning Area(s) / Subjects"
                placeholder="e.g. Mathematics, Integrated Science"
                value={assignedSubject}
                onChange={(e) => setAssignedSubject(e.target.value)}
                helperText="Subjects this educator is authorized to grade"
              />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Staff Email (Optional)"
                type="email"
                placeholder="teacher@academy.ac.ke"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
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
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent-500/10 text-accent-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <h4 className="text-base font-semibold text-gray-900">
              Single-Use Invite Code Ready
            </h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Share this code with the staff member to activate their account in {currentSchool?.name}.
            </p>

            {generatedSchoolId && (
              <div className="p-3 bg-brand-50 rounded-2xl border border-brand-200 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">School ID</p>
                <p className="font-mono text-base font-bold text-brand-700">{generatedSchoolId}</p>
                {getSchoolEmail(generatedSchoolId, getSchoolEmailDomain(currentSchool)) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {getSchoolEmail(generatedSchoolId, getSchoolEmailDomain(currentSchool))}
                  </p>
                )}
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-2xl border border-brand-500/30 flex items-center justify-between font-mono text-base font-bold text-brand-600">
              <span>{generatedInviteCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedInviteCode);
                  toast.success('Invite code copied to clipboard!');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
              className="mt-4"
            >
              Done
            </Button>
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
    </div>
  );
};
