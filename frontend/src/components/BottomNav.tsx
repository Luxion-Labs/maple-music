import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '../lib/utils';

export const BottomNav: React.FC = () => (
  <nav className="flex shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
    {[
      { to: '/',        icon: Home,    label: 'Home' },
      { to: '/search',  icon: Search,  label: 'Search' },
      { to: '/library', icon: Library, label: 'Library' },
    ].map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground',
          )
        }
      >
        <Icon className="h-5 w-5" />
        {label}
      </NavLink>
    ))}
  </nav>
);
