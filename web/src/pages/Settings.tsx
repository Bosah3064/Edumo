import React, { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  Settings as SettingsIcon,
  Globe,
  Sliders,
  ShieldAlert,
  Smartphone,
  Save,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  CreditCard,
  MessageSquare,
  Clock,
  Languages,
  Palette,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { sanitizeSchoolEmailDomain } from '../utils/admission';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

/* ------------------------------------------------------------------ */
/*  Section collapse helper                                           */
/* ------------------------------------------------------------------ */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ icon, title, subtitle, isOpen, onToggle }) => (
  <button
    type="button"
    className="w-full flex items-center justify-between gap-3 text-left"
    onClick={onToggle}
  >
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-2xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {isOpen ? (
      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
    ) : (
      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
    )}
  </button>
);

/* ================================================================== */
/*  Settings Page                                                      */
/* ================================================================== */
export const Settings: React.FC = () => {
  const { organization, currentSchool } = useTenant();

  /* ---- Section collapse state ---- */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    registration: true,
    address: true,
    contacts: true,
    branding: true,
    curriculum: true,
    grading: true,
    calendar: true,
    capacity: true,
    language: true,
    payment: false,
    pwa: false,
  });
  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  /* ---- Organisation ---- */
  const [orgName, setOrgName] = useState(organization?.name || 'Edumo Academy');

  /* ---- School Registration ---- */
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [schoolType, setSchoolType] = useState<string>('combined');
  const [boardingType, setBoardingType] = useState<string>('day');
  const [principalName, setPrincipalName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [schoolCapacity, setSchoolCapacity] = useState<number>(500);

  /* ---- Address ---- */
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressCountry, setAddressCountry] = useState<string>('KE');

  /* ---- Contact ---- */
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAltPhone, setSchoolAltPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const currentEmailDomain = (currentSchool?.settings as Record<string, unknown> | undefined)?.emailDomain;
  const [emailDomain, setEmailDomain] = useState<string>(
    typeof currentEmailDomain === 'string'
      ? currentEmailDomain
      : currentSchool?.contacts?.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || ''
  );

  /* ---- Curriculum & Grading ---- */
  const [curriculum, setCurriculum] = useState<string>(currentSchool?.curriculumType || 'CBC');
  const [gradingMode, setGradingMode] = useState<string>(currentSchool?.gradingMode || 'cbc_no_aggregate');
  const [currency, setCurrency] = useState(organization?.country === 'UG' ? 'UGX' : 'KES');
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

  /* ---- Branding ---- */
  const [primaryColor, setPrimaryColor] = useState(currentSchool?.branding?.primaryColor || '#1d5f99');
  const [secondaryColor, setSecondaryColor] = useState(currentSchool?.branding?.secondaryColor || '#683669');
  const [schoolMotto, setSchoolMotto] = useState(currentSchool?.branding?.motto || '');
  const [logoUrl, setLogoUrl] = useState(currentSchool?.branding?.logo || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [brandingSaved, setBrandingSaved] = useState(false);

  /* ---- Academic Calendar ---- */
  const [termsPerYear, setTermsPerYear] = useState<number>(3);
  const [termDates, setTermDates] = useState<Array<{ name: string; start: string; end: string }>>([
    { name: 'Term 1', start: '', end: '' },
    { name: 'Term 2', start: '', end: '' },
    { name: 'Term 3', start: '', end: '' },
  ]);

  /* ---- Language & Timezone ---- */
  const [language, setLanguage] = useState<string>('en');
  const [timezone, setTimezone] = useState<string>('Africa/Nairobi');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');

  /* ---- Payment ---- */
  const [paymentProvider, setPaymentProvider] = useState<string>('mpesa');
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [mpesaPasskey, setMpesaPasskey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [smsCreditsBalance, setSmsCreditsBalance] = useState<number>(0);

  /* ---- Saving state ---- */
  const [isSaving, setIsSaving] = useState(false);

  /* ================================================================ */
  /*  Hydrate state from currentSchool whenever it changes            */
  /* ================================================================ */
  useEffect(() => {
    if (!currentSchool) return;

    // Curriculum & grading
    setCurriculum(currentSchool.curriculumType || 'CBC');
    setGradingMode(currentSchool.gradingMode || 'cbc_no_aggregate');

    // Branding
    setPrimaryColor(currentSchool.branding?.primaryColor || '#1d5f99');
    setSecondaryColor(currentSchool.branding?.secondaryColor || '#683669');
    setSchoolMotto(currentSchool.branding?.motto || '');
    setLogoUrl(currentSchool.branding?.logo || '');
    setLogoFile(null);
    setLogoPreviewUrl('');

    // Email domain
    const domain = (currentSchool.settings as Record<string, unknown> | undefined)?.emailDomain;
    setEmailDomain(typeof domain === 'string' ? domain : currentSchool.contacts?.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || '');

    // Registration fields from settings
    const s = currentSchool.settings as Record<string, unknown> | undefined;
    setRegistrationNumber((s?.registrationNumber as string) || '');
    setSchoolType(currentSchool.type || 'combined');
    setBoardingType((s?.boardingType as string) || 'day');
    setPrincipalName((s?.principalName as string) || '');
    setWebsiteUrl(currentSchool.contacts?.website || '');
    setSchoolCapacity((s?.capacity as number) || 500);

    // Address
    if (currentSchool.address) {
      setAddressLine1(currentSchool.address.line1 || '');
      setAddressLine2(currentSchool.address.line2 || '');
      setCity(currentSchool.address.city || '');
      setCounty(currentSchool.address.county || '');
      setPostalCode(currentSchool.address.postalCode || '');
      setAddressCountry(currentSchool.address.country || 'KE');
    }

    // Contacts
    if (currentSchool.contacts) {
      setSchoolPhone(currentSchool.contacts.phone || '');
      setSchoolAltPhone(currentSchool.contacts.altPhone || '');
      setSchoolEmail(currentSchool.contacts.email || '');
    }

    // Calendar
    const cal = currentSchool.academicCalendar;
    if (cal) {
      setTermsPerYear(cal.termsPerYear || 3);
    }
    const savedTermDates = (s?.termDates as Array<{ name: string; start: string; end: string }>) || null;
    if (savedTermDates?.length) {
      setTermDates(savedTermDates);
    }

    // Language & timezone
    const lang = (s?.language as string) || 'en';
    setLanguage(lang);
    const tz = (s?.timezone as string) || 'Africa/Nairobi';
    setTimezone(tz);
    const df = (s?.dateFormat as string) || 'DD/MM/YYYY';
    setDateFormat(df);

    // Payment
    const pay = (s?.payment as Record<string, unknown>) || {};
    setPaymentProvider((pay.provider as string) || 'mpesa');
    setMpesaShortcode((pay.mpesaShortcode as string) || '');
    setMpesaPasskey((pay.mpesaPasskey as string) || '');
    setBankName((pay.bankName as string) || '');
    setBankAccountNumber((pay.bankAccountNumber as string) || '');
    setBankAccountName((pay.bankAccountName as string) || '');
    setSmsCreditsBalance((s?.smsCreditsBalance as number) || 0);

    setBrandingSaved(false);
  }, [currentSchool?.id]);

  /* ================================================================ */
  /*  Apply per-school branding colours live                          */
  /* ================================================================ */
  useEffect(() => {
    document.documentElement.style.setProperty('--school-primary', primaryColor);
    document.documentElement.style.setProperty('--school-secondary', secondaryColor);
    document.documentElement.style.setProperty('--school-brand-gradient', `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`);
  }, [primaryColor, secondaryColor]);

  /* ================================================================ */
  /*  Update term date rows when termsPerYear changes                  */
  /* ================================================================ */
  useEffect(() => {
    setTermDates((prev) => {
      if (prev.length === termsPerYear) return prev;
      if (prev.length < termsPerYear) {
        return [
          ...prev,
          ...Array.from({ length: termsPerYear - prev.length }, (_, i) => ({
            name: `Term ${prev.length + i + 1}`,
            start: '',
            end: '',
          })),
        ];
      }
      return prev.slice(0, termsPerYear);
    });
  }, [termsPerYear]);

  /* ================================================================ */
  /*  Colour Presets                                                    */
  /* ================================================================ */
  const colorPresets = [
    { name: 'Edumo Blue', primary: '#1d5f99', secondary: '#683669' },
    { name: 'Forest Green', primary: '#166534', secondary: '#15803d' },
    { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#2563eb' },
    { name: 'School Burgundy', primary: '#7f1d1d', secondary: '#a5243d' },
    { name: 'Teal Academy', primary: '#0f766e', secondary: '#0891b2' },
    { name: 'Purple Crest', primary: '#5b21b6', secondary: '#7c3aed' },
    { name: 'Ocean Blue', primary: '#0369a1', secondary: '#06b6d4' },
    { name: 'Emerald Gold', primary: '#047857', secondary: '#d97706' },
    { name: 'Rose Academy', primary: '#be123c', secondary: '#db2777' },
    { name: 'Sunset Orange', primary: '#c2410c', secondary: '#eab308' },
    { name: 'Indigo Sky', primary: '#3730a3', secondary: '#6366f1' },
    { name: 'Slate Mint', primary: '#334155', secondary: '#10b981' },
    { name: 'Charcoal Crimson', primary: '#1f2937', secondary: '#dc2626' },
    { name: 'Cobalt Coral', primary: '#1d4ed8', secondary: '#f97316' },
    { name: 'Plum Violet', primary: '#701a75', secondary: '#8b5cf6' },
  ];

  /* ================================================================ */
  /*  SAVE HANDLER                                                     */
  /* ================================================================ */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) {
      toast.error('No organization workspace loaded. Please refresh or sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update org-level name
      await updateDoc(doc(db, 'organizations', organization.id), { name: orgName.trim() });

      if (currentSchool) {
        // 2. Upload logo if changed
        let savedLogoUrl = logoUrl;
        if (logoFile) {
          const logoRef = ref(storage, `${organization.id}/${currentSchool.id}/branding/logo-${Date.now()}.${logoFile.name.split('.').pop() || 'png'}`);
          await uploadBytes(logoRef, logoFile, { contentType: logoFile.type });
          savedLogoUrl = await getDownloadURL(logoRef);
        }

        // 3. Build the school update payload
        const schoolUpdate: Record<string, unknown> = {
          // Core type
          type: schoolType,
          curriculumType: curriculum,
          gradingMode,
          gradingConfig: { ...currentSchool.gradingConfig, scale: gradingScale },

          // Branding (per-school)
          branding: {
            primaryColor,
            secondaryColor,
            motto: schoolMotto.trim(),
            logo: savedLogoUrl,
          },

          // Address
          address: {
            line1: addressLine1.trim(),
            line2: addressLine2.trim(),
            city: city.trim(),
            county: county.trim(),
            postalCode: postalCode.trim(),
            country: addressCountry,
          },

          // Contacts
          contacts: {
            phone: schoolPhone.trim(),
            altPhone: schoolAltPhone.trim(),
            email: schoolEmail.trim(),
            website: websiteUrl.trim(),
          },

          // Academic calendar
          academicCalendar: {
            termsPerYear,
            ...(currentSchool.academicCalendar?.currentAcademicYearId
              ? { currentAcademicYearId: currentSchool.academicCalendar.currentAcademicYearId }
              : {}),
            ...(currentSchool.academicCalendar?.currentTermId
              ? { currentTermId: currentSchool.academicCalendar.currentTermId }
              : {}),
          },

          // Settings bag – per-school scoped
          settings: {
            ...(currentSchool.settings || {}),
            emailDomain: sanitizeSchoolEmailDomain(emailDomain),
            registrationNumber: registrationNumber.trim(),
            boardingType,
            principalName: principalName.trim(),
            capacity: schoolCapacity,
            language,
            timezone,
            dateFormat,
            termDates,
            smsCreditsBalance,
            payment: {
              provider: paymentProvider,
              mpesaShortcode: mpesaShortcode.trim(),
              mpesaPasskey: mpesaPasskey.trim(),
              bankName: bankName.trim(),
              bankAccountNumber: bankAccountNumber.trim(),
              bankAccountName: bankAccountName.trim(),
            },
          },
        };

        await updateDoc(
          doc(db, 'organizations', organization.id, 'schools', currentSchool.id),
          schoolUpdate
        );

        // 4. Apply grading to all branches if toggled
        if (applyGradingToAllBranches) {
          const schoolsSnapshot = await getDocs(
            collection(db, 'organizations', organization.id, 'schools')
          );
          await Promise.all(
            schoolsSnapshot.docs.map((schoolDoc) =>
              updateDoc(schoolDoc.ref, {
                gradingMode,
                gradingConfig: { scale: gradingScale },
              })
            )
          );
        }

        setLogoUrl(savedLogoUrl);
        setLogoFile(null);
        setLogoPreviewUrl(savedLogoUrl);
        setBrandingSaved(true);
      }

      toast.success(`${currentSchool?.name || 'School'} settings saved successfully!`);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
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

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
          Institution &amp; Campus Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure school registration, branding, curriculum, calendar, and more — all changes apply to <span className="font-bold text-gray-700">{currentSchool?.name || 'this campus'}</span> only.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
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

        {/* ============================================================ */}
        {/*  1. SCHOOL REGISTRATION & IDENTITY                           */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Building2 className="w-4 h-4 text-brand-700" />}
            title="School Registration & Identity"
            subtitle="Government registration details and school classification"
            isOpen={openSections.registration}
            onToggle={() => toggle('registration')}
          />

          {openSections.registration && (
            <div className="space-y-4 pt-2">
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
                  label="Registration / Gov't ID Number"
                  placeholder="e.g. MoE/KE/2024/001"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  helperText="Official school registration number"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="School Type"
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  options={[
                    { label: 'Nursery / ECDE', value: 'nursery' },
                    { label: 'Primary', value: 'primary' },
                    { label: 'Secondary', value: 'secondary' },
                    { label: 'Combined (All Levels)', value: 'combined' },
                  ]}
                />
                <Select
                  label="Boarding Status"
                  value={boardingType}
                  onChange={(e) => setBoardingType(e.target.value)}
                  options={[
                    { label: 'Day School', value: 'day' },
                    { label: 'Boarding School', value: 'boarding' },
                    { label: 'Day & Boarding', value: 'mixed' },
                  ]}
                />
                <Input
                  label="Principal / Head Teacher"
                  placeholder="Full name"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="School Website URL"
                  placeholder="https://www.school.ac.ke"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <Input
                  label="Maximum Student Capacity"
                  type="number"
                  min="1"
                  value={schoolCapacity}
                  onChange={(e) => setSchoolCapacity(Number(e.target.value))}
                  helperText="Used for enrollment limits"
                />
                <Input
                  label="School Email Domain"
                  placeholder="nyambaria.co.ke"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  helperText="Used for auto-generated learner emails"
                />
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  2. SCHOOL ADDRESS                                           */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<MapPin className="w-4 h-4 text-brand-700" />}
            title="School Physical Address"
            subtitle="Location details for official records and correspondence"
            isOpen={openSections.address}
            onToggle={() => toggle('address')}
          />

          {openSections.address && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Address Line 1"
                  placeholder="Street name, building, or P.O. Box"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
                <Input
                  label="Address Line 2"
                  placeholder="Additional details (optional)"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input
                  label="City / Town"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="County / District"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                />
                <Input
                  label="Postal Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
                <Select
                  label="Country"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  options={[
                    { label: '🇰🇪 Kenya', value: 'KE' },
                    { label: '🇺🇬 Uganda', value: 'UG' },
                    { label: '🇹🇿 Tanzania', value: 'TZ' },
                    { label: '🇷🇼 Rwanda', value: 'RW' },
                  ]}
                />
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  3. CONTACT INFORMATION                                      */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Phone className="w-4 h-4 text-brand-700" />}
            title="Contact Information"
            subtitle="Phone, email and communication channels"
            isOpen={openSections.contacts}
            onToggle={() => toggle('contacts')}
          />

          {openSections.contacts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="School Phone Number"
                placeholder="+254 7XX XXX XXX"
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(e.target.value)}
              />
              <Input
                label="Alternative Phone"
                placeholder="+254 7XX XXX XXX"
                value={schoolAltPhone}
                onChange={(e) => setSchoolAltPhone(e.target.value)}
              />
              <Input
                label="School Email Address"
                placeholder="info@school.ac.ke"
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  4. SCHOOL BRANDING & COLOURS                                */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              icon={<Palette className="w-4 h-4 text-brand-700" />}
              title="School Branding & Colours"
              subtitle="Customise visual identity for this campus only"
              isOpen={openSections.branding}
              onToggle={() => toggle('branding')}
            />
            {brandingSaved && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 shrink-0">
                Saved for this school
              </span>
            )}
          </div>

          {openSections.branding && (
            <div className="space-y-4 pt-2">
              {/* Colour Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {colorPresets.map((preset) => {
                  const isSelected = primaryColor === preset.primary && secondaryColor === preset.secondary;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(preset.primary);
                        setSecondaryColor(preset.secondary);
                        setBrandingSaved(false);
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        isSelected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="h-10 rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }} />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-700">{preset.name}</span>
                        {isSelected && <span className="text-[11px] font-bold text-emerald-700">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Live Preview */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Live school preview</p>
                  <span className="text-xs font-semibold text-gray-500">Updates while choosing colours</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold shadow-sm" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                        {logoPreviewUrl ? <img src={logoPreviewUrl} alt="Logo preview" className="w-full h-full object-cover" /> : logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : (currentSchool?.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{currentSchool?.name || 'School Name'}</p>
                        <p className="text-xs text-gray-500 truncate">{schoolMotto || 'School motto'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="rounded-lg px-3 py-2 text-white" style={{ background: primaryColor }}>Dashboard</div>
                      <div className="rounded-lg px-3 py-2 border border-gray-200 text-gray-700">Students</div>
                      <div className="rounded-lg px-3 py-2 border border-gray-200 text-gray-700">Assignments</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div><p className="text-sm font-bold text-gray-900">School overview</p><p className="text-xs text-gray-500">Branded dashboard preview</p></div>
                      <button type="button" className="rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>Add Student</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[['Students', '1,248'], ['Teachers', '86'], ['Attendance', '96%']].map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 p-3"><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>{value}</p></div>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Colour Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Primary Colour
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => { setPrimaryColor(e.target.value); setBrandingSaved(false); }}
                      aria-label="Choose primary school colour"
                      className="block h-11 w-20 rounded-xl border border-gray-200 bg-white p-1"
                    />
                    <input
                      type="text"
                      value={primaryColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { setPrimaryColor(e.target.value); setBrandingSaved(false); } }}
                      aria-label="Primary colour hex code"
                      className="block h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900"
                    />
                  </div>
                </label>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Secondary Colour
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => { setSecondaryColor(e.target.value); setBrandingSaved(false); }}
                      aria-label="Choose secondary school colour"
                      className="block h-11 w-20 rounded-xl border border-gray-200 bg-white p-1"
                    />
                    <input
                      type="text"
                      value={secondaryColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { setSecondaryColor(e.target.value); setBrandingSaved(false); } }}
                      aria-label="Secondary colour hex code"
                      className="block h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900"
                    />
                  </div>
                </label>
              </div>

              {/* Motto & Logo */}
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
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  5. CURRICULUM & REGIONAL REGULATIONS                        */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Globe className="w-4 h-4 text-accent-700" />}
            title="Curriculum & Regional Regulations"
            subtitle="Country-specific curriculum system and billing currency"
            isOpen={openSections.curriculum}
            onToggle={() => toggle('curriculum')}
          />

          {openSections.curriculum && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
          )}
        </Card>

        {/* ============================================================ */}
        {/*  6. GRADING SCALE                                            */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<GraduationCap className="w-4 h-4 text-accent-700" />}
            title="Grading Scale"
            subtitle="Edit grade bands for this school or all branches"
            isOpen={openSections.grading}
            onToggle={() => toggle('grading')}
          />

          {openSections.grading && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-end">
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
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  7. ACADEMIC CALENDAR / TERM DATES                           */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Calendar className="w-4 h-4 text-brand-700" />}
            title="Academic Calendar & Term Dates"
            subtitle="Configure school terms / semesters and their dates"
            isOpen={openSections.calendar}
            onToggle={() => toggle('calendar')}
          />

          {openSections.calendar && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Terms Per Year"
                  value={String(termsPerYear)}
                  onChange={(e) => setTermsPerYear(Number(e.target.value))}
                  options={[
                    { label: '2 Terms (Semesters)', value: '2' },
                    { label: '3 Terms', value: '3' },
                    { label: '4 Terms (Quarters)', value: '4' },
                  ]}
                />
              </div>

              <div className="space-y-3">
                {termDates.map((term, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-end">
                    <Input
                      label={idx === 0 ? 'Term Name' : undefined}
                      value={term.name}
                      onChange={(e) => setTermDates((prev) => prev.map((t, i) => i === idx ? { ...t, name: e.target.value } : t))}
                    />
                    <Input
                      label={idx === 0 ? 'Start Date' : undefined}
                      type="date"
                      value={term.start}
                      onChange={(e) => setTermDates((prev) => prev.map((t, i) => i === idx ? { ...t, start: e.target.value } : t))}
                    />
                    <Input
                      label={idx === 0 ? 'End Date' : undefined}
                      type="date"
                      value={term.end}
                      onChange={(e) => setTermDates((prev) => prev.map((t, i) => i === idx ? { ...t, end: e.target.value } : t))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  8. LANGUAGE, TIMEZONE & DATE FORMAT                         */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Languages className="w-4 h-4 text-brand-700" />}
            title="Language, Timezone & Date Format"
            subtitle="Localisation preferences for this school"
            isOpen={openSections.language}
            onToggle={() => toggle('language')}
          />

          {openSections.language && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Select
                label="Display Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { label: 'English', value: 'en' },
                  { label: 'Kiswahili', value: 'sw' },
                  { label: 'Kinyarwanda', value: 'rw' },
                  { label: 'Français', value: 'fr' },
                  { label: 'Luganda', value: 'lg' },
                ]}
              />
              <Select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { label: 'East Africa Time (EAT, UTC+3)', value: 'Africa/Nairobi' },
                  { label: 'Central Africa Time (CAT, UTC+2)', value: 'Africa/Maputo' },
                  { label: 'West Africa Time (WAT, UTC+1)', value: 'Africa/Lagos' },
                  { label: 'UTC', value: 'UTC' },
                ]}
              />
              <Select
                label="Date Format"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                options={[
                  { label: 'DD/MM/YYYY (31/12/2025)', value: 'DD/MM/YYYY' },
                  { label: 'MM/DD/YYYY (12/31/2025)', value: 'MM/DD/YYYY' },
                  { label: 'YYYY-MM-DD (2025-12-31)', value: 'YYYY-MM-DD' },
                ]}
              />
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  9. PAYMENT & SMS SETTINGS                                   */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<CreditCard className="w-4 h-4 text-brand-700" />}
            title="Payment & SMS Configuration"
            subtitle="Mobile money, bank details, and SMS credits"
            isOpen={openSections.payment}
            onToggle={() => toggle('payment')}
          />

          {openSections.payment && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Payment Provider"
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  options={[
                    { label: 'M-Pesa (Safaricom)', value: 'mpesa' },
                    { label: 'MTN Mobile Money', value: 'mtn_momo' },
                    { label: 'Airtel Money', value: 'airtel_money' },
                    { label: 'Bank Transfer Only', value: 'bank' },
                    { label: 'Multiple Methods', value: 'multiple' },
                  ]}
                />
                {(paymentProvider === 'mpesa' || paymentProvider === 'multiple') && (
                  <>
                    <Input
                      label="M-Pesa Shortcode / Paybill"
                      placeholder="e.g. 174379"
                      value={mpesaShortcode}
                      onChange={(e) => setMpesaShortcode(e.target.value)}
                      helperText="Your Daraja API shortcode"
                    />
                    <Input
                      label="M-Pesa Passkey"
                      placeholder="Daraja API passkey"
                      value={mpesaPasskey}
                      onChange={(e) => setMpesaPasskey(e.target.value)}
                      helperText="Stored server-side securely"
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Bank Name"
                  placeholder="e.g. Equity Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <Input
                  label="Bank Account Number"
                  placeholder="Account number"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
                <Input
                  label="Bank Account Name"
                  placeholder="Account holder name"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                />
              </div>

              {/* SMS Credits display */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-900">SMS Credits Balance</p>
                  <p className="text-2xs text-gray-500">Used for attendance alerts, fee reminders, and parent notifications</p>
                </div>
                <span className="text-lg font-bold text-blue-700">{smsCreditsBalance.toLocaleString()}</span>
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  10. PWA & CACHE MANAGEMENT                                  */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Smartphone className="w-4 h-4 text-brand-700" />}
            title="Progressive Web App (PWA) & Offline Cache"
            isOpen={openSections.pwa}
            onToggle={() => toggle('pwa')}
          />

          {openSections.pwa && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 border border-surface-800 text-xs pt-2">
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
          )}
        </Card>

        {/* ============================================================ */}
        {/*  SAVE BUTTON                                                 */}
        {/* ============================================================ */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            isLoading={isSaving}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
