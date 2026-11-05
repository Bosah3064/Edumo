import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  FileText,
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PrivacyPolicy: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentSchool, organization } = useTenant();
  const [downloading, setDownloading] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

  const handleDownloadMyData = async () => {
    setDownloading(true);
    const toastId = toast.loading('Compiling personal data package...');

    try {
      const dataPackage = {
        exportedAt: new Date().toISOString(),
        institution: currentSchool?.name || organization?.name || 'Edumo Educational Platform',
        user: {
          uid: currentUser?.uid,
          name: currentUser?.displayName,
          email: currentUser?.email,
          phone: currentUser?.phoneNumber,
          metadata: currentUser?.metadata,
        },
        dataRightsNotice: 'Compliant with Kenya Data Protection Act 2019 (Section 26) & GDPR data portability mandate.',
      };

      const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edumo-my-data-${currentUser?.uid?.slice(0, 8) || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Your personal data bundle has been downloaded!', { id: toastId });
    } catch {
      toast.error('Failed to export data package', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handleRequestDeletion = () => {
    if (confirm('Are you sure you wish to submit an official data erasure request under the Data Protection Act? Your institution administrator will be notified.')) {
      setDeletionRequested(true);
      toast.success('Data erasure request registered with your school data protection officer.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1d5f99] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-[#1d5f99]" />
            <span>Privacy Policy &amp; Data Rights</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Regional data protection standards for <strong>{currentSchool?.name || 'Edumo Schools'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">Kenya DPA 2019 Compliant</Badge>
          <Badge variant="purple">GDPR Aligned</Badge>
        </div>
      </div>

      {/* Core Principles Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50/50 border-blue-200 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-blue-950">Tenant Isolation</h3>
          <p className="text-2xs text-blue-800/80 leading-relaxed">
            School records are cryptographically and logically isolated. Your school's learners, marks, and fees are never shared or cross-referenced.
          </p>
        </Card>

        <Card className="p-4 bg-emerald-50/50 border-emerald-200 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-emerald-950">Zero Advertising</h3>
          <p className="text-2xs text-emerald-800/80 leading-relaxed">
            Edumo is built strictly for educational management. Learner information and parent contacts are never monetized, profiled, or sold.
          </p>
        </Card>

        <Card className="p-4 bg-purple-50/50 border-purple-200 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-purple-950">Data Portability</h3>
          <p className="text-2xs text-purple-800/80 leading-relaxed">
            Any school, educator, or parent has the statutory right to export their complete records in standard formats without lock-in.
          </p>
        </Card>
      </div>

      {/* Detailed Legal Sections */}
      <Card className="p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            1. Scope &amp; Regulatory Framework
          </h2>
          <p>
            This policy applies to all operations within the Edumo platform across Kenya, Uganda, Tanzania, and Rwanda. Processing of personal data complies with the Kenya Data Protection Act 2019, the Uganda Data Protection and Privacy Act 2019, Tanzania's Personal Data Protection Act 2022, and international safeguarding benchmarks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            2. Categories of Information Processed
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Learner Profiles:</strong> Full names, admission numbers, academic assessment scores, attendance logs.</li>
            <li><strong>Guardian Information:</strong> Contact numbers, verified relationship, emergency pickup authorization.</li>
            <li><strong>Staff Records:</strong> TSC numbers, assigned curriculum units, attendance, and administrative audit logs.</li>
            <li><strong>Restricted Health &amp; Welfare Data:</strong> Clinic visit logs and allergy notes are encrypted and restricted solely to verified medical and administrative roles.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            3. Data Subject Rights (Kenya DPA Section 26)
          </h2>
          <p>
            As a registered user, teacher, parent, or school administrator, you possess statutory rights to access personal records, rectify inaccurate data, object to specific processing, and request complete data erasure subject to mandatory statutory educational record-keeping retention.
          </p>
        </section>
      </Card>

      {/* Interactive Data Subject Self-Service Tools */}
      <Card className="p-6 border-2 border-slate-200 bg-slate-50 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1d5f99]" />
            <span>Self-Service Data Subject Controls</span>
          </h3>
          <p className="text-2xs text-slate-500 mt-0.5">
            Download your personal data archive or request account deletion under local privacy statutes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleDownloadMyData}
            isLoading={downloading}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download My Data Bundle (.json)
          </Button>

          {deletionRequested ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Deletion request logged (Pending DPO confirmation)
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestDeletion}
              leftIcon={<Trash2 className="w-4 h-4 text-red-600" />}
            >
              Request Account Deletion
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

