# Bearbet project context

Read these files in order before substantial implementation work:

1. [`task-brief.md`](./task-brief.md) contains normalized product requirements and the definition of done.
2. [`architecture.md`](./architecture.md) records current code boundaries, ownership rules, deployment choices, and visual direction.
3. [`domain-model.md`](./domain-model.md) records the implemented identity and wallet model plus the remaining gameplay and bonus decisions.
4. [`master-task-list.md`](./master-task-list.md) tracks the P0 delivery checklist and deferred P1 work.
5. [`implementation-plan.md`](./implementation-plan.md) records the current state, next slice, and later delivery order.
6. [`bigbang-sandbox-findings.md`](./bigbang-sandbox-findings.md) records the active BigBang sandbox catalogue, player, launch, hybrid reconciliation, and callback-limit evidence.
7. [`drakon-api.md`](./drakon-api.md) documents the retired Drakon authentication, catalogue, launch, and wallet callback contract for historical reference.
8. [`drakon-v0-findings.md`](./drakon-v0-findings.md) records the historical live V0 evidence and the failed playable-launch investigation.

## Current provider strategy

The active delivery path is deliberately hybrid. The deterministic fixture
simulator is the canonical Bearbet wallet, bonus, ledger, and per-round history
demonstration. BigBang supplies the genuine playable provider session through
the authenticated bridge and reconciles only the final session delta at explicit
close. Drakon is ruled out for the active path; its adapter, routes, tests, and
findings remain archival evidence only.

The source PDFs remain in `/Users/manasseh/Downloads`. These Markdown files are working references, not replacements for checking the source documents when an exact contractual detail matters.
