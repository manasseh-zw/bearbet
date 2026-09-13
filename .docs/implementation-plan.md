# Bearbet implementation plan

Bearbet has finished its main domain-engine phase. The next phase turns those services into complete player and administrator journeys. New work should ship as vertical slices that connect a route, browser-safe contract, authenticated server function, domain service, persistence, interface states, and focused proof.

`master-task-list.md` is the active checklist. This file records delivery order, dependencies, and checkpoints.

## Where the project stands

### Working product pieces

- Guests can browse a branded casino lobby and open registration or login.
- Players can register with the required profile fields, receive `$1,000.00` in virtual cash once, sign in with email or username, retain a database-backed session, and sign out.
- Signed-in players can open the Wallet to read persisted playable, cash, bonus, and reserved balances. They can add one of the supported demo amounts, request a withdrawal, inspect pending reservations, and review recent ledger activity. Successful money actions refresh the shared wallet query and publish an app-level toast.
- Signed-in players can open History to review paginated wallet operations as one row per transaction. Category tabs and URL-backed bucket, operation, and date filters query the immutable ledger and include gameplay references where available.
- Signed-in players can browse the synchronized catalogue with client-side search and category filters.
- The responsive shell has desktop navigation, a mobile drawer, a persistent playable balance with cash and bonus detail, account controls, loading and wallet retry states, catalogue error recovery, and artwork fallbacks.
- PostgreSQL stores Better Auth identity, player profiles, wallets, wallet operations, immutable ledger entries, withdrawals, bonus definitions and awards, games, sessions, rounds, and provider operations.
- The wallet engine performs exact, atomic, retry-safe movements across cash, bonus, and reserved cash.
- The bonus engine handles activation, eligibility, wagering progress, completion, conversion, refund effects, expiry, exhaustion, and cancellation.
- The gameplay engine handles bets, wins, losses, and refunds through the same wallet and bonus services used by the rest of the application.
- The deterministic fixture runner exercises production gameplay logic. The Drakon adapter and callback boundary have contract tests.
- Catalogue synchronization persists provider data and preserves Bearbet-owned availability and curation fields.

### The current gap

The core Wallet and History routes are connected to the money engine, and the app shell now reads their shared wallet query to show the persisted playable balance with cash and bonus detail. Access-boundary and full journey tests still need to prove cross-user rejection, suspended-player rejection, duplicate-click behavior, failed over-withdrawals, and refresh persistence. Authenticated game cards now launch a persisted BearBet demo session. The Lucky Number player accepts a virtual stake, resolves a server-controlled outcome, records the bet and settlement through the production gameplay engine, refreshes wallet and history data, restores the player's active session after a browser refresh, and closes with a session summary. History shows friendly operation references, game names on financial activity, and round-level won, lost, refunded, and pending results in its Bets tab. External provider launch, bonuses, Promotions, VIP, Profile, and Admin remain incomplete or placeholders.

A reviewer can now drive top-ups and withdrawal reservations from the Wallet. The next work completes that loop across the shell and transaction history, then records repeatable proof.

### Agreed delivery direction

Finish the visible money loop first, then make the fixture game playable before adding its bonus UI. Follow that with account and catalogue completion, then administration, release work, and live Drakon proof. Do not let Profile, password recovery, favourites, or VIP delay the first playable game. Promotions and VIP remain honest unavailable states until they have a defined product scope.

## Delivery rules

1. Build one visible journey at a time. A backend-only addition is incomplete when the task promises a player or administrator outcome.
2. Browser request schemas contain only caller-controlled fields. Server functions add player IDs, roles, balances, and audit data from trusted state.
3. Every protected server function authenticates the session and checks player status, ownership, or administrator role. Route guards only manage navigation.
4. Components call TanStack server functions. Domain services keep business rules and call Drizzle directly.
5. The wallet and immutable ledger remain the only money record. History screens read those records instead of introducing presentation-specific transaction tables.
6. The fixture provider and Drakon use the same launch, gameplay, wallet, bonus, and history paths after provider normalization.
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

## Stage 2: playable fixture journey

The first-party BearBet demo path now authenticates an active player, resolves a persisted enabled game, checks playable balance, records the launch attempt, and wires authenticated game cards to a simple player. Complete the external branch by calling the configured provider and returning its safe launch result.

Authenticated browser functions now resolve Lucky Number wins and losses on the server and run them through the existing gameplay service. The interface labels the experience as a BearBet demo and refreshes wallet and transaction history after each round. The Bets tab groups persisted operations into round results. Starting the same game resumes the player's active session, including after refresh, while concurrent launches serialize so they cannot create competing sessions. Refund behavior remains implemented in the shared gameplay engine, but its browser proof is deferred until the live provider's cancellation and rollback contract is known.

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

Expose available bonus definitions, the current award, and activation through authenticated server functions. Build the bonus page around the persisted award snapshot. Show required, completed, and remaining wagering, percentage, expiry, status, and eligibility failures.

The fixture game player should make bonus behavior visible. Eligible bonus-funded bets advance progress. Excluded bets use cash and leave progress unchanged. Completion converts the remaining bonus once and transaction history explains the conversion.

Checkpoint:

```text
Seed a known offer -> player activates it
-> eligible fixture bet advances progress -> excluded bet does not
-> completion converts once -> wallet and ledger agree
```

This stage delivers tasks P19 through P21. It depends on wallet and gameplay. Administrator-authored offers join the same flow in Stage 4.

## Stage 4: account, catalogue completion, and administration

Complete player profile and password recovery. Profile edits must exclude role, status, balances, and audit fields. Password changes require a fresh session.

Add favourites and recently played games, then move catalogue filtering to indexed, paginated PostgreSQL reads with provider filters, URL state, and persisted featured, popular, and new collections. These close the original product brief, but they follow the playable and bonus journeys.

Add a nested administrator route group with a server-side role check on every function. Build operations in this order:

1. User search, inspection, suspension, activation, and bonus assignment.
2. Audited balance adjustments through the wallet engine.
3. Game sync, availability, categories, and collection curation.
4. Bonus definition management.
5. Wallet and gameplay inspection plus withdrawal review.
6. A persistent audit trail for every administrator mutation.

The overview comes from those operational reads. It should report useful counts and recent events, not invented gambling revenue.

Checkpoint:

```text
Admin finds a player -> changes status or balance with a reason
-> manages one game and one bonus -> reviews a withdrawal
-> audit records identify actor, target, action, reason, and time
-> a normal player cannot call any of the same mutations
```

This stage delivers tasks P22 through P24 and A01 through A07.

## Stage 5: live Drakon proof

The Drakon adapter and callback normalization already have focused tests. Live completion still requires an approved agent and provider-originated evidence.

Use the same launch orchestration and player UI built for the fixture provider. Preserve token caching, one refresh after authorization failure, request timeouts, fun-mode enforcement, unavailable-game detection, callback authentication, request-size limits, and dashboard probe compatibility.

Checkpoint:

```text
Drakon authentication -> catalogue sync -> supported game launch
-> Bearbet player identity -> provider bet and settlement callback
-> persistent wallet, transaction history, and bet history update once
```

A catalogue response or a URL that ends at Drakon's game-error page does not pass. Approved Drakon credentials remain the only external blocker. This stage delivers D01 through D04.

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

Favourites, recently played games, notifications, advanced filters, two-factor authentication, player limits, VIP, cashback, referrals, loyalty, multi-currency conversion, and broad analytics remain deferred. Promotions and VIP may keep honest unavailable states until a later scope explicitly brings them in.

## Immediate task

Finish P04 and P10 with access-boundary and wallet-journey tests covering duplicate requests, invalid and excessive withdrawals, suspension, cross-user isolation, and refresh persistence. The next vertical slice is fixture launch, play, settlement, and history refresh. Bonus activation and visible wagering progress follow it.
