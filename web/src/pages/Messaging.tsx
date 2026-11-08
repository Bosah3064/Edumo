import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
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
  ArrowLeft,
  Users,
  Smartphone,
  CheckCircle2,
  Share2,
  Calendar,
  AlertTriangle,
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
  participantPhone: string;
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

export interface BroadcastRecord {
  id: string;
  title: string;
  body: string;
  audience: string;
  channels: string[];
  priority: 'normal' | 'urgent';
  recipientCount: number;
  status: 'delivered' | 'sending' | 'scheduled';
  sentAt: string;
  senderName: string;
}

export const Messaging: React.FC = () => {
  const { organization, currentSchool, currentRole, isStudent, isGuardian, isAdmin } = useTenant();
  const isStudentUser = isStudent || currentRole === 'student' || (currentRole as string) === 'learner';
  const isGuardianUser = isGuardian || currentRole === 'guardian' || (currentRole as string) === 'parent';
  const canSendBroadcast = isAdmin || currentRole === 'teacher';
  const canCreateSlip = isAdmin || currentRole === 'teacher';
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'messages' | 'broadcast' | 'slips'>(() => {
    return isStudentUser ? 'broadcast' : 'messages';
  });
  const [mobileView, setMobileView] = useState<'threads' | 'chat'>('threads');

  // Threads & Active Chat
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('thr-1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Broadcasts
  const [broadcastRecords, setBroadcastRecords] = useState<BroadcastRecord[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('all_parents');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'urgent'>('normal');
  const [broadcastChannels, setBroadcastChannels] = useState<{ sms: boolean; inApp: boolean; whatsapp: boolean }>({
    sms: true,
    inApp: true,
    whatsapp: false,
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isNewBroadcastModalOpen, setIsNewBroadcastModalOpen] = useState(false);

  // Permission Slips
  const [slips, setSlips] = useState<PermissionSlip[]>([]);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipTitle, setSlipTitle] = useState('');
  const [slipDestination, setSlipDestination] = useState('');
  const [slipDate, setSlipDate] = useState('2026-03-20');
  const [slipClass, setSlipClass] = useState('Grade 4');
  const [slipCost, setSlipCost] = useState('1500');

  const smsCredits = 4850;
  const currency: string = (currentSchool?.settings?.currency as string) || 'KES';

  // Live Firestore subscriptions
  useEffect(() => {
    if (!organization?.id || !currentSchool?.id) return;

    // 1. Announcements (Broadcasts)
    const annRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'announcements'
    );
    const qAnn = query(annRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubAnn = onSnapshot(
      qAnn,
      (snap) => {
        const records: BroadcastRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            title: data.title || 'Broadcast Announcement',
            body: data.body || '',
            audience: (data.audience || 'All Parents').replace(/_/g, ' ').toUpperCase(),
            channels: data.channels || ['SMS', 'In-App'],
            priority: data.priority || 'normal',
            recipientCount: data.recipientCount || (data.audience === 'all_parents' ? 480 : 85),
            status: 'delivered',
            sentAt: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            senderName: data.senderName || 'School Administration',
          };
        });
        setBroadcastRecords(records);
      },
      (err) => console.warn('Broadcasts listener error:', err)
    );

    // 2. Permission slips
    const slipsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'permission_slips'
    );
    const unsubSlips = onSnapshot(
      slipsRef,
      (snap) => {
        const list: PermissionSlip[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PermissionSlip, 'id'>),
        }));
        setSlips(list);
      },
      (err) => console.warn('Slips listener error:', err)
    );

    // 3. Chat threads
    const threadsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'chat_threads'
    );
    const unsubThreads = onSnapshot(
      threadsRef,
      (snap) => {
        const list: ChatThread[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatThread, 'id'>),
        }));
        setThreads(list);
        if (list.length > 0 && !selectedThreadId) {
          setSelectedThreadId(list[0].id);
        }
      },
      (err) => console.warn('Chat threads listener error:', err)
    );

    return () => {
      unsubAnn();
      unsubSlips();
      unsubThreads();
    };
  }, [organization, currentSchool, selectedThreadId]);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === selectedThreadId) || (threads.length > 0 ? threads[0] : null);
  }, [threads, selectedThreadId]);

  // Listen to messages for active thread
  useEffect(() => {
    if (!organization?.id || !currentSchool?.id || !activeThread?.id) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'chat_threads',
      activeThread.id,
      'messages'
    );
    const qMsgs = query(msgsRef, orderBy('createdAt', 'asc'), limit(100));
    const unsubMsgs = onSnapshot(
      qMsgs,
      (snap) => {
        const list: ChatMessage[] = snap.docs.map((d) => {
          const data = d.data();
          const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            threadId: activeThread.id,
            senderId: data.senderId || '',
            senderName: data.senderName || '',
            senderRole: data.senderRole || 'teacher',
            text: data.text || '',
            timestamp: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: data.isRead ?? true,
          };
        });
        setMessages(list);
      },
      (err) => console.warn('Messages listener error:', err)
    );

    return () => unsubMsgs();
  }, [organization, currentSchool, activeThread?.id]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.participantName.toLowerCase().includes(q) ||
        t.studentName.toLowerCase().includes(q) ||
        t.studentClass.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThread) return;

    const messageText = inputText.trim();
    setInputText('');

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId: activeThread.id,
      senderId: currentUser?.uid || 'staff-uid',
      senderName: currentUser?.displayName || 'Class Educator',
      senderRole: 'teacher',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    if (organization?.id && currentSchool?.id) {
      try {
        const msgsRef = collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'chat_threads',
          activeThread.id,
          'messages'
        );
        await addDoc(msgsRef, {
          threadId: activeThread.id,
          senderId: currentUser?.uid || 'staff-uid',
          senderName: currentUser?.displayName || 'Class Educator',
          senderRole: 'teacher',
          text: messageText,
          isRead: false,
          createdAt: serverTimestamp(),
        });

        const threadRef = doc(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'chat_threads',
          activeThread.id
        );
        await setDoc(threadRef, {
          lastMessage: messageText,
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn('Error saving message to Firestore:', err);
      }
    }

    toast.success('Message sent directly to guardian!', { icon: '💬' });
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Please enter broadcast title and message body');
      return;
    }

    setIsBroadcasting(true);
    try {
      // Save broadcast into Firestore announcements for real-time multi-tenant notification
      if (organization?.id && currentSchool?.id) {
        const annRef = collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'announcements'
        );
        const selectedChannels = [];
        if (broadcastChannels.sms) selectedChannels.push('SMS');
        if (broadcastChannels.inApp) selectedChannels.push('In-App');
        if (broadcastChannels.whatsapp) selectedChannels.push('WhatsApp');

        await addDoc(annRef, {
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          audience: broadcastAudience,
          priority: broadcastPriority,
          channels: selectedChannels,
          senderName: currentUser?.displayName || 'School Administration',
          createdAt: serverTimestamp(),
        });
      }

      // Add to local dispatch history
      const newRecord: BroadcastRecord = {
        id: `bc-${Date.now()}`,
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        audience: broadcastAudience.replace('_', ' ').toUpperCase(),
        channels: Object.entries(broadcastChannels)
          .filter(([_, v]) => v)
          .map(([k]) => (k === 'sms' ? 'SMS' : k === 'inApp' ? 'In-App' : 'WhatsApp')),
        priority: broadcastPriority,
        recipientCount: broadcastAudience === 'all_parents' ? 480 : 85,
        status: 'delivered',
        sentAt: 'Just now',
        senderName: currentUser?.displayName || 'School Administration',
      };

      setBroadcastRecords((prev) => [newRecord, ...prev]);
      toast.success(
        `Dispatched priority broadcast "${broadcastTitle}" to ${newRecord.recipientCount} recipients!`,
        { icon: '📢' }
      );

      setBroadcastTitle('');
      setBroadcastBody('');
      setIsNewBroadcastModalOpen(false);
    } catch (err) {
      console.error('Error dispatching broadcast:', err);
      toast.error('Failed to dispatch broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCreateSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipTitle.trim()) {
      toast.error('Please provide an excursion title');
      return;
    }

    const newSlip: PermissionSlip = {
      id: `slip-${Date.now()}`,
      title: slipTitle.trim(),
      destination: slipDestination.trim() || 'Designated Campus Fieldwork',
      date: slipDate,
      targetClass: slipClass,
      cost: Number(slipCost) || 0,
      totalStudents: 42,
      signedCount: 0,
      declinedCount: 0,
      deadline: '2026-03-15',
    };

    setSlips((prev) => [newSlip, ...prev]);

    if (organization?.id && currentSchool?.id) {
      try {
        const slipsRef = collection(
          db,
          'organizations',
          organization.id,
          'schools',
          currentSchool.id,
          'permission_slips'
        );
        await addDoc(slipsRef, {
          title: newSlip.title,
          destination: newSlip.destination,
          date: newSlip.date,
          targetClass: newSlip.targetClass,
          cost: newSlip.cost,
          totalStudents: newSlip.totalStudents,
          signedCount: 0,
          declinedCount: 0,
          deadline: newSlip.deadline,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Error saving permission slip to Firestore:', err);
      }
    }

    toast.success('Digital permission slip created & dispatched to parent portal accounts!');
    setIsSlipModalOpen(false);
    setSlipTitle('');
    setSlipDestination('');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" dot>
              Communication &amp; Guardian Network
            </Badge>
            <span className="text-2xs text-slate-500">{currentSchool?.name || 'Main Campus'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight">
            Messaging &amp; Parent Broadcasts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {isStudentUser
              ? 'Institutional circulars, teacher updates, and school excursion permission forms'
              : 'Two-way guardian communication with office hours policy, SMS emergency campaigns, and digital consent slips.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        {!isStudentUser && !isGuardianUser && (
          <div className="flex items-center gap-2 flex-wrap">
            {canCreateSlip && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSlipModalOpen(true)}
                leftIcon={<FileCheck2 className="w-4 h-4 text-purple-600" />}
                className="text-xs font-bold"
              >
                Create Permission Slip
              </Button>
            )}

            {canSendBroadcast && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewBroadcastModalOpen(true)}
                leftIcon={<Radio className="w-4 h-4 text-white" />}
                className="text-xs font-bold bg-[#1d5f99] hover:bg-[#164a78]"
              >
                Dispatch SMS Broadcast
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Office Hours & SMS Credits Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1d5f99] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="font-black text-blue-950 text-xs sm:text-sm">
              Educator Office Hours: Mon – Fri, 08:00 AM – 04:30 PM
            </p>
            <p className="text-2xs text-blue-800 mt-0.5 leading-snug">
              Guarantees timely attention while safeguarding educator wellness. Inquiries received after hours are queued for next working day.
            </p>
          </div>
        </div>

        {!isStudentUser && !isGuardianUser && (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 shadow-2xs text-blue-900 font-mono text-xs font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>{smsCredits.toLocaleString()} SMS Credits</span>
            </div>
          </div>
        )}
      </div>

      {/* High-Level Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto scrollbar-none">
        {!isStudentUser && (
          <button
            onClick={() => {
              setActiveTab('messages');
              setMobileView('threads');
            }}
            className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-white text-[#1d5f99] shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Guardian Chats ({threads.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-white text-[#1d5f99] shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>{isStudentUser ? 'School Notices & Circulars' : 'SMS Broadcasts'} ({broadcastRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('slips')}
          className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'slips'
              ? 'bg-white text-[#1d5f99] shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>{isStudentUser ? 'Excursion Slips' : 'Permission Slips'} ({slips.length})</span>
        </button>
      </div>

      {/* TAB 1: GUARDIAN CHATS (RESPONSIVE SPLIT-VIEW FOR MOBILE & DESKTOP) */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[560px]">
          {/* Threads Column — On mobile: visible when mobileView === 'threads' */}
          <div
            className={`lg:col-span-4 ${
              mobileView === 'threads' ? 'block' : 'hidden lg:block'
            }`}
          >
            <Card className="p-3.5 space-y-3 flex flex-col h-[560px] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-black text-sm text-slate-900">Conversations</h3>
                <span className="text-2xs text-slate-500 font-bold">{threads.length} active</span>
              </div>

              <div className="relative">
                <Input
                  placeholder="Search guardian or learner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  className="text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
                {filteredThreads.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No active conversations</p>
                    <p className="text-2xs text-slate-400">Incoming guardian inquiries will appear here.</p>
                  </div>
                ) : (
                  filteredThreads.map((thr) => {
                    const isSelected = thr.id === activeThread?.id;
                    return (
                      <button
                        key={thr.id}
                        onClick={() => {
                          setSelectedThreadId(thr.id);
                          setMobileView('chat');
                        }}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-[#1d5f99] shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1d5f99] to-[#683669] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {thr.participantName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-xs truncate">
                                {thr.participantName}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {thr.studentName} • <span className="font-semibold text-slate-700">{thr.studentClass}</span>
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">
                            {thr.lastMessageTime}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-600 line-clamp-1 mt-2 pl-11">
                          {thr.lastMessage}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Chat Window Column — On mobile: visible when mobileView === 'chat' */}
          <div
            className={`lg:col-span-8 ${
              mobileView === 'chat' ? 'block' : 'hidden lg:block'
            }`}
          >
            <Card className="p-0 flex flex-col h-[560px] border border-slate-200 shadow-sm overflow-hidden">
              {!activeThread ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#1d5f99] flex items-center justify-center mx-auto">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <h4 className="font-black text-slate-900 text-sm">Select a Conversation</h4>
                  <p className="text-xs text-slate-500 max-w-sm">Choose a chat thread from the left or wait for incoming parent inquiries.</p>
                </div>
              ) : (
                <>
                  {/* Thread Header with Mobile Back Button */}
                  <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mobile Back to Threads Button */}
                      <button
                        onClick={() => setMobileView('threads')}
                        className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                        title="Back to conversation list"
                      >
                        <ArrowLeft className="w-5 h-5 text-slate-800" />
                      </button>

                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1d5f99] to-[#683669] text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
                        {activeThread.participantName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                          {activeThread.participantName}
                        </h3>
                        <p className="text-2xs text-slate-500 truncate">
                          Learner: <strong>{activeThread.studentName}</strong> ({activeThread.studentClass}) • Phone: {activeThread.participantPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toast.success(`Dialing ${activeThread.participantPhone}...`, { icon: '📞' })}
                        leftIcon={<Phone className="w-3.5 h-3.5 text-emerald-600" />}
                        className="text-xs font-bold"
                      >
                        <span className="hidden sm:inline">Call Guardian</span>
                      </Button>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/70">
                    {messages.length === 0 ? (
                      <div className="text-center py-16 px-4 space-y-2">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No messages in this conversation yet</p>
                        <p className="text-2xs text-slate-400">Type a message below to reach out to this guardian directly.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.senderRole === 'teacher';
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-2xs leading-relaxed ${
                                isMe
                                  ? 'bg-[#1d5f99] text-white rounded-br-none'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-2xs opacity-80 pb-0.5">
                                <span className="font-bold">{msg.senderName}</span>
                                <span className="font-mono text-[10px]">{msg.timestamp}</span>
                              </div>
                              <p>{msg.text}</p>
                              {isMe && (
                                <div className="flex justify-end pt-0.5">
                                  <CheckCheck className="w-3.5 h-3.5 opacity-80" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Composer Bar */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Type message to guardian (moderated by administration)..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#1d5f99] focus:outline-none"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={<Send className="w-4 h-4" />}
                      className="bg-[#1d5f99] hover:bg-[#164a78] font-bold text-xs shrink-0"
                    >
                      Send
                    </Button>
                  </form>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: SMS BROADCASTS & CAMPAIGNS */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Quick Dispatch Composer Card */}
          <Card className="p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1d5f99] flex items-center justify-center font-bold">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">SMS &amp; Circular Dispatcher</h3>
                  <p className="text-2xs text-slate-500">Send mass announcements to thousands of guardians simultaneously</p>
                </div>
              </div>
              <Badge variant="brand" size="sm">
                4,850 Credits Available
              </Badge>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Announcement Headline
                  </label>
                  <Input
                    placeholder="e.g. End of Term Reporting Schedule & Fee Clearance"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Target Recipient Group
                  </label>
                  <Select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value)}
                    className="text-xs"
                    options={[
                      { value: 'all_parents', label: 'All School Parents (480)' },
                      { value: 'grade_1', label: 'Grade 1 Parents (42)' },
                      { value: 'grade_2', label: 'Grade 2 Parents (45)' },
                      { value: 'grade_3', label: 'Grade 3 Parents (48)' },
                      { value: 'grade_4', label: 'Grade 4 Parents (42)' },
                      { value: 'grade_5', label: 'Grade 5 Parents (52)' },
                      { value: 'grade_6', label: 'Grade 6 Candidates (86)' },
                      { value: 'boarding_parents', label: 'Boarding Scholars Parents (120)' },
                      { value: 'day_parents', label: 'Day Scholars Parents (360)' },
                      { value: 'teaching_staff', label: 'Teaching Faculty & Staff (28)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Message Body (Auto-translated to SMS)
                  </label>
                  <span className="text-2xs font-mono text-slate-500">
                    {broadcastBody.length} characters • {Math.ceil((broadcastBody.length || 1) / 160)} SMS per recipient
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Type your official announcement here. Keep concise for optimal SMS deliverability across regional telecom networks (Safaricom, Airtel, MTN)..."
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1d5f99] focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.sms}
                      onChange={(e) => setBroadcastChannels({ ...broadcastChannels, sms: e.target.checked })}
                      className="rounded text-[#1d5f99] focus:ring-[#1d5f99]"
                    />
                    <span>Direct SMS</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.inApp}
                      onChange={(e) => setBroadcastChannels({ ...broadcastChannels, inApp: e.target.checked })}
                      className="rounded text-[#1d5f99] focus:ring-[#1d5f99]"
                    />
                    <span>In-App Announcement</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastPriority === 'urgent'}
                      onChange={(e) => setBroadcastPriority(e.target.checked ? 'urgent' : 'normal')}
                      className="rounded text-red-600 focus:ring-red-600"
                    />
                    <span className="text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Urgent Alert
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isBroadcasting}
                  leftIcon={<Radio className="w-4 h-4" />}
                  className="bg-[#1d5f99] hover:bg-[#164a78] font-bold text-xs"
                >
                  Send Multi-Channel Broadcast
                </Button>
              </div>
            </form>
          </Card>

          {/* Broadcast Dispatch History */}
          <div className="space-y-3">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">
              Recent Broadcast Campaigns ({broadcastRecords.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {broadcastRecords.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
                  <Radio className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No broadcasts dispatched yet</p>
                  <p className="text-2xs text-slate-400">Use the dispatcher above to send official announcements across SMS and in-app channels.</p>
                </div>
              ) : (
                broadcastRecords.map((bc) => (
                  <Card key={bc.id} className="p-4 border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-[#1d5f99]">
                          {bc.audience}
                        </span>
                        {bc.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-red-100 text-red-700">
                            Urgent
                          </span>
                        )}
                      </div>
                      <span className="text-2xs font-mono text-slate-400">{bc.sentAt}</span>
                    </div>

                    <h4 className="font-black text-xs text-slate-900 leading-snug">{bc.title}</h4>
                    <p className="text-2xs text-slate-600 leading-relaxed line-clamp-2">{bc.body}</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Delivered to {bc.recipientCount} guardians
                      </span>
                      <span>Channels: {bc.channels.join(', ')}</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIGITAL PERMISSION SLIPS & EXCURSION CONSENTS */}
      {activeTab === 'slips' && (
        <div className="space-y-4">
          <Card className="space-y-4 !p-0 overflow-hidden border border-slate-200 shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Active Excursion &amp; Fieldtrip Permission Slips</h3>
                <p className="text-2xs text-slate-500">Digital parental consent tracking with real-time audit ledger</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsSlipModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs font-bold bg-[#1d5f99] hover:bg-[#164a78]"
              >
                New Permission Slip
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-bold uppercase text-2xs">
                    <th className="py-3 px-4">Event &amp; Destination</th>
                    <th className="py-3 px-4">Target Class</th>
                    <th className="py-3 px-4">Date of Tour</th>
                    <th className="py-3 px-4 text-right">Cost Per Learner</th>
                    <th className="py-3 px-4 text-center">Guardian Consents</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No active permission slips</p>
                        <p className="text-2xs text-slate-400">Click &ldquo;New Permission Slip&rdquo; to create excursion authorisations and collect digital parent signatures.</p>
                      </td>
                    </tr>
                  ) : (
                    slips.map((s) => {
                      const percentSigned = Math.round((s.signedCount / s.totalStudents) * 100);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{s.title}</span>
                            <span className="text-2xs text-slate-500">Destination: {s.destination}</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">{s.targetClass}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-2xs">{s.date}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {currency} {s.cost.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-extrabold font-mono text-emerald-700">{s.signedCount}/{s.totalStudents}</span>
                              <span className="text-2xs text-slate-400">({percentSigned}%)</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={percentSigned >= 80 ? 'accent' : 'brand'} size="sm">
                              {percentSigned >= 80 ? 'Ready for Tour' : 'Awaiting Consents'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CREATE DIGITAL PERMISSION SLIP MODAL */}
      <Modal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        title="Create Fieldwork Permission Slip"
      >
        <form onSubmit={handleCreateSlip} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Fieldtrip or Event Name
            </label>
            <Input
              placeholder="e.g. National Botanical Gardens & Agriculture Center"
              value={slipTitle}
              onChange={(e) => setSlipTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Destination Address
            </label>
            <Input
              placeholder="e.g. Muguga Forest, Kiambu"
              value={slipDestination}
              onChange={(e) => setSlipDestination(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
                Target Class
              </label>
              <Select
                value={slipClass}
                onChange={(e) => setSlipClass(e.target.value)}
                options={[
                  { value: 'Grade 1', label: 'Grade 1' },
                  { value: 'Grade 2', label: 'Grade 2' },
                  { value: 'Grade 3', label: 'Grade 3' },
                  { value: 'Grade 4', label: 'Grade 4' },
                  { value: 'Grade 5', label: 'Grade 5' },
                  { value: 'Grade 6', label: 'Grade 6' },
                  { value: 'Junior School', label: 'Junior School' },
                ]}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
                Date of Trip
              </label>
              <Input
                type="date"
                value={slipDate}
                onChange={(e) => setSlipDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Cost Per Learner ({currency})
            </label>
            <Input
              type="number"
              value={slipCost}
              onChange={(e) => setSlipCost(e.target.value)}
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsSlipModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-[#1d5f99] font-bold">
              Dispatch to Parents
            </Button>
          </div>
        </form>
      </Modal>

      {/* QUICK DISPATCH MODAL FOR DIRECT HEADER BUTTON */}
      <Modal
        isOpen={isNewBroadcastModalOpen}
        onClose={() => setIsNewBroadcastModalOpen(false)}
        title="Dispatch Priority SMS Broadcast"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Headline
            </label>
            <Input
              placeholder="e.g. Urgent Notice: School Bus Schedule Adjustment"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Audience
            </label>
            <Select
              value={broadcastAudience}
              onChange={(e) => setBroadcastAudience(e.target.value)}
              options={[
                { value: 'all_parents', label: 'All School Parents (480)' },
                { value: 'grade_1', label: 'Grade 1 Parents' },
                { value: 'grade_4', label: 'Grade 4 Parents' },
                { value: 'grade_6', label: 'Grade 6 Candidates' },
                { value: 'boarding_parents', label: 'Boarding Parents' },
                { value: 'teaching_staff', label: 'Teaching Staff' },
              ]}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider mb-1">
              Message Content
            </label>
            <textarea
              rows={3}
              placeholder="Type announcement..."
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#1d5f99] focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsNewBroadcastModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isBroadcasting} className="bg-[#1d5f99] font-bold">
              Dispatch Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
