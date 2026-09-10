# Bearbet implementation plan

Build complete slices. Each phase must end with a visible user or admin outcome and automated proof for its risky rules. `master-task-list.md` tracks individual requirements.

## Current state

The repository now has:

- A conventional TanStack Start layout with server code under `src/server`, shared browser inputs under `src/lib`, and product UI under `src/components`.
- PostgreSQL through Docker Compose, Drizzle schemas, validated server environment variables, and working build, typecheck, lint, and test commands.
- Better Auth backed by PostgreSQL with username and admin plugins, database rate limits, TanStack cookies, and server middleware.
- One-to-one player and wallet records, separate cash, bonus, and reserved balances, an immutable ledger schema, and retry-safe `$1,000.00` welcome credit provisioning.
- A validated Better Auth registration endpoint that uses the user lifecycle hook to provision the player, wallet, and welcome credit. Email and username sign-in both resolve the persisted player identity.
- A responsive registration screen using TanStack Form, shared Zod validation, and the typed Better Auth client. It reports field and server errors and disables repeated submissions while registration is pending.
- A responsive email-or-username login screen and a session-aware player menu. Guests can open the login or registration routes; signed-in players can log out, while Settings remains unavailable until its route exists.
- A provider-neutral casino contract with live Drakon and captured-fixture adapters. The live adapter authenticates, refreshes one expired token, normalizes the catalogue and launch response, and rejects unsupported demo games and Drakon's unavailable-game URL.
- A Drakon webhook boundary that limits request size, compares callback secrets safely, validates each supported method, identifies authenticated dashboard probes, and converts provider amounts to integer minor units before domain services receive them.
- A game-domain catalogue service and TanStack server function backed by the selected provider, with React Query loader caching on the casino route. Casino remains `/`; Promotions, Bonuses, and VIP use sibling routes with URL-derived navigation state.
- A dark-first Bearbet theme, local logo font, favicon package, fixed desktop sidebar, mobile drawer, and inset content panel.

The registration tests prove that valid email or username credentials resolve the same player identity, provisioning stays idempotent, and invalid age input creates no identity.

## Next slice: session ownership

Finish the identity flow before expanding the interface.

1. Add the authenticated route layout and complete the guest-route session guard.
2. Test duplicate username and email, suspension, session persistence, logout, and ownership boundaries.

Checkpoint:

```text
Register -> one player -> one wallet -> $1,000.00 cash
Refresh and restart -> session and balance persist
Guest routes reject signed-in users -> protected routes reject guests
Suspended user -> protected server action denied
```

## Wallet operations

After identity is stable, implement wallet movements as the first reusable business service.

1. Lock cash and bonus stake allocation and withdrawal reservation rules with worked examples.
2. Add atomic credit, debit, reserve, release, and reversal operations.
3. Add demo top-ups and simulated withdrawal requests.
4. Test concurrent debits, insufficient funds, idempotent requests, exact minor-unit arithmetic, and immutable history.

The UI checkpoint is a real wallet balance and transaction list in the player shell. Do not build a second transaction table.

## Simulator and casino slice

1. Define normalized catalogue, launch, bet, win, and refund inputs.
2. Add a deterministic simulated provider that calls the production wallet service.
3. Persist a representative catalogue, game sessions, rounds, and provider operations.
4. Build the lobby, game launch state, player history, and a small admin inspection view.
5. Prove that callback retries do not move money twice and conflicting fingerprints fail.

Checkpoint:

```text
Sign in -> browse catalogue -> launch simulated game
-> bet -> settle or refund -> wallet and history update once
-> admin sees the same persisted activity
```

## Player MVP

Complete profile, account recovery, lobby search and filters, game-player behavior, wallet controls, transaction history, bet history, and simulated withdrawals. Add loading, empty, error, unavailable, keyboard, and responsive states as each route lands.

The catalogue must remain usable with roughly 15,000 records. Broken artwork, provider timeouts, empty history, and unavailable games need explicit recovery states.

## Bonuses and admin

Implement one complete bonus path before adding broad configuration.

```text
Admin creates offer -> player receives it -> eligible bet advances progress
-> excluded bet does not -> completion converts once -> ledger explains the result
```

Then complete user, game, bonus, transaction, adjustment, and withdrawal controls. Every admin mutation must check the role on the server and record its actor and reason.

## Drakon proof

Port the verified Greenbear V0 behavior behind the same provider contract used by the simulator. Keep token caching, one refresh after authorization failure, `only_demo` handling, launch-error detection, request limits, callback authentication, and dashboard probe compatibility.

Live completion requires an approved agent and this exact proof:

```text
Drakon auth -> catalogue sync -> supported game launch -> Bearbet player identity
-> provider bet and settlement callback -> persistent wallet and history update
```

A successful catalogue request or a URL ending at `/game-error` does not complete this phase.

## Delivery

Add targeted rate limits, structured redacted logs, secure headers, readiness checks, repeatable seeds, clean-install release checks, deployment, screenshots, and reviewer instructions. Finish with a visual and accessibility pass after layouts stop changing.

## Current blocker

The approved Drakon agent credentials have not arrived. This blocks only the live provider proof. The simulator keeps identity, wallet, catalogue, gameplay, bonus, admin, and interface work moving.
