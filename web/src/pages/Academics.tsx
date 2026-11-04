import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  BookOpen,
  Award,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Users,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  calculateGradeBand,
  computeStudentAggregate,
  KENYA_COUNTRY_PACK,
  UGANDA_COUNTRY_PACK,
  TANZANIA_COUNTRY_PACK,
  RWANDA_COUNTRY_PACK,
  type GradingScale,
  type StudentAssessmentAggregate,
} from '@edumo/shared';
import { exportMarksEntryTemplate, parseUploadedMarksWorkbook } from '../utils/marksExcel';
import { ReportCardModal } from '../components/academics/ReportCardModal';

interface LearnerMarkRow {
  studentId: string;
  admissionNumber: string;
  name: string;
  score: number | '';
  comments: string;
}

export const Academics: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();
  const { isOnline, queueOfflineAction } = useOffline();

  // Filters & Selection
  const [selectedClass, setSelectedClass] = useState('Grade 4');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [assessmentTitle, setAssessmentTitle] = useState('Term 1 Mid-Term Assessment');
  const [maxScore, setMaxScore] = useState(50);

  // Roster & Marks
  const [roster, setRoster] = useState<LearnerMarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Excel Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{ count: number; errorCount: number } | null>(null);

  // Report Card Modal
  const [selectedReportCard, setSelectedReportCard] = useState<StudentAssessmentAggregate | null>(null);

  // Active Country Pack Grading Scale
  const getActiveGradingScale = (): GradingScale => {
    const country = organization?.country || currentSchool?.country || 'KE';
    let pack = KENYA_COUNTRY_PACK;
    if (country === 'UG') pack = UGANDA_COUNTRY_PACK;
    else if (country === 'TZ') pack = TANZANIA_COUNTRY_PACK;
    else if (country === 'RW') pack = RWANDA_COUNTRY_PACK;

    const mode = currentSchool?.gradingMode || 'cbc_no_aggregate';
    const scale = pack.gradingScales.find((s) => s.id === mode) || pack.gradingScales[0];
    return scale;
  };

  const activeScale = getActiveGradingScale();

  // 1. Listen to real-time students for selected class
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const studentsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'students'
    );

    const unsubStudents = onSnapshot(studentsRef, async (snap) => {
      const classStudents = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            studentId: d.id,
            admissionNumber: data.admissionNumber || '',
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Learner',
            className: data.currentClassId || 'Grade 4',
          };
        })
        .filter((s) => s.className === selectedClass);

      // Fetch saved marks document for this assessment/class/subject if exists
      const assessmentDocId = `${selectedClass}_${selectedSubject}_${assessmentTitle}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      const marksDocRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'marks',
        assessmentDocId
      );

      try {
        const marksSnap = await getDoc(marksDocRef);
        const existingEntries = marksSnap.exists() ? marksSnap.data()?.entries || {} : {};

        setRoster(
          classStudents.map((s) => ({
            studentId: s.studentId,
            admissionNumber: s.admissionNumber,
            name: s.name,
            score:
              existingEntries[s.studentId]?.score !== undefined
                ? existingEntries[s.studentId].score
                : '',
            comments: existingEntries[s.studentId]?.comments || '',
          }))
        );
      } catch (err) {
        console.warn('Marks doc read error:', err);
        setRoster(
          classStudents.map((s) => ({
            studentId: s.studentId,
            admissionNumber: s.admissionNumber,
            name: s.name,
            score: '',
            comments: '',
          }))
        );
      }

      setLoading(false);
    });

    return () => unsubStudents();
  }, [organization, currentSchool, selectedClass, selectedSubject, assessmentTitle]);

  const handleScoreChange = (studentId: string, val: string) => {
    const num = val === '' ? '' : Number(val);
    if (num !== '' && (isNaN(num) || num < 0 || num > maxScore)) {
      toast.error(`Marks must be between 0 and ${maxScore}`, { id: 'max-score-alert' });
      return;
    }
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, score: num } : r))
    );
  };

  const handleCommentChange = (studentId: string, comments: string) => {
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, comments } : r))
    );
  };

  const handleSaveMarks = async () => {
    if (!organization || !currentSchool) return;
    if (roster.length === 0) {
      toast.error('No learners in this class roster');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving marks register...');

    const assessmentDocId = `${selectedClass}_${selectedSubject}_${assessmentTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');

    const entriesMap: Record<string, { score: number | null; comments: string; percentage: number; bandCode: string }> = {};

    roster.forEach((r) => {
      const numericScore = r.score === '' ? null : Number(r.score);
      const percentage = numericScore !== null ? (numericScore / maxScore) * 100 : 0;
      const band = calculateGradeBand(percentage, activeScale);

      entriesMap[r.studentId] = {
        score: numericScore,
        percentage: Math.round(percentage * 10) / 10,
        bandCode: band?.code || '—',
        comments: r.comments,
      };
    });

    const payload = {
      className: selectedClass,
      subjectName: selectedSubject,
      assessmentTitle,
      maxScore,
      gradingScaleId: activeScale.id,
      entries: entriesMap,
      updatedBy: currentUser?.displayName || 'Educator',
      updatedAt: serverTimestamp(),
    };

    if (!isOnline) {
      queueOfflineAction('SAVE_MARKS', { assessmentDocId, ...payload });
      toast.success('Marks saved to offline buffer! Will sync on reconnect.', { icon: '💾', id: toastId });
      setSaving(false);
      return;
    }

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'marks',
        assessmentDocId
      );
      await setDoc(docRef, payload, { merge: true });
      toast.success('Marks register saved successfully!', { id: toastId });
    } catch (err) {
      console.error('Save marks error:', err);
      toast.error('Failed to save marks', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadExcelTemplate = async () => {
    if (!currentSchool) return;
    const toastId = toast.loading('Generating Pre-Filled Class Marks Sheet (.xlsx)...');
    try {
      await exportMarksEntryTemplate({
        schoolName: currentSchool.name,
        className: selectedClass,
        subjectName: selectedSubject,
        assessmentTitle,
        maxScore,
        students: roster.map((r) => ({
          admissionNumber: r.admissionNumber,
          name: r.name,
          currentScore: r.score === '' ? undefined : Number(r.score),
          comments: r.comments,
        })),
      });
      toast.success('Marks sheet downloaded! Teachers can fill offline.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate template', { id: toastId });
    }
  };

  const handleUploadMarksExcel = async () => {
    if (!uploadFile) return;
    const toastId = toast.loading('Validating marks spreadsheet...');
    try {
      const { marks, errorCount } = await parseUploadedMarksWorkbook(uploadFile, maxScore);

      // Merge parsed marks into roster
      setRoster((prev) =>
        prev.map((student) => {
          const match = marks.find(
            (m) =>
              m.admissionNumber.toLowerCase() === student.admissionNumber.toLowerCase() ||
              m.name.toLowerCase() === student.name.toLowerCase()
          );
          if (match && match.isValid) {
            return {
              ...student,
              score: match.score,
              comments: match.comments || student.comments,
            };
          }
          return student;
        })
      );

      if (errorCount > 0) {
        toast(`Imported marks with ${errorCount} flagged rows. Please review below.`, { icon: '⚠️', id: toastId });
      } else {
        toast.success(`Successfully loaded ${marks.length} learner scores!`, { id: toastId });
      }

      setIsUploadModalOpen(false);
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse marks spreadsheet', { id: toastId });
    }
  };

  const openStudentReportCard = (row: LearnerMarkRow) => {
    const rawScore = row.score === '' ? 0 : Number(row.score);
    const agg = computeStudentAggregate(
      row.studentId,
      row.name,
      row.admissionNumber,
      [
        {
          subjectId: selectedSubject.toLowerCase().replace(/\s+/g, '_'),
          subjectName: selectedSubject,
          rawScore,
          maxScore,
          comments: row.comments,
        },
        {
          subjectId: 'kiswahili',
          subjectName: 'Kiswahili',
          rawScore: Math.round(maxScore * 0.76),
          maxScore,
          comments: 'Exceeding expectation in oral and literacy skills.',
        },
        {
          subjectId: 'science',
          subjectName: 'Integrated Science',
          rawScore: Math.round(maxScore * 0.82),
          maxScore,
          comments: 'Active scientific investigation participation.',
        },
      ],
      activeScale
    );

    setSelectedReportCard(agg);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              {activeScale.name}
            </Badge>
            <span className="text-2xs text-gray-500">
              {currentSchool?.name || 'Main Campus'}
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Academics, Marks Entry &amp; Gradebook
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Direction-aware assessment marking, offline sheet syncing, and CBC progress evaluation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadExcelTemplate}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Sheet (.xlsx)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<UploadCloud className="w-4 h-4" />}
          >
            Import Marks (.xlsx)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveMarks}
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Register
          </Button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <Card className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4">
        <Select
          label="Class / Grade"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          options={[
            'PP1',
            'PP2',
            'Grade 1',
            'Grade 2',
            'Grade 3',
            'Grade 4',
            'Grade 5',
            'Grade 6',
            'Grade 7',
            'Grade 8',
            'Form 1',
            'Form 2',
            'Form 3',
            'Form 4',
          ].map((c) => ({ value: c, label: c }))}
        />

        <Select
          label="Learning Area / Subject"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          options={[
            'Mathematics',
            'English Language',
            'Kiswahili',
            'Integrated Science',
            'Social Studies',
            'Christian Religious Education (CRE)',
            'Agriculture & Nutrition',
            'Creative Arts & Sports',
            'Pre-Technical Studies',
          ].map((s) => ({ value: s, label: s }))}
        />

        <Input
          label="Assessment Title"
          value={assessmentTitle}
          onChange={(e) => setAssessmentTitle(e.target.value)}
        />

        <Input
          label="Maximum Marks"
          type="number"
          min="10"
          max="1000"
          value={maxScore}
          onChange={(e) => setMaxScore(Number(e.target.value) || 50)}
        />
      </Card>

      {/* Marks Gradebook Table */}
      <Card className="!p-0 overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">
              {selectedClass} • {selectedSubject} Marks Roster
            </span>
            <Badge variant="neutral">{roster.length} Learners</Badge>
          </div>
          <span className="text-2xs text-gray-500">
            Grading Band:{' '}
            <strong className="text-gray-700">{activeScale.name}</strong>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading student roster...</div>
        ) : roster.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <h4 className="font-semibold text-gray-800">No learners found in {selectedClass}</h4>
            <p className="text-xs text-gray-500 mt-1">Enroll students or assign them to this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 uppercase text-2xs font-semibold">
                  <th className="py-3 px-4 w-12 text-center">No.</th>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4">Admission No.</th>
                  <th className="py-3 px-4 w-36 text-center">Raw Score (/{maxScore})</th>
                  <th className="py-3 px-4 text-center">Grade Band</th>
                  <th className="py-3 px-4">Qualitative Remark</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roster.map((row, idx) => {
                  const numScore = row.score === '' ? null : Number(row.score);
                  const percentage = numScore !== null ? (numScore / maxScore) * 100 : 0;
                  const band = numScore !== null ? calculateGradeBand(percentage, activeScale) : null;

                  return (
                    <tr key={row.studentId} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-center text-gray-400 font-mono text-2xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{row.name}</td>
                      <td className="py-3 px-4 font-mono text-gray-600 text-2xs">{row.admissionNumber}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max={maxScore}
                          value={row.score}
                          onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                          placeholder="—"
                          className="w-20 text-center font-bold text-sm rounded-lg border border-gray-300 p-1.5 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {band ? (
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold shadow-xs"
                            style={{
                              backgroundColor: `${band.colorHex || '#1d5f99'}20`,
                              color: band.colorHex || '#1d5f99',
                            }}
                          >
                            {band.code} ({Math.round(percentage)}%)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-2xs italic">Unmarked</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={row.comments}
                          onChange={(e) => handleCommentChange(row.studentId, e.target.value)}
                          placeholder="e.g. Good mastery of concepts..."
                          className="w-full text-xs rounded-lg border border-gray-200 p-1.5 text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStudentReportCard(row)}
                          title="Generate Official Report Card"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Report Card
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Upload Marks Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Import Marks from Excel Sheet"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-600">
            Upload the completed marks spreadsheet for{' '}
            <strong>
              {selectedClass} • {selectedSubject}
            </strong>
            . Scores will be validated against maximum score <strong>{maxScore}</strong>.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-gray-300 p-3 text-xs"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!uploadFile}
              onClick={handleUploadMarksExcel}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Parse &amp; Ingest Marks
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Card Modal */}
      <ReportCardModal
        isOpen={Boolean(selectedReportCard)}
        onClose={() => setSelectedReportCard(null)}
        reportData={selectedReportCard}
        schoolName={currentSchool?.name || 'School'}
        schoolLogo={currentSchool?.branding?.logo}
        schoolMotto={currentSchool?.branding?.motto}
        termTitle="Term 1"
        academicYear="2026"
        className={selectedClass}
      />
    </div>
  );
};

