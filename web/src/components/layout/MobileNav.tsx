import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  GraduationCap,
  Menu,
} from 'lucide-react';

interface MobileNavProps {
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore }) => {
  const { t } = useTranslation();

  const items = [
    { to: '/dashboard', label: t('nav.dashboard') || 'Home', icon: LayoutDashboard },
    { to: '/attendance', label: t('nav.attendance') || 'Roll Call', icon: CalendarCheck2 },
    { to: '/students', label: t('nav.students') || 'Learners', icon: Users },
    { to: '/academics', label: t('nav.academics') || 'Grades', icon: GraduationCap },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 flex items-center justify-around select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.35rem)',
        height: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Mobile Bottom Navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-[#1d5f99] font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#1d5f99]' : ''}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#1d5f99]" />
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight truncate max-w-[62px]">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={onOpenMore}
        className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-500 hover:text-slate-900 transition-all duration-200 active:scale-95"
        aria-label="More navigation options"
      >
        <Menu className="w-5 h-5 text-slate-500" />
        <span className="text-[10px] mt-1 font-medium tracking-tight">Menu</span>
      </button>
    </nav>
  );
};
