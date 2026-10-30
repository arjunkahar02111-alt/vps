'use client';

import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

export function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getLogs(100);
      setLogs(res.logs || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-red-500" />
            Audit & Security Logs
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Tamper-evident log records of all administrative actions, deployments, and security events.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-red-500/15">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-xs text-zinc-500">No activity logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2.5 font-medium">Timestamp</th>
                  <th className="pb-2.5 font-medium">Actor</th>
                  <th className="pb-2.5 font-medium">Operation</th>
                  <th className="pb-2.5 font-medium">Target</th>
                  <th className="pb-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 font-mono text-zinc-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-medium text-white">{log.actor}</td>
                    <td className="py-2.5 font-mono text-red-400">{log.operation}</td>
                    <td className="py-2.5 text-zinc-300">{log.targetType}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-950 text-red-400 border-red-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
