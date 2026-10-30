'use client';

import React, { useState } from 'react';
import { Server, Plus, Copy, Check, Trash2, Cpu, HardDrive, Activity, ShieldCheck, Terminal } from 'lucide-react';
import { api } from '../../lib/api';

interface ServersViewProps {
  servers: any[];
  onRefresh: () => void;
}

export function ServersView({ servers, onRefresh }: ServersViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [serverName, setServerName] = useState('');
  const [panelUrl, setPanelUrl] = useState('');
  const [enrollData, setEnrollData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName) return;
    setLoading(true);
    try {
      const res = await api.createEnrollmentToken(serverName, panelUrl || undefined);
      setEnrollData(res);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this VPS node?')) return;
    try {
      await api.deleteServer(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-red-500" />
            VPS Server Fleet ({servers.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Connect and orchestrate multiple Ubuntu/Debian/Linux VPS instances with mutual TLS authentication.
          </p>
        </div>
        <button
          onClick={() => {
            setEnrollData(null);
            setServerName('');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-crimson-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New VPS</span>
        </button>
      </div>

      {/* Servers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map((srv) => (
          <div
            key={srv.id}
            className="glass-card rounded-2xl p-5 border border-red-500/15 hover:border-red-500/30 transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-500/25 flex items-center justify-center text-red-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    {srv.name}
                    {srv.isLocalHost && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-normal">
                        Host Node
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">{srv.ipAddress}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    srv.status === 'ONLINE'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-950/60 text-red-400 border-red-500/30'
                  }`}
                >
                  {srv.status}
                </span>
                {!srv.isLocalHost && (
                  <button
                    onClick={() => handleDelete(srv.id)}
                    title="Remove Node"
                    className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-center text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">CPU</span>
                <span className="font-semibold text-zinc-200">{srv.cpuCores} Cores</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">RAM</span>
                <span className="font-semibold text-zinc-200">{srv.totalRamMb} MB</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Disk</span>
                <span className="font-semibold text-zinc-200">{srv.totalDiskGb} GB</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
              <span>OS: {srv.osName} ({srv.architecture})</span>
              <span>Agent v{srv.agentVersion}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Connect VPS Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-red-500" />
              Connect Remote VPS
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Generate a single-use enrollment token and run the 1-click installer on your Ubuntu/Debian/Linux server.
            </p>

            {!enrollData ? (
              <form onSubmit={handleGenerateEnrollment} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Server Name / Label</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="e.g. Production Ubuntu Node 1"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-300 block mb-1">
                    Panel Public IP / Reachable Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={panelUrl}
                    onChange={(e) => setPanelUrl(e.target.value)}
                    placeholder="e.g. 192.168.1.5:4000 or your-public-ip:4000 or tunnel domain"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Enter your computer's public IP or domain so your remote VPS knows where to connect.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                  >
                    {loading ? 'Generating...' : 'Generate 1-Click Command'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <p className="text-[11px] text-zinc-400 mb-2">Run this command as root / sudo on your remote VPS:</p>
                  <div className="relative p-2.5 rounded-lg bg-black font-mono text-[11px] text-red-400 border border-red-500/30 break-all select-all">
                    {enrollData.installCommand}
                  </div>
                  <button
                    onClick={() => handleCopy(enrollData.installCommand)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Install Command'}</span>
                  </button>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
