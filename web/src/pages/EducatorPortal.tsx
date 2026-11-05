import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { db } from '../firebase';
import {
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  BookOpen,
  CalendarCheck2,
  Award,
  Calendar,
  MessageSquare,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  School,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PendingInvite {
  id: string;
  code: string;
  orgId: string;
  schoolId: string;
  schoolName: string;
  staffName?: string;
  role: string;
  assignedSubjects?: string[];
  assignedClass?: string;
  createdAt?: unknown;
}

export const EducatorPortal: React.FC = () => {
  const { currentUser, refreshClaims } = useAuth();
  const { currentSchool, organization, switchSchool } = useTenant();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  // Educator ID derived from user UID or email
  const educatorId = `EDU-TCH-${(currentUser?.uid || '8921').substring(0, 5).toUpperCase()}`;

  // Check if educator is affiliated to an active school
  const isAffiliated = Boolean(currentSchool && organization && organization.id !== 'demo-org-edumo');

  useEffect(() => {
    if (!currentUser?.email) {
      setLoadingInvites(false);
      return;
    }

    const fetchPendingInvites = async () => {
      try {
        const emailLower = currentUser.email?.toLowerCase().trim();
        // Query invitations collection group for matching email
        const invitesQuery = query(
          collectionGroup(db, 'invitations'),
          where('email', '==', emailLower),
          where('status', '==', 'pending')
        );

        const snap = await getDocs(invitesQuery);
        const list: PendingInvite[] = snap.docs.map((d) => ({
          id: d.id,
          code: d.data().code || d.id,
          orgId: d.data().orgId,
          schoolId: d.data().schoolId,
          schoolName: d.data().schoolName || 'Institution Campus',
          staffName: d.data().staffName,
          role: d.data().role || 'teacher',
          assignedSubjects: d.data().assignedSubjects || [],
          assignedClass: d.data().assignedClass || '',
          createdAt: d.data().createdAt,
        }));
        setPendingInvites(list);
      } catch (err) {
        console.warn('Could not query pending invites:', err);
      } finally {
        setLoadingInvites(false);
      }
    };

    fetchPendingInvites();
  }, [currentUser?.email]);

  // Connect to school using 6-character Campus Join Code
  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a valid school join code');
      return;
    }

    setConnecting(true);
    const toastId = toast.loading('Verifying school code with institutional directory...');

    try {
      // 1. Check invitations collectionGroup first
      const inviteQ = query(
        collectionGroup(db, 'invitations'),
        where('code', '==', cleanCode)
      );
      const inviteSnap = await getDocs(inviteQ);

      if (!inviteSnap.empty) {
        const inviteData = inviteSnap.docs[0].data();
        const orgId = inviteData.orgId;
        const schoolId = inviteData.schoolId;

        // Bind user to this school
        if (currentUser) {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              displayName: currentUser.displayName || inviteData.staffName || 'Faculty Educator',
              email: currentUser.email || '',
              role: 'teacher',
              educatorId,
              memberships: [
                {
                  orgId,
                  schoolIds: [schoolId],
                  role: inviteData.role || 'teacher',
                  joinedAt: new Date().toISOString(),
                },
              ],
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          // Mark invitation accepted
          try {
            await updateDoc(inviteSnap.docs[0].ref, {
              status: 'accepted',
              acceptedBy: currentUser.uid,
              acceptedAt: serverTimestamp(),
            });
          } catch {
            // Non-fatal
          }

          localStorage.setItem('edumo_active_org_id', orgId);
          localStorage.setItem('edumo_active_school_id', schoolId);
          await refreshClaims();

          toast.success(`Connected successfully to ${inviteData.schoolName || 'your school'}!`, { id: toastId });
          window.location.reload();
          return;
        }
      }

      // 2. Direct school search fallback
      const schoolsQ = query(collectionGroup(db, 'schools'), where('code', '==', cleanCode));
      const schoolSnap = await getDocs(schoolsQ);

      if (!schoolSnap.empty) {
        const schoolDoc = schoolSnap.docs[0];
        const schoolData = schoolDoc.data();
        const pathSegments = schoolDoc.ref.path.split('/');
        const orgId = pathSegments[1];
        const schoolId = schoolDoc.id;

        if (currentUser) {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              displayName: currentUser.displayName || 'Faculty Educator',
              email: currentUser.email || '',
              role: 'teacher',
              educatorId,
              memberships: [
                {
                  orgId,
                  schoolIds: [schoolId],
                  role: 'teacher',
                  joinedAt: new Date().toISOString(),
                },
              ],
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          localStorage.setItem('edumo_active_org_id', orgId);
          localStorage.setItem('edumo_active_school_id', schoolId);
          await refreshClaims();

          toast.success(`Connected successfully to ${schoolData.name}!`, { id: toastId });
          window.location.reload();
          return;
        }
      }

      toast.error('Invalid school join code. Please verify the code with your school principal.', { id: toastId });
    } catch (err: unknown) {
      console.error('Join school error:', err);
      toast.error('Failed to verify join code. Please check your internet connection.', { id: toastId });
    } finally {
      setConnecting(false);
    }
  };

  const handleAcceptInvite = async (invite: PendingInvite) => {
    if (!currentUser) return;
    const toastId = toast.loading(`Joining ${invite.schoolName}...`);

    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          displayName: currentUser.displayName || invite.staffName || 'Faculty Educator',
          email: currentUser.email || '',
          role: 'teacher',
          educatorId,
          memberships: [
            {
              orgId: invite.orgId,
              schoolIds: [invite.schoolId],
              role: invite.role || 'teacher',
              joinedAt: new Date().toISOString(),
            },
          ],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update invitation doc status
      try {
        const invRef = doc(db, 'organizations', invite.orgId, 'schools', invite.schoolId, 'invitations', invite.code);
        await updateDoc(invRef, {
          status: 'accepted',
          acceptedBy: currentUser.uid,
          acceptedAt: serverTimestamp(),
        });
      } catch {
        // Non-fatal
      }

      localStorage.setItem('edumo_active_org_id', invite.orgId);
      localStorage.setItem('edumo_active_school_id', invite.schoolId);
      await refreshClaims();

      toast.success(`Joined ${invite.schoolName} as faculty member!`, { id: toastId });
      window.location.reload();
    } catch (err) {
      console.error('Accept invite error:', err);
      toast.error('Failed to accept invitation. Try again.', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1d5f99] to-[#683669] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Edumo Educator Network
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {currentUser?.displayName || 'Mwalimu'} — Educator Portal
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Official verification credentials, active institutional affiliations, and direct teaching tools.
            </p>
          </div>

          {/* Verified Educator Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-white/70 block">Verified Educator ID</span>
            <span className="font-mono text-base font-black text-white">{educatorId}</span>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(educatorId);
                  toast.success('Educator ID copied!');
                }}
                className="text-[10px] text-white hover:underline flex items-center gap-1 font-semibold"
              >
                <Copy className="w-3 h-3" />
                Copy ID
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliation Status Card */}
      {isAffiliated && currentSchool ? (
        <Card className="p-5 border-emerald-200 bg-emerald-50/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{currentSchool.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                    Active Affiliation
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Campus Code: <strong className="font-mono text-slate-700">{currentSchool.code || 'MAIN'}</strong> • Curriculum: <strong className="text-slate-700">{currentSchool.curriculumType || 'CBC'}</strong>
                </p>
              </div>
            </div>

            {/* Single School Policy Badge */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-950 shadow-2xs">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold text-[11px]">Strict Single-School Binding Active</p>
                <p className="text-[10px] text-emerald-800">Your profile is locked to this campus to safeguard student marks.</p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts for Daily Teaching */}
          <div className="mt-5 pt-4 border-t border-emerald-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => navigate('/attendance')}
              className="p-3 bg-white hover:bg-emerald-50 rounded-xl border border-emerald-100 text-left transition-all active:scale-98 shadow-2xs group"
            >
              <CalendarCheck2 className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Daily Roll Call</p>
              <p className="text-[10px] text-slate-500">Mark morning attendance</p>
            </button>

            <button
              onClick={() => navigate('/academics')}
              className="p-3 bg-white hover:bg-purple-50 rounded-xl border border-purple-100 text-left transition-all active:scale-98 shadow-2xs group"
            >
              <Award className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Enter Marks</p>
              <p className="text-[10px] text-slate-500">Record unit assessments</p>
            </button>

            <button
              onClick={() => navigate('/timetable')}
              className="p-3 bg-white hover:bg-blue-50 rounded-xl border border-blue-100 text-left transition-all active:scale-98 shadow-2xs group"
            >
              <Calendar className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Class Timetable</p>
              <p className="text-[10px] text-slate-500">View teaching schedule</p>
            </button>

            <button
              onClick={() => navigate('/assignments')}
              className="p-3 bg-white hover:bg-amber-50 rounded-xl border border-amber-100 text-left transition-all active:scale-98 shadow-2xs group"
            >
              <BookOpen className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Assignments</p>
              <p className="text-[10px] text-slate-500">Publish learner tasks</p>
            </button>
          </div>
        </Card>
      ) : (
        /* Not Affiliated Banner */
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Awaiting School Affiliation</p>
              <p className="text-[11px] text-amber-800">
                You are registered as a Verified Educator. To access learners and enter exam marks, connect to your official school below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const msg = `Hello Principal,\nMy Edumo Verified Educator ID is: *${educatorId}*\nEmail: ${currentUser?.email}\n\nPlease add me to the school staff directory or share the Campus Join Code.`;
              navigator.clipboard.writeText(msg);
              toast.success('WhatsApp message copied! Send to your principal.');
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
          >
            WhatsApp ID to Principal
          </button>
        </div>
      )}

      {/* Main Grid: School Join Code & Pending Invitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Enter School Join Code */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Join With Official School Code</h3>
              <p className="text-xs text-slate-500">Enter the 6-character code provided by your school administrator</p>
            </div>
          </div>

          <form onSubmit={handleJoinWithCode} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Invitation / Join Code
              </label>
              <input
                type="text"
                placeholder="e.g. EDM-8921 or MAIN"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full font-mono text-center tracking-wider text-base font-black px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase bg-slate-50"
                maxLength={10}
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Found on your school's official Edumo staff invite slip or WhatsApp message.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-1.5"
              isLoading={connecting}
            >
              <CheckCircle2 className="w-4 h-4" />
              Verify &amp; Connect to School
            </Button>
          </form>
        </Card>

        {/* Card 2: Pending School Invitations */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending School Invitations</h3>
              <p className="text-xs text-slate-500">Schools that have added your email to their staff roster</p>
            </div>
          </div>

          {loadingInvites ? (
            <div className="py-6 text-center text-xs text-slate-400">Checking for school invites...</div>
          ) : pendingInvites.length > 0 ? (
            <div className="space-y-2.5">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{inv.schoolName}</p>
                      <p className="text-[11px] text-purple-700 font-semibold capitalize">
                        Role: {inv.role.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAcceptInvite(inv)}
                      className="text-xs shrink-0"
                    >
                      Accept &amp; Join
                    </Button>
                  </div>

                  {inv.assignedSubjects && inv.assignedSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {inv.assignedSubjects.map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-purple-800 border border-purple-200 font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <p className="text-xs">No pending invitations for <strong>{currentUser?.email}</strong>.</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Ask your school administrator to add your email in their <strong>Staff Directory</strong>, or use the Join Code on the left.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Educational Policy Guide: Zero Ghost Schools */}
      <Card className="p-5 bg-slate-900 text-white rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Why Edumo Prevents "Ghost Schools"</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              In traditional systems, allowing teachers to create placeholder institutions leads to orphaned "ghost schools", duplicate learner records, and corrupted examination rankings. Edumo enforces a <strong>School-Anchored Educator Architecture</strong>: educators hold a single verified profile, and institutional creation is reserved for authenticated school heads.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-slate-400">
              <span>✓ Single-institution academic binding</span>
              <span>✓ Verified exam series isolation</span>
              <span>✓ Multi-unit teaching per class</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

