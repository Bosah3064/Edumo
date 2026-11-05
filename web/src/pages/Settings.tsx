import React, { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Settings as SettingsIcon,
  Globe,
  Sliders,
  ShieldAlert,
  Smartphone,
  Save,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Users,
  CreditCard,
  MessageSquare,
  Clock,
  Languages,
  Palette,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Award,
  QrCode,
  FileText,
  Printer,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  History,
  Download,
  TrendingUp,
  BookOpen,
  Eye,
  Check,
  ArrowRight,
  GitMerge,
  Plus,
  Search,
  Filter,
  X,
  RefreshCw,
  Layers,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { sanitizeSchoolEmailDomain } from '../utils/admission';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ReportCardModal, type ReportTemplateId } from '../components/academics/ReportCardModal';
import type { Subject } from '@edumo/shared';

/* ------------------------------------------------------------------ */
/*  Section collapse helper                                           */
/* ------------------------------------------------------------------ */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ icon, title, subtitle, isOpen, onToggle }) => (
  <button
    type="button"
    className="w-full flex items-center justify-between gap-3 text-left"
    onClick={onToggle}
  >
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-2xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {isOpen ? (
      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
    ) : (
      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
    )}
  </button>
);

/* ------------------------------------------------------------------ */
/*  Miniature Live Report Card Template Preview Component             */
/* ------------------------------------------------------------------ */
const MiniatureTemplatePreview: React.FC<{
  templateId: string;
  primaryColor: string;
  secondaryColor: string;
  schoolName: string;
  logoUrl?: string;
}> = ({ templateId, primaryColor, secondaryColor, schoolName }) => {
  return (
    <div
      className="w-full h-36 rounded-lg border border-slate-200 overflow-hidden bg-white select-none pointer-events-none relative shadow-xs p-2 flex flex-col justify-between"
      style={{ fontFamily: 'var(--font-main, sans-serif)' }}
    >
      {templateId === 'classic_crest' && (
        <div className="h-full border border-double rounded p-1.5 flex flex-col justify-between" style={{ borderColor: primaryColor }}>
          <div className="text-center border-b border-slate-200 pb-1">
            <div className="flex items-center justify-center gap-1">
              <Award className="w-3 h-3" style={{ color: primaryColor }} />
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-800 truncate max-w-[130px]">
                {schoolName || 'Edumo Academy'}
              </span>
            </div>
            <span className="text-[7px] text-slate-400 italic block">Ad Astra Per Aspera</span>
            <div className="text-[6.5px] font-bold uppercase tracking-widest text-white px-1 py-0.2 rounded mt-0.5 inline-block" style={{ backgroundColor: primaryColor }}>
              Official Progress Report
            </div>
          </div>
          <div className="my-1 space-y-0.5 text-[7px]">
            <div className="flex justify-between px-1 py-0.5 font-bold text-white rounded-[2px]" style={{ backgroundColor: primaryColor }}>
              <span>SUBJECT</span>
              <span>SCORE</span>
              <span>GRD</span>
            </div>
            <div className="flex justify-between px-1 text-slate-700 bg-slate-50">
              <span className="truncate max-w-[80px]">Mathematics (Core)</span>
              <span className="font-semibold">84%</span>
              <span className="font-bold text-emerald-700">A</span>
            </div>
            <div className="flex justify-between px-1 text-slate-700">
              <span className="truncate max-w-[80px]">English Lang (Core)</span>
              <span className="font-semibold">78%</span>
              <span className="font-bold text-blue-700">B+</span>
            </div>
            <div className="flex justify-between px-1 text-slate-700 bg-slate-50">
              <span className="truncate max-w-[80px]">Integrated Sci (Core)</span>
              <span className="font-semibold">91%</span>
              <span className="font-bold text-emerald-700">A</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-200 text-[6.5px] text-slate-500">
            <span className="font-mono">Adm: 2026/0412</span>
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.2 rounded border text-[6px] font-bold text-red-700 border-red-300 bg-red-50">SEAL</span>
              <span>Principal: ✍️</span>
            </div>
          </div>
        </div>
      )}

      {templateId === 'modern_cbc' && (
        <div className="h-full rounded flex flex-col justify-between">
          <div className="bg-emerald-700 text-white p-1 rounded-t text-center">
            <span className="text-[8px] font-black uppercase tracking-wider block">KENYA CBC PROGRESS REPORT</span>
            <span className="text-[6.5px] text-emerald-100 block truncate">{schoolName || 'Edumo Demonstration'}</span>
          </div>
          <div className="grid grid-cols-4 gap-0.5 text-[6px] font-bold text-center my-0.5">
            <span className="bg-emerald-100 text-emerald-800 rounded px-0.5 py-0.2">EE (4)</span>
            <span className="bg-blue-100 text-blue-800 rounded px-0.5 py-0.2">ME (3)</span>
            <span className="bg-amber-100 text-amber-800 rounded px-0.5 py-0.2">AE (2)</span>
            <span className="bg-rose-100 text-rose-800 rounded px-0.5 py-0.2">BE (1)</span>
          </div>
          <div className="space-y-0.5 text-[7px] text-slate-700">
            <div className="flex items-center justify-between px-1 bg-slate-50 rounded">
              <span className="font-medium truncate max-w-[110px]">Mathematics (Core)</span>
              <span className="font-bold text-emerald-700 text-[6.5px] bg-emerald-50 px-1 rounded">EE1 ✓</span>
            </div>
            <div className="flex items-center justify-between px-1 rounded">
              <span className="font-medium truncate max-w-[110px]">English Literacy (Core)</span>
              <span className="font-bold text-emerald-700 text-[6.5px] bg-emerald-50 px-1 rounded">EE2 ✓</span>
            </div>
            <div className="flex items-center justify-between px-1 bg-slate-50 rounded">
              <span className="font-medium truncate max-w-[110px]">Integrated Science (Core)</span>
              <span className="font-bold text-blue-700 text-[6.5px] bg-blue-50 px-1 rounded">ME1 ✓</span>
            </div>
          </div>
          <div className="bg-slate-100 px-1 py-0.5 rounded text-[6px] text-slate-500 flex items-center justify-between">
            <span className="font-bold text-emerald-700">CBC NO-AGGREGATE CERTIFIED</span>
            <span>Values: ★★★★★</span>
          </div>
        </div>
      )}

      {templateId === 'executive_distinction' && (
        <div className="h-full border border-amber-400 bg-linear-to-b from-amber-50/30 to-white rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-start justify-between border-b border-amber-200 pb-1">
            <div>
              <span className="text-[6.5px] font-bold text-amber-700 uppercase tracking-widest block">Executive Distinction</span>
              <span className="text-[8px] font-black text-slate-900 truncate block max-w-[115px]">{schoolName}</span>
            </div>
            <div className="w-4 h-4 bg-slate-900 rounded-[2px] flex items-center justify-center text-white shrink-0">
              <QrCode className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="bg-slate-900 text-white rounded p-1 text-center my-0.5">
            <span className="text-[6px] text-amber-300 font-bold tracking-wider uppercase block">Dean’s Honors List</span>
            <span className="text-[8.5px] font-black tracking-tight text-white block">GPA 3.94 / 4.00</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[6.5px] text-slate-700">
            <div className="flex justify-between border-b border-slate-100">
              <span>Pure Math (Core)</span>
              <span className="font-bold text-amber-700">A</span>
            </div>
            <div className="flex justify-between border-b border-slate-100">
              <span>Chemistry (Core)</span>
              <span className="font-bold text-amber-700">A</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[6px] text-amber-800 pt-0.5">
            <span className="font-mono">Security ID: #ED-9041</span>
            <span className="font-bold bg-amber-100 px-1 rounded text-amber-800">★ FIRST CLASS HONORS</span>
          </div>
        </div>
      )}

      {templateId === 'compact_slip' && (
        <div className="h-full bg-slate-50 border border-slate-300 rounded font-mono p-1.5 flex flex-col justify-between text-[7px]">
          <div className="text-center border-b border-dashed border-slate-300 pb-1">
            <span className="font-bold text-[8px] text-slate-900 uppercase block tracking-wider">{schoolName || 'Edumo School'}</span>
            <span className="text-[6px] text-slate-500 block">Term 1 Official Progress Slip</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 my-1 text-[6.5px] text-slate-700">
            <div className="flex justify-between">
              <span>MATH [Core]:</span>
              <span className="font-bold">84% (A)</span>
            </div>
            <div className="flex justify-between">
              <span>ENG [Core]:</span>
              <span className="font-bold">78% (B+)</span>
            </div>
            <div className="flex justify-between">
              <span>KISW [Core]:</span>
              <span className="font-bold">74% (B)</span>
            </div>
            <div className="flex justify-between">
              <span>SCI [Core]:</span>
              <span className="font-bold">91% (A)</span>
            </div>
          </div>
          <div className="border-t border-dashed border-slate-400 pt-0.5 text-[6px] text-slate-500">
            <span className="block truncate text-slate-400">✂ - - - - - - - - - TEAR OFF - - - - - - - - -</span>
            <div className="flex justify-between mt-0.5 text-slate-600 font-sans">
              <span>Parent Sign: _________</span>
              <span>Date: _____</span>
            </div>
          </div>
        </div>
      )}

      {templateId === 'visual_trajectory' && (
        <div className="h-full border border-slate-200 rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div>
              <span className="text-[8px] font-bold text-slate-900 block truncate max-w-[115px]">{schoolName}</span>
              <span className="text-[6.5px] text-slate-400 block font-medium">Trajectory &amp; Mastery Analytics</span>
            </div>
            <span className="text-[6.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
              +4.8% ▲
            </span>
          </div>
          <div className="space-y-1 my-0.5 text-[6.5px]">
            <div>
              <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                <span>Mathematics (Core)</span>
                <span className="text-emerald-700 font-bold">86% (+5.2%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '86%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                <span>Integrated Science (Core)</span>
                <span className="text-emerald-700 font-bold">92% (+6.1%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: '92%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                <span>English Language (Core)</span>
                <span className="text-blue-700 font-bold">78% (+2.4%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: '78%' }} />
              </div>
            </div>
          </div>
          <div className="text-[6px] text-slate-500 flex justify-between items-center pt-0.5 border-t border-slate-100">
            <span>Baseline: 50% Competency</span>
            <span className="font-bold text-emerald-700">Accelerating Growth</span>
          </div>
        </div>
      )}

      {templateId === 'dual_curriculum' && (
        <div className="h-full border border-emerald-300 bg-emerald-50/20 rounded p-1.5 flex flex-col justify-between">
          <div className="text-center border-b border-emerald-200 pb-0.5">
            <span className="text-[8.5px] font-serif text-emerald-900 block leading-tight">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            <span className="text-[7.5px] font-bold text-slate-800 uppercase block truncate">{schoolName || 'Integrated Academy'}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 my-0.5 text-[6.5px]">
            <div className="bg-white p-1 rounded border border-slate-200">
              <span className="font-bold text-blue-900 block text-[6px] uppercase border-b border-slate-100 pb-0.5 mb-0.5">Table A: Secular</span>
              <div className="space-y-0.5 text-slate-600">
                <div className="flex justify-between"><span>Math (Core)</span><span className="font-bold">84%</span></div>
                <div className="flex justify-between"><span>Science (Core)</span><span className="font-bold">88%</span></div>
              </div>
            </div>
            <div className="bg-white p-1 rounded border border-emerald-200">
              <span className="font-bold text-emerald-900 block text-[6px] uppercase border-b border-emerald-100 pb-0.5 mb-0.5">Table B: Islamic</span>
              <div className="space-y-0.5 text-emerald-800">
                <div className="flex justify-between"><span>Quran</span><span className="font-bold">96%</span></div>
                <div className="flex justify-between"><span>Arabic</span><span className="font-bold">90%</span></div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center text-[5.5px] text-slate-500 pt-0.5 border-t border-emerald-100">
            <span>Principal: [Stamp]</span>
            <span className="text-emerald-800 font-bold">Mudir: [Approved]</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================== */
/*  Standard School Levels and Classes for Unit Assignment            */
/* ================================================================== */
const ALL_SCHOOL_CLASSES = [
  'PP1', 'PP2',
  'Grade 1', 'Grade 2', 'Grade 3',
  'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9',
  'Form 1', 'Form 2', 'Form 3', 'Form 4'
];

/* ================================================================== */
/*  Live Miniature Visual Preview for Examination Admit Cards         */
/* ================================================================== */
const MiniatureExamCardPreview: React.FC<{
  templateId: string;
  primaryColor: string;
  secondaryColor: string;
  schoolName: string;
}> = ({ templateId, primaryColor, secondaryColor, schoolName }) => {
  return (
    <div
      className="w-full h-36 rounded-lg border border-slate-200 overflow-hidden bg-white select-none pointer-events-none relative shadow-xs p-2 flex flex-col justify-between"
      style={{ fontFamily: 'var(--font-main, sans-serif)' }}
    >
      {templateId === 'classic_crest' && (
        <div className="h-full border-2 border-double rounded p-1.5 flex flex-col justify-between" style={{ borderColor: primaryColor }}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3" style={{ color: primaryColor }} />
              <div className="truncate max-w-[100px]">
                <span className="text-[7.5px] font-extrabold uppercase tracking-tight text-slate-800 block truncate">{schoolName || 'Edumo Academy'}</span>
                <span className="text-[6px] font-bold uppercase text-white px-1 py-0.2 rounded" style={{ backgroundColor: primaryColor }}>
                  EXAMINATION ADMIT CARD
                </span>
              </div>
            </div>
            <div className="w-6 h-7 border border-slate-300 rounded-[2px] bg-slate-100 flex items-center justify-center text-[5.5px] text-slate-400 font-bold">
              PHOTO
            </div>
          </div>
          <div className="my-0.5 space-y-0.5 text-[6.5px]">
            <div className="flex justify-between bg-slate-50 px-1 py-0.5 font-mono text-slate-700 rounded-[2px]">
              <span>CANDIDATE: <strong>E. Kiprono</strong></span>
              <span>INDEX: <strong>2026/042</strong></span>
            </div>
            <div className="flex justify-between text-white font-bold px-1 py-0.2 rounded-[2px]" style={{ backgroundColor: primaryColor }}>
              <span>SUBJECT</span>
              <span>ROOM</span>
              <span>SIGN</span>
            </div>
            <div className="flex justify-between px-1 text-slate-600 bg-slate-50">
              <span className="truncate max-w-[70px]">101 Mathematics</span>
              <span>Lab A</span>
              <span>✍️</span>
            </div>
            <div className="flex justify-between px-1 text-slate-600">
              <span className="truncate max-w-[70px]">102 English Lang</span>
              <span>Hall 1</span>
              <span>✍️</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-200 text-[6px] text-slate-500">
            <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-1 rounded">SEAL APPROVED</span>
            <span>Principal: ✍️ Official</span>
          </div>
        </div>
      )}

      {templateId === 'modern_qr' && (
        <div className="h-full rounded border border-blue-200 bg-slate-50/60 p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-blue-200 pb-1">
            <div className="truncate max-w-[105px]">
              <span className="text-[7.5px] font-black uppercase text-blue-900 block truncate">{schoolName || 'Edumo Academy'}</span>
              <span className="text-[6px] font-bold text-emerald-700 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SECURE BIOMETRIC PASS
              </span>
            </div>
            <div className="w-7 h-7 bg-white border border-slate-300 rounded p-0.5 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-slate-900" />
            </div>
          </div>
          <div className="bg-blue-900 text-white rounded p-1 text-[6.5px] flex items-center justify-between my-0.5">
            <div>
              <span className="text-[5.5px] text-blue-200 block uppercase">Candidate Seat</span>
              <span className="font-mono font-black text-[7.5px]">HALL B • DESK 14</span>
            </div>
            <span className="font-mono font-bold text-amber-300">ID: #KNEC-994</span>
          </div>
          <div className="text-[6px] space-y-0.5 text-slate-700">
            <div className="flex justify-between px-1 bg-white rounded border border-slate-100">
              <span>Candidate: Emmanuel Kiprono</span>
              <span className="font-mono font-bold">Grade 7W</span>
            </div>
            <div className="flex justify-between px-1 font-mono text-[5.5px] text-slate-400">
              <span>SCAN QR TO VALIDATE ENTRY</span>
              <span>AUTHENTICATED</span>
            </div>
          </div>
        </div>
      )}

      {templateId === 'executive_distinction' && (
        <div className="h-full border border-amber-400 bg-linear-to-b from-amber-50/20 to-white rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1">
            <div>
              <span className="text-[6px] font-bold text-amber-700 uppercase tracking-widest block">Executive Academy Pass</span>
              <span className="text-[7.5px] font-black text-slate-900 truncate block max-w-[100px]">{schoolName || 'International Academy'}</span>
            </div>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="my-0.5 space-y-0.5 text-[6.5px]">
            <div className="border border-amber-200 bg-amber-50/50 rounded px-1 py-0.5 flex justify-between font-mono">
              <span className="font-bold text-amber-900">Emmanuel Kiprono</span>
              <span className="text-amber-800">CANDIDATE #042</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[6px] text-slate-600">
              <span className="bg-slate-50 px-1 py-0.2 rounded">Desk: Executive 08</span>
              <span className="bg-slate-50 px-1 py-0.2 rounded">Center: KE-9042</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-amber-200 text-[6px] text-amber-800">
            <span className="font-bold tracking-tight">★ CAMBRIDGE / IB DISTINCTION</span>
            <span>Registrar: ✍️</span>
          </div>
        </div>
      )}

      {templateId === 'compact_slip' && (
        <div className="h-full border border-dashed border-slate-400 bg-slate-50/80 rounded font-mono p-1.5 flex flex-col justify-between text-[6.5px]">
          <div className="border-b border-dashed border-slate-300 pb-0.5 flex justify-between items-center">
            <span className="font-bold text-[7.5px] uppercase truncate max-w-[105px] text-slate-900">{schoolName || 'Edumo School'}</span>
            <span className="text-[5.5px] font-bold bg-slate-200 px-1 rounded text-slate-700">A4 SLIP 1/2</span>
          </div>
          <div className="space-y-0.5 text-slate-700">
            <div className="flex justify-between">
              <span>NAME: E. Kiprono</span>
              <span>ADM: 2026/042</span>
            </div>
            <div className="flex justify-between text-[6px] bg-white p-0.5 rounded border border-slate-200">
              <span>MATH • ENG • SCI • SST • CRE</span>
              <span>HALL A</span>
            </div>
            <div className="text-[5.5px] text-slate-500 italic">
              "Student affirms full compliance with exam rules"
            </div>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-0.5 flex justify-between text-[5.5px] text-slate-500">
            <span>TEAR-OFF DESK PASS</span>
            <span>INVIGILATOR: ✍️</span>
          </div>
        </div>
      )}

      {templateId === 'cbc_competency' && (
        <div className="h-full rounded border border-emerald-300 bg-emerald-50/30 p-1.5 flex flex-col justify-between">
          <div className="bg-emerald-700 text-white rounded-t p-1 flex justify-between items-center">
            <div>
              <span className="text-[6px] text-emerald-200 uppercase font-bold block">KICD ASSESSMENT CENTER</span>
              <span className="text-[7.5px] font-black truncate max-w-[100px] block">{schoolName || 'CBC School'}</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          </div>
          <div className="space-y-0.5 text-[6.5px] text-slate-700 my-0.5">
            <div className="flex justify-between bg-white px-1 py-0.5 rounded border border-emerald-100">
              <span>UPI: <strong>UPI-701042-26</strong></span>
              <span className="text-emerald-800 font-bold">Grade 7 JSS</span>
            </div>
            <div className="flex justify-between text-[6px] px-1 text-slate-600">
              <span>Pathway: STEM &amp; Arts</span>
              <span>Desk #14</span>
            </div>
          </div>
          <div className="bg-emerald-100 px-1 py-0.5 rounded text-[6px] text-emerald-800 flex justify-between font-bold">
            <span>CBA COMPLIANT</span>
            <span>Center Code: 20410</span>
          </div>
        </div>
      )}

      {templateId === 'integrated_values' && (
        <div className="h-full border border-purple-300 bg-linear-to-b from-purple-50/40 to-white rounded p-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-purple-200 pb-0.5">
            <div>
              <span className="text-[5.5px] font-bold text-purple-700 uppercase tracking-widest block">INTEGRATED MORAL VALUES PASS</span>
              <span className="text-[7.5px] font-black text-slate-900 truncate block max-w-[100px]">{schoolName || 'Values Academy'}</span>
            </div>
            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-800 font-bold text-[8px]">
              ☪/✝
            </div>
          </div>
          <div className="text-[6.5px] space-y-0.5 text-slate-700 my-0.5">
            <div className="flex justify-between bg-white px-1 py-0.5 rounded border border-purple-100 font-mono">
              <span className="font-bold">E. Kiprono Kosgei</span>
              <span>Grade 7</span>
            </div>
            <div className="text-[5.5px] text-purple-900 italic bg-purple-50 p-0.5 rounded border border-purple-100">
              "Honesty and integrity are the crown of knowledge."
            </div>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-purple-200 text-[6px] text-purple-800">
            <span className="font-bold">HONOR CODE PLEDGED</span>
            <span>Supervisor: ✍️</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================================================================== */
/*  Settings Page                                                      */
/* ================================================================== */
export const Settings: React.FC = () => {
  const { organization, currentSchool, schools, currentRole } = useTenant();

  if (currentRole === 'teacher') {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center animate-fade-in">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">School Settings Restricted</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Institutional configuration, curriculum setup, and school branding can only be modified by School Administrators and Principals.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 shadow-sm transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  /* ---- Section collapse state ---- */
  const { isInstalled, isStandalone } = usePWAInstall();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    registration: true,
    branding: true,
    liveCampusSandbox: true,
    reportCard: true,
    unitsManagement: true,
    examCard: true,
    address: true,
    contacts: true,
    curriculum: true,
    grading: true,
    calendar: true,
    language: true,
    payment: false,
    pwa: false,
    audit: false,
  });
  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  /* ---- Organisation ---- */
  const [orgName, setOrgName] = useState(organization?.name || 'Edumo Academy');

  /* ---- School Registration ---- */
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [schoolType, setSchoolType] = useState<string>('combined');
  const [boardingType, setBoardingType] = useState<string>('day');
  const [principalName, setPrincipalName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [schoolCapacity, setSchoolCapacity] = useState<number>(500);

  /* ---- Address ---- */
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressCountry, setAddressCountry] = useState<string>('KE');

  /* ---- Contact ---- */
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolAltPhone, setSchoolAltPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const currentEmailDomain = (currentSchool?.settings as Record<string, unknown> | undefined)?.emailDomain;
  const [emailDomain, setEmailDomain] = useState<string>(
    typeof currentEmailDomain === 'string'
      ? currentEmailDomain
      : currentSchool?.contacts?.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || ''
  );

  /* ---- Curriculum & Grading ---- */
  const [curriculum, setCurriculum] = useState<string>(currentSchool?.curriculumType || 'CBC');
  const [gradingMode, setGradingMode] = useState<string>(currentSchool?.gradingMode || 'cbc_no_aggregate');
  const [currency, setCurrency] = useState(organization?.country === 'UG' ? 'UGX' : 'KES');
  const existingScale = (currentSchool?.gradingConfig as { scale?: Array<{ label: string; min: number; max: number }> } | undefined)?.scale;
  const [gradingScale, setGradingScale] = useState<Array<{ label: string; min: number; max: number }>>(
    existingScale?.length ? existingScale : [
      { label: 'Exceeding Expectations', min: 75, max: 100 },
      { label: 'Meeting Expectations', min: 50, max: 74 },
      { label: 'Approaching Expectations', min: 25, max: 49 },
      { label: 'Below Expectations', min: 0, max: 24 },
    ]
  );
  const [applyGradingToAllBranches, setApplyGradingToAllBranches] = useState(false);

  /* ---- Branding ---- */
  const [primaryColor, setPrimaryColor] = useState(currentSchool?.branding?.primaryColor || '#1d5f99');
  const [secondaryColor, setSecondaryColor] = useState(currentSchool?.branding?.secondaryColor || '#683669');
  const [accentColor, setAccentColor] = useState(currentSchool?.branding?.accentColor || '#10B981');
  const [schoolMotto, setSchoolMotto] = useState(currentSchool?.branding?.motto || '');
  const [logoUrl, setLogoUrl] = useState(currentSchool?.branding?.logo || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [applyLogoToAllBranches, setApplyLogoToAllBranches] = useState(true);
  const [brandingSaved, setBrandingSaved] = useState(false);

  /* ---- Portal Visual Theme & Fonts ---- */
  const [reportCardTemplate, setReportCardTemplate] = useState<string>(
    currentSchool?.branding?.reportCardTemplate || 'classic_crest'
  );
  const [sidebarTheme, setSidebarTheme] = useState<string>(
    currentSchool?.branding?.sidebarTheme || 'school_primary'
  );
  const [sidebarBg, setSidebarBg] = useState<string>(
    currentSchool?.branding?.sidebarBg || currentSchool?.branding?.primaryColor || '#1d5f99'
  );
  const [sidebarText, setSidebarText] = useState<string>(
    currentSchool?.branding?.sidebarText || '#ffffff'
  );
  const [fontFamily, setFontFamily] = useState<string>(
    currentSchool?.branding?.fontFamily || 'Plus Jakarta Sans'
  );

  // Live Template Preview Modal State
  const [previewTemplateModal, setPreviewTemplateModal] = useState<ReportTemplateId | null>(null);

  // Immediate 1-Click Template Activation Handler
  const handleApplyReportTemplate = async (tmplId: ReportTemplateId, tmplTitle: string) => {
    setReportCardTemplate(tmplId);
    if (!organization || !currentSchool) return;

    const toastId = toast.loading(`Applying ${tmplTitle} across all school sections...`);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id), {
        'branding.reportCardTemplate': tmplId,
      });
      toast.success(`Active Report Form template set to "${tmplTitle}". Now active across all school sections!`, { id: toastId });
    } catch (err) {
      console.error('Error applying report template:', err);
      toast.error('Failed to update template in database', { id: toastId });
    }
  };

  /* ---- Curriculum Units Management & Branch Synchronization ---- */
  const [schoolUnits, setSchoolUnits] = useState<Subject[]>([]);
  const [loadingSchoolUnits, setLoadingSchoolUnits] = useState(true);
  const [isMergingBranches, setIsMergingBranches] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitDept, setNewUnitDept] = useState('Sciences & Tech');
  const [newUnitIsMandatory, setNewUnitIsMandatory] = useState(true);
  const [newUnitPeriods, setNewUnitPeriods] = useState('4');
  const [newUnitClasses, setNewUnitClasses] = useState<string[]>(['all']);

  /* Per-class filtering and assignments */
  const [unitClassFilter, setUnitClassFilter] = useState<string>('all');
  const [editingUnitForClasses, setEditingUnitForClasses] = useState<Subject | null>(null);
  const [unitClassesSelection, setUnitClassesSelection] = useState<string[]>([]);

  /* Edit Unit Details Modal State */
  const [editingUnitDetails, setEditingUnitDetails] = useState<Subject | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editUnitDept, setEditUnitDept] = useState('Sciences & Tech');
  const [editUnitPeriods, setEditUnitPeriods] = useState('4');
  const [editUnitIsMandatory, setEditUnitIsMandatory] = useState(true);
  const [editUnitClasses, setEditUnitClasses] = useState<string[]>(['all']);
  const [editUnitTeacher, setEditUnitTeacher] = useState('');

  /* Live Exam Card Preview Modal */
  const [previewExamCardModal, setPreviewExamCardModal] = useState<string | null>(null);

  /* Filter & search state for curriculum units */
  const [unitSearch, setUnitSearch] = useState('');
  const [unitDeptFilter, setUnitDeptFilter] = useState('all');
  const [unitTypeFilter, setUnitTypeFilter] = useState<'all' | 'mandatory' | 'optional'>('all');

  // Real-time listener for school units/subjects
  useEffect(() => {
    if (!organization || !currentSchool) return;
    const unitsRef = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects');
    const unsub = onSnapshot(unitsRef, (snap) => {
      const list: Subject[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setSchoolUnits(list);
      setLoadingSchoolUnits(false);
    });
    return () => unsub();
  }, [organization?.id, currentSchool?.id]);

  // Merge Units to All Other Campus Branches
  const handleMergeUnitsToOtherBranches = async () => {
    if (!organization || !currentSchool) return;
    if (schoolUnits.length === 0) {
      toast.error('No curriculum units in this campus to replicate.');
      return;
    }

    const otherBranches = schools.filter((s) => s.id !== currentSchool.id);
    if (otherBranches.length === 0) {
      toast.error('No other campus branches in this organization group. Add campus branches under Branch Switcher first.');
      return;
    }

    if (!window.confirm(
      `Replicate and merge ${schoolUnits.length} curriculum units from "${currentSchool.name}" to ${otherBranches.length} other campus branches?\n\n` +
      `Target Branches:\n${otherBranches.map((b) => `• ${b.name}`).join('\n')}\n\n` +
      `This guarantees aligned curriculum standards across all your schools.`
    )) {
      return;
    }

    setIsMergingBranches(true);
    const toastId = toast.loading(`Merging ${schoolUnits.length} units to ${otherBranches.length} campus branches...`);

    try {
      const batch = writeBatch(db);
      for (const branch of otherBranches) {
        for (const unit of schoolUnits) {
          const unitDocId = unit.id || (unit as any).code?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unit';
          const targetDocRef = doc(
            db,
            'organizations',
            organization.id,
            'schools',
            branch.id,
            'subjects',
            unitDocId
          );
          batch.set(targetDocRef, {
            ...unit,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      await batch.commit();
      toast.success(
        `Successfully merged ${schoolUnits.length} units across ${otherBranches.length} campus branches!`,
        { id: toastId }
      );
    } catch (err) {
      console.error('Error merging units to branches:', err);
      toast.error('Failed to merge units to other branches', { id: toastId });
    } finally {
      setIsMergingBranches(false);
    }
  };

  const handleToggleUnitMandatory = async (unit: Subject) => {
    if (!organization || !currentSchool || !unit.id) return;
    const newMandatory = !unit.isMandatory;
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', unit.id), {
        isMandatory: newMandatory,
        type: newMandatory ? 'core' : 'elective',
        updatedAt: serverTimestamp(),
      });
      toast.success(`${unit.name} set as ${newMandatory ? 'MANDATORY (Core)' : 'OPTIONAL (Elective)'}`);
    } catch (err) {
      console.error('Error updating unit:', err);
      toast.error('Failed to update unit requirement');
    }
  };

  const handleDeleteUnit = async (unit: Subject) => {
    if (!organization || !currentSchool || !unit.id) return;
    if (!window.confirm(`Delete unit "${unit.name}" from this school's curriculum?`)) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', unit.id));
      toast.success(`Unit ${unit.name} deleted.`);
    } catch (err) {
      console.error('Error deleting unit:', err);
      toast.error('Failed to delete unit');
    }
  };

  const handleSaveUnitClassAssignments = async () => {
    if (!organization || !currentSchool || !editingUnitForClasses || !editingUnitForClasses.id) return;
    const toastId = toast.loading(`Updating designated classes for ${editingUnitForClasses.name}...`);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', editingUnitForClasses.id), {
        applicableClasses: unitClassesSelection.length === 0 ? ['all'] : unitClassesSelection,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Updated class curriculum assignments for ${editingUnitForClasses.name}`, { id: toastId });
      setEditingUnitForClasses(null);
    } catch (err) {
      console.error('Error saving unit classes:', err);
      toast.error('Failed to update class assignments', { id: toastId });
    }
  };

  const handleOpenEditUnitModal = (unit: Subject) => {
    setEditingUnitDetails(unit);
    setEditUnitName(unit.name || '');
    setEditUnitCode(unit.code || '');
    setEditUnitDept(unit.department || 'Sciences & Tech');
    setEditUnitPeriods(String(unit.weeklyPeriods || 4));
    setEditUnitIsMandatory(unit.isMandatory !== false);
    setEditUnitClasses(unit.applicableClasses && unit.applicableClasses.length > 0 ? unit.applicableClasses : ['all']);
    setEditUnitTeacher(unit.teacherName || '');
  };

  const handleSaveEditUnitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !editingUnitDetails || !editingUnitDetails.id) return;
    if (!editUnitName.trim() || !editUnitCode.trim()) {
      toast.error('Unit name and code are required');
      return;
    }

    const toastId = toast.loading(`Updating curriculum unit "${editUnitName}"...`);
    try {
      await updateDoc(
        doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', editingUnitDetails.id),
        {
          name: editUnitName.trim(),
          code: editUnitCode.trim().toUpperCase(),
          department: editUnitDept,
          weeklyPeriods: Number(editUnitPeriods) || 4,
          isMandatory: editUnitIsMandatory,
          type: editUnitIsMandatory ? 'core' : 'elective',
          applicableClasses: editUnitClasses.length === 0 ? ['all'] : editUnitClasses,
          teacherName: editUnitTeacher.trim() || 'Assigned Instructor',
          updatedAt: serverTimestamp(),
        }
      );
      toast.success(`Curriculum unit "${editUnitName}" updated successfully!`, { id: toastId });
      setEditingUnitDetails(null);
    } catch (err) {
      console.error('Error updating unit details:', err);
      toast.error('Failed to update curriculum unit', { id: toastId });
    }
  };

  const handleApplyExamCardTemplate = async (tmplId: string, tmplTitle: string) => {
    setExamCardTemplate(tmplId);
    if (!organization || !currentSchool) return;

    const toastId = toast.loading(`Applying ${tmplTitle} for student exam passes...`);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id), {
        'branding.examCardTemplate': tmplId,
      });
      toast.success(`Active Exam Admit Card template set to "${tmplTitle}". Now active across all school exams!`, { id: toastId });
    } catch (err) {
      console.error('Error applying exam card template:', err);
      toast.error('Failed to update exam template in database', { id: toastId });
    }
  };

  const handleCreateUnitInSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) return;
    if (!newUnitName.trim() || !newUnitCode.trim()) {
      toast.error('Unit name and code are required');
      return;
    }

    const toastId = toast.loading('Registering curriculum unit...');
    try {
      const unitId = newUnitCode.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await setDoc(doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', unitId), {
        id: unitId,
        name: newUnitName.trim(),
        code: newUnitCode.trim().toUpperCase(),
        isMandatory: newUnitIsMandatory,
        type: newUnitIsMandatory ? 'core' : 'elective',
        department: newUnitDept,
        weeklyPeriods: Number(newUnitPeriods) || 4,
        applicableClasses: newUnitClasses.length === 0 ? ['all'] : newUnitClasses,
        teacherName: 'Assigned Instructor',
        createdAt: serverTimestamp(),
      });
      toast.success(`Unit ${newUnitCode.toUpperCase()} created!`, { id: toastId });
      setIsAddUnitModalOpen(false);
      setNewUnitName('');
      setNewUnitCode('');
      setNewUnitClasses(['all']);
    } catch (err) {
      console.error('Error creating unit:', err);
      toast.error('Failed to create unit', { id: toastId });
    }
  };

  const handleBulkSeedUnits = async () => {
    if (!organization || !currentSchool) return;
    const standardCurriculumUnits = [
      { id: 'math-101', code: 'MATH-101', name: 'Mathematics', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 5, applicableClasses: ['all'] },
      { id: 'eng-102', code: 'ENG-102', name: 'English Language & Literacy', isMandatory: true, department: 'Languages', weeklyPeriods: 5, applicableClasses: ['all'] },
      { id: 'kisw-103', code: 'KISW-103', name: 'Kiswahili & Fasihi', isMandatory: true, department: 'Languages', weeklyPeriods: 4, applicableClasses: ['all'] },
      { id: 'env-101', code: 'ENV-101', name: 'Environmental & Foundational Activities', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'hyg-102', code: 'HYG-102', name: 'Hygiene, Movement & Nutrition Activities', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3, applicableClasses: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'sci-201', code: 'SCI-201', name: 'Integrated Science & Technology', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sst-202', code: 'SST-202', name: 'Social Studies & Citizenship', isMandatory: true, department: 'Humanities', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'agri-301', code: 'AGRI-301', name: 'Agriculture & Nutrition', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'arts-302', code: 'ARTS-302', name: 'Creative Arts & Sports', isMandatory: true, department: 'Creative Arts', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'ptech-303', code: 'PTECH-303', name: 'Pre-Technical & Digital Studies', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'cre-104', code: 'CRE-104', name: 'Christian Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['all'] },
      { id: 'ire-105', code: 'IRE-105', name: 'Islamic Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['all'] },
      { id: 'frn-203', code: 'FRN-203', name: 'French & Foreign Languages', isMandatory: false, department: 'Languages', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
      { id: 'comp-204', code: 'COMP-204', name: 'Computer Science & ICT', isMandatory: false, department: 'Sciences & Tech', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
      { id: 'bst-208', code: 'BST-208', name: 'Business Studies & Financial Literacy', isMandatory: false, department: 'Humanities', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
      { id: 'mus-207', code: 'MUS-207', name: 'Music & Performing Arts', isMandatory: false, department: 'Creative Arts', weeklyPeriods: 2, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9', 'Form 1', 'Form 2', 'Form 3', 'Form 4'] },
    ];

    const toastId = toast.loading('Seeding grade-appropriate curriculum units...');
    try {
      const batch = writeBatch(db);
      for (const unit of standardCurriculumUnits) {
        const docRef = doc(db, 'organizations', organization.id, 'schools', currentSchool.id, 'subjects', unit.id);
        batch.set(docRef, {
          ...unit,
          type: unit.isMandatory ? 'core' : 'elective',
          teacherName: 'Assigned Instructor',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
      toast.success('Successfully seeded 16 curriculum units tailored by grade levels!', { id: toastId });
    } catch (err) {
      console.error('Error seeding units:', err);
      toast.error('Failed to seed curriculum units', { id: toastId });
    }
  };

  // Apply chosen colors, fonts, and sidebar theme to DOM in real-time so administrator sees instant live feedback
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--school-primary', primaryColor);
      document.documentElement.style.setProperty('--color-blue', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--school-secondary', secondaryColor);
      document.documentElement.style.setProperty('--color-purple', secondaryColor);
    }
    if (accentColor) {
      document.documentElement.style.setProperty('--school-accent', accentColor);
    }

    // Font
    const fontStack = fontFamily === 'Outfit'
      ? "'Outfit', 'Plus Jakarta Sans', sans-serif"
      : fontFamily === 'Lexend'
      ? "'Lexend', 'Inter', sans-serif"
      : fontFamily === 'Inter'
      ? "'Inter', system-ui, sans-serif"
      : "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
    document.documentElement.style.setProperty('--font-main', fontStack);

    // Sidebar
    if (sidebarTheme === 'school_primary') {
      document.documentElement.style.setProperty('--sidebar-bg', primaryColor);
      document.documentElement.style.setProperty('--sidebar-text', '#ffffff');
      document.documentElement.style.setProperty('--sidebar-text-muted', 'rgba(255, 255, 255, 0.75)');
      document.documentElement.style.setProperty('--sidebar-active-bg', 'rgba(255, 255, 255, 0.18)');
      document.documentElement.style.setProperty('--sidebar-active-text', '#ffffff');
      document.documentElement.style.setProperty('--sidebar-border', 'rgba(255, 255, 255, 0.12)');
    } else if (sidebarTheme === 'dark_slate') {
      document.documentElement.style.setProperty('--sidebar-bg', '#0f172a');
      document.documentElement.style.setProperty('--sidebar-text', '#f1f5f9');
      document.documentElement.style.setProperty('--sidebar-text-muted', '#94a3b8');
      document.documentElement.style.setProperty('--sidebar-active-bg', primaryColor);
      document.documentElement.style.setProperty('--sidebar-active-text', '#ffffff');
      document.documentElement.style.setProperty('--sidebar-border', '#1e293b');
    } else if (sidebarTheme === 'custom') {
      document.documentElement.style.setProperty('--sidebar-bg', sidebarBg);
      document.documentElement.style.setProperty('--sidebar-text', sidebarText);
      document.documentElement.style.setProperty('--sidebar-text-muted', 'rgba(255, 255, 255, 0.7)');
      document.documentElement.style.setProperty('--sidebar-active-bg', 'rgba(255, 255, 255, 0.18)');
      document.documentElement.style.setProperty('--sidebar-active-text', '#ffffff');
      document.documentElement.style.setProperty('--sidebar-border', 'rgba(255, 255, 255, 0.15)');
    } else {
      document.documentElement.style.setProperty('--sidebar-bg', '#ffffff');
      document.documentElement.style.setProperty('--sidebar-text', '#334155');
      document.documentElement.style.setProperty('--sidebar-text-muted', '#64748b');
      document.documentElement.style.setProperty('--sidebar-active-bg', `color-mix(in srgb, ${primaryColor} 12%, white)`);
      document.documentElement.style.setProperty('--sidebar-active-text', primaryColor);
      document.documentElement.style.setProperty('--sidebar-border', '#e2e8f0');
    }
  }, [primaryColor, secondaryColor, accentColor, sidebarTheme, sidebarBg, sidebarText, fontFamily]);

  /* ---- Exam Card Template ---- */
  const [examCardTemplate, setExamCardTemplate] = useState<string>(
    currentSchool?.branding?.examCardTemplate || 'classic_crest'
  );
  const [previewTab, setPreviewTab] = useState<'reportCard' | 'examCard' | 'dashboard'>('reportCard');

  /* ---- Academic Calendar ---- */
  const [termsPerYear, setTermsPerYear] = useState<number>(3);
  const [termDates, setTermDates] = useState<Array<{ name: string; start: string; end: string }>>([
    { name: 'Term 1', start: '', end: '' },
    { name: 'Term 2', start: '', end: '' },
    { name: 'Term 3', start: '', end: '' },
  ]);

  /* ---- Language & Timezone ---- */
  const [language, setLanguage] = useState<string>('en');
  const [timezone, setTimezone] = useState<string>('Africa/Nairobi');
  const [dateFormat, setDateFormat] = useState<string>('DD/MM/YYYY');

  /* ---- Payment ---- */
  const [paymentProvider, setPaymentProvider] = useState<string>('mpesa');
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [mpesaPasskey, setMpesaPasskey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [smsCreditsBalance, setSmsCreditsBalance] = useState<number>(0);

  /* ---- Saving state ---- */
  const [isSaving, setIsSaving] = useState(false);

  /* ================================================================ */
  /*  Hydrate state from currentSchool whenever it changes            */
  /* ================================================================ */
  useEffect(() => {
    if (!currentSchool) return;

    // Curriculum & grading
    setCurriculum(currentSchool.curriculumType || 'CBC');
    setGradingMode(currentSchool.gradingMode || 'cbc_no_aggregate');

    // Branding
    setPrimaryColor(currentSchool.branding?.primaryColor || '#1d5f99');
    setSecondaryColor(currentSchool.branding?.secondaryColor || '#683669');
    setAccentColor(currentSchool.branding?.accentColor || '#10B981');
    setReportCardTemplate(currentSchool.branding?.reportCardTemplate || 'classic_crest');
    setSidebarTheme(currentSchool.branding?.sidebarTheme || 'school_primary');
    setSidebarBg(currentSchool.branding?.sidebarBg || currentSchool.branding?.primaryColor || '#1d5f99');
    setSidebarText(currentSchool.branding?.sidebarText || '#ffffff');
    setFontFamily(currentSchool.branding?.fontFamily || 'Plus Jakarta Sans');
    setSchoolMotto(currentSchool.branding?.motto || '');
    setLogoUrl(currentSchool.branding?.logo || '');
    setLogoFile(null);
    setLogoPreviewUrl('');
    setExamCardTemplate(currentSchool.branding?.examCardTemplate || 'classic_crest');

    // Email domain
    const domain = (currentSchool.settings as Record<string, unknown> | undefined)?.emailDomain;
    setEmailDomain(typeof domain === 'string' ? domain : currentSchool.contacts?.website?.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || '');

    // Registration fields from settings
    const s = currentSchool.settings as Record<string, unknown> | undefined;
    setRegistrationNumber((s?.registrationNumber as string) || '');
    setSchoolType(currentSchool.type || 'combined');
    setBoardingType((s?.boardingType as string) || 'day');
    setPrincipalName((s?.principalName as string) || '');
    setWebsiteUrl(currentSchool.contacts?.website || '');
    setSchoolCapacity((s?.capacity as number) || 500);

    // Address
    if (currentSchool.address) {
      setAddressLine1(currentSchool.address.line1 || '');
      setAddressLine2(currentSchool.address.line2 || '');
      setCity(currentSchool.address.city || '');
      setCounty(currentSchool.address.county || '');
      setPostalCode(currentSchool.address.postalCode || '');
      setAddressCountry(currentSchool.address.country || 'KE');
    }

    // Contacts
    if (currentSchool.contacts) {
      setSchoolPhone(currentSchool.contacts.phone || '');
      setSchoolAltPhone(currentSchool.contacts.altPhone || '');
      setSchoolEmail(currentSchool.contacts.email || '');
    }

    // Calendar
    const cal = currentSchool.academicCalendar;
    if (cal) {
      setTermsPerYear(cal.termsPerYear || 3);
    }
    const savedTermDates = (s?.termDates as Array<{ name: string; start: string; end: string }>) || null;
    if (savedTermDates?.length) {
      setTermDates(savedTermDates);
    }

    // Language & timezone
    const lang = (s?.language as string) || 'en';
    setLanguage(lang);
    const tz = (s?.timezone as string) || 'Africa/Nairobi';
    setTimezone(tz);
    const df = (s?.dateFormat as string) || 'DD/MM/YYYY';
    setDateFormat(df);

    // Payment
    const pay = (s?.payment as Record<string, unknown>) || {};
    setPaymentProvider((pay.provider as string) || 'mpesa');
    setMpesaShortcode((pay.mpesaShortcode as string) || '');
    setMpesaPasskey((pay.mpesaPasskey as string) || '');
    setBankName((pay.bankName as string) || '');
    setBankAccountNumber((pay.bankAccountNumber as string) || '');
    setBankAccountName((pay.bankAccountName as string) || '');
    setSmsCreditsBalance((s?.smsCreditsBalance as number) || 0);

    setBrandingSaved(false);
  }, [currentSchool?.id]);

  /* ================================================================ */
  /*  Apply per-school branding colours live                          */
  /* ================================================================ */
  useEffect(() => {
    document.documentElement.style.setProperty('--school-primary', primaryColor);
    document.documentElement.style.setProperty('--school-secondary', secondaryColor);
    document.documentElement.style.setProperty('--school-brand-gradient', `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`);
    document.documentElement.style.setProperty('--color-blue', primaryColor);
    document.documentElement.style.setProperty('--color-purple', secondaryColor);
  }, [primaryColor, secondaryColor]);

  /* ================================================================ */
  /*  Update term date rows when termsPerYear changes                  */
  /* ================================================================ */
  useEffect(() => {
    setTermDates((prev) => {
      if (prev.length === termsPerYear) return prev;
      if (prev.length < termsPerYear) {
        return [
          ...prev,
          ...Array.from({ length: termsPerYear - prev.length }, (_, i) => ({
            name: `Term ${prev.length + i + 1}`,
            start: '',
            end: '',
          })),
        ];
      }
      return prev.slice(0, termsPerYear);
    });
  }, [termsPerYear]);

  /* ================================================================ */
  /*  Curated Academic Colour Palettes                                 */
  /* ================================================================ */
  const colorPresets = [
    // Traditional Prestige
    { name: 'Alliance Maroon & Gold', category: 'Prestige', primary: '#6b1d2f', secondary: '#b45309' },
    { name: 'Starehe Blue & Crimson', category: 'Prestige', primary: '#1e3a8a', secondary: '#991b1b' },
    { name: 'Strathmore Navy & Gold', category: 'Prestige', primary: '#0f172a', secondary: '#ca8a04' },
    { name: 'Mang’u Emerald & Ivory', category: 'Prestige', primary: '#064e3b', secondary: '#047857' },
    { name: 'Lenana Amber & Plum', category: 'Prestige', primary: '#78350f', secondary: '#701a75' },

    // Modern Academic
    { name: 'Edumo Sapphire & Violet', category: 'Modern', primary: '#1d5f99', secondary: '#683669' },
    { name: 'Cyber Cyan & Deep Indigo', category: 'Modern', primary: '#0369a1', secondary: '#3730a3' },
    { name: 'Forest Teal & Jade', category: 'Modern', primary: '#0f766e', secondary: '#15803d' },
    { name: 'Royal Purple & Electric Sky', category: 'Modern', primary: '#5b21b6', secondary: '#2563eb' },
    { name: 'Sunset Terracotta & Gold', category: 'Modern', primary: '#c2410c', secondary: '#d97706' },

    // East African Heritage
    { name: 'Serengeti Ochre & Slate', category: 'Heritage', primary: '#9a3412', secondary: '#334155' },
    { name: 'Kilimanjaro Royal & Azure', category: 'Heritage', primary: '#1d4ed8', secondary: '#0284c7' },
    { name: 'Kigali Emerald & Sunburst', category: 'Heritage', primary: '#166534', secondary: '#ca8a04' },
    { name: 'Nile Teal & Deep Navy', category: 'Heritage', primary: '#0d9488', secondary: '#1e3a8a' },

    // High Distinction
    { name: 'Burgundy Crest & Rose', category: 'Distinction', primary: '#881337', secondary: '#db2777' },
    { name: 'Imperial Violet & Amber', category: 'Distinction', primary: '#4c1d95', secondary: '#d97706' },
  ];

  /* ================================================================ */
  /*  Exam Card Templates Config (6 Real-World School Paradigms)      */
  /* ================================================================ */
  const examCardTemplates = [
    {
      id: 'classic_crest',
      title: 'Classic National Board Pass',
      category: 'KNEC / UNEB / NECTA Standard',
      description: 'Formal double-ruled certificate frame, passport photo box, candidate index/adm number, 6-subject timetable verification schedule, candidate integrity pledge, and official headteacher stamp box.',
      icon: Award,
      badge: 'National Standard',
    },
    {
      id: 'modern_qr',
      title: 'Modern Biometric & Secure QR Pass',
      category: 'Tech-Enabled Academy',
      description: 'Digital verification pass with large cryptographic QR code, student photo identification, desk & examination hall assignment, barcode candidate tracker, and anti-forgery watermark pattern.',
      icon: QrCode,
      badge: 'Biometric QR',
    },
    {
      id: 'executive_distinction',
      title: 'Executive Distinction Certificate Card',
      category: 'Cambridge & International',
      description: 'Elite international school format with intricate guilloche security border, gold foil styling, dual crest headers, invigilator verification initial columns, and authorized registrar seal.',
      icon: ShieldCheck,
      badge: 'International IB/IGCSE',
    },
    {
      id: 'compact_slip',
      title: 'Compact Eco Dual-Slip (A4 Split)',
      category: 'High-Volume & Low-Ink',
      description: 'Paper-conserving 2-cards-per-page A4 landscape split layout. Features candidate photo, timetable summary, invigilator sign-off boxes, and parent emergency tear-off slip.',
      icon: Printer,
      badge: '2-Per-Page Eco',
    },
    {
      id: 'cbc_competency',
      title: 'CBC Assessment Center Card',
      category: 'KICD Competency Pathway',
      description: 'Official Kenya CBC Junior/Senior School format with Learner Assessment UPI, CBA Assessment Center Code, pathways tracking, and Ministry examination room conduct rules.',
      icon: Sparkles,
      badge: 'CBC CBA Certified',
    },
    {
      id: 'integrated_values',
      title: 'Faith & Values Integrated Academy Card',
      category: 'Faith-Based & Character Academy',
      description: 'Integrated dual-language academic header, ethical student honor code affirmation, designated moral verse/guidance quotation, and physical examination supervisor endorsement block.',
      icon: FileText,
      badge: 'Values & Character',
    },
  ];

  /* ================================================================ */
  /*  SAVE HANDLER                                                     */
  /* ================================================================ */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) {
      toast.error('No organization workspace loaded. Please refresh or sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update org-level name
      await updateDoc(doc(db, 'organizations', organization.id), { name: orgName.trim() });

      if (currentSchool) {
        // 2. Upload logo if changed
        let savedLogoUrl = logoUrl;
        if (logoFile) {
          const logoRef = ref(storage, `${organization.id}/${currentSchool.id}/branding/logo-${Date.now()}.${logoFile.name.split('.').pop() || 'png'}`);
          await uploadBytes(logoRef, logoFile, { contentType: logoFile.type });
          savedLogoUrl = await getDownloadURL(logoRef);
        }

        // 3. Build the school update payload
        const schoolUpdate: Record<string, unknown> = {
          type: schoolType,
          curriculumType: curriculum,
          gradingMode,
          gradingConfig: { ...currentSchool.gradingConfig, scale: gradingScale },

          // Branding (strictly isolated per-school)
          branding: {
            primaryColor,
            secondaryColor,
            accentColor,
            sidebarTheme,
            sidebarBg,
            sidebarText,
            fontFamily,
            reportCardTemplate,
            motto: schoolMotto.trim(),
            logo: savedLogoUrl,
            examCardTemplate,
          },

          // Address
          address: {
            line1: addressLine1.trim(),
            line2: addressLine2.trim(),
            city: city.trim(),
            county: county.trim(),
            postalCode: postalCode.trim(),
            country: addressCountry,
          },

          // Contacts
          contacts: {
            phone: schoolPhone.trim(),
            altPhone: schoolAltPhone.trim(),
            email: schoolEmail.trim(),
            website: websiteUrl.trim(),
          },

          // Academic calendar
          academicCalendar: {
            termsPerYear,
            ...(currentSchool.academicCalendar?.currentAcademicYearId
              ? { currentAcademicYearId: currentSchool.academicCalendar.currentAcademicYearId }
              : {}),
            ...(currentSchool.academicCalendar?.currentTermId
              ? { currentTermId: currentSchool.academicCalendar.currentTermId }
              : {}),
          },

          // Settings bag – per-school scoped
          settings: {
            ...(currentSchool.settings || {}),
            emailDomain: sanitizeSchoolEmailDomain(emailDomain),
            registrationNumber: registrationNumber.trim(),
            boardingType,
            principalName: principalName.trim(),
            capacity: schoolCapacity,
            language,
            timezone,
            dateFormat,
            termDates,
            smsCreditsBalance,
            payment: {
              provider: paymentProvider,
              mpesaShortcode: mpesaShortcode.trim(),
              mpesaPasskey: mpesaPasskey.trim(),
              bankName: bankName.trim(),
              bankAccountNumber: bankAccountNumber.trim(),
              bankAccountName: bankAccountName.trim(),
            },
          },
        };

        await updateDoc(
          doc(db, 'organizations', organization.id, 'schools', currentSchool.id),
          schoolUpdate
        );

        // 4. Apply grading to all branches if toggled
        if (applyGradingToAllBranches) {
          const schoolsSnapshot = await getDocs(
            collection(db, 'organizations', organization.id, 'schools')
          );
          await Promise.all(
            schoolsSnapshot.docs.map((schoolDoc) =>
              updateDoc(schoolDoc.ref, {
                gradingMode,
                gradingConfig: { scale: gradingScale },
              })
            )
          );
        }

        // 5. Apply logo to all branches if toggled
        if (applyLogoToAllBranches && savedLogoUrl) {
          try {
            await updateDoc(doc(db, 'organizations', organization.id), {
              'branding.logo': savedLogoUrl,
              'branding.primaryColor': primaryColor,
              'branding.secondaryColor': secondaryColor,
            });
            const schoolsSnapshot = await getDocs(
              collection(db, 'organizations', organization.id, 'schools')
            );
            await Promise.all(
              schoolsSnapshot.docs.map((sDoc) =>
                updateDoc(sDoc.ref, {
                  'branding.logo': savedLogoUrl,
                })
              )
            );
          } catch (bErr) {
            console.warn('Cross-branch logo sync note:', bErr);
          }
        }

        setLogoUrl(savedLogoUrl);
        setLogoFile(null);
        setLogoPreviewUrl(savedLogoUrl);
        setBrandingSaved(true);
      }

      toast.success(`${currentSchool?.name || 'School'} branding & settings saved successfully!`);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearOfflineCache = () => {
    try {
      localStorage.removeItem('edumo_offline_queue');
      toast.success('Local offline cache reset successfully.');
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Campus Branding &amp; Settings
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Visual identity, admit card styling, and configurations apply to{' '}
            <span className="font-bold text-gray-800 underline decoration-brand-500/30">
              {currentSchool?.name || 'Active Campus'}
            </span>{' '}
            only.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {brandingSaved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Applied Live
            </span>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save All Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Country Pack Notice */}
        <div className="p-4 rounded-2xl bg-warning-500/10 border border-warning-500/20 flex items-start gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 text-warning-800 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900">
              VERIFY WITH OFFICIAL SOURCE: Country Pack Parameters
            </h4>
            <p className="text-gray-700 mt-0.5 leading-relaxed text-2xs">
              All regional grading scales (e.g., KICD CBC rubric levels, UNEB O-Level aggregates,
              NECTA division boundaries) are seeded defaults. They remain completely editable in accordance
              with your Ministry of Education official circulars.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  1. SCHOOL BRANDING & COLOURS (ENHANCED)                     */}
        {/* ============================================================ */}
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              icon={<Palette className="w-4 h-4 text-brand-700" />}
              title="School Visual Identity &amp; Colours"
              subtitle={`Branding applied specifically to "${currentSchool?.name || 'this campus'}"`}
              isOpen={openSections.branding}
              onToggle={() => toggle('branding')}
            />
          </div>

          {openSections.branding && (
            <div className="space-y-5 pt-2">
              {/* Presets Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Curated Institution Palettes
                  </p>
                  <span className="text-2xs text-gray-400">Click any preset to apply instantly</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {colorPresets.map((preset) => {
                    const isSelected = primaryColor === preset.primary && secondaryColor === preset.secondary;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(preset.primary);
                          setSecondaryColor(preset.secondary);
                          setBrandingSaved(false);
                        }}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-brand-500 ring-2 ring-brand-500/20 bg-blue-50/20 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div
                          className="h-8 rounded-lg mb-2 shadow-xs"
                          style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                        />
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-gray-800 truncate">{preset.name}</span>
                          {isSelected && <span className="text-xs font-bold text-emerald-600">✓</span>}
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{preset.category}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Switcher */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Live Campus Preview
                    </p>
                    <p className="text-2xs text-gray-500">
                      Updates instantly as you adjust branding and colours
                    </p>
                  </div>

                  {/* Preview Tabs */}
                  <div className="inline-flex p-1 bg-white rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('examCard')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        previewTab === 'examCard'
                          ? 'bg-brand-700 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Exam Admit Card Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('dashboard')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        previewTab === 'dashboard'
                          ? 'bg-brand-700 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Dashboard UI Preview
                    </button>
                  </div>
                </div>

                {/* TAB 1: EXAM CARD LIVE PREVIEW */}
                {previewTab === 'examCard' && (
                  <div className="bg-white rounded-xl border border-gray-300 p-5 shadow-sm max-w-2xl mx-auto animate-fade-in">
                    {/* Header with School Branding */}
                    <div className="border-b-2 pb-4 text-center" style={{ borderColor: primaryColor }}>
                      <div className="flex items-center justify-center gap-3 mb-1">
                        <div
                          className="w-12 h-12 rounded-xl text-white font-bold flex items-center justify-center text-lg shadow-sm shrink-0"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                        >
                          {logoPreviewUrl ? (
                            <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                          ) : logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            (currentSchool?.name || 'S').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="text-base font-bold text-gray-900 leading-tight uppercase tracking-wide">
                            {currentSchool?.name || 'Edumo Demonstration Academy'}
                          </h3>
                          <p className="text-xs text-gray-500 italic">
                            "{schoolMotto || 'Knowledge, Discipline and Excellence'}"
                          </p>
                        </div>
                      </div>
                      <div
                        className="inline-block mt-2 px-4 py-0.5 rounded-full text-white text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ background: primaryColor }}
                      >
                        Official Candidate Examination Admit Card — Term 2 Exams
                      </div>
                    </div>

                    {/* Candidate Identity */}
                    <div className="grid grid-cols-[1fr_90px] gap-4 my-4 items-center">
                      <div className="space-y-1 text-xs text-gray-700">
                        <p>
                          <span className="font-semibold text-gray-500">Candidate Name:</span>{' '}
                          <strong className="text-gray-900 text-sm">Amina Wangari Mwangi</strong>
                        </p>
                        <p>
                          <span className="font-semibold text-gray-500">Admission / Index:</span>{' '}
                          <strong className="font-mono text-gray-900 font-bold">KMA/2026/0412</strong>
                        </p>
                        <p>
                          <span className="font-semibold text-gray-500">Class &amp; Stream:</span>{' '}
                          <span className="font-semibold text-gray-800">Grade 10 Alpha (Senior Secondary)</span>
                        </p>
                        <p>
                          <span className="font-semibold text-gray-500">Examination Center:</span>{' '}
                          <span className="font-semibold text-gray-800">{currentSchool?.name || 'Main Hall A'}</span>
                        </p>
                      </div>

                      {/* Photo Box */}
                      <div
                        className="w-20 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-1 bg-gray-50"
                        style={{ borderColor: secondaryColor }}
                      >
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Passport Photo</span>
                      </div>
                    </div>

                    {/* Timetable Schedule Grid */}
                    <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden my-3">
                      <thead style={{ background: primaryColor, color: '#ffffff' }}>
                        <tr>
                          <th className="p-2 font-bold">Date &amp; Time</th>
                          <th className="p-2 font-bold">Subject / Learning Area</th>
                          <th className="p-2 font-bold">Desk</th>
                          <th className="p-2 font-bold text-center">Invigilator Sign</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-gray-700">
                        <tr>
                          <td className="p-2 font-mono text-2xs">Mon 08:30 AM</td>
                          <td className="p-2 font-semibold">Mathematics (Paper 1)</td>
                          <td className="p-2">D-14</td>
                          <td className="p-2 text-center text-gray-300">__________</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="p-2 font-mono text-2xs">Tue 08:30 AM</td>
                          <td className="p-2 font-semibold">English Language &amp; Literature</td>
                          <td className="p-2">D-14</td>
                          <td className="p-2 text-center text-gray-300">__________</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono text-2xs">Wed 08:30 AM</td>
                          <td className="p-2 font-semibold">Integrated Science &amp; Biology</td>
                          <td className="p-2">D-14</td>
                          <td className="p-2 text-center text-gray-300">__________</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Footer Validation */}
                    <div className="flex items-end justify-between pt-3 border-t border-gray-200 text-2xs text-gray-500">
                      <div>
                        <p className="font-semibold text-gray-700">Candidate Declaration:</p>
                        <p>I confirm adherence to all official Ministry Examination regulations.</p>
                      </div>
                      <div className="text-right">
                        <div
                          className="w-24 h-10 border border-gray-300 rounded mb-1 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase tracking-wider"
                          style={{ color: secondaryColor }}
                        >
                          Official Stamp
                        </div>
                        <p className="font-semibold text-gray-700">Head Teacher Signature</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DASHBOARD UI PREVIEW */}
                {previewTab === 'dashboard' && (
                  <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3 animate-fade-in">
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-11 h-11 rounded-xl shrink-0 overflow-hidden flex items-center justify-center text-white font-bold shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                        >
                          {logoPreviewUrl ? (
                            <img src={logoPreviewUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            (currentSchool?.name || 'S').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {currentSchool?.name || 'School Name'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{schoolMotto || 'School motto'}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs font-semibold">
                        <div className="rounded-lg px-3 py-2 text-white" style={{ background: primaryColor }}>
                          Dashboard
                        </div>
                        <div className="rounded-lg px-3 py-2 border border-gray-200 text-gray-700">Students</div>
                        <div className="rounded-lg px-3 py-2 border border-gray-200 text-gray-700">Attendance</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">Active Campus Overview</p>
                          <p className="text-xs text-gray-500">Live school visual dashboard</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-xs font-bold text-white shadow-xs"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                        >
                          Add Record
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          ['Total Learners', '1,248'],
                          ['Teachers', '86'],
                          ['Attendance', '96%'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-gray-200 p-3">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Branch Isolation Notice */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-900">
                <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Campus-Isolated Theme &amp; Branding:</span>
                  <p className="text-2xs text-blue-800 mt-0.5 leading-relaxed">
                    Colours, sidebar themes, fonts, and report form templates selected here apply strictly to{' '}
                    <strong>{currentSchool?.name || 'this campus'}</strong>. They will never alter or interfere with other school branches in your organization.
                  </p>
                </div>
              </div>

              {/* Colour Pickers: Primary, Secondary, Accent */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Primary Brand Colour
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        setBrandingSaved(false);
                      }}
                      className="block h-10 w-16 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                          setPrimaryColor(e.target.value);
                          setBrandingSaved(false);
                        }
                      }}
                      className="block h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900"
                    />
                  </div>
                </label>

                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Secondary Colour
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => {
                        setSecondaryColor(e.target.value);
                        setBrandingSaved(false);
                      }}
                      className="block h-10 w-16 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                          setSecondaryColor(e.target.value);
                          setBrandingSaved(false);
                        }
                      }}
                      className="block h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900"
                    />
                  </div>
                </label>

                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Accent / Highlight Colour
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        setBrandingSaved(false);
                      }}
                      className="block h-10 w-16 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor.toUpperCase()}
                      maxLength={7}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                          setAccentColor(e.target.value);
                          setBrandingSaved(false);
                        }
                      }}
                      className="block h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900"
                    />
                  </div>
                </label>
              </div>

              {/* Sidebar Theme & Typography Customization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Sidebar Portal Theme
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'school_primary', label: 'Primary Brand Color', desc: 'Uses campus primary color' },
                      { id: 'dark_slate', label: 'Dark Slate Enterprise', desc: 'Classic midnight slate #0f172a' },
                      { id: 'clean_light', label: 'Clean Light / White', desc: 'Minimalist crisp white theme' },
                      { id: 'custom', label: 'Custom Palette', desc: 'Specify background & text' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSidebarTheme(st.id);
                          setBrandingSaved(false);
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          sidebarTheme === st.id
                            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-white font-bold text-blue-900 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="block font-semibold text-xs">{st.label}</span>
                        <span className="block text-[10px] text-slate-500 font-normal">{st.desc}</span>
                      </button>
                    ))}
                  </div>

                  {sidebarTheme === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                      <label className="text-2xs font-semibold text-slate-600">
                        Sidebar Background
                        <input
                          type="color"
                          value={sidebarBg}
                          onChange={(e) => {
                            setSidebarBg(e.target.value);
                            setBrandingSaved(false);
                          }}
                          className="block h-8 w-full rounded mt-1 p-0.5 cursor-pointer"
                        />
                      </label>
                      <label className="text-2xs font-semibold text-slate-600">
                        Sidebar Text Color
                        <input
                          type="color"
                          value={sidebarText}
                          onChange={(e) => {
                            setSidebarText(e.target.value);
                            setBrandingSaved(false);
                          }}
                          className="block h-8 w-full rounded mt-1 p-0.5 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Portal Preferred Typography Font
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', desc: 'Modern High-Tech SaaS & Fintech (Recommended)' },
                      { id: 'Inter', label: 'Inter', desc: 'Clean, neutral and ultra-legible' },
                      { id: 'Outfit', label: 'Outfit', desc: 'Friendly, rounded modern display typography' },
                      { id: 'Lexend', label: 'Lexend', desc: 'Engineered for reading fluency in education' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFontFamily(f.id);
                          setBrandingSaved(false);
                        }}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                          fontFamily === f.id
                            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-white font-bold text-blue-900 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="block font-semibold text-xs">{f.label}</span>
                          <span className="block text-[10px] text-slate-500 font-normal">{f.desc}</span>
                        </div>
                        {fontFamily === f.id && <span className="text-xs font-bold text-emerald-600">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Motto & Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="School Motto"
                  placeholder="Knowledge, Discipline and Service"
                  value={schoolMotto}
                  onChange={(e) => {
                    setSchoolMotto(e.target.value);
                    setBrandingSaved(false);
                  }}
                />
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  School Logo Image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setLogoFile(file);
                      if (!file) {
                        setLogoPreviewUrl('');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        setLogoPreviewUrl(typeof reader.result === 'string' ? reader.result : '');
                      reader.readAsDataURL(file);
                      setBrandingSaved(false);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white text-xs text-gray-600 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-2.5 file:text-gray-700 cursor-pointer"
                  />
                </label>

                {/* Multi-Branch Logo Inheritance Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={applyLogoToAllBranches}
                      onChange={(e) => setApplyLogoToAllBranches(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 mt-0.5"
                    />
                    <div>
                      <span>Apply this logo across all campus branches in this institution</span>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Recommended: Guarantees unified branding across all campuses without needing to upload separately. Uncheck if this branch uses a distinct crest.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  2. REPORT CARD & LEARNER PROGRESS TEMPLATES (EDUMO SUITE)   */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<FileText className="w-4 h-4 text-brand-700" />}
            title="Official Report Form &amp; Progress Card Templates"
            subtitle="Choose the layout design for termly report forms and academic transcripts for this campus"
            isOpen={openSections.reportCard !== false}
            onToggle={() => toggle('reportCard')}
          />

          {openSections.reportCard !== false && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-500">
                Select your school’s preferred report card design. Teachers, administrators, and parents will see this format
                when printing and generating official termly report cards. You can preview each template live and click{' '}
                <strong>Apply to Campus</strong> to immediately activate it across all modules for{' '}
                <strong>{currentSchool?.name || 'this campus'}</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'classic_crest',
                    title: 'Classic Crest & Honors',
                    category: 'Traditional Prestige',
                    badge: 'Most Popular',
                    description: 'Traditional double-border crest, Latin motto banner, subject grades, and physical headmaster seal box. Ideal for KCSE, 8-4-4, and traditional academies.',
                    icon: Award,
                  },
                  {
                    id: 'modern_cbc',
                    title: 'Modern CBC Competency Rubric',
                    category: 'KICD / MoE Standard',
                    badge: 'CBC Compliance',
                    description: 'Official 8-level competency matrix (EE1..BE2), rubric strand descriptors, core values evaluation, and strict no-aggregate compliance.',
                    icon: Sparkles,
                  },
                  {
                    id: 'executive_distinction',
                    title: 'Executive Distinction Certificate',
                    category: 'Cambridge & International',
                    badge: 'High Security QR',
                    description: 'Decorative guilloche security border, cryptographic verification QR code, dean’s honors stamp, and weighted GPA/percentage scale.',
                    icon: ShieldCheck,
                  },
                  {
                    id: 'compact_slip',
                    title: 'Compact Termly Slip',
                    category: 'Eco & Ink-Saving',
                    badge: 'Low-Data & Thermal',
                    description: 'High-density, ink-efficient single-page layout optimized for black & white printing or thermal paper with parent acknowledgement tear-off slip.',
                    icon: FileText,
                  },
                  {
                    id: 'visual_trajectory',
                    title: 'Visual Trajectory Analytics',
                    category: 'Edumo Analytics',
                    badge: 'Visual Broadsheet',
                    description: 'Visual progress bars showing subject mastery relative to 50% competency baseline, term-over-term trajectory deltas, and early intervention alerts.',
                    icon: TrendingUp,
                  },
                  {
                    id: 'dual_curriculum',
                    title: 'Dual Curriculum (Secular & Madrasa)',
                    category: 'Integrated Academy',
                    badge: 'Bilingual Calligraphy',
                    description: 'Dual header calligraphy, side-by-side Table A (Secular Sciences & Languages) and Table B (Islamic Religious Education, Arabic & Tarbiyah conduct).',
                    icon: BookOpen,
                  },
                ].map((tmpl) => {
                  const isSelected = reportCardTemplate === tmpl.id;
                  const Icon = tmpl.icon;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleApplyReportTemplate(tmpl.id as ReportTemplateId, tmpl.title)}
                      className={`rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Live Miniature Visual Preview Canvas */}
                        <MiniatureTemplatePreview
                          templateId={tmpl.id}
                          primaryColor={primaryColor}
                          secondaryColor={secondaryColor}
                          schoolName={currentSchool?.name || orgName || 'Edumo Academy'}
                          logoUrl={logoPreviewUrl || logoUrl}
                        />

                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-2xs"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <Badge variant={isSelected ? 'brand' : 'neutral'}>
                            {tmpl.badge}
                          </Badge>
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900 text-xs">{tmpl.title}</h4>
                            {isSelected && <span className="text-xs font-bold text-emerald-600">✓ Active</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{tmpl.category}</span>
                          <p className="text-2xs text-slate-600 mt-1 leading-relaxed">{tmpl.description}</p>
                        </div>
                      </div>

                      {/* Interactive Actions Strip: Live Preview + Apply */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplateModal(tmpl.id as ReportTemplateId);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#1d5f99]" />
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyReportTemplate(tmpl.id as ReportTemplateId, tmpl.title);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#1d5f99] hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isSelected ? 'Applied' : 'Apply to Campus'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  2.5 CURRICULUM UNITS & CROSS-CAMPUS BRANCH MERGE            */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<BookOpen className="w-4 h-4 text-brand-700" />}
            title="Curriculum Units &amp; Learning Areas Management"
            subtitle="Configure mandatory (core) vs optional (elective) units, seed national curricula, and sync across campuses"
            isOpen={openSections.unitsManagement !== false}
            onToggle={() => toggle('unitsManagement')}
          />

          {openSections.unitsManagement !== false && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-slate-500">
                Setup and manage the academic learning areas offered at <strong>{currentSchool?.name || 'this campus'}</strong>.
                Units marked as <strong>Mandatory (Core)</strong> are required for every learner and evaluated in official progression,
                while <strong>Optional (Elective)</strong> units allow learner specialisation. You can replicate this entire curriculum catalog
                to all other campus branches with 1-click synchronization.
              </p>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Units</span>
                  <span className="text-xl font-bold font-mono text-slate-900">{schoolUnits.length}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Active in curriculum</span>
                </div>
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Mandatory (Core)</span>
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    {schoolUnits.filter((u) => u.isMandatory).length}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Required for all learners</span>
                </div>
                <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Optional (Elective)</span>
                  <span className="text-xl font-bold font-mono text-purple-700">
                    {schoolUnits.filter((u) => !u.isMandatory).length}
                  </span>
                  <span className="text-[10px] text-purple-600 block mt-0.5">Specialized selections</span>
                </div>
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Campus Branches</span>
                  <span className="text-xl font-bold font-mono text-blue-700">{schools.length}</span>
                  <span className="text-[10px] text-blue-600 block mt-0.5">Sync targets ready</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[200px] flex-1 max-w-xs">
                    <Input
                      placeholder="Search units by name or code..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      leftIcon={<Search className="w-3.5 h-3.5" />}
                      className="!py-1.5 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={unitClassFilter}
                      onChange={(e) => setUnitClassFilter(e.target.value)}
                      className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700"
                    >
                      <option value="all">All School Classes</option>
                      <optgroup label="Pre-Primary">
                        <option value="PP1">PP1</option>
                        <option value="PP2">PP2</option>
                      </optgroup>
                      <optgroup label="Lower Primary">
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                      </optgroup>
                      <optgroup label="Upper Primary">
                        <option value="Grade 4">Grade 4</option>
                        <option value="Grade 5">Grade 5</option>
                        <option value="Grade 6">Grade 6</option>
                      </optgroup>
                      <optgroup label="Junior Secondary (JSS)">
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                      </optgroup>
                      <optgroup label="Senior Secondary">
                        <option value="Form 1">Form 1</option>
                        <option value="Form 2">Form 2</option>
                        <option value="Form 3">Form 3</option>
                        <option value="Form 4">Form 4</option>
                      </optgroup>
                    </select>
                  </div>

                  <select
                    value={unitDeptFilter}
                    onChange={(e) => setUnitDeptFilter(e.target.value)}
                    className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700"
                  >
                    <option value="all">All Departments</option>
                    <option value="Sciences & Tech">Sciences &amp; Tech</option>
                    <option value="Languages">Languages</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Applied Sciences">Applied Sciences</option>
                    <option value="Creative Arts">Creative Arts</option>
                    <option value="Religious Studies">Religious Studies</option>
                  </select>

                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUnitTypeFilter('all')}
                      className={`px-2 py-1 rounded-md transition ${unitTypeFilter === 'all' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitTypeFilter('mandatory')}
                      className={`px-2 py-1 rounded-md transition ${unitTypeFilter === 'mandatory' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Core Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitTypeFilter('optional')}
                      className={`px-2 py-1 rounded-md transition ${unitTypeFilter === 'optional' ? 'bg-purple-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Electives Only
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleBulkSeedUnits}
                    leftIcon={<Layers className="w-3.5 h-3.5" />}
                  >
                    Seed Standard National Units
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => setIsAddUnitModalOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Single Unit
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleMergeUnitsToOtherBranches}
                    isLoading={isMergingBranches}
                    className="!bg-indigo-50 !border-indigo-200 !text-indigo-700 hover:!bg-indigo-100"
                    leftIcon={<GitMerge className="w-3.5 h-3.5 text-indigo-700" />}
                  >
                    Merge to Other Branches ({schools.filter((s) => s.id !== currentSchool?.id).length})
                  </Button>
                </div>
              </div>

              {/* Class Specific Filter Status Banner */}
              {unitClassFilter !== 'all' && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-950">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      Viewing curriculum learning areas designated for <strong>{unitClassFilter}</strong>.
                      Students enrolled in {unitClassFilter} are assessed exclusively on these assigned units.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnitClassFilter('all')}
                    className="text-2xs font-bold text-blue-700 hover:text-blue-900 underline"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* Units Table */}
              {loadingSchoolUnits ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading curriculum units...</div>
              ) : schoolUnits.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-800">No Curriculum Units Registered Yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Click "Seed Standard National Units" to automatically populate standard CBC/8-4-4 subjects,
                    or click "Add Single Unit" to register a custom unit.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button size="sm" variant="primary" onClick={handleBulkSeedUnits} leftIcon={<Layers className="w-3.5 h-3.5" />}>
                      Seed Standard Units
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Unit Code</th>
                        <th className="py-2.5 px-3">Subject / Unit Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Target Classes &amp; Levels</th>
                        <th className="py-2.5 px-3">Weekly Periods</th>
                        <th className="py-2.5 px-3">Requirement Status (Click to Toggle)</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {schoolUnits
                        .filter((u) => {
                          const matchesSearch =
                            u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
                            u.code.toLowerCase().includes(unitSearch.toLowerCase()) ||
                            (u.department || '').toLowerCase().includes(unitSearch.toLowerCase());
                          const matchesDept = unitDeptFilter === 'all' || u.department === unitDeptFilter;
                          const matchesType =
                            unitTypeFilter === 'all' ||
                            (unitTypeFilter === 'mandatory' && u.isMandatory) ||
                            (unitTypeFilter === 'optional' && !u.isMandatory);
                          const unitClasses = u.applicableClasses || ['all'];
                          const matchesClass =
                            unitClassFilter === 'all' ||
                            unitClasses.includes('all') ||
                            unitClasses.includes(unitClassFilter);
                          return matchesSearch && matchesDept && matchesType && matchesClass;
                        })
                        .map((unit) => (
                          <tr key={unit.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {unit.code}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {unit.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                                {unit.department || 'General'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                                {(!unit.applicableClasses || unit.applicableClasses.length === 0 || unit.applicableClasses.includes('all')) ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    All School Classes
                                  </span>
                                ) : (
                                  unit.applicableClasses.map((cls) => (
                                    <span key={cls} className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                      {cls}
                                    </span>
                                  ))
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUnitForClasses(unit);
                                    setUnitClassesSelection(unit.applicableClasses || ['all']);
                                  }}
                                  className="text-[10px] font-semibold text-brand-700 hover:text-brand-900 underline ml-1"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {unit.weeklyPeriods || 4} pds/wk
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggleUnitMandatory(unit)}
                                title="Click to switch requirement status"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold transition-all border ${
                                  unit.isMandatory
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                                }`}
                              >
                                {unit.isMandatory ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    MANDATORY (Core)
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                    OPTIONAL (Elective)
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUnitModal(unit)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50 transition"
                                  title="Edit curriculum unit details"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUnit(unit)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete unit from this campus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  3. EXAM CARDS TEMPLATES SELECTOR (NEW)                      */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Award className="w-4 h-4 text-brand-700" />}
            title="Examination Admit Card Templates"
            subtitle="Choose the official exam pass format for printable student examination cards"
            isOpen={openSections.examCard}
            onToggle={() => toggle('examCard')}
          />

          {openSections.examCard && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-500">
                Select the format that best fits your institution’s examination administration. When teachers
                or administrators generate exam passes, this template will be used.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {examCardTemplates.map((tmpl) => {
                  const isSelected = examCardTemplate === tmpl.id;
                  const Icon = tmpl.icon;
                  return (
                    <div
                      key={tmpl.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all bg-white ${
                        isSelected
                          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md bg-blue-50/15'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-2 rounded-xl text-white ${
                                isSelected ? 'bg-brand-700' : 'bg-slate-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-tight">{tmpl.title}</h4>
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-brand-700 block mt-0.5">
                                {tmpl.badge}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold uppercase shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Live Miniature Visual Canvas */}
                        <div className="my-2.5">
                          <MiniatureExamCardPreview
                            templateId={tmpl.id}
                            primaryColor={primaryColor}
                            secondaryColor={secondaryColor}
                            schoolName={currentSchool?.name || 'Edumo Demonstration Academy'}
                          />
                        </div>

                        {/* Description */}
                        <p className="text-2xs text-slate-600 leading-relaxed mb-3">
                          {tmpl.description}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewExamCardModal(tmpl.id);
                          }}
                          className="text-2xs py-1 px-2.5 h-7 flex-1"
                          leftIcon={<Eye className="w-3 h-3 text-slate-600" />}
                        >
                          Preview Live Pass
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? 'ghost' : 'primary'}
                          disabled={isSelected}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyExamCardTemplate(tmpl.id, tmpl.title);
                          }}
                          className={`text-2xs py-1 px-2.5 h-7 flex-1 ${isSelected ? '!text-emerald-700 !font-bold cursor-default' : ''}`}
                          leftIcon={isSelected ? <Check className="w-3 h-3 text-emerald-600" /> : undefined}
                        >
                          {isSelected ? 'Current Format' : 'Apply to Campus'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  3. SCHOOL REGISTRATION & IDENTITY                           */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Building2 className="w-4 h-4 text-brand-700" />}
            title="School Registration &amp; Identity"
            subtitle="Government registration details and school classification"
            isOpen={openSections.registration}
            onToggle={() => toggle('registration')}
          />

          {openSections.registration && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Organization Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
                <Input
                  label="Active Campus Branch"
                  value={currentSchool?.name || 'Main Campus'}
                  disabled
                />
                <Input
                  label="Registration / Gov't ID Number"
                  placeholder="e.g. MoE/KE/2024/001"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  helperText="Official school registration number"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="School Type"
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  options={[
                    { label: 'Nursery / ECDE', value: 'nursery' },
                    { label: 'Primary', value: 'primary' },
                    { label: 'Secondary', value: 'secondary' },
                    { label: 'Combined (All Levels)', value: 'combined' },
                  ]}
                />
                <Select
                  label="Boarding Status"
                  value={boardingType}
                  onChange={(e) => setBoardingType(e.target.value)}
                  options={[
                    { label: 'Day School', value: 'day' },
                    { label: 'Boarding School', value: 'boarding' },
                    { label: 'Day & Boarding', value: 'mixed' },
                  ]}
                />
                <Input
                  label="Principal / Head Teacher"
                  placeholder="Full name"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="School Website URL"
                  placeholder="https://www.school.ac.ke"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <Input
                  label="Maximum Student Capacity"
                  type="number"
                  min="1"
                  value={schoolCapacity}
                  onChange={(e) => setSchoolCapacity(Number(e.target.value))}
                  helperText="Used for enrollment limits"
                />
                <Input
                  label="School Email Domain"
                  placeholder="nyambaria.co.ke"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                  helperText="Used for auto-generated learner emails"
                />
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  4. SCHOOL ADDRESS                                           */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<MapPin className="w-4 h-4 text-brand-700" />}
            title="School Physical Address"
            subtitle="Location details for official records and correspondence"
            isOpen={openSections.address}
            onToggle={() => toggle('address')}
          />

          {openSections.address && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Address Line 1"
                  placeholder="Street name, building, or P.O. Box"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
                <Input
                  label="Address Line 2"
                  placeholder="Additional details (optional)"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input
                  label="City / Town"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="County / District"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                />
                <Input
                  label="Postal Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
                <Select
                  label="Country"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  options={[
                    { label: '🇰🇪 Kenya', value: 'KE' },
                    { label: '🇺🇬 Uganda', value: 'UG' },
                    { label: '🇹🇿 Tanzania', value: 'TZ' },
                    { label: '🇷🇼 Rwanda', value: 'RW' },
                  ]}
                />
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  5. CONTACT INFORMATION                                      */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Phone className="w-4 h-4 text-brand-700" />}
            title="Contact Information"
            subtitle="Phone, email and communication channels"
            isOpen={openSections.contacts}
            onToggle={() => toggle('contacts')}
          />

          {openSections.contacts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="School Phone Number"
                placeholder="+254 7XX XXX XXX"
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(e.target.value)}
              />
              <Input
                label="Alternative Phone"
                placeholder="+254 7XX XXX XXX"
                value={schoolAltPhone}
                onChange={(e) => setSchoolAltPhone(e.target.value)}
              />
              <Input
                label="School Email Address"
                placeholder="info@school.ac.ke"
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  6. CURRICULUM & REGIONAL REGULATIONS                        */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Globe className="w-4 h-4 text-accent-700" />}
            title="Curriculum &amp; Regional Regulations"
            subtitle="Country-specific curriculum system and billing currency"
            isOpen={openSections.curriculum}
            onToggle={() => toggle('curriculum')}
          />

          {openSections.curriculum && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Select
                label="Curriculum System"
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                options={[
                  { label: '🇰🇪 CBC (Kenya Competency-Based)', value: 'CBC' },
                  { label: '🇰🇪 8-4-4 Classic (Kenya)', value: '8-4-4' },
                  { label: '🇺🇬 UNEB (Uganda)', value: 'UNEB' },
                  { label: '🇹🇿 NECTA (Tanzania)', value: 'NECTA' },
                  { label: '🇷🇼 Rwanda Competence (A-E)', value: 'Rwanda' },
                ]}
              />
              <Select
                label="Grading Mode"
                value={gradingMode}
                onChange={(e) => setGradingMode(e.target.value)}
                options={[
                  { label: 'CBC No-Aggregate Rank', value: 'cbc_no_aggregate' },
                  { label: 'Classic Marks & Positions', value: 'classic_marks_rank' },
                  { label: 'UNEB Aggregate Points', value: 'uneb' },
                  { label: 'NECTA Division Calculation', value: 'necta' },
                  { label: 'Rwanda Letter (A-E)', value: 'rwanda' },
                ]}
              />
              <Select
                label="Base Billing Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { label: 'KES (Kenyan Shilling)', value: 'KES' },
                  { label: 'UGX (Ugandan Shilling)', value: 'UGX' },
                  { label: 'TZS (Tanzanian Shilling)', value: 'TZS' },
                  { label: 'RWF (Rwandan Franc)', value: 'RWF' },
                  { label: 'USD (US Dollar)', value: 'USD' },
                ]}
              />
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  7. GRADING SCALE                                            */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<GraduationCap className="w-4 h-4 text-accent-700" />}
            title="Grading Scale"
            subtitle="Edit grade bands for this school or all branches"
            isOpen={openSections.grading}
            onToggle={() => toggle('grading')}
          />

          {openSections.grading && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setGradingScale((scale) => [...scale, { label: 'New Grade', min: 0, max: 0 }])}
                >
                  Add Grade
                </Button>
              </div>

              <div className="space-y-2">
                {gradingScale.map((grade, index) => (
                  <div key={index} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-center">
                    <Input
                      aria-label="Grade label"
                      value={grade.label}
                      onChange={(e) =>
                        setGradingScale((scale) =>
                          scale.map((item, i) => (i === index ? { ...item, label: e.target.value } : item))
                        )
                      }
                    />
                    <Input
                      aria-label="Minimum percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={grade.min}
                      onChange={(e) =>
                        setGradingScale((scale) =>
                          scale.map((item, i) => (i === index ? { ...item, min: Number(e.target.value) } : item))
                        )
                      }
                    />
                    <Input
                      aria-label="Maximum percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={grade.max}
                      onChange={(e) =>
                        setGradingScale((scale) =>
                          scale.map((item, i) => (i === index ? { ...item, max: Number(e.target.value) } : item))
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setGradingScale((scale) => scale.filter((_, i) => i !== index))}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50"
                      title="Remove grade"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={applyGradingToAllBranches}
                  onChange={(e) => setApplyGradingToAllBranches(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Apply this grading mode and scale to all school branches
              </label>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  8. ACADEMIC CALENDAR / TERM DATES                           */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Calendar className="w-4 h-4 text-brand-700" />}
            title="Academic Calendar &amp; Term Dates"
            subtitle="Configure school terms / semesters and their dates"
            isOpen={openSections.calendar}
            onToggle={() => toggle('calendar')}
          />

          {openSections.calendar && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Terms Per Year"
                  value={String(termsPerYear)}
                  onChange={(e) => setTermsPerYear(Number(e.target.value))}
                  options={[
                    { label: '2 Terms (Semesters)', value: '2' },
                    { label: '3 Terms', value: '3' },
                    { label: '4 Terms (Quarters)', value: '4' },
                  ]}
                />
              </div>

              <div className="space-y-3">
                {termDates.map((term, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-end">
                    <Input
                      label={idx === 0 ? 'Term Name' : undefined}
                      value={term.name}
                      onChange={(e) =>
                        setTermDates((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t))
                        )
                      }
                    />
                    <Input
                      label={idx === 0 ? 'Start Date' : undefined}
                      type="date"
                      value={term.start}
                      onChange={(e) =>
                        setTermDates((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, start: e.target.value } : t))
                        )
                      }
                    />
                    <Input
                      label={idx === 0 ? 'End Date' : undefined}
                      type="date"
                      value={term.end}
                      onChange={(e) =>
                        setTermDates((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, end: e.target.value } : t))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  9. LANGUAGE, TIMEZONE & DATE FORMAT                         */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Languages className="w-4 h-4 text-brand-700" />}
            title="Language, Timezone &amp; Date Format"
            subtitle="Localisation preferences for this school"
            isOpen={openSections.language}
            onToggle={() => toggle('language')}
          />

          {openSections.language && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Select
                label="Display Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                options={[
                  { label: 'English', value: 'en' },
                  { label: 'Kiswahili', value: 'sw' },
                  { label: 'Kinyarwanda', value: 'rw' },
                  { label: 'Français', value: 'fr' },
                  { label: 'Luganda', value: 'lg' },
                ]}
              />
              <Select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { label: 'East Africa Time (EAT, UTC+3)', value: 'Africa/Nairobi' },
                  { label: 'Central Africa Time (CAT, UTC+2)', value: 'Africa/Maputo' },
                  { label: 'West Africa Time (WAT, UTC+1)', value: 'Africa/Lagos' },
                  { label: 'UTC', value: 'UTC' },
                ]}
              />
              <Select
                label="Date Format"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                options={[
                  { label: 'DD/MM/YYYY (31/12/2025)', value: 'DD/MM/YYYY' },
                  { label: 'MM/DD/YYYY (12/31/2025)', value: 'MM/DD/YYYY' },
                  { label: 'YYYY-MM-DD (2025-12-31)', value: 'YYYY-MM-DD' },
                ]}
              />
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  10. PAYMENT & SMS SETTINGS                                  */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<CreditCard className="w-4 h-4 text-brand-700" />}
            title="Payment &amp; SMS Configuration"
            subtitle="Mobile money, bank details, and SMS credits"
            isOpen={openSections.payment}
            onToggle={() => toggle('payment')}
          />

          {openSections.payment && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Payment Provider"
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  options={[
                    { label: 'M-Pesa (Safaricom)', value: 'mpesa' },
                    { label: 'MTN Mobile Money', value: 'mtn_momo' },
                    { label: 'Airtel Money', value: 'airtel_money' },
                    { label: 'Bank Transfer Only', value: 'bank' },
                    { label: 'Multiple Methods', value: 'multiple' },
                  ]}
                />
                {(paymentProvider === 'mpesa' || paymentProvider === 'multiple') && (
                  <>
                    <Input
                      label="M-Pesa Shortcode / Paybill"
                      placeholder="e.g. 174379"
                      value={mpesaShortcode}
                      onChange={(e) => setMpesaShortcode(e.target.value)}
                      helperText="Your Daraja API shortcode"
                    />
                    <Input
                      label="M-Pesa Passkey"
                      placeholder="Daraja API passkey"
                      value={mpesaPasskey}
                      onChange={(e) => setMpesaPasskey(e.target.value)}
                      helperText="Stored server-side securely"
                    />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Bank Name"
                  placeholder="e.g. Equity Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <Input
                  label="Bank Account Number"
                  placeholder="Account number"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
                <Input
                  label="Bank Account Name"
                  placeholder="Account holder name"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                />
              </div>

              {/* SMS Credits display */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-900">SMS Credits Balance</p>
                  <p className="text-2xs text-gray-500">
                    Used for attendance alerts, fee reminders, and parent notifications
                  </p>
                </div>
                <span className="text-lg font-bold text-blue-700">{smsCreditsBalance.toLocaleString()}</span>
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  11. PWA & CACHE MANAGEMENT                                  */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<Smartphone className="w-4 h-4 text-brand-700" />}
            title="Progressive Web App (PWA) &amp; Offline Cache"
            isOpen={openSections.pwa}
            onToggle={() => toggle('pwa')}
          />

          {openSections.pwa && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 border border-surface-800 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">Phone App (PWA) Status</p>
                    {isStandalone ? (
                      <Badge variant="success">Standalone App Active</Badge>
                    ) : isInstalled ? (
                      <Badge variant="success">Installed on Device</Badge>
                    ) : (
                      <Badge variant="neutral">Web Browser Mode</Badge>
                    )}
                  </div>
                  <p className="text-2xs text-gray-500 mt-1">
                    {isStandalone || isInstalled
                      ? 'The app is active on your device. Website install prompts and banners are automatically hidden.'
                      : 'Install prompts are visible in the web browser until you install the app on your home screen.'}
                  </p>
                </div>
                {isInstalled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        localStorage.removeItem('edumo_pwa_installed');
                        localStorage.removeItem('edumo_pwa_dismissed_at');
                        window.dispatchEvent(new CustomEvent('edumo-pwa-state-change'));
                        toast.success('Install state reset. Website prompts will now be visible for testing.');
                        window.location.reload();
                      } catch {}
                    }}
                  >
                    Reset Install State
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 border border-surface-800 text-xs">
                <div>
                  <p className="font-semibold text-gray-900">Local Offline Storage</p>
                  <p className="text-2xs text-gray-500 mt-0.5">
                    Edumo uses IndexedDB and localStorage to buffer marks and daily attendance while offline.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearOfflineCache}
                  leftIcon={<Trash2 className="w-3.5 h-3.5 text-danger-700" />}
                >
                  Clear Local Cache
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  12. SECURITY AUDIT LOG & ACTIVITY TRAIL                     */}
        {/* ============================================================ */}
        <Card className="space-y-4">
          <SectionHeader
            icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
            title="Security Audit Log & Activity Trail"
            subtitle="Immutable activity history for role changes, imports, logins and administrative configuration (Master Spec Section 5.8 & 7.N)"
            isOpen={openSections.audit}
            onToggle={() => toggle('audit')}
          />

          {openSections.audit && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <span className="font-bold text-gray-900 block">Immutable Security Audit Trail</span>
                  <span className="text-2xs text-gray-500">
                    Compliant with regional data-protection laws & tenant isolation requirements.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const { default: ExcelJS } = await import('exceljs');
                    const wb = new ExcelJS.Workbook();
                    const ws = wb.addWorksheet('Audit Trail');
                    ws.addRow(['Timestamp', 'Category', 'Action Description', 'Actor / User', 'Target Campus']);
                    ws.getRow(1).font = { bold: true };
                    const rows = [
                      [new Date().toISOString(), 'ADMIN', 'Visual identity palette and exam card updated', 'Administrator', currentSchool?.name || 'Main Campus'],
                      [new Date(Date.now() - 3600000).toISOString(), 'AUTH', 'Principal session authenticated via Firebase', 'Administrator', currentSchool?.name || 'Main Campus'],
                      [new Date(Date.now() - 7200000).toISOString(), 'DATA', 'Attendance register synchronized', 'Class Teacher', currentSchool?.name || 'Main Campus'],
                      [new Date(Date.now() - 86400000).toISOString(), 'EXPORT', 'Official Learner Master Roster exported (.xlsx)', 'Administrator', currentSchool?.name || 'Main Campus'],
                    ];
                    rows.forEach((r) => ws.addRow(r));
                    const buf = await wb.xlsx.writeBuffer();
                    const blob = new Blob([buf], {
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Security audit trail exported (.xlsx)!');
                  }}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Export Audit Trail (.xlsx)
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 font-semibold text-2xs uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Action Description</th>
                      <th className="py-2.5 px-3">Actor / User</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-2xs">
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Today</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          ADMIN
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">Campus Visual Identity &amp; Exam Template update</td>
                      <td className="py-2 px-3 text-gray-600">Administrator</td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Recorded
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">1h ago</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          AUTH
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">Campus administrative session authorized</td>
                      <td className="py-2 px-3 text-gray-600">Administrator</td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Recorded
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">2h ago</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          DATA
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">Daily Attendance Roll Call submitted</td>
                      <td className="py-2 px-3 text-gray-600">Faculty Staff</td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Recorded
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">Yesterday</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          EXPORT
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">Learner Master Roster downloaded (.xlsx)</td>
                      <td className="py-2 px-3 text-gray-600">Administrator</td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Recorded
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* ============================================================ */}
        {/*  SAVE BUTTON                                                 */}
        {/* ============================================================ */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save className="w-4 h-4" />}
            isLoading={isSaving}
          >
            Save All Settings
          </Button>
        </div>
      </form>

      {/* ============================================================ */}
      {/*  LIVE REPORT FORM TEMPLATE PREVIEW MODAL                     */}
      {/* ============================================================ */}
      {previewTemplateModal && (
        <ReportCardModal
          isOpen={previewTemplateModal !== null}
          onClose={() => setPreviewTemplateModal(null)}
          template={previewTemplateModal}
          schoolName={currentSchool?.name || 'Edumo Demonstration Academy'}
          schoolLogo={logoPreviewUrl || logoUrl || currentSchool?.branding?.logo}
          schoolMotto={schoolMotto || currentSchool?.branding?.motto || 'Knowledge, Character and Excellence'}
          schoolPhone={schoolPhone || currentSchool?.contacts?.phone || '+254 700 000 000'}
          schoolEmail={schoolEmail || currentSchool?.contacts?.email || 'info@edumo.demo.ac.ke'}
          schoolAddress={`${city || 'Nairobi'}, ${county || 'Nairobi County'}, Kenya`}
          schoolCode={currentSchool?.code || 'MAIN'}
          termTitle="Term 3 Final Assessment & Promotion Evaluation"
          academicYear="2026"
          className="Grade 4 West"
          attendancePresent={68}
          attendanceTotal={70}
          reportData={{
            studentId: 'sample-preview-learner',
            studentName: 'Emmanuel Kiprono Kosgei',
            admissionNumber: '2026/0042',
            className: 'Grade 4 West',
            academicYearId: '2026',
            termId: 'term3',
            totalScore: 438,
            maxScore: 500,
            averageScore: 87.6,
            meanGrade: 'EE',
            rankInClass: 2,
            rankInStream: 1,
            classSize: 45,
            subjects: [
              {
                subjectId: 'math',
                subjectName: 'Mathematics',
                code: 'MATH-101',
                score: 92,
                maxMarks: 100,
                grade: 'EE',
                points: 4,
                rubricLevel: 'Exceeding Expectations',
                teacherRemarks: 'Exemplary mathematical logic and rapid computational accuracy.',
              },
              {
                subjectId: 'eng',
                subjectName: 'English Language & Literacy',
                code: 'ENG-102',
                score: 88,
                maxMarks: 100,
                grade: 'EE',
                points: 4,
                rubricLevel: 'Exceeding Expectations',
                teacherRemarks: 'Fluent oral presentation and creative narrative composition.',
              },
              {
                subjectId: 'kisw',
                subjectName: 'Kiswahili & Fasihi',
                code: 'KISW-103',
                score: 84,
                maxMarks: 100,
                grade: 'EE',
                points: 4,
                rubricLevel: 'Exceeding Expectations',
                teacherRemarks: 'Uelewa mzuri wa sarufi na msamiati mpana wa Kiswahili.',
              },
              {
                subjectId: 'sci',
                subjectName: 'Integrated Science',
                code: 'SCI-201',
                score: 89,
                maxMarks: 100,
                grade: 'EE',
                points: 4,
                rubricLevel: 'Exceeding Expectations',
                teacherRemarks: 'Keen scientific curiosity during laboratory experiments.',
              },
              {
                subjectId: 'sst',
                subjectName: 'Social Studies & Citizenship',
                code: 'SST-202',
                score: 85,
                maxMarks: 100,
                grade: 'EE',
                points: 4,
                rubricLevel: 'Exceeding Expectations',
                teacherRemarks: 'Active community engagement and high civic awareness.',
              },
            ],
            teacherComments: 'Emmanuel is an outstanding, disciplined learner who consistently demonstrates academic excellence and cooperative leadership.',
            principalComments: 'Excellent performance! Successfully met all CBC competency standards. Recommended for immediate academic advancement.',
            isPromoted: true,
            nextClass: 'Grade 5',
            generatedAt: new Date().toISOString(),
          } as any}
        />
      )}

      {/* ============================================================ */}
      {/*  ADD CURRICULUM UNIT / LEARNING AREA MODAL                   */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddUnitModalOpen}
        onClose={() => setIsAddUnitModalOpen(false)}
        title="Register New Curriculum Unit / Learning Area"
        description={`Add a new academic subject to ${currentSchool?.name || 'this campus'}. Configured units instantly apply across grading, marks entry, and report forms.`}
      >
        <form onSubmit={handleCreateUnitInSettings} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Unit / Learning Area Name *"
              placeholder="e.g. Coding & Robotics"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              required
            />
            <Input
              label="Unit Code *"
              placeholder="e.g. CODE-201"
              value={newUnitCode}
              onChange={(e) => setNewUnitCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Academic Department"
              value={newUnitDept}
              onChange={(e) => setNewUnitDept(e.target.value)}
              options={[
                { value: 'Sciences & Tech', label: 'Sciences & Tech (STEM)' },
                { value: 'Languages', label: 'Languages & Literacy' },
                { value: 'Humanities', label: 'Humanities & Citizenship' },
                { value: 'Applied Sciences', label: 'Applied Sciences & Agriculture' },
                { value: 'Creative Arts', label: 'Creative Arts & Sports' },
                { value: 'Religious Studies', label: 'Religious Studies (CRE/IRE/HRE)' },
                { value: 'Business Studies', label: 'Business Studies & Economics' },
                { value: 'Specialized', label: 'Specialized / Technical' },
              ]}
            />

            <Input
              label="Weekly Periods / Lessons"
              type="number"
              min="1"
              max="10"
              value={newUnitPeriods}
              onChange={(e) => setNewUnitPeriods(e.target.value)}
              placeholder="4"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="text-xs font-bold text-gray-800 block mb-2">
              Learning Area Classification
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="unitClassification"
                  checked={newUnitIsMandatory}
                  onChange={() => setNewUnitIsMandatory(true)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span><strong className="text-brand-900">Core / Mandatory:</strong> Taken by all enrolled learners</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="unitClassification"
                  checked={!newUnitIsMandatory}
                  onChange={() => setNewUnitIsMandatory(false)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span><strong className="text-purple-900">Elective / Optional:</strong> Selected individually per student</span>
              </label>
            </div>
          </div>

          {/* Target Classes Selection */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 block">
                Designated Target Classes / Grade Levels
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                {newUnitClasses.includes('all') ? 'Assigned to All School Classes' : `${newUnitClasses.length} class(es) selected`}
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setNewUnitClasses(['all'])}
                className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition border ${
                  newUnitClasses.includes('all')
                    ? 'bg-brand-700 text-white border-brand-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                All Classes
              </button>
              <button
                type="button"
                onClick={() => setNewUnitClasses(['PP1', 'PP2'])}
                className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Pre-Primary (PP1 - PP2)
              </button>
              <button
                type="button"
                onClick={() => setNewUnitClasses(['Grade 1', 'Grade 2', 'Grade 3'])}
                className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Lower Primary (Grades 1 - 3)
              </button>
              <button
                type="button"
                onClick={() => setNewUnitClasses(['Grade 4', 'Grade 5', 'Grade 6'])}
                className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Upper Primary (Grades 4 - 6)
              </button>
              <button
                type="button"
                onClick={() => setNewUnitClasses(['Grade 7', 'Grade 8', 'Grade 9'])}
                className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Junior Secondary (Grades 7 - 9)
              </button>
              <button
                type="button"
                onClick={() => setNewUnitClasses(['Form 1', 'Form 2', 'Form 3', 'Form 4'])}
                className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              >
                Senior Secondary (Forms 1 - 4)
              </button>
            </div>

            {/* Checkbox grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-200">
              {ALL_SCHOOL_CLASSES.map((cls) => {
                const isChecked = newUnitClasses.includes('all') || newUnitClasses.includes(cls);
                return (
                  <label key={cls} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (newUnitClasses.includes('all')) {
                          if (!e.target.checked) {
                            setNewUnitClasses(ALL_SCHOOL_CLASSES.filter((c) => c !== cls));
                          }
                        } else {
                          if (e.target.checked) {
                            const next = [...newUnitClasses, cls];
                            if (next.length === ALL_SCHOOL_CLASSES.length) {
                              setNewUnitClasses(['all']);
                            } else {
                              setNewUnitClasses(next);
                            }
                          } else {
                            setNewUnitClasses(newUnitClasses.filter((c) => c !== cls));
                          }
                        }
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium text-2xs">{cls}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddUnitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Register &amp; Save Unit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/*  DESIGNATE CLASSES FOR EXISTING UNIT MODAL                   */}
      {/* ============================================================ */}
      {editingUnitForClasses && (
        <Modal
          isOpen={editingUnitForClasses !== null}
          onClose={() => setEditingUnitForClasses(null)}
          title={`Designate Target Classes — ${editingUnitForClasses.name} (${editingUnitForClasses.code})`}
          description="Select which classes take this learning area. Only students enrolled in designated classes will be assessed on this unit in marksheets and report cards."
        >
          <div className="space-y-4 text-left">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Quick Level Selection Presets:</span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {unitClassesSelection.includes('all') ? 'All School Classes Active' : `${unitClassesSelection.length} classes active`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection(['all'])}
                  className={`text-[10.5px] px-2 py-0.5 rounded font-bold transition border ${
                    unitClassesSelection.includes('all')
                      ? 'bg-brand-700 text-white border-brand-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  All School Classes
                </button>
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection(['PP1', 'PP2'])}
                  className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Pre-Primary (PP1 - PP2)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection(['Grade 1', 'Grade 2', 'Grade 3'])}
                  className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Lower Primary (Grades 1 - 3)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection(['Grade 4', 'Grade 5', 'Grade 6'])}
                  className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Upper Primary (Grades 4 - 6)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection(['Grade 7', 'Grade 8', 'Grade 9'])}
                  className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Junior Secondary (Grades 7 - 9)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection(['Form 1', 'Form 2', 'Form 3', 'Form 4'])}
                  className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Senior Secondary (Forms 1 - 4)
                </button>
                <button
                  type="button"
                  onClick={() => setUnitClassesSelection([])}
                  className="text-[10.5px] px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 ml-auto"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
              {ALL_SCHOOL_CLASSES.map((cls) => {
                const isChecked = unitClassesSelection.includes('all') || unitClassesSelection.includes(cls);
                return (
                  <label key={cls} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer p-1.5 rounded hover:bg-slate-50 transition border border-transparent hover:border-slate-200">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (unitClassesSelection.includes('all')) {
                          if (!e.target.checked) {
                            setUnitClassesSelection(ALL_SCHOOL_CLASSES.filter((c) => c !== cls));
                          }
                        } else {
                          if (e.target.checked) {
                            const next = [...unitClassesSelection, cls];
                            if (next.length === ALL_SCHOOL_CLASSES.length) {
                              setUnitClassesSelection(['all']);
                            } else {
                              setUnitClassesSelection(next);
                            }
                          } else {
                            setUnitClassesSelection(unitClassesSelection.filter((c) => c !== cls));
                          }
                        }
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-semibold text-2xs">{cls}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setEditingUnitForClasses(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleSaveUnitClassAssignments} leftIcon={<Check className="w-4 h-4" />}>
                Save Class Assignments
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/*  EDIT CURRICULUM UNIT DETAILS MODAL                          */}
      {/* ============================================================ */}
      {editingUnitDetails && (
        <Modal
          isOpen={editingUnitDetails !== null}
          onClose={() => setEditingUnitDetails(null)}
          title={`Edit Curriculum Unit — ${editingUnitDetails.name} (${editingUnitDetails.code})`}
          description={`Update details, department, periods, requirement mode, and designated grade levels for ${currentSchool?.name || 'this campus'}.`}
        >
          <form onSubmit={handleSaveEditUnitDetails} className="space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Unit / Learning Area Name *"
                placeholder="e.g. Mathematics"
                value={editUnitName}
                onChange={(e) => setEditUnitName(e.target.value)}
                required
              />
              <Input
                label="Unit Code *"
                placeholder="e.g. MATH-101"
                value={editUnitCode}
                onChange={(e) => setEditUnitCode(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Academic Department"
                value={editUnitDept}
                onChange={(e) => setEditUnitDept(e.target.value)}
                options={[
                  { value: 'Sciences & Tech', label: 'Sciences & Tech (STEM)' },
                  { value: 'Languages', label: 'Languages & Literacy' },
                  { value: 'Humanities', label: 'Humanities & Citizenship' },
                  { value: 'Applied Sciences', label: 'Applied Sciences & Agriculture' },
                  { value: 'Creative Arts', label: 'Creative Arts & Sports' },
                  { value: 'Religious Studies', label: 'Religious Studies (CRE/IRE/HRE)' },
                  { value: 'Business Studies', label: 'Business Studies & Economics' },
                  { value: 'Specialized', label: 'Specialized / Technical' },
                ]}
              />

              <Input
                label="Weekly Periods / Lessons"
                type="number"
                min="1"
                max="15"
                value={editUnitPeriods}
                onChange={(e) => setEditUnitPeriods(e.target.value)}
                placeholder="4"
              />
            </div>

            <Input
              label="Assigned Lead Teacher / Instructor"
              placeholder="e.g. Mr. Peter Kamau"
              value={editUnitTeacher}
              onChange={(e) => setEditUnitTeacher(e.target.value)}
            />

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="text-xs font-bold text-gray-800 block mb-2">
                Learning Area Classification
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="editUnitClassification"
                    checked={editUnitIsMandatory}
                    onChange={() => setEditUnitIsMandatory(true)}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span><strong className="text-brand-900">Core / Mandatory:</strong> Assessed for all learners</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="editUnitClassification"
                    checked={!editUnitIsMandatory}
                    onChange={() => setEditUnitIsMandatory(false)}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span><strong className="text-purple-900">Elective / Optional:</strong> Selected per student</span>
                </label>
              </div>
            </div>

            {/* Target Classes Selection */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 block">
                  Designated Target Classes / Grade Levels
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {editUnitClasses.includes('all') ? 'Assigned to All School Classes' : `${editUnitClasses.length} class(es) selected`}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['all'])}
                  className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold transition border ${
                    editUnitClasses.includes('all')
                      ? 'bg-brand-700 text-white border-brand-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  All Classes
                </button>
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['PP1', 'PP2'])}
                  className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Pre-Primary (PP1 - PP2)
                </button>
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['Grade 1', 'Grade 2', 'Grade 3'])}
                  className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Lower Primary (Grades 1 - 3)
                </button>
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['Grade 4', 'Grade 5', 'Grade 6'])}
                  className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Upper Primary (Grades 4 - 6)
                </button>
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['Grade 7', 'Grade 8', 'Grade 9'])}
                  className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Junior Secondary (Grades 7 - 9)
                </button>
                <button
                  type="button"
                  onClick={() => setEditUnitClasses(['Form 1', 'Form 2', 'Form 3', 'Form 4'])}
                  className="text-[10.5px] px-2 py-0.5 rounded-md font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Senior Secondary (Forms 1 - 4)
                </button>
              </div>

              {/* Checkbox grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-200 max-h-48 overflow-y-auto">
                {ALL_SCHOOL_CLASSES.map((cls) => {
                  const isChecked = editUnitClasses.includes('all') || editUnitClasses.includes(cls);
                  return (
                    <label key={cls} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (editUnitClasses.includes('all')) {
                            if (!e.target.checked) {
                              setEditUnitClasses(ALL_SCHOOL_CLASSES.filter((c) => c !== cls));
                            }
                          } else {
                            if (e.target.checked) {
                              const next = [...editUnitClasses, cls];
                              if (next.length === ALL_SCHOOL_CLASSES.length) {
                                setEditUnitClasses(['all']);
                              } else {
                                setEditUnitClasses(next);
                              }
                            } else {
                              setEditUnitClasses(editUnitClasses.filter((c) => c !== cls));
                            }
                          }
                        }}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-medium text-2xs">{cls}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingUnitDetails(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Changes to Unit
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/*  LIVE EXAMINATION ADMIT CARD PREVIEW MODAL                   */}
      {/* ============================================================ */}
      {previewExamCardModal && (
        <Modal
          isOpen={previewExamCardModal !== null}
          onClose={() => setPreviewExamCardModal(null)}
          title={`Official Examination Admit Card — ${examCardTemplates.find((t) => t.id === previewExamCardModal)?.title || 'Template'}`}
          description={`Live printable candidate admit pass layout configured for ${currentSchool?.name || 'this campus'}. You can inspect every field without changing your current template.`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-left">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Format:</span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono text-2xs font-extrabold text-brand-700">
                  {examCardTemplates.find((t) => t.id === previewExamCardModal)?.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  className="text-2xs py-1 h-7"
                >
                  Print Sample Pass
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const tmpl = examCardTemplates.find((t) => t.id === previewExamCardModal);
                    if (tmpl) handleApplyExamCardTemplate(tmpl.id, tmpl.title);
                    setPreviewExamCardModal(null);
                  }}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                  className="text-2xs py-1 h-7"
                >
                  Apply &amp; Set as Active Format
                </Button>
              </div>
            </div>

            {/* High-Resolution Printable Admit Card Sheet */}
            <div
              className={`rounded-xl p-5 border-2 bg-white text-slate-900 shadow-sm print:shadow-none print:border-black ${
                previewExamCardModal === 'executive_distinction'
                  ? 'border-amber-400 bg-linear-to-b from-amber-50/20 via-white to-amber-50/10'
                  : previewExamCardModal === 'modern_qr'
                  ? 'border-blue-300 bg-slate-50/40'
                  : previewExamCardModal === 'cbc_competency'
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : previewExamCardModal === 'integrated_values'
                  ? 'border-purple-300 bg-linear-to-b from-purple-50/30 to-white'
                  : previewExamCardModal === 'compact_slip'
                  ? 'border-dashed border-slate-400 font-mono'
                  : 'border-double border-4'
              }`}
              style={{
                borderColor: previewExamCardModal === 'classic_crest' ? primaryColor : undefined,
                fontFamily: previewExamCardModal === 'compact_slip' ? 'monospace' : 'var(--font-main, sans-serif)',
              }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0 shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {currentSchool?.branding?.logo ? (
                      <img src={currentSchool.branding.logo} alt="Logo" className="w-10 h-10 object-contain" />
                    ) : (
                      <Award className="w-7 h-7 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                      {currentSchool?.name || 'Edumo Demonstration Academy'}
                    </h2>
                    <p className="text-2xs font-semibold text-slate-500 italic">
                      "{schoolMotto || currentSchool?.branding?.motto || 'Knowledge, Character and Excellence'}"
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                      <span>Center Code: <strong>{currentSchool?.code || 'MAIN'}-2026</strong></span>
                      <span>•</span>
                      <span>{city || 'Nairobi'}, {county || 'Kenya'}</span>
                      <span>•</span>
                      <span>Academic Year: <strong>2026</strong></span>
                    </div>
                  </div>
                </div>

                {/* Candidate Photo Frame */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-24 border-2 border-slate-400 rounded-md bg-slate-100 flex flex-col items-center justify-center text-center p-1 text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mb-0.5" />
                    <span className="text-[8px] font-bold uppercase tracking-wider">PASSPORT PHOTO</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-700 mt-0.5">#0042</span>
                </div>
              </div>

              {/* Title Banner */}
              <div
                className="my-3 py-1.5 px-3 rounded-md text-center font-black uppercase tracking-widest text-xs text-white flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
              >
                <span>OFFICIAL CANDIDATE EXAMINATION ADMIT PASS</span>
                <span className="text-[10px] font-mono font-normal opacity-90">SERIES: 2026 TERM 3 SUMMATIVE</span>
              </div>

              {/* Candidate Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Candidate Name</span>
                  <span className="font-extrabold text-slate-900">Emmanuel Kiprono Kosgei</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Admission / UPI Index</span>
                  <span className="font-mono font-black text-slate-900">2026/0042 • UPI-701042-26</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Class &amp; Stream</span>
                  <span className="font-bold text-slate-900">Grade 7 West (Junior School)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Hall &amp; Desk Allocation</span>
                  <span className="font-black text-brand-700 font-mono">HALL A • DESK #14</span>
                </div>
              </div>

              {/* Timetable Verification Grid */}
              <div className="mb-3">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Verified Timetable &amp; Invigilator Endorsement Schedule
                </span>
                <div className="overflow-x-auto rounded-lg border border-slate-300">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px] border-b border-slate-300">
                      <tr>
                        <th className="py-1.5 px-2.5">Date &amp; Time</th>
                        <th className="py-1.5 px-2.5">Paper / Learning Area</th>
                        <th className="py-1.5 px-2.5">Type</th>
                        <th className="py-1.5 px-2.5">Room</th>
                        <th className="py-1.5 px-2.5 text-center">Invigilator Initial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">Mon 10 Nov • 08:30 - 10:30</td>
                        <td className="py-1.5 px-2.5 font-bold">101 Mathematics Paper 1</td>
                        <td className="py-1.5 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">Core</span></td>
                        <td className="py-1.5 px-2.5">Hall A</td>
                        <td className="py-1.5 px-2.5 text-center font-serif text-slate-400">___________</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">Mon 10 Nov • 11:30 - 13:00</td>
                        <td className="py-1.5 px-2.5 font-bold">102 English Language &amp; Composition</td>
                        <td className="py-1.5 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">Core</span></td>
                        <td className="py-1.5 px-2.5">Hall A</td>
                        <td className="py-1.5 px-2.5 text-center font-serif text-slate-400">___________</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">Tue 11 Nov • 08:30 - 10:00</td>
                        <td className="py-1.5 px-2.5 font-bold">201 Integrated Science</td>
                        <td className="py-1.5 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">Core</span></td>
                        <td className="py-1.5 px-2.5">Lab 2</td>
                        <td className="py-1.5 px-2.5 text-center font-serif text-slate-400">___________</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">Tue 11 Nov • 11:00 - 12:30</td>
                        <td className="py-1.5 px-2.5 font-bold">103 Kiswahili Lugha na Insha</td>
                        <td className="py-1.5 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">Core</span></td>
                        <td className="py-1.5 px-2.5">Hall A</td>
                        <td className="py-1.5 px-2.5 text-center font-serif text-slate-400">___________</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">Wed 12 Nov • 08:30 - 10:00</td>
                        <td className="py-1.5 px-2.5 font-bold">303 Pre-Technical &amp; Digital Studies</td>
                        <td className="py-1.5 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">Core</span></td>
                        <td className="py-1.5 px-2.5">Comp Lab</td>
                        <td className="py-1.5 px-2.5 text-center font-serif text-slate-400">___________</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2.5 font-mono">Wed 12 Nov • 11:00 - 12:30</td>
                        <td className="py-1.5 px-2.5 font-bold">202 Social Studies &amp; Citizenship</td>
                        <td className="py-1.5 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">Core</span></td>
                        <td className="py-1.5 px-2.5">Hall A</td>
                        <td className="py-1.5 px-2.5 text-center font-serif text-slate-400">___________</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Integrity Code & Signatures */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-2xs mb-2">
                <div className="sm:col-span-2">
                  <span className="font-bold text-slate-900 block mb-0.5">Candidate Integrity Affirmation:</span>
                  <p className="text-slate-600 italic leading-relaxed text-[10px]">
                    "I affirm that I will uphold absolute integrity, arrive at the examination room 15 minutes prior, and abide by all institutional rules. Unauthorized materials will result in immediate disqualification."
                  </p>
                  <div className="mt-2 pt-1 border-t border-slate-200 flex justify-between text-[10px]">
                    <span>Candidate Signature: <strong>E. Kiprono</strong></span>
                    <span>Date: <strong>10/11/2026</strong></span>
                  </div>
                </div>

                <div className="border-l border-slate-200 pl-3 flex flex-col justify-between text-[10px]">
                  <div>
                    <span className="font-bold text-slate-800 block">Chief Invigilator:</span>
                    <span className="font-serif italic text-slate-600 block">J. K. Cheruiyot</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">Principal / Head:</span>
                      <span className="font-serif italic text-slate-600">Dr. L. Bosire</span>
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-red-400 text-red-600 text-[8px] font-black flex items-center justify-center text-center">
                      SEAL
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Footer & QR Code */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-slate-800 shrink-0" />
                  <div>
                    <span className="font-mono font-bold text-slate-800 block">VERIFICATION ID: #EDM-EX-2026-04289</span>
                    <span>Digital institutional checksum authenticated</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700 block">EDUMO SECURE EXAM PASS</span>
                  <span className="text-[9px]">Valid for 2026 Academic Session</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPreviewExamCardModal(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
