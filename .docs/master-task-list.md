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

An administrator must be able to inspect and manage users, virtual balances, games, bonuses, gameplay operations, and simulated withdrawals. Live Drakon completion requires a provider-originated bet and settlement to update the same persistent wallet used by the simulator.

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
- [x] **C10. Provider boundary.** Fixture and Drakon adapters implement the normalized catalogue and launch contract. Drakon authentication, token refresh, fun-mode checks, timeouts, and unavailable-game detection have focused tests.
- [x] **C11. Drakon callback boundary.** The route authenticates callbacks, limits request size, validates and normalizes supported methods, accepts dashboard probes, and dispatches reads and financial operations to their owning domains.
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
- [x] **P09. Build unified player history.** Combine ledger activity and gameplay activity in one route with views or filters for transactions, bets, wins, refunds, wallet bucket, operation type, and date. Keep the immutable ledger and gameplay records as the sources of truth.
- [ ] **P10. Verify the wallet journey.** Prove that duplicate clicks credit once, invalid amounts fail, over-withdrawal fails, and every successful action refreshes the shell and history.

### 3. Catalogue at product scale

- [~] **P11. Move catalogue filtering to PostgreSQL.** The current lobby searches and filters a complete client-side result. Add indexed, paginated reads for name, content provider, category, availability, and local curation so roughly 15,000 games remain usable.
- [~] **P12. Finish lobby collections and URL state.** The lobby has top picks, search, categories, result loading, errors, and empty states. Add persisted featured, popular, and new collections, provider filtering, result counts, clear-all, and useful URL-backed state.
- [ ] **P13. Handle catalogue edge cases.** Verify broken artwork, unavailable games, empty sync results, slow reads, keyboard use, and mobile layouts.

### 4. Playable simulator journey

- [~] **P14. Implement launch orchestration and persistence.** The BearBet demo authenticates the player, resolves the persisted game, checks availability and playable balance, and records a retry-safe session. The provider launch branch still needs to call the configured external provider.
- [~] **P15. Build the game player.** Authenticated game cards open the BearBet demo player with launch, active-session restoration, play, error, close, wallet refresh, and session-summary states. External provider URL, full-screen, and close behavior remain.
- [x] **P16. Expose deterministic simulator gameplay.** Authenticated browser functions run server-resolved Lucky Number outcomes through the production gameplay, bonus, wallet, and ledger services. Provider-originated refunds are deferred until the live callback contract is known.
- [x] **P17. Build bet history.** The existing History route now uses its Bets tab for one row per persisted game round. It shows the game, provider, friendly reference, outcome, stake, return or refund, net result, date, and pagination while All remains the complete wallet-operation trail.
- [x] **P18. Verify the simulator journey.** The signed-in browser proof covers launch, active-session refresh, win and loss settlement, live wallet updates, round-level history, invalid stakes, and duplicate-click protection. Provider-originated refund proof is deferred until the live callback contract is known.

### 5. Bonus journey

- [ ] **P19. Add player bonus reads and activation.** Return available definitions and the current player's awards. Authenticate activation and keep eligibility decisions on the server.
- [ ] **P20. Build the bonus page.** Replace the placeholder with offers, the active award, required and completed wagering, remaining amount, percentage, expiry, status, and plain-language rejection messages.
- [ ] **P21. Verify the player bonus flow.** Start with a seeded or service-created offer. A player activates it, eligible bonus-funded bets advance progress, excluded bets do not, and completion converts once with ledger evidence. The administrator-created offer joins this proof in A05.

### 6. Account completion

- [ ] **P22. Build profile reads and safe edits.** Show personal details, status, registration date, currency, and balances. Never expose role or status as player-controlled fields.
- [ ] **P23. Complete password flows.** Add forgot-password, reset-password, and fresh-session password change. Local preview or clearly simulated email delivery is acceptable.
- [ ] **P24. Verify account lifecycle.** Cover refresh, restart persistence, reset token behavior, password change session handling, and suspended account behavior.

### 7. Administration

- [ ] **A01. Add an administrator route group and overview.** Repeat the role check in every server function. Show useful operational counts and recent activity without real-money claims.
- [ ] **A02. Build user management.** Search users, inspect profile and wallet state, suspend or activate accounts, and assign a bonus.
- [ ] **A03. Add audited balance adjustments.** Require actor, target, amount, and reason. Record before and after balances through the existing wallet operation and ledger model.
- [ ] **A04. Build game management.** Sync the catalogue, inspect games, enable or disable them, set categories, and manage featured, popular, and new curation without losing local edits during sync.
- [ ] **A05. Build bonus management.** Create, edit, activate, and deactivate definitions with clear rules for existing awards.
- [ ] **A06. Build operations management.** Inspect wallet and gameplay operations and approve or reject simulated withdrawals.
- [ ] **A07. Persist and verify the admin audit trail.** Record actor, target, action, reason, and time for every admin mutation. Direct server calls must enforce the same policy as the UI.

### 8. Live Drakon proof

- [~] **D01. Complete the live launch path.** The adapter behavior has tests, but Bearbet still needs launch orchestration tied to persisted game sessions and the player UI.
- [~] **D02. Verify the callback route against Drakon.** Local contract tests pass. Capture redacted evidence from real dashboard probes and financial callbacks.
- [ ] **D03. Prove a provider-originated money movement.** Authenticate, synchronize the catalogue, launch a supported game, identify the Bearbet player, receive a bet and settlement, and update the persistent wallet and history.
- [ ] **D04. Resolve approved agent access.** `BLOCKED` until the required Drakon credentials arrive. This blocks only live proof, not the simulator-backed MVP.

### 9. Release and handover

- [ ] **R01. Add repeatable seed and reset commands.** Create known player, administrator, wallet, bonus, and fixture catalogue state. Document reviewer credentials and reset behavior.
- [~] **R02. Finish abuse protection.** Better Auth has database-backed limits for registration and login. Add targeted limits for password reset, launch, top-up, withdrawal, and callbacks without breaking provider retries.
- [ ] **R03. Add structured redacted logs.** Cover authentication, launches, callbacks, wallet changes, bonuses, admin actions, latency, and failures without storing credentials or sensitive payloads.
- [ ] **R04. Harden browser and response behavior.** Add secure headers, a game-compatible frame policy, CSRF protection where needed, no-store wallet responses, and safe error mapping.
- [ ] **R05. Add health and readiness checks.** Separate process health from database and provider readiness without leaking configuration.
- [ ] **R06. Add critical end-to-end coverage.** Automate the reviewer journey and the main admin flow against a known database state.
- [ ] **R07. Run release checks from a clean install.** Verify migrations, build, typecheck, Biome, unit and integration tests, and critical end-to-end tests.
- [ ] **R08. Complete visual and accessibility QA.** Check 375, 768, 1280, and 1440 pixel widths, keyboard use, focus order, contrast, labels, reduced motion, layout shift, and broken artwork.
- [ ] **R09. Deploy with persistent PostgreSQL and production secrets.** Apply migrations, seed the reviewer state, configure the callback URL, and verify restart persistence.
- [ ] **R10. Prepare reviewer evidence.** Document setup, demo credentials, simulator controls, provider status, known limits, and the exact review flow. Capture polished desktop and mobile screenshots plus a short demo.

## Deferred until after the MVP

- [ ] Favourites and recently played games.
- [ ] Notifications and advanced catalogue filters.
- [ ] Two-factor authentication and player limits.
- [ ] VIP, cashback, referral, and loyalty systems.
- [ ] Multi-currency conversion or additional wallet currencies.
- [ ] Broader analytics and content-management tools.
