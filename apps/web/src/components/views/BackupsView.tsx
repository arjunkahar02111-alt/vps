'use client';

import React, { useState, useEffect } from 'react';
import { Archive, Plus, RotateCcw, Download, Trash2, ShieldCheck, Check } from 'lucide-react';
import { api } from '../../lib/api';

interface BackupsViewProps {
  projects: any[];
}

export function BackupsView({ projects }: BackupsViewProps) {
  const [backups, setBackups] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState('APPLICATION');
  const [creating, setCreating] = useState(false);

  const fetchBackups = async () => {
    try {
      const res = await api.getBackups();
      setBackups(res.backups || []);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setCreating(true);
    try {
      await api.createBackup({
        name,
        projectId: projectId || undefined,
        type,
      });
      setModalOpen(false);
      setName('');
      fetchBackups();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this backup? Existing files will be overwritten.')) return;
    try {
      await api.restoreBackup(id);
      alert('Backup restored and integrity verified successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup archive?')) return;
    try {
      await api.deleteBackup(id);
      fetchBackups();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-red-500" />
            Backups & Disaster Recovery
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Create atomic ZIP archives of applications and databases with SHA-256 tamper-proof verification.
          </p>
        </div>
        <button
          onClick={() => {
            if (projects.length > 0) setProjectId(projects[0].id);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-crimson-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Backup</span>
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-red-500/15">
        {backups.length === 0 ? (
          <div className="text-center py-10 text-xs text-zinc-500">No backup snapshots found.</div>
        ) : (
          <div className="space-y-3">
            {backups.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-red-500/10 hover:border-red-500/30 transition-all gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{b.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                      {b.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Target: {b.project?.name || 'Full Node'} • {(b.sizeBytes / (1024 * 1024)).toFixed(2)} MB •{' '}
                    {new Date(b.createdAt).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 truncate max-w-sm mt-1">
                    SHA-256: {b.sha256Checksum}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleRestore(b.id)}
                    title="Restore Backup"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create Backup Snapshot</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Backup Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. pre-upgrade-snapshot"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Backup Scope</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                >
                  <option value="APPLICATION">Specific Application Source & Data</option>
                  <option value="FULL_SYSTEM">Entire Node Storage</option>
                </select>
              </div>

              {type === 'APPLICATION' && (
                <div>
                  <label className="text-xs text-zinc-300 block mb-1">Select Application</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={creating}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                >
                  {creating ? 'Archiving...' : 'Create Backup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
