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
    <header className="h-16 px-4 sm:px-6 bg-surface-900/90 backdrop-blur-md border-b border-surface-800 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <BranchSwitcher />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline / Online indicator pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
            isOnline
              ? 'bg-accent-500/10 text-accent-400 border-accent-500/20'
              : 'bg-warning-500/10 text-warning-400 border-warning-500/25 animate-pulse'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span className="hidden sm:inline">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-800/80 hover:bg-surface-700/80 border border-surface-700/60 text-xs text-surface-200 font-medium transition-colors"
          title="Toggle English / Kiswahili"
        >
          <Globe className="w-3.5 h-3.5 text-surface-400" />
          <span className="uppercase font-semibold">
            {i18n.language.startsWith('sw') ? 'SW' : 'EN'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-surface-800/80 hover:bg-surface-700/80 border border-surface-700/60 text-surface-300 hover:text-white transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
