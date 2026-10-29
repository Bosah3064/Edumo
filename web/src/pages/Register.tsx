import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import { Building2, School, UserCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const { signUp, refreshClaims } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Organization
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<'standalone' | 'group'>('standalone');
  const [country, setCountry] = useState<'KE' | 'UG' | 'TZ' | 'RW'>('KE');

  // Step 2: Branch
  const [branchName, setBranchName] = useState('');
  const [schoolType, setSchoolType] = useState<'nursery' | 'primary' | 'secondary' | 'combined'>('combined');
  const [curriculumType, setCurriculumType] = useState<string>('CBC');
  const [gradingMode, setGradingMode] = useState<string>('cbc_no_aggregate');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('+254712345678');

  // Step 3: Admin
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Handle curriculum change to align default grading mode
  const handleCountryChange = (c: 'KE' | 'UG' | 'TZ' | 'RW') => {
    setCountry(c);
    if (c === 'KE') {
      setCurriculumType('CBC');
      setGradingMode('cbc_no_aggregate');
      setPhone('+254');
    } else if (c === 'UG') {
      setCurriculumType('UNEB');
      setGradingMode('uneb');
      setPhone('+256');
    } else if (c === 'TZ') {
      setCurriculumType('NECTA');
      setGradingMode('necta');
      setPhone('+255');
    } else if (c === 'RW') {
      setCurriculumType('Rwanda');
      setGradingMode('rwanda');
      setPhone('+250');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminEmail || !adminPassword) {
      toast.error('Please complete all admin account fields');
      return;
    }
    if (adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating your school workspace...');

    try {
      // 1. Create Firebase Auth user
      await signUp(adminEmail, adminPassword, adminName);

      // 2. Call createOrganization Cloud Function
      const createOrgFn = httpsCallable(functions, 'createOrganization');
      await createOrgFn({
        name: orgName,
        type: orgType,
        country,
        school: {
          name: branchName || `${orgName} - Main Campus`,
          type: schoolType,
          curriculumType,
          gradingMode,
          address: {
            line1: addressLine || 'Main Campus Road',
            city: city || 'Nairobi',
            country,
          },
          phone: phone || '+254712345678',
        },
        adminDisplayName: adminName,
      });

      // 3. Refresh custom claims to receive new orgId and orgOwner role
      await refreshClaims();

      toast.success('Institution created successfully! Welcome to Edumo.', { id: toastId });
      navigate('/dashboard');
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
      {/* Subtle Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#1d5f99]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 animate-fade-in my-8">
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3">
            <EdumoLogo size="xl" showText={true} showSubtitle={true} showBadge={true} to="/" />
          </div>
          <h2 className="text-2xl font-display font-bold text-[#1f2937]">
            {t('register.title')}
          </h2>
          <p className="text-xs text-[#4b5563] mt-1 font-medium">{t('register.subtitle')}</p>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { num: 1, label: 'Institution', icon: Building2 },
            { num: 2, label: 'Main Branch', icon: School },
            { num: 3, label: 'Admin Setup', icon: UserCheck },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
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
          {/* STEP 1: Organization details */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label={t('register.orgName')}
                placeholder="e.g. St. Jude Academy Group"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label={t('register.orgType')}
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as 'standalone' | 'group')}
                  options={[
                    { label: 'Standalone Single Campus', value: 'standalone' },
                    { label: 'Multi-Campus Academy Group', value: 'group' },
                  ]}
                />

                <Select
                  label={t('register.country')}
                  value={country}
                  onChange={(e) =>
                    handleCountryChange(e.target.value as 'KE' | 'UG' | 'TZ' | 'RW')
                  }
                  options={[
                    { label: '🇰🇪 Kenya (KES)', value: 'KE' },
                    { label: '🇺🇬 Uganda (UGX)', value: 'UG' },
                    { label: '🇹🇿 Tanzania (TZS)', value: 'TZ' },
                    { label: '🇷🇼 Rwanda (RWF)', value: 'RW' },
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
                    if (!branchName) setBranchName(`${orgName} - Main Campus`);
                    setStep(2);
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Branch Setup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Main Branch */}
          {step === 2 && (
            <div className="space-y-4">
              <Input
                label={t('register.branchName')}
                placeholder="e.g. Nairobi Central Campus"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label={t('register.branchType')}
                  value={schoolType}
                  onChange={(e) =>
                    setSchoolType(e.target.value as 'nursery' | 'primary' | 'secondary' | 'combined')
                  }
                  options={[
                    { label: 'Combined (K-12 / All Grades)', value: 'combined' },
                    { label: 'Primary School', value: 'primary' },
                    { label: 'Secondary School', value: 'secondary' },
                    { label: 'Nursery / Pre-Primary', value: 'nursery' },
                  ]}
                />

                <Select
                  label={t('register.curriculum')}
                  value={curriculumType}
                  onChange={(e) => setCurriculumType(e.target.value)}
                  options={[
                    { label: 'CBC (Kenya Competency Based)', value: 'CBC' },
                    { label: '8-4-4 Classic Kenya', value: '8-4-4' },
                    { label: 'UNEB (Uganda)', value: 'UNEB' },
                    { label: 'NECTA (Tanzania)', value: 'NECTA' },
                    { label: 'Rwanda Curriculum', value: 'Rwanda' },
                    { label: 'Custom / International', value: 'custom' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Campus Address / Street"
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

              <Input
                label={t('register.phone')}
                placeholder="+254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="Campus phone number in international format"
                required
              />

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
                  Continue to Admin Setup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Admin account */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('register.adminName')}
                placeholder="Dr. Faith Mwangi"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />

              <Input
                label={t('register.adminEmail')}
                type="email"
                placeholder="admin@academy.ac.ke"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />

              <Input
                label={t('register.adminPassword')}
                type="password"
                placeholder="••••••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                helperText="Minimum 8 characters. You will use this to sign in."
                showStrength={true}
                required
              />

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(2)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {t('register.submit')}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="text-center mt-6 text-xs text-surface-400">
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
