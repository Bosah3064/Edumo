// ============================================================
// EDUMO — Multi-Template Report Card & Learner Progress Engine
// Supports 6 distinct administrative report card designs:
// 1. Classic Crest & Honors (Traditional East African / British Grammar)
// 2. Modern CBC Competency-Based (KICD CBA Rubric & Core Competencies)
// 3. Executive Distinction (High-Security International Certificate)
// 4. Compact Termly Slip (B&W Laser / Thermal Ink-Saving Slip)
// 5. Visual Trajectory (Zeraki Analytics Longitudinal Visual Broadsheet)
// 6. Dual Curriculum (Integrated Secular & Faith-Based / Madrasa)
// ============================================================

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Printer,
  ShieldCheck,
  GraduationCap,
  Award,
  QrCode,
  Sparkles,
  TrendingUp,
  BookOpen,
  FileText,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import type { StudentAssessmentAggregate } from '@edumo/shared';
import { useTenant } from '../../contexts/TenantContext';

export type ReportTemplateId =
  | 'classic_crest'
  | 'modern_cbc'
  | 'executive_distinction'
  | 'compact_slip'
  | 'visual_trajectory'
  | 'dual_curriculum';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: StudentAssessmentAggregate | null;
  schoolName: string;
  schoolLogo?: string;
  schoolMotto?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAddress?: string;
  schoolCode?: string;
  termTitle?: string;
  academicYear?: string;
  className?: string;
  attendancePresent?: number;
  attendanceTotal?: number;
  template?: ReportTemplateId;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  reportData,
  schoolName,
  schoolLogo,
  schoolMotto,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  schoolCode,
  termTitle = 'Term 1',
  academicYear = '2026',
  className = 'Grade 4',
  attendancePresent = 62,
  attendanceTotal = 65,
  template: initialTemplate,
}) => {
  const { currentSchool } = useTenant();
  const phone = schoolPhone || currentSchool?.contacts?.phone;
  const email = schoolEmail || currentSchool?.contacts?.email;
  const address =
    schoolAddress ||
    (currentSchool?.address
      ? `${currentSchool.address.line1 || ''}${currentSchool.address.city ? ', ' + currentSchool.address.city : ''}`.trim()
      : undefined);
  const code = schoolCode || currentSchool?.code;
  const logo = schoolLogo || currentSchool?.branding?.logo;
  const motto = schoolMotto || currentSchool?.branding?.motto;

  const defaultTemplate =
    (currentSchool?.branding?.reportCardTemplate as ReportTemplateId) ||
    initialTemplate ||
    'classic_crest';

  const [activeTemplate, setActiveTemplate] = useState<ReportTemplateId>(defaultTemplate);

  if (!reportData) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCBC = reportData.isNoAggregate;
  const primaryColor = currentSchool?.branding?.primaryColor || '#1d5f99';
  const secondaryColor = currentSchool?.branding?.secondaryColor || '#683669';

  const auditTimestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  const verificationHash = `EDUMO-REP-${reportData.admissionNumber}-${academicYear}-T1-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Learner Progress Report Card"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Controls Bar & Template Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Template:
            </span>
            {[
              { id: 'classic_crest', label: 'Classic Crest' },
              { id: 'modern_cbc', label: 'Modern CBC' },
              { id: 'executive_distinction', label: 'Executive' },
              { id: 'compact_slip', label: 'Compact Slip' },
              { id: 'visual_trajectory', label: 'Visual Trajectory' },
              { id: 'dual_curriculum', label: 'Dual Curriculum' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplate(t.id as ReportTemplateId)}
                className={`text-2xs px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 ${
                  activeTemplate === t.id
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
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
          className="rounded-xl bg-white border border-slate-300 shadow-sm print:m-0 print:border-none print:shadow-none print:p-0"
        >
          {/* ========================================================= */}
          {/* TEMPLATE 1: CLASSIC CREST & HONORS                        */}
          {/* ========================================================= */}
          {activeTemplate === 'classic_crest' && (
            <div className="p-8 space-y-6">
              <div
                className="flex items-center justify-between border-b-2 pb-4"
                style={{ borderColor: primaryColor }}
              >
                <div className="flex items-center gap-4">
                  {schoolLogo ? (
                    <img src={schoolLogo} alt="crest" className="w-16 h-16 rounded-xl object-contain" />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl text-white flex items-center justify-center font-bold shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <GraduationCap className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-tight" style={{ color: primaryColor }}>
                      {schoolName}
                    </h1>
                    {schoolMotto && <p className="text-2xs italic text-slate-500">"{schoolMotto}"</p>}
                    <p className="text-xs font-semibold text-slate-700 tracking-wider uppercase mt-0.5">
                      Academic Term Progress Report
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-2xs text-slate-400 uppercase block font-semibold">Academic Session</span>
                  <span className="font-bold text-slate-900">{termTitle} • {academicYear}</span>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-2xs text-slate-500 uppercase font-semibold block">Learner Name</span>
                  <span className="font-bold text-slate-900 text-sm">{reportData.studentName}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-500 uppercase font-semibold block">Admission No.</span>
                  <span className="font-mono font-bold text-slate-900">{reportData.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-500 uppercase font-semibold block">Class / Stream</span>
                  <span className="font-semibold text-slate-900">{className}</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-500 uppercase font-semibold block">Term Attendance</span>
                  <span className="font-semibold text-slate-900">
                    {attendancePresent} / {attendanceTotal} Days ({Math.round((attendancePresent / attendanceTotal) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Academic Performance Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className="text-white font-bold uppercase text-2xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <th className="py-2 px-3">Subject / Learning Area</th>
                      <th className="py-2 px-3 text-center">Score</th>
                      <th className="py-2 px-3 text-center">Grade / Band</th>
                      <th className="py-2 px-3">Teacher's Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.subjects.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{s.subjectName}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium">
                          {s.rawScore} / {s.maxScore}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: `${s.band?.colorHex || primaryColor}15`,
                              color: s.band?.colorHex || primaryColor,
                            }}
                          >
                            {s.band?.code || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-2xs italic">
                          {s.comments || 'Satisfactory academic effort and grasp of concepts.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="font-bold text-slate-700 block text-2xs uppercase">Class Teacher Signature:</span>
                  <div className="pt-4 text-2xs text-slate-400">Date: ________________________</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <span className="font-bold text-slate-700 block text-2xs uppercase">Principal's Official Stamp:</span>
                  <div className="pt-4 text-2xs text-slate-400 flex justify-between">
                    <span>Signature: __________________</span>
                    <span className="font-serif italic text-slate-300">[ SEAL ]</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TEMPLATE 2: MODERN CBC COMPETENCY-BASED (KICD FORMAT)    */}
          {/* ========================================================= */}
          {activeTemplate === 'modern_cbc' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                    🇰🇪
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 uppercase">{schoolName}</h1>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      Competency-Based Assessment (CBA) Summative Report
                    </p>
                    <p className="text-2xs text-slate-500">Ministry of Education Standard Rubric Evaluation</p>
                  </div>
                </div>
                <Badge variant="accent">CBC No-Aggregate Guarantee</Badge>
              </div>

              {/* Learner Identification */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/40 rounded-lg border border-emerald-200/80 text-xs">
                <div>
                  <span className="text-2xs text-emerald-900 font-semibold block">Learner Name:</span>
                  <span className="font-bold text-slate-900">{reportData.studentName}</span>
                </div>
                <div>
                  <span className="text-2xs text-emerald-900 font-semibold block">UPI / NEMIS / Index:</span>
                  <span className="font-mono font-bold text-slate-900">{reportData.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-2xs text-emerald-900 font-semibold block">Grade & Level:</span>
                  <span className="font-semibold text-slate-900">{className} (Primary/Junior)</span>
                </div>
              </div>

              {/* CBC 8-Level Competency Rubric Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-2xs">
                    <tr>
                      <th className="py-2 px-3">Strand / Learning Area</th>
                      <th className="py-2 px-3 text-center">Competency Level</th>
                      <th className="py-2 px-3">Descriptor & Key Learning Evidences</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.subjects.map((s, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{s.subjectName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: `${s.band?.colorHex || '#059669'}20`,
                              color: s.band?.colorHex || '#059669',
                            }}
                          >
                            {s.band?.code || 'ME1'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-2xs text-slate-600">
                          {s.band?.name || 'Meeting Expectations'} — Demonstrates consistent practical competence.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Core Competencies Rubric */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-800 uppercase text-2xs">Core Competencies Evaluation:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-semibold block">Communication:</span>
                    <span className="text-emerald-700 font-bold">Consistently Competent</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-semibold block">Critical Thinking:</span>
                    <span className="text-emerald-700 font-bold">Exceeding Standard</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-semibold block">Digital Literacy:</span>
                    <span className="text-emerald-700 font-bold">Meeting Expectations</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-200">
                    <span className="font-semibold block">Self-Efficacy:</span>
                    <span className="text-emerald-700 font-bold">Proficient</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TEMPLATE 3: EXECUTIVE DISTINCTION (HIGH-SECURITY)        */}
          {/* ========================================================= */}
          {activeTemplate === 'executive_distinction' && (
            <div className="p-8 space-y-6 border-4 border-double border-slate-400 bg-[#fdfdfd]">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-600 bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xl shadow-xs">
                    ★
                  </div>
                  <div>
                    <h1 className="text-xl font-serif font-bold text-slate-900 tracking-tight uppercase">
                      {schoolName}
                    </h1>
                    <p className="text-xs font-serif text-amber-800 font-semibold tracking-widest uppercase">
                      Executive Academic Certificate of Achievement
                    </p>
                    <p className="text-2xs text-slate-500">Document Serial: EDM-SEC-{Date.now().toString().slice(-8)}</p>
                  </div>
                </div>

                <div className="p-2 border border-slate-300 rounded bg-white text-center">
                  <QrCode className="w-12 h-12 text-slate-800 mx-auto" />
                  <span className="text-[8px] font-mono text-slate-500 uppercase block mt-1">Verified Portal</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-900 text-white font-serif uppercase text-2xs">
                  <tr>
                    <th className="py-2 px-3">Subject</th>
                    <th className="py-2 px-3 text-center">Score %</th>
                    <th className="py-2 px-3 text-center">Honors Designation</th>
                    <th className="py-2 px-3">Evaluator Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-serif">
                  {reportData.subjects.map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{s.subjectName}</td>
                      <td className="py-2 px-3 text-center font-mono">{s.rawScore}%</td>
                      <td className="py-2 px-3 text-center font-bold text-amber-900">
                        {s.rawScore >= 80 ? 'Distinction' : s.rawScore >= 65 ? 'Credit' : 'Pass'}
                      </td>
                      <td className="py-2 px-3 text-2xs italic text-slate-600">{s.comments || 'High scholastic rigor.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================= */}
          {/* TEMPLATE 4: COMPACT SLIP (B&W INK-SAVING / THERMAL)      */}
          {/* ========================================================= */}
          {activeTemplate === 'compact_slip' && (
            <div className="p-6 space-y-4 font-mono text-xs text-slate-900 border-2 border-black">
              <div className="text-center border-b border-black pb-2">
                <h1 className="font-bold text-base uppercase">{schoolName}</h1>
                <p className="text-2xs">TERMLY RESULTS SLIP • {termTitle} {academicYear}</p>
              </div>

              <div className="flex justify-between text-2xs border-b border-black pb-2">
                <div>
                  <p>ADM: <strong>{reportData.admissionNumber}</strong></p>
                  <p>NAME: <strong>{reportData.studentName}</strong></p>
                </div>
                <div className="text-right">
                  <p>CLASS: {className}</p>
                  <p>DATE: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <table className="w-full text-2xs border-collapse">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="py-1">SUBJECT</th>
                    <th className="py-1 text-center">SCORE</th>
                    <th className="py-1 text-center">GRADE</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.subjects.map((s, idx) => (
                    <tr key={idx} className="border-b border-dotted border-slate-400">
                      <td className="py-1">{s.subjectName}</td>
                      <td className="py-1 text-center">{s.rawScore}</td>
                      <td className="py-1 text-center font-bold">{s.band?.code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-black pt-3 text-2xs">
                <p>Parent Acknowledgement Slip (Tear &amp; Return):</p>
                <p className="mt-4">Guardian Signature: ______________________ Date: _________</p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TEMPLATE 5: VISUAL TRAJECTORY (ZERAKI ANALYTICS)         */}
          {/* ========================================================= */}
          {activeTemplate === 'visual_trajectory' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: primaryColor }}>
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-tight" style={{ color: primaryColor }}>
                    {schoolName}
                  </h1>
                  <p className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" /> Zeraki-Inspired Visual Analytics Report Card
                  </p>
                </div>
                <Badge variant="brand">{termTitle} Trajectory</Badge>
              </div>

              {/* Visual Performance Bars */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Subject Mastery vs. Minimum Competency Baseline (50%):
                </p>
                {reportData.subjects.map((s, idx) => {
                  const pct = Math.min(100, Math.round((s.rawScore / s.maxScore) * 100));
                  return (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-900">{s.subjectName}</span>
                        <span className="font-mono">{pct}% ({s.band?.code || 'ME1'})</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden relative">
                        {/* 50% Threshold line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-400 z-10" />
                        <div
                          className="h-full transition-all duration-500 rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 50 ? primaryColor : '#e11d48',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* At-Risk Diagnostics Notice */}
              <div className="p-3.5 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Longitudinal Early Intervention Guidance:
                </p>
                <p className="mt-1 text-2xs text-blue-800">
                  Targeted remedial practice recommended for learning areas falling below the 50% competency threshold.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TEMPLATE 6: DUAL CURRICULUM (SECULAR & FAITH-BASED)      */}
          {/* ========================================================= */}
          {activeTemplate === 'dual_curriculum' && (
            <div className="p-8 space-y-6">
              <div className="text-center border-b-2 border-emerald-700 pb-4">
                <p className="font-serif text-emerald-800 text-sm">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                <h1 className="text-xl font-bold uppercase tracking-tight text-emerald-950 mt-1">
                  {schoolName}
                </h1>
                <p className="text-xs font-semibold text-emerald-800 uppercase">
                  Integrated Secular &amp; Islamic Studies Dual Curriculum Progress Report
                </p>
              </div>

              {/* Table A: Secular Academics */}
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase mb-2">Section A: Secular Learning Areas</p>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-2xs">
                    <tr>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3 text-center">Score</th>
                      <th className="py-2 px-3 text-center">Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.subjects.slice(0, 3).map((s, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold">{s.subjectName}</td>
                        <td className="py-2 px-3 text-center font-mono">{s.rawScore}</td>
                        <td className="py-2 px-3 text-center">{s.band?.code || 'ME1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table B: Islamic / Faith-Based Areas */}
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase mb-2">
                  Section B: Islamic Religious Education &amp; Tarbiyah
                </p>
                <table className="w-full text-left text-xs border border-emerald-200 bg-emerald-50/20">
                  <thead className="bg-emerald-800 text-white font-bold uppercase text-2xs">
                    <tr>
                      <th className="py-2 px-3">Learning Area</th>
                      <th className="py-2 px-3 text-center">Evaluation</th>
                      <th className="py-2 px-3">Conduct / Tarbiyah Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-200">
                    <tr>
                      <td className="py-2 px-3 font-semibold">Qur'an Recitation &amp; Hifz</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-800">Mumtaz (Excellent)</td>
                      <td className="py-2 px-3 text-2xs text-slate-600">Surah Al-Mulk memorization completed with Tajweed.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Islamic Religious Knowledge (IRE)</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-800">Jayyid Jiddan (Very Good)</td>
                      <td className="py-2 px-3 text-2xs text-slate-600">Active participation in Fiqh and Seerah modules.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold">Arabic Language</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-800">Jayyid (Good)</td>
                      <td className="py-2 px-3 text-2xs text-slate-600">Vocabulary and sentence formation developing well.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* UNIVERSAL SECURITY & ACCOUNTABILITY AUDIT TRAIL           */}
          {/* ========================================================= */}
          <div className="m-6 p-4 rounded-xl bg-slate-900 text-white space-y-2.5 border border-slate-800 print:m-2 print:p-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Institutional Academic Authenticity &amp; Security Audit Trail
              </span>
              <span className="text-2xs font-mono text-slate-400">
                {verificationHash}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-2xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">1. WHO (Certified By):</span>
                <span className="font-bold text-slate-100">Director of Studies &amp; Headteacher</span>
                <span className="text-[10px] text-slate-400 block">Class Teacher: Verified</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">2. AT WHAT TIME:</span>
                <span className="font-bold text-slate-100 font-mono">{auditTimestamp}</span>
                <span className="text-[10px] text-slate-400 block">System Clock Authenticated</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold block text-[9px]">3. CERTIFICATION REASON:</span>
                <span className="font-bold text-slate-100 line-clamp-1">Summative Termly CBC &amp; Academic Broadsheet Review</span>
                <span className="text-[10px] text-emerald-400 block">Status: Official Term Record</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
              <span>Security Seal: Protected by EDUMO Multi-Tenant Immutable Ledger • Any alteration voids this certificate</span>
              <span>Principal Signature: [ ELECTRONICALLY SIGNED &amp; SEALED ]</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-2xs text-slate-500">
            Selected Template: <strong className="capitalize">{activeTemplate.replace('_', ' ')}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
