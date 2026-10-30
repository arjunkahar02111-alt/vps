'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Plus, Trash2, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';

export function FirewallView() {
  const [rules, setRules] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [port, setPort] = useState(8080);
  const [protocol, setProtocol] = useState('TCP');
  const [action, setAction] = useState('ALLOW');
  const [description, setDescription] = useState('');

  const fetchRules = async () => {
    try {
      const res = await api.getFirewallRules();
      setRules(res.rules || []);
      setEnabled(res.enabled);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    try {
      await api.addFirewallRule({
        port: Number(port),
        protocol,
        action,
        direction: 'INBOUND',
        description,
      });
      setModalOpen(false);
      setDescription('');
      fetchRules();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this firewall rule?')) return;
    try {
      await api.deleteFirewallRule(id);
      fetchRules();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Firewall & Network Security Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            UFW & iptables rule enforcement with automated SSH and management port lockout protection.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-crimson-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Firewall Rule</span>
        </button>
      </div>

      {/* Safety Alert Banner */}
      <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center gap-3 text-xs text-red-200">
        <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span>
          <strong>Automated Lockout Protection:</strong> Port 22 (SSH) and KARVION management ports (3000, 4000) are protected system rules and cannot be deleted.
        </span>
      </div>

      {/* Rules Table */}
      <div className="glass-card rounded-2xl p-5 border border-red-500/15">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-2.5 font-medium">Port</th>
                <th className="pb-2.5 font-medium">Protocol</th>
                <th className="pb-2.5 font-medium">Action</th>
                <th className="pb-2.5 font-medium">Source CIDR</th>
                <th className="pb-2.5 font-medium">Description</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="py-2.5 font-mono font-bold text-white">:{rule.port}</td>
                  <td className="py-2.5 text-zinc-400 font-mono">{rule.protocol}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        rule.action === 'ALLOW'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-950 text-red-400 border-red-500/30'
                      }`}
                    >
                      {rule.action}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-zinc-400">{rule.sourceCidr || '0.0.0.0/0'}</td>
                  <td className="py-2.5 text-zinc-300">
                    {rule.description}
                    {rule.isSystemRule && (
                      <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-500/30">
                        System Protected
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {!rule.isSystemRule && (
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Inbound Firewall Rule</h3>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="BOTH">TCP & UDP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Description / Purpose</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Minecraft Game Server or Custom API"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                >
                  Apply Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
