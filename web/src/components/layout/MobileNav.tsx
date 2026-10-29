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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-40 px-2 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-[#1d5f99] font-bold scale-105'
                  : 'text-[#4b5563] hover:text-[#1d5f99]'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] truncate max-w-[64px]">{item.label}</span>
          </NavLink>
        );
      })}

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-gray-500 hover:text-gray-800 transition-all"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5" />
        <span className="text-2xs">More</span>
      </button>
    </div>
  );
};
