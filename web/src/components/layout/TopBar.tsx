import React, { useState, useRef, useEffect } from 'react';
import { BranchSwitcher } from './BranchSwitcher';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  Globe,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronLeft,
  LogOut,
  User,
  Settings,
  Bell,
  CheckCheck,
  ArrowRight,
  CheckCircle2,
  Building2,
  Check,
  X,
} from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useOffline();
  const { currentUser, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { organization, schools, currentSchool, switchSchool, currentRole, isStudent, isAdmin } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [mobileCampusOpen, setMobileCampusOpen] = useState(false);

  const [sidebarLanguage, setSidebarLanguage] = useState<'en' | 'sw'>(() =>
    localStorage.getItem('edumo_sidebar_language') === 'sw' ? 'sw' : 'en'
  );

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close desktop dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  const toggleLanguage = () => {
    const nextLang = sidebarLanguage === 'sw' ? 'en' : 'sw';
    localStorage.setItem('edumo_sidebar_language', nextLang);
    setSidebarLanguage(nextLang);
    window.dispatchEvent(new CustomEvent('edumo-sidebar-language-change', { detail: nextLang }));
  };

  const getPageTitle = (pathname: string): string => {
    if (pathname.startsWith('/attendance')) return 'Roll Call Attendance';
    if (pathname.startsWith('/academics')) return 'Academics & CBC';
    if (pathname.startsWith('/students')) return 'Learners Directory';
    if (pathname.startsWith('/classes')) return isStudent ? 'My Enrolled Class' : 'Classes & Streams';
    if (pathname.startsWith('/finance')) return isStudent ? 'Fee Statement' : 'Fees & Accounts';
    if (pathname.startsWith('/library')) return 'School Library';
    if (pathname.startsWith('/assignments')) return 'Tasks & Quizzes';
    if (pathname.startsWith('/timetable')) return 'Class Timetable';
    if (pathname.startsWith('/hostels')) return 'Hostels & Boarding';
    if (pathname.startsWith('/messaging')) return 'Messages & Alerts';
    if (pathname.startsWith('/announcements')) return 'Notice Board';
    if (pathname.startsWith('/operations')) return 'Operations & Fleet';
    if (pathname.startsWith('/staff')) return 'Staff & Faculty';
    if (pathname.startsWith('/admissions')) return 'Admissions';
    if (pathname.startsWith('/profile')) return 'My Profile';
    if (pathname.startsWith('/settings')) return 'School Settings';
    if (pathname.startsWith('/parent-portal')) return 'Parent Portal';
    if (pathname.startsWith('/educator-portal')) return 'Teacher Portal';
    if (pathname.startsWith('/excel-import')) return 'Excel Import';
    if (pathname.startsWith('/reports')) return 'Report Generator';
    if (pathname.startsWith('/branches')) return 'Campus Branches';
    if (pathname.startsWith('/extended')) return 'Inventory & Store';
    if (pathname.startsWith('/platform-console')) return 'Platform Console';
    if (pathname.startsWith('/notifications')) return 'Notifications';
    return currentSchool?.name || organization?.name || 'Edumo';
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Faculty Member';
    if (role === 'orgOwner' || role === 'schoolAdmin') return 'School Administrator';
    if (role === 'teacher') return 'Educator / Teacher';
    if (role === 'bursar' || role === 'accounts') return 'Bursar & Accounts';
    if (role === 'student' || role === 'learner') return 'Enrolled Student';
    if (role === 'parent' || role === 'guardian') return 'Parent / Guardian';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const isRootRoute = location.pathname === '/dashboard' || location.pathname === '/';
  const recentNotifications = notifications.slice(0, 4);

  return (
    <>
      <header
        className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-xs transition-all select-none"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
          height: 'calc(3.75rem + env(safe-area-inset-top, 0px))',
        }}
      >
        {/* =========================================================
            MOBILE NATIVE APP HEADER (Visible ONLY on phones / tablets < lg)
            ========================================================= */}
        <div className="flex lg:hidden items-center justify-between h-full px-3 w-full">
          {/* Left: Back Navigation or Brand/Campus Indicator */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!isRootRoute ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  navigate(-1);
                }}
                className="flex items-center gap-1.5 p-1 -ml-1 text-slate-800 active:scale-95 transition-transform cursor-pointer"
                aria-label="Go back"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#1d5f99] shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </div>
                <span className="text-sm font-black text-slate-900 tracking-tight truncate max-w-[170px]">
                  {getPageTitle(location.pathname)}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    onToggleSidebar();
                  }}
                  className="p-1.5 -ml-1 text-slate-600 hover:text-[#1d5f99] active:scale-95 transition-transform rounded-xl cursor-pointer"
                  title="Open Navigation Menu"
                  aria-label="Open Navigation Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs"
                    style={{ background: 'var(--school-brand-gradient, #1d5f99)' }}
                  >
                    {currentSchool?.branding?.logo ? (
                      <img
                        src={currentSchool.branding.logo}
                        alt="Logo"
                        className="w-full h-full object-contain rounded-xl p-0.5"
                      />
                    ) : (
                      (currentSchool?.name || 'E').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate leading-tight">
                      {currentSchool?.name || organization?.name || 'Edumo'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setMobileCampusOpen(true);
                      }}
                      className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5 truncate leading-tight hover:text-[#1d5f99] cursor-pointer"
                    >
                      <span className="truncate max-w-[110px]">{currentSchool?.name || 'Main Campus'}</span>
                      <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Connection Dot, Notifications Bell, Profile Avatar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live Connection status */}
            {!isOnline ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-300 animate-pulse">
                <WifiOff className="w-3 h-3 text-amber-700" />
                <span>Offline</span>
              </div>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-0.5" title="Connected online" />
            )}

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate('/notifications');
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:text-[#1d5f99] active:scale-90 transition-transform cursor-pointer"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[1rem] h-[1rem] px-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar (Opens Native Mobile Sheet) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setMobileProfileOpen(true);
              }}
              className="p-0.5 rounded-full border-2 border-[#1d5f99]/20 active:scale-90 transition-transform cursor-pointer shrink-0 ml-0.5"
              title="Open profile & settings"
              aria-label="Open profile menu"
            >
              <div
                className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase shadow-2xs"
                style={{ background: 'var(--school-brand-gradient, #1d5f99)' }}
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
            </button>
          </div>
        </div>

        {/* =========================================================
            DESKTOP TOP BAR (Visible ONLY on lg+ screens)
            ========================================================= */}
        <div className="hidden lg:flex items-center justify-between h-full px-6 w-full">
          {/* Left Column: Campus Switcher */}
          <div className="flex items-center gap-3 min-w-0">
            <BranchSwitcher />
          </div>

          {/* Right Column: Offline/Online, Notifications, Language, Theme, Profile */}
          <div className="flex items-center gap-2.5">
            {/* Offline / Online indicator pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-2xs">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-2xs">Offline</span>
                </>
              )}
            </div>

            {/* Notifications Dropdown Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileOpen(false);
                }}
                className="relative p-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-[#1d5f99] transition-colors shadow-xs cursor-pointer"
                title="Notifications and announcements"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Flyout Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl z-50 animate-scale-in">
                  <div className="flex items-center justify-between pb-2.5 px-1 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-gray-900">Notifications</h4>
                      {unreadCount > 0 ? (
                        <span className="px-2 py-0.2 rounded-full text-2xs font-extrabold bg-rose-100 text-rose-700">
                          {unreadCount} unread
                        </span>
                      ) : (
                        <span className="px-2 py-0.2 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700">
                          Up to date
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead()}
                        className="text-2xs font-bold text-[#1d5f99] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {/* Notification Items List */}
                  <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto my-1">
                    {recentNotifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                        <p className="font-medium text-gray-600">All caught up!</p>
                        <p className="text-2xs text-gray-400 mt-0.5">No recent activity</p>
                      </div>
                    ) : (
                      recentNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read) markAsRead(n.id);
                            setNotificationsOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-3 hover:bg-gray-50 ${
                            !n.read ? 'bg-blue-50/50' : 'bg-transparent'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              !n.read ? 'bg-[#1d5f99]' : 'bg-transparent'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p
                                className={`text-xs truncate ${
                                  !n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                                }`}
                              >
                                {n.title}
                              </p>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                {new Date(n.timestamp).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <p className="text-2xs text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* View All Notifications Link */}
                  <div className="pt-2 border-t border-gray-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/notifications');
                      }}
                      className="w-full py-1.5 text-xs font-bold text-[#1d5f99] hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>View All Notifications</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language switch */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs text-[#1f2937] font-bold transition-colors shadow-xs cursor-pointer"
              title="Toggle English / Kiswahili"
            >
              <Globe className="w-3.5 h-3.5 text-[#1d5f99]" />
              <span className="uppercase text-2xs">
                {sidebarLanguage === 'sw' ? 'SW' : 'EN'}
              </span>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex p-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#1d5f99] transition-colors shadow-xs cursor-pointer"
              title="Switch theme mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-[#683669]" />
              )}
            </button>

            {/* Profile Avatar & Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
                title="Open profile menu"
              >
                <div
                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs font-bold uppercase"
                  style={{ background: 'var(--school-brand-gradient)' }}
                >
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Profile"
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    (currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-left min-w-0 max-w-[130px]">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {currentUser?.displayName || 'User Profile'}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {currentUser?.displayName || 'User Profile'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                    <p className="text-[10px] font-bold text-[#1d5f99] mt-0.5 uppercase tracking-wider">
                      {getRoleLabel(currentRole as string)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#1d5f99]" />
                    <span>My Profile &amp; Credentials</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-[#683669]" />
                    <span>Institution Settings &amp; Theming</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false);
                      try {
                        await signOut();
                        navigate('/login', { replace: true });
                      } catch (err) {
                        console.error('Sign out error:', err);
                      }
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          MOBILE PROFILE ACTION SHEET (Bottom Sheet for Native Look)
          ========================================================= */}
      {mobileProfileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileProfileOpen(false)}
          />
          <div
            className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl border-t border-slate-200 animate-slide-up max-h-[85vh] overflow-y-auto"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.25rem)',
            }}
          >
            {/* Drag Pill Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* User Profile Card */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
              <div
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-base uppercase shrink-0 shadow-sm"
                style={{ background: 'var(--school-brand-gradient, #1d5f99)' }}
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User"
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  (currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 truncate">
                  {currentUser?.displayName || 'User Profile'}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser?.email}</p>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1d5f99]/10 text-[#1d5f99]">
                    {getRoleLabel(currentRole as string)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-1 mb-4 text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMobileProfileOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1d5f99] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span>My Profile &amp; Credentials</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  toggleLanguage();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#683669] flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span>Language</span>
                </div>
                <span className="text-xs font-black uppercase px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {sidebarLanguage === 'sw' ? 'Kiswahili (SW)' : 'English (EN)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  toggleTheme();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </div>
                  <span>Theme Mode</span>
                </div>
                <span className="text-xs font-black capitalize px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {theme}
                </span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setMobileProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span>School Settings &amp; Configuration</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={async () => {
                triggerHaptic();
                setMobileProfileOpen(false);
                try {
                  await signOut();
                  navigate('/login', { replace: true });
                } catch (err) {
                  console.error('Sign out error:', err);
                }
              }}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-black text-xs transition-colors cursor-pointer border border-rose-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Edumo</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          MOBILE CAMPUS BRANCH SWITCHER SHEET
          ========================================================= */}
      {mobileCampusOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileCampusOpen(false)}
          />
          <div
            className="relative z-10 w-full rounded-t-3xl bg-white p-5 shadow-2xl border-t border-slate-200 animate-slide-up max-h-[80vh] overflow-y-auto"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.25rem)',
            }}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 tracking-tight">
                  Campus Branches ({schools.length})
                </h3>
                <p className="text-xs text-slate-500">
                  {organization?.name || 'Edumo Academy Group'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileCampusOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto mb-4">
              {schools.map((school) => {
                const isSelected = school.id === currentSchool?.id;
                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      switchSchool(school.id);
                      setMobileCampusOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1d5f99]/10 text-[#1d5f99] border-2 border-[#1d5f99]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="truncate">{school.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#1d5f99] shrink-0" />}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setMobileCampusOpen(false);
                  navigate('/branches');
                }}
                className="w-full flex items-center justify-center gap-1.5 p-3 rounded-2xl text-xs text-[#1d5f99] bg-blue-50 hover:bg-blue-100 font-black transition-colors cursor-pointer"
              >
                <span>Manage &amp; Add Campus Branches</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};