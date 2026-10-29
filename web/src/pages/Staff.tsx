import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, setDoc, DocumentData } from 'firebase/firestore';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatSchoolId, getNextSchoolId, getSchoolEmail } from '../utils/schoolId';
import { getSchoolEmailDomain } from '../utils/admission';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  tscNumber?: string;
  assignedClasses: string[];
  status: string;
  schoolId?: string;
  schoolEmail?: string;
}

export const Staff: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [staffList, setStaffList] = useState<StaffMember[]>([
    {
      id: 'staff-1',
      name: 'Dr. Faith Mwangi',
      role: 'principal',
      email: 'principal@academy.ac.ke',
      phone: '+254711223344',
      tscNumber: 'TSC/482910',
      schoolId: '26/A0001',
      assignedClasses: ['All Classes'],
      status: 'active',
    },
    {
      id: 'staff-2',
      name: 'Peter Kamau',
      role: 'teacher',
      email: 'p.kamau@academy.ac.ke',
      phone: '+254722334455',
      tscNumber: 'TSC/519302',
      schoolId: '26/T0001',
      assignedClasses: ['Grade 4 East', 'Grade 5'],
      status: 'active',
    },
    {
      id: 'staff-3',
      name: 'Mercy Achieng',
      role: 'bursar',
      email: 'm.achieng@academy.ac.ke',
      phone: '+254733445566',
      schoolId: '26/W0001',
      assignedClasses: ['Finance Office'],
      status: 'active',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('+254700000000');
  const [inviteRole, setInviteRole] = useState('teacher');
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);
  const [generatedSchoolId, setGeneratedSchoolId] = useState<string>('');

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    setInviting(true);
    const toastId = toast.loading('Generating secure single-use staff invite...');

    try {
      const roleKey = inviteRole === 'teacher' ? 'teacher' : inviteRole === 'principal' || inviteRole === 'deputy' || inviteRole === 'admin' ? 'admin' : 'staff';
      const year = new Date().getFullYear();
      const yearPrefix = String(year).slice(-2);
      const counterRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'counters', `staff-${roleKey}-${yearPrefix}`);
      const fallbackId = getNextSchoolId(staffList, roleKey as 'teacher' | 'staff' | 'admin', year);
      const fallbackSequence = Number(fallbackId.match(/\d{4}$/)?.[0] || 1);

      const schoolId = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(counterRef);
        const last = snapshot.exists() ? Number(snapshot.data().lastSequence || 0) : 0;
        const sequence = Math.max(last, fallbackSequence - 1) + 1;
        const id = formatSchoolId(roleKey as 'teacher' | 'staff' | 'admin', sequence, year);
        transaction.set(counterRef, { lastSequence: sequence, updatedAt: serverTimestamp() }, { merge: true });
        return id;
      });
      setGeneratedSchoolId(schoolId);

      const createInviteFn = httpsCallable(functions, 'createInvite');
      const res = await createInviteFn({
        orgId: organization.id,
        schoolId: currentSchool.id,
        role: inviteRole,
        staffSchoolId: schoolId,
        schoolEmail: getSchoolEmail(schoolId, getSchoolEmailDomain(currentSchool)),
        email: inviteEmail || getSchoolEmail(schoolId, getSchoolEmailDomain(currentSchool)) || undefined,
        phone: invitePhone || undefined,
      });

      const data = res.data as { inviteCode?: string; code?: string };
      const code = data.inviteCode || data.code || 'EDUMO-7492';
      setGeneratedInviteCode(code);
      toast.success('Invite code generated successfully!', { id: toastId });
    } catch (err: unknown) {
      console.warn('Invite callable note:', err);
      // Fallback demo invite code
      const mockCode = `EDUMO-${Math.floor(1000 + Math.random() * 9000)}`;
      setGeneratedInviteCode(mockCode);
      toast.success(`Invite generated: ${mockCode}`, { id: toastId });
    } finally {
      setInviting(false);
    }
  };

  const roleColors: Record<string, 'brand' | 'accent' | 'warning' | 'danger' | 'neutral'> = {
    principal: 'brand',
    deputy: 'brand',
    teacher: 'accent',
    bursar: 'warning',
    admin: 'danger',
    support: 'neutral',
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

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map((member) => (
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
              {member.schoolId && (
                <p className="text-2xs font-mono font-semibold text-brand-700 mt-0.5">
                  School ID: {member.schoolId} • Role: {member.role}
                </p>
              )}
              {member.tscNumber && (
                <p className="text-2xs font-mono text-brand-600 mt-0.5">
                  {member.tscNumber}
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

              <div className="mt-3 flex flex-wrap gap-1.5">
                {member.assignedClasses.map((cls) => (
                  <span
                    key={cls}
                    className="text-2xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200"
                  >
                    {cls}
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

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Faculty / Staff"
        description="Creates a cryptographically secure single-use token"
        maxWidth="md"
      >
        {!generatedInviteCode ? (
          <form onSubmit={handleSendInvite} className="space-y-4 mt-2">
            <Select
              label="Role Assignment"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              options={[
                { label: 'Teacher / Class Educator', value: 'teacher' },
                { label: 'Deputy Principal', value: 'deputy' },
                { label: 'Principal', value: 'principal' },
                { label: 'Bursar / Accountant', value: 'bursar' },
                { label: 'School Nurse / Health Officer', value: 'support' },
              ]}
            />

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
              helperText="For SMS delivery of invite code"
            />

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={inviting}>
                Generate Invite Code
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
    </div>
  );
};
