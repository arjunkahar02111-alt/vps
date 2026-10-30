'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, RefreshCw, Trash2, Power } from 'lucide-react';
import { getToken } from '../../lib/api';

export function TerminalView() {
  const [output, setOutput] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const connectTerminal = () => {
    const token = getToken() || '';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${host}:4000/api/v1/terminal/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setOutput((prev) => [...prev, '\x1b[32m[+] Terminal gateway connected.\x1b[0m']);
    };

    ws.onmessage = (event) => {
      setOutput((prev) => [...prev, event.data]);
    };

    ws.onclose = () => {
      setConnected(false);
      setOutput((prev) => [...prev, '\r\n[-] Terminal connection closed.']);
    };

    ws.onerror = () => {
      setConnected(false);
      setOutput((prev) => [...prev, '\r\n[!] Terminal connection error.']);
    };
  };

  useEffect(() => {
    connectTerminal();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!inputVal) {
        wsRef.current?.send('\r\n');
        return;
      }
      wsRef.current?.send(inputVal + '\r\n');
      setInputVal('');
    }
  };

  const clearTerminal = () => {
    setOutput([]);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <TerminalIcon className="w-5 h-5 text-red-500" />
            Interactive Web Terminal
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Permission-controlled PTY shell gateway over authenticated WebSocket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              connected
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                : 'bg-red-950/60 text-red-400 border-red-500/30'
            }`}
          >
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <button
            onClick={connectTerminal}
            title="Reconnect"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300"
          >
            <RefreshCw className="w-4 h-4 text-red-400" />
          </button>
          <button
            onClick={clearTerminal}
            title="Clear Buffer"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Window */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="glass-card rounded-2xl border border-red-500/25 p-4 bg-black/95 flex flex-col h-[600px] shadow-2xl font-mono text-xs cursor-text"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3 text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <span className="text-[11px] text-zinc-400 ml-2">karvion-vps-shell</span>
          </div>
          <span className="text-[10px] text-zinc-600">xterm-256color</span>
        </div>

        {/* Output stream */}
        <div className="flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed space-y-1 text-zinc-300">
          {output.map((line, idx) => (
            <span key={idx}>{line}</span>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Interactive Prompt Line */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-900 text-red-400">
          <span className="font-bold select-none">karvion@host:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none caret-red-500 font-mono text-xs"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
