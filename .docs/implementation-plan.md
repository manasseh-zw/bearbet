# Bearbet implementation plan

## Execution rule

Build in complete slices. Each phase must end with a visible user or admin outcome, automated proof for its risky rules, and a presentation pass. Do not build all tables, then all APIs, then all pages as disconnected layers.

The master list in `master-task-list.md` tracks everything. This plan only describes order and gates.

## Phase 0: lock rules and establish the base

Tasks: `F01` to `F05`, `B01` to `B03`.

Decide the money and bonus policies with worked examples before committing the first migration. Repair the current lint and typecheck baseline, establish the folder structure, validate environment variables, inventory the supplied logo files, and replace the inherited teal styling with Bearbet tokens.

Checkpoint:

- The six decisions in `architecture.md` have explicit answers.
- Build, typecheck, lint, and the empty test suite run from one command.
- A small brand specimen shows the logo, typography, colors, controls, game card, wallet control, and core states at desktop and mobile sizes.
- No product feature depends on raw `process.env` access outside the environment module.

Why first: wallet allocation and withdrawal reservation alter the schema. Brand tokens alter every screen. Both are cheap to correct here and expensive to correct after broad implementation.

## Phase 1: prove identity, ownership, and money

Tasks: `A01` to `A05`, `W01` to `W03`, `W07`, `B04`, and the relevant part of `B05`.

Persist Better Auth, profile data, roles, account status, cash and bonus wallets, and the immutable ledger. Registration creates the profile and the `$1,000.00` cash credit once. Add route guards and server-side ownership checks. Put the real session and wallet balance into the branded responsive shell.

Checkpoint:

```text
Register → $1,000.00 cash → refresh → restart server → still $1,000.00
User route allowed → admin route denied → suspended user denied
```

Automated tests cover concurrent welcome-credit attempts, negative balances, ownership, and self-promotion. The checkpoint is reviewed in both desktop and phone layouts.

## Phase 2: complete the first vertical slice with the simulator

Tasks: `G01` to `G06`, `G09`, `P01`, the first pass of `P03`, `P05`, `P06`, and `M01` to `M02` at inspection depth.

Build the normalized provider boundary and a clearly labelled simulator. Sync a small representative catalogue into the same tables Drakon will use. Launch a simulated game, send normalized bet, win, loss, and refund operations through the production wallet use cases, then show the resulting history to the player and admin.

Checkpoint:

```text
Register/login → browse catalogue → launch simulated game
→ bet → win or lose → optional refund → balance and history update
→ identical callback retry changes nothing → admin sees the same records
```

This is the most important milestone. If it is clean, most remaining work is breadth rather than architectural risk.

## Phase 3: turn the proving slice into the player MVP

Tasks: `A04`, `A06`, `G04`, `P01` to `P07`, `W04` to `W06`, and remaining shared components in `B05` and `B06`.

Complete account recovery and profile screens, lobby collections, search, filters, game-player behavior, wallet controls, demo top-ups, simulated withdrawals, transaction history, and bet history. Finish real loading, empty, error, unavailable, and mobile states as each screen lands.

Checkpoint:

- The player can complete every non-bonus step in the required end-to-end brief.
- Search and lobby remain usable with a catalogue of roughly 15,000 games.
- A provider timeout, unavailable game, broken image, stale wallet read, and empty history all produce useful UI.
- The flow passes keyboard, phone, tablet, and desktop review.

## Phase 4: bonuses and operational admin

Tasks: `O01` to `O06`, `M02` to `M06`.

Implement one complete promotional bonus path before adding all bonus configuration options. A player activates or receives an award, qualifying bets advance progress, and completion converts funds using the locked policy. Then expose the required user, game, bonus, transaction, adjustment, and withdrawal controls in admin.

Checkpoint:

```text
Admin creates offer → user receives it → eligible bet advances progress
→ excluded bet does not → completion converts once → history explains each movement
```

An ordinary user cannot reach or call any admin operation. Every admin mutation records its actor and reason.

## Phase 5: port and prove Drakon

Tasks: `G07`, `G08`, and `G10`.

Port the verified behavior from Greenbear V0 behind the provider contract. Keep V0's authentication, token refresh, `only_demo` handling, launch-error detection, request limits, timing-safe callback checks, and dashboard probe exception. Replace the in-memory wallet with the shared persistent gameplay use cases.

Work that does not require the approved agent can start earlier. Live proof waits for credentials.

Checkpoint:

```text
Drakon auth → catalogue sync → supported game launch → Bearbet player identity
→ provider bet and settlement callback → persistent wallet and history update
```

Store redacted request IDs, timestamps, responses, and screenshots. A successful catalogue call or a URL ending at `/game-error` does not pass this gate.

## Phase 6: hardening, final polish, and delivery

Tasks: `R01` to `R09`, plus `B06` on every route.

Add targeted rate limits, structured logs, secure headers, health checks, clean-install tests, production deployment, seed accounts, and handover notes. Run one dedicated visual pass across the whole product after feature work stops changing layouts.

Checkpoint:

- A fresh environment installs, migrates, seeds, builds, and starts from the written instructions.
- The reviewer journey works without developer intervention.
- The interface has consistent spacing, typography, artwork treatment, feedback, and motion on target viewports.
- Secrets do not appear in browser bundles, logs, screenshots, or repository history.
- The handover distinguishes simulated proof, V0 findings, and current live Drakon proof precisely.

## Suggested first implementation batch

The next coding batch should stop after Phase 0. Its concrete order is:

1. Answer and record the six domain decisions.
2. Repair scripts, Biome, typecheck, and baseline checks.
3. Establish the simplified `src/server`, `src/components`, and `src/lib` boundaries while moving only existing files.
4. Add environment validation and test setup.
5. Review the supplied logo assets and build the brand specimen.
6. Draft the first Drizzle schema and migration only after the money examples agree with it.

That pause is worth keeping. It gives us one deliberate schema review and one visual review before auth and wallet implementation make either direction costly to change.

## Current known blockers

- The approved Drakon agent credentials have not arrived. The simulator prevents this from blocking Phases 0 to 4.
- The logo assets are not present in the current Bearbet repository. They are needed for `B01` and the final type choice.
- The Better Auth route reference is `/Users/manasseh/Projects/work/tanstarter`. Its shared session query, pathless guest/auth layouts, cookie-cached middleware, and fresh-session middleware are useful patterns; its package versions, file placement, and generated schema should not be copied wholesale.
- `npm run check` currently fails on starter formatting and lint diagnostics. `npm run build` passes.
