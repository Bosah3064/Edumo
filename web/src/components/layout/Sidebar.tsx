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
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 select-none shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-200 bg-white">
          <EdumoLogo size="md" showText={true} showBadge={true} to="/dashboard" />
        </div>
        {currentSchool && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b5563]">
              Active School
            </span>
            <span className="text-xs font-bold text-[#1d5f99] truncate max-w-[120px]">
              {currentSchool.name}
            </span>
          </div>
        )}

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-13rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1d5f99]/15 to-[#683669]/10 text-[#1d5f99] border-l-4 border-[#a5243d] shadow-sm'
                      : 'text-[#4b5563] hover:text-[#1d5f99] hover:bg-[#f3f4f6]'
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
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1d5f99] to-[#683669] text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs">
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-bold text-[#1f2937] truncate">
                {currentUser?.displayName || currentUser?.email || 'User'}
              </p>
              <p className="text-[10px] text-[#683669] font-semibold capitalize truncate">
                {currentRole || 'Staff Member'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title={t('nav.signOut')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#a5243d] hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
