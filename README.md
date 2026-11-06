# rokan-golive

A go-live kit for AI agents. You signed an enterprise customer; this tells you what to ask
their admins for on day 1, what usually breaks, how to test on their history and how to roll
out without hurting anyone.

- `catalog/risk-catalog.csv` and `.json`: 93 go-live risks across CRMs, EHRs, ERPs, ticketing,
  telephony, identity, payments, legacy systems and the agent itself. Each row has the
  likelihood, the typical delay, a mitigation and a source. Sources tagged `[weak]` are blogs
  or aggregators; confirm them.
- `catalog/systems.json`: 110 systems with how the agent gets in, who approves it, sandbox
  options, limits, typical blockers and the exact day-1 access request.
- `checklist.md`: a one-page go-live checklist, from access requests to the 30-day watch.
- `bin/golive.mjs`: a zero-dependency CLI that prints a go-live plan from a list of systems.

## Use it

Node 18 or later. No install, no network calls, no dependencies.

```sh
node bin/golive.mjs salesforce twilio --agent voice --start 2026-11-10
node bin/golive.mjs epic --json > plan.json
node bin/golive.mjs --list
```

Once published to npm, the same works as `npx rokan-golive salesforce twilio`.

Options: `--agent voice|chat|backoffice|other`, `--fallback human|voicemail|none`,
`--start YYYY-MM-DD`, `--eu` (EU AI Act disclosure, works councils), `--all-risks`
(every general risk, not only high-likelihood ones), `--json`.

The plan has six parts: a dated timeline driven by the slowest approval, the access request
for each system, the matching risks (most likely first, with sources), the replay test
sample, the shadow / 10% / 50% / 100% rollout with exit criteria, and the kill-switch
triggers.

## What the numbers are

Durations are planning assumptions, not measurements: about 3 days when a customer admin
can grant access, 10 for an IT or security review, 21 for a vendor approval followed by
customer enablement, then 4 days to build the replay suite (in parallel), 1 to verify, 3 of
shadow mode, 3 at 10% and 4 at 50%. Editions, contracts and admin settings change what a
customer actually has, so confirm every item with their admins and, for consent, privacy and
health data, their counsel. Nothing here is legal advice.

## Updating the catalog

Edit `catalog/risk-catalog.csv`, then run `node scripts/build-catalog.mjs`. Every CSV
`system` value must map to plan-catalog system ids or a scope in `APPLIES` in that script,
or the build fails. `catalog/systems.json` is exported from the rokan.computer plan catalog
with `node scripts/build-catalog.mjs --site <path-to-site>`. Run `npm test` after any change.

Corrections with a source are welcome.

## Who made this

[Rokan](https://rokan.computer) is the AI forward-deployed engineer for AI agent startups.
It takes a signed customer live in two weeks: connects the agent to their systems, tests it
on their past calls, rolls out at 10%, 50% and 100% with a human fallback and a kill switch,
and keeps it working. The same catalog powers the free planner at
[rokan.computer/plan](https://rokan.computer/plan) and the guides at
[rokan.computer/golive](https://rokan.computer/golive).

MIT licensed.
