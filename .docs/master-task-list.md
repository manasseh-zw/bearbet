# Bearbet master task list

This is the delivery contract. Check an item only when its verification passes. P0 is the job-submission MVP. P1 stays out of the critical path.

## MVP cut line

The MVP is complete when a seeded reviewer can register, receive virtual funds, browse and search a real synchronized catalogue, launch a game through the configured provider, see bets and settlements update the wallet once, complete one bonus wagering flow, inspect history, and use the core admin controls on desktop and mobile.

The simulator keeps development and the demo deterministic. It must be clearly labelled. Live Drakon integration is complete only after a provider-originated operation updates a persistent Bearbet wallet.

## 0. Planning and foundation

- [x] **F01. Lock the six domain decisions in `architecture.md`.** Record stake allocation, reported balance, bonus conversion, currency scope, admin bootstrap, and withdrawal reservation. Verify with worked bet, win, refund, bonus, and withdrawal examples.
- [x] **F02. Establish the source structure.** Move database and auth modules under `src/server`, keep UI under `src/components`, add folders only when needed, and enforce server-only imports. Verify with a production build.
- [x] **F03. Repair the quality baseline.** Add `typecheck` and `test` scripts, align Biome's schema version, clear current lint failures, and keep build, check, and tests green.
- [x] **F04. Validate environment configuration.** Parse required server variables once, fail with useful messages, add a secret-free example file, and keep provider credentials out of browser bundles.
- [ ] **F05. Define seed and reset behavior.** Create repeatable user, admin, wallet, bonus, and catalogue seed data. Document how a reviewer starts from a known state.

## 1. Brand and product shell

- [x] **B01. Inventory the supplied brand assets.** Choose the canonical bear mark, wordmark variants, favicon, and permitted image formats. Verify sharp rendering on dark and light browser chrome.
- [x] **B02. Establish the Bearbet visual tokens.** Replace the starter theme with the charcoal shell, graphite panel, honey accent, cream text, and shared radius and border tokens.
- [x] **B03. Self-host the selected typography.** Use Geist for product UI and River Adventurer for the Bearbet lockup without relying on a remote font request.
- [ ] **B04. Build the responsive app shell.** Add desktop side navigation, compact header, wallet control, account access, and mobile navigation. Verify at 375, 768, 1280, and 1440 pixel widths.
- [ ] **B05. Build the core component language.** Cover buttons, fields, dialogs, menus, tabs, cards, skeletons, alerts, toasts, tables, and empty states with accessible keyboard and focus behavior.
- [ ] **B06. Add a route-level presentation checklist.** Every completed screen gets desktop, mobile, loading, empty, error, focus, and reduced-motion checks.

## 2. Identity and access

- [ ] **A01. Persist Better Auth data in Postgres.** Add auth tables and migrations, secure cookies, trusted origins, and session expiry. Verify registration, login, refresh, and logout across a server restart.
- [x] **A02. Model the Bearbet profile.** Store username, name, date of birth, country, currency, status, role, and registration date with correct uniqueness and validation.
- [x] **A03. Complete registration.** Validate all brief fields, block underage dates by the chosen policy, create the profile and initial cash credit atomically, and prevent duplicate credit on retries.
- [ ] **A04. Complete account access.** Build login, logout, forgot-password, reset-password, and change-password flows. A local email preview or clearly simulated delivery is acceptable for the demo.
- [ ] **A05. Enforce route and use-case authorization.** Protect player and admin route groups, reject suspended users, scope reads by user ID, and repeat admin checks on the server.
- [ ] **A06. Build profile UI.** Show personal details, status, registration date, cash, bonus, and total balance. Allow safe profile edits without exposing role or status controls.
- [ ] **A07. Test access boundaries.** Prove a user cannot read another wallet, call admin mutations, self-promote, or continue after suspension.

## 3. Wallet and ledger

- [x] **W01. Implement the persistent money model.** Add cash and bonus wallets, immutable ledger entries, constraints, indexes, and integer minor-unit helpers.
- [x] **W02. Implement atomic wallet movements.** Lock or atomically update wallet rows, insert ledger evidence in the same transaction, and reject negative or overflowed balances.
- [x] **W03. Credit the welcome balance once.** Every new user receives exactly `$1,000.00` cash, including under registration retries and concurrent requests.
- [x] **W04. Add demo top-ups.** Support `$100`, `$500`, `$1,000`, and `$10,000` completed demo deposits with visible ledger entries.
- [x] **W05. Add simulated withdrawals.** Validate withdrawable cash, reserve it on request, and support pending, approved, and rejected outcomes without double spending.
- [ ] **W06. Add admin adjustments.** Admins can add or remove funds only with a reason. Record actor, target, amount, before and after balances.
- [x] **W07. Prove wallet invariants.** Test concurrent debits, insufficient funds, duplicate requests, exact cent precision, reversal, and immutable history.

## 4. Provider, catalogue, and gameplay

- [x] **G01. Define normalized provider contracts.** Cover catalogue sync, launch, bet, win, refund, errors, and callback responses without leaking Drakon shapes.
- [x] **G02. Build the simulated provider.** Supply representative games and deterministic bet, loss, win, and refund controls that call the production wallet use cases.
- [ ] **G03. Model and synchronize the catalogue.** Upsert providers and games, retain local status and curation, mark missing games unavailable, and record sync results.
- [ ] **G04. Build catalogue reads.** Add indexed search by name and provider, category filtering, featured, popular, and new collections with useful empty states.
- [ ] **G05. Build launch and session persistence.** Require an active user, validate game status and balance, record launch attempts, and expose a safe session result or useful error.
- [x] **G06. Implement gameplay operations.** Persist rounds, bets, wins, and refunds; update wallets atomically; store the original response; and reject fingerprint conflicts.
- [ ] **G07. Port Drakon adapter behavior from V0.** Preserve token caching, one refresh after authorization failure, timeouts, `only_demo`, safe errors, and `/game-error` detection.
- [ ] **G08. Build the authenticated Drakon callback route.** Enforce request-size limits, callback credentials, probe compatibility, indexed lookups, low-latency replies, and redacted logging.
- [x] **G09. Verify callback idempotency and refunds.** Cover identical retries, cross-type transaction IDs, ambiguous originals, double refunds, orphan wins, and dashboard probes.
- [ ] **G10. Complete live Drakon proof.** Authenticate, sync, launch an enabled game, identify the Bearbet player, receive a real bet and settlement, update the persistent wallet, and retain redacted evidence.

## 5. Player experience and history

- [ ] **P01. Build the casino home page.** Deliver branded hero or promotion space, category navigation, game rails, artwork fallbacks, provider labels, and fast responsive browsing.
- [ ] **P02. Build search and filters.** Support debounced search, provider and category filters, URL-backed state where useful, result counts, clear-all, and no-result recovery.
- [ ] **P03. Build the game player.** Add launch loading, safe iframe or new-tab handling, full-screen controls where supported, wallet refresh, close behavior, and provider error recovery.
- [ ] **P04. Build wallet UI.** Present cash, bonus, total, top-up, withdrawal request, pending state, and virtual-funds wording with no suggestion of real payments.
- [ ] **P05. Build transaction history.** Show wallet kind, type, amount, status, date, and useful filters with pagination.
- [ ] **P06. Build bet history.** Group or list round activity with game, bet, win, net result, date, round, provider references, and status.
- [ ] **P07. Verify the full player journey.** Test registration through history on desktop and a small phone viewport with empty, slow, and provider-failure states.

## 6. Bonuses and wagering

- [x] **O01. Model bonus definitions and awards.** Support welcome, simulated deposit, and promotional types, amounts, multiplier, required wager, expiry, eligibility, minimum deposit, maximum award, and active state.
- [x] **O02. Implement award eligibility and activation.** Prevent duplicate or ineligible awards and record bonus credits in the ledger.
- [x] **O03. Advance wagering on qualifying bets.** Apply eligible-game rules and the locked stake-allocation policy in the same transaction as the bet.
- [x] **O04. Complete, expire, and convert awards.** Make each transition idempotent and create ledger entries for conversion or forfeiture.
- [ ] **O05. Build bonus UI.** Show available offers, active awards, required, completed, remaining, percentage, expiry, status, and plain-language eligibility errors.
- [x] **O06. Prove bonus rules.** Test partial progress, excluded games, refunds, expiry, duplicate callbacks, concurrent bets, maximum awards, and exact conversion.

## 7. Admin

- [ ] **M01. Build the admin overview.** Show useful counts and recent operational activity without pretending the demo has real-money analytics.
- [ ] **M02. Build user management.** Search users, inspect profile and wallets, suspend or activate, adjust funds, and assign a bonus.
- [ ] **M03. Build game management.** Inspect synced games, enable or disable, categorize, feature, and unfeature while preserving local edits across syncs.
- [ ] **M04. Build bonus management.** Create, edit, activate, and deactivate definitions with validation and affected-award rules.
- [ ] **M05. Build operations management.** Inspect gameplay and wallet transactions, filter them, and approve or reject withdrawals.
- [ ] **M06. Audit admin actions.** Log actor, target, action, reason, and time for every mutation. Verify direct calls obey the same policy as the UI.

## 8. Security, operations, and handover

- [ ] **R01. Add targeted rate limits.** Protect registration, login, password reset, launch, top-up, withdrawal, and callback abuse paths without breaking Drakon retries.
- [ ] **R02. Add structured operational logs.** Cover auth events, launches, callback results, wallet changes, bonuses, admin actions, latency, and errors with secret redaction.
- [ ] **R03. Harden response and browser behavior.** Add secure headers, frame policy compatible with selected games, CSRF protections where needed, no-store wallet responses, and safe error mapping.
- [ ] **R04. Add health and readiness checks.** Separate process health from database and provider readiness. Do not make public health checks leak configuration.
- [ ] **R05. Run automated release checks.** Build, typecheck, lint, unit, integration, migration, and critical end-to-end tests pass from a clean install.
- [ ] **R06. Run visual and accessibility QA.** Check target viewports, keyboard use, focus order, contrast, labels, layout shift, broken artwork, and reduced motion.
- [ ] **R07. Deploy with persistent Postgres and production secrets.** Apply migrations, seed reviewer accounts, configure callback URL, and verify restart persistence.
- [ ] **R08. Prepare the review handover.** Document setup, demo credentials, simulator controls, live-provider status, known limits, architecture choices, and the exact reviewer journey.
- [ ] **R09. Capture evidence.** Record polished screenshots and a short demo that proves player and admin flows, wallet idempotency, bonus progress, responsive behavior, and live Drakon status.

## P1 after the MVP

- [ ] Favourites and recently played.
- [ ] Notifications and advanced filters.
- [ ] Two-factor authentication and user limits.
- [ ] VIP, cashback, referrals, and loyalty.
- [ ] Multi-currency conversion or additional wallet currencies.
- [ ] Broader analytics and content-management tools.
