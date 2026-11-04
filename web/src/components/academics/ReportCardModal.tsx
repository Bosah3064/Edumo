import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Printer, ShieldCheck, GraduationCap, Award } from 'lucide-react';
import type { StudentAssessmentAggregate } from '@edumo/shared';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: StudentAssessmentAggregate | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  termTitle?: string;
  academicYear?: string;
  className?: string;
  attendancePresent?: number;
  attendanceTotal?: number;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  reportData,
  schoolName,
  schoolLogo,
  schoolMotto,
  termTitle = 'Term 1',
  academicYear = '2026',
  className = 'Grade 4',
  attendancePresent = 62,
  attendanceTotal = 65,
}) => {
  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCBC = reportData.isNoAggregate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Learner Progress Report Card"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="brand" dot>
              {isCBC ? '🇰🇪 CBC Learner Progress Standard' : 'Official Academic Transcript'}
            </Badge>
            <span className="text-2xs text-gray-500">{termTitle} Session • {academicYear}</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / Save PDF
          </Button>
        </div>

        {/* Printable Report Card Area */}
        <div
          id="edumo-printable-report"
          className="p-8 rounded-2xl bg-white border-2 border-gray-300 shadow-md space-y-6 print:m-0 print:border-none print:shadow-none print:p-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
            <div className="flex items-center gap-4">
              {schoolLogo ? (
                <img src={schoolLogo} alt="crest" className="w-16 h-16 rounded-xl object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#1d5f99] text-white flex items-center justify-center font-bold">
                  <GraduationCap className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-display font-extrabold text-gray-900 uppercase tracking-tight">
                  {schoolName}
                </h1>
                {schoolMotto && <p className="text-2xs italic text-gray-600">"{schoolMotto}"</p>}
                <p className="text-xs font-semibold text-brand-700 tracking-wider uppercase mt-0.5">
                  Continuous Assessment & Termly Progress Report
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-2xs text-gray-500 uppercase block">Academic Session</span>
              <span className="font-bold text-gray-900">{termTitle} • {academicYear}</span>
            </div>
          </div>

          {/* Student Profile Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            <div>
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Learner Name</span>
              <span className="font-bold text-gray-900 text-sm">{reportData.studentName}</span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Admission No.</span>
              <span className="font-mono font-bold text-gray-900">{reportData.admissionNumber}</span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Class / Stream</span>
              <span className="font-semibold text-gray-900">{className}</span>
            </div>
            <div>
              <span className="text-2xs text-gray-400 uppercase font-semibold block">Term Attendance</span>
              <span className="font-semibold text-gray-900">
                {attendancePresent} / {attendanceTotal} Days ({Math.round((attendancePresent / attendanceTotal) * 100)}%)
              </span>
            </div>
          </div>

          {/* Compliance Notice */}
          {reportData.complianceNotice && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{reportData.complianceNotice}</span>
            </div>
          )}

          {/* Subjects Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900 bg-gray-100 text-gray-700 font-bold uppercase text-2xs">
                  <th className="py-2.5 px-3">Learning Area / Subject</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3 text-center">Performance Level / Band</th>
                  <th className="py-2.5 px-3">Educator Remark &amp; Rubric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData.subjects.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{s.subjectName}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium">
                      {s.rawScore} / {s.maxScore}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `${s.band?.colorHex || '#1d5f99'}20`,
                          color: s.band?.colorHex || '#1d5f99',
                        }}
                      >
                        {s.band?.code || '—'} {s.band?.name ? `(${s.band.name})` : ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 text-2xs italic">
                      {s.comments || 'Demonstrates satisfactory competency engagement and participation.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aggregate / Rank Summary for Classic & UNEB & NECTA */}
          {!isCBC && (
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
              <div>
                <span className="text-2xs text-gray-500 uppercase block font-semibold">Total / Mean Score</span>
                <span className="text-base font-bold text-gray-900">
                  {reportData.meanScore !== undefined ? `${reportData.meanScore}%` : reportData.totalScore}
                </span>
              </div>
              {reportData.summaryBand && (
                <div>
                  <span className="text-2xs text-gray-500 uppercase block font-semibold">Overall Grade</span>
                  <span className="text-base font-bold text-accent-700">
                    {reportData.summaryBand.code} ({reportData.summaryBand.name})
                  </span>
                </div>
              )}
              {reportData.rank !== null && reportData.rank !== undefined && (
                <div>
                  <span className="text-2xs text-gray-500 uppercase block font-semibold">Class Position</span>
                  <span className="text-base font-bold text-gray-900">
                    Position #{reportData.rank}
                  </span>
                </div>
              )}
              {reportData.division && (
                <div>
                  <span className="text-2xs text-gray-500 uppercase block font-semibold">Official Division</span>
                  <span className="text-base font-bold text-amber-700">{reportData.division}</span>
                </div>
              )}
            </div>
          )}

          {/* Qualitative Comments & Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 text-xs">
            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="font-bold text-gray-700 block text-2xs uppercase">Class Teacher's Remark:</span>
              <p className="text-gray-600 italic">
                {isCBC
                  ? 'Learner actively demonstrates required core competencies, problem-solving, and collaboration.'
                  : 'A commendable academic performance this session. Consistent focus in core disciplines recommended.'}
              </p>
              <div className="pt-2 text-2xs text-gray-400">Signature: __________________________</div>
            </div>

            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <span className="font-bold text-gray-700 block text-2xs uppercase">Head of Institution / Principal:</span>
              <p className="text-gray-600 italic">
                Promising termly development. Verified for advancement to subsequent term learning modules.
              </p>
              <div className="pt-2 text-2xs text-gray-400 flex justify-between">
                <span>Signature: __________________</span>
                <span className="font-serif italic text-gray-300">[ OFFICIAL SEAL ]</span>
              </div>
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

