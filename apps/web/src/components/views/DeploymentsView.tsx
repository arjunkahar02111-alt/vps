'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Rocket,
  UploadCloud,
  FileCode,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  Bot,
  Globe,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';

interface DeploymentsViewProps {
  servers: any[];
  onRefresh: () => void;
}

export function DeploymentsView({ servers, onRefresh }: DeploymentsViewProps) {
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Config State
  const [appName, setAppName] = useState('');
  const [projectType, setProjectType] = useState('NODEJS');
  const [processType, setProcessType] = useState('WEB_APP');
  const [containerPort, setContainerPort] = useState(3000);
  const [startCommand, setStartCommand] = useState('');
  const [cpuLimit, setCpuLimit] = useState(1.0);
  const [memoryLimitMb, setMemoryLimitMb] = useState(512);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'NODE_ENV', value: 'production' },
  ]);

  // Deployment Execution & Log Stream State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [deployStep, setDeployStep] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // WebSocket for Live Deployment Streaming
  useEffect(() => {
    if (!activeJobId) return;

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}:4000/ws/deployments/${activeJobId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTerminalLogs((prev) => [...prev, `[${data.step}] ${data.message}`]);
        setDeployStep(data.step);
        if (data.step === 'DONE') {
          setIsDeploying(false);
          onRefresh();
        } else if (data.step === 'FAILED') {
          setIsDeploying(false);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [activeJobId, onRefresh]);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    const inferredName = selectedFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!appName) setAppName(inferredName);

    // Auto-detect based on file name or type
    if (selectedFile.name.toLowerCase().includes('bot')) {
      setProcessType('BOT_DISCORD');
    }
  };

  const handleAddEnv = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
  };

  // Perform Resumable Chunked Upload and Deployment
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName) {
      alert('Application name is required');
      return;
    }

    setIsDeploying(true);
    setTerminalLogs([`[INIT] Initializing automated deployment sequence for ${appName}...`]);

    try {
      // 1. Create Project
      const envObj: Record<string, string> = {};
      envVars.forEach((e) => {
        if (e.key.trim()) envObj[e.key.trim()] = e.value;
      });

      const { project } = await api.createProject({
        name: appName,
        projectType,
        processType,
        containerPort: Number(containerPort),
        startCommand: startCommand || undefined,
        cpuLimit: Number(cpuLimit),
        memoryLimitMb: Number(memoryLimitMb),
        envVariables: envObj,
      });

      // 2. Upload file if selected using chunking
      if (file) {
        setUploading(true);
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        setUploadStatusText(`Initializing chunked upload (Total chunks: ${totalChunks})...`);
        const { uploadId } = await api.initChunkUpload({
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          projectId: project.id,
          autoExtract: true,
        });

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunkBlob = file.slice(start, end);

          setUploadStatusText(`Uploading chunk ${i + 1} of ${totalChunks}...`);
          await api.uploadChunkPart(uploadId, i, chunkBlob);
          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        setUploadStatusText('Assembling chunks & extracting archive safely...');
        await api.finalizeChunkUpload({ uploadId, autoExtract: true });
        setUploading(false);
      }

      // 3. Trigger Deployment pipeline
      const depRes = await api.triggerDeployment(project.id);
      setActiveJobId(depRes.deploymentId);
      setTerminalLogs((prev) => [
        ...prev,
        `[JOB] Deployment Job #${depRes.deploymentId} queued. Streaming build logs...`,
      ]);
    } catch (err: any) {
      setIsDeploying(false);
      setUploading(false);
      setTerminalLogs((prev) => [...prev, `[ERROR] Deployment failed: ${err.message}`]);
      alert(`Deployment Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Rocket className="w-5 h-5 text-red-500" />
          Universal Deployment Engine
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Upload any ZIP archive, code bundle, or bot. Karvion automatically detects the language, framework, dependencies, and provisions an isolated container.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Form: Configuration */}
        <form onSubmit={handleDeploy} className="space-y-4">
          {/* File Upload Dropzone */}
          <div className="glass-card rounded-2xl p-5 border border-red-500/20">
            <h2 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
              <UploadCloud className="w-4 h-4 text-red-400" />
              Source Package (ZIP Archive or Files)
            </h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
              className="relative border-2 border-dashed border-red-500/30 hover:border-red-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-950/60 group"
            >
              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileCode className="w-10 h-10 text-red-500/70 group-hover:text-red-400 mx-auto mb-2 transition-colors" />
              <p className="text-xs font-semibold text-white">
                {file ? file.name : 'Drag & drop project ZIP archive here'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'Supports Node.js, Python, PHP, Java, Go, Rust, Static, Bots'}
              </p>
            </div>

            {uploading && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-300">
                  <span>{uploadStatusText}</span>
                  <span className="font-semibold text-red-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* App Metadata Form */}
          <div className="glass-card rounded-2xl p-5 border border-red-500/20 space-y-4">
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-400" />
              Workload Settings
            </h2>

            <div>
              <label className="text-xs text-zinc-300 block mb-1">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. my-discord-bot or ecommerce-api"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Runtime</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                >
                  <option value="NODEJS">Node.js / TypeScript</option>
                  <option value="PYTHON">Python</option>
                  <option value="PHP">PHP</option>
                  <option value="JAVA">Java (Spring Boot)</option>
                  <option value="GO">Go</option>
                  <option value="RUST">Rust</option>
                  <option value="STATIC">Static HTML / Vite</option>
                  <option value="DOCKERFILE">Custom Dockerfile</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">Process Type</label>
                <select
                  value={processType}
                  onChange={(e) => setProcessType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                >
                  <option value="WEB_APP">Web Application</option>
                  <option value="API">Backend API</option>
                  <option value="BOT_DISCORD">Discord Bot</option>
                  <option value="BOT_TELEGRAM">Telegram Bot</option>
                  <option value="WORKER">Background Worker</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">Port</label>
                <input
                  type="number"
                  value={containerPort}
                  onChange={(e) => setContainerPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-300 block mb-1">CPU Cores</label>
                <input
                  type="number"
                  step="0.1"
                  value={cpuLimit}
                  onChange={(e) => setCpuLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-300 block mb-1">RAM (MB)</label>
                <input
                  type="number"
                  value={memoryLimitMb}
                  onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-300 block mb-1">
                Custom Start Command (Optional, auto-detected if empty)
              </label>
              <input
                type="text"
                value={startCommand}
                onChange={(e) => setStartCommand(e.target.value)}
                placeholder="e.g. node bot.js or uvicorn main:app"
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:border-red-500 outline-none"
              />
            </div>

            {/* Environment Variables */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Environment Variables</span>
                <button
                  type="button"
                  onClick={handleAddEnv}
                  className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Variable
                </button>
              </div>

              {envVars.map((env, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={env.key}
                    onChange={(e) => handleEnvChange(idx, 'key', e.target.value)}
                    placeholder="KEY"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-mono uppercase"
                  />
                  <input
                    type="text"
                    value={env.value}
                    onChange={(e) => handleEnvChange(idx, 'value', e.target.value)}
                    placeholder="VALUE"
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEnv(idx)}
                    className="p-1.5 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isDeploying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-crimson-sm transition-all"
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Deploying Application Workload...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Build & Launch Application</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Panel: Live Build Terminal */}
        <div className="glass-card rounded-2xl p-5 border border-red-500/20 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-white">Live Deployment Console</span>
              {isDeploying && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </div>
            {deployStep && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30">
                {deployStep}
              </span>
            )}
          </div>

          <div className="flex-1 bg-black/90 rounded-xl p-3.5 font-mono text-xs overflow-y-auto space-y-1 border border-zinc-900 text-zinc-300">
            {terminalLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center">
                <Terminal className="w-8 h-8 mb-2" />
                <p>Console standby.</p>
                <p className="text-[11px] text-zinc-500">Live logs will stream here during deployment.</p>
              </div>
            ) : (
              terminalLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    log.includes('ERROR') || log.includes('failed')
                      ? 'text-red-400 font-semibold'
                      : log.includes('DONE') || log.includes('LIVE')
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
