'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Server, Container } from 'lucide-react';
import { api } from '../../lib/api';

export function MonitoringView() {
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<{ time: string; cpu: number; ram: number }[]>([]);

  useEffect(() => {
    // Poll or listen on metrics
    const fetchMetrics = async () => {
      try {
        const res = await api.getMonitoring();
        if (res.metrics) {
          setMetrics(res.metrics);
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setHistory((prev) => [
            ...prev.slice(-15),
            {
              time,
              cpu: res.metrics.cpu.usagePercent,
              ram: res.metrics.memory.usagePercent,
            },
          ]);
        }
      } catch {
        // ignore
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          Real-Time VPS Telemetry & Monitoring
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          High-frequency metric ingestion from the VPS agent for CPU, RAM, NVMe I/O, and container workloads.
        </p>
      </div>

      {/* Real-time Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">CPU Usage</span>
            <Cpu className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.cpu?.usagePercent || 0}%</div>
          <p className="text-[10px] text-zinc-500 mt-1">{metrics?.cpu?.cores || 4} Cores • 64-bit</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">RAM Usage</span>
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.memory?.usagePercent || 0}%</div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {metrics?.memory?.usedMb || 0} / {metrics?.memory?.totalMb || 8192} MB
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Disk Storage</span>
            <HardDrive className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.disk?.usagePercent || 0}%</div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {metrics?.disk?.usedGb || 0} / {metrics?.disk?.totalGb || 100} GB
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-red-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Network Bandwidth</span>
            <Wifi className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-bold text-white">
            ↓{Math.round((metrics?.network?.rxBytesSec || 0) / 1024)} KB/s
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            ↑{Math.round((metrics?.network?.txBytesSec || 0) / 1024)} KB/s
          </p>
        </div>
      </div>

      {/* Sparkline / History Bars */}
      <div className="glass-card rounded-2xl p-5 border border-red-500/15">
        <h2 className="text-sm font-bold text-white mb-4">Historical Activity (Last 15 Intervals)</h2>
        <div className="h-40 flex items-end gap-2 pt-6">
          {history.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="w-full flex items-end justify-center gap-1 h-32">
                {/* CPU Bar */}
                <div
                  className="w-1/2 bg-red-500/80 hover:bg-red-400 rounded-t transition-all"
                  style={{ height: `${Math.max(4, h.cpu)}%` }}
                  title={`CPU: ${h.cpu}%`}
                ></div>
                {/* RAM Bar */}
                <div
                  className="w-1/2 bg-zinc-600 hover:bg-zinc-500 rounded-t transition-all"
                  style={{ height: `${Math.max(4, h.ram)}%` }}
                  title={`RAM: ${h.ram}%`}
                ></div>
              </div>
              <span className="text-[9px] text-zinc-500 truncate w-full text-center">{h.time}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-zinc-900 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
            <span className="text-zinc-300">CPU %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-zinc-600"></span>
            <span className="text-zinc-300">RAM %</span>
          </div>
        </div>
      </div>
    </div>
  );
}
