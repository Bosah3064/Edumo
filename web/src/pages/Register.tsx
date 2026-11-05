import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, setDoc, updateDoc, collectionGroup, getDocs, getDoc, where, query } from 'firebase/firestore';
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
  GraduationCap,
  Lock,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, signUp, signOut, refreshClaims, currentUser } = useAuth();
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

  // Account Type Selection: Institution vs Verified Educator
  const [accountType, setAccountType] = useState<'institution' | 'teacher'>('institution');

  // Teacher Registration State
  const [teacherName, setTeacherName] = useState(currentUser?.displayName || '');
  const [teacherEmail, setTeacherEmail] = useState(currentUser?.email || '');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('+254712345678');
  const [teacherSubjects, setTeacherSubjects] = useState('Mathematics, Integrated Science');
  const [teacherTsc, setTeacherTsc] = useState('');
  const [teacherJoinCode, setTeacherJoinCode] = useState('');

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

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser && (!teacherName || !teacherEmail || !teacherPassword)) {
      toast.error('Please complete all educator credentials');
      return;
    }
    if (!currentUser && teacherPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Registering verified educator profile...');

    try {
      let user = currentUser;
      if (!user) {
        try {
          user = await signUp(teacherEmail, teacherPassword, teacherName);
        } catch (signUpErr: any) {
          if (signUpErr?.code === 'auth/email-already-in-use' || signUpErr?.message?.includes('email-already-in-use')) {
            try {
              await signIn(teacherEmail, teacherPassword);
              user = auth.currentUser;
            } catch {
              throw new Error('This email is already registered. If this is your account, please enter your existing password to log in, or sign in from the Login page.');
            }
          } else {
            throw signUpErr;
          }
        }
      }

      const activeUser = auth.currentUser || user;
      if (!activeUser) {
        throw new Error('Could not establish educator session. Please try logging in.');
      }
      const educatorId = `EDU-TCH-${(activeUser.uid || '8921').substring(0, 5).toUpperCase()}`;
      const now = new Date().toISOString();

      let attachedMemberships: any[] = [];
      let attachedOrgId = '';
      let attachedSchoolId = '';

      // If teacher supplied a join code, try to find and attach the school immediately!
      if (teacherJoinCode.trim()) {
        const cleanCode = teacherJoinCode.trim().toUpperCase();
        try {
          // 1. Direct document check at root (index-free, instant)
          const rootSnap = await getDoc(doc(db, 'invitations', cleanCode));
          if (rootSnap.exists()) {
            const invData = rootSnap.data();
            attachedOrgId = invData.orgId;
            attachedSchoolId = invData.schoolId;
            attachedMemberships = [
              {
                orgId: invData.orgId,
                schoolIds: [invData.schoolId],
                role: invData.role || 'teacher',
                joinedAt: now,
              },
            ];
            await updateDoc(rootSnap.ref, {
              status: 'accepted',
              acceptedBy: activeUser.uid,
              acceptedAt: now,
            }).catch(() => {});
          } else {
            // 2. CollectionGroup fallback
            const invQuery = query(collectionGroup(db, 'invitations'), where('code', '==', cleanCode));
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
              const invData = invSnap.docs[0].data();
              attachedOrgId = invData.orgId;
              attachedSchoolId = invData.schoolId;
              attachedMemberships = [
                {
                  orgId: invData.orgId,
                  schoolIds: [invData.schoolId],
                  role: invData.role || 'teacher',
                  joinedAt: now,
                },
              ];
              await updateDoc(invSnap.docs[0].ref, {
                status: 'accepted',
                acceptedBy: activeUser.uid,
                acceptedAt: now,
              }).catch(() => {});
            }
          }
        } catch (invErr) {
          console.warn('Teacher join code upfront lookup deferred:', invErr);
        }
      }

      await setDoc(
        doc(db, 'users', activeUser.uid),
        {
          displayName: teacherName.trim() || activeUser.displayName || 'Faculty Educator',
          email: teacherEmail.trim().toLowerCase() || activeUser.email || '',
          phone: teacherPhone.trim(),
          role: 'teacher',
          educatorId,
          tscNumber: teacherTsc.trim(),
          specializations: teacherSubjects ? teacherSubjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
          memberships: attachedMemberships,
          createdAt: now,
        },
        { merge: true }
      );

      if (attachedOrgId && attachedSchoolId) {
        localStorage.setItem('edumo_active_org_id', attachedOrgId);
        localStorage.setItem('edumo_active_school_id', attachedSchoolId);
      }

      await refreshClaims();
      toast.success('Educator profile created! Welcome to Edumo.', { id: toastId });
      navigate('/educator-portal');
    } catch (err: any) {
      console.error('Teacher registration error:', err);
      toast.error(err.message || 'Failed to register educator profile', { id: toastId });
    } finally {
      setLoading(false);
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
        try {
          await signUp(adminEmail, adminPassword, adminName);
        } catch (signUpErr: any) {
          if (signUpErr?.code === 'auth/email-already-in-use' || signUpErr?.message?.includes('email-already-in-use')) {
            try {
              await signIn(adminEmail, adminPassword);
            } catch {
              throw new Error('This email is already registered. Please enter your existing password to log in and set up your institution, or use the Login page.');
            }
          } else {
            throw signUpErr;
          }
        }
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-[#1f2937] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Custom AI Generated Campus Backdrop with Smart Ambient Blur */}
      <div
        className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url('./edumo-campus-bg.jpg')`,
        }}
      />
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#1d5f99]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[300px] bg-[#683669]/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 animate-fade-in my-8">
        {/* Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-3">
            <EdumoLogo size="xl" showText={true} showSubtitle={true} showBadge={true} to="/" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {accountType === 'teacher' ? 'Educator Registration' : t('register.title', 'Register Your School')}
          </h2>
          <p className="text-sm text-slate-300 mt-1 font-medium max-w-lg">
            {accountType === 'teacher'
              ? 'Join the verified educator network — no ghost schools created, single-campus binding'
              : t('register.subtitle', 'Set up your multi-tenant workspace with country-specific curriculum and branding')}
          </p>
        </div>

        {/* Account Type Selector: Institution vs Verified Educator */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-slate-200/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setAccountType('institution')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              accountType === 'institution'
                ? 'bg-white text-[#1d5f99] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>School / Institution</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('teacher')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              accountType === 'teacher'
                ? 'bg-white text-[#1d5f99] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Teacher / Educator</span>
          </button>
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

        {accountType === 'teacher' ? (
          <Card className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6 sm:p-8">
            <div className="space-y-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Educator Profile (Zero Ghost Schools)
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  Register as an Independent Verified Educator
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Join the Edumo educational network. You will receive a unique <strong>Educator ID</strong> and can connect directly to your school campus using an invitation code without spawning duplicate school databases.
                </p>
              </div>

              <form onSubmit={handleTeacherSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Educator Name"
                    placeholder="e.g. Mwalimu Grace Wanjiku"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    required
                  />

                  <Input
                    label="Mobile Phone"
                    placeholder="+254712345678"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Teaching Learning Areas / Units"
                    placeholder="e.g. Mathematics, Integrated Science"
                    value={teacherSubjects}
                    onChange={(e) => setTeacherSubjects(e.target.value)}
                    helperText="Subjects you specialize in teaching"
                  />

                  <Input
                    label="TSC / Educator Registration No. (Optional)"
                    placeholder="e.g. TSC-789421"
                    value={teacherTsc}
                    onChange={(e) => setTeacherTsc(e.target.value)}
                  />
                </div>

                {/* Optional School Code */}
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    School Invitation / Join Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EDM-9821 or Campus Code (Leave empty if joining later)"
                    value={teacherJoinCode}
                    onChange={(e) => setTeacherJoinCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-blue-200 bg-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-blue-800 mt-1">
                    If your principal gave you a code, enter it now to attach to your school immediately. Otherwise, connect in the Educator Portal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address (Login Username)"
                    type="email"
                    placeholder="grace.wanjiku@gmail.com"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Account Password"
                    type="password"
                    placeholder="••••••••"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    required
                    helperText="Minimum 8 characters"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2"
                    isLoading={loading}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Register Educator Profile &rarr;
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        ) : (
          <>
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
      </>
    )}

        <div className="text-center mt-6 text-sm text-slate-300">
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="text-blue-300 hover:text-white font-bold underline underline-offset-4"
          >
            Sign In &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
