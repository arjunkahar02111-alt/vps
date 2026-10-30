'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Play,
  Square,
  RotateCw,
  Rocket,
  Trash2,
  Settings as SettingsIcon,
  Bot,
  Globe,
  Database,
  Cpu,
  Activity,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';

interface ApplicationsViewProps {
  projects: any[];
  servers: any[];
  onRefresh: () => void;
  onOpenDeploy: () => void;
}

export function ApplicationsView({ projects, servers, onRefresh, onOpenDeploy }: ApplicationsViewProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'BOTS') return p.processType.startsWith('BOT');
    if (filterType === 'WEB') return p.processType === 'WEB_APP' || p.processType === 'API' || p.processType === 'STATIC_SITE';
    if (filterType === 'WORKERS') return p.processType === 'WORKER' || p.processType === 'CRON_JOB';
    return true;
  });

  const handleStart = async (id: string) => {
    try {
      await api.startProject(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStop = async (id: string) => {
    try {
      await api.stopProject(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestart = async (id: string) => {
    try {
      await api.restartProject(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRebuild = async (id: string) => {
    try {
      await api.rebuildProject(id);
      alert('Rebuild and deployment triggered!');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application and container?')) return;
    try {
      await api.deleteProject(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setLoading(true);
    try {
      await api.updateProject(selectedApp.id, {
        startCommand: selectedApp.startCommand,
        buildCommand: selectedApp.buildCommand,
        containerPort: parseInt(selectedApp.containerPort, 10),
        cpuLimit: parseFloat(selectedApp.cpuLimit),
        memoryLimitMb: parseInt(selectedApp.memoryLimitMb, 10),
        restartPolicy: selectedApp.restartPolicy,
      });
      setEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-500" />
            Applications & Bots Hub ({projects.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage web services, APIs, Discord bots, Telegram bots, and background workers in isolated Docker containers.
          </p>
        </div>
        <button
          onClick={onOpenDeploy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-crimson-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Deployment</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Workloads' },
          { id: 'WEB', label: 'Websites & APIs' },
          { id: 'BOTS', label: 'Discord & Telegram Bots' },
          { id: 'WORKERS', label: 'Background Workers' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterType === tab.id
                ? 'bg-red-950/80 text-white border border-red-500/40 shadow-crimson-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* App Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-red-500/15">
          <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No applications found in this category</h3>
          <p className="text-xs text-zinc-400 mt-1 mb-4">Deploy a project from a ZIP file, Git, or folder.</p>
          <button
            onClick={onOpenDeploy}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
          >
            Deploy Application
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((app) => (
            <div
              key={app.id}
              className="glass-card rounded-2xl p-5 border border-red-500/15 hover:border-red-500/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xs">
                      {app.processType.startsWith('BOT') ? (
                        <Bot className="w-5 h-5 text-red-400" />
                      ) : (
                        <Globe className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{app.name}</h3>
                      <p className="text-[11px] text-zinc-400">
                        {app.framework || app.projectType} • {app.processType}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      app.status === 'RUNNING'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>

                {/* Specs / Port */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-300">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">CPU Limit</span>
                    <span>{app.cpuLimit} Core(s)</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Memory Limit</span>
                    <span>{app.memoryLimitMb} MB</span>
                  </div>
                  {app.containerPort && (
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Port</span>
                      <span className="font-mono text-red-400">:{app.containerPort}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Restarts</span>
                    <span>{app.restartCount}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  {app.status === 'RUNNING' ? (
                    <button
                      onClick={() => handleStop(app.id)}
                      title="Stop"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStart(app.id)}
                      title="Start"
                      className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRestart(app.id)}
                    title="Restart"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRebuild(app.id)}
                    title="Rebuild & Redeploy"
                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 transition-colors"
                  >
                    <Rocket className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setEditModalOpen(true);
                    }}
                    title="Configure Application"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    title="Delete Application"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit App Settings Modal */}
      {editModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <SettingsIcon className="w-5 h-5 text-red-500" />
              Configure {selectedApp.name}
            </h2>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Start Command</label>
                <input
                  type="text"
                  value={selectedApp.startCommand || ''}
                  onChange={(e) => setSelectedApp({ ...selectedApp, startCommand: e.target.value })}
                  placeholder="e.g. node index.js or python bot.py"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Container Port</label>
                  <input
                    type="number"
                    value={selectedApp.containerPort || 3000}
                    onChange={(e) => setSelectedApp({ ...selectedApp, containerPort: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Restart Policy</label>
                  <select
                    value={selectedApp.restartPolicy || 'unless-stopped'}
                    onChange={(e) => setSelectedApp({ ...selectedApp, restartPolicy: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  >
                    <option value="unless-stopped">unless-stopped</option>
                    <option value="always">always</option>
                    <option value="on-failure">on-failure</option>
                    <option value="no">no</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">CPU Limit (Cores)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedApp.cpuLimit || 1.0}
                    onChange={(e) => setSelectedApp({ ...selectedApp, cpuLimit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">RAM Limit (MB)</label>
                  <input
                    type="number"
                    value={selectedApp.memoryLimitMb || 512}
                    onChange={(e) => setSelectedApp({ ...selectedApp, memoryLimitMb: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
