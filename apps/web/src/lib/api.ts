const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('karvion_token');
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('karvion_token', token);
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('karvion_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  updatePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Servers
  getServers: () => request<{ servers: any[] }>('/servers'),
  getServer: (id: string) => request<{ server: any }>(`/servers/${id}`),
  createEnrollmentToken: (name: string, panelUrl?: string) =>
    request<{ server: any; token: string; installCommand: string }>('/servers/enrollment-token', {
      method: 'POST',
      body: JSON.stringify({ name, panelUrl }),
    }),
  deleteServer: (id: string) => request<{ success: boolean }>(`/servers/${id}`, { method: 'DELETE' }),

  // Projects / Apps
  getProjects: (params?: { serverId?: string; processType?: string }) => {
    const q = new URLSearchParams();
    if (params?.serverId) q.set('serverId', params.serverId);
    if (params?.processType) q.set('processType', params.processType);
    return request<{ projects: any[] }>(`/projects?${q.toString()}`);
  },
  getProject: (id: string) => request<{ project: any }>(`/projects/${id}`),
  createProject: (data: any) =>
    request<{ project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProject: (id: string, data: any) =>
    request<{ project: any }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string) => request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  startProject: (id: string) => request<{ project: any; message: string }>(`/projects/${id}/start`, { method: 'POST' }),
  stopProject: (id: string) => request<{ project: any; message: string }>(`/projects/${id}/stop`, { method: 'POST' }),
  restartProject: (id: string) => request<{ project: any; message: string }>(`/projects/${id}/restart`, { method: 'POST' }),
  rebuildProject: (id: string) =>
    request<{ message: string; deploymentId: string; version: number }>(`/projects/${id}/rebuild`, { method: 'POST' }),

  // Deployments
  getDeployments: (projectId?: string) => {
    const q = projectId ? `?projectId=${projectId}` : '';
    return request<{ deployments: any[] }>(`/deployments${q}`);
  },
  getDeployment: (id: string) => request<{ deployment: any }>(`/deployments/${id}`),
  triggerDeployment: (projectId: string) =>
    request<{ message: string; deploymentId: string; version: number }>('/deployments', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  // Files & Resumable Uploads
  initChunkUpload: (body: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    projectId?: string;
    targetFolder?: string;
    autoExtract?: boolean;
  }) => request<{ uploadId: string; chunkSize: number; targetPath: string }>('/chunk-init', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  uploadChunkPart: async (uploadId: string, chunkIndex: number, chunkBlob: Blob) => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('file', chunkBlob, 'chunk.bin');

    const token = getToken();
    const res = await fetch(`${API_BASE}/chunk`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Chunk upload failed');
    return res.json();
  },
  finalizeChunkUpload: (body: { uploadId: string; autoExtract?: boolean }) =>
    request<{ success: boolean; filePath: string; extractedCount: number; extractedFiles: string[] }>('/chunk-finalize', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listFiles: (path?: string) => {
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    return request<{ files: any[] }>(`/files${q}`);
  },
  readFile: (path: string) => request<{ content: string }>(`/files/content?path=${encodeURIComponent(path)}`),
  writeFile: (path: string, content: string) =>
    request<{ success: boolean }>('/files/content', {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    }),
  deleteFile: (path: string) => request<{ success: boolean }>(`/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  createFolder: (path: string) =>
    request<{ success: boolean }>('/files/folder', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  // Docker
  getDockerInfo: () => request<{ info: any }>('/docker/info'),
  getDockerContainers: () => request<{ containers: any[] }>('/docker/containers'),
  getDockerImages: () => request<{ images: any[] }>('/docker/images'),
  getContainerLogs: (id: string, tail: number = 100) =>
    request<{ logs: string }>(`/docker/containers/${id}/logs?tail=${tail}`),
  restartContainer: (id: string) => request<{ success: boolean }>(`/docker/containers/${id}/restart`, { method: 'POST' }),
  stopContainer: (id: string) => request<{ success: boolean }>(`/docker/containers/${id}/stop`, { method: 'POST' }),

  // Databases
  getDatabases: (serverId?: string) => {
    const q = serverId ? `?serverId=${serverId}` : '';
    return request<{ databases: any[] }>(`/databases${q}`);
  },
  createDatabase: (data: any) =>
    request<{ database: any }>('/databases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteDatabase: (id: string) => request<{ success: boolean }>(`/databases/${id}`, { method: 'DELETE' }),

  // Firewall
  getFirewallRules: (serverId?: string) => {
    const q = serverId ? `?serverId=${serverId}` : '';
    return request<{ enabled: boolean; defaultPolicy: string; rules: any[] }>(`/firewall${q}`);
  },
  addFirewallRule: (data: any) =>
    request<{ rule: any }>('/firewall', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteFirewallRule: (id: string) => request<{ success: boolean }>(`/firewall/${id}`, { method: 'DELETE' }),

  // Domains
  getDomains: () => request<{ domains: any[] }>('/domains'),
  addDomain: (data: any) =>
    request<{ domain: any }>('/domains', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyDns: (id: string) => request<{ success: boolean; verified: boolean; ips?: string[] }>(`/domains/${id}/verify-dns`, { method: 'POST' }),
  deleteDomain: (id: string) => request<{ success: boolean }>(`/domains/${id}`, { method: 'DELETE' }),

  // Backups
  getBackups: (projectId?: string) => {
    const q = projectId ? `?projectId=${projectId}` : '';
    return request<{ backups: any[] }>(`/backups${q}`);
  },
  createBackup: (data: any) =>
    request<{ backup: any }>('/backups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  restoreBackup: (id: string) => request<{ success: boolean; message: string }>(`/backups/${id}/restore`, { method: 'POST' }),
  deleteBackup: (id: string) => request<{ success: boolean }>(`/backups/${id}`, { method: 'DELETE' }),

  // Monitoring
  getMonitoring: (serverId?: string) => {
    const q = serverId ? `?serverId=${serverId}` : '';
    return request<{ metrics: any }>(`/monitoring${q}`);
  },

  // Logs
  getLogs: (limit: number = 100, targetType?: string) => {
    const q = new URLSearchParams();
    q.set('limit', String(limit));
    if (targetType) q.set('targetType', targetType);
    return request<{ logs: any[] }>(`/logs?${q.toString()}`);
  },
};
