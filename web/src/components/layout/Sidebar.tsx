import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import enTranslations from '../../i18n/en.json';
import swTranslations from '../../i18n/sw.json';
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
  ClipboardCheck,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { signOut, currentUser } = useAuth();
  const { currentRole, currentSchool } = useTenant();
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

  const navTranslations = sidebarLanguage === 'sw' ? swTranslations.nav : enTranslations.nav;
  const navItems = [
    { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
    { to: '/branches', label: navTranslations.branches, icon: Building2 },
    { to: '/students', label: navTranslations.students, icon: Users },
    { to: '/attendance', label: navTranslations.attendance, icon: CalendarCheck2 },
    { to: '/classes', label: navTranslations.classes, icon: BookOpen },
    { to: '/staff', label: navTranslations.staff, icon: GraduationCap },
    { to: '/announcements', label: navTranslations.announcements, icon: Megaphone },
    { to: '/assignments', label: sidebarLanguage === 'sw' ? 'Kazi za Darasa' : 'Assignments', icon: ClipboardCheck },
    { to: '/excel-import', label: navTranslations.excelImport, icon: FileSpreadsheet },
    { to: '/parent-portal', label: navTranslations.parentPortal, icon: HeartHandshake },
    { to: '/settings', label: navTranslations.settings, icon: Settings },
  ];

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 select-none shadow-sm">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-gray-200 bg-white">
          {currentSchool?.branding?.logo ? (
            <NavLink to="/dashboard" className="flex items-center gap-3 min-w-0">
              <img
                src={currentSchool.branding.logo}
                alt={currentSchool.name}
                className="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{currentSchool.name}</p>
                {currentSchool.branding.motto && (
                  <p className="text-[9px] text-gray-500 truncate max-w-[150px]">{currentSchool.branding.motto}</p>
                )}
              </div>
            </NavLink>
          ) : (
            <EdumoLogo size="md" showText={true} showBadge={true} to="/dashboard" />
          )}
        </div>
        {currentSchool && (
          <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4b5563]">
              Active School
            </span>
            <span className="text-xs font-bold truncate max-w-[120px]" style={{ color: 'var(--school-primary)' }}>
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
                      ? 'border-l-4 shadow-sm'
                      : 'text-[#4b5563] hover:bg-[#f3f4f6]'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(90deg, color-mix(in srgb, var(--school-primary) 15%, white), color-mix(in srgb, var(--school-secondary) 10%, white))',
                  color: 'var(--school-primary)',
                  borderLeftColor: 'var(--school-secondary)',
                } : {}}
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
            <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs" style={{ background: 'var(--school-brand-gradient)' }}>
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-bold text-[#1f2937] truncate">
                {currentUser?.displayName || currentUser?.email || 'User'}
              </p>
              <p className="text-[10px] font-semibold capitalize truncate" style={{ color: 'var(--school-secondary)' }}>
                {currentRole || 'Staff Member'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title={navTranslations.signOut}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#a5243d] hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
