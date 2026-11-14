import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Project-root .env first, then server/.env (existing variables are never overridden).
dotenv.config({ path: path.resolve(dir, '../../.env') });
dotenv.config({ path: path.resolve(dir, '../.env') });

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET must be set. Add a long, random value to the server environment.');
}
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL?.trim()) {
  throw new Error('CLIENT_URL must be set in production to the exact Vercel origin, for example https://your-app.vercel.app.');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'test_only_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CLIENT_URL: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173'),
  ALLOW_REGISTRATION: (process.env.ALLOW_REGISTRATION || 'true').toLowerCase() === 'true',
  SEED_ADMIN_USERNAME: process.env.SEED_ADMIN_USERNAME || '',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || '',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || '',
};
