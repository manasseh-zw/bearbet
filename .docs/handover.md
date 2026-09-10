# Bearbet handover


## Product direction

Bearbet should feel like a credible, polished casino product while all funds remain virtual. Use Stake as the primary interaction reference and Winly365 as a secondary lobby/content reference. Create original branding, layouts, components, copy, and assets.

The ideal complete product includes:

- Fast responsive casino lobby with search, providers, categories, featured/new/popular collections, favourites, and recently played.
- Registration, account profile, secure sessions, and `user`/`admin` roles.
- Separate cash and bonus wallets, simulated deposits and withdrawals, and a complete immutable ledger.
- Real Drakon catalogue and gameplay, with a simulated provider available for development and demonstrations.
- Configurable bonuses, wagering progress, conversion, eligibility, and expiration.
- User transaction and bet history.
- Admin management for users, balances, games, bonuses, transactions, and withdrawals.
- Clear loading, empty, unavailable, and provider-error states.
- Deployment, seed/demo accounts, operational logs, and concise handover instructions.

## Recommended delivery order

### 1. Scope the MVP

Turn `task-brief.md` into a tracked checklist. Preserve the assignment's P0/P1 split and agree on what must be shown in the final demo. Define the polished full-product direction without implementing every future feature at once.

### 2. Design persistent ownership and money relationships

Model users, roles, wallets, ledger entries, game catalogue records, game sessions, rounds, provider operations, bonus definitions, awarded bonuses, wagering progress, withdrawals, favourites, and recently played games.

Resolve these invariants before UI work:

- Every balance change creates one immutable ledger entry.
- Provider operations are idempotent.
- A refund points to or deterministically identifies its original operation.
- Cash, bonus, and wagering effects are explicit.
- Admin adjustments record the actor and reason.
- User and admin queries are scoped and authorized.

### 3. Establish the provider boundary

Define a small functional contract for catalogue retrieval and launch, with provider-specific callback adapters. Implement `drakon` and `simulated` providers behind configuration. The simulator should exercise the same wallet service with realistic balance, bet, win, and refund events; it must be clearly labelled in the UI and evidence.

### 4. Build the first vertical slice

Deliver this before broad page construction:

```text
Register/login → persistent $1,000 wallet → browse catalogue
→ launch simulated game → bet/win/refund → ledger/history
→ admin inspects the same activity
```

This proves authentication, ownership, authorization, schema relationships, wallet correctness, provider abstraction, and the main UI shell together.

### 5. Verify live Drakon

When the approved agent arrives:

1. Store credentials in server-only environment variables.
2. Configure a stable public callback endpoint.
3. Run dashboard approval probes.
4. Synchronize the enabled catalogue.
5. Launch one supported game with a Bearbet user ID.
6. Capture account/balance, bet, win, and refund callbacks.
7. Compare live payloads with `drakon-v0-findings.md` and update the adapter/tests.

Do not let this verification block the rest of the vertical slice. Do not claim live completion until a provider-originated transaction updates Bearbet's persistent wallet.

### 6. Complete P0 product flows

Add profile management, game collections and filters, bonus/wagering behavior, simulated deposit/withdrawal flows, complete histories, admin operations, responsive states, rate limits, error handling, and logging.

### 7. Polish, deploy, and hand over

Seed user/admin accounts and representative data, verify mobile and desktop flows, deploy with persistent storage and production secrets, test callbacks against the deployed endpoint, and map final evidence to the definition of done.

### 8. Add P1 only if time remains

Favourites and recently played are useful early enhancements. Notifications, advanced filters, 2FA, limits, VIP, cashback, referrals, and loyalty follow only after the P0 flow is stable.

## Implementation preferences

- Organize code by business function or vertical slice rather than generic technical folders.
- Prefer TypeScript `type` declarations over `interface`.
- Prefer small functions and explicit data flow; avoid unnecessary classes and abstraction layers.
- Keep monetary and transaction rules in pure functions where possible, with persistence and provider I/O at the edges.
- Use integer minor units or fixed database decimals for money.
- Keep provider payload types and mappings inside the integration feature.
- Write tests for wallet invariants, callback idempotency, refunds, authorization boundaries, and bonus wagering rules.

## Suggested first planning output

Before editing application code, produce a short MVP checklist and initial schema proposal derived from `task-brief.md`. The checklist should map each P0 requirement to a vertical slice and a visible verification step. Then implement the first vertical slice rather than building database, authentication, UI, and provider layers as disconnected phases.
