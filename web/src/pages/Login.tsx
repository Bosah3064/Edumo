import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Eye,
  EyeOff,
  UserCheck,
  GraduationCap,
  Hash,
  School as SchoolIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginMode, setLoginMode] = useState<'email' | 'admission'>('email');
  const [email, setEmail] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (!authLoading && currentUser) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [currentUser, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginMode === 'admission' ? admissionNumber.trim() : email.trim();

    if (!identifier || !password) {
      toast.error(loginMode === 'admission' ? 'Please enter admission number and password' : 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier, password);
      toast.success('Signed in successfully');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid login credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0f172a] text-slate-100 font-sans">
      {/* LEFT HERO COLUMN */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-gradient-to-br from-[#0b1329] via-[#1d5f99] to-[#4c1d95] p-8 xl:p-12 flex-col justify-between overflow-y-auto">
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url('./edumo-classroom-hero.jpg')`,
          }}
        />

        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />
        </div>

        <div className="relative z-10 my-8 xl:my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Next-Gen Institutional Suite
          </div>

          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-tight">
            Empowering East Africa’s Leading Schools &amp; Educators
          </h1>

          <p className="text-sm xl:text-base text-slate-100 font-normal leading-relaxed">
            Manage attendance, CBC competency rubrics, termly examinations, M-Pesa fee reconciliation, and student portals seamlessly — even offline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-white">Automated Student Accounts</p>
              <p className="text-xs text-slate-200 mt-0.5">Pre-provisioned learner emails with zero student sign-up</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <Smartphone className="w-5 h-5 text-sky-300 mb-2" />
              <p className="text-sm font-bold text-white">Offline Phone &amp; PWA Support</p>
              <p className="text-xs text-slate-200 mt-0.5">Instant roll call marking with auto-sync</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
          <span className="font-medium">Trusted by 500+ Regional Institutions</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Multi-Tenant Institutional Domains
          </span>
        </div>
      </div>

      {/* RIGHT AUTH FORM COLUMN */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-white text-slate-900 min-h-screen overflow-y-auto">
        <div className="w-full max-w-lg space-y-6 my-auto py-6">
          <div className="lg:hidden text-center mb-6 flex flex-col items-center">
            <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1d5f99] text-xs font-bold uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5" /> Portal Sign In
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t('auth.welcomeBack', 'Welcome Back to Edumo')}
            </h2>
            <p className="text-sm text-slate-600 mt-1 font-medium leading-relaxed">
              Sign in to manage classes, learner marks, attendance registers, or access student learning materials.
            </p>
          </div>

          {/* Login Mode Toggle Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'email'
                  ? 'bg-white text-[#1d5f99] shadow-xs border border-slate-200 font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Institutional Email</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginMode('admission')}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'admission'
                  ? 'bg-white text-[#1d5f99] shadow-xs border border-slate-200 font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-[#1d5f99]" />
              <span>Student Admission No</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMode === 'email' ? (
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. 2205688@students.kcau.ac or teacher@kcau.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1d5f99] text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20 transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: <span className="font-mono font-bold text-slate-700">[admission]@students.[school.domain]</span> or staff email
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Student Admission Number
                </label>
                <div className="relative">
                  <Hash className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. 22/05688 or 2205688"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1d5f99] text-sm text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20 transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your assigned admission number from your school report card or admission letter.
                </p>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {loginMode === 'admission' ? 'Initial Password (e.g. Edumo@2205688)' : 'Password'}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#1d5f99] hover:underline font-bold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1d5f99] text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full font-bold shadow-md text-sm py-3.5 mt-2 bg-[#1d5f99] hover:bg-[#164a78]"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {loginMode === 'admission' ? 'Sign In as Student' : 'Sign In to School Portal'}
            </Button>
          </form>

          {/* Pre-Provisioned Student Guidance */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-2xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Zero-Registration Policy for Students</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Learners are pre-provisioned automatically by school administrators upon enrollment. You do <strong>not</strong> need to register an account — just sign in using your school email (or Admission Number) with initial password <span className="font-mono font-bold">Edumo@[admission]</span>.
            </p>
          </div>

          {/* Registration Redirects */}
          <div className="pt-3 text-center text-xs text-slate-700 space-y-2 border-t border-slate-100">
            <p className="font-medium">
              Are you a school administrator registering your campus?{' '}
              <Link
                to="/register"
                className="text-[#1d5f99] hover:underline font-bold"
              >
                Register Your School &rarr;
              </Link>
            </p>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-left flex items-start gap-2.5">
              <SchoolIcon className="w-4 h-4 text-[#1d5f99] shrink-0 mt-0.5" />
              <p className="text-2xs text-slate-600 leading-relaxed">
                <strong>Teachers &amp; Educators:</strong> Need an Educator ID? Click <Link to="/register" className="text-[#1d5f99] underline font-bold">Register as an Educator</Link> to connect directly with your campus without creating duplicate databases.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
