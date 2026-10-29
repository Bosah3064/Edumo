import React from 'react';
import { useTranslation } from 'react-i18next';
import { BranchSwitcher } from './BranchSwitcher';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import {
  Menu,
  Sun,
  Moon,
  Globe,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useOffline();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('sw') ? 'en' : 'sw';
    i18n.changeLanguage(nextLang);
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
            {i18n.language.startsWith('sw') ? 'SW' : 'EN'}
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
      </div>
    </header>
  );
};
