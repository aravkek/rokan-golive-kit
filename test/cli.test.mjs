import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPlan, main, parseArgs, resolveSystems, toText } from '../bin/golive.mjs';
import { parseCSV } from '../scripts/build-catalog.mjs';

const catalog = JSON.parse(fs.readFileSync(new URL('../catalog/systems.json', import.meta.url)));
const risks = JSON.parse(fs.readFileSync(new URL('../catalog/risk-catalog.json', import.meta.url)));
const run = argv => { const out = [], err = []; const code = main(argv, { out: s => out.push(s), err: s => err.push(s) }); return { code, out: out.join('\n'), err: err.join('\n') }; };

test('CSV and JSON catalogs agree', () => {
  const rows = parseCSV(fs.readFileSync(new URL('../catalog/risk-catalog.csv', import.meta.url), 'utf8'));
  assert.equal(rows.length, 93);
  assert.equal(risks.length, rows.length);
  rows.forEach((r, i) => assert.equal(risks[i].risk, r.risk));
  const ids = new Set(catalog.systems.map(s => s.id));
  risks.flatMap(r => r.applies_to).forEach(a => assert.ok(a.startsWith('scope:') || ids.has(a), a));
});

test('resolves ids, names and loose spellings; reports unknowns', () => {
  const { found, unknown } = resolveSystems(['salesforce', 'athenaHealth', 'Genesys', 'nope'], catalog);
  assert.deepEqual(found.map(s => s.id), ['salesforce', 'athena', 'genesys']);
  assert.deepEqual(unknown, ['nope']);
});

test('timeline follows the slowest approval', () => {
  const admin = buildPlan(parseArgs(['salesforce', '--start', '2026-11-10']), catalog, risks);
  assert.equal(admin.timeline.find(s => s.what.startsWith('First live')).date, '2026-11-18'); // day 8
  assert.equal(admin.timeline.at(-1).date, '2026-11-25'); // day 15
  const partner = buildPlan(parseArgs(['epic', 'twilio', '--start', '2026-11-10']), catalog, risks);
  assert.equal(partner.timeline.find(s => s.what.startsWith('First live')).day, 25);
});

test('risks: system-specific always, health and voice scopes when relevant', () => {
  const plan = buildPlan(parseArgs(['epic', '--agent', 'voice']), catalog, risks);
  const ids = plan.risks.map(r => r.id);
  ['R015', 'R016', 'R027', 'R062', 'R064'].forEach(id => assert.ok(ids.includes(id), id));
  assert.ok(!ids.includes('R001'), 'no Salesforce risk without Salesforce');
  const chat = buildPlan(parseArgs(['zendesk', '--agent', 'chat']), catalog, risks).risks.map(r => r.id);
  assert.ok(!chat.includes('R062'), 'no call-recording risk for chat on Zendesk');
  assert.ok(!chat.includes('R065'), 'no EU risk without --eu');
  assert.ok(buildPlan(parseArgs(['zendesk', '--agent', 'chat', '--eu']), catalog, risks).risks.some(r => r.id === 'R065'));
});

test('text output has every section; json parses', () => {
  const text = toText(buildPlan(parseArgs(['salesforce', 'twilio']), catalog, risks));
  ['TIMELINE', 'ACCESS', 'RISKS', 'REPLAY TESTS', 'ROLLOUT', 'KILL SWITCH'].forEach(h => assert.match(text, new RegExp(`^${h}`, 'm')));
  const { code, out } = run(['salesforce', '--json']);
  assert.equal(code, 0);
  assert.equal(JSON.parse(out).systems[0].id, 'salesforce');
});

test('bad input exits 2 with a useful message', () => {
  assert.equal(run([]).code, 2);
  assert.match(run(['nope']).err, /Unknown system/);
  assert.match(run(['salesforce', '--agent', 'robot']).err, /Unknown --agent/);
  assert.match(run(['salesforce', '--start', '11/10/2026']).err, /YYYY-MM-DD/);
  assert.equal(run(['--list']).code, 0);
});
