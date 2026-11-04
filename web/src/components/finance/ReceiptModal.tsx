import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, CheckCircle2, ShieldCheck, Building2, Receipt } from 'lucide-react';

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
}) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

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
            <span className="text-2xs font-mono text-gray-500">{receipt.receiptNumber}</span>
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
          className="p-6 rounded-2xl bg-white border-2 border-gray-300 shadow-md space-y-5 print:m-0 print:border-none print:shadow-none print:p-2"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-900 pb-3">
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-14 h-14 rounded-xl object-contain" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#1d5f99] text-white flex items-center justify-center font-bold">
                  <Receipt className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">
                  {schoolName}
                </h2>
                {schoolMotto && <p className="text-2xs italic text-gray-500">"{schoolMotto}"</p>}
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {schoolPhone ? `Tel: ${schoolPhone} ` : ''}
                  {schoolEmail ? `| Email: ${schoolEmail}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Receipt Number</span>
              <span className="text-xs font-mono font-bold text-gray-900">{receipt.receiptNumber}</span>
              <span className="text-[10px] text-gray-500 block mt-0.5">Date: {receipt.paymentDate}</span>
            </div>
          </div>

          {/* Student & Payer Info */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            <div>
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Learner</span>
              <span className="font-bold text-gray-900">{receipt.studentName}</span>
              <span className="text-[10px] text-gray-500 font-mono block">
                ADM: {receipt.admissionNumber} • {receipt.className}
              </span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Received From</span>
              <span className="font-bold text-gray-900">{receipt.payerName || 'Parent / Guardian'}</span>
              <span className="text-[10px] text-gray-500 block">
                Method: {receipt.paymentMethod.toUpperCase()} (Ref: {receipt.transactionRef})
              </span>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-900 bg-gray-100 text-gray-700 font-bold uppercase text-2xs">
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3 text-right">Invoiced</th>
                <th className="py-2 px-3 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 px-3">
                  <span className="font-semibold text-gray-900 block">
                    {receipt.feeItemDescription || 'Term 1 Tuition & Operations Fees'}
                  </span>
                  <span className="text-2xs text-gray-500">
                    Official School Fees Allocation
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-gray-600">
                  {receipt.currency} {receipt.totalInvoiceAmount.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                  {receipt.currency} {receipt.amountPaid.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Summary Box */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-emerald-900 block">
                {receipt.balanceRemaining === 0 ? 'Fully Paid / Cleared' : 'Partial Payment Acknowledged'}
              </span>
              <span className="text-2xs text-emerald-700">
                Outstanding Balance Remaining:{' '}
                <strong>
                  {receipt.currency} {receipt.balanceRemaining.toLocaleString()}
                </strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xs text-gray-500 block uppercase font-semibold">Total Paid</span>
              <span className="text-base font-bold font-mono text-emerald-800">
                {receipt.currency} {receipt.amountPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-2xs text-gray-500">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Verified Electronic Signature &amp; Audit Seal
            </div>
            <div>Bursar's Office: <span className="font-serif italic text-gray-400">[ STAMP &amp; SIGNED ]</span></div>
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
