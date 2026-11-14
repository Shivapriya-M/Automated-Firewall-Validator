import { Network, Code2, Binary, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';

const SUBJECTS = [
  { icon: Network, title: 'Computer Networks', tone: 'text-cyan-300', points: ['IPv4 addressing: four octets, each 0-255', 'Ports 0-65535 and the TCP, UDP, ICMP protocols', 'Rule priority, ALLOW and DENY policies, default-deny', 'ICMP has no ports, so ports are optional only for ICMP'] },
  { icon: Code2, title: 'Full Stack Development', tone: 'text-neon', points: ['React, Vite and Tailwind single-page client', 'Express REST API with JWT authentication and bcrypt', 'MongoDB and Mongoose models, filtered and paginated queries', 'Controllers, routes, middleware and service modules'] },
  { icon: Binary, title: 'Finite Automata and Formal Languages', tone: 'text-amber-300', points: ['A real DFA with states, alphabet, delta, start and accepting states', 'A trap state that absorbs every invalid sequence', 'Tokens recognised by character-level automata, with no regular expressions in the DFA module', 'Regex validation kept separate so both methods can be compared'] },
];

export default function About() {
  return (
    <>
      <PageHeader title="About this project" subtitle="Automated Firewall Rule Validation System - an educational firewall management simulator. It never reads or changes the real Windows Firewall." />
      <div className="grid gap-4 lg:grid-cols-3">
        {SUBJECTS.map(({ icon: Icon, title, tone, points }) => (
          <div key={title} className="card p-5"><h3 className={`flex items-center gap-2 text-sm font-semibold ${tone}`}><Icon size={18} />{title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">{points.map((p) => <li key={p}>- {p}</li>)}</ul></div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="h-sub mb-3">How a rule is validated</h3>
          <ol className="space-y-3 text-sm text-slate-300">
            <li><b className="text-white">1. Regex syntax.</b> Each field is matched against a pattern, for example four groups of digits separated by dots for an IPv4 address.</li>
            <li><b className="text-white">2. Semantic range check.</b> Octets must be 0-255 and ports 0-65535, with no leading zeros.</li>
            <li><b className="text-white">3. DFA classification.</b> The string <span className="mono text-cyan-300">destinationIP,destinationPort,protocol,action</span> is read token by token. Only the order IP, PORT, PROTOCOL, ACTION ends in the accepting state q4.</li>
            <li><b className="text-white">4. Status.</b> A rule is VALID only when both layers agree. The server decides, never the browser.</li>
          </ol>
        </div>
        <div className="card p-5">
          <h3 className="h-sub mb-3">Status classification</h3>
          <table className="tbl"><thead><tr><th>Status</th><th>Meaning</th></tr></thead><tbody>
            <tr><td className="text-neon">ACTIVE</td><td>VALID, enabled and ALLOW</td></tr>
            <tr><td className="text-amber-300">BLOCKED</td><td>VALID and either a DENY policy or administratively disabled. The reason chip tells you which.</td></tr>
            <tr><td className="text-red-400">INVALID</td><td>Failed validation. Never active and cannot be enabled.</td></tr>
          </tbody></table>
          <p className="mt-3 text-xs text-slate-500">The three properties validationStatus, enabled and action are stored separately. The display status is derived from them.</p>
        </div>
      </div>

      <div className="card mt-4 flex items-start gap-3 p-5"><ShieldCheck className="mt-0.5 text-neon" size={20} />
        <p className="text-sm text-slate-300">Security: bcrypt-hashed passwords, JWT-protected routes, server-side validation, input sanitisation against NoSQL operator injection, rate-limited login, secrets in environment variables and no stack traces in production errors.</p></div>
      <p className="mt-4 text-xs text-slate-500">Stack: React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide - Node.js, Express, Mongoose, MongoDB, JWT, bcrypt.</p>
    </>
  );
}
