'use client';

import React, { useState, useEffect } from 'react';
import { Container, RefreshCw, Play, Square, RotateCw, Terminal, Layers, Info, X } from 'lucide-react';
import { api } from '../../lib/api';

export function DockerView() {
  const [info, setInfo] = useState<any>(null);
  const [containers, setContainers] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Logs modal
  const [selectedContainerLogs, setSelectedContainerLogs] = useState<{ id: string; logs: string } | null>(null);

  const fetchDockerData = async () => {
    setLoading(true);
    try {
      const [infoRes, contRes, imgRes] = await Promise.all([
        api.getDockerInfo().catch(() => ({ info: { available: false } })),
        api.getDockerContainers().catch(() => ({ containers: [] })),
        api.getDockerImages().catch(() => ({ images: [] })),
      ]);
      setInfo(infoRes.info);
      setContainers(contRes.containers || []);
      setImages(imgRes.images || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDockerData();
  }, []);

  const handleRestartContainer = async (id: string) => {
    try {
      await api.restartContainer(id);
      fetchDockerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStopContainer = async (id: string) => {
    try {
      await api.stopContainer(id);
      fetchDockerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewLogs = async (id: string) => {
    try {
      const res = await api.getContainerLogs(id, 200);
      setSelectedContainerLogs({ id, logs: res.logs });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Container className="w-5 h-5 text-red-500" />
            Docker Engine Manager
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Direct interface to the local or remote VPS Docker socket and container runtime.
          </p>
        </div>
        <button
          onClick={fetchDockerData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
          <span>Refresh Engine</span>
        </button>
      </div>

      {/* Engine Status Banner */}
      <div className="glass-card rounded-2xl p-4 border border-red-500/15 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-500/20 flex items-center justify-center text-red-400">
            <Container className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Docker Daemon</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  info?.available
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {info?.available ? 'CONNECTED' : 'DISCONNECTED / STANDBY'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Version: {info?.version || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-zinc-300">
          <div>
            <span className="text-zinc-500 block text-[10px]">Active Containers</span>
            <span className="font-bold text-white">{info?.containersRunning || containers.length}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">Images Cached</span>
            <span className="font-bold text-white">{info?.images || images.length}</span>
          </div>
        </div>
      </div>

      {/* Containers Table */}
      <div className="glass-card rounded-2xl p-5 border border-red-500/15">
        <h2 className="text-sm font-bold text-white mb-4">Containers ({containers.length})</h2>
        {containers.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">No Docker containers running.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2.5 font-medium">Name / ID</th>
                  <th className="pb-2.5 font-medium">Image</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Ports</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {containers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5">
                      <span className="font-semibold text-white block">{c.names?.[0] || c.id}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{c.id}</span>
                    </td>
                    <td className="py-2.5 font-mono text-zinc-300 max-w-xs truncate">{c.image}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          c.state === 'running'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {c.status || c.state}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-zinc-400">
                      {c.ports?.map((p: any) => `${p.publicPort ? `${p.publicPort}:` : ''}${p.privatePort}`).join(', ') || '—'}
                    </td>
                    <td className="py-2.5 text-right space-x-1">
                      <button
                        onClick={() => handleViewLogs(c.id)}
                        title="View Logs"
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRestartContainer(c.id)}
                        title="Restart"
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleStopContainer(c.id)}
                        title="Stop"
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Container Logs Modal */}
      {selectedContainerLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl p-5 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-red-500" />
                <span className="text-xs font-mono text-white font-bold">
                  Logs: {selectedContainerLogs.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedContainerLogs(null)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="flex-1 p-3 rounded-xl bg-black font-mono text-xs text-zinc-300 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-zinc-900">
              {selectedContainerLogs.logs || 'No logs found for this container.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
