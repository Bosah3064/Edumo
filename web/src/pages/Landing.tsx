import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Sparkles,
  Building2,
  CalendarCheck2,
  FileSpreadsheet,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Globe2,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-glow">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-white">
            EDUMO
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/register')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden text-center">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold mb-6 animate-fade-in">
            <Globe2 className="w-3.5 h-3.5 text-brand-400" />
            <span>Built for East Africa: Kenya, Uganda, Tanzania & Rwanda</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            The Multi-Tenant School OS for <br />
            <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-accent-400 bg-clip-text text-transparent">
              Any School, Every Campus.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-surface-400 max-w-2xl mx-auto leading-relaxed">
            From single-campus nursery & primary schools to regional multi-branch
            academy groups. Complete with country-specific curricula, offline attendance,
            and impenetrable tenant isolation.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/register')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto shadow-glow"
            >
              Register Your Institution
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto"
            >
              Sign In to Your Campus
            </Button>
          </div>

          {/* Quick Curriculum Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-surface-500 mr-2">Supports:</span>
            <Badge variant="brand">Kenya CBC & 8-4-4</Badge>
            <Badge variant="accent">Uganda UNEB</Badge>
            <Badge variant="warning">Tanzania NECTA</Badge>
            <Badge variant="brand">Rwanda CBC (A-E)</Badge>
            <Badge variant="neutral">International Generic</Badge>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-t border-surface-800/80">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Architected for Real-World School Operations
          </h2>
          <p className="text-surface-400 text-sm mt-2">
            Designed specifically to withstand intermittent electricity and offline field conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Multi-Campus Hierarchy</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Academy directors can toggle between branches with a single click, view consolidated
                group metrics, or delegate complete autonomy to local branch principals.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-brand-400 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Independent branch ledgers & calendars</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center mb-4">
                <CalendarCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">1-Tap Offline Attendance</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Take attendance across classes in seconds without an internet connection.
                Records are securely cached on-device in IndexedDB and synchronize cleanly when reconnected.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-accent-400 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Full IndexedDB persistence & background sync</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-warning-500/10 border border-warning-500/20 text-warning-400 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Excel Import & Instant Rollback</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Upload hundreds of learners and staff in seconds. Includes strict formula-injection
                neutralization, pre-import dry-run preview, and 1-click batch rollbacks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-warning-400 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Sanitizes formulas (=,+,-,@) & audits every row</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tenant-Isolated Security</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Enforced by Firebase Custom Claims and Firestore Security Rules at the database
                layer. Cross-tenant leakage is mathematically rejected on every single document query.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-indigo-400 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Subcollection isolation & medical privacy rules</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Dedicated Parent Portal</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Guardians with children across different classes or branches log in with their
                phone number to view real-time daily attendance, urgent school notices, and teacher notes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-brand-400 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Supports OTP, SMS & push alerts</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-accent-400 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Pluggable Country Packs</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                No hard-coded assumptions. CBC rubric assessment (EE, ME, AE, BE) runs alongside
                UNEB points and NECTA divisions. All official scales remain completely editable by schools.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-accent-400 font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Zero vendor lock-in for regional compliance</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/80 py-10 text-center text-surface-500 text-xs">
        <p>© 2026 EDUMO. Next-Generation School Management Platform.</p>
        <p className="mt-1">Architected for Kenya, Uganda, Tanzania, Rwanda & International Schools.</p>
      </footer>
    </div>
  );
};
