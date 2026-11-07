import React, { useState, useRef, useEffect } from 'react';
import { BranchSwitcher } from './BranchSwitcher';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  Globe,
  Wifi,
  WifiOff,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Bell,
  Download,
  CheckCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useOffline();
  const { currentUser, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isStandalone, canInstall, platformLabel, triggerInstall } = usePWAInstall();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarLanguage, setSidebarLanguage] = useState<'en' | 'sw'>(() =>
    localStorage.getItem('edumo_sidebar_language') === 'sw' ? 'sw' : 'en'
  );

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
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

  const toggleLanguage = () => {
    const nextLang = sidebarLanguage === 'sw' ? 'en' : 'sw';
    localStorage.setItem('edumo_sidebar_language', nextLang);
    setSidebarLanguage(nextLang);
    window.dispatchEvent(new CustomEvent('edumo-sidebar-language-change', { detail: nextLang }));
  };

  const handleInstallClick = () => {
    window.dispatchEvent(new CustomEvent('edumo-trigger-pwa-install'));
  };

  const recentNotifications = notifications.slice(0, 4);

  return (
    <header
      className="px-3 sm:px-6 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-all"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
        height: 'calc(4rem + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Left Column: Menu Button & Campus Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-[#1d5f99] hover:bg-gray-100 transition-colors shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <BranchSwitcher />
      </div>

      {/* Right Column: Offline/Online, Install App, Notifications, Language, Theme, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Offline / Online indicator pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-bold border shrink-0 ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-2xs">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="text-[10px] sm:text-xs">Offline</span>
            </>
          )}
        </div>

        {/* 1-Tap Install App Button (Visible when NOT already in standalone window) */}
        {!isStandalone && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1d5f99] to-[#683669] text-white hover:opacity-95 font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
            title={`Install Edumo App for ${platformLabel}`}
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Notifications Dropdown Bell */}
        <div className="relative" ref={notifRef}>
          <button
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
                    onClick={() => {
                      markAllAsRead();
                    }}
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
                          <p className={`text-xs truncate ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {new Date(n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
          onClick={toggleLanguage}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs text-[#1f2937] font-bold transition-colors shadow-xs cursor-pointer"
          title="Toggle English / Kiswahili"
        >
          <Globe className="w-3.5 h-3.5 text-[#1d5f99]" />
          <span className="uppercase text-2xs">
            {sidebarLanguage === 'sw' ? 'SW' : 'EN'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="hidden md:flex p-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#1d5f99] transition-colors shadow-xs cursor-pointer"
          title="Switch theme mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#683669]" />}
        </button>

        {/* Profile Avatar & Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
            title="Open profile menu"
          >
            <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs font-bold" style={{ background: 'var(--school-brand-gradient)' }}>
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full rounded-lg object-cover" />
              ) : (
                (currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="hidden lg:block text-left min-w-0 max-w-[130px]">
              <p className="text-xs font-bold text-gray-900 truncate">{currentUser?.displayName || 'User Profile'}</p>
              <p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-sm font-bold text-gray-900 truncate">{currentUser?.displayName || 'User Profile'}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <User className="w-4 h-4 text-[#1d5f99]" />
                My Profile &amp; Credentials
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/notifications');
                }}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#1d5f99]" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#683669]" />
                Institution Settings &amp; Theming
              </button>
              <button
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
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
