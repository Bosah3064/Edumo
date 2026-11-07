import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import {
  Megaphone,
  Plus,
  Send,
  AlertTriangle,
  Radio,
  Search,
  Filter,
  Users,
  Trash2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
import { db } from '../firebase';

interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'parents' | 'staff' | 'class';
  priority: 'normal' | 'urgent';
  channels: string[];
  createdAt: string;
  senderName: string;
}

export const Announcements: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'parents' | 'staff' | 'class'>('all');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [smsChannel, setSmsChannel] = useState(true);
  const [pushChannel, setPushChannel] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (!organization || !currentSchool) return;

    const annRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'announcements'
    );

    const q = query(annRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AnnouncementItem[] = snap.docs.map((d) => {
          const data = d.data();
          const timestamp = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            title: data.title || '',
            body: data.body || '',
            audience: data.audience || 'all',
            priority: data.priority || 'normal',
            channels: data.channels || ['In-App'],
            createdAt: timestamp.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            senderName: data.senderName || 'School Administration',
          };
        });
        setAnnouncements(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching announcements:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [organization, currentSchool]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message body are required');
      return;
    }
    if (!organization || !currentSchool) {
      toast.error('No active school branch selected. Please choose a school first.');
      return;
    }

    setBroadcasting(true);
    const toastId = toast.loading('Broadcasting notice across channels...');

    const channels: string[] = ['In-App'];
    if (pushChannel) channels.push('Push Notification');
    if (smsChannel) channels.push('SMS Alert');

    try {
      const annId = `ann-${Date.now()}`;
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'announcements',
        annId
      );

      await setDoc(docRef, {
        title: title.trim(),
        body: body.trim(),
        audience,
        priority,
        channels,
        senderName: currentUser?.displayName || 'Administration',
        senderId: currentUser?.uid || 'admin',
        createdAt: serverTimestamp(),
      });

      toast.success('Announcement broadcasted across channels!', { id: toastId });
      setIsModalOpen(false);
      setTitle('');
      setBody('');
    } catch (err) {
      console.error('Error broadcasting announcement:', err);
      toast.error('Failed to broadcast announcement', { id: toastId });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string, annTitle: string) => {
    if (!organization || !currentSchool) return;
    if (!window.confirm(`Delete announcement "${annTitle}"?`)) return;

    try {
      const docRef = doc(
        db,
        'organizations',
        organization.id,
        'schools',
        currentSchool.id,
        'announcements',
        id
      );
      await deleteDoc(docRef);
      toast.success('Announcement removed from circular stream');
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error('Failed to delete announcement');
    }
  };

  // Metrics
  const totalBroadcasts = announcements.length;
  const urgentCount = announcements.filter((a) => a.priority === 'urgent').length;
  const parentReachCount = announcements.filter((a) => a.audience === 'parents' || a.audience === 'all').length;
  const smsChannelCount = announcements.filter((a) => (a.channels || []).some((c) => (c || '').toLowerCase().includes('sms'))).length;

  // Filtered
  const filteredAnnouncements = announcements.filter((a) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (a.title || '').toLowerCase().includes(q) ||
      (a.body || '').toLowerCase().includes(q) ||
      (a.senderName || '').toLowerCase().includes(q);

    const matchesAudience =
      audienceFilter === 'all' ||
      (audienceFilter === 'urgent' && a.priority === 'urgent') ||
      a.audience === audienceFilter;

    return matchesSearch && matchesAudience;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm">
              <Megaphone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-extrabold text-gray-900 tracking-tight">
              Announcements &amp; Parent Broadcasts
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Broadcast school circulars, event alerts, and emergency SMS to guardians of <strong>{currentSchool?.name || 'Main Campus'}</strong>
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm"
        >
          New Announcement
        </Button>
      </div>

      {/* TOP 4 VIBRANT GRADIENT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Broadcasts */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-blue-100">
              Total Circulars
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{totalBroadcasts}</div>
            <p className="text-xs text-blue-100 mt-1 font-medium">
              School circulars published
            </p>
          </div>
        </div>

        {/* Card 2: Urgent Alerts */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-rose-100">
              Urgent Notices
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{urgentCount}</div>
            <p className="text-xs text-rose-100 mt-1 font-medium">
              High-priority broadcast alerts
            </p>
          </div>
        </div>

        {/* Card 3: Parent Reach */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-purple-100">
              Parent Broadcasts
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{parentReachCount}</div>
            <p className="text-xs text-purple-100 mt-1 font-medium">
              Circulars sent to guardian portal
            </p>
          </div>
        </div>

        {/* Card 4: Multi-Channel SMS & Push */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-100">
              Multi-Channel Dispatch
            </span>
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
              <Radio className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">{smsChannelCount}</div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              Broadcasts via SMS &amp; Push
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white/80 backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements by title, content or sender..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setAudienceFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                audienceFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({announcements.length})
            </button>
            <button
              onClick={() => setAudienceFilter('parents')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                audienceFilter === 'parents'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Parents
            </button>
            <button
              onClick={() => setAudienceFilter('staff')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                audienceFilter === 'staff'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => setAudienceFilter('urgent')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
                audienceFilter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Urgent ({urgentCount})
            </button>
          </div>
        </div>
      </Card>

      {/* Announcements Feed */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs font-semibold">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="text-center py-14 text-slate-500 border-dashed border-2">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <h3 className="text-base font-extrabold text-slate-900">No announcements broadcasted yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Send school circulars, event reminders, or urgent SMS alerts to parents and faculty members.
          </p>
          <div className="mt-5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Broadcast First Notice
            </Button>
          </div>
        </Card>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="text-center py-10 text-slate-500">
          <p className="text-xs font-semibold">No announcements matched "{searchQuery}"</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <Card
              key={ann.id}
              className={`relative overflow-hidden p-5 transition-all hover:shadow-md border ${
                ann.priority === 'urgent'
                  ? 'border-rose-200 bg-rose-50/10'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {ann.priority === 'urgent' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-600" />
              )}

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {ann.priority === 'urgent' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    ) : (
                      <Megaphone className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{ann.title}</h3>
                    <p className="text-2xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>By <strong>{ann.senderName}</strong></span>
                      <span>•</span>
                      <span>{ann.createdAt}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {ann.priority.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {ann.audience}
                  </span>
                  <button
                    onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed pl-13 mb-4 whitespace-pre-wrap">
                {ann.body}
              </p>

              <div className="pl-13 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold">Channels: {ann.channels.join(' • ')}</span>
                </div>
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Broadcast Live
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Announcement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast Announcement"
        description="Deliver circulars and urgent notices to guardians and faculty"
        maxWidth="lg"
      >
        <form onSubmit={handleBroadcast} className="space-y-4 mt-2">
          <Input
            label="Announcement Title"
            placeholder="e.g. End of Term Parent-Teacher Conference"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Target Audience"
              value={audience}
              onChange={(e) =>
                setAudience(e.target.value as 'all' | 'parents' | 'staff' | 'class')
              }
              options={[
                { label: 'Entire School (All)', value: 'all' },
                { label: 'All Parents & Guardians', value: 'parents' },
                { label: 'Faculty & Staff Only', value: 'staff' },
                { label: 'Specific Class Stream', value: 'class' },
              ]}
            />

            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
              options={[
                { label: 'Normal Notification', value: 'normal' },
                { label: 'Urgent / Emergency Alert', value: 'urgent' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1.5">
              Message Content
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write circular details here..."
              className="w-full rounded-xl bg-white border border-gray-200 text-gray-900 text-xs p-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            />
          </div>

          {/* Delivery Channels */}
          <div className="p-3 rounded-2xl bg-gray-100/40 border border-surface-700/60 space-y-2">
            <span className="text-2xs font-semibold text-gray-500 uppercase tracking-wider block">
              Multi-Channel Dispatch
            </span>
            <div className="flex items-center gap-6 text-xs text-gray-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushChannel}
                  onChange={(e) => setPushChannel(e.target.checked)}
                  className="rounded bg-white border-surface-700 text-brand-600 focus:ring-0"
                />
                <span>PWA Push Notification</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsChannel}
                  onChange={(e) => setSmsChannel(e.target.checked)}
                  className="rounded bg-white border-surface-700 text-brand-600 focus:ring-0"
                />
                <span>SMS Alert (Africa's Talking / Telco)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={broadcasting}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Broadcast Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
