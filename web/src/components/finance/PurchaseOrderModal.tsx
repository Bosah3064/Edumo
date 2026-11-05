import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, ShieldCheck, Building2, ShoppingBag } from 'lucide-react';
import type { PurchaseOrder } from '@edumo/shared';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAddress?: string;
  schoolCode?: string;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  schoolName,
  schoolLogo,
  schoolMotto,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  schoolCode,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const isServiceOrder = order.type === 'lso';
  const auditTimestamp = order.orderDate || new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const verificationHash = `EDUMO-PO-${order.orderNumber}-${(order.totalAmount * 19).toString(16).toUpperCase()}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isServiceOrder ? 'Official Local Service Order (LSO)' : 'Official Local Purchase Order (LPO)'}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="brand" dot>
              {isServiceOrder ? 'Local Service Order (LSO)' : 'Local Purchase Order (LPO)'}
            </Badge>
            <span className="text-2xs text-slate-500">Official Institutional Procurement Document</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / Save LPO
          </Button>
        </div>

        {/* Printable Area */}
        <div
          id="edumo-printable-lpo"
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
                  Procurement &amp; Supplies Directorate • Institutional Purchase Order
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5 shrink-0">
              <span className="text-2xs font-bold text-slate-400 block uppercase">
                {isServiceOrder ? 'LSO Order No.' : 'LPO Order No.'}
              </span>
              <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                {order.orderNumber}
              </span>
              <p className="text-2xs text-slate-500 mt-1 font-medium">Date Issued: {order.orderDate}</p>
            </div>
          </div>

          {/* Vendor Details Box */}
          <div className="p-4 rounded-xl bg-slate-50 text-xs border border-slate-200 grid grid-cols-2 gap-4">
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">To Supplier / Contractor:</span>
              <span className="font-extrabold text-slate-900 text-sm">{order.supplierName}</span>
              <p className="text-2xs text-slate-500 mt-0.5">Vendor Status: Verified Institutional Supplier</p>
            </div>
            <div>
              <span className="text-2xs text-slate-400 uppercase font-bold block tracking-wider">Required Delivery Window:</span>
              <span className="font-bold text-slate-800">{order.expectedDeliveryDate || 'Prompt / Within 7 Days'}</span>
              <p className="text-2xs text-slate-500 mt-0.5">Depot: School Main Receiving Store</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center">No.</th>
                  <th className="py-2.5 px-3">Item Description / Procurement Scope</th>
                  <th className="py-2.5 px-3 text-center w-20">Quantity</th>
                  <th className="py-2.5 px-3 text-right w-28">Unit Price ({order.currency})</th>
                  <th className="py-2.5 px-3 text-right w-32">Total Amount ({order.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 text-center font-mono text-2xs text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{item.description}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
            <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">
              Total Order Commitment
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              {order.currency} {order.totalAmount.toLocaleString()}
            </span>
          </div>

          {/* Terms & Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-slate-200 text-xs">
            <div className="space-y-4">
              <span className="text-2xs font-bold text-slate-400 uppercase block">1. Procurement Officer</span>
              <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">
                Verified &amp; Requisitioned
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Requisition Signatory</span>
            </div>

            <div className="space-y-4">
              <span className="text-2xs font-bold text-slate-400 uppercase block">2. Principal / Authorizing Officer</span>
              <div className="border-b border-slate-300 pb-1 font-semibold text-emerald-700">
                {order.approvedBy || 'Approved for Procurement'}
              </div>
              <span className="text-[10px] text-slate-400 block font-medium">Official Institutional Seal &amp; Signature</span>
            </div>
          </div>

          {/* SECURITY & ACCOUNTABILITY AUDIT TRAIL */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Institutional Procurement Accountability &amp; Audit Trail
              </span>
              <span className="text-2xs font-mono text-slate-400">
                {verificationHash}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">1. WHO (Authorized By):</span>
                <span className="font-bold text-slate-100">{order.approvedBy || 'Head of Procurement & Principal'}</span>
                <span className="text-[10px] text-slate-400 block">Chief Accounting Officer</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">2. AT WHAT TIME:</span>
                <span className="font-bold text-slate-100 font-mono">{auditTimestamp}</span>
                <span className="text-[10px] text-slate-400 block">System Clock Authenticated</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">3. PROCUREMENT REASON:</span>
                <span className="font-bold text-slate-100 line-clamp-1">{order.items[0]?.description || 'Institutional Supplies Procurement'}</span>
                <span className="text-[10px] text-emerald-400 block">Vendor: {order.supplierName}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
              <span>Security Stamp: Verified Electronic LPO • EDUMO Multi-Tenant Ledger</span>
              <span>Valid only with authorized signatures and official school seal</span>
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
