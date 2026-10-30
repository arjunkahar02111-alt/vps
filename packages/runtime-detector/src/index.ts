import fs from 'node:fs';
import path from 'node:path';
import { ProjectType, ProcessType } from '@karvion/common';

export interface DetectionResult {
  projectType: ProjectType;
  processType: ProcessType;
  framework?: string;
  runtimeVersion?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'poetry' | 'composer' | 'maven' | 'gradle' | 'cargo' | 'dotnet' | 'go';
  entryPoint?: string;
  defaultPort?: number;
  buildCommand?: string;
  startCommand?: string;
  installCommand?: string;
  isBot: boolean;
  botPlatform?: 'discord' | 'telegram' | 'generic';
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  detectedFiles: string[];
  suggestedEnvVars: string[];
  healthCheckEndpoint?: string;
}

export function safeReadJson(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    // ignore parse error
  }
  return null;
}

export function fileExists(dirPath: string, relativeFile: string): boolean {
  return fs.existsSync(path.join(dirPath, relativeFile));
}

export function listDir(dirPath: string): string[] {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath);
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Universal Project Detector
 * Inspects directory manifests, source files, and structure to determine runtime,
 * framework, bot nature, and optimal build/run commands.
 */
export async function detectProject(projectDir: string): Promise<DetectionResult> {
  const files = listDir(projectDir);
  const detectedFiles: string[] = [];

  // Check Dockerfile first
  const hasDockerfile = fileExists(projectDir, 'Dockerfile');
  const hasDockerCompose = fileExists(projectDir, 'docker-compose.yml') || fileExists(projectDir, 'docker-compose.yaml');

  if (hasDockerfile) detectedFiles.push('Dockerfile');
  if (hasDockerCompose) detectedFiles.push('docker-compose.yml');

  // 1. JavaScript / TypeScript (Node.js / Bun)
  if (fileExists(projectDir, 'package.json')) {
    detectedFiles.push('package.json');
    const pkg = safeReadJson(path.join(projectDir, 'package.json')) || {};
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Determine package manager
    let packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' = 'npm';
    let installCommand = 'npm install';
    if (fileExists(projectDir, 'pnpm-lock.yaml')) {
      packageManager = 'pnpm';
      installCommand = 'pnpm install --frozen-lockfile';
      detectedFiles.push('pnpm-lock.yaml');
    } else if (fileExists(projectDir, 'yarn.lock')) {
      packageManager = 'yarn';
      installCommand = 'yarn install --frozen-lockfile';
      detectedFiles.push('yarn.lock');
    } else if (fileExists(projectDir, 'bun.lockb') || fileExists(projectDir, 'bun.lock')) {
      packageManager = 'bun';
      installCommand = 'bun install';
      detectedFiles.push(fileExists(projectDir, 'bun.lockb') ? 'bun.lockb' : 'bun.lock');
    } else if (fileExists(projectDir, 'package-lock.json')) {
      detectedFiles.push('package-lock.json');
      installCommand = 'npm ci';
    }

    // Bot detection
    const isDiscordBot = Boolean(deps['discord.js'] || deps['eris'] || deps['@discordjs/core'] || deps['detritus-client']);
    const isTelegramBot = Boolean(deps['telegraf'] || deps['grammy'] || deps['node-telegram-bot-api']);

    if (isDiscordBot || isTelegramBot) {
      const botPlatform = isDiscordBot ? 'discord' : 'telegram';
      const mainFile = pkg.main || (fileExists(projectDir, 'bot.js') ? 'bot.js' : (fileExists(projectDir, 'index.js') ? 'index.js' : 'src/index.ts'));
      const startCmd = pkg.scripts?.start ? `${packageManager} start` : `node ${mainFile}`;
      const buildCmd = pkg.scripts?.build ? `${packageManager} run build` : undefined;

      return {
        projectType: 'NODEJS',
        processType: isDiscordBot ? 'BOT_DISCORD' : 'BOT_TELEGRAM',
        framework: isDiscordBot ? 'discord.js' : (deps['grammy'] ? 'grammY' : 'telegraf'),
        runtimeVersion: '20.x',
        packageManager,
        entryPoint: mainFile,
        buildCommand: buildCmd,
        startCommand: startCmd,
        installCommand,
        isBot: true,
        botPlatform,
        hasDockerfile,
        hasDockerCompose,
        detectedFiles,
        suggestedEnvVars: isDiscordBot ? ['DISCORD_TOKEN', 'CLIENT_ID'] : ['BOT_TOKEN', 'TELEGRAM_BOT_TOKEN'],
      };
    }

    // Framework detection
    let framework = 'Node.js';
    let defaultPort = 3000;
    let processType: ProcessType = 'WEB_APP';
    let healthCheckEndpoint = '/';

    if (deps['next']) {
      framework = 'Next.js';
      defaultPort = 3000;
      healthCheckEndpoint = '/api/health';
    } else if (deps['@nestjs/core']) {
      framework = 'NestJS';
      defaultPort = 3000;
      processType = 'API';
    } else if (deps['fastify']) {
      framework = 'Fastify';
      defaultPort = 3000;
      processType = 'API';
    } else if (deps['express']) {
      framework = 'Express';
      defaultPort = 3000;
      processType = 'API';
    } else if (deps['nuxt']) {
      framework = 'Nuxt';
      defaultPort = 3000;
    } else if (deps['vite']) {
      framework = 'Vite';
      defaultPort = 80;
      processType = 'STATIC_SITE';
    } else if (deps['react']) {
      framework = 'React';
      defaultPort = 80;
      processType = 'STATIC_SITE';
    }

    const buildCmd = pkg.scripts?.build ? `${packageManager} run build` : undefined;
    const startCmd = pkg.scripts?.start 
      ? `${packageManager} start` 
      : (pkg.main ? `node ${pkg.main}` : (fileExists(projectDir, 'server.js') ? 'node server.js' : 'node index.js'));

    return {
      projectType: 'NODEJS',
      processType,
      framework,
      runtimeVersion: '20.x',
      packageManager,
      entryPoint: pkg.main || 'index.js',
      defaultPort,
      buildCommand: buildCmd,
      startCommand: startCmd,
      installCommand,
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['PORT', 'NODE_ENV'],
      healthCheckEndpoint,
    };
  }

  // 2. Python
  if (
    fileExists(projectDir, 'requirements.txt') ||
    fileExists(projectDir, 'pyproject.toml') ||
    fileExists(projectDir, 'Pipfile') ||
    fileExists(projectDir, 'setup.py')
  ) {
    let reqContent = '';
    if (fileExists(projectDir, 'requirements.txt')) {
      detectedFiles.push('requirements.txt');
      reqContent = fs.readFileSync(path.join(projectDir, 'requirements.txt'), 'utf-8').toLowerCase();
    }
    if (fileExists(projectDir, 'pyproject.toml')) {
      detectedFiles.push('pyproject.toml');
      reqContent += '\n' + fs.readFileSync(path.join(projectDir, 'pyproject.toml'), 'utf-8').toLowerCase();
    }

    const isDiscordPy = reqContent.includes('discord.py') || reqContent.includes('nextcord') || reqContent.includes('disnake');
    const isTelegramPy = reqContent.includes('python-telegram-bot') || reqContent.includes('aiogram') || reqContent.includes('pyrogram') || reqContent.includes('telethon');

    // Detect Python entry file
    let entryPoint = 'main.py';
    for (const cand of ['main.py', 'app.py', 'bot.py', 'server.py', 'run.py', 'manage.py']) {
      if (fileExists(projectDir, cand)) {
        entryPoint = cand;
        detectedFiles.push(cand);
        break;
      }
    }

    if (isDiscordPy || isTelegramPy) {
      const botPlatform = isDiscordPy ? 'discord' : 'telegram';
      const frameworkName = isDiscordPy 
        ? (reqContent.includes('disnake') ? 'disnake' : 'discord.py') 
        : (reqContent.includes('aiogram') ? 'aiogram' : (reqContent.includes('pyrogram') ? 'pyrogram' : 'python-telegram-bot'));

      return {
        projectType: 'PYTHON',
        processType: isDiscordPy ? 'BOT_DISCORD' : 'BOT_TELEGRAM',
        framework: frameworkName,
        runtimeVersion: '3.11',
        packageManager: 'pip',
        entryPoint,
        startCommand: `python ${entryPoint}`,
        installCommand: 'pip install --no-cache-dir -r requirements.txt',
        isBot: true,
        botPlatform,
        hasDockerfile,
        hasDockerCompose,
        detectedFiles,
        suggestedEnvVars: isDiscordPy ? ['DISCORD_TOKEN'] : ['BOT_TOKEN'],
      };
    }

    // Framework detection (FastAPI, Flask, Django)
    let framework = 'Python Script';
    let defaultPort = 8000;
    let startCmd = `python ${entryPoint}`;
    let processType: ProcessType = 'WEB_APP';

    if (reqContent.includes('fastapi')) {
      framework = 'FastAPI';
      defaultPort = 8000;
      processType = 'API';
      const moduleName = entryPoint.replace(/\.py$/, '');
      startCmd = `uvicorn ${moduleName}:app --host 0.0.0.0 --port 8000`;
    } else if (reqContent.includes('flask')) {
      framework = 'Flask';
      defaultPort = 5000;
      processType = 'API';
      startCmd = `gunicorn -w 4 -b 0.0.0.0:5000 ${entryPoint.replace(/\.py$/, '')}:app`;
    } else if (reqContent.includes('django')) {
      framework = 'Django';
      defaultPort = 8000;
      startCmd = `python manage.py runserver 0.0.0.0:8000`;
    } else if (reqContent.includes('celery')) {
      framework = 'Celery Worker';
      processType = 'WORKER';
      startCmd = `celery -A tasks worker --loglevel=info`;
    }

    return {
      projectType: 'PYTHON',
      processType,
      framework,
      runtimeVersion: '3.11',
      packageManager: 'pip',
      entryPoint,
      defaultPort,
      startCommand: startCmd,
      installCommand: 'pip install --no-cache-dir -r requirements.txt',
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['PORT', 'PYTHONUNBUFFERED=1'],
      healthCheckEndpoint: '/',
    };
  }

  // 3. PHP
  if (fileExists(projectDir, 'composer.json') || fileExists(projectDir, 'index.php')) {
    if (fileExists(projectDir, 'composer.json')) detectedFiles.push('composer.json');
    if (fileExists(projectDir, 'index.php')) detectedFiles.push('index.php');

    let framework = 'PHP';
    let startCmd = 'apache2-foreground';
    let defaultPort = 80;

    if (fileExists(projectDir, 'artisan')) {
      framework = 'Laravel';
      detectedFiles.push('artisan');
      startCmd = 'php artisan serve --host=0.0.0.0 --port=8000';
      defaultPort = 8000;
    } else if (fileExists(projectDir, 'wp-config.php') || fileExists(projectDir, 'wp-content')) {
      framework = 'WordPress';
    }

    return {
      projectType: 'PHP',
      processType: 'WEB_APP',
      framework,
      runtimeVersion: '8.3',
      packageManager: 'composer',
      entryPoint: 'index.php',
      defaultPort,
      installCommand: fileExists(projectDir, 'composer.json') ? 'composer install --no-dev --optimize-autoloader' : undefined,
      startCommand: startCmd,
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['APP_ENV=production', 'APP_DEBUG=false'],
    };
  }

  // 4. Go
  if (fileExists(projectDir, 'go.mod')) {
    detectedFiles.push('go.mod');
    return {
      projectType: 'GO',
      processType: 'WEB_APP',
      framework: 'Go Module',
      runtimeVersion: '1.23',
      packageManager: 'go',
      entryPoint: fileExists(projectDir, 'main.go') ? 'main.go' : 'cmd/server/main.go',
      defaultPort: 8080,
      buildCommand: 'go build -o server .',
      startCommand: './server',
      installCommand: 'go mod download',
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['PORT=8080', 'GIN_MODE=release'],
    };
  }

  // 5. Rust
  if (fileExists(projectDir, 'Cargo.toml')) {
    detectedFiles.push('Cargo.toml');
    return {
      projectType: 'RUST',
      processType: 'WEB_APP',
      framework: 'Rust Cargo',
      runtimeVersion: '1.80',
      packageManager: 'cargo',
      defaultPort: 8080,
      buildCommand: 'cargo build --release',
      startCommand: './target/release/app',
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['RUST_LOG=info', 'PORT=8080'],
    };
  }

  // 6. Java (Maven / Gradle / Spring Boot)
  if (fileExists(projectDir, 'pom.xml') || fileExists(projectDir, 'build.gradle') || fileExists(projectDir, 'gradlew')) {
    const isMaven = fileExists(projectDir, 'pom.xml');
    if (isMaven) detectedFiles.push('pom.xml');
    if (fileExists(projectDir, 'build.gradle')) detectedFiles.push('build.gradle');

    return {
      projectType: 'JAVA',
      processType: 'WEB_APP',
      framework: 'Spring Boot / Java',
      runtimeVersion: '21',
      packageManager: isMaven ? 'maven' : 'gradle',
      defaultPort: 8080,
      buildCommand: isMaven ? 'mvn clean package -DskipTests' : './gradlew build -x test',
      startCommand: 'java -jar target/*.jar',
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['JAVA_OPTS=-Xmx512m', 'SERVER_PORT=8080'],
    };
  }

  // 7. C# / .NET
  const csharpProject = files.find(f => f.endsWith('.csproj') || f.endsWith('.sln'));
  if (csharpProject) {
    detectedFiles.push(csharpProject);
    return {
      projectType: 'DOTNET',
      processType: 'WEB_APP',
      framework: '.NET 8.0',
      runtimeVersion: '8.0',
      packageManager: 'dotnet',
      defaultPort: 8080,
      buildCommand: 'dotnet publish -c Release -o /app/publish',
      startCommand: 'dotnet /app/publish/app.dll',
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['ASPNETCORE_URLS=http://+:8080', 'ASPNETCORE_ENVIRONMENT=Production'],
    };
  }

  // 8. Static Web Site
  if (fileExists(projectDir, 'index.html')) {
    detectedFiles.push('index.html');
    return {
      projectType: 'STATIC',
      processType: 'STATIC_SITE',
      framework: 'HTML5 Static',
      entryPoint: 'index.html',
      defaultPort: 80,
      startCommand: 'nginx -g "daemon off;"',
      isBot: false,
      hasDockerfile,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: [],
    };
  }

  // 9. Raw Dockerfile fallback
  if (hasDockerfile) {
    return {
      projectType: 'DOCKERFILE',
      processType: 'WEB_APP',
      framework: 'Custom Container',
      defaultPort: 8080,
      isBot: false,
      hasDockerfile: true,
      hasDockerCompose,
      detectedFiles,
      suggestedEnvVars: ['PORT=8080'],
    };
  }

  // Generic fallback
  return {
    projectType: 'NODEJS',
    processType: 'WEB_APP',
    framework: 'Generic Node.js',
    runtimeVersion: '20.x',
    packageManager: 'npm',
    entryPoint: 'index.js',
    defaultPort: 3000,
    startCommand: 'node index.js',
    isBot: false,
    hasDockerfile: false,
    hasDockerCompose: false,
    detectedFiles,
    suggestedEnvVars: ['PORT=3000'],
  };
}

/**
 * Universal Dockerfile Generator
 * Emits secure, optimized, non-root multi-stage Dockerfiles
 */
export function generateDockerfile(detection: DetectionResult, customStart?: string): string {
  const startCmd = customStart || detection.startCommand;

  switch (detection.projectType) {
    case 'NODEJS': {
      if (detection.isBot) {
        return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
# Bot Isolated Runtime Engine
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache ffmpeg python3 make g++ git
COPY package*.json ./
${detection.packageManager === 'pnpm' ? 'RUN npm install -g pnpm && pnpm install --prod' : 'RUN npm install --production'}
COPY . .
${detection.buildCommand ? `RUN ${detection.buildCommand}` : ''}
USER node
CMD [${formatCmdJson(startCmd || 'node index.js')}]
`;
      }

      if (detection.framework === 'Next.js') {
        return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
# Next.js Production Multi-Stage Builder
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${detection.defaultPort || 3000}
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE ${detection.defaultPort || 3000}
CMD ["npm", "start"]
`;
      }

      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY package*.json ./
${detection.installCommand ? `RUN ${detection.installCommand}` : 'RUN npm install --production'}
COPY . .
${detection.buildCommand ? `RUN ${detection.buildCommand}` : ''}
USER node
EXPOSE ${detection.defaultPort || 3000}
CMD [${formatCmdJson(startCmd || 'node index.js')}]
`;
    }

    case 'PYTHON': {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev git curl && rm -rf /var/lib/apt/lists/*
COPY requirements*.txt ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
COPY . .
RUN useradd -m -u 1000 karvion && chown -R karvion:karvion /app
USER karvion
${detection.defaultPort ? `EXPOSE ${detection.defaultPort}` : ''}
CMD [${formatCmdJson(startCmd || 'python main.py')}]
`;
    }

    case 'PHP': {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM php:8.3-apache
RUN docker-php-ext-install pdo pdo_mysql mysqli opcache
RUN a2enmod rewrite
WORKDIR /var/www/html
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html
EXPOSE 80
CMD ["apache2-foreground"]
`;
    }

    case 'GO': {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server .

FROM alpine:3.20
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /app/server /app/server
USER 1000:1000
EXPOSE ${detection.defaultPort || 8080}
CMD ["/app/server"]
`;
    }

    case 'RUST': {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM rust:1.80-alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/target/release/* /app/binary
USER 1000:1000
EXPOSE ${detection.defaultPort || 8080}
CMD ["/app/binary"]
`;
    }

    case 'JAVA': {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
USER 1000:1000
EXPOSE ${detection.defaultPort || 8080}
CMD ["java", "-jar", "app.jar"]
`;
    }

    case 'STATIC': {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
    }

    default: {
      return `# Generated by KARVION CONTROL (Architected by Arjun Kahar)
FROM alpine:3.20
WORKDIR /app
COPY . .
CMD ["sh", "-c", "${startCmd || 'echo Hello Karvion'}"]
`;
    }
  }
}

function formatCmdJson(cmd: string): string {
  const parts = cmd.split(' ').filter(Boolean);
  return parts.map(p => `"${p.replace(/"/g, '\\"')}"`).join(', ');
}
