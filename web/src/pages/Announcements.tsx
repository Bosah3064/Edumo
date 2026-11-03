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
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
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
    if (!title.trim() || !body.trim() || !organization || !currentSchool) {
      toast.error('Title and message body are required');
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Announcements & Parent Alerts
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Broadcast emergency alerts and circulars for {currentSchool?.name || 'Main Campus'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Announcement
        </Button>
      </div>

      {/* Announcements Feed */}
      {announcements.length === 0 ? (
        <Card className="text-center py-12 text-gray-500">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">No announcements yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Send school circulars, event reminders, or urgent SMS alerts to parents and faculty.
          </p>
          <div className="mt-4">
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
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Card key={ann.id} className="relative overflow-hidden">
              {ann.priority === 'urgent' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-danger-500" />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      ann.priority === 'urgent'
                        ? 'bg-danger-500/15 text-danger-700 border border-danger-500/30'
                        : 'bg-brand-500/15 text-brand-700 border border-brand-500/30'
                    }`}
                  >
                    {ann.priority === 'urgent' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Megaphone className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{ann.title}</h3>
                    <p className="text-2xs text-gray-500">
                      By {ann.senderName} • {ann.createdAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={ann.priority === 'urgent' ? 'danger' : 'brand'}
                    size="sm"
                  >
                    {ann.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    Audience: {ann.audience.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-gray-700 leading-relaxed pl-11 mb-4">
                {ann.body}
              </p>

              <div className="pl-11 pt-3 border-t border-surface-800/80 flex flex-wrap items-center justify-between gap-2 text-2xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-accent-700" />
                  <span>Channels: {ann.channels.join(' • ')}</span>
                </div>
                <span className="text-accent-700 font-medium">Delivered to Recipients</span>
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
