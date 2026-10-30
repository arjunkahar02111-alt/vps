/**
 * KARVION CONTROL - Core Common Types & Protocol Definitions
 * Product Branding: KARVION CONTROL
 * Architect & Developer: Arjun Kahar
 */

export const BRANDING = {
  name: 'KARVION CONTROL',
  tagline: 'Universal VPS Management, Automated Deployment & Hosting SaaS',
  developer: 'Arjun Kahar',
  developerCredit: 'Designed & Developed by Arjun Kahar',
  version: '1.0.0-PROD',
  accentColor: '#EF4444', // Cyber Crimson
  secondaryAccent: '#991B1B'
};

export type SystemRole = 'SUPERADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  createdAt: string;
}

export type ServerStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'PROVISIONING' | 'MAINTENANCE';

export interface VPSServer {
  id: string;
  name: string;
  ipAddress: string;
  hostname: string;
  status: ServerStatus;
  osName: string;
  architecture: string;
  agentVersion: string;
  cpuCores: number;
  totalRamMb: number;
  totalDiskGb: number;
  uptimeSeconds: number;
  lastHeartbeat: string;
  createdAt: string;
  enrollmentToken?: string;
  isLocalHost?: boolean;
}

export interface SystemMetrics {
  serverId: string;
  timestamp: number;
  cpu: {
    usagePercent: number;
    cores: number;
    loadAverage: [number, number, number];
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usagePercent: number;
    swapTotalMb: number;
    swapUsedMb: number;
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
    readBytesSec: number;
    writeBytesSec: number;
  };
  network: {
    rxBytesSec: number;
    txBytesSec: number;
  };
  containers: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
  };
  dockerInfo?: {
    version: string;
    rootDir: string;
    containers: number;
    images: number;
  };
}

export type ProjectType =
  | 'NODEJS'
  | 'PYTHON'
  | 'PHP'
  | 'JAVA'
  | 'GO'
  | 'RUST'
  | 'DOTNET'
  | 'STATIC'
  | 'DOCKERFILE'
  | 'DOCKER_COMPOSE';

export type ProcessType =
  | 'WEB_APP'
  | 'API'
  | 'BOT_DISCORD'
  | 'BOT_TELEGRAM'
  | 'WORKER'
  | 'CRON_JOB'
  | 'DATABASE'
  | 'STATIC_SITE';

export type ApplicationStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'CRASHED'
  | 'RESTARTING'
  | 'BUILDING'
  | 'FAILED';

export interface ApplicationConfig {
  id: string;
  name: string;
  slug: string;
  serverId: string;
  projectType: ProjectType;
  processType: ProcessType;
  runtimeVersion?: string;
  projectRoot: string;
  buildCommand?: string;
  startCommand?: string;
  installCommand?: string;
  workingDir?: string;
  envVariables: Record<string, string>;
  containerPort?: number;
  publishedPort?: number;
  domainName?: string;
  enableSsl?: boolean;
  healthCheckEndpoint?: string;
  restartPolicy: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  cpuLimit: number; // in cores (e.g. 1.0)
  memoryLimitMb: number; // in MB (e.g. 512)
  storageQuotaMb?: number;
  containerId?: string;
  status: ApplicationStatus;
  uptimeSeconds: number;
  restartCount: number;
  lastDeployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeploymentStep =
  | 'INIT'
  | 'STAGE_FILES'
  | 'DETECT_RUNTIME'
  | 'GENERATE_CONTAINER'
  | 'DOCKER_BUILD'
  | 'SETUP_NETWORKING'
  | 'START_CONTAINER'
  | 'VERIFY_HEALTH'
  | 'CONFIGURE_PROXY'
  | 'DONE'
  | 'FAILED';

export interface DeploymentJob {
  id: string;
  applicationId: string;
  serverId: string;
  version: number;
  step: DeploymentStep;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  logs: string[];
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface FileEntry {
  name: string;
  path: string; // relative to project root
  size: number;
  isDirectory: boolean;
  isSymlink: boolean;
  modifiedAt: string;
  permissions?: string;
}

export interface ChunkUploadInitRequest {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  applicationId?: string;
  targetFolder?: string;
  autoExtract?: boolean;
}

export interface ChunkUploadInitResponse {
  uploadId: string;
  chunkSize: number;
}

export interface DatabaseEngineType {
  type: 'POSTGRES' | 'MYSQL' | 'MARIADB' | 'REDIS' | 'MONGODB' | 'SQLITE';
  name: string;
  containerId?: string;
  port: number;
  version: string;
  status: ApplicationStatus;
  databaseName?: string;
  username?: string;
  password?: string;
  connectionString?: string;
}

export interface FirewallRule {
  id: string;
  serverId: string;
  port: number;
  protocol: 'TCP' | 'UDP' | 'BOTH';
  action: 'ALLOW' | 'DENY';
  direction: 'INBOUND' | 'OUTBOUND';
  sourceCidr?: string;
  description: string;
  isSystemRule?: boolean;
  createdAt: string;
}

export interface DomainRecord {
  id: string;
  domainName: string;
  applicationId: string;
  serverId: string;
  containerPort: number;
  sslEnabled: boolean;
  sslAutoRenew: boolean;
  sslIssuedAt?: string;
  sslExpiresAt?: string;
  forceHttps: boolean;
  dnsVerified: boolean;
  customNginxConfig?: string;
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  applicationId?: string;
  serverId: string;
  name: string;
  type: 'APPLICATION' | 'DATABASE' | 'FULL_SYSTEM';
  sizeBytes: number;
  filePath: string;
  sha256Checksum: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  operation: string;
  targetType: 'SERVER' | 'APPLICATION' | 'DEPLOYMENT' | 'FILE' | 'FIREWALL' | 'DATABASE' | 'DOMAIN';
  targetId?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface AgentHeartbeatPayload {
  token: string;
  serverId: string;
  metrics: SystemMetrics;
  agentVersion: string;
  timestamp: number;
}
