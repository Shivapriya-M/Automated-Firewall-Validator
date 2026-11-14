/**
 * SVG state diagram drawn from the DFA definition returned by the API.
 * activeState: state to highlight; visited: array of "from>to" edges to light up.
 */
const R = 30;
const edgeKey = (a, b) => `${a}>${b}`;

function layout(states) {
  const main = states.filter((s) => !s.rejecting);
  const rej = states.find((s) => s.rejecting);
  const gap = 150, x0 = 85, y = 105;
  const pos = {};
  main.forEach((s, i) => { pos[s.id] = { x: x0 + i * gap, y }; });
  if (rej) pos[rej.id] = { x: x0 + ((main.length - 1) * gap) / 2, y: 285 };
  return pos;
}

function groupEdges(def) {
  const map = new Map();
  for (const [from, row] of Object.entries(def.transitions)) {
    for (const [sym, to] of Object.entries(row)) {
      const k = edgeKey(from, to);
      if (!map.has(k)) map.set(k, { from, to, symbols: [] });
      map.get(k).symbols.push(sym);
    }
  }
  return [...map.values()];
}

export default function DFADiagram({ def, activeState, visited = [], compact = false }) {
  if (!def) return null;
  const pos = layout(def.states);
  const edges = groupEdges(def);
  const total = def.alphabet.length;
  const rejId = def.rejectingStates[0];
  const W = 85 * 2 + 150 * 4 - 20;

  return (
    <svg viewBox={`0 0 ${W} 360`} className={`w-full ${compact ? 'max-h-72' : ''}`} role="img" aria-label="DFA state diagram">
      <defs>
        {[['n', '#5b6b8c'], ['g', '#2cff8a'], ['r', '#f87171']].map(([id, c]) => (
          <marker key={id} id={`arrow-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill={c} /></marker>
        ))}
      </defs>

      {/* start arrow */}
      <line x1={pos.q0.x - R - 40} y1={pos.q0.y} x2={pos.q0.x - R - 2} y2={pos.q0.y} stroke="#22d3ee" strokeWidth="2" markerEnd="url(#arrow-g)" />
      <text x={pos.q0.x - R - 40} y={pos.q0.y - 10} fill="#22d3ee" fontSize="11" fontFamily="JetBrains Mono, monospace">start</text>

      {edges.map(({ from, to, symbols }) => {
        const a = pos[from], b = pos[to];
        const hit = visited.includes(edgeKey(from, to));
        const toReject = to === rejId;
        const color = hit ? (toReject ? '#f87171' : '#2cff8a') : toReject ? '#3a4663' : '#5b6b8c';
        const marker = hit ? (toReject ? 'r' : 'g') : 'n';
        const label = symbols.length === total ? 'any symbol' : toReject ? (from === 'q4' ? 'any symbol' : 'all others') : symbols.join(', ');

        if (from === to) { // self loop under the trap state
          const d = `M ${a.x - 18} ${a.y + R - 4} C ${a.x - 55} ${a.y + R + 62} ${a.x + 55} ${a.y + R + 62} ${a.x + 18} ${a.y + R - 4}`;
          return (
            <g key={`${from}${to}`}>
              <path d={d} fill="none" stroke={color} strokeWidth={hit ? 2.5 : 1.5} strokeDasharray="5 4" markerEnd={`url(#arrow-${marker})`} />
              <text x={a.x} y={a.y + R + 62} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono, monospace">{label}</text>
            </g>
          );
        }
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const x1 = a.x + ux * R, y1 = a.y + uy * R, x2 = b.x - ux * (R + 3), y2 = b.y - uy * (R + 3);
        const mx = (x1 + x2) / 2 + (toReject ? 0 : 0), my = (y1 + y2) / 2;
        const lx = toReject ? x1 + (x2 - x1) * 0.55 : mx, ly = toReject ? y1 + (y2 - y1) * 0.55 : my - 10;
        return (
          <g key={`${from}${to}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={hit ? 2.5 : 1.5} strokeDasharray={toReject ? '5 4' : undefined} markerEnd={`url(#arrow-${marker})`} />
            <text x={lx + (toReject ? (dx < 0 ? -6 : 6) : 0)} y={ly} textAnchor={toReject ? (dx < 0 ? 'end' : dx === 0 ? 'middle' : 'start') : 'middle'} fill={hit ? '#e2e8f0' : '#94a3b8'} fontSize="11" fontFamily="JetBrains Mono, monospace">{label}</text>
          </g>
        );
      })}

      {def.states.map((s) => {
        const p = pos[s.id];
        const active = activeState === s.id;
        const stroke = s.rejecting ? '#f87171' : s.accepting ? '#2cff8a' : '#3d8bff';
        return (
          <g key={s.id}>
            {active && <circle cx={p.x} cy={p.y} r={R + 9} fill="none" stroke={stroke} strokeWidth="2" className="animate-ring" />}
            <circle cx={p.x} cy={p.y} r={R} fill={active ? `${stroke}22` : '#0a1120'} stroke={stroke} strokeWidth={active ? 3 : 2} />
            {s.accepting && <circle cx={p.x} cy={p.y} r={R - 5} fill="none" stroke={stroke} strokeWidth="1.5" />}
            <text x={p.x} y={p.y + 5} textAnchor="middle" fill="#f1f5f9" fontSize={s.id === 'qReject' ? 13 : 16} fontWeight="600" fontFamily="JetBrains Mono, monospace">{s.id}</text>
          </g>
        );
      })}
    </svg>
  );
}
