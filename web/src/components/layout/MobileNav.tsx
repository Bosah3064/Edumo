import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Megaphone,
  MoreHorizontal,
} from 'lucide-react';

interface MobileNavProps {
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore }) => {
  const { t } = useTranslation();

  const items = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/students', label: t('nav.students'), icon: Users },
    { to: '/attendance', label: t('nav.attendance'), icon: CalendarCheck2 },
    { to: '/announcements', label: t('nav.announcements'), icon: Megaphone },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-900/95 backdrop-blur-lg border-t border-surface-800 z-40 px-2 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-400 font-semibold scale-105'
                  : 'text-surface-400 hover:text-surface-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-2xs truncate max-w-[64px]">{item.label}</span>
          </NavLink>
        );
      })}

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-surface-400 hover:text-surface-200 transition-all"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5" />
        <span className="text-2xs">More</span>
      </button>
    </div>
  );
};
