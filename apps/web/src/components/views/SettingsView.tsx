'use client';

import React, { useState } from 'react';
import { Settings as SettingsIcon, Lock, ShieldCheck, Heart, Award, Terminal, Code2, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

interface SettingsViewProps {
  user: any;
}

export function SettingsView({ user }: SettingsViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await api.updatePassword({ currentPassword, newPassword });
      setMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-red-500" />
          Settings & System Administration
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage administrator credentials, security tokens, and view system runtime specifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security & Password */}
        <div className="glass-card rounded-2xl p-5 border border-red-500/15 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-400" />
            Security & Authentication
          </h2>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Administrator:</span>
              <span className="font-semibold text-white">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Email:</span>
              <span className="font-mono text-zinc-200">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Role:</span>
              <span className="text-red-400 font-bold">{user?.role}</span>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-zinc-200">Change Password</h3>

            {msg && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-400">
                {msg}
              </div>
            )}

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">New Password (Min 8 chars)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-crimson-sm transition-all"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Developer Spotlight & Architectural Spec */}
        <div className="relative overflow-hidden glass-card rounded-2xl p-6 border border-red-500/25 shadow-crimson-glow flex flex-col justify-between">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-red-600/10 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center border border-red-400/40 shadow-crimson-sm">
                <Code2 className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  KARVION CONTROL
                  <Sparkles className="w-4 h-4 text-red-400" />
                </h3>
                <p className="text-xs text-red-400 font-medium">Designed & Developed by Arjun Kahar</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              KARVION CONTROL is an autonomous, self-hosted VPS management and automated application deployment platform. Built for modern DevOps, Linux system administration, and instant Discord/Telegram bot hosting without root shell exposure.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500 block">Version</span>
                <span className="text-white font-mono font-bold">v1.0.0-PRODUCTION</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500 block">Lead Architect</span>
                <span className="text-red-400 font-semibold">Arjun Kahar</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500 block">Control Plane</span>
                <span className="text-zinc-200">Fastify / WebSockets</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500 block">Storage Boundary</span>
                <span className="text-zinc-200">Zip-Slip Protected</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Product Owner: Arjun Kahar</span>
            <span className="text-red-400 font-medium">Enterprise Edition</span>
          </div>
        </div>
      </div>
    </div>
  );
}
