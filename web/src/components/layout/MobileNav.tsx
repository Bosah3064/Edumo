import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../contexts/TenantContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  GraduationCap,
  Sparkles,
  Menu,
  MessageSquare,
  Bell,
  BookOpen,
  DollarSign,
  Library as LibraryIcon,
  CreditCard,
} from 'lucide-react';

interface MobileNavProps {
  onOpenMore: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore }) => {
  const { t } = useTranslation();
  const { currentRole, isStudent, isTeacher, isBursar } = useTenant();
  const { unreadCount } = useNotifications();

  // Genuine Android / iOS tactile haptic tap feedback
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const isSwahili =
    typeof localStorage !== 'undefined' &&
    (localStorage.getItem('edumo_sidebar_lang') === 'sw' ||
      localStorage.getItem('edumo_sidebar_language') === 'sw');

  const role = (currentRole as string) || 'teacher';

  // Tailored 5-tab mobile navigation bar per role
  let items: NavItem[] = [
    { to: '/dashboard', label: isSwahili ? 'Dashibodi' : 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: isSwahili ? 'Mahudhurio' : 'Attendance', icon: CalendarCheck2 },
    { to: '/students', label: isSwahili ? 'Wanafunzi' : 'Learners', icon: Users },
    { to: '/finance', label: isSwahili ? 'Fedha' : 'Finance', icon: DollarSign },
  ];

  if (isStudent || role === 'student' || role === 'learner') {
    items = [
      { to: '/dashboard', label: isSwahili ? 'Dashibodi' : 'Dashboard', icon: LayoutDashboard },
      { to: '/classes', label: isSwahili ? 'Darasa Langu' : 'My Class', icon: BookOpen },
      { to: '/assignments', label: isSwahili ? 'Kazi' : 'Tasks', icon: Sparkles },
      { to: '/library', label: isSwahili ? 'Maktaba' : 'Library', icon: LibraryIcon },
    ];
  } else if (isTeacher || role === 'teacher') {
    items = [
      { to: '/dashboard', label: isSwahili ? 'Dashibodi' : 'Dashboard', icon: LayoutDashboard },
      { to: '/attendance', label: isSwahili ? 'Mahudhurio' : 'Roll Call', icon: CalendarCheck2 },
      { to: '/academics', label: isSwahili ? 'Matokeo' : 'Marks Entry', icon: GraduationCap },
      { to: '/classes', label: isSwahili ? 'Madarasa' : 'My Classes', icon: BookOpen },
    ];
  } else if (isBursar || role === 'bursar' || role === 'accounts') {
    items = [
      { to: '/dashboard', label: isSwahili ? 'Dashibodi' : 'Dashboard', icon: LayoutDashboard },
      { to: '/finance', label: isSwahili ? 'Ada' : 'Fee Register', icon: DollarSign },
      { to: '/students', label: isSwahili ? 'Leja' : 'Learners', icon: Users },
      { to: '/finance?tab=cashbook', label: isSwahili ? 'Keshbuki' : 'Cashbook', icon: CreditCard },
    ];
  } else if (role === 'parent' || role === 'guardian') {
    items = [
      { to: '/parent-portal', label: isSwahili ? 'Wanafunzi' : 'My Children', icon: Users },
      { to: '/parent-portal?tab=fees', label: isSwahili ? 'Ada' : 'Fees & Pay', icon: DollarSign },
      { to: '/messaging', label: isSwahili ? 'Ujumbe' : 'Messages', icon: MessageSquare },
      { to: '/announcements', label: isSwahili ? 'Taarifa' : 'Circulars', icon: Bell, badge: unreadCount },
    ];
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-2xl border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.07)] px-1 pt-1.5 flex items-center justify-around select-none"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
        height: 'calc(3.85rem + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Mobile Bottom Navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const badgeCount = item.badge;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={triggerHaptic}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-0.5 px-0.5 rounded-2xl transition-transform duration-150 active:scale-90 ${
                isActive
                  ? 'text-[#1d5f99] font-black'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`relative flex items-center justify-center px-3.5 py-1 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1d5f99]/12 text-[#1d5f99] shadow-2xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-[#1d5f99] stroke-[2.25]' : 'stroke-[1.75]'
                    }`}
                  />
                  {badgeCount && badgeCount > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white font-black text-[8px] flex items-center justify-center ring-2 ring-white animate-pulse">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[66px] leading-tight ${
                    isActive ? 'font-black text-[#1d5f99]' : 'text-slate-500 font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      {/* Menu / More Trigger Tab */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          onOpenMore();
        }}
        className="flex-1 flex flex-col items-center justify-center py-0.5 px-0.5 rounded-2xl text-slate-400 hover:text-slate-700 transition-transform duration-150 active:scale-90 cursor-pointer"
        aria-label="More navigation options"
      >
        <div className="relative flex items-center justify-center px-3.5 py-1 rounded-full text-slate-400">
          <Menu className="w-5 h-5 text-slate-500 stroke-[1.75]" />
          {unreadCount > 0 && !items.some((i: any) => i.badge) && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-semibold tracking-tight text-slate-500 truncate max-w-[66px] leading-tight">
          {isSwahili ? 'Zaidi' : 'Menu'}
        </span>
      </button>
    </nav>
  );
};