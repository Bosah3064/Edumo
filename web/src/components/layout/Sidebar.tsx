import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
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
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { signOut, currentUser } = useAuth();
  const { currentRole, currentSchool } = useTenant();

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/branches', label: t('nav.branches'), icon: Building2 },
    { to: '/students', label: t('nav.students'), icon: Users },
    { to: '/attendance', label: t('nav.attendance'), icon: CalendarCheck2 },
    { to: '/classes', label: t('nav.classes'), icon: BookOpen },
    { to: '/staff', label: t('nav.staff'), icon: GraduationCap },
    { to: '/announcements', label: t('nav.announcements'), icon: Megaphone },
    { to: '/excel-import', label: t('nav.excelImport'), icon: FileSpreadsheet },
    { to: '/parent-portal', label: t('nav.parentPortal'), icon: HeartHandshake },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="w-64 h-full bg-surface-900 border-r border-surface-800 flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-surface-800/80">
          <EdumoLogo size="md" showText={true} showBadge={true} to="/dashboard" />
        </div>
        {currentSchool && (
          <div className="px-5 py-2 bg-surface-950/40 border-b border-surface-800/50 flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-surface-400">
              Active School
            </span>
            <span className="text-2xs font-bold text-brand-300 truncate max-w-[120px]">
              {currentSchool.name}
            </span>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-13rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/25 to-edumoPurple-500/20 text-white border-l-2 border-edumoRed-500 shadow-sm'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="p-3 border-t border-surface-800/80 bg-surface-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-900/60 border border-surface-800">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-white truncate">
                {currentUser?.displayName || currentUser?.email || 'User'}
              </p>
              <p className="text-2xs text-brand-400 capitalize truncate">
                {currentRole || 'Staff Member'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title={t('nav.signOut')}
            className="p-1.5 rounded-lg text-surface-400 hover:text-danger-400 hover:bg-surface-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
