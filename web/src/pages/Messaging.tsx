import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
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
  MessageSquare,
  Send,
  Phone,
  Clock,
  Radio,
  FileCheck2,
  AlertCircle,
  Search,
  CheckCheck,
  User,
  ShieldAlert,
  Sparkles,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'guardian' | 'admin';
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatThread {
  id: string;
  participantName: string;
  participantRole: string;
  studentName: string;
  studentClass: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface PermissionSlip {
  id: string;
  title: string;
  destination: string;
  date: string;
  targetClass: string;
  cost: number;
  totalStudents: number;
  signedCount: number;
  declinedCount: number;
  deadline: string;
}

export const Messaging: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('thr-1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // Broadcast Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('all_parents');
  const smsCredits = 4850;

  // Permission Slips
  const [slips, setSlips] = useState<PermissionSlip[]>([]);
  const [slipTitle, setSlipTitle] = useState('');
  const [slipDestination, setSlipDestination] = useState('');
  const [slipDate, setSlipDate] = useState('2026-02-20');
  const [slipClass, setSlipClass] = useState('Grade 4');
  const [slipCost, setSlipCost] = useState('1500');

  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  // Seed sample threads
  useEffect(() => {
    const sampleThreads: ChatThread[] = [
      {
        id: 'thr-1',
        participantName: 'Agnes Makena (Mother)',
        participantRole: 'Guardian',
        studentName: 'Zawadi Achieng',
        studentClass: 'Grade 4 East',
        lastMessage: 'Good afternoon, is tomorrow’s science practical project requiring extra materials?',
        lastMessageTime: '10:42 AM',
        unreadCount: 1,
      },
      {
        id: 'thr-2',
        participantName: 'Peter Wanjala (Father)',
        participantRole: 'Guardian',
        studentName: 'Precious Wanjala',
        studentClass: 'Grade 3 North',
        lastMessage: 'Thank you teacher for sending the remedial reading list. We are practicing daily.',
        lastMessageTime: 'Yesterday',
        unreadCount: 0,
      },
      {
        id: 'thr-3',
        participantName: 'David Ochieng (Guardian)',
        participantRole: 'Guardian',
        studentName: 'Grace Atieno',
        studentClass: 'Grade 4 West',
        lastMessage: 'Confirming receipt of the Term 1 report card. Outstanding improvement in CBC arts!',
        lastMessageTime: 'Monday',
        unreadCount: 0,
      },
    ];
    setThreads(sampleThreads);

    // Initial messages for thread 1
    setMessages([
      {
        id: 'msg-1',
        threadId: 'thr-1',
        senderId: 'parent-1',
        senderName: 'Agnes Makena',
        senderRole: 'guardian',
        text: 'Good morning Teacher, hope you are well. Just wanted to follow up on Zawadi’s progress in Social Studies this week.',
        timestamp: '08:30 AM',
        isRead: true,
      },
      {
        id: 'msg-2',
        threadId: 'thr-1',
        senderId: 'teacher-1',
        senderName: currentUser?.displayName || 'Class Educator',
        senderRole: 'teacher',
        text: 'Good morning Mrs. Makena. Zawadi is performing exceptionally well! She led her peer group presentation on community resources yesterday.',
        timestamp: '09:15 AM',
        isRead: true,
      },
      {
        id: 'msg-3',
        threadId: 'thr-1',
        senderId: 'parent-1',
        senderName: 'Agnes Makena',
        senderRole: 'guardian',
        text: 'Good afternoon, is tomorrow’s science practical project requiring extra materials from home?',
        timestamp: '10:42 AM',
        isRead: false,
      },
    ]);

    // Initial permission slips
    setSlips([
      {
        id: 'slip-1',
        title: 'National Museums of Kenya & Snake Park Educational Tour',
        destination: 'Museum Hill, Nairobi',
        date: '2026-02-27',
        targetClass: 'Grade 4',
        cost: 1800,
        totalStudents: 42,
        signedCount: 36,
        declinedCount: 2,
        deadline: '2026-02-20',
      },
      {
        id: 'slip-2',
        title: 'Ololua Nature Trail & CBC Environmental Fieldwork',
        destination: 'Karen, Nairobi',
        date: '2026-03-14',
        targetClass: 'Grade 5 & 6',
        cost: 2200,
        totalStudents: 68,
        signedCount: 45,
        declinedCount: 3,
        deadline: '2026-03-05',
      },
    ]);
  }, [currentUser]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId: activeThread.id,
      senderId: currentUser?.uid || 'staff-uid',
      senderName: currentUser?.displayName || 'Class Educator',
      senderRole: 'teacher',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Update last message in thread
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, lastMessage: newMsg.text, lastMessageTime: newMsg.timestamp, unreadCount: 0 }
          : t
      )
    );

    toast.success('Message sent directly to guardian!', { icon: '💬' });
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    toast.success(
      `Dispatched priority broadcast "${broadcastTitle}" to ${broadcastAudience.replace('_', ' ')}! Deducted 215 SMS credits.`,
      { icon: '📢' }
    );
    setIsBroadcastModalOpen(false);
    setBroadcastTitle('');
    setBroadcastBody('');
  };

  const handleCreateSlip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipTitle.trim()) return;

    const newSlip: PermissionSlip = {
      id: `slip-${Date.now()}`,
      title: slipTitle.trim(),
      destination: slipDestination.trim(),
      date: slipDate,
      targetClass: slipClass,
      cost: Number(slipCost) || 0,
      totalStudents: 40,
      signedCount: 0,
      declinedCount: 0,
      deadline: '2026-02-25',
    };

    setSlips((prev) => [newSlip, ...prev]);
    toast.success('Digital permission slip created & dispatched to parent portal accounts!');
    setIsSlipModalOpen(false);
    setSlipTitle('');
    setSlipDestination('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Communication &amp; Messaging
            </Badge>
            <span className="text-2xs text-gray-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
            Parent-Teacher Messaging &amp; Broadcasts
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Moderated two-way guardian communication with office hours policy, SMS emergency alerts and permission slips
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSlipModalOpen(true)}
            leftIcon={<FileCheck2 className="w-4 h-4" />}
          >
            Create Permission Slip
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBroadcastModalOpen(true)}
            leftIcon={<Radio className="w-4 h-4" />}
          >
            Emergency SMS Broadcast
          </Button>
        </div>
      </div>

      {/* Office Hours Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-blue-900">
              Campus Educator Office Hours: Mon – Fri, 08:00 AM – 04:30 PM
            </p>
            <p className="text-2xs text-blue-700">
              Guarantees timely attention while safeguarding educator wellness. Inquiries received outside office hours are queued for delivery at 08:00 AM.
            </p>
          </div>
        </div>
        <Badge variant="brand" size="sm" className="hidden sm:inline-flex">
          {smsCredits.toLocaleString()} SMS Credits Available
        </Badge>
      </div>

      {/* Main Two-Column Messenger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Threads Sidebar (4 Cols) */}
        <Card className="lg:col-span-4 p-4 space-y-3 flex flex-col h-[600px] border border-gray-200">
          <div className="relative">
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {threads.map((thr) => {
              const isSelected = thr.id === activeThread?.id;
              return (
                <button
                  key={thr.id}
                  onClick={() => setSelectedThreadId(thr.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                      : 'bg-white hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-700 font-bold flex items-center justify-center text-xs">
                        {thr.participantName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs">{thr.participantName}</h4>
                        <p className="text-[10px] text-gray-500">{thr.studentName} • {thr.studentClass}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{thr.lastMessageTime}</span>
                  </div>
                  <p className="text-2xs text-gray-600 line-clamp-1 mt-2 pl-11">
                    {thr.lastMessage}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Chat Thread View (8 Cols) */}
        <Card className="lg:col-span-8 p-0 flex flex-col h-[600px] border border-gray-200 overflow-hidden">
          {/* Thread Header */}
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-700 font-bold flex items-center justify-center text-sm">
                {activeThread?.participantName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{activeThread?.participantName}</h3>
                <p className="text-2xs text-gray-500">
                  Learner: <strong>{activeThread?.studentName}</strong> ({activeThread?.studentClass})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.success(`Calling ${activeThread?.participantName}...`)}
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              >
                Call Guardian
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/50">
            {messages.map((msg) => {
              const isMe = msg.senderRole === 'teacher';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-xs ${
                      isMe
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-2xs opacity-80">
                      <span className="font-semibold">{msg.senderName}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                    {isMe && (
                      <div className="flex justify-end pt-0.5">
                        <CheckCheck className="w-3 h-3 opacity-70" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type message to parent (moderated by administration)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <Button type="submit" variant="primary" size="sm" leftIcon={<Send className="w-4 h-4" />}>
              Send
            </Button>
          </form>
        </Card>
      </div>

      {/* Digital Permission Slips Section */}
      <Card className="space-y-4 !p-0 overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Active Excursion &amp; Fieldtrip Permission Slips</h3>
            <p className="text-2xs text-gray-500">Digital parental consent tracking with real-time audit ledger</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsSlipModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Permission Slip
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-gray-600 font-semibold uppercase text-2xs">
                <th className="py-3 px-4">Event &amp; Destination</th>
                <th className="py-3 px-4">Target Class</th>
                <th className="py-3 px-4">Date of Tour</th>
                <th className="py-3 px-4 text-right">Cost Per Learner</th>
                <th className="py-3 px-4 text-center">Guardian Consents</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slips.map((s) => {
                const percentSigned = Math.round((s.signedCount / s.totalStudents) * 100);
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900 block">{s.title}</span>
                      <span className="text-2xs text-gray-500">Destination: {s.destination}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{s.targetClass}</td>
                    <td className="py-3 px-4 font-mono text-gray-600 text-2xs">{s.date}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                      {currency} {s.cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold font-mono text-emerald-700">{s.signedCount}/{s.totalStudents}</span>
                        <span className="text-2xs text-gray-400">({percentSigned}%)</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant={percentSigned >= 80 ? 'accent' : 'brand'} size="sm">
                        {percentSigned >= 80 ? 'Ready for Dispatch' : 'Awaiting Consents'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Emergency SMS Broadcast Modal */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Broadcast Emergency School Alert (SMS & Push)"
        maxWidth="md"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900">Priority SMS Broadcast Gateway</span>
              <Badge variant="brand" size="sm">{smsCredits} SMS Available</Badge>
            </div>
            <p className="text-2xs text-amber-700 mt-1">
              Direct fallback to Safaricom/Airtel SMS for instantaneous campus alerts.
            </p>
          </div>

          <Select
            label="Target Recipient Audience"
            value={broadcastAudience}
            onChange={(e) => setBroadcastAudience(e.target.value)}
            options={[
              { value: 'all_parents', label: 'All Registered Parents & Guardians' },
              { value: 'all_staff', label: 'All Faculty & Administrative Staff' },
              { value: 'boarding_parents', label: 'Boarding Students Guardians Only' },
              { value: 'transport_parents', label: 'Bus Fleet Users Guardians' },
            ]}
          />

          <Input
            label="Alert Subject / Headline"
            placeholder="e.g. Heavy Rain Warning: Early Dismissal Today"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-2xs font-semibold text-gray-700 mb-1">
              Message Content (Max 160 characters per standard SMS)
            </label>
            <textarea
              rows={4}
              maxLength={320}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              placeholder="Dear Parent, due to heavy storms in the area, afternoon bus routes will depart at 2:30 PM..."
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              required
            />
            <span className="text-[10px] text-gray-400 mt-1 block text-right">
              {broadcastBody.length}/320 characters ({Math.ceil((broadcastBody.length || 1) / 160)} SMS segment)
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsBroadcastModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Radio className="w-4 h-4" />}>
              Transmit Emergency Broadcast
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permission Slip Modal */}
      <Modal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        title="Issue New Digital Permission Slip"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSlip} className="space-y-4 text-xs">
          <Input
            label="Excursion / Tour Title"
            placeholder="e.g. Bomas of Kenya Cultural Heritage Visit"
            value={slipTitle}
            onChange={(e) => setSlipTitle(e.target.value)}
            required
          />
          <Input
            label="Venue / Destination"
            placeholder="e.g. Langata, Nairobi"
            value={slipDestination}
            onChange={(e) => setSlipDestination(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tour Date"
              type="date"
              value={slipDate}
              onChange={(e) => setSlipDate(e.target.value)}
              required
            />
            <Select
              label="Target Class"
              value={slipClass}
              onChange={(e) => setSlipClass(e.target.value)}
              options={['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map((c) => ({
                value: c,
                label: c,
              }))}
            />
          </div>
          <Input
            label={`Cost Per Learner (${currency})`}
            type="number"
            min="0"
            value={slipCost}
            onChange={(e) => setSlipCost(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsSlipModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Publish Permission Slip
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
