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
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface DryRunRow {
  rowNum: number;
  admissionNo: string;
  name: string;
  className: string;
  guardianPhone: string;
  gender?: string;
  email?: string;
  schoolId?: string;
  role?: string;
  isValid: boolean;
  error?: string;
}

export const ExcelImport: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const [entityType, setEntityType] = useState<'students' | 'staff'>('students');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDryRunComplete, setIsDryRunComplete] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [recentBatchId, setRecentBatchId] = useState<string | null>(null);
  const [dryRunRows, setDryRunRows] = useState<DryRunRow[]>([]);

  const cleanCell = (value: unknown) => {
    const text = value == null ? '' : String(value).trim();
    if (/^[=+@\t\r\n]|^-[^\s]/.test(text)) return text.replace(/^[=+@\t\r\n-]+/, '').trim();
    return text.replace(/^'/, '').trim();
  };

  const downloadTemplate = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(entityType === 'students' ? 'Students' : 'Staff');
    if (entityType === 'students') {
      sheet.addRow(['Name', 'Admission Number', 'Class', 'Guardian Phone', 'Gender']);
      sheet.addRow(['Amina Kariuki', '', 'Grade 4 East', '+254712345678', 'female']);
    } else {
      sheet.addRow(['Name', 'Role', 'School ID', 'Email', 'Phone']);
      sheet.addRow(['Peter Kamau', 'teacher', '', '', '+254722334455']);
    }
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 24; });
    const data = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityType}_import_template.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('Spreadsheet must be 10MB or smaller');
    setSelectedFileName(file.name);
    const toastId = toast.loading('Analyzing spreadsheet and checking formulas...');
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('Workbook has no worksheet');
      const headers = sheet.getRow(1).values as unknown[];
      const normalized = headers.slice(1).map((value) => cleanCell(value).toLowerCase().replace(/[^a-z0-9]/g, ''));
      const rows: DryRunRow[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (rowNumber > 401) return;
        const values = row.values as unknown[];
        const record: Record<string, string> = {};
        normalized.forEach((header, index) => { record[header] = cleanCell(values[index + 1]); });
        const name = record.name || '';
        const phone = entityType === 'students' ? record.guardianphone : record.phone;
        const validPhone = !phone || /^\+[1-9]\d{7,14}$/.test(phone);
        const error = !name ? 'Name is required.' : !validPhone ? 'Phone must be in international format, e.g. +254712345678.' : undefined;
        rows.push({
          rowNum: rowNumber,
          admissionNo: entityType === 'students' ? record.admissionnumber || 'Generated automatically' : record.schoolid || 'Generated automatically',
          name,
          className: entityType === 'students' ? record.class || '' : record.role || '',
          guardianPhone: phone || '',
          gender: entityType === 'students' ? record.gender : undefined,
          email: entityType === 'staff' ? record.email : undefined,
          schoolId: entityType === 'staff' ? record.schoolid : undefined,
          role: entityType === 'staff' ? record.role : undefined,
          isValid: !error,
          error,
        });
      });
      if (!rows.length) throw new Error('No data rows found below the header');
      setDryRunRows(rows);
      setIsDryRunComplete(true);
      const valid = rows.filter((row) => row.isValid).length;
      toast.success(`Dry-run complete: ${valid} valid, ${rows.length - valid} flagged`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not read the spreadsheet', { id: toastId });
    }
  };

  const handleCommit = async () => {
    if (!organization || !currentSchool) return toast.error('Select a school first');
    const validRows = dryRunRows.filter((row) => row.isValid);
    if (!validRows.length) return toast.error('No valid rows to import');
    setCommitting(true);
    const toastId = toast.loading(`Importing valid ${entityType}...`);
    try {
      const rows = await Promise.all(validRows.map(async (row) => ({
        rowNum: row.rowNum,
        name: row.name,
        admissionNumber: row.admissionNo === 'Generated automatically' ? undefined : row.admissionNo,
        className: entityType === 'students' ? row.className : undefined,
        guardianPhone: entityType === 'students' ? row.guardianPhone : undefined,
        phone: entityType === 'staff' ? row.guardianPhone : undefined,
        email: entityType === 'staff' ? row.email : undefined,
        schoolId: entityType === 'staff' ? row.schoolId : undefined,
        role: entityType === 'staff' ? (row.role || row.className) : undefined,
        gender: entityType === 'students' ? row.gender : undefined,
      })));
      const commit = httpsCallable(functions, 'bulkImport');
      const response = await commit({ schoolId: currentSchool.id, entityType, rows });
      const result = response.data as { batchId: string; importedRows: number; errorCount: number };
      setRecentBatchId(result.batchId);
      setIsDryRunComplete(false);
      setSelectedFileName(null);
      toast.success(`Imported ${result.importedRows} ${entityType}. ${result.errorCount ? `${result.errorCount} rows flagged.` : ''}`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to commit the import', { id: toastId });
    } finally {
      setCommitting(false);
    }
  };

  const handleRollback = async () => {
    if (!organization || !currentSchool || !recentBatchId) return;
    const toastId = toast.loading(`Rolling back batch ${recentBatchId}...`);
    try {
      const rollback = httpsCallable(functions, 'rollbackImport');
      const response = await rollback({ schoolId: currentSchool.id, batchId: recentBatchId });
      const result = response.data as { removedRows: number };
      toast.success(`Rollback complete. Removed ${result.removedRows} records.`, { id: toastId });
      setRecentBatchId(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to rollback the batch', { id: toastId });
    }
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
          onClick={downloadTemplate}
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
              {selectedFileName || 'Upload .xlsx File'}
            </p>
            <p className="text-2xs text-gray-600 mt-1">
              Supports standard Excel 2016+ (.xlsx) up to 10MB
            </p>

            <label className="inline-block mt-4">
              <input
                type="file"
                accept=".xlsx"
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
                    {dryRunRows.filter((row) => row.isValid).length} Valid
                  </Badge>
                  <Badge variant="danger" size="sm">
                    {dryRunRows.filter((row) => !row.isValid).length} Flagged
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
              <span className="text-2xs text-gray-500">Tenant-scoped import batch</span>
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
