import React, { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, functions } from '../firebase';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { FileText, Plus, Upload, Clock3, CheckCircle2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Question { id: string; text: string; options: string[]; correctAnswer: number; points: number }
interface Submission { studentUid: string; studentName: string; answers: Record<string, number>; score: number; submittedAt: unknown }
interface Assignment {
  id: string; title: string; className: string; description: string; fileUrl?: string;
  startsAt: string; expiresAt: string; questions: Question[]; reviewAllowed: boolean;
  status: string; teacherName: string; submissions?: Submission[];
}

export const Assignments: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [takeAssignment, setTakeAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('Grade 4');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewAllowed, setReviewAllowed] = useState(true);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([{ id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
  const [saving, setSaving] = useState(false);
  const teacherView = true;

  useEffect(() => {
    if (!organization || !currentSchool) return;
    const ref = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'assignments');
    return onSnapshot(ref, (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assignment, 'id'>) }))));
  }, [organization, currentSchool]);

  const updateQuestion = (index: number, patch: Partial<Question>) => setQuestions((q) => q.map((item, i) => i === index ? { ...item, ...patch } : item));
  const updateOption = (qIndex: number, oIndex: number, value: string) => setQuestions((q) => q.map((item, i) => i === qIndex ? { ...item, options: item.options.map((option, oi) => oi === oIndex ? value : option) } : item));

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !title.trim() || !startsAt || !expiresAt) return toast.error('Title, start time and expiry time are required');
    if (new Date(expiresAt) <= new Date(startsAt)) return toast.error('Expiry must be after the start time');
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) return toast.error('Complete every question and all four options');

    setSaving(true);
    try {
      let fileUrl = '';
      if (attachment) {
        const fileRef = ref(storage, `organizations/${organization.id}/schools/${currentSchool.id}/assignments/${Date.now()}-${attachment.name}`);
        await uploadBytes(fileRef, attachment, { contentType: attachment.type });
        fileUrl = await getDownloadURL(fileRef);
      }
      const create = httpsCallable(functions, 'createAssignment');
      await create({
        schoolId: currentSchool.id,
        title: title.trim(),
        className,
        description: description.trim(),
        fileUrl,
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        maxAttempts: 1,
        resultReleaseMode: 'immediate',
        reviewAllowed,
        questions: questions.map((question) => ({ ...question, type: 'objective' })),
      });
      toast.success('Assignment published');
      setCreateOpen(false); setTitle(''); setDescription(''); setAttachment(null);
      setQuestions([{ id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);
    } catch (error) { console.error(error); toast.error('Failed to publish assignment'); }
    finally { setSaving(false); }
  };

  const submitAssignment = async () => {
    if (!organization || !currentSchool || !takeAssignment) return;
    const now = new Date();
    if (now < new Date(takeAssignment.startsAt)) return toast.error('This assignment has not opened yet');
    if (now > new Date(takeAssignment.expiresAt)) return toast.error('This assignment has expired');
    const missing = takeAssignment.questions.filter((q) => answers[q.id] === undefined);
    if (missing.length) return toast.error(`Answer all ${takeAssignment.questions.length} questions before submitting`);

    const submit = httpsCallable(functions, 'submitAssignment');
    const operationId = crypto.randomUUID();
    const response = await submit({ schoolId: currentSchool.id, assignmentId: takeAssignment.id, answers, operationId });
    const result = response.data as { score: number; total: number };
    toast.success(`Submitted. Score: ${result.score}/${result.total}`);
    setTakeAssignment(null); setAnswers({});
  };

  const activeExpired = (assignment: Assignment) => new Date() > new Date(assignment.expiresAt);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Assignments & Quizzes</h1><p className="text-xs text-gray-500 mt-1">Create, schedule, submit and grade classroom work</p></div>
        {teacherView && <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>New Assignment</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3"><div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center"><FileText className="w-5 h-5" /></div><Badge variant={activeExpired(assignment) ? 'neutral' : 'accent'}>{activeExpired(assignment) ? 'Expired' : 'Available'}</Badge></div>
            <div><h3 className="font-semibold text-gray-900">{assignment.title}</h3><p className="text-xs text-gray-500">{assignment.className}</p></div>
            <p className="text-xs text-gray-600 line-clamp-2">{assignment.description}</p>
            <div className="text-2xs text-gray-500 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> Opens {new Date(assignment.startsAt).toLocaleString()}<br />Expires {new Date(assignment.expiresAt).toLocaleString()}</div>
            <div className="flex gap-2">
              {assignment.fileUrl && <Button size="sm" variant="secondary" onClick={() => window.open(assignment.fileUrl, '_blank')}><Eye className="w-4 h-4 mr-1" />Resources</Button>}
              <Button size="sm" variant="primary" onClick={() => { setTakeAssignment(assignment); setAnswers({}); }}>Open Quiz</Button>
            </div>
          </Card>
        ))}
        {!assignments.length && <Card className="lg:col-span-3 text-center text-gray-500 py-12"><FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />No assignments have been published yet.</Card>}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Assignment / Multiple Choice Quiz" maxWidth="2xl">
        <form onSubmit={createAssignment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Assignment Title" value={title} onChange={(e) => setTitle(e.target.value)} required /><Input label="Class" value={className} onChange={(e) => setClassName(e.target.value)} /></div>
          <Input label="Instructions" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Opens at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /><Input label="Expires at" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required /></div>
          <label className="block text-xs font-semibold text-gray-600"><span>Upload assignment, question paper or answer sheet</span><input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,image/*" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="mt-1.5 block w-full rounded-xl border border-gray-200 p-2 text-xs" /></label>
          <div className="rounded-2xl border border-gray-200 p-4 space-y-3"><div className="flex justify-between"><h3 className="text-sm font-semibold text-gray-900">Private Marking Answers</h3><Button type="button" size="sm" variant="secondary" onClick={() => setQuestions((q) => [...q, { id: `q-${Date.now()}-${q.length}`, text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }])}><Plus className="w-4 h-4" />Add Question</Button></div>
          {questions.map((q, qi) => <div key={q.id} className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2"><div className="flex gap-2"><Input label={`Question ${qi + 1}`} value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} /><Input label="Marks" type="number" min="1" value={q.points} onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) || 1 })} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{q.options.map((option, oi) => <label key={oi} className="flex items-center gap-2 text-xs"><input type="radio" checked={q.correctAnswer === oi} onChange={() => updateQuestion(qi, { correctAnswer: oi })} /><Input aria-label={`Option ${String.fromCharCode(65 + oi)}`} value={option} placeholder={`Option ${String.fromCharCode(65 + oi)}`} onChange={(e) => updateOption(qi, oi, e.target.value)} /></label>)}</div><p className="text-[10px] text-gray-500">Select the radio button beside the correct private answer.</p></div>)}</div>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={reviewAllowed} onChange={(e) => setReviewAllowed(e.target.checked)} />Allow students to review questions and answers after marking</label>
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>{saving ? 'Publishing...' : 'Publish Assignment'}</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!takeAssignment} onClose={() => setTakeAssignment(null)} title={takeAssignment?.title || 'Assignment'} maxWidth="2xl">
        {takeAssignment && <div className="space-y-4"><p className="text-xs text-gray-600">{takeAssignment.description}</p>{takeAssignment.questions.map((q, qi) => <div key={q.id} className="rounded-xl border border-gray-200 p-4"><p className="text-sm font-semibold text-gray-900 mb-3">{qi + 1}. {q.text} <span className="text-xs text-gray-500">({q.points} marks)</span></p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{q.options.map((option, oi) => <label key={oi} className={`flex items-center gap-2 rounded-xl border p-3 text-xs cursor-pointer ${answers[q.id] === oi ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}><input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} /><span className="font-bold">{String.fromCharCode(65 + oi)}.</span>{option}</label>)}</div></div>)}<div className="flex justify-end"><Button onClick={submitAssignment}><CheckCircle2 className="w-4 h-4 mr-1" />Submit Answers</Button></div></div>}
      </Modal>
    </div>
  );
};
