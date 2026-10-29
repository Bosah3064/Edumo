import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Building2, Plus, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Branches: React.FC = () => {
  const { organization, schools, currentSchool, switchSchool, hasPermission } = useTenant();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Branch Form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'nursery' | 'primary' | 'secondary' | 'combined'>('combined');
  const [curriculumType, setCurriculumType] = useState('CBC');
  const [gradingMode, setGradingMode] = useState('cbc_no_aggregate');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [phone, setPhone] = useState('+254700000000');

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    if (!name || !code) {
      toast.error('Branch name and short code are required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Provisioning new campus branch...');

    try {
      const addBranchFn = httpsCallable(functions, 'addBranch');
      await addBranchFn({
        orgId: organization.id,
        school: {
          name,
          code: code.toUpperCase(),
          type,
          country: organization.country || 'KE',
          curriculumType,
          gradingMode,
          address: {
            line1: addressLine || 'Campus Road',
            city: city || 'City Campus',
            country: organization.country || 'KE',
          },
          phone: phone || '+254700000000',
        },
      });

      toast.success(`Campus branch "${name}" added successfully!`, { id: toastId });
      setIsModalOpen(false);
      // Reset form
      setName('');
      setCode('');
    } catch (err: unknown) {
      console.error('Error creating branch:', err);
      const msg = err instanceof Error ? err.message : 'Failed to add branch';
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Campus Branches
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage multi-campus operations for {organization?.name || 'your institution'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Branch
        </Button>
      </div>

      {/* Branches List */}
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

      {/* Add Branch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Campus Branch"
        description="Provision an independent branch ledger with custom curriculum & staff"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 mt-2">
          <Input
            label="Branch Name"
            placeholder="e.g. Mombasa Coastal Campus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
