# Bearbet delivery task list

This file tracks the work that remains between the current repository and the Bearbet MVP. It is ordered by delivery, not by the original requirement categories. Completed foundations are recorded once and removed from the active queue.

`task-brief.md` remains the product contract. `architecture.md` and `domain-model.md` own technical and business decisions. `implementation-plan.md` explains how to deliver the tasks below.

## MVP cut line

The MVP is complete when a reviewer can use this flow on desktop and mobile:

```text
Register -> receive $1,000 virtual cash -> browse and search the catalogue
-> launch a game -> bet -> win, lose, or refund -> see wallet and history
-> activate a bonus -> complete wagering -> see the conversion
```

An administrator must be able to inspect and manage users, virtual balances, games, bonuses, gameplay operations, and simulated withdrawals. The playable-provider experience uses the authenticated BigBang bridge, while the deterministic fixture simulator remains the authoritative source of per-round wallet, bonus, ledger, and history evidence. Drakon is not part of the active MVP path.

## Status rules

- `[ ]` means no verified implementation exists.
- `[~]` means useful code exists, but the user-visible outcome or required proof is incomplete.
- `[x]` means the repository contains the implementation and focused automated proof where the rule is risky.
- Tasks marked `BLOCKED` need external access. They do not stop simulator-backed MVP work.

## Completed foundation

These capabilities are done and should not return to the active queue unless a later feature exposes a defect.

- [x] **C01. Project structure and quality baseline.** TanStack Start, PostgreSQL, Drizzle, validated environment configuration, server-only boundaries, build, typecheck, Biome, and Node tests are in place.
- [x] **C02. Bearbet identity model.** Better Auth persists users, accounts, sessions, verification data, database rate limits, username identity, and admin state. Bearbet stores a one-to-one player profile.
- [x] **C03. Registration provisioning.** Registration validates the full player input and provisions one player, one wallet, and one retry-safe `$1,000.00` virtual cash credit.
- [x] **C04. Login and session-aware shell.** Players can sign in with email or username, sign out, and see session-aware lobby and account controls.
- [x] **C05. Money policy and persistence.** Cash, bonus, and reserved cash use integer minor units. Wallet operations and immutable ledger entries move together in one database transaction.
- [x] **C06. Wallet operation engine.** Credits, debits, multi-bucket transfers, reversals, supported demo top-ups, idempotency fingerprints, underflow protection, and concurrent debit serialization are implemented and tested.
- [x] **C07. Withdrawal engine.** Requests reserve cash. Active administrators can approve or reject once, and rejection returns the reservation.
- [x] **C08. Bonus engine.** Definitions, awards, eligibility, one active award, wagering snapshots, progress, conversion, expiry, exhaustion, cancellation, and refund behavior are implemented and tested.
- [x] **C09. Gameplay money engine.** Sessions, rounds, bets, wins, losses, partial and full refunds, stake allocation, stored responses, conflicting fingerprints, callback retries, and suspended-player rejection are implemented and tested.
- [x] **C10. Provider boundary.** Fixture and BigBang adapters implement the active normalized catalogue and launch contract. BigBang also exposes its provider-player balance capability for the authenticated sandbox bridge. The Drakon adapter remains only as historical evidence and focused contract tests; it is not an active release dependency.
- [x] **C11. Historical Drakon callback boundary.** The retained route authenticates callbacks, limits request size, validates and normalizes supported methods, accepts dashboard probes, and dispatches reads and financial operations to their owning domains. Its live launch repeatedly ends at the provider's `/game-error` page, so this boundary is not used by the active playable path.
- [x] **C12. Persistent catalogue sync.** Explicit sync upserts provider games, preserves local controls, marks missing games unavailable, and can run from a script or an admin-protected server function.
- [x] **C13. Initial casino interface.** Bearbet branding, responsive desktop and mobile navigation, guest lobby, authenticated catalogue, game cards, artwork fallbacks, loading state, error recovery, search, and category filtering exist.

## Active delivery queue

### 1. Authenticated player boundary

- [x] **P01. Add the authenticated player route group.** Wallet, unified history, bonuses, profile, and game-player routes live below the pathless `_app/_player` layout. Guests return to their intended destination after authentication.
- [x] **P02. Complete the guest-route guard.** Signed-in users leave login and registration for the requested internal destination or the lobby. External redirect values are rejected.
- [~] **P03. Apply player authorization to browser-facing use cases.** Wallet server functions use fresh active-session middleware and derive the player ID from the session. Gameplay rejects suspended players. Apply the same policy to each remaining player server function as it is added.
- [ ] **P04. Prove access boundaries.** Test session persistence, logout, guest rejection, duplicate email and username behavior, suspension, cross-user reads, and failed self-promotion.

### 2. Wallet experience

The contracts, authenticated functions, main Wallet route, and unified History route are complete. The remaining slice is the shell balance and repeatable journey proof.

- [x] **P05. Add browser-safe wallet contracts.** Shared top-up and withdrawal schemas accept only caller-controlled amounts and idempotency keys. Player IDs, balances, actors, and audit data remain server-controlled.
- [x] **P06. Add authenticated wallet reads and mutations.** Authenticated TanStack server functions expose the current wallet overview, supported demo top-up, withdrawal request, pending withdrawals, and recent ledger entries. Every function derives the player ID from a fresh active session.
- [x] **P07. Put the wallet balance in the app shell.** The sidebar account control reads the shared wallet query, shows the persisted playable balance and currency beside a deterministic player avatar, and includes cash and bonus detail in its menu. Loading, retry, mobile, profile, funding, and logout behavior share the same control.
- [x] **P08. Build the wallet page.** The responsive page reads persisted balances, pending withdrawals, and recent ledger activity through the authenticated wallet query. Top-ups and withdrawal requests use shared schemas, stable in-flight idempotency keys, disabled submission states, server errors, post-mutation query refreshes, and app-level success toasts.
- [x] **P09. Build unified player history.** Combine ledger activity and gameplay activity in one route with a category view selector and filters for transactions, bets, wins, refunds, wallet bucket, operation type, period, and sort order. Operation and decision filters support multiple selections where the data shape allows it. Keep the immutable ledger and gameplay records as the sources of truth; advanced date filtering remains deferred.
- [ ] **P10. Verify the wallet journey.** Prove that duplicate clicks credit once, invalid amounts fail, over-withdrawal fails, and every successful action refreshes the shell and history.

### 3. Catalogue at product scale

- [x] **P11. Move catalogue filtering to PostgreSQL.** The casino and promotions views use validated, indexed, paginated PostgreSQL reads for name, content provider, category, availability, and local curation. Trigram matching handles partial names and common typing errors without sending the full catalogue to the browser.
- [~] **P12. Finish lobby collections and URL state.** Authenticated favorite reads/writes, launch-time recent projections, favorite card controls, collection counts, clear-all, and URL-backed Favorites/Recently played filters are complete. Explicit provider filtering and broader collection verification remain.
- [ ] **P13. Handle catalogue edge cases.** Verify broken artwork, unavailable games, empty sync results, slow reads, keyboard use, and mobile layouts.

### 4. Playable simulator journey

- [x] **P14. Implement launch orchestration and persistence.** Authenticated game cards resolve a persisted enabled game, check the BearBet wallet, restore active sessions, and either run the deterministic simulator or call the configured BigBang provider. BigBang launch metadata, provider player identity, balance baseline, and signed URL are persisted with the session.
- [x] **P15. Build the game player.** Authenticated game cards support the deterministic simulator and the BigBang provider sandbox iframe, with loading, error, active-session restoration, new-tab fallback, explicit close, wallet refresh, and provider reconciliation summary states.
- [x] **P16. Expose deterministic simulator gameplay.** Authenticated browser functions run server-resolved Lucky Number outcomes through the production gameplay, bonus, wallet, and ledger services. BigBang provider callbacks remain capture-only in the sandbox, so per-round provider refunds are outside the active MVP path.
- [x] **P17. Build bet history.** The existing History route now uses its Bets view for one row per persisted game round. It shows the game, provider, friendly reference, outcome, stake, return or refund, net result, date, and pagination while All remains the complete wallet-operation trail.
- [x] **P18. Verify the simulator journey.** The signed-in browser proof covers launch, active-session refresh, win and loss settlement, live wallet updates, round-level history, invalid stakes, and duplicate-click protection. BigBang close/reconciliation is a session-level provider-sandbox summary; absent provider callbacks are not treated as per-round financial proof, and provider-originated refund proof remains outside the active MVP path.

### 5. Bonus journey

- [x] **P19. Add player bonus reads and activation.** Authenticated reads return active definitions, claimed states, and the current award. Activation accepts only a definition and idempotency key; the server owns eligibility, deposit selection, award calculation, and wallet credit.
- [x] **P20. Build the bonus page.** The responsive BearBet campaign page reads persisted Bear Hug, Honey Pot, and Lucky Paw offers. It explains terms before activation, locks competing offers, and shows active-award balance, wagering progress, expiry, loading, empty, error, and rejection states.
- [x] **P21. Verify the player bonus flow.** A live player pass activated Bear Hug, advanced its `$100.00` target with eligible bonus-funded bets, completed it during settlement, converted the remaining `$220.00` once, and reconciled to the final wallet and ledger. Database tests cover excluded games, exact expiry, unsettled rounds, retry safety, and conversion. The administrator-created offer joins this proof in A05.

### 6. Account completion

- [ ] **P22. Build profile reads and safe edits.** Show personal details, status, registration date, currency, and balances. Never expose role or status as player-controlled fields.
- [x] **P23. Complete password flows.** Forgot-password and reset-password use Better Auth's single-use, expiring tokens with a server-only Resend transport, and the authenticated profile includes a current-password change flow that revokes other sessions. When Resend credentials are absent in development, the server logs a local reset-email preview with the recipient and reset URL.
- [~] **P24. Verify account lifecycle.** Password form contracts are covered; refresh, restart persistence, reset-token behavior, password-change session handling, and suspended-account behavior still need browser and integration proof.

### 7. Administration

- [x] **A01. Add an administrator route group and overview.** The protected `/admin` route group has a separate operations shell, admin navigation, authenticated operational counts, a live seven-day Recharts activity view, attention links, and a merged recent-event feed from wallet, gameplay, withdrawal, and bonus records.
- [x] **A02. Build user management.** Search users, inspect profile and wallet state, suspend or activate accounts, and assign a bonus. The admin users page uses URL-backed filters, a responsive table/card view, a detail sheet, and transaction-scoped mutation functions.
- [x] **A03. Add audited balance adjustments.** Require actor, target, amount, and reason. Record before and after balances through the existing wallet operation and ledger model, with idempotent retries and focused service tests.
- [x] **A04. Build game management.** The admin Games route syncs and paginates the provider catalogue, filters by search/provider/availability/status/curation, edits enabled state, featured, popular, and new flags through reason-confirmed audited mutations, preserves local curation edits during sync, treats provider category metadata as read-only, and exposes unavailable/artwork-fallback states.
- [x] **A05. Build bonus management.** Create, edit, activate, and deactivate definitions with audited mutations, stable definition codes, managed public thumbnails, and clear rules for existing awards.
- [x] **A06. Build operations management.** Inspect wallet and gameplay operations and approve or reject simulated withdrawals. The responsive withdrawal queue and read-only activity view selector use explicit projections, URL-backed single- and multi-select filters, offset queue pagination, and cursor activity pagination on top of the audited review mutation. Admin Users, Withdrawals, and Activity toolbars put search first and use input-sized search icons for a consistent filter layout.
- [~] **A07. Persist and verify the admin audit trail.** The audit schema and transaction-scoped writer now cover withdrawal decisions, with fresh-session and in-transaction admin authorization. Remaining admin mutation writers and broader verification coverage remain.

### 8. Historical Drakon investigation (retired)

Drakon is not an active delivery path. These closed items preserve the evidence
that led to the provider decision and prevent the failed launch behavior from
being mistaken for a current implementation blocker.

- [x] **D01. Evaluate the live launch path.** Adapter behavior, authentication, catalogue sync, and callback normalization were tested, but supported launches repeatedly returned the provider's `/game-error` page.
- [x] **D02. Verify the callback route against Drakon.** The generated `/api/drakon/webhook/:key/drakon_api` path reached BearBet and the dashboard probes passed, but no playable session or provider-originated gameplay callback was obtained.
- [x] **D03. Close the provider-originated money-movement proof.** Marked out of scope for the MVP because Drakon never produced a usable playable session; the fixture simulator owns this proof instead.
- [x] **D04. Retire Drakon from the release path.** Keep the adapter, route, tests, and findings for historical reference only. No active milestone requires provider-side Drakon enablement.

### 8a. BigBang sandbox proof

- [x] **B01. Prove a BigBang sandbox launch.** Catalogue, player creation, signed non-demo session, and playable iframe were verified on 2026-09-17. The temporary `/bigbang-sandbox` route creates a provider player token and a callback-enabled sandbox launch without using Bearbet authentication, PostgreSQL, or wallet funds.
- [x] **B02. Verify the BigBang seamless-wallet callback boundary.** The `user_data` and `balance_change` routes validate input, enforce a request-size limit, verify the documented HMAC, return the sandbox synthetic balance, and refuse live money changes. A browser-controlled non-demo sandbox spin changed BigBang's provider-held player balance but produced no wallet callback despite correctly saved RGS URLs. The absence is recorded as a provider sandbox limitation; the boundary remains capture-only.
- [x] **B03. Resolve BigBang financial event mapping for the MVP.** Standard games report net rounds while the current engine models separate bet, win, and refund evidence. The MVP therefore uses explicit session-level `final - launch snapshot` reconciliation through the authenticated bridge and does not infer provider-originated per-round financial operations without callbacks. When the sandbox has an active local bonus, the absolute session delta is also used as a synthetic wagering contribution so the bonus journey remains complete.
- [x] **B04. Build the authenticated hybrid sandbox bridge.** Link a BigBang provider player to the signed-in BearBet player, store the shared-account balance immediately after launch, serialize the sandbox to one active BigBang session, close and reconcile on explicit exit or page/session teardown, and apply only the idempotent `final - launch snapshot` delta through a labelled `provider_reconciliation` operation. BigBang launches also receive a return URL for provider-side exit handling. In the same transaction, advance or complete the active local bonus from that delta. The public throwaway launcher remains read-only, and the bridge does not invent provider bet, win, or refund events without callbacks.

### 9. Release and handover

- [x] **R01. Add repeatable seed and reset commands.** `auth:seed-admin` creates or promotes a credential account with the `admin` role and resets its password. `db:reset-review` clears player, wallet, gameplay, bonus, catalogue, audit, and non-admin auth state in one guarded transaction while preserving the administrator.
- [~] **R02. Finish abuse protection.** Better Auth has database-backed limits for registration and login. Add targeted limits for password reset, launch, top-up, withdrawal, and callbacks without breaking provider retries.
- [ ] **R03. Add structured redacted logs.** Cover authentication, launches, callbacks, wallet changes, bonuses, admin actions, latency, and failures without storing credentials or sensitive payloads.
- [ ] **R04. Harden browser and response behavior.** Add secure headers, a game-compatible frame policy, CSRF protection where needed, no-store wallet responses, and safe error mapping.
- [ ] **R05. Add health and readiness checks.** Separate process health from database and provider readiness without leaking configuration.
- [ ] **R06. Add critical end-to-end coverage.** Automate the reviewer journey and the main admin flow against a known database state.
- [ ] **R07. Run release checks from a clean install.** Verify migrations, build, typecheck, Biome, unit and integration tests, and critical end-to-end tests.
- [ ] **R08. Complete visual and accessibility QA.** Check 375, 768, 1280, and 1440 pixel widths, keyboard use, focus order, contrast, labels, reduced motion, layout shift, and broken artwork.
- [~] **R09. Deploy with persistent PostgreSQL and production secrets.** The `bearbet` Vercel project is live at `https://bearbet.vercel.app` with a public Blob store, a Neon PostgreSQL project, applied migrations, BigBang sandbox credentials, and a seeded administrator. Restart persistence and the remaining release-gate checks still need proof.
- [ ] **R10. Prepare reviewer evidence.** Document setup, demo credentials, simulator controls, provider status, known limits, and the exact review flow. Capture polished desktop and mobile screenshots plus a short demo.

## Deferred until after the MVP

- [x] Favourites and recently played games.
- [ ] Notifications and advanced catalogue filters.
- [ ] Two-factor authentication and player limits.
- [ ] VIP, cashback, referral, and loyalty systems.
- [ ] Multi-currency conversion or additional wallet currencies.
- [ ] Broader analytics and content-management tools.
