import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from '../ui/OfflineBanner';
import { PWAInstallBanner } from '../pwa/PWAInstallBanner';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui/Spinner';

export const AppShell: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { currentSchool } = useTenant();
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const primary = currentSchool?.branding?.primaryColor || '#1d5f99';
    const secondary = currentSchool?.branding?.secondaryColor || '#683669';
    root.style.setProperty('--school-primary', primary);
    root.style.setProperty('--school-secondary', secondary);
    root.style.setProperty('--school-brand-gradient', `linear-gradient(135deg, ${primary}, ${secondary})`);
    root.style.setProperty('--color-blue', primary);
    root.style.setProperty('--color-purple', secondary);

    return () => {
      root.style.removeProperty('--school-primary');
      root.style.removeProperty('--school-secondary');
      root.style.removeProperty('--school-brand-gradient');
      root.style.removeProperty('--color-blue');
      root.style.removeProperty('--color-purple');
    };
  }, [currentSchool]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs font-semibold text-gray-500">Loading your school workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f3f4f6] text-[#1f2937]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 h-full animate-slide-in-right">
            <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <OfflineBanner />
        <TopBar onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* PWA Phone Install Prompt Banner */}
        <PWAInstallBanner />

        {/* Mobile bottom nav */}
        <MobileNav onOpenMore={() => setIsMobileSidebarOpen(true)} />
      </div>
    </div>
  );
};
