import Docker from 'dockerode';
import os from 'node:os';

const isWindows = os.platform() === 'win32';
const dockerSocket = isWindows ? '//./pipe/docker_engine' : '/var/run/docker.sock';

export const docker = new Docker(
  isWindows ? { socketPath: dockerSocket } : { socketPath: dockerSocket }
);

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch (err) {
    return false;
  }
}

export async function getDockerInfo() {
  try {
    const isAvail = await isDockerAvailable();
    if (!isAvail) {
      return { available: false, version: 'Docker Offline / Connecting...' };
    }
    const info = await docker.info();
    const version = await docker.version();
    return {
      available: true,
      version: version.Version,
      os: info.OperatingSystem,
      architecture: info.Architecture,
      containers: info.Containers,
      containersRunning: info.ContainersRunning,
      containersStopped: info.ContainersStopped,
      images: info.Images,
      serverVersion: info.ServerVersion,
      memTotalMb: Math.round((info.MemTotal || 0) / (1024 * 1024)),
      cpus: info.NCPU,
    };
  } catch (err: any) {
    return { available: false, error: err.message };
  }
}

export async function listAllContainers() {
  try {
    const isAvail = await isDockerAvailable();
    if (!isAvail) return [];
    const containers = await docker.listContainers({ all: true });
    return containers.map(c => ({
      id: c.Id.substring(0, 12),
      fullId: c.Id,
      names: c.Names.map(n => n.replace(/^\//, '')),
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created,
      ports: c.Ports.map(p => ({
        ip: p.IP,
        privatePort: p.PrivatePort,
        publicPort: p.PublicPort,
        type: p.Type,
      })),
    }));
  } catch (err) {
    return [];
  }
}

export async function listAllImages() {
  try {
    const isAvail = await isDockerAvailable();
    if (!isAvail) return [];
    const images = await docker.listImages();
    return images.map(img => ({
      id: img.Id.substring(7, 19),
      fullId: img.Id,
      repoTags: img.RepoTags || ['<none>:<none>'],
      sizeMb: Math.round(img.Size / (1024 * 1024)),
      created: img.Created,
    }));
  } catch (err) {
    return [];
  }
}

export async function getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    return logs.toString('utf-8');
  } catch (err: any) {
    return `Unable to fetch logs: ${err.message}`;
  }
}
