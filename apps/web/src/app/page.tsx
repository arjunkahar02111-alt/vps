'use client';

import React, { useState, useEffect } from 'react';
import { Navigation, NavTab } from '../components/Navigation';
import { OverviewView } from '../components/views/OverviewView';
import { ServersView } from '../components/views/ServersView';
import { ApplicationsView } from '../components/views/ApplicationsView';
import { DeploymentsView } from '../components/views/DeploymentsView';
import { FileManagerView } from '../components/views/FileManagerView';
import { DomainsView } from '../components/views/DomainsView';
import { DatabasesView } from '../components/views/DatabasesView';
import { DockerView } from '../components/views/DockerView';
import { FirewallView } from '../components/views/FirewallView';
import { TerminalView } from '../components/views/TerminalView';
import { MonitoringView } from '../components/views/MonitoringView';
import { BackupsView } from '../components/views/BackupsView';
import { AuditLogsView } from '../components/views/AuditLogsView';
import { SettingsView } from '../components/views/SettingsView';
import { LoginModal } from '../components/LoginModal';
import { DeveloperSignature } from '../components/DeveloperBranding';
import { api, clearToken, getToken } from '../lib/api';

export default function KarvionApp() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Core Data
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Initial Auth Check
  useEffect(() => {
    const token = getToken();
    if (token) {
      api
        .getMe()
        .then((res) => setUser(res.user))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch Global Data
  const loadData = async () => {
    if (!user) return;
    try {
      const [srvRes, projRes, depRes, metRes] = await Promise.all([
        api.getServers().catch(() => ({ servers: [] })),
        api.getProjects().catch(() => ({ projects: [] })),
        api.getDeployments().catch(() => ({ deployments: [] })),
        api.getMonitoring().catch(() => ({ metrics: null })),
      ]);

      setServers(srvRes.servers || []);
      if (!selectedServerId && srvRes.servers?.[0]?.id) {
        setSelectedServerId(srvRes.servers[0].id);
      }
      setProjects(projRes.projects || []);
      setDeployments(depRes.deployments || []);
      setMetrics(metRes.metrics);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
      const interval = setInterval(loadData, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  // App Actions
  const handleStartApp = async (id: string) => {
    try {
      await api.startProject(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStopApp = async (id: string) => {
    try {
      await api.stopProject(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestartApp = async (id: string) => {
    try {
      await api.restartProject(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-karvion-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center font-bold text-white text-lg animate-pulse shadow-crimson-glow">
            K
          </div>
          <span className="text-xs text-zinc-400 font-medium">Initializing KARVION CONTROL...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal onSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-karvion-bg bg-grid-pattern relative flex flex-col">
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        user={user}
        onLogout={handleLogout}
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={(id) => setSelectedServerId(id)}
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-7 max-w-7xl pb-24 lg:pb-12">
        {activeTab === 'overview' && (
          <OverviewView
            metrics={metrics}
            servers={servers}
            projects={projects}
            deployments={deployments}
            onNavigate={(t) => setActiveTab(t)}
            onStartApp={handleStartApp}
            onStopApp={handleStopApp}
            onRestartApp={handleRestartApp}
          />
        )}

        {activeTab === 'servers' && (
          <ServersView servers={servers} onRefresh={loadData} />
        )}

        {activeTab === 'applications' && (
          <ApplicationsView
            projects={projects}
            servers={servers}
            onRefresh={loadData}
            onOpenDeploy={() => setActiveTab('deployments')}
          />
        )}

        {activeTab === 'deployments' && (
          <DeploymentsView servers={servers} onRefresh={loadData} />
        )}

        {activeTab === 'files' && <FileManagerView />}

        {activeTab === 'domains' && <DomainsView projects={projects} />}

        {activeTab === 'databases' && <DatabasesView />}

        {activeTab === 'docker' && <DockerView />}

        {activeTab === 'firewall' && <FirewallView />}

        {activeTab === 'terminal' && <TerminalView />}

        {activeTab === 'monitoring' && <MonitoringView />}

        {activeTab === 'backups' && <BackupsView projects={projects} />}

        {activeTab === 'logs' && <AuditLogsView />}

        {activeTab === 'settings' && <SettingsView user={user} />}
      </main>

      {/* Desktop Persistent Bottom Footer */}
      <footer className="hidden lg:flex fixed bottom-0 left-64 right-0 h-9 bg-zinc-950/80 backdrop-blur-md border-t border-red-500/10 items-center justify-between px-6 text-[11px] text-zinc-400 z-30">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span>KARVION CONTROL v1.0.0</span>
          <span className="text-zinc-600">•</span>
          <span>Production SaaS Active</span>
        </div>
        <DeveloperSignature />
      </footer>
    </div>
  );
}
