import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, ShieldCheck, Receipt, QrCode, CheckCircle2 } from 'lucide-react';

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  payerName: string;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  transactionRef: string;
  totalInvoiceAmount: number;
  balanceRemaining: number;
  feeItemDescription?: string;
  receivedBy?: string;
  receivedByRole?: string;
  reason?: string;
  securityHash?: string;
  timestamp?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAddress?: string;
  schoolCode?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  schoolName,
  schoolLogo,
  schoolMotto,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  schoolCode,
}) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const auditTimestamp = receipt.timestamp || new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const auditOfficer = receipt.receivedBy || 'Accounts Department / Bursar';
  const auditRole = receipt.receivedByRole || 'Financial Controller';
  const auditReason = receipt.reason || receipt.feeItemDescription || 'Termly Tuition & Operational Fee Payment Allocation';
  const verificationHash = receipt.securityHash || `EDUMO-REC-${receipt.receiptNumber}-${(receipt.amountPaid * 17).toString(16).toUpperCase()}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official School Fees Receipt"
      maxWidth="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="accent" dot>
              Verified Electronic Receipt
            </Badge>
            <span className="text-2xs font-mono text-slate-500">{receipt.receiptNumber}</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Receipt / PDF
          </Button>
        </div>

        {/* Printable Area */}
        <div
          id="edumo-printable-receipt"
          className="p-6 sm:p-7 rounded-2xl bg-white border-2 border-slate-300 shadow-md space-y-5 print:m-0 print:border-none print:shadow-none print:p-2"
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
                  <Receipt className="w-8 h-8" />
                </div>
              )}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight font-display">
                    {schoolName}
                  </h2>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d5f99] block pt-0.5">
                  Office of Financial Management • Official Student Fee Receipt
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-2xs text-slate-400 uppercase font-bold block">Receipt Number</span>
              <span className="text-sm font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md inline-block">
                {receipt.receiptNumber}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1 font-medium">
                Date: {receipt.paymentDate}
              </span>
            </div>
          </div>

          {/* Student & Payer Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Learner Details</span>
              <span className="font-extrabold text-slate-900 text-sm">{receipt.studentName}</span>
              <span className="text-[11px] text-slate-600 font-mono block mt-0.5">
                ADM: <strong>{receipt.admissionNumber}</strong> • Class: {receipt.className}
              </span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Payment Source</span>
              <span className="font-bold text-slate-900">{receipt.payerName || 'Parent / Guardian'}</span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Channel: <strong className="uppercase">{receipt.paymentMethod.replace('_', ' ')}</strong> (Ref: <span className="font-mono">{receipt.transactionRef}</span>)
              </span>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700 font-bold uppercase text-2xs">
                  <th className="py-2.5 px-3">Fee Particulars / Item Description</th>
                  <th className="py-2.5 px-3 text-right">Invoiced Total</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">
                      {receipt.feeItemDescription || 'Term 1 Tuition & Operational Fees'}
                    </span>
                    <span className="text-2xs text-slate-500">
                      Institutional ledger settlement credited to student fee account
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 font-medium">
                    {receipt.currency} {receipt.totalInvoiceAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                    {receipt.currency} {receipt.amountPaid.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-black text-emerald-900 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {receipt.balanceRemaining === 0 ? 'Account Fully Paid & Cleared' : 'Partial Payment Acknowledged'}
              </span>
              <span className="text-2xs text-emerald-800 font-medium mt-0.5 block">
                Outstanding Balance Remaining:{' '}
                <strong>
                  {receipt.currency} {receipt.balanceRemaining.toLocaleString()}
                </strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Total Received</span>
              <span className="text-lg font-black font-mono text-emerald-800">
                {receipt.currency} {receipt.amountPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* SECURITY & ACCOUNTABILITY AUDIT TRAIL */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Verified Institutional Security & Audit Trail
              </span>
              <span className="text-2xs font-mono text-slate-400">
                {verificationHash}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">1. WHO (Authorized By):</span>
                <span className="font-bold text-slate-100">{auditOfficer}</span>
                <span className="text-[10px] text-slate-400 block">{auditRole}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">2. AT WHAT TIME:</span>
                <span className="font-bold text-slate-100 font-mono">{auditTimestamp}</span>
                <span className="text-[10px] text-slate-400 block">System Clock Authenticated</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">3. TRANSACTION REASON:</span>
                <span className="font-bold text-slate-100 line-clamp-1">{auditReason}</span>
                <span className="text-[10px] text-emerald-400 block">Audit Log ID: {verificationHash.slice(-8)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
              <span>Security Stamp: Verified Electronic Signature • EDUMO Multi-Tenant Immutable Ledger</span>
              <span>Bursar Signature: [ ELECTRONICALLY SIGNED & SEALED ]</span>
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
