'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Server,
  Layers,
  Rocket,
  FolderOpen,
  Globe,
  Database,
  Container,
  ShieldAlert,
  Terminal,
  Activity,
  Archive,
  History,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { DeveloperSignature } from './DeveloperBranding';

export type NavTab =
  | 'overview'
  | 'servers'
  | 'applications'
  | 'deployments'
  | 'files'
  | 'domains'
  | 'databases'
  | 'docker'
  | 'firewall'
  | 'terminal'
  | 'monitoring'
  | 'backups'
  | 'logs'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: any;
  onLogout: () => void;
  servers: any[];
  selectedServerId?: string;
  onSelectServer: (id: string) => void;
}

const NAV_ITEMS: { id: NavTab; label: string; icon: any; category?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, category: 'Core' },
  { id: 'servers', label: 'VPS Servers', icon: Server, category: 'Core' },
  { id: 'applications', label: 'Applications & Bots', icon: Layers, category: 'Workloads' },
  { id: 'deployments', label: 'Deployments', icon: Rocket, category: 'Workloads' },
  { id: 'files', label: 'File Manager', icon: FolderOpen, category: 'Infrastructure' },
  { id: 'domains', label: 'Domains & SSL', icon: Globe, category: 'Infrastructure' },
  { id: 'databases', label: 'Databases', icon: Database, category: 'Infrastructure' },
  { id: 'docker', label: 'Docker Engine', icon: Container, category: 'Infrastructure' },
  { id: 'firewall', label: 'Firewall Center', icon: ShieldAlert, category: 'Security' },
  { id: 'terminal', label: 'Web Terminal', icon: Terminal, category: 'Security' },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, category: 'Operations' },
  { id: 'backups', label: 'Backups', icon: Archive, category: 'Operations' },
  { id: 'logs', label: 'Audit Logs', icon: History, category: 'Operations' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'System' },
];

export function Navigation({
  activeTab,
  onTabChange,
  user,
  onLogout,
  servers,
  selectedServerId,
  onSelectServer,
}: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-16 bg-zinc-950/80 backdrop-blur-md border-b border-red-500/15 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-red-950/40 lg:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('overview')}>
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center border border-red-400/30 shadow-crimson-sm">
              <span className="font-black text-white text-base tracking-wider">K</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-wider text-sm lg:text-base text-white">KARVION</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/30">
                  CONTROL
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-zinc-400 -mt-0.5 tracking-tight">
                Universal VPS & Automated Deployment
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Active VPS Selector */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-red-500/15 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>
            <select
              value={selectedServerId || (servers[0]?.id || '')}
              onChange={(e) => onSelectServer(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer pr-1"
            >
              {servers.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-200">
                  {s.name} ({s.ipAddress})
                </option>
              ))}
            </select>
          </div>

          {/* Arjun Kahar Signature Pill */}
          <div className="hidden md:block">
            <DeveloperSignature />
          </div>

          {/* User profile / Logout */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-300">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex fixed top-16 left-0 bottom-0 w-64 bg-zinc-950/90 border-r border-red-500/15 flex-col justify-between py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-red-950/60 to-red-900/20 text-white border border-red-500/30 shadow-crimson-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-red-400' : 'text-zinc-400 group-hover:text-red-400'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-red-400" />}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer branding */}
        <div className="pt-4 border-t border-red-500/10 text-center">
          <p className="text-[10px] text-zinc-400 font-medium">KARVION CONTROL v1.0</p>
          <p className="text-[10px] text-red-400 font-semibold mt-0.5">Architect: Arjun Kahar</p>
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/80 backdrop-blur-md">
          <div className="w-72 max-w-[80%] h-full bg-zinc-950 border-r border-red-500/20 p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-red-500/15 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white text-sm">
                    K
                  </div>
                  <span className="font-bold text-white text-sm">KARVION CONTROL</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <DeveloperSignature />
              </div>

              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        isActive
                          ? 'bg-red-950/60 text-white border border-red-500/30'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 text-center">
              <p className="text-[11px] text-zinc-400">Designed & Developed by Arjun Kahar</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-zinc-950/95 backdrop-blur-lg border-t border-red-500/20 flex items-center justify-around px-2">
        <button
          onClick={() => onTabChange('overview')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'overview' ? 'text-red-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => onTabChange('applications')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'applications' ? 'text-red-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Apps</span>
        </button>
        <button
          onClick={() => onTabChange('deployments')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'deployments' ? 'text-red-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Rocket className="w-4 h-4 text-red-500" />
          <span>Deploy</span>
        </button>
        <button
          onClick={() => onTabChange('files')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'files' ? 'text-red-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Files</span>
        </button>
        <button
          onClick={() => onTabChange('terminal')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] ${
            activeTab === 'terminal' ? 'text-red-400 font-bold' : 'text-zinc-400'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Shell</span>
        </button>
      </nav>
    </>
  );
}
