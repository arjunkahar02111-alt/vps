'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, Terminal, Code2, Award, ExternalLink, X, Heart } from 'lucide-react';

export function DeveloperSignature() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="group relative cursor-pointer flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-950/40 via-red-900/20 to-black/60 border border-red-500/20 hover:border-red-500/50 transition-all duration-300 shadow-sm hover:shadow-crimson-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-crimson-sm"></span>
        </span>
        <span className="text-[11px] font-medium tracking-wide text-zinc-300 group-hover:text-white transition-colors">
          Designed & Developed by <strong className="text-red-400 group-hover:text-red-300 font-semibold">Arjun Kahar</strong>
        </span>
        <Sparkles className="w-3.5 h-3.5 text-red-400 group-hover:rotate-12 transition-transform duration-300" />
      </div>

      {/* Developer Profile Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl shadow-red-950/40">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-red-950/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center border border-red-400/40 shadow-crimson-glow">
                <Code2 className="w-7 h-7 text-white" />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-black"></span>
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Arjun Kahar
                  <Award className="w-4 h-4 text-red-400" />
                </h3>
                <p className="text-xs text-red-400 font-medium">Principal Software Architect & Lead Developer</p>
                <p className="text-[11px] text-zinc-400">Creator of KARVION CONTROL</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 border-t border-b border-zinc-800/80 py-4 my-4 leading-relaxed">
              <p>
                <strong className="text-red-400">KARVION CONTROL</strong> is an enterprise-grade, universal self-hosted VPS management and automated application deployment platform.
              </p>
              <p>
                Engineered from the ground up for seamless zero-SSH server operations, containerized multi-runtime deployments, high-performance bot hosting, and hardened infrastructure security.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-[11px] mb-5">
              <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20">
                <span className="text-zinc-400 block mb-0.5">Architecture</span>
                <span className="text-red-300 font-semibold">Docker OCI & Fastify</span>
              </div>
              <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20">
                <span className="text-zinc-400 block mb-0.5">Platform</span>
                <span className="text-red-300 font-semibold">Universal Self-Hosted</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                Crafted with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" /> by Arjun Kahar
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
