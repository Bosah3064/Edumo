import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import {
  Settings as SettingsIcon,
  Globe,
  Sliders,
  ShieldAlert,
  Smartphone,
  Save,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [orgName, setOrgName] = useState(organization?.name || 'Edumo Academy');
  const [curriculum, setCurriculum] = useState<string>(currentSchool?.curriculumType || 'CBC');
  const [gradingMode, setGradingMode] = useState<string>(currentSchool?.gradingMode || 'cbc_no_aggregate');
  const [currency, setCurrency] = useState(organization?.country === 'UG' ? 'UGX' : 'KES');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Settings updated successfully!');
  };

  const handleClearOfflineCache = () => {
    try {
      localStorage.removeItem('edumo_offline_queue');
      toast.success('Local offline cache reset successfully.');
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
          Institution & Campus Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure country curriculum pack, branding, and offline cache
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Country Pack Notice */}
        <div className="p-4 rounded-2xl bg-warning-500/10 border border-warning-500/20 flex items-start gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-warning-800 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900">
              VERIFY WITH OFFICIAL SOURCE: Country Pack Parameters
            </h4>
            <p className="text-gray-700 mt-0.5 leading-relaxed text-2xs">
              All regional grading scales (e.g., KICD CBC rubric levels, UNEB O-Level aggregates,
              NECTA division boundaries) are seeded defaults. They remain completely editable in accordance
              with your Ministry of Education official circulars.
            </p>
          </div>
        </div>

        {/* Institution Profile */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-4 h-4 text-brand-700" />
            <h3 className="text-sm font-semibold text-gray-900">
              Organization & Branding
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <Input
              label="Active Campus Branch"
              value={currentSchool?.name || 'Main Campus'}
              disabled
            />
          </div>
        </Card>

        {/* Country Pack & Curricula */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-accent-700" />
            <h3 className="text-sm font-semibold text-gray-900">
              Curriculum & Regional Regulations
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Curriculum System"
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              options={[
                { label: '🇰🇪 CBC (Kenya Competency-Based)', value: 'CBC' },
                { label: '🇰🇪 8-4-4 Classic (Kenya)', value: '8-4-4' },
                { label: '🇺🇬 UNEB (Uganda)', value: 'UNEB' },
                { label: '🇹🇿 NECTA (Tanzania)', value: 'NECTA' },
                { label: '🇷🇼 Rwanda Competence (A-E)', value: 'Rwanda' },
              ]}
            />

            <Select
              label="Grading Mode"
              value={gradingMode}
              onChange={(e) => setGradingMode(e.target.value)}
              options={[
                { label: 'CBC No-Aggregate Rank', value: 'cbc_no_aggregate' },
                { label: 'Classic Marks & Positions', value: 'classic_marks_rank' },
                { label: 'UNEB Aggregate Points', value: 'uneb' },
                { label: 'NECTA Division Calculation', value: 'necta' },
                { label: 'Rwanda Letter (A-E)', value: 'rwanda' },
              ]}
            />

            <Select
              label="Base Billing Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { label: 'KES (Kenyan Shilling)', value: 'KES' },
                { label: 'UGX (Ugandan Shilling)', value: 'UGX' },
                { label: 'TZS (Tanzanian Shilling)', value: 'TZS' },
                { label: 'RWF (Rwandan Franc)', value: 'RWF' },
                { label: 'USD (US Dollar)', value: 'USD' },
              ]}
            />
          </div>
        </Card>

        {/* PWA & Cache management */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4 text-brand-700" />
            <h3 className="text-sm font-semibold text-gray-900">
              Progressive Web App (PWA) & Offline Cache
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 border border-surface-800 text-xs">
            <div>
              <p className="font-semibold text-gray-900">Local Offline Storage</p>
              <p className="text-2xs text-gray-500 mt-0.5">
                Edumo uses IndexedDB and localStorage to buffer marks and daily attendance while offline.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearOfflineCache}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-danger-700" />}
            >
              Clear Local Cache
            </Button>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
