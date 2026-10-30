'use client';

import React, { useState, useEffect } from 'react';
import { Database, Plus, Key, Eye, EyeOff, Copy, Check, Trash2, Server } from 'lucide-react';
import { api } from '../../lib/api';

export function DatabasesView() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [engine, setEngine] = useState('POSTGRES');
  const [port, setPort] = useState(5432);

  const fetchDatabases = async () => {
    try {
      const res = await api.getDatabases();
      setDatabases(res.databases || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.createDatabase({
        name,
        engine,
        port: Number(port),
      });
      setModalOpen(false);
      setName('');
      fetchDatabases();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this database container and persistent volume?')) return;
    try {
      await api.deleteDatabase(id);
      fetchDatabases();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-red-500" />
            Database Provisioner
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Deploy isolated PostgreSQL, MySQL, MariaDB, Redis, MongoDB, and SQLite instances with persistent volumes.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-crimson-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Database</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {databases.map((db) => {
          const isRevealed = Boolean(showPassword[db.id]);
          const connectionUri = `${db.engine.toLowerCase()}://${db.username}:${db.passwordEncrypted}@localhost:${db.port}/${db.databaseName}`;

          return (
            <div
              key={db.id}
              className="glass-card rounded-2xl p-5 border border-red-500/15 hover:border-red-500/30 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xs">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{db.name}</h3>
                    <p className="text-xs text-red-400 font-mono font-semibold">{db.engine}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    {db.status}
                  </span>
                  <button
                    onClick={() => handleDelete(db.id)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Port:</span>
                  <span className="font-mono text-zinc-200">{db.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Database:</span>
                  <span className="font-mono text-zinc-200">{db.databaseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">User:</span>
                  <span className="font-mono text-zinc-200">{db.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Password:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-red-400">
                      {isRevealed ? db.passwordEncrypted : '••••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword({ ...showPassword, [db.id]: !isRevealed })}
                      className="text-zinc-400 hover:text-white"
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Connection String Copy */}
              <button
                onClick={() => handleCopy(connectionUri, db.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
              >
                {copied === db.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === db.id ? 'Copied URI!' : 'Copy Connection URI'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Provision Database Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Provision Database Instance</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Instance Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. main-postgres-db"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Database Engine</label>
                  <select
                    value={engine}
                    onChange={(e) => {
                      setEngine(e.target.value);
                      const ports: Record<string, number> = {
                        POSTGRES: 5432,
                        MYSQL: 3306,
                        MARIADB: 3307,
                        REDIS: 6379,
                        MONGODB: 27017,
                        SQLITE: 0,
                      };
                      setPort(ports[e.target.value] || 5432);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  >
                    <option value="POSTGRES">PostgreSQL 16</option>
                    <option value="MYSQL">MySQL 8.0</option>
                    <option value="MARIADB">MariaDB 11</option>
                    <option value="REDIS">Redis 7</option>
                    <option value="MONGODB">MongoDB 7</option>
                    <option value="SQLITE">SQLite Embedded</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  />
                </div>
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
                  Provision Container
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
