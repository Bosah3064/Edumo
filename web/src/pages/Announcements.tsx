import React, { useState } from 'react';
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
  MessageSquare,
  Smartphone,
  AlertTriangle,
  Clock,
  Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([
    {
      id: 'ann-1',
      title: 'Term 1 Mid-Term Break Schedule',
      body: 'Dear parents, guardians and faculty: School will be closed for mid-term break starting Thursday at 1:00 PM. Classes resume the following Monday.',
      audience: 'all',
      priority: 'normal',
      channels: ['In-App', 'Push Notification', 'SMS'],
      createdAt: 'Yesterday, 3:30 PM',
      senderName: 'Principal Office',
    },
    {
      id: 'ann-2',
      title: 'URGENT: Grade 4 CBC Environmental Field Study Fee',
      body: 'Please ensure permission slips and transport fees are completed before Friday morning.',
      audience: 'parents',
      priority: 'urgent',
      channels: ['SMS', 'WhatsApp', 'In-App'],
      createdAt: '2 days ago',
      senderName: 'Grade 4 Lead',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'parents' | 'staff' | 'class'>('all');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [smsChannel, setSmsChannel] = useState(true);
  const [pushChannel, setPushChannel] = useState(true);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      toast.error('Title and message body are required');
      return;
    }

    const channels: string[] = ['In-App'];
    if (pushChannel) channels.push('Push Notification');
    if (smsChannel) channels.push('SMS Alert');

    const newAnnouncement: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title,
      body,
      audience,
      priority,
      channels,
      createdAt: 'Just now',
      senderName: currentUser?.displayName || 'Administration',
    };

    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    toast.success('Announcement broadcasted across channels!');
    setIsModalOpen(false);
    setTitle('');
    setBody('');
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
              <span className="text-accent-700 font-medium">Delivered to Guardians</span>
            </div>
          </Card>
        ))}
      </div>

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
