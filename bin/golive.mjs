#!/usr/bin/env node
// rokan-golive: print a go-live plan for an AI agent from a list of the customer's systems.
// Zero dependencies. Reads catalog/systems.json and catalog/risk-catalog.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, 'catalog', f), 'utf8'));
const DAY = 864e5;
const LIKELY = { high: 0, med: 1, low: 2 };

const HELP = `rokan-golive: print a go-live plan for an AI agent from the customer's systems.

Usage
  rokan-golive <system> [system...] [options]
  rokan-golive --list

Options
  --agent <id>      voice | chat | backoffice | other (default: voice)
  --fallback <id>   human | voicemail | none (default: human)
  --start <date>    YYYY-MM-DD the contract is signed (default: today)
  --eu              include EU rules (AI Act disclosure, works councils)
  --all-risks       include every general risk, not only high-likelihood ones
  --json            print the plan as JSON
  --list            list every system id the catalog knows
  -h, --help        show this help

Example
  rokan-golive salesforce twilio --agent voice --start 2026-11-10

Durations are planning assumptions, not measurements. Confirm every item with the
customer's admins and counsel.`;

export function parseArgs(argv) {
  const opts = { systems: [], agent: 'voice', fallback: 'human', start: null, eu: false, allRisks: false, json: false, list: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--agent') opts.agent = next();
    else if (a === '--fallback') opts.fallback = next();
    else if (a === '--start') opts.start = next();
    else if (a === '--eu') opts.eu = true;
    else if (a === '--all-risks') opts.allRisks = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--list') opts.list = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('-')) throw new Error(`Unknown option ${a}`);
    else opts.systems.push(...a.split(',').filter(Boolean));
  }
  return opts;
}

const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function resolveSystems(names, catalog) {
  const found = [], unknown = [];
  names.forEach(n => {
    const k = norm(n);
    const hit = catalog.systems.find(s => norm(s.id) === k || norm(s.name) === k)
      || catalog.systems.find(s => norm(s.name).startsWith(k) && k.length >= 3);
    if (hit) { if (!found.includes(hit)) found.push(hit); } else unknown.push(n);
  });
  return { found, unknown };
}

const toISO = t => new Date(t).toISOString().slice(0, 10);
function parseStart(s) {
  if (!s) { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) throw new Error(`--start must be YYYY-MM-DD, got "${s}"`);
  return Date.parse(`${s}T00:00:00Z`);
}

export function buildPlan(opts, catalog = load('systems.json'), risks = load('risk-catalog.json')) {
  const agent = catalog.agents.find(a => a.id === opts.agent);
  if (!agent) throw new Error(`Unknown --agent "${opts.agent}". Use one of: ${catalog.agents.map(a => a.id).join(', ')}`);
  const fallback = catalog.fallbacks.find(f => f.id === opts.fallback);
  if (!fallback) throw new Error(`Unknown --fallback "${opts.fallback}". Use one of: ${catalog.fallbacks.map(f => f.id).join(', ')}`);
  const { found, unknown } = resolveSystems(opts.systems, catalog);
  if (unknown.length) throw new Error(`Unknown system(s): ${unknown.join(', ')}. Run --list to see ids.`);
  if (!found.length) throw new Error('Name at least one system, e.g. salesforce twilio. Run --list to see ids.');

  const t = catalog.timeline;
  const start = parseStart(opts.start);
  const access = Math.max(...found.map(s => t.leadDays[s.approval]));
  const slowest = found.filter(s => t.leadDays[s.approval] === access).map(s => s.name);
  const verify = Math.max(access, t.replayDays);
  const shadow = verify + t.verifyDays;
  const p10 = shadow + t.shadowDays;
  const p50 = p10 + t.hold10Days;
  const p100 = p50 + t.hold50Days;
  const at = d => toISO(start + d * DAY);
  const timeline = [
    { day: 0, date: at(0), what: 'Send every access request below. Ask for a 90-day history export with outcomes.' },
    { day: 0, date: at(0), what: t.paper },
    { day: 1, date: at(1), what: `Build the replay suite from the exported history (${t.replayDays} days, while access is pending).` },
    { day: verify, date: at(verify), what: `Access in place. Slowest: ${slowest.join(', ')} (planning assumption: about ${access} days). Rerun replay on live connections and review failures with the customer.` },
    { day: shadow, date: at(shadow), what: `Shadow mode for ${t.shadowDays} days.` },
    { day: p10, date: at(p10), what: 'First live traffic at 10%.' },
    { day: p50, date: at(p50), what: '50%, if the checks hold.' },
    { day: p100, date: at(p100), what: '100%, if the checks hold.' },
  ];

  const groups = new Set(found.map(s => s.group));
  const scopes = new Set(['scope:all']);
  if (agent.id === 'voice' || groups.has('telephony')) scopes.add('scope:voice');
  if (groups.has('ehr') || groups.has('emr-ca') || found.some(s => s.id === 'availity')) scopes.add('scope:health');
  if (opts.eu) scopes.add('scope:eu');
  const ids = new Set(found.map(s => s.id));
  const matched = risks.filter(r => r.applies_to.some(a => ids.has(a))
    || (r.applies_to.some(a => scopes.has(a)) && (opts.allRisks || r.likelihood === 'high' || !r.applies_to.includes('scope:all'))));
  matched.sort((a, b) => (LIKELY[a.likelihood] ?? 3) - (LIKELY[b.likelihood] ?? 3) || a.id.localeCompare(b.id));

  const units = agent.units;
  const fill = s => s.replace(/\{units\}/g, units);
  return {
    agent: agent.label, fallback: fallback.label, start: at(0),
    systems: found.map(s => ({ id: s.id, name: s.name, level: s.level, approval: t.approvalLabels[s.approval], leadDays: t.leadDays[s.approval],
      access: s.access, sandbox: s.sandbox, limits: s.limits, request: s.request, blockers: s.blockers, check: s.check })),
    timeline,
    risks: matched.map(r => ({ id: r.id, system: r.system, risk: r.risk, likelihood: r.likelihood, delay: r.typical_delay, mitigation: r.mitigation, source: r.source })),
    tests: { history: agent.history, perCase: catalog.sampling.perCase, holdout: catalog.sampling.holdoutShare, window: catalog.sampling.window },
    rollout: catalog.rollout.stages.map(s => ({ traffic: s.traffic, label: s.label, what: fill(s.what), exit: s.exit })),
    killSwitchTriggers: catalog.rollout.triggers,
  };
}

const wrap = (text, indent, width = 92) => {
  const out = []; let line = '';
  text.split(/\s+/).forEach(w => {
    if ((line + ' ' + w).trim().length > width - indent.length) { out.push(indent + line.trim()); line = w; } else line += ` ${w}`;
  });
  if (line.trim()) out.push(indent + line.trim());
  return out.join('\n');
};

export function toText(plan) {
  const L = [];
  L.push(`GO-LIVE PLAN: ${plan.systems.map(s => s.name).join(', ')}`);
  L.push(`${plan.agent} agent. Fallback today: ${plan.fallback}. Signed ${plan.start}.`);
  L.push('Durations are planning assumptions, not measurements. Confirm each item with the customer.', '');
  L.push('TIMELINE');
  plan.timeline.forEach(s => { L.push(`  ${s.date}  day ${String(s.day).padStart(2)}`); L.push(wrap(s.what, '      ')); });
  L.push('', 'ACCESS (send on day 1)');
  plan.systems.forEach(s => {
    L.push(`  ${s.name} [${s.level} risk] ${s.approval}, about ${s.leadDays} days`);
    L.push(wrap(`Ask for: ${s.request}`, '    '));
    L.push(wrap(`Access: ${s.access}`, '    '));
    L.push(wrap(`Sandbox: ${s.sandbox}`, '    '));
    s.blockers.forEach(b => L.push(wrap(`- ${b}`, '    ')));
    L.push(wrap(`Launch check: ${s.check}`, '    '));
  });
  L.push('', `RISKS (${plan.risks.length}, most likely first)`);
  plan.risks.forEach(r => {
    L.push(wrap(`${r.id} ${r.system} [${r.likelihood}, ${r.delay}]: ${r.risk}`, '  '));
    L.push(wrap(`Fix: ${r.mitigation}`, '      '));
    L.push(wrap(`Source: ${r.source}`, '      '));
  });
  L.push('', 'REPLAY TESTS');
  L.push(wrap(`Use the last ${plan.tests.window} of ${plan.tests.history}. At least ${plan.tests.perCase} cases per case type and every case of rarer types. Hold out ${plan.tests.holdout} that nobody tunes against. Agree the pass bar in writing first.`, '  '));
  L.push('', 'ROLLOUT');
  plan.rollout.forEach(s => { L.push(`  ${s.traffic.padEnd(4)} ${s.label}`); L.push(wrap(s.what, '       ')); L.push(wrap(`Exit: ${s.exit}`, '       ')); });
  L.push('', 'KILL SWITCH: pull it when');
  plan.killSwitchTriggers.forEach(k => L.push(wrap(`- ${k}`, '  ')));
  L.push('', 'Full checklist: checklist.md, or print https://rokan.computer/golive/checklist');
  return L.join('\n');
}

export function main(argv = process.argv.slice(2), io = { out: s => process.stdout.write(`${s}\n`), err: s => process.stderr.write(`${s}\n`) }) {
  let opts;
  try { opts = parseArgs(argv); } catch (e) { io.err(`${e.message}\n\n${HELP}`); return 2; }
  if (opts.help || (!opts.list && !opts.systems.length)) { io.out(HELP); return opts.help ? 0 : 2; }
  if (opts.list) {
    const c = load('systems.json');
    c.groups.forEach(g => {
      const items = c.systems.filter(s => s.group === g.id);
      if (items.length) io.out(`${g.label}\n${items.map(s => `  ${s.id.padEnd(15)} ${s.name}`).join('\n')}`);
    });
    return 0;
  }
  try {
    const plan = buildPlan(opts);
    io.out(opts.json ? JSON.stringify(plan, null, 2) : toText(plan));
    return 0;
  } catch (e) { io.err(e.message); return 2; }
}

const isMain = process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exitCode = main();
