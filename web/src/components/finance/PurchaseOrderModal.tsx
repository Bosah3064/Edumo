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
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  schoolName,
  schoolLogo,
  schoolMotto,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const isServiceOrder = order.type === 'lso';

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
            <span className="text-2xs text-gray-500">Official Institutional Procurement Document</span>
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
                  Procurement &amp; Supplies Directorate
                </p>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <span className="text-2xs font-bold text-gray-400 block uppercase">
                {isServiceOrder ? 'LSO Order No.' : 'LPO Order No.'}
              </span>
              <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2.5 py-1 rounded-lg">
                {order.orderNumber}
              </span>
              <p className="text-2xs text-gray-500 mt-1">Date Issued: {order.orderDate}</p>
            </div>
          </div>

          {/* Vendor Details Box */}
          <div className="p-4 rounded-xl bg-gray-50 text-xs border border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <span className="text-2xs text-gray-400 uppercase font-bold block">To Supplier / Contractor:</span>
              <span className="font-bold text-gray-900 text-sm">{order.supplierName}</span>
              <p className="text-2xs text-gray-500 mt-0.5">Approved Vendor Status: Active</p>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-bold block">Required Delivery Window:</span>
              <span className="font-semibold text-gray-800">{order.expectedDeliveryDate || 'Prompt / Within 7 Days'}</span>
              <p className="text-2xs text-gray-500 mt-0.5">Delivery Point: School Main Store Depot</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900 text-gray-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center">No.</th>
                  <th className="py-2.5 px-3">Item Description / Service Scope</th>
                  <th className="py-2.5 px-3 text-center w-20">Quantity</th>
                  <th className="py-2.5 px-3 text-right w-28">Unit Price ({order.currency})</th>
                  <th className="py-2.5 px-3 text-right w-32">Total Amount ({order.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 text-center font-mono text-2xs text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800">{item.description}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Box */}
          <div className="p-4 rounded-xl bg-gray-900 text-white flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
              Total Order Commitment
            </span>
            <span className="text-2xl font-extrabold font-mono text-emerald-400">
              {order.currency} {order.totalAmount.toLocaleString()}
            </span>
          </div>

          {/* Terms & Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-gray-200 text-xs">
            <div className="space-y-4">
              <span className="text-2xs font-bold text-gray-400 uppercase block">1. Procurement Officer</span>
              <div className="border-b border-gray-400 pb-1 font-semibold text-gray-800">
                Verified &amp; Raised
              </div>
              <span className="text-[10px] text-gray-400 block">Sign &amp; Date</span>
            </div>

            <div className="space-y-4">
              <span className="text-2xs font-bold text-gray-400 uppercase block">2. Principal / Authorizing Officer</span>
              <div className="border-b border-gray-400 pb-1 font-semibold text-emerald-700">
                {order.approvedBy || 'Approved for Procurement'}
              </div>
              <span className="text-[10px] text-gray-400 block">Official Signature &amp; School Seal</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Valid only with authorized signatures and official school seal • EDUMO Financial OS
            </span>
            <span>Generated on {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

