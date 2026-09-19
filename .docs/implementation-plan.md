# Bearbet implementation plan

Bearbet has finished its main domain-engine phase. The next phase turns those services into complete player and administrator journeys. New work should ship as vertical slices that connect a route, browser-safe contract, authenticated server function, domain service, persistence, interface states, and focused proof.

`master-task-list.md` is the active checklist. This file records delivery order, dependencies, and checkpoints.

## Current delivery phases

This is the current administration and release sequence. Update this section when a phase changes status. The task checklist remains the detailed source for individual items.

- **Phase 1, shared admin foundations, complete.** TanStack admin table primitives, responsive states, URL query contracts, cursor conventions, password recovery, password reset, password change, and the local reset-email preview are in place.
- **Phase 2, users, complete.** Admin user queries, URL-backed filters and sorting, responsive users UI, detail actions, wallet adjustments, bonus assignment, fresh-session authorization, session revocation, and transaction-scoped audits are implemented and tested.
- **Phase 3, withdrawals and operations, current.** Add paginated withdrawal and operations queries first, then build the withdrawal review and activity tables on top of the existing audited review mutation.
- **Phase 4, games, next.** Add audited game curation mutations, provider/category/status filters, sync feedback, and safe curation actions.
- **Phase 5, bonuses, follows games.** Add bonus-definition management and the definition table without changing already-issued awards.
- **Phase 6, live overview and player gaps, follows administration.** Replace illustrative overview data with live operational counts, then finish favorites, recently played, profile reads and edits, and lifecycle/access-boundary proof.
- **Phase 7, release gate, final.** Complete rate limits, redacted logs, secure headers, health checks, clean-install verification, accessibility checks, and reviewer evidence.

The next implementation stops after the Phase 3 foundation is complete and verified. It does not begin games or bonus-definition work in the same slice.

## Where the project stands

### Working product pieces

- Guests can browse a branded casino lobby and open registration or login.
- Players can register with the required profile fields, receive `$1,000.00` in virtual cash once, sign in with email or username, retain a database-backed session, and sign out.
- Signed-in players can open the Wallet to read persisted playable, cash, bonus, and reserved balances. They can add one of the supported demo amounts, request a withdrawal, inspect pending reservations, and review recent ledger activity. Successful money actions refresh the shared wallet query and publish an app-level toast.
- Signed-in players can open History to review paginated wallet operations as one row per transaction. Category tabs and URL-backed bucket, operation, period, and sort filters query the immutable ledger and include gameplay references where available; advanced date filtering remains deferred.
- Signed-in players can browse the synchronized catalogue with client-side search and category filters.
- The responsive shell has desktop navigation, a mobile drawer, a persistent playable balance with cash and bonus detail, account controls, loading and wallet retry states, catalogue error recovery, and artwork fallbacks.
- PostgreSQL stores Better Auth identity, player profiles, wallets, wallet operations, immutable ledger entries, withdrawals, bonus definitions and awards, games, sessions, rounds, and provider operations.
- The wallet engine performs exact, atomic, retry-safe movements across cash, bonus, and reserved cash.
- The bonus engine handles activation, eligibility, wagering progress, completion, conversion, refund effects, expiry, exhaustion, and cancellation.
- The gameplay engine handles bets, wins, losses, and refunds through the same wallet and bonus services used by the rest of the application.
- The deterministic fixture runner exercises production gameplay logic. The Drakon and BigBang adapters and callback boundaries have contract tests.
- The configured BigBang sandbox catalogue has been synchronized into PostgreSQL. Authenticated game cards can open a signed BigBang Standard session, preserve the provider-managed balance baseline, and reconcile only the final session delta at explicit close.
- Catalogue synchronization persists provider data and preserves Bearbet-owned availability and curation fields.
- The protected admin shell and users slice are live. Admin users can search and filter accounts, inspect player and wallet projections, suspend or activate accounts, adjust cash, and assign bonuses with reasons and audit evidence.
- Better Auth owns password recovery and password change. Development logs a local reset-email preview when Resend is not configured.

### The current gap

The player wallet, game, history, and bonus journeys are connected to the domain services. Access-boundary and full journey tests still need to prove cross-user rejection, suspended-player rejection, duplicate-click behavior, failed over-withdrawals, password lifecycle behavior, and refresh persistence. Profile reads and safe edits are still pending.

The admin shell, shared table foundation, password security flows, and users slice are complete. The existing withdrawal review mutation already locks the withdrawal, moves or releases reserved cash through the wallet engine, and writes one audit entry. The remaining Phase 3 work is read-side: withdrawal queue/history projections, cursor-based wallet and gameplay activity queries, the responsive review UI, and the read-only activity tabs. Games and bonus-definition routes remain placeholders. Live Drakon play remains separately blocked by provider launch behavior.

A reviewer can now drive top-ups and withdrawal reservations from the Wallet and manage users from the admin portal. The next reviewer-visible outcome is an administrator opening the withdrawal queue, reviewing a pending request, and inspecting the resulting wallet, withdrawal, and audit activity.

### Agreed delivery direction

The original player-first order has delivered the wallet, playable fixture, history, and bonus journeys. The remaining work now follows the current delivery phases above: finish admin withdrawals and operations, then games, bonus definitions, the live overview and remaining player gaps, and finally release hardening. Promotions and VIP remain honest unavailable states until a later scope defines them.

## Delivery rules

1. Build one visible journey at a time. A backend-only addition is incomplete when the task promises a player or administrator outcome.
2. Browser request schemas contain only caller-controlled fields. Server functions add player IDs, roles, balances, and audit data from trusted state.
3. Every protected server function authenticates the session and checks player status, ownership, or administrator role. Route guards only manage navigation.
4. Components call TanStack server functions. Domain services keep business rules and call Drizzle directly.
5. The wallet and immutable ledger remain the only money record. History screens read those records instead of introducing presentation-specific transaction tables.
6. The fixture provider, Drakon, and BigBang use the same normalized catalogue and launch boundary. The fixture remains the authoritative per-round wallet demonstration; BigBang's sandbox balance is reconciled only at explicit session close.
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

The first-party BearBet demo path authenticates an active player, resolves a persisted enabled game, checks playable balance, records a retry-safe session, and wires authenticated game cards to the simulator. The BigBang branch calls the configured provider, creates the provider player, persists the signed launch result and balance baseline, and returns the provider sandbox player UI.

Authenticated browser functions now resolve Lucky Number wins and losses on the server and run them through the existing gameplay service. The interface labels the experience as a BearBet demo and refreshes wallet and transaction history after each round. The Bets tab groups persisted operations into round results. Starting the same game resumes the player's active session, including after refresh, while concurrent launches serialize so they cannot create competing sessions. Refund behavior remains implemented in the shared gameplay engine, but its browser proof is deferred until the live provider's cancellation and rollback contract is known.

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

The player account work is split. Password recovery and password change are complete through Better Auth, while profile reads and safe edits and browser lifecycle proof remain in the task list. Favorites and recently played projections exist but still need their player-facing reads, writes, lobby sections, and empty states.

The admin route group, fresh-session checks, transaction-scoped authorization, audit writer, shared table primitives, and users slice are complete. The existing withdrawal review mutation is the first finished operations mutation. Continue administration in this order:

1. **Phase 3, withdrawals and operations.** Add explicit withdrawal queue/history projections, cursor-based wallet and gameplay activity projections, then build review and activity tables with URL-backed filters and responsive states.
2. **Phase 4, games.** Add audited enable/disable, category, featured, popular, and new curation mutations. Preserve local fields during provider sync and show sync progress, errors, unavailable games, and artwork fallbacks.
3. **Phase 5, bonuses.** Add audited definition list, create, edit, activate, and deactivate operations. Existing player awards keep their snapshotted rules.
4. **Phase 6, live overview and player gaps.** Replace illustrative overview values with live operational counts, link cards to filtered admin pages, then finish favorites, recently played, profile reads and edits, and access-boundary proof.

The overview must report useful operational counts and recent events, not invented gambling revenue.

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

Start Phase 3 with the admin withdrawal and operations queries. Return explicit withdrawal, player, wallet, reviewer, and decision projections. Use offset pagination for the review queue and cursor pagination for continuously growing wallet, gameplay, withdrawal, and audit activity. Then build the responsive review and activity tables on top of the existing audited review mutation.

Keep P04, P10, P22, and P24 in the verification queue. They are important release evidence, but they do not change the next implementation slice.
