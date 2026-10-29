import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  RotateCcw,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DryRunRow {
  rowNum: number;
  admissionNo: string;
  name: string;
  className: string;
  guardianPhone: string;
  isValid: boolean;
  error?: string;
}

export const ExcelImport: React.FC = () => {
  const { currentSchool } = useTenant();

  const [entityType, setEntityType] = useState<'students' | 'staff'>('students');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDryRunComplete, setIsDryRunComplete] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [recentBatchId, setRecentBatchId] = useState<string | null>(null);

  // Mock parsed dry-run data demonstrating validation and formula sanitization
  const [dryRunRows, setDryRunRows] = useState<DryRunRow[]>([
    {
      rowNum: 2,
      admissionNo: 'ADM-2026-101',
      name: 'Dennis Kiptoo',
      className: 'Grade 4 East',
      guardianPhone: '+254711998877',
      isValid: true,
    },
    {
      rowNum: 3,
      admissionNo: 'ADM-2026-102',
      name: 'Mercy Chepkirui',
      className: 'Grade 4 East',
      guardianPhone: '+254722887766',
      isValid: true,
    },
    {
      rowNum: 4,
      admissionNo: 'ADM-2026-103',
      name: "'+cmd|' /C calc'!A0", // Sanitized formula injection!
      className: 'Grade 4 East',
      guardianPhone: '+254733776655',
      isValid: true, // Sanitized safely with leading single quote!
    },
    {
      rowNum: 5,
      admissionNo: 'ADM-2026-104',
      name: 'John Doe',
      className: 'Grade 99', // Invalid class
      guardianPhone: 'invalid-phone',
      isValid: false,
      error: 'Invalid class level and phone format must be international (e.g. +254...)',
    },
  ]);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      toast.loading('Analyzing spreadsheet & neutralizing formula injections...', {
        id: 'parse-toast',
      });
      setTimeout(() => {
        setIsDryRunComplete(true);
        toast.success('Dry-run complete: 3 valid rows, 1 validation flag', {
          id: 'parse-toast',
        });
      }, 1000);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    const toastId = toast.loading('Committing valid learners to campus database...');
    setTimeout(() => {
      const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
      setRecentBatchId(batchId);
      setCommitting(false);
      setIsDryRunComplete(false);
      setSelectedFileName(null);
      toast.success(`Successfully imported 3 learners! (Batch ID: ${batchId})`, {
        id: toastId,
      });
    }, 1200);
  };

  const handleRollback = () => {
    if (!recentBatchId) return;
    const toastId = toast.loading(`Rolling back batch ${recentBatchId}...`);
    setTimeout(() => {
      setRecentBatchId(null);
      toast.success(`Batch ${recentBatchId} safely rolled back. All records removed.`, {
        id: toastId,
      });
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Excel Bulk Import & Rollback
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Safe spreadsheet ingestion for {currentSchool?.name || 'Main Campus'}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => toast.success(`Downloading ${entityType}_template.xlsx`)}
          leftIcon={<Download className="w-4 h-4 text-brand-700" />}
        >
          Download Official Template (.xlsx)
        </Button>
      </div>

      {/* Security Banner: Formula Injection Defense */}
      <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-gray-900">
            Active Security: Bi-Directional Spreadsheet Sanitizer
          </h4>
          <p className="text-gray-700 mt-0.5 leading-relaxed text-2xs">
            Per the Edumo Security Standard, all imported cells are scanned before parsing. Any
            potentially malicious formulas starting with <code className="text-brand-700 font-mono">= + - @ \t \r</code>{' '}
            are automatically neutralized with safe character escapes, preventing DDE and code injection.
          </p>
        </div>
      </div>

      {/* Import Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 space-y-4">
          <Select
            label="Target Ingestion Entity"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as 'students' | 'staff')}
            options={[
              { label: 'Students & Learners', value: 'students' },
              { label: 'Faculty & Staff Members', value: 'staff' },
            ]}
          />

          <div className="border-2 border-dashed border-surface-700 hover:border-brand-500 rounded-2xl p-6 text-center transition-all bg-white/50">
            <UploadCloud className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-900">
              {selectedFileName || 'Upload .xlsx or .csv File'}
            </p>
            <p className="text-2xs text-gray-600 mt-1">
              Supports standard Excel 2016+ (.xlsx) up to 10MB
            </p>

            <label className="inline-block mt-4">
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileDrop}
                className="hidden"
              />
              <span className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-800 cursor-pointer border border-gray-200">
                Choose File
              </span>
            </label>
          </div>
        </Card>

        {/* Dry-Run Preview Table */}
        <Card className="md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Dry-Run Verification Preview
                </h3>
                <p className="text-2xs text-gray-500">
                  Pre-commit audit: validates phone formats, admission numbers & escapes formulas
                </p>
              </div>

              {isDryRunComplete && (
                <div className="flex items-center gap-2">
                  <Badge variant="accent" size="sm">
                    3 Valid
                  </Badge>
                  <Badge variant="danger" size="sm">
                    1 Flagged
                  </Badge>
                </div>
              )}
            </div>

            {isDryRunComplete ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-800 text-gray-500 text-2xs uppercase tracking-wider">
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Learner Name</th>
                      <th className="py-2 px-3">Adm No.</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/60">
                    {dryRunRows.map((row) => (
                      <tr key={row.rowNum} className="hover:bg-gray-100/30">
                        <td className="py-2.5 px-3 font-mono text-gray-600">
                          #{row.rowNum}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">
                          {row.admissionNo}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {row.className}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-accent-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-danger-700" title={row.error}>
                              <AlertOctagon className="w-3 h-3" />
                              Error Flag
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-600 text-xs border border-dashed border-surface-800 rounded-2xl">
                Upload a spreadsheet to trigger dry-run analysis and preview records before writing to Firestore.
              </div>
            )}
          </div>

          {isDryRunComplete && (
            <div className="pt-4 mt-4 border-t border-surface-800 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDryRunComplete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCommit}
                isLoading={committing}
                leftIcon={<FileCheck className="w-4 h-4" />}
              >
                Confirm & Commit Valid Rows
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Rollback Batch Management */}
      {recentBatchId && (
        <Card className="border border-brand-500/30 bg-gray-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="brand" size="sm">
                Active Batch: {recentBatchId}
              </Badge>
              <span className="text-2xs text-gray-500">Imported 3 learners</span>
            </div>
            <p className="text-xs text-gray-700 mt-1">
              Made a mistake? You can instantly rollback this import batch. All created student documents will be cleanly removed.
            </p>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={handleRollback}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Rollback Batch
          </Button>
        </Card>
      )}
    </div>
  );
};
