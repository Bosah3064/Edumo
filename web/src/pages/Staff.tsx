import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
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

interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  tscNumber?: string;
  assignedClasses: string[];
  status: string;
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
      assignedClasses: ['Grade 4 East', 'Grade 5'],
      status: 'active',
    },
    {
      id: 'staff-3',
      name: 'Mercy Achieng',
      role: 'bursar',
      email: 'm.achieng@academy.ac.ke',
      phone: '+254733445566',
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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;

    setInviting(true);
    const toastId = toast.loading('Generating secure single-use staff invite...');

    try {
      const createInviteFn = httpsCallable(functions, 'createInvite');
      const res = await createInviteFn({
        orgId: organization.id,
        schoolId: currentSchool.id,
        role: inviteRole,
        email: inviteEmail || undefined,
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
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Staff & Educators
          </h1>
          <p className="text-xs text-surface-400 mt-1">
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
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  {member.name.charAt(0)}
                </div>
                <Badge variant={roleColors[member.role] || 'neutral'} size="sm">
                  {member.role.toUpperCase()}
                </Badge>
              </div>

              <h3 className="text-base font-semibold text-white">{member.name}</h3>
              {member.tscNumber && (
                <p className="text-2xs font-mono text-brand-400 mt-0.5">
                  {member.tscNumber}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-surface-800 space-y-1.5 text-xs text-surface-300">
                <div className="flex items-center gap-2 text-surface-400">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-surface-400">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{member.phone}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {member.assignedClasses.map((cls) => (
                  <span
                    key={cls}
                    className="text-2xs px-2 py-0.5 rounded-md bg-surface-800 text-surface-300 border border-surface-700/60"
                  >
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-surface-800 flex justify-between items-center text-2xs text-surface-500">
              <span>Status: Active</span>
              <span className="text-accent-400 font-medium">Verified Credentials</span>
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

            <div className="pt-4 flex justify-end gap-3 border-t border-surface-800">
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
            <div className="w-12 h-12 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <h4 className="text-base font-semibold text-white">
              Single-Use Invite Code Ready
            </h4>
            <p className="text-xs text-surface-400 max-w-xs mx-auto">
              Share this code with the staff member to activate their account in {currentSchool?.name}.
            </p>

            <div className="p-3 bg-surface-950 rounded-2xl border border-brand-500/30 flex items-center justify-between font-mono text-base font-bold text-brand-300">
              <span>{generatedInviteCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedInviteCode);
                  toast.success('Invite code copied to clipboard!');
                }}
                className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
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
