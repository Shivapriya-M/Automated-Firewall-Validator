import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { migrateLegacyAccountStatuses } from './services/userMigration.js';

async function start() {
  try {
    await connectDB();
    const migratedAccounts = await migrateLegacyAccountStatuses();
    if (migratedAccounts) console.log(`Marked ${migratedAccounts} existing account(s) as approved.`);
    console.log('MongoDB connected.');
  } catch (err) {
    console.error('\nCould not connect to MongoDB:', err.message);
    console.error('  - Atlas: copy the current URI from Database > Connect > Drivers; check the database user and Network Access IP allow-list.');
    process.exit(1);
  }
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Firewall Validator API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
  const shutdown = () => server.close(async () => { await disconnectDB().catch(() => {}); process.exit(0); });
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
start();
