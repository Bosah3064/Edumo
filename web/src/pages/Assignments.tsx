import React, { useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, functions } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import {
  FileText,
  Plus,
  Clock3,
  Eye,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  BookOpen,
  Award,
  HelpCircle,
  Share2,
  Download,
  Sparkles,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Assignment {
  id: string;
  title: string;
  subject?: string;
  className: string;
  description: string;
  fileUrl?: string;
  startsAt: string;
  expiresAt: string;
  maxScore?: number;
  status: string;
  teacherName: string;
  createdAt?: unknown;
}

export const Assignments: React.FC = () => {
  const { organization, currentSchool, currentRole } = useTenant();
  const { currentUser } = useAuth();

  const [activeSection, setActiveSection] = useState<'homework' | 'quizzes' | 'resources'>('homework');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Quiz auto-marking state
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  const sampleQuizzes = [
    {
      id: 'quiz-01',
      title: 'CBC Integrated Science: Ecosystems & Living Things',
      grade: 'Grade 6',
      subject: 'Science & Technology',
      timeLimitMinutes: 15,
      questions: [
        {
          id: 1,
          question: 'Which of the following organisms is an autotroph (primary producer)?',
          options: ['Acacia tree', 'African elephant', 'Grasshopper', 'Lion'],
          correctIndex: 0,
        },
        {
          id: 2,
          question: 'What is the primary function of chlorophyll in plant leaves?',
          options: ['Water absorption', 'Trapping solar light energy for photosynthesis', 'Gas exchange', 'Anchoring the stem'],
          correctIndex: 1,
        },
        {
          id: 3,
          question: 'Which East African lake is known for being the second deepest freshwater lake in the world?',
          options: ['Lake Victoria', 'Lake Naivasha', 'Lake Tanganyika', 'Lake Turkana'],
          correctIndex: 2,
        },
      ],
    },
    {
      id: 'quiz-02',
      title: 'Mathematics: Fractions, Ratios & Percentages',
      grade: 'Grade 5',
      subject: 'Mathematics',
      timeLimitMinutes: 20,
      questions: [
        {
          id: 1,
          question: 'What is 3/4 expressed as a percentage?',
          options: ['25%', '50%', '75%', '80%'],
          correctIndex: 2,
        },
        {
          id: 2,
          question: 'If a school has 120 boys and 80 girls, what is the ratio of boys to girls in simplest form?',
          options: ['3:2', '2:3', '4:3', '6:4'],
          correctIndex: 0,
        },
      ],
    },
  ];

  const sampleResources = [
    {
      id: 'res-01',
      title: 'KICD Curriculum Design: Grade 6 Mathematics',
      category: 'Curriculum Guide',
      size: '2.4 MB',
      subject: 'Mathematics',
      dateAdded: '2026-02-14',
    },
    {
      id: 'res-02',
      title: 'Kenya CBC Formative Assessment Rubrics (KNEC CBA)',
      category: 'Assessment Rubric',
      size: '1.8 MB',
      subject: 'All Learning Areas',
      dateAdded: '2026-01-20',
    },
    {
      id: 'res-03',
      title: 'UNEB O-Level Physics Revision Question Bank',
      category: 'Past Paper',
      size: '4.1 MB',
      subject: 'Physics',
      dateAdded: '2026-03-05',
    },
    {
      id: 'res-04',
      title: 'NECTA Kidato cha Nne Kiswahili Miongozo ya Utungaji',
      category: 'Teaching Guide',
      size: '3.2 MB',
      subject: 'Kiswahili',
      dateAdded: '2026-02-28',
    },
  ];

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Modal & Form State
  const [createOpen, setCreateOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [className, setClassName] = useState('Grade 4');
  const [maxScore, setMaxScore] = useState('50');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [expiresAt, setExpiresAt] = useState(() => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return nextWeek.toISOString().slice(0, 16);
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const teacherView =
    currentRole !== null &&
    ['orgOwner', 'principal', 'deputy', 'admin', 'teacher'].includes(currentRole);

  // 1. Listen to real-time classes for dropdown
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const classesRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'classes'
    );

    const unsubClasses = onSnapshot(classesRef, (snap) => {
      const names = snap.docs.map((d) => d.data().name as string).filter(Boolean);
      const defaults = [
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
        'Grade 9',
        'Form 1',
        'Form 2',
        'Form 3',
        'Form 4',
      ];
      const combined = Array.from(new Set([...names, ...defaults]));
      setAvailableClasses(combined);
      if (!names.includes(className) && names.length > 0) {
        setClassName(names[0]);
      }
    });

    return () => unsubClasses();
  }, [organization, currentSchool]);

  // 2. Listen to real-time assignments
  useEffect(() => {
    if (!organization || !currentSchool) return;

    const refCol = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'assignments'
    );

    const unsub = onSnapshot(
      refCol,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Assignment, 'id'>),
        }));
        // Sort descending by startsAt or createdAt
        list.sort((a, b) => new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime());
        setAssignments(list);
        setLoading(false);
      },
      (err) => {
        console.error('Assignments snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [organization, currentSchool]);

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected. Please choose a school first.');
      return;
    }
    if (!title.trim() || !startsAt || !expiresAt) {
      toast.error('Title, start time, and expiry time are required');
      return;
    }
    if (new Date(expiresAt) <= new Date(startsAt)) {
      toast.error('Expiry must be after the start time');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Publishing assignment...');

    try {
      let fileUrl = '';
      if (attachment) {
        try {
          const fileRef = ref(
            storage,
            `${organization.id}/${currentSchool.id}/assignments/${Date.now()}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          );
          await uploadBytes(fileRef, attachment, { contentType: attachment.type });
          fileUrl = await getDownloadURL(fileRef);
        } catch (storageErr) {
          console.warn('Storage upload bypassed or failed:', storageErr);
          toast('Attachment storage pending setup in Firebase Console. Assignment saved without file.', {
            icon: 'ℹ️',
          });
        }
      }

      const payload = {
        title: title.trim(),
        subject: subject.trim() || 'General',
        className,
        description: description.trim(),
        fileUrl: fileUrl || '',
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        maxScore: Number(maxScore) || 50,
        maxAttempts: 1,
        resultReleaseMode: 'manual',
        reviewAllowed: false,
        questions: [],
        status: 'published',
        teacherName: currentUser?.displayName || 'Class Instructor',
        createdAt: serverTimestamp(),
      };

      try {
        const createCallable = httpsCallable(functions, 'createAssignment');
        await createCallable({
          schoolId: currentSchool.id,
          ...payload,
        });
      } catch (callErr) {
        console.warn('createAssignment callable bypassed, writing assignment directly to Firestore:', callErr);
        const docRef = doc(
          collection(db, 'organizations', organization.id, 'schools', currentSchool.id, 'assignments')
        );
        await setDoc(docRef, payload);
      }

      toast.success('Assignment published successfully!', { id: toastId });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setAttachment(null);
    } catch (error) {
      console.error('Failed to publish assignment:', error);
      toast.error('Failed to publish assignment', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!organization || !currentSchool) return;
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    const toastId = toast.loading('Deleting assignment...');
    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'assignments',
        assignmentId
      );
      await deleteDoc(docRef);
      toast.success('Assignment deleted', { id: toastId });
      if (activeAssignment?.id === assignmentId) {
        setDetailModalOpen(false);
        setActiveAssignment(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete assignment', { id: toastId });
    }
  };

  const isExpired = (assignment: Assignment) => new Date() > new Date(assignment.expiresAt);

  // Filtered assignments
  const filteredAssignments = assignments.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subject && item.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = classFilter === 'all' || item.className === classFilter;

    const expired = isExpired(item);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !expired) ||
      (statusFilter === 'expired' && expired);

    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Academic Work
            </Badge>
            <span className="text-2xs text-gray-500">
              {currentSchool?.name || 'Main Campus'}
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Assignments & Continuous Assessment
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Create, schedule and track homework, quizzes, and project rubrics
          </p>
        </div>

        {teacherView && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Assignment
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search by title, subject, instructions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />

          <Select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Classes' },
              ...availableClasses.map((c) => ({ value: c, label: c })),
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired')}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active / Available' },
              { value: 'expired', label: 'Past Deadline' },
            ]}
          />
        </div>
      </Card>

      {/* Assignment Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </Card>
          ))}
        </div>
      ) : filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const expired = isExpired(assignment);
            return (
              <Card
                key={assignment.id}
                className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border border-gray-200/80"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-2xs font-semibold text-brand-700 uppercase tracking-wider block">
                          {assignment.subject || 'General'}
                        </span>
                        <Badge variant="neutral" className="text-2xs">
                          {assignment.className}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={expired ? 'neutral' : 'accent'}>
                      {expired ? 'Expired' : 'Active'}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 text-base leading-snug">
                      {assignment.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                      {assignment.description || 'No detailed instructions provided.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-2xs text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5 text-gray-400" />
                        Due:{' '}
                        <span className="font-medium text-gray-700">
                          {new Date(assignment.expiresAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                      {assignment.maxScore && (
                        <span className="flex items-center gap-1 font-semibold text-accent-700">
                          <Award className="w-3.5 h-3.5" />
                          {assignment.maxScore} pts
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400">
                      By: {assignment.teacherName || 'Instructor'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveAssignment(assignment);
                      setDetailModalOpen(true);
                    }}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>

                  <div className="flex items-center gap-1">
                    {assignment.fileUrl && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(assignment.fileUrl, '_blank')}
                      >
                        Attachment
                      </Button>
                    )}
                    {teacherView && (
                      <button
                        type="button"
                        onClick={() => handleDelete(assignment.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title={searchQuery ? 'No matching assignments found' : 'No assignments created yet'}
          description={
            searchQuery
              ? 'Try adjusting your search criteria or class filters.'
              : 'Create classroom assignments, homework, and rubrics for your learners.'
          }
          actionLabel={teacherView && !searchQuery ? 'Create First Assignment' : undefined}
          onAction={teacherView && !searchQuery ? () => setCreateOpen(true) : undefined}
        />
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Assignment"
        maxWidth="2xl"
      >
        <form onSubmit={createAssignment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Assignment Title"
              placeholder="e.g. CBC Term 1 Mathematics Worksheet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Subject / Learning Area"
              placeholder="e.g. Mathematics, Literacy, Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Target Class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              options={availableClasses.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label="Maximum Score / Total Marks"
              type="number"
              min="1"
              max="1000"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Instructions & Rubric
            </label>
            <textarea
              rows={4}
              placeholder="Enter clear instructions for learners and guardians..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Available / Opens At"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <Input
              label="Due / Expires At"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Supplementary Document / Worksheet (PDF, Word, Image)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,image/*"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {saving ? 'Publishing...' : 'Publish Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assignment Detail Modal */}
      {activeAssignment && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={activeAssignment.title}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="brand">{activeAssignment.subject || 'General'}</Badge>
              <Badge variant="neutral">{activeAssignment.className}</Badge>
              <Badge variant={isExpired(activeAssignment) ? 'neutral' : 'accent'}>
                {isExpired(activeAssignment) ? 'Expired' : 'Active'}
              </Badge>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Instructions
              </h4>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-line leading-relaxed">
                {activeAssignment.description || 'No detailed instructions provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 text-xs text-gray-600">
              <div>
                <span className="text-gray-400 block">Opens</span>
                <span className="font-medium text-gray-900">
                  {new Date(activeAssignment.startsAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Deadline</span>
                <span className="font-medium text-gray-900">
                  {new Date(activeAssignment.expiresAt).toLocaleString()}
                </span>
              </div>
              {activeAssignment.maxScore && (
                <div>
                  <span className="text-gray-400 block">Maximum Marks</span>
                  <span className="font-medium text-gray-900">
                    {activeAssignment.maxScore} points
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-400 block">Instructor</span>
                <span className="font-medium text-gray-900">
                  {activeAssignment.teacherName || 'Assigned Staff'}
                </span>
              </div>
            </div>

            {activeAssignment.fileUrl && (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(activeAssignment.fileUrl, '_blank')}
                  leftIcon={<Eye className="w-4 h-4" />}
                >
                  Download / View Attached Document
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              {teacherView ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(activeAssignment.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete Assignment
                </Button>
              ) : (
                <div />
              )}
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
