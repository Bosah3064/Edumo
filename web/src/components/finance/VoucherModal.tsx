import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, CheckCircle2, ShieldCheck, Building2, FileText } from 'lucide-react';
import type { PaymentVoucher } from '@edumo/shared';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: PaymentVoucher | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAddress?: string;
  schoolCode?: string;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  voucher,
  schoolName,
  schoolLogo,
  schoolMotto,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  schoolCode,
}) => {
  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const auditTimestamp = voucher.paidAt || voucher.approvedAt || voucher.preparedAt || new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const verificationHash = `EDUMO-PV-${voucher.voucherNumber}-${(voucher.amount * 31).toString(16).toUpperCase()}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official School Payment Voucher"
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="accent" dot>
              Internal Financial Control
            </Badge>
            <span className="text-2xs text-slate-500">Expenditure Authorization Voucher</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / Save Voucher
          </Button>
        </div>

        {/* Printable Area */}
        <div
          id="edumo-printable-voucher"
          className="p-6 sm:p-8 rounded-2xl bg-white border-2 border-slate-300 shadow-md space-y-6 print:m-0 print:border-none print:shadow-none print:p-2"
        >
          {/* Header with Full School Info & Logo */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-start gap-3.5">
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="w-16 h-16 rounded-xl object-contain border border-slate-200 p-1 bg-white shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#1d5f99] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight font-display">
                    {schoolName}
                  </h1>
                  {schoolCode && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      CODE: {schoolCode}
                    </span>
                  )}
                </div>
                {schoolMotto && <p className="text-2xs italic text-slate-500 font-medium">"{schoolMotto}"</p>}
                <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
                  {schoolAddress && <span>📍 {schoolAddress}</span>}
                  {schoolPhone && <span>📞 {schoolPhone}</span>}
                  {schoolEmail && <span>✉️ {schoolEmail}</span>}
                </div>
                <p className="text-xs font-bold text-[#1d5f99] tracking-wider uppercase mt-0.5">
                  Office of the Bursar • Official Institutional Payment Voucher
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5 shrink-0">
              <span className="text-2xs font-bold text-slate-400 block uppercase">Voucher No.</span>
              <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                {voucher.voucherNumber}
              </span>
              <p className="text-2xs text-slate-500 mt-1 font-medium">Date: {voucher.preparedAt || new Date().toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Payee & Allocation Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 text-xs border border-slate-200">
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Paid To (Payee):</span>
              <span className="font-extrabold text-slate-900 text-sm">{voucher.payeeName}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Expenditure Vote-Head:</span>
              <span className="font-bold text-slate-800 capitalize">{voucher.category.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Disbursement Method:</span>
              <span className="font-mono text-slate-800 font-bold uppercase">{voucher.paymentMethod.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Transaction Ref / Cheque No:</span>
              <span className="font-mono text-slate-900 font-bold">{voucher.referenceNumber || 'DIRECT EFT / M-PESA'}</span>
            </div>
          </div>

          {/* Description & Itemization */}
          <div className="space-y-1.5">
            <h4 className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Particulars of Expenditure &amp; Business Justification</h4>
            <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 leading-relaxed min-h-[70px]">
              {voucher.description}
            </div>
          </div>

          {/* Total Amount Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-2xs uppercase tracking-wider text-slate-300 block font-bold">Total Amount Authorized</span>
              <span className="text-xs text-slate-400 italic">Chargeable to Institutional Operating Account</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {voucher.currency} {voucher.amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Multi-Tier Workflow Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-200 text-xs">
            <div className="space-y-4">
              <span className="text-2xs font-bold text-slate-400 uppercase block">1. Prepared By</span>
              <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
                {voucher.preparedBy || 'Accounts Clerk'}
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Audit Status: Drafted</span>
            </div>

            <div className="space-y-4">
              <span className="text-2xs font-bold text-slate-400 uppercase block">2. Verified (Bursar)</span>
              <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
                Internal Audit Verified
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Audit Status: Compliant</span>
            </div>

            <div className="space-y-4">
              <span className="text-2xs font-bold text-slate-400 uppercase block">3. Authorized (Principal)</span>
              <div className="border-b border-slate-300 pb-1 font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {voucher.approvedBy || 'Approved for Payment'}
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Official Stamp &amp; Signature</span>
            </div>
          </div>

          {/* SECURITY & ACCOUNTABILITY AUDIT TRAIL */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Institutional Financial Accountability &amp; Audit Trail
              </span>
              <span className="text-2xs font-mono text-slate-400">
                {verificationHash}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">1. WHO (Authorized By):</span>
                <span className="font-bold text-slate-100">{voucher.approvedBy || voucher.preparedBy || 'School Principal & Bursar'}</span>
                <span className="text-[10px] text-slate-400 block">Signatory Level A</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">2. AT WHAT TIME:</span>
                <span className="font-bold text-slate-100 font-mono">{auditTimestamp}</span>
                <span className="text-[10px] text-slate-400 block">System Clock Authenticated</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">3. EXPENDITURE REASON:</span>
                <span className="font-bold text-slate-100 line-clamp-1">{voucher.description}</span>
                <span className="text-[10px] text-emerald-400 block">Category: {voucher.category}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
              <span>Security Stamp: Verified Electronic Voucher • EDUMO Multi-Tenant Ledger</span>
              <span>Audit Ref: {verificationHash.slice(-8)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
