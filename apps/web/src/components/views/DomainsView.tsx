'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Plus, ShieldCheck, ShieldAlert, Check, RefreshCw, Trash2, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';

interface DomainsViewProps {
  projects: any[];
}

export function DomainsView({ projects }: DomainsViewProps) {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [domainName, setDomainName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sslEnabled, setSslEnabled] = useState(true);
  const [forceHttps, setForceHttps] = useState(true);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await api.getDomains();
      setDomains(res.domains || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName || !projectId) {
      alert('Please fill domain name and select an application');
      return;
    }
    try {
      await api.addDomain({
        domainName,
        projectId,
        sslEnabled,
        forceHttps,
      });
      setModalOpen(false);
      setDomainName('');
      fetchDomains();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyDns = async (id: string) => {
    try {
      const res = await api.verifyDns(id);
      if (res.verified) {
        alert('DNS Resolution Verified! Points to active server IP.');
      } else {
        alert('DNS verification failed. Please point your DNS A Record to this server IP.');
      }
      fetchDomains();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this domain mapping?')) return;
    try {
      await api.deleteDomain(id);
      fetchDomains();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-500" />
            Domains & SSL Certificates
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Map custom domains, configure Nginx reverse proxy routes, and issue Let's Encrypt TLS certificates.
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
          <span>Add Custom Domain</span>
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-red-500/15">
        {domains.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Globe className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400">No custom domains configured yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((dom) => (
              <div
                key={dom.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-red-500/10 hover:border-red-500/30 transition-all gap-3"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-white">{dom.domainName}</span>
                    {dom.sslEnabled ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> SSL Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3" /> HTTP Only
                      </span>
                    )}
                    {dom.dnsVerified && (
                      <span className="text-[10px] text-zinc-400">DNS Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Routes to: <strong className="text-zinc-200">{dom.project?.name || 'App'}</strong> on port {dom.containerPort}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyDns(dom.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-red-400" />
                    <span>Verify DNS</span>
                  </button>
                  <button
                    onClick={() => handleDelete(dom.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-950 border border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Connect Domain to Application</h3>
            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Domain Name</label>
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="e.g. app.yourdomain.com"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Target Application</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Port {p.containerPort})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sslEnabled}
                    onChange={(e) => setSslEnabled(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span>Enable Let's Encrypt SSL</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceHttps}
                    onChange={(e) => setForceHttps(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span>Force HTTPS</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
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
                  Connect Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
