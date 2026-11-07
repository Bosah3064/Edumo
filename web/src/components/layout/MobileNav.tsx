import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../contexts/TenantContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  GraduationCap,
  Sparkles,
  Menu,
} from 'lucide-react';

interface MobileNavProps {
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore }) => {
  const { t } = useTranslation();
  const { currentRole } = useTenant();

  // Genuine Android tactile haptic tap feedback
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const isTeacher = currentRole === 'teacher';
  const isSwahili = typeof localStorage !== 'undefined' && localStorage.getItem('edumo_sidebar_lang') === 'sw';

  const items = isTeacher
    ? [
        { to: '/dashboard', label: isSwahili ? 'Dashibodi' : 'Dashboard', icon: LayoutDashboard },
        { to: '/attendance', label: isSwahili ? 'Mahudhurio' : 'Attendance', icon: CalendarCheck2 },
        { to: '/academics', label: isSwahili ? 'Matokeo' : 'Academics', icon: GraduationCap },
        { to: '/educator-portal', label: isSwahili ? 'Walimu' : 'Teacher Portal', icon: Sparkles },
      ]
    : [
        { to: '/dashboard', label: isSwahili ? 'Dashibodi' : 'Dashboard', icon: LayoutDashboard },
        { to: '/attendance', label: isSwahili ? 'Mahudhurio' : 'Attendance', icon: CalendarCheck2 },
        { to: '/students', label: isSwahili ? 'Wanafunzi' : 'Learners', icon: Users },
        { to: '/academics', label: isSwahili ? 'Matokeo' : 'Academics', icon: GraduationCap },
      ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] px-2 pt-1 flex items-center justify-around select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.35rem)',
        height: 'calc(3.85rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Mobile Bottom Navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={triggerHaptic}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-[#1d5f99] font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1d5f99]/12 text-[#1d5f99] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-[#1d5f99]' : ''
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[68px] ${
                    isActive ? 'font-extrabold text-[#1d5f99]' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onOpenMore();
        }}
        className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl text-slate-500 hover:text-slate-900 transition-all duration-200 active:scale-95"
        aria-label="More navigation options"
      >
        <div className="flex items-center justify-center px-3.5 py-1 rounded-full text-slate-500">
          <Menu className="w-5 h-5 text-slate-500" />
        </div>
        <span className="text-[10px] mt-0.5 font-medium tracking-tight text-slate-500">Menu</span>
      </button>
    </nav>
  );
};
