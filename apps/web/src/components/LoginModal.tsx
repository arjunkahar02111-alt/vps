'use client';

import React, { useState } from 'react';
import { Lock, Mail, Sparkles, Code2, ArrowRight } from 'lucide-react';
import { api, setToken } from '../lib/api';

interface LoginModalProps {
  onSuccess: (user: any) => void;
}

export function LoginModal({ onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('admin@karvion.local');
  const [password, setPassword] = useState('KarvionAdmin2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ email, password });
      setToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-md p-7 rounded-3xl bg-zinc-950 border border-red-500/30 shadow-2xl shadow-red-950/50">
        {/* Glow */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-12 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-1.5 mb-6 relative z-10">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 items-center justify-center border border-red-400/30 shadow-crimson-sm mb-2">
            <span className="font-black text-white text-xl">K</span>
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            KARVION <span className="text-red-500">CONTROL</span>
          </h1>
          <p className="text-xs text-zinc-400">Universal VPS & Universal Deployment SaaS</p>
          <p className="text-[11px] text-red-400 font-medium">Designed & Developed by Arjun Kahar</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-xs text-red-300 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Administrator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:border-red-500 outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Security Key / Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:border-red-500 outline-none transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-crimson-sm transition-all"
          >
            <span>{loading ? 'Authenticating...' : 'Access Control Center'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-900 text-center text-[10px] text-zinc-500">
          KARVION CONTROL • Self-Hosted Production SaaS
        </div>
      </div>
    </div>
  );
}
