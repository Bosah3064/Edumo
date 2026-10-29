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
  Sparkles,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1f2937] selection:bg-[#1d5f99] selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <EdumoLogo size="lg" showText={true} showSubtitle={true} showBadge={true} to="/" />

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-[#1d5f99] border-[#1d5f99]/30 hover:bg-blue-50"
            >
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden text-center bg-gradient-to-b from-white via-[#f8fafc] to-[#f3f4f6]">
        {/* Soft Ambient Light Glows */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[#1d5f99]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[450px] h-[300px] bg-[#683669]/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[250px] bg-[#a5243d]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-[#1d5f99]/30 text-[#1d5f99] text-xs font-bold mb-6 animate-fade-in shadow-xs">
            <Globe2 className="w-3.5 h-3.5 text-[#1d5f99]" />
            <span>Built for East Africa: Kenya, Uganda, Tanzania & Rwanda</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-[#1f2937] max-w-4xl mx-auto leading-tight sm:leading-none">
            The Multi-Tenant School OS for <br />
            <span className="text-gradient-tricolor">
              Any School, Every Campus.
            </span>
          </h1>

          <div className="divider mt-6 mb-6"></div>

          <p className="mt-4 text-base sm:text-lg text-[#4b5563] max-w-2xl mx-auto leading-relaxed font-medium">
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
              className="w-full sm:w-auto shadow-xl shadow-[#1d5f99]/25 font-bold"
            >
              Register Your Institution
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-white hover:bg-gray-50 border-gray-300 text-[#1f2937] font-semibold"
            >
              Sign In to Your Campus
            </Button>
          </div>

          {/* Quick Curriculum Badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-[#4b5563] mr-2 font-bold uppercase tracking-wider">
              Curricula:
            </span>
            <Badge variant="brand">Kenya CBC & 8-4-4</Badge>
            <Badge variant="accent">Uganda UNEB</Badge>
            <Badge variant="warning">Tanzania NECTA</Badge>
            <Badge variant="brand">Rwanda CBC (A-E)</Badge>
            <Badge variant="neutral">International Generic</Badge>
          </div>
        </div>

        {/* Live Digital ID / Virtual Card Preview Showcase */}
        <div className="mt-16 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1d5f99] uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-[#a5243d]" />
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
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#1f2937]">
            Architected for Real-World School Operations
          </h2>
          <div className="divider mt-3 mb-3"></div>
          <p className="text-[#4b5563] text-sm mt-2 max-w-2xl mx-auto">
            Designed specifically to withstand intermittent electricity and offline field conditions across East Africa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col justify-between bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#1d5f99]/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#1d5f99] flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2937]">Multi-Campus Hierarchy</h3>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                Academy directors can toggle between branches with a single click, view consolidated
                group metrics, or delegate complete autonomy to local branch principals.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-[#1d5f99] font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Independent branch ledgers & calendars</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
                <CalendarCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2937]">1-Tap Offline Attendance</h3>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                Take attendance across classes in seconds without an internet connection.
                Records are securely cached on-device in IndexedDB and synchronize cleanly when reconnected.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Full IndexedDB persistence & background sync</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2937]">Excel Import & Instant Rollback</h3>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                Upload hundreds of learners and staff in seconds. Includes strict formula-injection
                neutralization, pre-import dry-run preview, and 1-click batch rollbacks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-amber-600 font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Sanitizes formulas (=,+,-,@) & audits every row</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#683669]/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-[#683669] flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2937]">Tenant-Isolated Security</h3>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                Enforced by Firebase Custom Claims and Firestore Security Rules at the database
                layer. Cross-tenant leakage is mathematically rejected on every single document query.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-[#683669] font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Subcollection isolation & medical privacy rules</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#a5243d]/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#a5243d] flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2937]">Dedicated Parent Portal</h3>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                Guardians with children across different classes or branches log in with their
                phone number to view real-time daily attendance, urgent school notices, and teacher notes.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-[#a5243d] font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Supports OTP, SMS & push alerts</span>
            </div>
          </Card>

          <Card className="flex flex-col justify-between bg-white border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#1d5f99]/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#1d5f99] flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1f2937]">Pluggable Country Packs</h3>
              <p className="text-sm text-[#4b5563] mt-2 leading-relaxed">
                No hard-coded assumptions. CBC rubric assessment (EE, ME, AE, BE) runs alongside
                UNEB points and NECTA divisions. All official scales remain completely editable by schools.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs text-[#1d5f99] font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Zero vendor lock-in for regional compliance</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 text-center text-[#4b5563] text-xs">
        <div className="flex justify-center mb-4">
          <EdumoLogo size="sm" showText={true} showSubtitle={false} showBadge={true} />
        </div>
        <p className="font-semibold">© 2026 EDUMO. Next-Generation School Management Platform.</p>
        <p className="mt-1 text-gray-500">
          Tailored for Kenya, Uganda, Tanzania, Rwanda & International Institutions.
        </p>
      </footer>
    </div>
  );
};
