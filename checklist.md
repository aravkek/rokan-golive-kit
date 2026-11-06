# AI agent go-live checklist

An AI agent go-live checklist covers the access requests on day 1, an owner for the security review, DPA and BAA, an export of past calls or tickets, a written replay pass bar, shadow mode, a 10%, 50%, 100% rollout with an approver for each step, and a fallback drill and a kill-switch drill. After launch, it adds a 30-day watch.

Customer: ____  Workflow: ____  Target date: ____

## 1. Day 1: access requests

Send all of them the day the contract is signed. Approvals are the long pole.

- [ ] List every system the agent reads from or writes to, and who administers each one.
- [ ] Send each admin the exact request: the app to install, the integration user, the scopes and fields. Nothing broader.
- [ ] Ask for a sandbox or test environment, and the date it was last refreshed.
- [ ] Phones: a test number on call forwarding or SIP, not a number port.
- [ ] SMS: start A2P 10DLC registration now if the agent will send texts.
- [ ] Written approval to use past calls, chats or tickets for testing.

## 2. Paperwork owners

Name one owner on each side for each item.

- [ ] Security review or questionnaire. Owner, theirs and ours: ____ / ____
- [ ] DPA and the sub-processor list: model, speech, telephony, hosting, logging.
- [ ] BAA with every vendor that touches health data, if in scope. One gap blocks launch.
- [ ] AI disclosure and recording-consent script, signed off by their counsel.
- [ ] Written acceptance criteria: what “live” means and the bar for each step.

## 3. History export

Test on what really happened at this customer, not on made-up cases.

- [ ] The last 90 days of calls, chats or tickets, with their outcomes.
- [ ] Personal, card and health data scrubbed before anything is stored.
- [ ] At least 20 cases per case type, and every case of the rarer types.
- [ ] 1 in 5 cases held out. Nobody tunes against them.

## 4. Replay pass bar

Agree it before the first run, so launch isn’t argued after.

- [ ] Pass bar written down and agreed with the customer.
- [ ] Writes tested in their sandbox with their automation turned on.
- [ ] Each case run several times; it passes only if every run passes.
- [ ] Every failure reviewed with the customer.
- [ ] Held-out cases meet the bar.

## 5. Shadow mode

Real traffic, zero risk: the agent drafts, people act.

- [ ] The agent sees real traffic and drafts actions. Nothing is written; nobody hears it.
- [ ] Staff compare its drafts with what they did, for at least 3 days.
- [ ] Customer sign-off on the shadow failures: ____

## 6. 10% → 50% → 100%

Move up only when the checks pass and the approver says go.

- [ ] Named approver for each step: ____
- [ ] 10%: no unsafe writes, escalations in range, every failure reviewed.
- [ ] 50%: includes peak hours; checks hold and the fallback team keeps up.
- [ ] 100%: the fallback and the kill switch stay in place.

## 7. Fallback drill

A fallback nobody has called is not a fallback.

- [ ] Call the fallback at every hour the agent runs, after hours included.
- [ ] Transfers carry a summary, so the caller doesn’t start over.
- [ ] Someone staffs the fallback queue whenever the agent is on.

## 8. Kill-switch drill

One action sends new traffic back to today’s route.

- [ ] Who can pull it: ____
- [ ] Pulled once in shadow and once at 10%. Seconds to 0% agent traffic: ____
- [ ] Revoke-all drill: every credential the agent holds is cut in one step.
- [ ] Pull it on: a wrong-record write, rates above the threshold, a system change, a staff report.

## 9. 30-day watch

Most breakage comes from changes around the agent, not the agent.

- [ ] Daily failure review for the first 2 weeks.
- [ ] Replay reruns whenever a connected system, prompt or model changes.
- [ ] Credential and token expiry dates tracked.
- [ ] Model deprecation dates on the calendar.
- [ ] Day-30 report: volume, outcomes, transfers, complaints, against the baseline.

From Rokan’s go-live catalog, November 2026. Planning checklist, not legal advice: confirm each item with the customer’s admins and counsel. Free to copy and share.

Printable version: https://rokan.computer/golive/checklist
