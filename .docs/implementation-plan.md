# Bearbet implementation plan

Bearbet has finished its main domain-engine phase. The next phase turns those services into complete player and administrator journeys. New work should ship as vertical slices that connect a route, browser-safe contract, authenticated server function, domain service, persistence, interface states, and focused proof.

`master-task-list.md` is the active checklist. This file records delivery order, dependencies, and checkpoints.

## Current delivery phases

This is the current administration and release sequence. Update this section when a phase changes status. The task checklist remains the detailed source for individual items.

- **Phase 1, shared admin foundations, complete.** TanStack admin table primitives, responsive states, URL query contracts, cursor conventions, password recovery, password reset, password change, and the local reset-email preview are in place.
- **Phase 2, users, complete.** Admin user queries, URL-backed filters and sorting, responsive users UI, detail actions, wallet adjustments, bonus assignment, fresh-session authorization, session revocation, and transaction-scoped audits are implemented and tested.
- **Phase 3, withdrawals and operations, complete.** Admin withdrawal projections, offset-paginated review queue, cursor-paginated wallet/gameplay/withdrawal/audit activity, responsive review controls, and URL-backed operational filters are implemented and tested on top of the audited review mutation. The UI closeout puts search first in the Users, Withdrawals, and Activity toolbars and uses input-sized search icons throughout.
- **Phase 4, games, complete.** The admin Games route now syncs the provider catalogue, filters and paginates the local catalogue, and applies reason-confirmed audited enable/disable, featured, popular, and new curation changes while preserving local fields during sync. Provider categories remain catalogue-owned.
- **Phase 5, bonuses, complete.** The admin Bonuses route lists, creates, edits, activates, and deactivates audited definitions, supports managed public thumbnails, and preserves the rules snapshotted into existing awards.
- **Phase 6, live overview and player gaps, current.** The administrator overview is live; finish profile reads and edits and lifecycle/access-boundary proof.
- **Phase 7, release gate, final.** Complete rate limits, redacted logs, secure headers, health checks, clean-install verification, accessibility checks, and reviewer evidence.

The Phase 3 foundation and UI closeout, the Phase 4 game-management slice, and the Phase 5 bonus-definition and thumbnail slice are complete and verified. The next slice is the live admin overview; remaining player profile and access-boundary proof stays in the verification queue.

## Where the project stands

### Working product pieces

- Guests can browse a branded casino lobby and open registration or login.
- Players can register with the required profile fields, receive `$1,000.00` in virtual cash once, sign in with email or username, retain a database-backed session, and sign out.
- Signed-in players can open the Wallet to read persisted playable, cash, bonus, and reserved balances. They can add one of the supported demo amounts, request a withdrawal, inspect pending reservations, and review recent ledger activity. Successful money actions refresh the shared wallet query and publish an app-level toast.
- Signed-in players can open History to review paginated wallet operations as one row per transaction. A category view selector and URL-backed bucket, operation, period, and sort filters query the immutable ledger and include gameplay references where available; operation filters support multiple selections and advanced date filtering remains deferred.
- Signed-in players can browse the synchronized catalogue with client-side search and category filters.
- Signed-in players can favorite games, see launch-time Recently played items, and use Favorites and Recently played as prioritized lobby collections with URL-backed filters.
- The responsive shell has desktop navigation, a mobile drawer, a persistent playable balance with cash and bonus detail, account controls, loading and wallet retry states, catalogue error recovery, and artwork fallbacks.
- PostgreSQL stores Better Auth identity, player profiles, wallets, wallet operations, immutable ledger entries, withdrawals, bonus definitions and awards, games, sessions, rounds, and provider operations.
- The wallet engine performs exact, atomic, retry-safe movements across cash, bonus, and reserved cash.
- The bonus engine handles activation, eligibility, wagering progress, completion, conversion, refund effects, expiry, exhaustion, and cancellation.
- The gameplay engine handles bets, wins, losses, and refunds through the same wallet and bonus services used by the rest of the application.
- The deterministic fixture runner exercises the production gameplay, bonus, wallet, and ledger services. It is the canonical BearBet money demonstration. The BigBang adapter provides the genuine playable-provider path; its authenticated bridge persists a provider baseline and reconciles only the final session delta at explicit close.
- Drakon was investigated and is no longer an active delivery dependency. Its adapter, callback route, tests, and findings remain as historical evidence only; no release milestone depends on a playable Drakon session.
- The configured BigBang sandbox catalogue has been synchronized into PostgreSQL. Authenticated game cards can open a signed BigBang Standard session, preserve the provider-managed balance baseline, and reconcile only the final session delta at explicit close.
- Catalogue synchronization persists provider data and preserves Bearbet-owned availability and curation fields.
- The protected admin shell and users slice are live. Admin users can search and filter accounts, inspect player and wallet projections, suspend or activate accounts, adjust cash, and assign bonuses with reasons and audit evidence.
- The admin Games route is live. Administrators can sync the provider catalogue, search and filter by provider, availability, status, and curation, edit local curation fields with reason-confirmed audit entries, and preserve local curation fields across syncs. Provider category metadata is read-only and refreshed from the catalogue.
- The admin Bonuses route is live. Administrators can search and filter definitions, create and edit future-offer rules, activate or deactivate definitions with a reason, and inspect stable codes and eligibility while issued awards retain their snapshots.
- Bonus definitions now support administrator-managed public thumbnails. The upload token route authenticates a fresh administrator, delegates Vercel Blob policy to the blob-storage infrastructure adapter, and stores only the resulting normalized URL in PostgreSQL for admin and player rendering.
- Better Auth owns password recovery and password change. Development logs a local reset-email preview when Resend is not configured.

### The current gap

The player wallet, game, history, and bonus journeys are connected to the domain services. Access-boundary and full journey tests still need to prove cross-user rejection, suspended-player rejection, duplicate-click behavior, failed over-withdrawals, password lifecycle behavior, and refresh persistence. Profile reads and safe edits are still pending.

The admin shell, shared table foundation, password security flows, users slice, withdrawals/operations slice, Games slice, bonus-definition slice, and live overview are complete. The withdrawal queue returns explicit player, wallet, reviewer, and decision projections. Activity reads cover immutable wallet operations, provider gameplay operations, withdrawal history, and admin audit entries with cursor pagination. Admin filter toolbars now use a consistent search-first order with compact search affordances, and the admin page headings use the standard bold text treatment with tighter header spacing. The provider decision is now closed: the fixture simulator is the wallet and ledger source of truth, while BigBang supplies genuine playable sessions. Drakon's failed launch behavior is retained as historical evidence, not as a current blocker.

A reviewer can now drive top-ups and withdrawal reservations from the Wallet, manage users, review pending withdrawals, curate the provider game catalogue, manage bonus definitions, inspect the resulting wallet, withdrawal, gameplay, and audit activity, and open a live operational overview from the admin portal. The next reviewer-visible outcome is profile completion and broader access-boundary proof.

### Agreed delivery direction

The original player-first order has delivered the wallet, playable fixture, history, bonus, game catalogue, player collection, BigBang playable-session, and admin bonus-management journeys. The remaining work now follows the current delivery phases above: build the live overview and remaining player gaps, then complete release hardening. Promotions and VIP remain honest unavailable states until a later scope defines them.

## Delivery rules

1. Build one visible journey at a time. A backend-only addition is incomplete when the task promises a player or administrator outcome.
2. Browser request schemas contain only caller-controlled fields. Server functions add player IDs, roles, balances, and audit data from trusted state.
3. Every protected server function authenticates the session and checks player status, ownership, or administrator role. Route guards only manage navigation.
4. Components call TanStack server functions. Domain services keep business rules and call Drizzle directly.
5. The wallet and immutable ledger remain the only money record. History screens read those records instead of introducing presentation-specific transaction tables.
6. The fixture provider and BigBang use the same normalized catalogue and launch boundary. The fixture remains the authoritative per-round wallet demonstration; BigBang's sandbox balance is reconciled only at explicit session close. Drakon is retained only for historical adapter and callback evidence.
7. Each slice includes loading, empty, error, disabled, unavailable, keyboard, mobile, and reduced-motion behavior that applies to it.
8. Finish the focused tests first, then run the full repository checks, inspect the diff, commit, and push the atomic task.

## Stage 1: authenticated wallet experience

This feature is in progress.

The `_app`, `_player`, `_guest`, and `_admin` route boundaries are in place. Guest and player guards preserve safe internal destinations, and signed-in users leave authentication routes. Browser-safe top-up and withdrawal schemas reject trusted fields. Authenticated server functions expose the current wallet, demo top-up, withdrawal request, pending withdrawals, and recent ledger entries. The server derives the player ID from a fresh active session. `/wallet` uses those functions for persisted balances, retryable reads, demo top-ups, withdrawal reservations, pending withdrawals, recent activity, disabled submission states, error feedback, and success toasts.

The app shell now shows cash, bonus, and playable balance through the existing wallet query key. `/history` is the unified home for wallet operations, with pagination, category views, URL-backed filters, and gameplay references. Finish the stage with access tests and one repeatable wallet journey that proves successful mutations refresh every visible balance and history view.

Checkpoint:

```text
Register -> receive $1,000.00 -> refresh and retain the balance
-> top up once under duplicate clicks -> see the ledger entry
-> request a withdrawal -> cash becomes reserved
-> another user cannot read or mutate the wallet
```

This stage delivers tasks P01 through P10 in `master-task-list.md`.

## Stage 2: playable simulator and BigBang journey

The first-party BearBet demo path authenticates an active player, resolves a persisted enabled game, checks playable balance, records a retry-safe session, and wires authenticated game cards to the simulator. The BigBang branch calls the configured provider, creates the provider player, persists the signed launch result and balance baseline, and returns the provider sandbox player UI.

Authenticated browser functions now resolve Lucky Number wins and losses on the server and run them through the existing gameplay service. The interface labels the experience as a BearBet demo and refreshes wallet and transaction history after each round. The Bets view groups persisted operations into round results. Starting the same game resumes the player's active session, including after refresh, while concurrent launches serialize so they cannot create competing sessions. Refund behavior remains implemented in the shared gameplay engine; BigBang's sandbox callbacks are capture-only, so provider-originated per-round refund proof is outside the active MVP path.

The BigBang sandbox path deliberately does not treat absent Standard-game
callbacks as BearBet bet/win events. It takes the provider-account balance
baseline immediately after launch, allows one active sandbox session at a time,
and, when sandbox reconciliation is enabled, records only the final minus
launch delta through the labelled idempotent wallet operation. The fixture
simulator remains the authoritative demonstration for per-round wallet, bonus,
ledger, and history behavior.

Bet history now reads game rounds, provider operations, wallet operations, and ledger movements. It groups each round without creating a duplicate history table and calculates net results from the immutable money evidence.

Checkpoint:

```text
Sign in -> search a persisted catalogue -> launch a fixture game
-> place a server-resolved bet -> settle as win or loss
-> wallet, transaction history, and bet history update once
-> refresh and retain the active session
-> retrying the same operation changes nothing
```

This stage delivers tasks P11 through P18.

## Stage 3: visible bonus journey

The Bonuses route has a responsive promotional hero, recurring drop countdown, and persisted Bear Hug, Honey Pot, and Lucky Paw offers using the supplied BearBet artwork. Authenticated server functions return definitions and the current award and activate one offer at a time. The page explains the rules before activation, locks competing offers, and discloses the active award's balance, completed and remaining wagering, percentage, and expiry. Deposit-match activation selects the latest unused qualifying demo top-up on the server.

The fixture game player makes bonus behavior visible. Eligible bonus-funded bets advance progress. Excluded bets use cash and leave progress unchanged. Completion converts the remaining bonus once, returns that transition to the player, and opens a dismissible completion celebration with a wallet link. Transaction history explains the conversion, while completed and expired offer cards retain their outcome.

Checkpoint:

```text
Seed a known offer -> player activates it
-> eligible fixture bet advances progress -> excluded bet does not
-> completion converts once -> wallet and ledger agree
```

This stage delivers tasks P19 through P21. It depends on wallet and gameplay. Administrator-authored offers join the same flow in Stage 4.

## Stage 4: account, catalogue completion, and administration

The player account work is split. Password recovery and password change are complete through Better Auth, while profile reads and safe edits and browser lifecycle proof remain in the task list. Favorites and recently played now have authenticated reads/writes, launch-time recent projections, lobby collections, URL-backed priority filters, empty states, and card-level favorite controls.

The admin route group, fresh-session checks, transaction-scoped authorization, audit writer, shared table primitives, users slice, operations slice, game-management slice, and bonus-definition slice are complete. The Games route preserves local availability and curation fields during provider sync, and its player-facing admin controls now use the standard page-title treatment and compact header rhythm. Continue administration in this order:

1. **Phase 5, bonuses, complete.** The audited definition list, create, edit, activate, and deactivate operations preserve snapshotted rules on existing player awards.
2. **Phase 6, live overview and player gaps.** The overview now reads live operational counts and recent events; finish profile reads and edits and access-boundary proof.

The overview must report useful operational counts and recent events, not invented gambling revenue.

Checkpoint:

```text
Admin finds a player -> changes status or balance with a reason
-> manages one game and one bonus -> reviews a withdrawal
-> audit records identify actor, target, action, reason, and time
-> a normal player cannot call any of the same mutations
```

This stage delivers tasks P22 through P24 and A01 through A07.

## Stage 5: hybrid provider path

The supported playable-provider path is now complete. The deterministic fixture
simulator is the canonical, fully reconcilable BearBet wallet demonstration. The
authenticated BigBang bridge supplies a genuine playable Standard-game session,
stores the provider-account baseline after launch, allows one active sandbox
session at a time, and applies only `final - launch snapshot` as an idempotent,
labelled `provider_reconciliation` operation when the player explicitly closes
the session. Missing BigBang Standard callbacks are not treated as per-round
BearBet bet, win, or refund events.

Drakon launch and callback work is closed as a historical investigation. The
adapter and callback tests remain useful evidence, but repeated playable launches
ended at the provider's `/game-error` page, so Drakon is not part of the active
release path and no further live-provider milestone depends on it.

Checkpoint:

```text
Sign in -> launch a persisted BigBang game
-> play in the provider sandbox -> close explicitly
-> reconcile only the final session delta once
-> use the fixture simulator for per-round wallet, bonus, ledger, and history proof
```

## Stage 6: release and handover

Add repeatable seed and reset commands before writing end-to-end tests so every reviewer journey starts from known data. Finish targeted rate limits, structured redacted logs, browser and response hardening, and separate health and readiness checks.

Run critical player and administrator journeys from a clean install. Then complete responsive, keyboard, focus, contrast, reduced-motion, layout-shift, and artwork-failure checks. Deploy against persistent PostgreSQL, verify restart behavior, and capture the review evidence.

Checkpoint:

```text
Clean install -> migrate -> seed -> run repository checks
-> complete player and admin journeys on desktop and mobile
-> restart without losing identity, wallet, gameplay, or bonus state
-> follow the handover without private setup knowledge
```

This stage delivers R01 through R10.

## Scope kept out of the MVP

Notifications, advanced filters, two-factor authentication, player limits, VIP, cashback, referrals, loyalty, multi-currency conversion, and broad analytics remain deferred. Promotions and VIP may keep honest unavailable states until a later scope explicitly brings them in.

## Immediate task

Phase 5 is complete: the admin Bonuses route manages audited, future-facing bonus definitions, uploads public thumbnails through the blob-storage infrastructure boundary, and preserves snapshotted rules on issued awards. Phase 4 remains complete: the admin Games route syncs and manages the provider catalogue with audited local curation, while authenticated players can favorite games and see prioritized Favorites and Recently played collections. The hybrid simulator plus BigBang provider path is the active playable strategy; Drakon is archival evidence only. The Users, Withdrawals, and Activity toolbars put search first with input-sized search icons, and the admin page headings now share the Overview typography and tighter spacing.

Keep P04, P10, P22, and P24 in the verification queue. They are important release evidence, but they do not change the next implementation slice.
