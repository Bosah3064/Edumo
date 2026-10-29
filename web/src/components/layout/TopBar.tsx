import React, { useState } from 'react';
import { BranchSwitcher } from './BranchSwitcher';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useOffline();
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarLanguage, setSidebarLanguage] = useState<'en' | 'sw'>(() =>
    localStorage.getItem('edumo_sidebar_language') === 'sw' ? 'sw' : 'en'
  );

  const toggleLanguage = () => {
    const nextLang = sidebarLanguage === 'sw' ? 'en' : 'sw';
    localStorage.setItem('edumo_sidebar_language', nextLang);
    setSidebarLanguage(nextLang);
    window.dispatchEvent(new CustomEvent('edumo-sidebar-language-change', { detail: nextLang }));
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-[#1d5f99] hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <BranchSwitcher />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline / Online indicator pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs text-[#1f2937] font-bold transition-colors shadow-xs"
          title="Toggle English / Kiswahili"
        >
          <Globe className="w-3.5 h-3.5 text-[#1d5f99]" />
          <span className="uppercase">
            {sidebarLanguage === 'sw' ? 'SW' : 'EN'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#1d5f99] transition-colors shadow-xs"
          title={`Switch theme mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#683669]" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50 transition-colors"
            title="Open profile menu"
          >
            <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs font-bold" style={{ background: 'var(--school-brand-gradient)' }}>
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full rounded-lg object-cover" />
              ) : (
                (currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div className="hidden md:block text-left min-w-0 max-w-[140px]">
              <p className="text-xs font-bold text-gray-900 truncate">{currentUser?.displayName || 'User Profile'}</p>
              <p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-sm font-bold text-gray-900 truncate">{currentUser?.displayName || 'User Profile'}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4 text-[#1d5f99]" />
                Profile & School Settings
              </button>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
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
