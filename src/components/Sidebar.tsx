import { Link, useLocation } from 'react-router-dom';
import {
  Activity, LayoutDashboard, Layers, Server,
  Keyboard, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import { useLayout } from './LayoutContext';

function NavItem({ to, icon, label, active, collapsed, isActive }: {
  to: string; icon: React.ReactNode; label: string; active?: boolean; collapsed: boolean;
  isActive: (path: string) => boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 ${collapsed ? 'px-2' : 'px-3'} py-2 rounded-md transition-colors group ${
        active ?? isActive(to) ? 'bg-slate-800 text-slate-50' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50'
      }`}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs text-slate-50 rounded
                     opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all
                     whitespace-nowrap z-50 shadow-lg">
          {label}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { collapsed, toggleCollapsed } = useLayout();
  const checkActive = (path: string) => location.pathname === path;
  const checkActiveStart = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      className={`bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16 overflow-hidden' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        {!collapsed ? (
          <>
            <Activity size={24} className="text-blue-500 shrink-0" />
            <span className="font-bold text-lg text-slate-50 truncate">MinGo.Qap</span>
          </>
        ) : (
          <Activity size={24} className="text-blue-500 mx-auto" />
        )}
      </div>

      {/* Keyboard hints — only show when expanded */}
      {!collapsed && (
        <div className="flex items-center gap-1 px-4 py-2 text-xs text-slate-500">
          <Keyboard size={12} />
          <span>Alt+D/A/S</span>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 p-3 ${collapsed ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
        <ul className="space-y-1">
          <li>
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={collapsed} isActive={checkActive} />
          </li>

          <li>
            <NavItem to="/agents" icon={<Server size={18} />} label="Agents" collapsed={collapsed} isActive={checkActiveStart} />
          </li>

          <li>
            <NavItem to="/schedulers" icon={<Layers size={18} />} label="Schedulers" collapsed={collapsed} isActive={checkActive} />
          </li>

        </ul>
      </nav>

      {/* Collapse toggle + version */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-50 hover:bg-slate-800 rounded-md transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
