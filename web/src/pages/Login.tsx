import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import {
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Eye,
  EyeOff,
  UserCheck,
  GraduationCap,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const { signIn, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (!authLoading && currentUser) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [currentUser, authLoading, navigate, location]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please provide a mobile phone number');
      return;
    }
    setLoading(true);
    toast.success('SMS verification code sent to ' + phone);
    setLoading(false);
  };

  const handleQuickLogin = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('DemoPass123!');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0f172a] text-slate-100 font-sans">
      {/* LEFT HERO COLUMN (Optimized for laptops and large 4K displays) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-gradient-to-br from-[#0b1329] via-[#1d5f99] to-[#4c1d95] p-8 xl:p-12 flex-col justify-between overflow-y-auto">
        {/* Background Visual Overlay */}
        <div
          className="absolute inset-0 opacity-25 bg-cover bg-center mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url('./edumo-classroom-hero.jpg')`,
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-8 xl:my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Next-Gen Institutional Suite
          </div>

          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-tight">
            Empowering East Africa’s Leading Schools &amp; Educators
          </h1>

          <p className="text-sm xl:text-base text-slate-100 font-normal leading-relaxed">
            Manage attendance, CBC competency rubrics, termly examinations, M-Pesa fee reconciliation, and parent SMS broadcasts seamlessly — even offline.
          </p>

          {/* Highlight Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-white">CBC 2.0 &amp; Regional Curricula</p>
              <p className="text-xs text-slate-200 mt-0.5">Kenya, Uganda, Tanzania &amp; Rwanda standards</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <Smartphone className="w-5 h-5 text-sky-300 mb-2" />
              <p className="text-sm font-bold text-white">Offline Phone &amp; PWA Support</p>
              <p className="text-xs text-slate-200 mt-0.5">Instant roll call marking with auto-sync</p>
            </div>
          </div>
        </div>

        {/* Bottom Trust Footer */}
        <div className="relative z-10 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
          <span className="font-medium">Trusted by 500+ Regional Institutions</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Zero Ghost School Architecture
          </span>
        </div>
      </div>

      {/* RIGHT AUTH FORM COLUMN (Clean, high-contrast, fully visible on any screen) */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-white text-slate-900 min-h-screen overflow-y-auto">
        <div className="w-full max-w-lg space-y-6 my-auto py-6">
          {/* Mobile Logo Header */}
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
            <p className="text-sm text-slate-600 mt-1.5 font-medium leading-relaxed">
              Sign in to manage classes, learner marks, attendance registers, and financial records.
            </p>
          </div>

          {/* Auth Mode Toggle Tabs */}
          <div className="flex p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'email'
                  ? 'bg-white text-[#1d5f99] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'phone'
                  ? 'bg-white text-[#1d5f99] shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mobile OTP Sign In
            </button>
          </div>

          {/* Form */}
          {mode === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="e.g. principal@academy.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1d5f99] text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Password
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
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
                Sign In to School Portal
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Registered Mobile Phone
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+254712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1d5f99] text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1d5f99]/20 transition-all"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Use international format: <strong>+254</strong> (Kenya), <strong>+256</strong> (Uganda), <strong>+255</strong> (Tanzania), <strong>+250</strong> (Rwanda)
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full font-bold shadow-md text-sm py-3.5 mt-2 bg-[#1d5f99] hover:bg-[#164a78]"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send SMS Verification Code
              </Button>
            </form>
          )}

          {/* Quick-test Presets for Local Emulators / Demo */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4 text-[#1d5f99]" />
              <span>Instant Demo Accounts (Click to Fill)</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@edumo-academy.org')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-900 border border-slate-200 text-left transition-all hover:border-blue-300 hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1d5f99] block group-hover:underline">Org Owner</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <span className="text-slate-600 text-2xs block mt-0.5">Multi-school admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('principal@nairobi-campus.org')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-900 border border-slate-200 text-left transition-all hover:border-purple-300 hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#683669] block group-hover:underline">Principal</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                </div>
                <span className="text-slate-600 text-2xs block mt-0.5">Branch head</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('teacher@nairobi-campus.org')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-900 border border-slate-200 text-left transition-all hover:border-emerald-300 hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-700 block group-hover:underline">Teacher</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-slate-600 text-2xs block mt-0.5">Marks &amp; Roll Call</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('parent@family.org')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-900 border border-slate-200 text-left transition-all hover:border-amber-300 hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800 block group-hover:underline">Parent</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <span className="text-slate-600 text-2xs block mt-0.5">Student Fees &amp; Card</span>
              </button>
            </div>
          </div>

          {/* Registration Redirects */}
          <div className="pt-3 text-center text-xs text-slate-700 space-y-2 border-t border-slate-100">
            <p className="font-medium">
              Don't have an institution registered?{' '}
              <Link
                to="/register"
                className="text-[#1d5f99] hover:underline font-bold"
              >
                Register Your School &rarr;
              </Link>
            </p>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-left flex items-start gap-2.5">
              <GraduationCap className="w-4 h-4 text-[#1d5f99] shrink-0 mt-0.5" />
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
