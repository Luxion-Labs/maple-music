import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Library } from 'lucide-react';
import { cn } from '../lib/utils';

const links = [
  { to: '/',        icon: Home,    label: 'Home' },
  { to: '/search',  icon: Search,  label: 'Search' },
  { to: '/library', icon: Library, label: 'Library' },
];

export const Sidebar: React.FC = () => (
  <aside className="hidden md:flex md:w-56 md:flex-col md:border-r bg-card shrink-0">
    <div className="flex h-14 items-center px-5 font-heading text-lg font-bold tracking-tight">
      <span className="text-primary">Maple</span>
    </div>
    <nav className="flex-1 px-3 py-2">
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  </aside>
);
