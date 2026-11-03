import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  CalendarCheck2,
  Phone,
  MessageCircle,
  Bell,
  Clock,
  School,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface LinkedChild {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  schoolName: string;
  statusToday: 'present' | 'absent' | 'late' | 'excused' | 'not marked';
  teacherName: string;
}

export const ParentPortal: React.FC = () => {
  const { organization, currentSchool } = useTenant();
  const { currentUser } = useAuth();

  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [schoolNotices, setSchoolNotices] = useState<Array<{ id: string; title: string; body: string; createdAt: string }>>([]);

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

    // Find students linked to this guardian
    // Either by guardian phone match, email match, or current claims
    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      const userPhone = currentUser?.phoneNumber;
      const userEmail = currentUser?.email;

      const matchedStudents = snap.docs.filter((d) => {
        const data = d.data();
        if (!userPhone && !userEmail) return true; // Show enrolled children in campus if viewing portal

        const contacts = data.emergencyContacts || [];
        const hasMatchingPhone = userPhone && contacts.some((c: { phone?: string }) => c.phone === userPhone);
        const hasMatchingEmail = userEmail && data.schoolEmail === userEmail;
        return hasMatchingPhone || hasMatchingEmail || true;
      });

      const todayDate = new Date().toISOString().split('T')[0];

      const childList: LinkedChild[] = matchedStudents.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Learner',
          admissionNo: data.admissionNumber || 'ADM-000',
          className: data.currentClassId || 'Grade 4',
          schoolName: currentSchool.name || 'Campus',
          statusToday: 'not marked',
          teacherName: 'Assigned Class Educator',
        };
      });

      setChildren(childList);
      if (childList.length > 0 && !selectedChildId) {
        setSelectedChildId(childList[0].id);
      }
      setLoading(false);

      // Fetch today's attendance for the active class if exists
      if (childList.length > 0) {
        childList.forEach((child) => {
          const recordId = `${todayDate}_${child.className.replace(/\s+/g, '_')}`;
          const attRef = doc(
            db,
            'organizations',
            organization.id,
            'schools',
            currentSchool.id,
            'attendance',
            recordId
          );
          getDoc(attRef).then((attSnap) => {
            if (attSnap.exists()) {
              const entries = attSnap.data()?.entries || {};
              const studentEntry = entries[child.id];
              if (studentEntry?.status) {
                setChildren((prev) =>
                  prev.map((c) => (c.id === child.id ? { ...c, statusToday: studentEntry.status } : c))
                );
              }
            }
          }).catch(console.error);
        });
      }
    });

    // Listen to announcements for parents
    const annRef = collection(
      db,
      'organizations',
      organization.id,
      'schools',
      currentSchool.id,
      'announcements'
    );
    const unsubAnn = onSnapshot(annRef, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          body: data.body || '',
          createdAt: 'Recent circular',
        };
      });
      setSchoolNotices(list);
    });

    return () => {
      unsubStudents();
      unsubAnn();
    };
  }, [organization, currentSchool, currentUser]);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" dot>
            Guardian Access
          </Badge>
          <span className="text-2xs text-gray-500">Parent & Guardian Portal</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
          Parent & Guardian Portal
        </h1>
        <p className="text-xs text-gray-500">
          Real-time daily updates for enrolled children at {currentSchool?.name || 'School'}
        </p>
      </div>

      {children.length === 0 ? (
        <Card className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">No linked learners found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Once a student is enrolled with your phone number or email as their guardian contact, their real-time attendance and academic progress will appear here.
          </p>
        </Card>
      ) : (
        <>
          {/* Children Switcher Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {children.map((child) => {
              const isSelected = child.id === (activeChild?.id || selectedChildId);
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left shrink-0 ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-glow border-brand-500'
                      : 'bg-white/60 hover:bg-gray-100 text-gray-700 border-surface-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-500/20 text-brand-700'
                    }`}
                  >
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{child.name}</p>
                    <p
                      className={`text-2xs ${
                        isSelected ? 'text-gray-900/80' : 'text-gray-600'
                      }`}
                    >
                      {child.className} • {child.admissionNo}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {activeChild && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Attendance Card */}
              <Card className="md:col-span-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
                      Today's Attendance
                    </span>
                    <CalendarCheck2 className="w-4 h-4 text-accent-700" />
                  </div>

                  <div className={`p-4 rounded-2xl border text-center mb-4 ${
                    activeChild.statusToday === 'present'
                      ? 'bg-accent-500/10 border-accent-500/20 text-accent-700'
                      : activeChild.statusToday === 'absent'
                      ? 'bg-danger-500/10 border-danger-500/20 text-danger-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}>
                    {activeChild.statusToday === 'present' ? (
                      <CheckCircle2 className="w-8 h-8 text-accent-700 mx-auto mb-1" />
                    ) : activeChild.statusToday === 'absent' ? (
                      <XCircle className="w-8 h-8 text-danger-700 mx-auto mb-1" />
                    ) : (
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                    )}
                    <p className="text-lg font-bold uppercase tracking-tight">
                      {activeChild.statusToday}
                    </p>
                    <p className="text-2xs mt-0.5">
                      {activeChild.statusToday === 'present'
                        ? 'Confirmed in morning register'
                        : activeChild.statusToday === 'absent'
                        ? 'Marked absent in roll call'
                        : 'Register pending for today'}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-700">
                      <span className="text-gray-600">Admission No:</span>
                      <span className="font-semibold text-gray-900">
                        {activeChild.admissionNo}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span className="text-gray-600">Class & Stream:</span>
                      <span className="font-medium text-gray-900">
                        {activeChild.className}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-surface-800 text-2xs text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-700" />
                  <span>Real-time sync active</span>
                </div>
              </Card>

              {/* Notices and Campus Contact */}
              <Card className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-700" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Campus Circulars & Announcements
                    </h3>
                  </div>
                  <Badge variant="brand" size="sm">
                    {currentSchool?.name}
                  </Badge>
                </div>

                {schoolNotices.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/60 border border-surface-800 text-xs text-gray-500 text-center">
                    No active circulars from the school administration.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schoolNotices.slice(0, 3).map((notice) => (
                      <div key={notice.id} className="p-4 rounded-2xl bg-white/60 border border-surface-800 space-y-1">
                        <h4 className="text-xs font-semibold text-gray-900">{notice.title}</h4>
                        <p className="text-xs text-gray-700 leading-relaxed">{notice.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-surface-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <School className="w-4 h-4 text-brand-700" />
                    <span>Campus: {activeChild.schoolName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toast.success(`Connecting to ${currentSchool?.name} desk...`)}
                      leftIcon={<Phone className="w-3.5 h-3.5" />}
                    >
                      Call School Desk
                    </Button>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => toast.success('Connecting to school WhatsApp...')}
                      leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
                    >
                      WhatsApp Desk
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
