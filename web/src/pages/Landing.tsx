import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EdumoLogo } from '../components/ui/EdumoLogo';
import {
  Building2,
  CalendarCheck2,
  FileSpreadsheet,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Globe2,
  CheckCircle2,
  Layers,
  CreditCard,
  QrCode,
  Sparkles,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-surface-100 selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-surface-800/60">
        <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button
            variant="tricolor"
            size="sm"
            onClick={() => navigate('/register')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden text-center">
        {/* Tri-color Ambient background glow */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-[#1d5f99]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[450px] h-[300px] bg-[#683669]/25 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[250px] bg-[#a5243d]/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-6 animate-fade-in shadow-sm">
            <Globe2 className="w-3.5 h-3.5 text-brand-400" />
            <span>Built for East Africa: Kenya, Uganda, Tanzania & Rwanda</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            The Multi-Tenant School OS for <br />
            <span className="text-gradient-tricolor">
              Any School, Every Campus.
            </span>
          </h1>

          <div className="divider mt-6 mb-6"></div>

          <p className="mt-4 text-base sm:text-lg text-surface-300 max-w-2xl mx-auto leading-relaxed">
            From single-campus nursery & primary schools to regional multi-branch
            academy groups. Complete with country-specific curricula, offline attendance,
            biometric/digital student ID cards, and impenetrable tenant isolation.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="tricolor"
              onClick={() => navigate('/register')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="w-full sm:w-auto shadow-xl shadow-[#1d5f99]/30"
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
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-surface-400 mr-2 font-medium">Curricula:</span>
            <Badge variant="brand">Kenya CBC & 8-4-4</Badge>
            <Badge variant="accent">Uganda UNEB</Badge>
            <Badge variant="warning">Tanzania NECTA</Badge>
            <Badge variant="brand">Rwanda CBC (A-E)</Badge>
            <Badge variant="neutral">International Generic</Badge>
          </div>
        </div>

        {/* Live Digital ID / Virtual Card Preview Showcase */}
        <div className="mt-16 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-edumoRed-400" />
            <span>Smart Digital Student & Staff Credential Card</span>
          </div>

          <div className="virtual-card">
            {/* Top row with EMV chip and Brand */}
            <div className="card-top">
              <div className="flex items-center gap-2">
                <div className="card-chip" title="EMV Smart Chip"></div>
                <div className="nfc-icon" title="NFC Contactless Enabled">
                  <span></span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-display font-black text-lg tracking-wider text-white">
                  EDUMO
                </span>
                <p className="card-meta">STUDENT IDENTITY</p>
              </div>
            </div>

            {/* Middle: Student ID Number */}
            <div className="my-2 text-left">
              <p className="card-meta">STUDENT NO.</p>
              <div className="card-number font-mono">EDM-2026-8842</div>
            </div>

            {/* Bottom Row: Name, Class, and Hologram */}
            <div className="flex items-end justify-between">
              <div className="text-left">
                <div className="card-name font-bold">WANGARI MAATHAI ACADEMY</div>
                <div className="text-xs text-white/80 font-medium">
                  GRADE 7 • CBC TRACK A
                </div>
              </div>
              <div className="holo-sticker" title="Official Security Hologram"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 max-w-7xl mx-auto px-6 border-t border-surface-800/80">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Architected for Real-World School Operations
          </h2>
          <div className="divider mt-3 mb-3"></div>
          <p className="text-surface-400 text-sm mt-2">
            Designed specifically to withstand intermittent electricity and offline field conditions across East Africa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-between hover:border-[#1d5f99]/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1d5f99]/15 border border-[#1d5f99]/30 text-[#3D95E3] flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Multi-Campus Hierarchy</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Academy directors can toggle between branches with a single click, view consolidated
                group metrics, or delegate complete autonomy to local branch principals.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-[#3D95E3] font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Independent branch ledgers & calendars</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between hover:border-[#10B981]/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-accent-500/15 border border-accent-500/30 text-accent-400 flex items-center justify-center mb-4">
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

          <Card className="flex flex-col justify-between hover:border-[#F59E0B]/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-warning-500/15 border border-warning-500/30 text-warning-400 flex items-center justify-center mb-4">
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

          <Card className="flex flex-col justify-between hover:border-[#683669]/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#683669]/20 border border-[#683669]/40 text-[#D0A7D7] flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tenant-Isolated Security</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Enforced by Firebase Custom Claims and Firestore Security Rules at the database
                layer. Cross-tenant leakage is mathematically rejected on every single document query.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-[#D0A7D7] font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Subcollection isolation & medical privacy rules</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between hover:border-[#a5243d]/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#a5243d]/15 border border-[#a5243d]/30 text-[#F9A8B8] flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Dedicated Parent Portal</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                Guardians with children across different classes or branches log in with their
                phone number to view real-time daily attendance, urgent school notices, and teacher notes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-[#F9A8B8] font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Supports OTP, SMS & push alerts</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between hover:border-[#1d5f99]/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1d5f99]/15 border border-[#1d5f99]/30 text-[#7EBAEE] flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">Pluggable Country Packs</h3>
              <p className="text-sm text-surface-400 mt-2 leading-relaxed">
                No hard-coded assumptions. CBC rubric assessment (EE, ME, AE, BE) runs alongside
                UNEB points and NECTA divisions. All official scales remain completely editable by schools.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-800 flex items-center text-xs text-[#7EBAEE] font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Zero vendor lock-in for regional compliance</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/80 py-12 text-center text-surface-400 text-xs">
        <div className="flex justify-center mb-4">
          <EdumoLogo size="sm" showText={true} showSubtitle={false} showBadge={true} />
        </div>
        <p>© 2026 EDUMO. Next-Generation School Management Platform.</p>
        <p className="mt-1 text-surface-500">
          Tailored for Kenya, Uganda, Tanzania, Rwanda & International Institutions.
        </p>
      </footer>
    </div>
  );
};
