import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, GraduationCap, Calendar, CheckCircle2, FileText, Phone, Mail, Award } from 'lucide-react';

export interface OfferLetterData {
  applicationId: string;
  applicantName: string;
  targetClass: string;
  dateOfBirth?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  offerDate: string;
  reportingDate: string;
  termTuition: number;
  admissionFee: number;
  currency: string;
  specialConditions?: string;
}

interface OfferLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferLetterData | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAddress?: string;
  principalName?: string;
}

export const OfferLetterModal: React.FC<OfferLetterModalProps> = ({
  isOpen,
  onClose,
  offer,
  schoolName,
  schoolLogo,
  schoolMotto,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  principalName = 'The Principal',
}) => {
  if (!offer) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalPayable = offer.termTuition + offer.admissionFee;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Letter of Admission Offer"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Action Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="accent" dot>
              Official Offer of Enrolment
            </Badge>
            <span className="text-2xs font-mono text-gray-500">REF: ADM-OFFER-{offer.applicationId.slice(-6).toUpperCase()}</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Offer Letter / PDF
          </Button>
        </div>

        {/* Printable Letterhead Area */}
        <div
          id="edumo-printable-offer-letter"
          className="p-8 rounded-2xl bg-white border-2 border-gray-200 shadow-sm space-y-6 print:m-0 print:border-none print:shadow-none print:p-4 text-gray-800"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
            <div className="flex items-center gap-4">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#1d5f99] text-white flex items-center justify-center font-bold">
                  <GraduationCap className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">
                  {schoolName}
                </h1>
                {schoolMotto && <p className="text-xs italic text-gray-500">"{schoolMotto}"</p>}
                <p className="text-2xs text-gray-500 mt-1">
                  {schoolAddress ? `${schoolAddress} • ` : ''}
                  {schoolPhone ? `Tel: ${schoolPhone} ` : ''}
                  {schoolEmail ? `| Email: ${schoolEmail}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xs uppercase text-gray-400 font-semibold block">Office of Admissions</span>
              <span className="text-xs font-mono font-bold text-gray-900">{offer.offerDate}</span>
              <span className="text-2xs text-emerald-700 font-semibold block mt-1">PROVISIONAL ADMISSION</span>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">To: {offer.guardianName}</p>
            <p className="text-gray-600">Telephone: {offer.guardianPhone} {offer.guardianEmail ? `| ${offer.guardianEmail}` : ''}</p>
            <p className="font-bold text-gray-900 pt-2 text-sm uppercase">
              RE: PROVISIONAL OFFER OF ADMISSION FOR {offer.applicantName} TO {offer.targetClass.toUpperCase()}
            </p>
          </div>

          {/* Letter Body */}
          <div className="space-y-3 leading-relaxed text-xs text-gray-700">
            <p>
              We are pleased to inform you that following your application and successful evaluation,{' '}
              <strong>{offer.applicantName}</strong> has been offered a provisional placement in{' '}
              <strong>{offer.targetClass}</strong> at <strong>{schoolName}</strong> for the upcoming academic session.
            </p>
            <p>
              The reporting date is officially scheduled for <strong>{offer.reportingDate}</strong>. Registration commences
              at 8:00 AM at the Main Campus Admissions Desk.
            </p>
          </div>

          {/* Financial Breakdown Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 uppercase text-2xs tracking-wider">
              Enrolment &amp; Term 1 Fee Schedule
            </h3>
            <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 text-gray-700 uppercase text-2xs font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount ({offer.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                <tr>
                  <td className="py-2 px-3 text-gray-800 font-sans">Term 1 Tuition &amp; Learning Levies</td>
                  <td className="py-2 px-3 text-right">{offer.currency} {offer.termTuition.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-800 font-sans">One-Off Registration &amp; Student Identity Card</td>
                  <td className="py-2 px-3 text-right">{offer.currency} {offer.admissionFee.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-50 font-bold text-gray-900 border-t-2 border-gray-900 font-sans">
                  <td className="py-2.5 px-3">Total Payable to Secure Admission</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    {offer.currency} {totalPayable.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Required Documents Checklist */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h4 className="font-bold text-gray-900 text-2xs uppercase tracking-wider">
              Mandatory Documents Required on Reporting Day
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Original &amp; copy of Learner's Birth Certificate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Two (2) recent colored passport-size photographs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Certified copy of previous school academic report</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Immunization / Child Health Record card</span>
              </div>
            </div>
          </div>

          {offer.specialConditions && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-2xs text-blue-800">
              <strong>Special Instructions / Notes:</strong> {offer.specialConditions}
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 border-t border-gray-200 flex items-end justify-between">
            <div className="space-y-1">
              <div className="w-36 h-10 border-b border-gray-400"></div>
              <p className="font-bold text-gray-900 text-xs">{principalName}</p>
              <p className="text-2xs text-gray-500">Principal / Head of Institution</p>
            </div>

            <div className="text-center p-3 border-2 border-dashed border-gray-300 rounded-xl text-2xs text-gray-400 w-36">
              OFFICIAL SCHOOL RUBBER STAMP
            </div>

            <div className="space-y-1 text-right">
              <div className="w-36 h-10 border-b border-gray-400 ml-auto"></div>
              <p className="font-bold text-gray-900 text-xs">{offer.guardianName}</p>
              <p className="text-2xs text-gray-500">Parent / Guardian Signature</p>
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
