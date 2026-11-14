import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(uri = env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required. Copy the connection string from Atlas: Database > Connect > Drivers.');
  let parsed;
  try { parsed = new URL(uri); }
  catch { throw new Error('MONGODB_URI is not a valid MongoDB connection string. Copy the full URI from Atlas and URL-encode special characters in the password.'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://.');
  }
  if (parsed.protocol === 'mongodb+srv:' && parsed.hostname.split('.').length < 3) {
    throw new Error('MONGODB_URI has an incomplete Atlas SRV hostname. Copy the hostname from Atlas > Database > Connect > Drivers.');
  }
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    if (['ECONNREFUSED', 'EBADNAME', 'ENOTFOUND', 'EAI_AGAIN'].includes(err.code) || /querySrv/i.test(err.message)) {
      err.message = `MongoDB hostname could not be resolved (${err.code || 'DNS error'}). Verify the complete Atlas hostname in MONGODB_URI and check DNS/network access. Atlas: Database > Connect > Drivers.`;
    }
    throw err;
  }
  return mongoose.connection;
}
export async function disconnectDB() { await mongoose.disconnect(); }
