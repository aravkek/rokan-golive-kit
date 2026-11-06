#!/usr/bin/env node
// Rebuilds catalog/risk-catalog.json from catalog/risk-catalog.csv and, with --site <path>,
// re-exports catalog/systems.json from the rokan.computer plan catalog (plan-systems.js and
// plan-rules.js). Zero dependencies. Run: node scripts/build-catalog.mjs [--site ../rokan-site]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes.
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// Which plan-catalog systems (or scopes) each CSV "system" value applies to.
// scope:all = every plan; scope:voice = voice agents or any telephony system;
// scope:health = EHR/EMR systems or Availity; scope:eu = --eu flag.
const APPLIES = {
  'Salesforce': ['salesforce'], 'Salesforce Agentforce': ['salesforce'], 'HubSpot': ['hubspot'],
  'Dynamics 365 / Dataverse': ['dynamics'], 'Epic': ['epic'], 'Oracle Health (Cerner)': ['oracle-health'],
  'athenahealth': ['athena'], 'eClinicalWorks': ['ecw'], 'HL7v2 / interface engine': ['hl7'], 'Mirth Connect': ['hl7'],
  'Healthcare': ['scope:health'], 'Healthcare (CA)': ['scope:health'], 'NetSuite': ['netsuite'], 'SAP S/4HANA': ['sap'],
  'Dynamics 365 Business Central': ['bc'], 'Zendesk': ['zendesk'], 'Zendesk AI Agents': ['zendesk'],
  'ServiceNow': ['servicenow'], 'Freshdesk': ['freshdesk'], 'Intercom': ['intercom'], 'Intercom Fin / platform evals': ['intercom'],
  'ServiceTitan': ['servicetitan'], 'Jobber': ['jobber'], 'Housecall Pro': ['housecall'], 'Twilio': ['twilio'],
  'Any carrier': ['scope:voice'], 'Retell / Vapi': ['retell'], 'SIP / SBC': ['scope:voice'], 'Five9': ['five9'],
  'Genesys Cloud': ['genesys'], 'Talkdesk': ['talkdesk'], 'RingCentral': ['ringcentral'], '8x8': ['8x8'],
  'Telephony (US)': ['scope:voice'], 'Telephony (CA)': ['scope:voice'], 'Any agent (EU)': ['scope:eu'],
  'Stripe': ['stripe'], 'Okta': ['okta'], 'Microsoft Entra ID': ['entra'], 'Any system': ['scope:all'],
  'Legacy / no-API': ['desktop', 'portal', 'custom'], 'Mainframe / AS400': ['desktop', 'custom'],
  'Any LLM vendor': ['scope:all'], 'Any agent': ['scope:all'], 'Any voice agent': ['scope:voice'],
  'Customer security': ['scope:all'], 'Customer ops': ['scope:all'],
};

function buildRisks() {
  const rows = parseCSV(fs.readFileSync(path.join(root, 'catalog/risk-catalog.csv'), 'utf8'));
  return rows.map(r => {
    const applies = APPLIES[r.system];
    if (!applies) throw new Error(`No mapping for CSV system "${r.system}" (${r.id}). Add it to APPLIES.`);
    return { ...r, applies_to: applies };
  });
}

function exportSystems(site) {
  const c = Object.assign({}, require(path.resolve(site, 'plan-systems.js')), require(path.resolve(site, 'plan-rules.js')));
  return {
    source: 'rokan.computer/plan catalog', exported: new Date().toISOString().slice(0, 10),
    groups: c.groups, systems: c.systems, agents: c.agents.map(({ id, label, units, history }) => ({ id, label, units, history })),
    fallbacks: c.fallbacks, timeline: { leadDays: c.timeline.leadDays, approvalLabels: c.timeline.approvalLabels,
      replayDays: c.timeline.replayDays, verifyDays: c.timeline.verifyDays, shadowDays: c.timeline.shadowDays,
      hold10Days: c.timeline.hold10Days, hold50Days: c.timeline.hold50Days, paper: c.timeline.paper },
    rollout: c.rollout, sampling: c.sampling,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const risks = buildRisks();
  fs.writeFileSync(path.join(root, 'catalog/risk-catalog.json'), `${JSON.stringify(risks, null, 2)}\n`);
  console.log(`catalog/risk-catalog.json: ${risks.length} risks`);
  const i = process.argv.indexOf('--site');
  if (i > -1) {
    const systems = exportSystems(process.argv[i + 1]);
    const ids = new Set(systems.systems.map(s => s.id));
    const missing = [...new Set(risks.flatMap(r => r.applies_to))].filter(id => !id.startsWith('scope:') && !ids.has(id));
    if (missing.length) throw new Error(`risk-catalog maps to systems not in the plan catalog: ${missing.join(', ')}`);
    fs.writeFileSync(path.join(root, 'catalog/systems.json'), `${JSON.stringify(systems, null, 2)}\n`);
    console.log(`catalog/systems.json: ${systems.systems.length} systems`);
  }
}
