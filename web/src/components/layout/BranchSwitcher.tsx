import React, { useState, useRef, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { School as SchoolIcon, ChevronDown, Check, Plus, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BranchSwitcher: React.FC = () => {
  const { organization, schools, currentSchool, switchSchool } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentSchool) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-left transition-all duration-200 shadow-xs"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1d5f99] shrink-0 font-bold">
          <SchoolIcon className="w-4 h-4" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-[10px] uppercase tracking-wider text-[#4b5563] font-bold truncate max-w-[130px]">
            {organization?.name || 'Edumo Academy'}
          </p>
          <p className="text-xs font-bold text-[#1f2937] truncate max-w-[130px]">
            {currentSchool.name}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-gray-200 shadow-2xl z-50 p-2 animate-scale-in">
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-bold text-[#4b5563] uppercase tracking-wider">
              Campus Branches ({schools.length})
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {schools.map((school) => {
              const isSelected = school.id === currentSchool.id;
              return (
                <button
                  key={school.id}
                  onClick={() => {
                    switchSchool(school.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#1d5f99]/10 text-[#1d5f99] font-bold border border-[#1d5f99]/20'
                      : 'hover:bg-gray-50 text-[#4b5563] hover:text-[#1d5f99]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{school.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#1d5f99] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/branches');
              }}
              className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs text-[#1d5f99] hover:bg-blue-50 font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage & Add Branches</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
