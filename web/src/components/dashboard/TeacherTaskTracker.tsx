import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  FileText,
  CalendarCheck2,
} from 'lucide-react';

interface ClassStatus {
  name: string;
  attendanceMarked: boolean;
  studentCount: number;
}

interface TeacherTaskTrackerProps {
  classes: ClassStatus[];
  assignmentCount: number;
  todayDateStr: string;
}

export const TeacherTaskTracker: React.FC<TeacherTaskTrackerProps> = ({
  classes,
  assignmentCount,
  todayDateStr,
}) => {
  const navigate = useNavigate();

  const totalClasses = classes.length;
  const markedClasses = classes.filter((c) => c.attendanceMarked).length;
  const pendingClasses = totalClasses - markedClasses;

  const completionPercent = totalClasses > 0 ? Math.round((markedClasses / totalClasses) * 100) : 100;

  return (
    <Card className="space-y-4 border border-gray-200/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-gray-900 text-sm">
                Teacher Task Tracker
              </h3>
              <Badge variant={completionPercent === 100 ? 'accent' : 'neutral'} dot>
                {completionPercent}% Completed
              </Badge>
            </div>
            <p className="text-2xs text-gray-500">
              Live classroom operations tracker for today ({todayDateStr})
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate('/attendance')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Daily Registers
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-2xs font-semibold text-gray-600">
          <span>Class Attendance Roll Call Progress</span>
          <span>{markedClasses} of {totalClasses} Classes Marked</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#1d5f99] to-[#15803d]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Class Status Grid */}
      {totalClasses > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {classes.map((cls) => (
            <div
              key={cls.name}
              onClick={() => navigate('/attendance')}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition hover:shadow-xs flex items-center justify-between ${
                cls.attendanceMarked
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}
            >
              <div className="truncate">
                <span className="font-bold block truncate">{cls.name}</span>
                <span className="text-[10px] opacity-75">{cls.studentCount} Learners</span>
              </div>
              {cls.attendanceMarked ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-gray-50 text-center text-xs text-gray-500">
          No classes configured yet. Add classes under Classes & Streams to track attendance status.
        </div>
      )}

      {/* Bottom Summary Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-2xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {markedClasses} Marked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {pendingClasses} Pending Roll Call
          </span>
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            {assignmentCount} Active Assignments
          </span>
        </div>

        {pendingClasses > 0 && (
          <span className="font-medium text-amber-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Action required: {pendingClasses} registers waiting
          </span>
        )}
      </div>
    </Card>
  );
};
