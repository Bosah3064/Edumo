import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, functions, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import {
  Building2,
  School,
  Palette,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const { signUp, signOut, refreshClaims, currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Institution & Country Pack
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'standalone' | 'group'>('standalone');
  const [country, setCountry] = useState<'KE' | 'UG' | 'TZ' | 'RW'>('KE');
  const [curriculumType, setCurriculumType] = useState<string>('CBC');
  const [gradingMode, setGradingMode] = useState<string>('cbc_no_aggregate');

  // Step 2: Campus & Academic Structure
  const [branchName, setBranchName] = useState('');
  const [schoolType, setSchoolType] = useState<'nursery' | 'primary' | 'secondary' | 'combined'>('combined');
  const [boardingType, setBoardingType] = useState<'day' | 'boarding' | 'mixed'>('day');
  const [termsPerYear, setTermsPerYear] = useState<number>(3);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('+254712345678');
  const [emailDomain, setEmailDomain] = useState('');

  // Step 3: School Branding & Theme
  const [primaryColor, setPrimaryColor] = useState('#1d5f99');
  const [secondaryColor, setSecondaryColor] = useState('#683669');
  const [schoolMotto, setSchoolMotto] = useState('Excellence, Discipline and Service');

  // Step 4: Administrator Account
  const [adminName, setAdminName] = useState(currentUser?.displayName || '');
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Colour presets
  const colorPresets = [
    { name: 'Edumo Blue', primary: '#1d5f99', secondary: '#683669' },
    { name: 'Forest Green', primary: '#166534', secondary: '#15803d' },
    { name: 'Royal Navy', primary: '#1e3a8a', secondary: '#2563eb' },
    { name: 'School Burgundy', primary: '#7f1d1d', secondary: '#a5243d' },
    { name: 'Teal Academy', primary: '#0f766e', secondary: '#0891b2' },
    { name: 'Purple Crest', primary: '#5b21b6', secondary: '#7c3aed' },
    { name: 'Emerald Gold', primary: '#047857', secondary: '#d97706' },
    { name: 'Sunset Orange', primary: '#c2410c', secondary: '#eab308' },
  ];

  // Auto-align country settings
  const handleCountryChange = (c: 'KE' | 'UG' | 'TZ' | 'RW') => {
    setCountry(c);
    if (c === 'KE') {
      setCurriculumType('CBC');
      setGradingMode('cbc_no_aggregate');
      setPhone('+254712345678');
      if (!city) setCity('Nairobi');
    } else if (c === 'UG') {
      setCurriculumType('UNEB');
      setGradingMode('uneb');
      setPhone('+256712345678');
      if (!city) setCity('Kampala');
    } else if (c === 'TZ') {
      setCurriculumType('NECTA');
      setGradingMode('necta');
      setPhone('+255712345678');
      if (!city) setCity('Dar es Salaam');
    } else if (c === 'RW') {
      setCurriculumType('Rwanda');
      setGradingMode('rwanda');
      setPhone('+250712345678');
      if (!city) setCity('Kigali');
    }
  };

  const handleSignOutToRegisterFresh = async () => {
    try {
      await signOut();
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      toast.success('Signed out. You can now register a fresh administrator account.');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser && (!adminName || !adminEmail || !adminPassword)) {
      toast.error('Please complete all administrator credentials');
      return;
    }
    if (!currentUser && adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!agreeTerms) {
      toast.error('Please accept the Terms of Service & Privacy Policy to continue');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Setting up your institution workspace & country pack...');

    try {
      // 1. If not authenticated, create Firebase user
      if (!currentUser) {
        await signUp(adminEmail, adminPassword, adminName);
      }

      const activeUser = auth.currentUser;
      let orgId = '';
      let schoolId = '';

      // 2. Call createOrganization callable with fallback to direct Firestore setDoc
      try {
        const createOrgFn = httpsCallable<
          {
            name: string;
            type: 'standalone' | 'group';
            country: 'KE' | 'UG' | 'TZ' | 'RW';
            school: {
              name: string;
              type: 'nursery' | 'primary' | 'secondary' | 'combined';
              curriculumType: string;
              gradingMode: string;
              address: {
                line1: string;
                city: string;
                country: 'KE' | 'UG' | 'TZ' | 'RW';
              };
              phone: string;
              email?: string;
            };
            adminDisplayName?: string;
          },
          { orgId: string; schoolId: string }
        >(functions, 'createOrganization');

        const result = await createOrgFn({
          name: orgName.trim(),
          type: orgType,
          country,
          school: {
            name: branchName.trim() || `${orgName.trim()} - Main Campus`,
            type: schoolType,
            curriculumType,
            gradingMode,
            address: {
              line1: addressLine.trim() || 'Campus Road',
              city: city.trim() || 'City Centre',
              country,
            },
            phone: phone.trim() || '+254712345678',
            email: adminEmail.trim(),
          },
          adminDisplayName: adminName.trim() || currentUser?.displayName || 'Administrator',
        });

        orgId = result.data.orgId;
        schoolId = result.data.schoolId;
      } catch (callErr) {
        console.warn('createOrganization callable bypassed (CORS/offline), using direct resilient Firestore provisioning:', callErr);
        if (!activeUser) throw new Error('Authentication state lost. Please try again.');

        const orgDocRef = doc(collection(db, 'organizations'));
        const schoolDocRef = doc(collection(db, 'organizations', orgDocRef.id, 'schools'));
        orgId = orgDocRef.id;
        schoolId = schoolDocRef.id;

        const now = new Date().toISOString();
        await setDoc(orgDocRef, {
          name: orgName.trim(),
          slug: orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
          type: orgType,
          country,
          countryPackId: country,
          branding: {
            primaryColor,
            secondaryColor,
            motto: schoolMotto.trim(),
          },
          plan: 'trial',
          status: 'active',
          ownerId: activeUser.uid,
          createdAt: now,
          createdBy: activeUser.uid,
          updatedAt: now,
          updatedBy: activeUser.uid,
        });

        await setDoc(schoolDocRef, {
          name: branchName.trim() || `${orgName.trim()} - Main Campus`,
          code: 'MAIN',
          type: schoolType,
          country,
          address: {
            line1: addressLine.trim() || 'Campus Road',
            city: city.trim() || 'Nairobi',
            country,
          },
          contacts: {
            phone: phone.trim() || '+254712345678',
            email: adminEmail.trim(),
          },
          curriculumType,
          gradingMode,
          academicCalendar: {
            termsPerYear,
          },
          branding: {
            primaryColor,
            secondaryColor,
            motto: schoolMotto.trim(),
          },
          settings: {
            boardingType,
            emailDomain: emailDomain.trim().toLowerCase(),
          },
          status: 'active',
          createdAt: now,
          createdBy: activeUser.uid,
          updatedAt: now,
          updatedBy: activeUser.uid,
        });

        await setDoc(
          doc(db, 'users', activeUser.uid),
          {
            displayName: adminName.trim() || activeUser.displayName || 'Administrator',
            email: activeUser.email || '',
            memberships: [
              {
                orgId,
                orgName: orgName.trim(),
                schoolIds: [schoolId],
                role: 'orgOwner',
                joinedAt: now,
              },
            ],
            createdAt: now,
          },
          { merge: true }
        );
      }

      // 3. Immediately store branding & campus settings and persist to localStorage
      if (orgId && schoolId) {
        localStorage.setItem('edumo_active_org_id', orgId);
        localStorage.setItem('edumo_active_school_id', schoolId);
        localStorage.setItem(`edumo_active_school_${orgId}`, schoolId);

        try {
          await updateDoc(doc(db, 'organizations', orgId, 'schools', schoolId), {
            branding: {
              primaryColor,
              secondaryColor,
              motto: schoolMotto.trim(),
            },
            academicCalendar: {
              termsPerYear,
            },
            settings: {
              boardingType,
              emailDomain: emailDomain.trim().toLowerCase(),
            },
          });
        } catch {
          // Non-fatal if already written
        }
      }

      // 4. Refresh custom claims if available
      try {
        await refreshClaims();
      } catch {
        // Safe to ignore in direct mode
      }

      toast.success('Institution created successfully! Welcome to Edumo.', { id: toastId });
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check inputs.';
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#1f2937] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#1d5f99]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 animate-fade-in my-8">
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3">
            <EdumoLogo size="xl" showText={true} showSubtitle={true} showBadge={true} to="/" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#1f2937]">
            {t('register.title', 'Register Your School')}
          </h2>
          <p className="text-xs text-[#4b5563] mt-1 font-medium">
            {t('register.subtitle', 'Set up your multi-tenant workspace with country-specific curriculum and branding')}
          </p>
        </div>

        {/* Institutional Administrator Only Guidance Notice */}
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block text-amber-950">
              Institutional Registration Only (School Administrators &amp; Principals)
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This onboarding workflow registers new educational institutions and campus branches. <strong>Teachers, staff members, students, and guardians</strong> do not register here — accounts are provisioned internally by school administration or class teachers.{' '}
              <Link to="/login" className="text-[#1d5f99] font-bold underline hover:text-blue-800">
                Sign in to your school account &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Signed-in user notice */}
        {currentUser && (
          <div className="mb-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-900 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Signed in as <strong className="font-bold">{currentUser.email}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOutToRegisterFresh}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl border border-red-200 transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out First
            </button>
          </div>
        )}

        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { num: 1, label: 'Institution', icon: Building2 },
            { num: 2, label: 'Campus', icon: School },
            { num: 3, label: 'Branding', icon: Palette },
            { num: 4, label: 'Admin', icon: UserCheck },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2 rounded-2xl border text-center transition-all ${
                step === s.num
                  ? 'bg-white border-2 border-[#1d5f99] text-[#1d5f99] font-bold shadow-md'
                  : step > s.num
                  ? 'bg-white border border-emerald-500/40 text-emerald-600 font-semibold'
                  : 'bg-white/60 border border-gray-200 text-gray-400'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold">Step {s.num}</div>
              <div className="text-xs font-semibold truncate">{s.label}</div>
            </div>
          ))}
        </div>

        <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6 sm:p-8">
          {/* STEP 1: Institution & Country Pack */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Institution &amp; Country Pack</h3>
                <p className="text-xs text-gray-500">
                  Select your country to automatically apply official regional curriculum, grading rules, and currency.
                </p>
              </div>

              <Input
                label="Institution / Group Name"
                placeholder="e.g. Nyambaria National Academy"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Institution Model"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as 'standalone' | 'group')}
                  options={[
                    { label: 'Standalone Single Campus', value: 'standalone' },
                    { label: 'Multi-Campus Academy Group', value: 'group' },
                  ]}
                />

                <Select
                  label="Country & Regional Rules"
                  value={country}
                  onChange={(e) =>
                    handleCountryChange(e.target.value as 'KE' | 'UG' | 'TZ' | 'RW')
                  }
                  options={[
                    { label: '🇰🇪 Kenya (KES, CBC / 8-4-4)', value: 'KE' },
                    { label: '🇺🇬 Uganda (UGX, UNEB)', value: 'UG' },
                    { label: '🇹🇿 Tanzania (TZS, NECTA)', value: 'TZ' },
                    { label: '🇷🇼 Rwanda (RWF, CBC A-E)', value: 'RW' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Initial Curriculum System"
                  value={curriculumType}
                  onChange={(e) => setCurriculumType(e.target.value)}
                  options={[
                    { label: 'CBC (Competency Based)', value: 'CBC' },
                    { label: '8-4-4 Classic', value: '8-4-4' },
                    { label: 'UNEB (Uganda)', value: 'UNEB' },
                    { label: 'NECTA (Tanzania)', value: 'NECTA' },
                    { label: 'Rwanda Standard', value: 'Rwanda' },
                    { label: 'Custom / International', value: 'custom' },
                  ]}
                />

                <Select
                  label="Default Grading Mode"
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
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!orgName.trim()) {
                      toast.error('Please enter the institution name');
                      return;
                    }
                    if (!branchName) setBranchName(`${orgName.trim()} - Main Campus`);
                    setStep(2);
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Campus Setup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Campus & Academic Structure */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Main Campus &amp; Academic Terms</h3>
                <p className="text-xs text-gray-500">Configure your primary branch location and academic term rhythm.</p>
              </div>

              <Input
                label="Campus Branch Name"
                placeholder="e.g. Main Campus"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="School Classification"
                  value={schoolType}
                  onChange={(e) =>
                    setSchoolType(e.target.value as 'nursery' | 'primary' | 'secondary' | 'combined')
                  }
                  options={[
                    { label: 'Combined (K-12 / All Grades)', value: 'combined' },
                    { label: 'Primary School', value: 'primary' },
                    { label: 'Secondary School', value: 'secondary' },
                    { label: 'Nursery / Early Years', value: 'nursery' },
                  ]}
                />

                <Select
                  label="Boarding Status"
                  value={boardingType}
                  onChange={(e) =>
                    setBoardingType(e.target.value as 'day' | 'boarding' | 'mixed')
                  }
                  options={[
                    { label: 'Day School', value: 'day' },
                    { label: 'Boarding School', value: 'boarding' },
                    { label: 'Day & Boarding', value: 'mixed' },
                  ]}
                />

                <Select
                  label="Terms Per Year"
                  value={String(termsPerYear)}
                  onChange={(e) => setTermsPerYear(Number(e.target.value))}
                  options={[
                    { label: '3 Terms', value: '3' },
                    { label: '2 Semesters', value: '2' },
                    { label: '4 Quarters', value: '4' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Campus Street / Address"
                  placeholder="e.g. Ngong Road, Kilimani"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                />
                <Input
                  label="City / Town"
                  placeholder="e.g. Nairobi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Campus Phone Number"
                  placeholder="+254712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  helperText="International format"
                  required
                />
                <Input
                  label="School Email Domain (Optional)"
                  placeholder="nyambaria.ac.ke"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  helperText="Used for automated learner emails"
                />
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!branchName.trim()) {
                      toast.error('Please specify the campus branch name');
                      return;
                    }
                    setStep(3);
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Branding
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: School Branding */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">School Colours &amp; Identity</h3>
                <p className="text-xs text-gray-500">
                  Choose brand colours for this campus branch. You can change these anytime under Settings.
                </p>
              </div>

              {/* Colour presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                      className={`rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-brand-500 ring-2 ring-brand-500/20 bg-blue-50/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="h-8 rounded-lg mb-1.5 shadow-xs"
                        style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                      />
                      <div className="flex items-center justify-between text-2xs">
                        <span className="font-semibold text-gray-700 truncate">{preset.name}</span>
                        {isSelected && <span className="text-emerald-600 font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Live Preview */}
              <div
                className="rounded-2xl p-4 text-white shadow-md relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg shadow-inner">
                    {(branchName || orgName || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold tracking-tight">{branchName || orgName || 'School Name'}</h4>
                    <p className="text-xs text-white/80">{schoolMotto || 'School motto'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Primary Colour
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="block h-10 w-16 rounded-xl border border-gray-200 bg-white p-1"
                    />
                    <input
                      type="text"
                      value={primaryColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setPrimaryColor(e.target.value);
                      }}
                      className="block h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900"
                    />
                  </div>
                </label>

                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Secondary Colour
                  <div className="mt-1 flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="block h-10 w-16 rounded-xl border border-gray-200 bg-white p-1"
                    />
                    <input
                      type="text"
                      value={secondaryColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setSecondaryColor(e.target.value);
                      }}
                      className="block h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-900"
                    />
                  </div>
                </label>
              </div>

              <Input
                label="School Motto"
                placeholder="Knowledge, Discipline and Service"
                value={schoolMotto}
                onChange={(e) => setSchoolMotto(e.target.value)}
              />

              <div className="pt-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setStep(4)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Admin Setup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Admin Account Setup */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Administrator Account</h3>
                <p className="text-xs text-gray-500">
                  {currentUser
                    ? 'Confirm your admin credentials to complete creation of this school workspace.'
                    : 'Create the primary administrator account for this school.'}
                </p>
              </div>

              <Input
                label="Administrator Full Name"
                placeholder="Dr. Faith Mwangi"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />

              <Input
                label="Official Admin Email"
                type="email"
                placeholder="principal@academy.ac.ke"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={Boolean(currentUser)}
                helperText={currentUser ? 'Using current logged-in identity' : undefined}
                required
              />

              {!currentUser && (
                <Input
                  label="Account Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  helperText="Minimum 8 characters. Used to sign in."
                  showStrength={true}
                  required
                />
              )}

              <label className="flex items-start gap-2.5 pt-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 mt-0.5"
                />
                <span>
                  I agree to the <span className="font-semibold text-gray-900">Terms of Service</span> and acknowledge that student records are stored with full tenant privacy.
                </span>
              </label>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(3)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Complete &amp; Launch School
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500">
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="text-brand-700 hover:text-brand-800 font-semibold underline underline-offset-4"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
