import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import enTranslations from '../../i18n/en.json';
import swTranslations from '../../i18n/sw.json';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { EdumoLogo } from '../ui/EdumoLogo';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck2,
  BookOpen,
  GraduationCap,
  Megaphone,
  FileSpreadsheet,
  HeartHandshake,
  Settings,
  LogOut,
  ClipboardCheck,
  Award,
  Calendar,
  FileText,
  CreditCard,
  UserPlus,
  Bus,
  MessageSquare,
  Layers,
  ShieldCheck,
  User,
  Smartphone,
  Monitor,
  Sparkles,
  X,
  Library as LibraryIcon,
  Home,
  Bell,
  Check,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { signOut, currentUser, isPlatformAdmin } = useAuth();
  const { currentRole, currentSchool, organization, hasPermission } = useTenant();
  const { unreadCount } = useNotifications();
  const { canInstall, isIOS, isAndroid } = usePWAInstall();
  const navigate = useNavigate();
  const [sidebarLanguage, setSidebarLanguage] = useState<'en' | 'sw'>(() =>
    localStorage.getItem('edumo_sidebar_language') === 'sw' ? 'sw' : 'en'
  );

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<'en' | 'sw'>).detail;
      if (detail) setSidebarLanguage(detail);
    };
    window.addEventListener('edumo-sidebar-language-change', handleLanguageChange);
    return () => window.removeEventListener('edumo-sidebar-language-change', handleLanguageChange);
  }, []);

  // Strict Enterprise RBAC Hierarchy
  const role = (currentRole as string) || 'teacher';
  const isSuperOrPlatformAdmin =
    Boolean(isPlatformAdmin) ||
    role === 'superAdmin' ||
    role === 'platformAdmin' ||
    (currentUser as any)?.role === 'superAdmin' ||
    (currentUser as any)?.role === 'platformAdmin';

  const isOwner = role === 'orgOwner' || isSuperOrPlatformAdmin;
  const isPrincipal = isOwner || role === 'principal' || role === 'admin' || role === 'schoolAdmin';
  const isIT = isPrincipal || role === 'it_admin' || role === 'it';
  const isExams = isPrincipal || role === 'exam_officer' || role === 'exams' || role === 'deputy';
  const isBursar = isPrincipal || role === 'bursar' || role === 'accountant';
  const isTeacher = isPrincipal || isExams || role === 'teacher' || role === 'educator';
  const isParent = role === 'guardian' || role === 'parent';
  const isStudent = role === 'student' || role === 'learner';

  const roleLabel = isOwner
    ? 'Director / Owner'
    : isPrincipal
    ? 'Principal'
    : role === 'it_admin' || role === 'it'
    ? 'IT Admin'
    : role === 'exam_officer' || role === 'exams'
    ? 'Exams Officer'
    : role === 'bursar' || role === 'accountant'
    ? 'Bursar'
    : isParent
    ? 'Parent'
    : isStudent
    ? 'Student'
    : 'Educator';

  const activeLogo = currentSchool?.branding?.logo || organization?.branding?.logo;
  const navTranslations = sidebarLanguage === 'sw' ? swTranslations.nav : enTranslations.nav;

  // Build role-tailored navigation items
  const navItems = (() => {
    // 1. Parent / Guardian View: strictly limited to child's welfare, fees, report forms, and teacher chat
    if (isParent) {
      return [
        { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
        { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/parent-portal', label: sidebarLanguage === 'sw' ? 'Wanafunzi Wangu & Ada' : 'My Children & Fees', icon: HeartHandshake },
        { to: '/messaging', label: sidebarLanguage === 'sw' ? 'Ujumbe na Walimu' : 'Teacher Chat', icon: MessageSquare },
        { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
        { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Account', icon: User },
      ];
    }

    // 2. Student / Learner View: homework, timetable, enrolled subjects, library, and boarding
    if (isStudent) {
      return [
        { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
        { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/parent-portal', label: sidebarLanguage === 'sw' ? 'Masomo na Madokezo' : 'My Units & Notes', icon: BookOpen },
        { to: '/timetable', label: sidebarLanguage === 'sw' ? 'Ratiba ya Masomo' : 'Class Timetable', icon: Calendar },
        { to: '/assignments', label: sidebarLanguage === 'sw' ? 'Kazi za Darasa' : 'My Assignments', icon: ClipboardCheck },
        { to: '/library', label: sidebarLanguage === 'sw' ? 'Vitabu vya Maktaba' : 'Library Books', icon: LibraryIcon },
        { to: '/hostels', label: sidebarLanguage === 'sw' ? 'Bweni na Hosteli' : 'Hostel Allocation', icon: Home },
        { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
        { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Account', icon: User },
      ];
    }

    // 3. Exams Officer / Academic Dean: academics, marks, broadsheets, report card generator, master timetable
    if (role === 'exam_officer' || role === 'exams') {
      return [
        { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
        { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/academics', label: sidebarLanguage === 'sw' ? 'Matokeo na Broadsheets' : 'Academics & Broadsheets', icon: Award },
        { to: '/reports', label: sidebarLanguage === 'sw' ? 'Ripoti za Matokeo' : 'Report Card Builder', icon: FileText },
        { to: '/classes', label: navTranslations.classes, icon: BookOpen },
        { to: '/timetable', label: sidebarLanguage === 'sw' ? 'Ratiba ya Masomo' : 'Master Timetable', icon: Calendar },
        { to: '/students', label: navTranslations.students, icon: Users },
        { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
        { to: '/messaging', label: sidebarLanguage === 'sw' ? 'Ujumbe wa Shule' : 'Messages & Alerts', icon: MessageSquare },
        { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Profile', icon: User },
      ];
    }

    // 4. Bursar / Finance Officer: fees, M-Pesa, student billing ledgers, admissions, financial reports
    if (role === 'bursar' || role === 'accountant') {
      return [
        { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
        { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/finance', label: sidebarLanguage === 'sw' ? 'Ada na Fedha' : 'Fees & Finance', icon: CreditCard },
        { to: '/admissions', label: sidebarLanguage === 'sw' ? 'Udahili na Bili' : 'Admissions & Billing', icon: UserPlus },
        { to: '/students', label: sidebarLanguage === 'sw' ? 'Daftari la Wanafunzi' : 'Student Ledger', icon: Users },
        { to: '/reports', label: sidebarLanguage === 'sw' ? 'Ripoti za Fedha' : 'Financial Reports', icon: FileText },
        { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
        { to: '/messaging', label: sidebarLanguage === 'sw' ? 'Ujumbe wa Malipo' : 'Fee Inquiries', icon: MessageSquare },
        { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Profile', icon: User },
      ];
    }

    // 5. IT Administrator: user accounts, system configuration, Excel imports, platform console
    if (role === 'it_admin' || role === 'it') {
      return [
        { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
        { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/staff', label: navTranslations.staff, icon: GraduationCap },
        { to: '/excel-import', label: navTranslations.excelImport, icon: FileSpreadsheet },
        { to: '/branches', label: navTranslations.branches, icon: Building2 },
        { to: '/students', label: navTranslations.students, icon: Users },
        { to: '/operations', label: sidebarLanguage === 'sw' ? 'Uendeshaji wa Shule' : 'Operations & Fleet', icon: Bus },
        { to: '/platform-console', label: sidebarLanguage === 'sw' ? 'Jopo la Usimamizi' : 'Platform Console', icon: ShieldCheck },
        { to: '/settings', label: navTranslations.settings, icon: Settings },
        { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Profile', icon: User },
      ];
    }

    // 6. Teacher / Class Educator: roll call attendance, my classes, marks entry, educator portal, timetable, assignments
    if (!isPrincipal) {
      return [
        { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
        { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
        { to: '/attendance', label: navTranslations.attendance, icon: CalendarCheck2 },
        { to: '/classes', label: navTranslations.classes, icon: BookOpen },
        { to: '/academics', label: sidebarLanguage === 'sw' ? 'Weka Alama na Matokeo' : 'Enter Marks & CBC', icon: Award },
        { to: '/educator-portal', label: sidebarLanguage === 'sw' ? 'Tovuti ya Walimu' : 'Educator Portal', icon: Sparkles },
        { to: '/timetable', label: sidebarLanguage === 'sw' ? 'Ratiba ya Masomo' : 'Class Timetable', icon: Calendar },
        { to: '/assignments', label: sidebarLanguage === 'sw' ? 'Kazi za Darasa' : 'Assignments', icon: ClipboardCheck },
        { to: '/library', label: sidebarLanguage === 'sw' ? 'Maktaba ya Shule' : 'Library & Books', icon: LibraryIcon },
        { to: '/messaging', label: sidebarLanguage === 'sw' ? 'Ujumbe na Wazazi' : 'Guardian Messages', icon: MessageSquare },
        { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
        { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Profile', icon: User },
      ];
    }

    // 7. Principal / Org Owner: full comprehensive institutional suite
    return [
      { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
      { to: '/notifications', label: sidebarLanguage === 'sw' ? 'Arifa' : 'Notifications', icon: Bell, badge: unreadCount },
      ...(isOwner ? [{ to: '/branches', label: navTranslations.branches, icon: Building2 }] : []),
      { to: '/students', label: navTranslations.students, icon: Users },
      { to: '/attendance', label: navTranslations.attendance, icon: CalendarCheck2 },
      { to: '/classes', label: navTranslations.classes, icon: BookOpen },
      { to: '/timetable', label: sidebarLanguage === 'sw' ? 'Ratiba ya Masomo' : 'Class Timetable', icon: Calendar },
      { to: '/academics', label: sidebarLanguage === 'sw' ? 'Matokeo na Alama' : 'Academics & Marks', icon: Award },
      { to: '/assignments', label: sidebarLanguage === 'sw' ? 'Kazi za Darasa' : 'Assignments', icon: ClipboardCheck },
      { to: '/staff', label: navTranslations.staff, icon: GraduationCap },
      { to: '/educator-portal', label: sidebarLanguage === 'sw' ? 'Tovuti ya Walimu' : 'Educator Portal', icon: Sparkles },
      { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
      { to: '/excel-import', label: navTranslations.excelImport, icon: FileSpreadsheet },
      { to: '/reports', label: sidebarLanguage === 'sw' ? 'Ripoti za Excel' : 'Report Builder', icon: FileText },
      { to: '/finance', label: sidebarLanguage === 'sw' ? 'Ada na Fedha' : 'Fees & Finance', icon: CreditCard },
      { to: '/admissions', label: sidebarLanguage === 'sw' ? 'Udahili na Usajili' : 'Admissions', icon: UserPlus },
      { to: '/operations', label: sidebarLanguage === 'sw' ? 'Uendeshaji wa Shule' : 'Operations & Fleet', icon: Bus },
      { to: '/library', label: sidebarLanguage === 'sw' ? 'Maktaba ya Shule' : 'Library & Books', icon: LibraryIcon },
      { to: '/hostels', label: sidebarLanguage === 'sw' ? 'Bweni na Hosteli' : 'Hostels & Boarding', icon: Home },
      { to: '/messaging', label: sidebarLanguage === 'sw' ? 'Ujumbe na Wazazi' : 'Messages & Alerts', icon: MessageSquare },
      { to: '/extended', label: sidebarLanguage === 'sw' ? 'Duka & Ghala' : 'Inventory & Store', icon: Layers },
      ...(isSuperOrPlatformAdmin
        ? [{ to: '/platform-console', label: sidebarLanguage === 'sw' ? 'Jopo la Usimamizi' : 'Platform Console', icon: ShieldCheck }]
        : []),
      { to: '/parent-portal', label: navTranslations.parentPortal, icon: HeartHandshake },
      { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Profile', icon: User },
      { to: '/settings', label: navTranslations.settings, icon: Settings },
    ];
  })();

  return (
    <aside
      className="w-64 h-full max-h-screen max-h-[100dvh] flex flex-col min-h-0 shrink-0 select-none shadow-sm transition-colors duration-200 overflow-hidden"
      style={{
        backgroundColor: 'var(--sidebar-bg, #ffffff)',
        color: 'var(--sidebar-text, #334155)',
        borderRight: '1px solid var(--sidebar-border, #e2e8f0)',
      }}
    >
      {/* Brand Header — Crisp White Container with Mobile Close Action */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div
          className="h-16 px-4 flex items-center justify-between border-b border-slate-200 shadow-2xs shrink-0"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          {activeLogo ? (
            <NavLink to="/dashboard" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-white p-0.5 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                <img
                  src={activeLogo}
                  alt={currentSchool?.name || organization?.name || 'School Logo'}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black truncate text-slate-900 tracking-tight">
                  {currentSchool?.name || organization?.name}
                </p>
                {currentSchool?.branding?.motto || organization?.branding?.motto ? (
                  <p className="text-xs text-slate-500 italic truncate font-medium">
                    {currentSchool?.branding?.motto || organization?.branding?.motto}
                  </p>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1d5f99] block font-mono">
                    Institutional Portal
                  </span>
                )}
              </div>
            </NavLink>
          ) : (
            <div className="flex-1 flex items-center justify-start py-1">
              <EdumoLogo size="md" showText={true} showBadge={true} to="/dashboard" />
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {currentSchool && (
          <div
            className="px-4 py-2 flex items-center justify-between shrink-0"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderBottom: '1px solid var(--sidebar-border, #e2e8f0)',
            }}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--sidebar-text-muted, #64748b)' }}>
              Campus
            </span>
            <span
              className="text-xs font-bold truncate max-w-[140px] px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'var(--sidebar-text, #0f172a)',
              }}
            >
              {currentSchool.name}
            </span>
          </div>
        )}

        {/* Active Role Indicator (Pure Authenticated Role) */}
        <div
          className="px-4 py-1.5 flex items-center justify-between shrink-0 border-b relative"
          style={{
            backgroundColor: 'rgba(29, 95, 153, 0.05)',
            borderColor: 'var(--sidebar-border, #e2e8f0)',
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1d5f99] shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Role:
            </span>
            <span className="text-[10px] font-black uppercase text-[#1d5f99] truncate">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation List — Comfortable text-sm font size with smooth scrolling */}
        <nav className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive ? 'shadow-xs font-bold' : 'hover:bg-white/10'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: 'var(--sidebar-active-bg, #1d5f99)',
                        color: 'var(--sidebar-active-text, #ffffff)',
                        borderLeft: '4px solid var(--school-secondary, #683669)',
                      }
                    : {
                        color: 'var(--sidebar-text-muted, #64748b)',
                      }
                }
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="truncate flex-1">{item.label}</span>
                {Boolean((item as any).badge && (item as any).badge > 0) && (
                  <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shrink-0">
                    {(item as any).badge > 9 ? '9+' : (item as any).badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Install App + User Profile & Logout (Strictly pinned above mobile screen edge) */}
      <div
        className="p-3 shrink-0 space-y-2 border-t"
        style={{
          borderTop: '1px solid var(--sidebar-border, #e2e8f0)',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* MOBILE APP INSTALLATION BUTTON — STRICTLY FOR MOBILE PHONES */}
        {canInstall && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('edumo-trigger-pwa-install'));
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold transition-all bg-gradient-to-r from-[#1d5f99] to-[#683669] text-white shadow-sm hover:opacity-95 active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Smartphone className="w-4 h-4 text-white shrink-0" />
              <span className="text-white font-bold tracking-tight truncate">
                {isAndroid ? 'Install on Android' : isIOS ? 'Add to iPhone Home Screen' : 'Install Mobile App'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#1d5f99] font-black uppercase tracking-wider shadow-2xs shrink-0 ml-1">
              {isAndroid ? 'ANDROID' : isIOS ? 'IOS' : 'APP'}
            </span>
          </button>
        )}

        <div
          className="flex items-center justify-between p-2 rounded-xl shadow-2xs min-w-0"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid var(--sidebar-border, #e2e8f0)',
          }}
        >
          <div className="flex items-center gap-2 truncate min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs"
              style={{ backgroundColor: 'var(--school-primary, #1d5f99)' }}
            >
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div className="truncate text-left min-w-0 flex-1">
              <p
                className="text-xs font-bold truncate leading-tight"
                style={{ color: 'var(--sidebar-text, #0f172a)' }}
              >
                {currentUser?.displayName || currentUser?.email || 'User'}
              </p>
              <p
                className="text-[10px] font-medium capitalize truncate mt-0.5 leading-tight"
                style={{ color: 'var(--sidebar-text-muted, #64748b)' }}
              >
                {currentRole === 'orgOwner'
                  ? 'School Administrator'
                  : currentRole === 'teacher'
                  ? 'Educator / Teacher'
                  : currentRole
                  ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1)
                  : 'Faculty Member'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await signOut();
                navigate('/login', { replace: true });
              } catch (err) {
                console.error('Sign out error:', err);
              }
            }}
            title={navTranslations.signOut}
            className="p-1.5 rounded-lg transition-colors hover:bg-rose-50 text-slate-400 hover:text-rose-600 shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
