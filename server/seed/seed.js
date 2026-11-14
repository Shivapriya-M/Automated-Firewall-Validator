import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import Admin from '../models/Admin.js';
import FirewallRule from '../models/FirewallRule.js';
import ValidationHistory from '../models/ValidationHistory.js';
import Activity from '../models/Activity.js';
import { createRule } from '../services/ruleService.js';
import { validateRuleString, recordValidation } from '../services/validationService.js';
import { logActivity } from '../services/activityService.js';
import { migrateLegacyAccountStatuses } from '../services/userMigration.js';

// Convention used by the samples: 0.0.0.0 = any address, port 0 = any port.
const SAMPLE_RULES = [
  { ruleName: 'Allow HTTPS to Web Server', sourceIP: '0.0.0.0', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '443', protocol: 'TCP', action: 'ALLOW', priority: 10, description: 'Valid TCP ALLOW - public HTTPS traffic' },
  { ruleName: 'Allow DNS Queries', sourceIP: '192.168.1.25', destinationIP: '8.8.8.8', sourcePort: '0', destinationPort: '53', protocol: 'UDP', action: 'ALLOW', priority: 20, description: 'Valid UDP ALLOW - outbound DNS' },
  { ruleName: 'Allow ICMP Ping', sourceIP: '10.0.0.15', destinationIP: '192.168.1.1', sourcePort: '', destinationPort: '', protocol: 'ICMP', action: 'ALLOW', priority: 30, description: 'Valid ICMP rule (ICMP has no ports)' },
  { ruleName: 'Block Telnet', sourceIP: '0.0.0.0', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '23', protocol: 'TCP', action: 'DENY', priority: 40, description: 'DENY policy - valid and enabled, but it blocks traffic' },
  { ruleName: 'Invalid IP Example', sourceIP: '192.168.1.300', destinationIP: '10.0.0.8', sourcePort: '0', destinationPort: '80', protocol: 'TCP', action: 'ALLOW', priority: 50, description: 'Invalid: octet 300 is out of range' },
  { ruleName: 'Invalid Port Example', sourceIP: '10.0.0.7', destinationIP: '192.168.1.30', sourcePort: '0', destinationPort: '70000', protocol: 'TCP', action: 'ALLOW', priority: 60, description: 'Invalid: port above 65535' },
  { ruleName: 'Invalid Protocol Example', sourceIP: '10.0.0.9', destinationIP: '192.168.1.31', sourcePort: '0', destinationPort: '80', protocol: 'HTTP', action: 'ALLOW', priority: 70, description: 'Invalid: HTTP is not TCP/UDP/ICMP/ANY' },
  { ruleName: 'Missing Destination IP', sourceIP: '10.0.0.10', destinationIP: '', sourcePort: '0', destinationPort: '8080', protocol: 'TCP', action: 'ALLOW', priority: 80, description: 'Invalid: required destination IP is missing' },
  { ruleName: 'Disabled SSH Access', sourceIP: '172.16.0.4', destinationIP: '192.168.1.20', sourcePort: '0', destinationPort: '22', protocol: 'TCP', action: 'ALLOW', priority: 90, enabled: false, description: 'Valid ALLOW rule that an administrator disabled' },
  { ruleName: 'Duplicate HTTPS Rule', sourceIP: '0.0.0.0', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '443', protocol: 'TCP', action: 'ALLOW', priority: 15, description: 'Duplicate of the first HTTPS rule' },
  { ruleName: 'Allow SMTP Relay', sourceIP: '192.168.1.50', destinationIP: '203.0.113.25', sourcePort: '0', destinationPort: '587', protocol: 'TCP', action: 'ALLOW', priority: 100, description: 'Valid TCP ALLOW - mail submission' },
  { ruleName: 'Default Deny Everything', sourceIP: '0.0.0.0', destinationIP: '0.0.0.0', sourcePort: '0', destinationPort: '0', protocol: 'ANY', action: 'DENY', priority: 1000, description: 'Catch-all DENY policy' },
];

const SAMPLE_VALIDATIONS = [
  '192.168.1.10,443,TCP,ALLOW', '10.0.0.5,53,UDP,DENY', '192.168.1.300,443,TCP,ALLOW',
  '10.0.0.1,80,HTTP,ALLOW', '10.0.0.1,80,TCP', '172.16.0.9,0,ICMP,ALLOW', '443,192.168.1.10,TCP,ALLOW',
];

const daysAgo = (d, hour = 10) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(hour, 15, 0, 0); return t; };

async function run() {
  if (!env.SEED_ADMIN_USERNAME || !env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_USERNAME, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running the seed script.');
  }
  await connectDB();
  await migrateLegacyAccountStatuses();
  console.log('Connected. Seeding missing records without deleting existing data...');

  let admin = await Admin.findOne({ $or: [
    { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    { username: env.SEED_ADMIN_USERNAME },
  ] });
  if (!admin) {
    admin = await Admin.create({ username: env.SEED_ADMIN_USERNAME, email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD, role: 'superadmin' });
    console.log(`Created admin account: ${admin.email}`);
  } else console.log(`Admin ${admin.email} already exists - password left unchanged.`);

  let i = 0;
  for (const sample of SAMPLE_RULES) {
    if (await FirewallRule.exists({ ruleName: sample.ruleName })) { i++; continue; }
    const { rule, validation } = await createRule(sample, admin, { createdAt: daysAgo(Math.min(12, SAMPLE_RULES.length - i)) });
    if (sample.enabled === false && rule.validationStatus === 'VALID') { rule.enabled = false; await rule.save(); }
    console.log(`  ${rule.ruleId}  ${validation.validationStatus.padEnd(7)} ${rule.ruleName}${rule.duplicateOf ? `  (duplicate of ${rule.duplicateOf})` : ''}`);
    i++;
  }
  for (const [n, input] of SAMPLE_VALIDATIONS.entries()) {
    if (await ValidationHistory.exists({ inputRule: input })) continue;
    await recordValidation({ inputRule: input, result: validateRuleString(input), admin, source: n % 2 ? 'SIMULATOR' : 'VALIDATOR', createdAt: daysAgo(n % 5, 9 + n) });
  }
  if (!(await Activity.exists({ type: 'SEED' }))) await logActivity('SEED', `Database seeded with ${SAMPLE_RULES.length} sample rules`, admin);

  console.log('\nSeed complete.');
  console.log(`Admin email: ${admin.email}. Use the password configured when this account was first created.`);
  await disconnectDB();
}
run().catch(async (e) => { console.error('Seed failed:', e.message); await disconnectDB().catch(() => {}); process.exit(1); });
