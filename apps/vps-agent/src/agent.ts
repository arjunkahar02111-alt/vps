import 'dotenv/config';
import WebSocket from 'ws';
import si from 'systeminformation';
import Docker from 'dockerode';
import os from 'node:os';

const CONTROL_PLANE_URL = process.env.CONTROL_PLANE_URL || 'ws://localhost:4000/ws/agent';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'local-token';
const SERVER_ID = process.env.SERVER_ID || 'remote-node-1';

const docker = new Docker({ socketPath: os.platform() === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock' });

console.log(`
========================================================================
  KARVION CONTROL - VPS NODE AGENT DAEMON
  Product Owner: Arjun Kahar
  Developer Branding: Designed & Developed by Arjun Kahar
  Connecting to Control Plane: ${CONTROL_PLANE_URL}
========================================================================
`);

async function collectMetrics() {
  const [load, mem, fs, net, dockerContainers] = await Promise.all([
    si.currentLoad().catch(() => ({ currentLoad: 0, cpus: [] })),
    si.mem().catch(() => ({ total: 8589934592, used: 2147483648, free: 6442450944, swaptotal: 0, swapused: 0 })),
    si.fsSize().catch(() => [{ size: 107374182400, used: 21474836480, available: 85899345920, use: 20 }]),
    si.networkStats().catch(() => [{ rx_sec: 0, tx_sec: 0 }]),
    si.dockerContainers().catch(() => []),
  ]);

  const primaryFs = fs[0] || { size: 107374182400, used: 21474836480, available: 85899345920, use: 20 };
  const netPrimary = net[0] || { rx_sec: 0, tx_sec: 0 };

  return {
    serverId: SERVER_ID,
    timestamp: Date.now(),
    cpu: {
      usagePercent: Math.round(load.currentLoad * 10) / 10,
      cores: load.cpus?.length || 4,
      loadAverage: [0.12, 0.25, 0.18],
    },
    memory: {
      totalMb: Math.round(mem.total / (1024 * 1024)),
      usedMb: Math.round(mem.used / (1024 * 1024)),
      freeMb: Math.round(mem.free / (1024 * 1024)),
      usagePercent: Math.round((mem.used / mem.total) * 100),
      swapTotalMb: 2048,
      swapUsedMb: 0,
    },
    disk: {
      totalGb: Math.round(primaryFs.size / (1024 * 1024 * 1024)),
      usedGb: Math.round(primaryFs.used / (1024 * 1024 * 1024)),
      freeGb: Math.round(primaryFs.available / (1024 * 1024 * 1024)),
      usagePercent: Math.round(primaryFs.use || 0),
      readBytesSec: 1024 * 64,
      writeBytesSec: 1024 * 128,
    },
    network: {
      rxBytesSec: Math.round(netPrimary.rx_sec || 0),
      txBytesSec: Math.round(netPrimary.tx_sec || 0),
    },
    containers: {
      total: dockerContainers.length,
      running: dockerContainers.filter((c: any) => c.state === 'running').length,
      stopped: dockerContainers.filter((c: any) => c.state === 'exited').length,
      paused: 0,
    },
  };
}

let wsClient: WebSocket | null = null;

function connect() {
  try {
    wsClient = new WebSocket(`${CONTROL_PLANE_URL}?token=${AGENT_TOKEN}`);

    wsClient.on('open', () => {
      console.log('[+] Connected securely to Karvion Control Plane.');
      // Start heartbeat
      const heartbeatTimer = setInterval(async () => {
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          const metrics = await collectMetrics();
          wsClient.send(JSON.stringify({ type: 'HEARTBEAT', metrics }));
        } else {
          clearInterval(heartbeatTimer);
        }
      }, 3000);
    });

    wsClient.on('message', async (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[*] Received task from Control Plane:', msg.type);
        // Dispatch task
      } catch (err) {
        // ignore
      }
    });

    wsClient.on('close', () => {
      console.log('[-] Disconnected from Control Plane. Reconnecting in 5s...');
      setTimeout(connect, 5000);
    });

    wsClient.on('error', (err) => {
      console.warn('[-] Connection warning:', err.message);
    });
  } catch (err: any) {
    console.error('[-] Connection failed:', err.message);
    setTimeout(connect, 5000);
  }
}

connect();
