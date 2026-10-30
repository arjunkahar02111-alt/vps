'use client';

import React from 'react';
import {
  Server,
  Layers,
  Cpu,
  HardDrive,
  Activity,
  ArrowUpRight,
  Play,
  Square,
  RotateCw,
  Rocket,
  Shield,
  Container,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NavTab } from '../Navigation';

interface OverviewViewProps {
  metrics: any;
  servers: any[];
  projects: any[];
  deployments: any[];
  onNavigate: (tab: NavTab) => void;
  onStartApp: (id: string) => void;
  onStopApp: (id: string) => void;
  onRestartApp: (id: string) => void;
}

export function OverviewView({
  metrics,
  servers,
  projects,
  deployments,
  onNavigate,
  onStartApp,
  onStopApp,
  onRestartApp,
}: OverviewViewProps) {
  const activeApps = projects.filter((p) => p.status === 'RUNNING').length;
  const cpuPercent = metrics?.cpu?.usagePercent || 0;
  const ramPercent = metrics?.memory?.usagePercent || 0;
  const diskPercent = metrics?.disk?.usagePercent || 0;
  const networkRx = Math.round((metrics?.network?.rxBytesSec || 0) / 1024);
  const networkTx = Math.round((metrics?.network?.txBytesSec || 0) / 1024);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/70 via-black to-zinc-950 border border-red-500/25 p-5 lg:p-7 shadow-crimson-glow">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/30 tracking-wider">
                NODE HEALTH ONLINE
              </span>
              <span className="text-xs text-zinc-400">All systems operational</span>
            </div>
            <h1 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              KARVION <span className="text-red-500">CONTROL</span>
            </h1>
            <p className="text-xs lg:text-sm text-zinc-300 max-w-xl">
              Universal VPS & Container Deployment SaaS. Manage servers, deploy applications, bots, databases, and microservices in real-time.
            </p>
            <p className="text-[11px] text-red-400/90 font-medium pt-1">
              Architected & Built by <strong className="text-white">Arjun Kahar</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('deployments')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-crimson-sm transition-all"
            >
              <Rocket className="w-4 h-4" />
              <span>Deploy Application</span>
            </button>
            <button
              onClick={() => onNavigate('servers')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-red-500/20 text-zinc-200 text-xs font-medium transition-all"
            >
              <Server className="w-4 h-4 text-red-400" />
              <span>Connect VPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Resource Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CPU */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">CPU Utilization</span>
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{cpuPercent}%</span>
            <span className="text-[11px] text-zinc-400">{metrics?.cpu?.cores || 4} Cores</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, cpuPercent))}%` }}
            ></div>
          </div>
        </div>

        {/* RAM */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">RAM Usage</span>
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{ramPercent}%</span>
            <span className="text-[11px] text-zinc-400">
              {metrics?.memory?.usedMb || 0} / {metrics?.memory?.totalMb || 8192} MB
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, ramPercent))}%` }}
            ></div>
          </div>
        </div>

        {/* Disk */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">NVMe Disk Space</span>
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{diskPercent}%</span>
            <span className="text-[11px] text-zinc-400">
              {metrics?.disk?.usedGb || 0} / {metrics?.disk?.totalGb || 100} GB
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-red-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, diskPercent))}%` }}
            ></div>
          </div>
        </div>

        {/* Network & Containers */}
        <div className="glass-card rounded-2xl p-4 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">Network I/O</span>
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
              <Container className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">↓{networkRx} KB/s</span>
            <span className="text-[11px] text-zinc-400">↑{networkTx} KB/s</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 flex items-center justify-between">
            <span>Containers:</span>
            <span className="text-red-400 font-semibold">{metrics?.containers?.running || 0} active</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Applications & Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List (2 Cols) */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-red-500/15">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-400" />
                Active Applications & Workloads ({projects.length})
              </h2>
              <p className="text-[11px] text-zinc-400">Live managed processes, web apps, and bots</p>
            </div>
            <button
              onClick={() => onNavigate('applications')}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-red-500/20 rounded-xl">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">No applications deployed yet.</p>
              <button
                onClick={() => onNavigate('deployments')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
              >
                Upload & Deploy First App
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-red-500/10 hover:border-red-500/30 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-950/50 border border-red-500/20 flex items-center justify-center font-bold text-red-400 text-xs">
                      {app.projectType.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{app.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                            app.status === 'RUNNING'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {app.processType} • Port {app.containerPort || 'N/A'} • {app.server?.name || 'Local'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {app.status === 'RUNNING' ? (
                      <button
                        onClick={() => onStopApp(app.id)}
                        title="Stop Application"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartApp(app.id)}
                        title="Start Application"
                        className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onRestartApp(app.id)}
                      title="Restart"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deployments Activity (1 Col) */}
        <div className="glass-card rounded-2xl p-5 border border-red-500/15">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-400" />
              Recent Deployments
            </h2>
            <button
              onClick={() => onNavigate('deployments')}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium"
            >
              History <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {deployments.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-500">No deployment logs yet.</div>
          ) : (
            <div className="space-y-3">
              {deployments.slice(0, 5).map((dep) => (
                <div key={dep.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{dep.project?.name || 'App'}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        dep.status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                          : dep.status === 'IN_PROGRESS'
                          ? 'bg-red-950 text-red-400 border-red-500/30 animate-pulse'
                          : 'bg-red-950 text-red-400 border-red-500/30'
                      }`}
                    >
                      {dep.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Step: {dep.step} • v{dep.version}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
