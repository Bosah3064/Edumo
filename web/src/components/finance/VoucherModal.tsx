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
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  voucher,
  schoolName,
  schoolLogo,
  schoolMotto,
}) => {
  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

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
            <span className="text-2xs text-gray-500">Expenditure Authorization Voucher</span>
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
          className="p-8 rounded-2xl bg-white border-2 border-gray-300 shadow-md space-y-6 print:m-0 print:border-none print:shadow-none print:p-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <img src={schoolLogo} alt="crest" className="w-14 h-14 rounded-xl object-contain" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#1d5f99] text-white flex items-center justify-center font-bold">
                  <Building2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-display font-extrabold text-gray-900 uppercase tracking-tight">
                  {schoolName}
                </h1>
                {schoolMotto && <p className="text-2xs italic text-gray-500">"{schoolMotto}"</p>}
                <p className="text-xs font-bold text-brand-700 tracking-wider uppercase mt-0.5">
                  Office of the Bursar • Official Payment Voucher
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <span className="text-2xs font-bold text-gray-400 block uppercase">Voucher No.</span>
              <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2.5 py-1 rounded-lg">
                {voucher.voucherNumber}
              </span>
              <p className="text-2xs text-gray-500 mt-1">Date: {voucher.preparedAt || new Date().toISOString().slice(0, 10)}</p>
            </div>
          </div>

          {/* Payee & Allocation Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 text-xs border border-gray-200">
            <div>
              <span className="text-2xs text-gray-400 uppercase font-bold block">Paid To (Payee):</span>
              <span className="font-bold text-gray-900 text-sm">{voucher.payeeName}</span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-bold block">Expenditure Category:</span>
              <span className="font-semibold text-gray-800 capitalize">{voucher.category.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-bold block">Disbursement Method:</span>
              <span className="font-mono text-gray-800 font-bold uppercase">{voucher.paymentMethod.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-bold block">Transaction Reference / Cheque No:</span>
              <span className="font-mono text-gray-800 font-bold">{voucher.referenceNumber || 'N/A'}</span>
            </div>
          </div>

          {/* Description & Itemization */}
          <div className="space-y-2">
            <h4 className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Particulars of Expenditure</h4>
            <div className="p-4 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 leading-relaxed min-h-[70px]">
              {voucher.description}
            </div>
          </div>

          {/* Total Amount Box */}
          <div className="p-4 rounded-xl bg-gray-900 text-white flex items-center justify-between">
            <div>
              <span className="text-2xs uppercase tracking-wider text-gray-300 block font-bold">Total Amount Authorized</span>
              <span className="text-xs text-gray-400 italic">Chargeable to Institutional Operating Account</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">
                {voucher.currency} {voucher.amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Verification & Approval Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-gray-200 text-xs">
            <div className="space-y-6">
              <span className="text-2xs font-bold text-gray-400 uppercase block">1. Prepared By</span>
              <div className="border-b border-gray-400 pb-1 font-semibold text-gray-800">
                {voucher.preparedBy || 'Accounts Clerk'}
              </div>
              <span className="text-[10px] text-gray-400 block">Sign &amp; Date</span>
            </div>

            <div className="space-y-6">
              <span className="text-2xs font-bold text-gray-400 uppercase block">2. Verified (Bursar)</span>
              <div className="border-b border-gray-400 pb-1 font-semibold text-gray-800">
                Verified &amp; Audited
              </div>
              <span className="text-[10px] text-gray-400 block">Sign &amp; Date</span>
            </div>

            <div className="space-y-6">
              <span className="text-2xs font-bold text-gray-400 uppercase block">3. Authorized (Principal)</span>
              <div className="border-b border-gray-400 pb-1 font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {voucher.approvedBy || 'Approved for Payment'}
              </div>
              <span className="text-[10px] text-gray-400 block">Sign &amp; School Stamp</span>
            </div>
          </div>

          {/* Watermark Notice */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verified Electronic Financial Document • EDUMO Financial OS
            </span>
            <span>Generated on {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

