import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, QrCode, ShieldCheck, Sparkles, GraduationCap } from 'lucide-react';

interface StudentInfo {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className?: string;
  gender?: string;
  boardingStatus?: string;
  schoolEmail?: string;
}

interface ExamCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentInfo | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  templateKey?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const ExamCardModal: React.FC<ExamCardModalProps> = ({
  isOpen,
  onClose,
  student,
  schoolName,
  schoolLogo,
  schoolMotto,
  templateKey = 'classic',
  primaryColor = '#1d5f99',
  secondaryColor = '#683669',
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const fullName = `${student.firstName} ${student.lastName}`.trim();
  const currentYear = new Date().getFullYear();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Official Student Examination Card & ID" maxWidth="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="brand" dot>
              Active Template: {templateKey.toUpperCase()}
            </Badge>
            <span className="text-2xs text-gray-500">Term 1 Official Verification</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Card / Save PDF
          </Button>
        </div>

        {/* Printable Card Area */}
        <div
          ref={printAreaRef}
          id="edumo-printable-card"
          className="p-6 rounded-2xl bg-white border-2 shadow-lg transition-all print:m-0 print:border-none print:shadow-none"
          style={{
            borderColor: templateKey === 'executive' ? '#D97706' : primaryColor,
          }}
        >
          {/* Template 1: Classic Crest */}
          {templateKey === 'classic' && (
            <div className="space-y-4 border-4 border-double p-5 rounded-xl border-gray-300">
              <div className="flex items-center justify-between border-b-2 border-gray-200 pb-3">
                <div className="flex items-center gap-3">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="crest" className="w-12 h-12 rounded-lg object-contain" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg text-white flex items-center justify-center font-bold"
                      style={{ background: primaryColor }}
                    >
                      <GraduationCap className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">
                      {schoolName}
                    </h2>
                    {schoolMotto && <p className="text-2xs italic text-gray-500">"{schoolMotto}"</p>}
                    <span className="text-[10px] font-semibold tracking-wider text-brand-700 uppercase">
                      Official Examination Card — {currentYear}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-gray-900">
                    {student.admissionNumber}
                  </div>
                  <span className="text-2xs text-gray-400">INDEX CANDIDATE</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center py-2">
                <div className="col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl h-32 bg-gray-50">
                  <span className="text-2xs text-gray-400 font-semibold uppercase">Passport Photo</span>
                </div>
                <div className="col-span-2 space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">Full Name:</span>
                    <span className="font-bold text-gray-900">{fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">Class / Stream:</span>
                    <span className="font-semibold text-gray-900">{student.className || 'Grade 4'}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">Gender / Boarding:</span>
                    <span className="font-medium text-gray-800">
                      {(student.gender || '—').toUpperCase()} / {(student.boardingStatus || 'day').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">Candidate Signature:</span>
                    <span className="text-gray-300 font-serif italic">___________________</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-2xs text-gray-500">
                <div className="flex items-center gap-1 text-green-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified for National & School Assessments
                </div>
                <div>Principal's Stamp: <span className="font-serif italic text-gray-400">[ SEAL ]</span></div>
              </div>
            </div>
          )}

          {/* Template 2: Modern QR */}
          {templateKey === 'modern' && (
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5">
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
              />

              <div className="flex items-center justify-between mb-4 mt-1">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-gray-900">{schoolName}</h3>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: primaryColor }}>
                    STUDENT DIGITAL ID & EXAM PASS
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                  {student.admissionNumber.slice(-4)}
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-gray-200 flex flex-col items-center justify-center shrink-0">
                  <QrCode className="w-16 h-16 text-gray-800" />
                  <span className="text-[8px] font-mono font-bold text-gray-500 mt-0.5">SCAN VERIFY</span>
                </div>
                <div className="space-y-1 text-xs flex-1">
                  <p className="text-base font-bold text-gray-900 leading-tight">{fullName}</p>
                  <p className="text-2xs text-gray-500 font-mono">ADM: {student.admissionNumber}</p>
                  <div className="inline-block mt-1">
                    <span className="text-2xs font-bold text-gray-700 bg-gray-200 px-2 py-0.5 rounded-md">
                      {student.className || 'Grade 4'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Valid for Academic Year {currentYear} • Non-transferable
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Template 3: Compact Slip */}
          {templateKey === 'compact' && (
            <div className="p-4 border-2 border-dashed border-gray-400 rounded-lg text-xs space-y-2.5 font-mono">
              <div className="text-center border-b border-gray-300 pb-2">
                <h3 className="font-bold text-gray-900 text-sm uppercase">{schoolName}</h3>
                <p className="text-2xs text-gray-600">EXAMINATION DESK SLIP — {currentYear}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div><strong>CANDIDATE:</strong> {fullName}</div>
                <div><strong>ADM NO:</strong> {student.admissionNumber}</div>
                <div><strong>CLASS:</strong> {student.className || 'Grade 4'}</div>
                <div><strong>DESK NO:</strong> DESK-{student.admissionNumber.slice(-3)}</div>
              </div>
              <div className="border border-gray-300 rounded p-1.5 text-center text-[10px] text-gray-500 bg-gray-50">
                Notice: Candidate must display this slip on their examination desk at all sessions.
              </div>
            </div>
          )}

          {/* Template 4: Executive Distinction */}
          {templateKey === 'executive' && (
            <div className="relative p-6 rounded-xl border-2 border-amber-600 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 shadow-inner">
              <div className="flex items-center justify-between border-b-2 border-amber-600/40 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-serif font-bold text-amber-950 uppercase tracking-wide">
                      {schoolName}
                    </h3>
                    <p className="text-2xs text-amber-800 font-serif italic">Honor & Academic Integrity</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded bg-amber-600 text-white font-serif font-bold text-xs tracking-wider">
                  VERIFIED CANDIDATE
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center py-4">
                <div className="col-span-2 space-y-1.5 text-xs">
                  <div>
                    <span className="text-2xs uppercase tracking-wider text-amber-800 block">Candidate Name</span>
                    <span className="text-base font-serif font-bold text-gray-900">{fullName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-2xs">
                    <div>
                      <span className="text-gray-500 block">Admission Number</span>
                      <span className="font-bold font-mono text-gray-900">{student.admissionNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Academic Class</span>
                      <span className="font-bold text-gray-900">{student.className || 'Grade 4'}</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center p-3 rounded-xl border border-amber-300 bg-amber-50/50">
                  <ShieldCheck className="w-10 h-10 text-amber-700" />
                  <span className="text-[9px] font-serif font-bold text-amber-900 mt-1 uppercase text-center">
                    Authorized Distinction Pass
                  </span>
                </div>
              </div>
            </div>
          )}
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
