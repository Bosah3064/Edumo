import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import { Mail, Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

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
      navigate('/dashboard');
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
    // In emulator or demo mode, mock phone auth
    toast.success('SMS verification code sent to ' + phone);
    setLoading(false);
  };

  // Development Quick-Login presets
  const handleQuickLogin = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('DemoPass123!');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-surface-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#1d5f99]/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[350px] h-[250px] bg-[#683669]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <EdumoLogo size="xl" showText={true} showSubtitle={true} showBadge={true} to="/" />
          </div>
          <h2 className="text-xl font-display font-semibold text-white">
            {t('auth.welcomeBack')}
          </h2>
          <p className="text-xs text-surface-400 mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="flex p-1 bg-surface-900 rounded-2xl border border-surface-800 mb-6">
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'email'
                ? 'bg-gradient-to-r from-[#1d5f99] to-[#683669] text-white shadow-md'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => setMode('phone')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'phone'
                ? 'bg-gradient-to-r from-[#1d5f99] to-[#683669] text-white shadow-md'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            Mobile Phone (OTP)
          </button>
        </div>

        {/* Login Card */}
        <Card className="glass-card shadow-2xl">
          {mode === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label={t('auth.emailLabel')}
                type="email"
                placeholder="principal@academy.ac.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label={t('auth.passwordLabel')}
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('auth.signIn')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <Input
                label={t('auth.phoneLabel')}
                type="tel"
                placeholder="+254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                helperText="International format (e.g., Kenya +254, Uganda +256, Tanzania +255, Rwanda +250)"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('auth.sendOtp')}
              </Button>
            </form>
          )}

          {/* Quick-test Presets for Local Emulators / Development */}
          <div className="mt-6 pt-5 border-t border-surface-800">
            <div className="flex items-center gap-1.5 text-2xs text-surface-400 uppercase tracking-wider font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>{t('auth.demoCredentialsNotice')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-2xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@edumo-academy.org')}
                className="p-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-surface-300 border border-surface-700/60 text-left transition-colors"
              >
                <span className="font-semibold text-white block">Org Owner</span>
                <span className="text-surface-500">Full group access</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('principal@nairobi-campus.org')}
                className="p-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-surface-300 border border-surface-700/60 text-left transition-colors"
              >
                <span className="font-semibold text-white block">Principal</span>
                <span className="text-surface-500">Branch leader</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('teacher@nairobi-campus.org')}
                className="p-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-surface-300 border border-surface-700/60 text-left transition-colors"
              >
                <span className="font-semibold text-white block">Teacher</span>
                <span className="text-surface-500">Attendance & Marks</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('parent@family.org')}
                className="p-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-surface-300 border border-surface-700/60 text-left transition-colors"
              >
                <span className="font-semibold text-white block">Parent</span>
                <span className="text-surface-500">Learner Portal</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Footer links */}
        <div className="text-center mt-6 text-xs text-surface-400">
          <span>{t('auth.dontHaveAccount')} </span>
          <Link
            to="/register"
            className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4"
          >
            {t('auth.registerSchool')}
          </Link>
        </div>
      </div>
    </div>
  );
};
