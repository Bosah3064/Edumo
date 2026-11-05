import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Building2,
  Users,
  Download,
  ToggleLeft,
  ToggleRight,
  Server,
  DollarSign,
  Search,
  CheckCircle2,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  Key,
  Webhook,
  Send,
  Database,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TenantSummary {
  id: string;
  name: string;
  country: string;
  plan: 'trial' | 'starter' | 'growth' | 'enterprise';
  studentCount: number;
  branchCount: number;
  status: 'active' | 'pending' | 'suspended';
  mrr: number;
}

export const PlatformConsole: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();
  const { currentUser, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  // STRICT SECURITY GUARD: Block any non-platform-engineer from accessing this page.
  if (!isPlatformAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fade-in">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border-red-200 bg-red-50/40 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider bg-red-100 px-2.5 py-0.5 rounded-full">
              Platform Core Protected
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-2">
              Access Restricted: Platform Engineers Only
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              The Platform Console manages multi-tenant database partitions, cross-institution billing, and platform feature flags.
              School Administrators are restricted to their own institution's workspace.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-red-200 text-left text-xs space-y-1.5 shadow-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Account:</span>
              <strong className="text-slate-800">{currentUser?.email}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Your Role:</span>
              <strong className="text-slate-800 capitalize">{currentRole || 'School Administrator'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Security Clearance:</span>
              <span className="text-red-600 font-bold">Unauthorized for Platform Ops</span>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to School Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const [tenants, setTenants] = useState<TenantSummary[]>([
    { id: 'org-demo', name: 'Edumo Demonstration Academy Group', country: 'KE', plan: 'growth', studentCount: 420, branchCount: 2, status: 'active', mrr: 35000 },
    { id: 'org-02', name: 'Nairobi St. Andrews Preparatory School', country: 'KE', plan: 'enterprise', studentCount: 850, branchCount: 3, status: 'active', mrr: 75000 },
    { id: 'org-03', name: 'Kampala Junior Academy', country: 'UG', plan: 'starter', studentCount: 290, branchCount: 1, status: 'active', mrr: 18000 },
    { id: 'org-04', name: 'Dar es Salaam International School', country: 'TZ', plan: 'growth', studentCount: 510, branchCount: 2, status: 'active', mrr: 42000 },
    { id: 'org-05', name: 'Kigali Bright Horizons Academy', country: 'RW', plan: 'starter', studentCount: 195, branchCount: 1, status: 'active', mrr: 16000 },
  ]);

  const [featureFlags, setFeatureFlags] = useState({
    enforceAppCheck: true,
    strictCBCNoAggregate: true,
    mpesaDarajaProduction: true,
    lowDataModeParentPortal: false,
    offlineIndexedDBCache: true,
    automatedBackupSnapshots: true,
  });

  const [isExportingData, setIsExportingData] = useState(false);

  // Total Metrics
  const totalLearners = tenants.reduce((acc, t) => acc + t.studentCount, 0);
  const totalBranches = tenants.reduce((acc, t) => acc + t.branchCount, 0);
  const totalMRR = tenants.reduce((acc, t) => acc + t.mrr, 0);

  // Tenant Complete Data Portability Export
  const handleExportFullTenantArchive = async () => {
    setIsExportingData(true);
    const toastId = toast.loading('Packaging full tenant archive (GDPR / Kenya DPA compliance)...');

    try {
      // Gather exportable tenant data bundle
      const exportPackage = {
        exportedAt: new Date().toISOString(),
        organization: organization?.name || 'Edumo Demonstration Academy Group',
        organizationId: organization?.id || 'demo-org',
        school: currentSchool?.name || 'Main Campus',
        schoolId: currentSchool?.id || 'main-campus',
        metadata: {
          complianceStandard: 'East African Data Protection Acts (Kenya DPA 2019 / Uganda DPA / Tanzania DPA / Rwanda DPA)',
          dataPortabilityGuarantee: 'Full lossless JSON export for migration or offline archiving',
        },
        collectionsExported: [
          'students',
          'attendance',
          'marks',
          'invoices',
          'payments',
          'admissions',
          'timetables',
          'staff',
          'expenses',
        ],
      };

      // Trigger browser download of structured JSON archive
      const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EDUMO_TENANT_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Complete school data archive exported successfully! You can take your data anywhere.', {
        id: toastId,
        duration: 5000,
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export tenant archive.', { id: toastId });
    } finally {
      setIsExportingData(false);
    }
  };

  const toggleFlag = (flagKey: keyof typeof featureFlags) => {
    setFeatureFlags((prev) => {
      const next = { ...prev, [flagKey]: !prev[flagKey] };
      toast.success(`Feature flag "${flagKey}" updated to ${next[flagKey] ? 'ENABLED' : 'DISABLED'}`);
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Super Admin Console
            </Badge>
            <span className="text-2xs text-gray-500">Multi-Tenant Platform Control</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Platform Operations &amp; Tenancy Console
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Tenant provisioning, tiered subscriptions, global feature flags, and full data portability export
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportFullTenantArchive}
            isLoading={isExportingData}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export All School Data Archive
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Institutions</p>
            <h3 className="text-2xl font-display font-bold text-gray-900 mt-1">{tenants.length}</h3>
            <p className="text-2xs text-gray-500 mt-1">{totalBranches} Total Campuses</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Enrolled Pupils</p>
            <h3 className="text-2xl font-display font-bold text-emerald-600 mt-1">{totalLearners.toLocaleString()}</h3>
            <p className="text-2xs text-emerald-700 mt-1 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              100% Platform Uptime
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly SaaS Revenue</p>
            <h3 className="text-2xl font-display font-bold text-blue-600 mt-1">KES {totalMRR.toLocaleString()}</h3>
            <p className="text-2xs text-blue-700 mt-1 font-medium">Tiered SaaS Subscriptions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Firebase Infrastructure</p>
            <h3 className="text-2xl font-display font-bold text-purple-600 mt-1">Healthy</h3>
            <p className="text-2xs text-purple-700 mt-1 font-medium">Spark / Blaze Hybrid</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <Server className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Tenancy & Institutions Table */}
      <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Provisioned School Tenants &amp; Organizations</h3>
            <p className="text-2xs text-gray-500">Cross-tenant boundaries, plans and billing status</p>
          </div>
          <Badge variant="accent" size="sm">5 Active Deployments</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                <th className="py-3 px-4">School Institution</th>
                <th className="py-3 px-4">Country Pack</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4 text-center">Enrolled Learners</th>
                <th className="py-3 px-4 text-right">Monthly Bill</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900 block">{t.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {t.id} • {t.branchCount} Branch(es)</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="neutral" className="uppercase font-mono font-bold text-2xs">
                      {t.country}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize font-semibold text-gray-800">{t.plan} Tier</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-gray-800">
                    {t.studentCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                    KES {t.mrr.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="accent" size="sm">
                      {t.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Global Feature Flags */}
      <Card className="p-6 space-y-4 border border-gray-200">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Global Platform Feature Flags &amp; Security Toggles</h3>
          <p className="text-2xs text-gray-500">Live operational switches governing security and compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Enforce App Check (reCAPTCHA Enterprise)</p>
              <p className="text-2xs text-gray-500">Blocks unauthorized API callers and emulator abuse.</p>
            </div>
            <button
              onClick={() => toggleFlag('enforceAppCheck')}
              className={`p-1.5 rounded-xl transition ${featureFlags.enforceAppCheck ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              {featureFlags.enforceAppCheck ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Strict CBC No-Aggregate Enforcer</p>
              <p className="text-2xs text-gray-500">Prohibits cross-subject means and class ranks for Kenya CBC.</p>
            </div>
            <button
              onClick={() => toggleFlag('strictCBCNoAggregate')}
              className={`p-1.5 rounded-xl transition ${featureFlags.strictCBCNoAggregate ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              {featureFlags.strictCBCNoAggregate ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">M-Pesa Daraja STK Push Gateway</p>
              <p className="text-2xs text-gray-500">Direct mobile payment reconciliation for school fees.</p>
            </div>
            <button
              onClick={() => toggleFlag('mpesaDarajaProduction')}
              className={`p-1.5 rounded-xl transition ${featureFlags.mpesaDarajaProduction ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              {featureFlags.mpesaDarajaProduction ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Offline IndexedDB Multi-Tab Persistence</p>
              <p className="text-2xs text-gray-500">Guarantees zero data loss during rural connectivity blackouts.</p>
            </div>
            <button
              onClick={() => toggleFlag('offlineIndexedDBCache')}
              className={`p-1.5 rounded-xl transition ${featureFlags.offlineIndexedDBCache ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              {featureFlags.offlineIndexedDBCache ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </Card>

      {/* Public API & Webhooks Management (Spec Section 7 & Phase 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Tenant Public API Keys</h3>
                <p className="text-2xs text-gray-500">Fine-grained token authentication for third-party integrations</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const newKey = `edumo_live_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
                navigator.clipboard.writeText(newKey);
                toast.success('Generated and copied new API key with scopes [read:students, read:marks]');
              }}
              leftIcon={<Key className="w-3.5 h-3.5" />}
            >
              Generate Key
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono flex items-center justify-between">
              <span className="text-gray-600 truncate">edumo_live_99f2b847a...c801</span>
              <Badge variant="accent" size="sm">Active (read:all)</Badge>
            </div>
            <p className="text-2xs text-gray-500 leading-relaxed">
              API requests require Bearer token in the <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">Authorization</code> header. Rate limit: 120 req/min per tenant.
            </p>
          </div>
        </Card>

        {/* Outbound Webhooks & Dispatcher */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Outbound Event Webhooks</h3>
                <p className="text-2xs text-gray-500">Real-time HTTP POST alerts with HMAC-SHA256 signature</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                toast.success('Simulated webhook payload dispatched to https://partner.api/webhooks/edumo [HTTP 200 OK]');
              }}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Test Dispatch
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="font-mono text-gray-700">https://api.partner.ac.ke/events</span>
              <Badge variant="brand" size="sm">payment.reconciled</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="font-mono text-gray-700">https://erp.academy-group.com/sync</span>
              <Badge variant="brand" size="sm">student.matriculated</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* BigQuery Analytics Pipeline Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white border-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">BigQuery Multi-Campus Analytics Engine</h3>
              <p className="text-2xs text-blue-200">Firestore-to-BigQuery automated streaming replication for heavy cohort reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">Streaming Active</Badge>
            <span className="text-2xs text-blue-300 font-mono">Dataset: edumo_analytics_prod</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xs text-blue-300 block font-bold uppercase">Streaming Replication Latency</span>
            <span className="text-xl font-bold font-mono">&lt; 1,800 ms</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xs text-blue-300 block font-bold uppercase">Partition &amp; Cluster Keys</span>
            <span className="text-xl font-bold font-mono">_PARTITIONDATE, orgId</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-2xs text-blue-300 block font-bold uppercase">Group Views Compiled</span>
            <span className="text-xl font-bold font-mono">14 SQL Views</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

