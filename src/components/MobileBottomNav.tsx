import React from 'react';
import {
  ClipboardList,
  MapPin,
  Package,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import { CustomerView } from './Header';

interface MobileBottomNavProps {
  activeView: CustomerView;
  onSelectView: (view: CustomerView) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onSelectView,
}) => {
  const navItems: {
    id: CustomerView;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'products',
      label: 'المتجر',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'stores',
      label: 'المتاجر',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      id: 'repair',
      label: 'صيانة',
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      id: 'tradein',
      label: 'استبدال',
      icon: <RefreshCw className="w-5 h-5" />,
    },
    {
      id: 'orders',
      label: 'طلباتي',
      icon: <ClipboardList className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="التنقل السريع على الهاتف"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors"
    >
      <div className="grid grid-cols-5 h-14">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer transition-colors ${
                isActive
                  ? 'text-blue-700 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-7 h-0.5 rounded-b-full bg-blue-700 dark:bg-blue-400" />
              )}
              {item.icon}
              <span className="text-[11px] leading-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
