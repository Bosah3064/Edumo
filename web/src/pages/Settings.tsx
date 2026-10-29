import React, { useEffect, useState } from 'react';
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
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { sanitizeSchoolEmailDomain } from '../utils/admission';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export const Settings: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  const [orgName, setOrgName] = useState(organization?.name || 'Edumo Academy');
  const [curriculum, setCurriculum] = useState<string>(currentSchool?.curriculumType || 'CBC');
  const [gradingMode, setGradingMode] = useState<string>(currentSchool?.gradingMode || 'cbc_no_aggregate');
  const [currency, setCurrency] = useState(organization?.country === 'UG' ? 'UGX' : 'KES');
  const currentEmailDomain = (currentSchool?.settings as Record<string, unknown> | undefined)?.emailDomain;
  const [emailDomain, setEmailDomain] = useState<string>(
    typeof currentEmailDomain === 'string'
      ? currentEmailDomain
      : currentSchool?.contacts?.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || ''
  );
  const [primaryColor, setPrimaryColor] = useState(currentSchool?.branding?.primaryColor || '#1d5f99');
  const [secondaryColor, setSecondaryColor] = useState(currentSchool?.branding?.secondaryColor || '#683669');
  const [schoolMotto, setSchoolMotto] = useState(currentSchool?.branding?.motto || '');
  const [logoUrl, setLogoUrl] = useState(currentSchool?.branding?.logo || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const existingScale = (currentSchool?.gradingConfig as { scale?: Array<{ label: string; min: number; max: number }> } | undefined)?.scale;
  const [gradingScale, setGradingScale] = useState<Array<{ label: string; min: number; max: number }>>(
    existingScale?.length ? existingScale : [
      { label: 'Exceeding Expectations', min: 75, max: 100 },
      { label: 'Meeting Expectations', min: 50, max: 74 },
      { label: 'Approaching Expectations', min: 25, max: 49 },
      { label: 'Below Expectations', min: 0, max: 24 },
    ]
  );
  const [applyGradingToAllBranches, setApplyGradingToAllBranches] = useState(false);

  useEffect(() => {
    if (!currentSchool) return;
    setCurriculum(currentSchool.curriculumType || 'CBC');
    setGradingMode(currentSchool.gradingMode || 'cbc_no_aggregate');
    setPrimaryColor(currentSchool.branding?.primaryColor || '#1d5f99');
    setSecondaryColor(currentSchool.branding?.secondaryColor || '#683669');
    setSchoolMotto(currentSchool.branding?.motto || '');
    setLogoUrl(currentSchool.branding?.logo || '');
    setLogoFile(null);
    setLogoPreviewUrl('');
    const domain = (currentSchool.settings as Record<string, unknown> | undefined)?.emailDomain;
    setEmailDomain(typeof domain === 'string' ? domain : currentSchool.contacts?.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || '');
  }, [currentSchool?.id]);

  useEffect(() => {
    document.documentElement.style.setProperty('--school-primary', primaryColor);
    document.documentElement.style.setProperty('--school-secondary', secondaryColor);
    document.documentElement.style.setProperty('--school-brand-gradient', `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`);
  }, [primaryColor, secondaryColor]);

  const colorPresets = [
    { name: 'Edumo Blue', primary: '#1d5f99', secondary: '#683669' },
    { name: 'Forest Green', primary: '#166534', secondary: '#15803d' },
    { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#2563eb' },
    { name: 'School Burgundy', primary: '#7f1d1d', secondary: '#a5243d' },
    { name: 'Teal Academy', primary: '#0f766e', secondary: '#0891b2' },
    { name: 'Purple Crest', primary: '#5b21b6', secondary: '#7c3aed' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      await updateDoc(doc(db, 'organizations', organization.id), { name: orgName.trim() });
      if (currentSchool) {
        let savedLogoUrl = logoUrl;
        if (logoFile) {
          const logoRef = ref(storage, `${organization.id}/${currentSchool.id}/branding/logo-${Date.now()}.${logoFile.name.split('.').pop() || 'png'}`);
          await uploadBytes(logoRef, logoFile, { contentType: logoFile.type });
          savedLogoUrl = await getDownloadURL(logoRef);
        }
        await updateDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id), {
          curriculumType: curriculum,
          gradingMode,
          'settings.emailDomain': sanitizeSchoolEmailDomain(emailDomain),
          branding: {
            primaryColor,
            secondaryColor,
            motto: schoolMotto.trim(),
            logo: savedLogoUrl,
          },
          gradingConfig: { ...currentSchool.gradingConfig, scale: gradingScale },
        });

        if (applyGradingToAllBranches) {
          const schoolsSnapshot = await getDocs(
            collection(db, 'organizations', organization.id, 'schools')
          );
          await Promise.all(schoolsSnapshot.docs.map((schoolDoc) =>
            updateDoc(schoolDoc.ref, {
              gradingMode,
              gradingConfig: { scale: gradingScale },
            })
          ));
        }
        setLogoUrl(savedLogoUrl);
        setLogoFile(null);
        setLogoPreviewUrl(savedLogoUrl);
      }
      toast.success('Settings updated successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Input
              label="School Email Domain"
              placeholder="nyambaria.co.ke"
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              helperText="Used for automatic learner email addresses"
            />
          </div>
        </Card>

        {/* School Branding */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-4 h-4 text-brand-700" />
            <h3 className="text-sm font-semibold text-gray-900">School Branding & Colours</h3>
          </div>

          <p className="text-xs text-gray-500">
            Choose a ready-made theme or customise colours for this school branch only.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colorPresets.map((preset) => {
              const isSelected = primaryColor === preset.primary && secondaryColor === preset.secondary;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(preset.primary);
                    setSecondaryColor(preset.secondary);
                  }}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    isSelected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="h-8 rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }} />
                  <span className="text-xs font-semibold text-gray-700">{preset.name}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Live school preview</p>
            <div className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 px-3 py-3">
              <div
                className="w-11 h-11 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold shadow-sm"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="School logo preview" className="w-full h-full object-cover" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="School logo preview" className="w-full h-full object-cover" />
                ) : (
                  (currentSchool?.name || 'S').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{currentSchool?.name || 'School Name'}</p>
                <p className="text-xs text-gray-500 truncate">{schoolMotto || 'School motto'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Primary Colour
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="mt-1.5 block w-full h-11 rounded-xl border border-gray-200 bg-white p-1"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Secondary Colour
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="mt-1.5 block w-full h-11 rounded-xl border border-gray-200 bg-white p-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="School Motto"
              placeholder="Knowledge, Discipline and Service"
              value={schoolMotto}
              onChange={(e) => setSchoolMotto(e.target.value)}
            />
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              School Logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  if (!file) {
                    setLogoPreviewUrl('');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setLogoPreviewUrl(typeof reader.result === 'string' ? reader.result : '');
                  reader.readAsDataURL(file);
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white text-xs text-gray-600 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-2.5 file:text-gray-700"
              />
            </label>
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

        {/* Editable grading scale */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Grading Scale</h3>
              <p className="text-xs text-gray-500 mt-0.5">Edit grade bands for this school or every campus branch.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGradingScale((scale) => [...scale, { label: 'New Grade', min: 0, max: 0 }])}
            >
              Add Grade
            </Button>
          </div>

          <div className="space-y-2">
            {gradingScale.map((grade, index) => (
              <div key={index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-center">
                <Input
                  aria-label="Grade label"
                  value={grade.label}
                  onChange={(e) => setGradingScale((scale) => scale.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}
                />
                <Input
                  aria-label="Minimum percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={grade.min}
                  onChange={(e) => setGradingScale((scale) => scale.map((item, i) => i === index ? { ...item, min: Number(e.target.value) } : item))}
                />
                <Input
                  aria-label="Maximum percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={grade.max}
                  onChange={(e) => setGradingScale((scale) => scale.map((item, i) => i === index ? { ...item, max: Number(e.target.value) } : item))}
                />
                <button
                  type="button"
                  onClick={() => setGradingScale((scale) => scale.filter((_, i) => i !== index))}
                  className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                  title="Remove grade"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={applyGradingToAllBranches}
              onChange={(e) => setApplyGradingToAllBranches(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Apply this grading mode and scale to all school branches
          </label>
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
