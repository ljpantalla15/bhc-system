import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from api/ or project root
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {
      // Ignore parse errors if already partially loaded
    }
  }
}

function sanitizeDatabaseUrl(url) {
  if (!url) return url;
  try {
    new URL(url);
    return url;
  } catch {
    const match = url.match(/^(postgres(?:ql)?:\/\/[^:]+:)(.*)(@.+)$/);
    if (match) {
      const [, prefix, password, rest] = match;
      return `${prefix}${encodeURIComponent(password)}${rest}`;
    }
    return url;
  }
}

const isProd = (process.env.NODE_ENV || 'development') === 'production';
if (isProd) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('change_me')) {
    throw new Error('JWT_SECRET must be set to a random string of 32+ characters in production.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in production.');
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: sanitizeDatabaseUrl(
    process.env.DATABASE_URL ||
    'postgres://bhc_api:change_me_api_password@localhost:5432/bhc'
  ),
  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_jwt_secret_mis215',
  sessionHours: parseInt(process.env.SESSION_HOURS || '8', 10),
};
