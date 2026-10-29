import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  HeartHandshake,
  CalendarCheck2,
  Phone,
  MessageCircle,
  Bell,
  Clock,
  Sparkles,
  School,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LinkedChild {
  id: string;
  name: string;
  admissionNo: string;
  className: string;
  schoolName: string;
  statusToday: 'present' | 'absent' | 'late';
  termAttendanceRate: string;
  teacherName: string;
}

export const ParentPortal: React.FC = () => {
  const { currentSchool } = useTenant();

  const [children, setChildren] = useState<LinkedChild[]>([
    {
      id: 'child-1',
      name: 'Amina Kariuki',
      admissionNo: 'ADM-2026-001',
      className: 'Grade 4 East (CBC)',
      schoolName: currentSchool?.name || 'Nairobi West Campus',
      statusToday: 'present',
      termAttendanceRate: '98%',
      teacherName: 'Peter Kamau',
    },
    {
      id: 'child-2',
      name: 'Brian Omondi',
      admissionNo: 'ADM-2026-002',
      className: 'Grade 2 (CBC)',
      schoolName: currentSchool?.name || 'Nairobi West Campus',
      statusToday: 'present',
      termAttendanceRate: '94%',
      teacherName: 'Alice Wanjira',
    },
  ]);

  const [selectedChildId, setSelectedChildId] = useState<string>('child-1');

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" dot>
            Guardian Access
          </Badge>
          <span className="text-2xs text-gray-500">Verified Parent Profile</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">
          Parent & Guardian Portal
        </h1>
        <p className="text-xs text-gray-500">
          Real-time daily updates for your enrolled children
        </p>
      </div>

      {/* Children Switcher Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {children.map((child) => {
          const isSelected = child.id === selectedChildId;
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
                  {child.className}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Child Overview Card */}
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

            <div className="p-4 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-accent-700 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                {activeChild.statusToday}
              </p>
              <p className="text-2xs text-accent-700">
                Confirmed in morning roll call
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-700">
                <span className="text-gray-600">Term Attendance:</span>
                <span className="font-semibold text-gray-900">
                  {activeChild.termAttendanceRate}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="text-gray-600">Class Teacher:</span>
                <span className="font-medium text-gray-900">
                  {activeChild.teacherName}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-surface-800 text-2xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-brand-700" />
            <span>Last marked at 8:15 AM</span>
          </div>
        </Card>

        {/* Notices and Campus Contact */}
        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-700" />
              <h3 className="text-sm font-semibold text-gray-900">
                Circulars for {activeChild.name}
              </h3>
            </div>
            <Badge variant="brand" size="sm">
              Term 1 Academic Year
            </Badge>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-900">
                Grade 4 CBC Materials & Science Fair
              </h4>
              <span className="text-2xs text-gray-600">Yesterday</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Learners are requested to bring natural fiber and clay materials for this Friday's
              Creative Arts practical strand assessment.
            </p>
          </div>

          <div className="pt-2 border-t border-surface-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <School className="w-4 h-4 text-brand-700" />
              <span>Campus: {activeChild.schoolName}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.success('Connecting to campus help desk...')}
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              >
                Call School Desk
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => toast.success('Opening WhatsApp school chat...')}
                leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
              >
                WhatsApp Desk
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
