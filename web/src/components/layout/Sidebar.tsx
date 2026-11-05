import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { signOut, currentUser, isPlatformAdmin } = useAuth();
  const { currentRole, currentSchool } = useTenant();
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

  const isSuperOrPlatformAdmin =
    Boolean(isPlatformAdmin) ||
    (currentRole as string) === 'superAdmin' ||
    currentRole === 'platformAdmin' ||
    (currentUser as any)?.role === 'superAdmin' ||
    (currentUser as any)?.role === 'platformAdmin';

  const navTranslations = sidebarLanguage === 'sw' ? swTranslations.nav : enTranslations.nav;
  const navItems = [
    { to: '/dashboard', label: navTranslations.dashboard, icon: LayoutDashboard },
    { to: '/branches', label: navTranslations.branches, icon: Building2 },
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
    { to: '/messaging', label: sidebarLanguage === 'sw' ? 'Ujumbe na Wazazi' : 'Messages & Alerts', icon: MessageSquare },
    { to: '/extended', label: sidebarLanguage === 'sw' ? 'Maktaba na Hosteli' : 'Extended Modules', icon: Layers },
    ...(isSuperOrPlatformAdmin
      ? [{ to: '/platform-console', label: sidebarLanguage === 'sw' ? 'Jopo la Usimamizi' : 'Platform Console', icon: ShieldCheck }]
      : []),
    { to: '/parent-portal', label: navTranslations.parentPortal, icon: HeartHandshake },
    { to: '/profile', label: sidebarLanguage === 'sw' ? 'Wasifu Wangu' : 'My Profile', icon: User },
    { to: '/settings', label: navTranslations.settings, icon: Settings },
  ];

  return (
    <aside
      className="w-64 h-full flex flex-col justify-between shrink-0 select-none shadow-sm transition-colors duration-200"
      style={{
        backgroundColor: 'var(--sidebar-bg, #ffffff)',
        color: 'var(--sidebar-text, #334155)',
        borderRight: '1px solid var(--sidebar-border, #e2e8f0)',
      }}
    >
      {/* Brand Header — Crisp White Container for Maximum Logo Visibility */}
      <div>
        <div
          className="h-18 px-4 flex items-center justify-between border-b border-slate-200 shadow-2xs"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          {currentSchool?.branding?.logo ? (
            <NavLink to="/dashboard" className="flex items-center gap-3 min-w-0 w-full hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-white p-0.5 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                <img
                  src={currentSchool.branding.logo}
                  alt={currentSchool.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black truncate text-slate-900 tracking-tight">
                  {currentSchool.name}
                </p>
                {currentSchool.branding.motto ? (
                  <p className="text-[10px] text-slate-500 italic truncate font-medium">
                    {currentSchool.branding.motto}
                  </p>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#1d5f99] block font-mono">
                    Institutional Portal
                  </span>
                )}
              </div>
            </NavLink>
          ) : (
            <div className="w-full flex items-center justify-center py-1">
              <EdumoLogo size="md" showText={true} showBadge={true} to="/dashboard" />
            </div>
          )}
        </div>
        {currentSchool && (
          <div
            className="px-5 py-2.5 flex items-center justify-between"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderBottom: '1px solid var(--sidebar-border, #e2e8f0)',
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--sidebar-text-muted, #64748b)' }}>
              Active School
            </span>
            <span
              className="text-xs font-bold truncate max-w-[130px] px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'var(--sidebar-text, #0f172a)',
              }}
            >
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive ? 'shadow-xs font-semibold' : 'hover:bg-white/10'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? {
                        backgroundColor: 'var(--sidebar-active-bg, #1d5f99)',
                        color: 'var(--sidebar-active-text, #ffffff)',
                        borderLeft: '3px solid var(--school-secondary, #683669)',
                      }
                    : {
                        color: 'var(--sidebar-text-muted, #64748b)',
                      }
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
      <div
        className="p-3"
        style={{
          borderTop: '1px solid var(--sidebar-border, #e2e8f0)',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Install Mobile PWA App Button */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('edumo-trigger-pwa-install'));
            if (onClose) onClose();
          }}
          className="w-full mb-2 flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-98"
          style={{
            backgroundColor: 'rgba(29, 95, 153, 0.1)',
            color: 'var(--school-primary, #1d5f99)',
            border: '1px solid rgba(29, 95, 153, 0.2)',
          }}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install Phone App</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1d5f99] text-white font-extrabold uppercase">
            PWA
          </span>
        </button>

        <div
          className="flex items-center justify-between p-2 rounded-xl shadow-2xs"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid var(--sidebar-border, #e2e8f0)',
          }}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div
              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs"
              style={{ backgroundColor: 'var(--school-primary, #1d5f99)' }}
            >
              {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
            </div>
            <div className="truncate text-left">
              <p
                className="text-xs font-bold truncate"
                style={{ color: 'var(--sidebar-text, #0f172a)' }}
              >
                {currentUser?.displayName || currentUser?.email || 'User'}
              </p>
              <p
                className="text-[10px] font-semibold capitalize truncate"
                style={{ color: 'var(--sidebar-text-muted, #64748b)' }}
              >
                {currentRole || 'Staff Member'}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await signOut();
                navigate('/login', { replace: true });
              } catch (err) {
                console.error('Sign out error:', err);
              }
            }}
            title={navTranslations.signOut}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/20"
            style={{ color: 'var(--sidebar-text-muted, #64748b)' }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
