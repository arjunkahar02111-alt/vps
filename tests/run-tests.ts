import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { detectProject, generateDockerfile } from '../packages/runtime-detector/src/index';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../apps/control-plane/src/lib/auth';
import { resolveSafePath, extractZipSafe } from '../apps/control-plane/src/lib/storage';
import AdmZip from 'adm-zip';

test('KARVION CONTROL - Security & Cryptography Suite', async (t) => {
  await t.test('Password Hashing & Verification', async () => {
    const rawPass = 'ArjunKaharSuperSecure2026!';
    const hash = await hashPassword(rawPass);
    assert.notEqual(rawPass, hash);
    const valid = await verifyPassword(rawPass, hash);
    assert.equal(valid, true);
    const invalid = await verifyPassword('WrongPassword', hash);
    assert.equal(invalid, false);
  });

  await t.test('JWT Token Generation & Verification', () => {
    const token = generateToken({
      userId: 'user-123',
      email: 'arjun@karvion.local',
      role: 'SUPERADMIN',
    });
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyToken(token);
    assert.ok(decoded);
    assert.equal(decoded.userId, 'user-123');
    assert.equal(decoded.email, 'arjun@karvion.local');
    assert.equal(decoded.role, 'SUPERADMIN');

    const invalid = verifyToken('invalid.jwt.token');
    assert.equal(invalid, null);
  });
});

test('KARVION CONTROL - Storage & Anti-Traversal Security Suite', async (t) => {
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'karvion-test-'));

  await t.test('Anti Path-Traversal rejects parent escape attempts', () => {
    assert.throws(() => {
      resolveSafePath('../../../etc/passwd', tmpBase);
    }, /Security Violation/);

    assert.throws(() => {
      resolveSafePath('..\\..\\Windows\\System32', tmpBase);
    }, /Security Violation/);

    const safe = resolveSafePath('subfolder/app.js', tmpBase);
    assert.ok(safe.startsWith(tmpBase));
  });

  await t.test('Zip-Slip Protection rejects malicious archive entry', async () => {
    const maliciousZip = new AdmZip();
    maliciousZip.addFile('normal.txt', Buffer.from('hello'));
    maliciousZip.addFile('attack.txt', Buffer.from('echo hacked'));
    // Simulate malicious zip entry forged with parent traversal
    maliciousZip.getEntries()[1].entryName = '../../malicious.sh';

    const zipPath = path.join(tmpBase, 'malicious.zip');
    maliciousZip.writeZip(zipPath);

    const extractDir = path.join(tmpBase, 'extract-target');
    fs.mkdirSync(extractDir, { recursive: true });

    await assert.rejects(async () => {
      await extractZipSafe(zipPath, extractDir);
    }, /Security Violation: Zip entry escapes target directory/);
  });

  // Clean up
  fs.rmSync(tmpBase, { recursive: true, force: true });
});

test('KARVION CONTROL - Universal Runtime Detector Suite', async (t) => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'karvion-detector-'));

  await t.test('Detects Node.js & Discord.js Bot', async () => {
    const botDir = path.join(testRoot, 'discord-bot');
    fs.mkdirSync(botDir, { recursive: true });
    fs.writeFileSync(
      path.join(botDir, 'package.json'),
      JSON.stringify({
        name: 'my-music-bot',
        main: 'bot.js',
        dependencies: {
          'discord.js': '^14.16.0',
        },
      })
    );
    fs.writeFileSync(path.join(botDir, 'bot.js'), 'console.log("bot ready");');

    const detection = await detectProject(botDir);
    assert.equal(detection.projectType, 'NODEJS');
    assert.equal(detection.processType, 'BOT_DISCORD');
    assert.equal(detection.isBot, true);
    assert.equal(detection.entryPoint, 'bot.js');

    const dockerfile = generateDockerfile(detection);
    assert.ok(dockerfile.includes('FROM node:20-alpine'));
    assert.ok(dockerfile.includes('USER node'));
  });

  await t.test('Detects Python FastAPI App', async () => {
    const pyDir = path.join(testRoot, 'fastapi-app');
    fs.mkdirSync(pyDir, { recursive: true });
    fs.writeFileSync(path.join(pyDir, 'requirements.txt'), 'fastapi\nuvicorn\npydantic');
    fs.writeFileSync(path.join(pyDir, 'main.py'), 'from fastapi import FastAPI\napp = FastAPI()');

    const detection = await detectProject(pyDir);
    assert.equal(detection.projectType, 'PYTHON');
    assert.equal(detection.framework, 'FastAPI');
    assert.equal(detection.processType, 'API');
    assert.equal(detection.defaultPort, 8000);
    assert.ok(detection.startCommand?.includes('uvicorn'));

    const dockerfile = generateDockerfile(detection);
    assert.ok(dockerfile.includes('FROM python:3.11-slim'));
    assert.ok(dockerfile.includes('USER karvion'));
  });

  await t.test('Detects Go Module', async () => {
    const goDir = path.join(testRoot, 'go-app');
    fs.mkdirSync(goDir, { recursive: true });
    fs.writeFileSync(path.join(goDir, 'go.mod'), 'module example.com/myserver\n\ngo 1.23');
    fs.writeFileSync(path.join(goDir, 'main.go'), 'package main\nfunc main() {}');

    const detection = await detectProject(goDir);
    assert.equal(detection.projectType, 'GO');
    assert.equal(detection.packageManager, 'go');
    assert.equal(detection.defaultPort, 8080);
  });

  await t.test('Detects Static HTML Site', async () => {
    const staticDir = path.join(testRoot, 'static-site');
    fs.mkdirSync(staticDir, { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<h1>Hello Karvion</h1>');

    const detection = await detectProject(staticDir);
    assert.equal(detection.projectType, 'STATIC');
    assert.equal(detection.processType, 'STATIC_SITE');
    assert.equal(detection.defaultPort, 80);

    const dockerfile = generateDockerfile(detection);
    assert.ok(dockerfile.includes('FROM nginx:alpine'));
  });

  // Clean up
  fs.rmSync(testRoot, { recursive: true, force: true });
});
