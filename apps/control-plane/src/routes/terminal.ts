import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { verifyToken } from '../lib/auth';

export const terminalRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Authenticate via token query param
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token || !verifyToken(token)) {
      socket.send('\r\n\x1b[31m[!] Security Error: Unauthorized terminal connection.\x1b[0m\r\n');
      socket.close();
      return;
    }

    const isWindows = os.platform() === 'win32';
    const shellCmd = isWindows ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
    const shellArgs = isWindows ? ['-NoLogo'] : [];

    socket.send('\r\n\x1b[1;31m============================================================\x1b[0m\r\n');
    socket.send('\x1b[1;37m   KARVION CONTROL - SECURE WEB TERMINAL GATEWAY\x1b[0m\r\n');
    socket.send('\x1b[1;36m   Designed & Developed by Arjun Kahar\x1b[0m\r\n');
    socket.send('\x1b[1;31m============================================================\x1b[0m\r\n\r\n');

    let shellProc: any;
    try {
      shellProc = spawn(shellCmd, shellArgs, {
        env: { ...process.env, TERM: 'xterm-256color' },
        shell: false,
      });

      shellProc.stdout?.on('data', (data: Buffer) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(data.toString('utf-8'));
        }
      });

      shellProc.stderr?.on('data', (data: Buffer) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(data.toString('utf-8'));
        }
      });

      shellProc.on('close', (code: number) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(`\r\n[Process exited with code ${code}]\r\n`);
          socket.close();
        }
      });

      socket.on('message', (message: any) => {
        const input = message.toString();
        if (shellProc && !shellProc.killed && shellProc.stdin?.writable) {
          shellProc.stdin.write(input);
        }
      });

      socket.on('close', () => {
        if (shellProc && !shellProc.killed) {
          shellProc.kill();
        }
      });

      socket.on('error', () => {
        if (shellProc && !shellProc.killed) {
          shellProc.kill();
        }
      });
    } catch (err: any) {
      socket.send(`\r\n\x1b[31mFailed to spawn terminal shell: ${err.message}\x1b[0m\r\n`);
      socket.close();
    }
  });
};
