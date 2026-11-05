import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import {
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BookOpen,
  GraduationCap,
  Building2,
  CheckCircle2,
  Smartphone,
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
    <div className="min-h-screen w-full flex bg-[#0f172a] text-slate-100 overflow-hidden font-sans">
      {/* LEFT HERO COLUMN (Visual Showcase with High-Res Educational Imagery) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0f172a] via-[#1d5f99] to-[#683669] p-12 flex-col justify-between overflow-hidden">
        {/* Background Visual Overlay with Custom AI Generated Imagery */}
        <div
          className="absolute inset-0 opacity-35 bg-cover bg-center mix-blend-overlay"
          style={{
            backgroundImage: `url('./edumo-classroom-hero.jpg')`,
          }}
        />

        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Next-Gen Institutional Platform
          </div>

          <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
            Empowering East Africa’s Leading Schools &amp; Educators
          </h1>

          <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed">
            Manage attendance, CBC competency tracking, termly exams, M-Pesa fee collections, and parent communication seamlessly — even offline.
          </p>

          {/* Highlight Value Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1.5" />
              <p className="text-xs font-bold text-white">CBC 2.0 &amp; Regional Curricula</p>
              <p className="text-[11px] text-slate-300">Kenya, Uganda, Tanzania &amp; Rwanda</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <Smartphone className="w-5 h-5 text-blue-300 mb-1.5" />
              <p className="text-xs font-bold text-white">Offline Phone &amp; PWA Support</p>
              <p className="text-[11px] text-slate-300">Mark roll call anywhere, sync later</p>
            </div>
          </div>
        </div>

        {/* Bottom Trust Footer */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-slate-300">
          <span>Trusted by 500+ Institutions</span>
          <span>Zero Ghost School Architecture</span>
        </div>
      </div>

      {/* RIGHT AUTH FORM COLUMN */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white text-slate-900 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 animate-fade-in my-auto py-4">
          {/* Mobile Logo Header */}
          <div className="lg:hidden text-center mb-4 flex flex-col items-center">
            <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t('auth.welcomeBack')}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Sign in to access your school administration, classes, and marks.
            </p>
          </div>

          {/* Auth Mode Toggle Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'email'
                  ? 'bg-white text-[#1d5f99] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => setMode('phone')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'phone'
                  ? 'bg-white text-[#1d5f99] shadow-xs'
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="e.g. principal@academy.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d5f99] focus:border-transparent bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#1d5f99] hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d5f99] focus:border-transparent bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full font-bold shadow-md text-sm py-3 mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to School Portal
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registered Mobile Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="+254712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d5f99] focus:border-transparent bg-slate-50/50"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  International format (+254 Kenya, +256 Uganda, +255 Tanzania, +250 Rwanda)
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full font-bold shadow-md text-sm py-3 mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send SMS Verification Code
              </Button>
            </form>
          )}

          {/* Quick-test Presets for Local Emulators / Demo */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1d5f99]" />
              <span>Development Demo Accounts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@edumo-academy.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-800 border border-slate-200 text-left transition-colors"
              >
                <span className="font-bold text-[#1d5f99] block">Org Owner</span>
                <span className="text-slate-500 text-[11px]">Full group access</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('principal@nairobi-campus.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-800 border border-slate-200 text-left transition-colors"
              >
                <span className="font-bold text-[#683669] block">Principal</span>
                <span className="text-slate-500 text-[11px]">Branch leader</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher@nairobi-campus.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-800 border border-slate-200 text-left transition-colors"
              >
                <span className="font-bold text-emerald-700 block">Teacher</span>
                <span className="text-slate-500 text-[11px]">Attendance &amp; Marks</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('parent@family.org')}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-800 border border-slate-200 text-left transition-colors"
              >
                <span className="font-bold text-amber-800 block">Parent</span>
                <span className="text-slate-500 text-[11px]">Learner Portal</span>
              </button>
            </div>
          </div>

          {/* Registration Redirects */}
          <div className="pt-2 text-center text-xs text-slate-600 space-y-1.5">
            <p>
              Don't have an institution registered?{' '}
              <Link
                to="/register"
                className="text-[#1d5f99] hover:underline font-bold"
              >
                Register Your School &rarr;
              </Link>
            </p>
            <p className="text-[11px] text-slate-500">
              Teachers &amp; Faculty without a school: Register as a Verified Educator on the registration page to obtain your Educator ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
