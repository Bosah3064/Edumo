import React, { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { db, storage, functions } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { FileText, Plus, Clock3, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface Assignment {
  id: string; title: string; className: string; description: string; fileUrl?: string;
  startsAt: string; expiresAt: string;
  status: string; teacherName: string;
}

export const Assignments: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('Grade 4');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const teacherView = currentRole !== null && ['orgOwner', 'principal', 'deputy', 'admin', 'teacher'].includes(currentRole);

  useEffect(() => {
    if (!organization || !currentSchool) return;
    const ref = collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'assignments');
    return onSnapshot(ref, (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assignment, 'id'>) }))));
  }, [organization, currentSchool]);

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool || !title.trim() || !startsAt || !expiresAt) return toast.error('Title, start time and expiry time are required');
    if (new Date(expiresAt) <= new Date(startsAt)) return toast.error('Expiry must be after the start time');
    setSaving(true);
    try {
      let fileUrl = '';
      if (attachment) {
        const fileRef = ref(storage, `${organization.id}/${currentSchool.id}/assignments/${Date.now()}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
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
        resultReleaseMode: 'manual',
        reviewAllowed: false,
        questions: [],
      });
      toast.success('Assignment published');
      setCreateOpen(false); setTitle(''); setDescription(''); setAttachment(null);
    } catch (error) { console.error(error); toast.error('Failed to publish assignment'); }
    finally { setSaving(false); }
  };



  const activeExpired = (assignment: Assignment) => new Date() > new Date(assignment.expiresAt);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Assignments</h1><p className="text-xs text-gray-500 mt-1">Create and schedule classroom assignments</p></div>
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
            </div>
          </Card>
        ))}
        {!assignments.length && <Card className="lg:col-span-3 text-center text-gray-500 py-12"><FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />No assignments have been published yet.</Card>}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Assignment" maxWidth="2xl">
        <form onSubmit={createAssignment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Assignment Title" value={title} onChange={(e) => setTitle(e.target.value)} required /><Input label="Class" value={className} onChange={(e) => setClassName(e.target.value)} /></div>
          <Input label="Instructions" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Input label="Opens at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required /><Input label="Expires at" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required /></div>
          <label className="block text-xs font-semibold text-gray-600"><span>Upload assignment, question paper or answer sheet</span><input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,image/*" onChange={(e) => setAttachment(e.target.files?.[0] || null)} className="mt-1.5 block w-full rounded-xl border border-gray-200 p-2 text-xs" /></label>
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>{saving ? 'Publishing...' : 'Publish Assignment'}</Button></div>
        </form>
      </Modal>
    </div>
  );
};
