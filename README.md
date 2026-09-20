# Bearbet

Bearbet is a casino-only demo platform built around virtual funds. It covers the player journey from registration and a $1,000 welcome balance through catalogue browsing, gameplay, bonuses, wallet history, and simulated withdrawals. It also includes an admin portal for user, game, bonus, withdrawal, and activity management.

Live application: [bearbet.vercel.app](https://bearbet.vercel.app)

> Bearbet does not process real money. Deposits, bets, winnings, bonuses, and withdrawals in this project are simulated.

## What is included

### Player experience

- Email and username registration, login, logout, password reset, and password change
- Automatic $1,000 virtual cash balance for new players
- Separate cash, bonus, and reserved balances stored in integer minor units
- Demo top-ups and simulated withdrawal requests
- Searchable, paginated game catalogue with categories and provider filters
- Favourites and recently played collections
- Deterministic gameplay with persisted bets, wins, losses, refunds, and round history
- BigBang Standard sandbox games in an embedded player
- Bonus activation, wagering progress, expiry, completion, and cash conversion
- Unified wallet and gameplay history
- Responsive desktop and mobile layouts

### Admin experience

- Live operational overview and recent activity
- User search, account inspection, suspension, and activation
- Audited balance adjustments and bonus assignment
- Provider catalogue sync and local game curation
- Bonus definition creation, editing, artwork, and availability controls
- Simulated withdrawal approval and rejection
- Filterable wallet, gameplay, withdrawal, and audit activity

## Provider strategy and trade-offs

The original assignment specified Drakon. Its catalogue and callback probe worked, but every tested game launch ended on Drakon's `/game-error` page. Without a playable session, there was no honest way to demonstrate provider-originated wallet callbacks.

Bearbet therefore uses two complementary gameplay paths.

1. **The fixture simulator proves Bearbet's money system.** It calls the same gameplay, wallet, bonus, and ledger services used by the rest of the application. Outcomes are deterministic, persisted, and safe to retry.
2. **BigBang proves genuine provider play.** Bearbet synchronizes the BigBang Standard catalogue, creates a provider player, and launches a signed playable sandbox session.

The tested BigBang sandbox kept one provider-managed balance and did not send the documented wallet callbacks, even after direct callback probes succeeded. It also behaved like a shared account, so concurrent player sessions could not be reconciled safely.

The submission uses a deliberately narrow hybrid bridge. Bearbet records the BigBang balance before launch, permits one active BigBang session at a time, then reads the final provider balance when the session closes. It applies only the net delta as one idempotent `provider_reconciliation` ledger operation. Bearbet never copies BigBang's absolute synthetic balance and never invents per-round bets, wins, or refunds that the provider did not report.

This produces a more immersive playable demo, but it is not a production wallet integration. The fixture remains the authoritative proof for per-round money movement and bonus behavior. The full investigation is recorded in [`.docs/bigbang-sandbox-findings.md`](.docs/bigbang-sandbox-findings.md) and [`.docs/drakon-v0-findings.md`](.docs/drakon-v0-findings.md).

## Architecture

```text
Browser
  -> TanStack Start routes and server functions
    -> domain services
      -> PostgreSQL through Drizzle
      -> provider boundary
        -> deterministic fixture
        -> BigBang sandbox
        -> archived Drakon adapter
```

The main technical choices are:

- TanStack Start, React 19, and TanStack Query for the application
- Better Auth for credentials, sessions, password flows, roles, and bans
- PostgreSQL, Drizzle ORM, and immutable ledger entries for persistent state
- Zod schemas at browser and provider boundaries
- Base UI, shadcn components, and Tailwind CSS for the interface
- Node's test runner for policy, service, provider, and database tests
- Vercel for hosting, Neon for PostgreSQL, and Vercel Blob for managed bonus artwork

Domain services write current wallet balances and immutable ledger evidence in the same database transaction. Provider operations and user-triggered mutations use idempotency keys so a retry cannot move virtual funds twice.

## Reviewer path

The quickest way to inspect the product is:

1. Register a player and confirm the $1,000 starting balance.
2. Browse, search, filter, favourite, and launch a game from the lobby.
3. Use the deterministic game to place rounds and inspect wallet and bet history.
4. Add demo funds, activate a bonus, and complete wagering through gameplay.
5. Request a simulated withdrawal.
6. Sign in as the seeded administrator, review the player, adjust funds, manage games and bonuses, and approve or reject the withdrawal.
7. Launch a BigBang game to inspect the real provider session. Close it through the Bearbet player to trigger the labelled session-delta reconciliation.

Submission credentials should be shared privately. They do not belong in this repository.

## Local setup

Requirements:

- Node.js 22 or newer
- npm
- Docker with Compose

Install and start the local database:

```bash
npm install
cp .env.example .env.local
npm run db:up
npm run db:migrate
```

Generate a Better Auth secret and put it in `.env.local`:

```bash
npx -y @better-auth/cli secret
```

For a local setup with no external provider credentials, change `CASINO_PROVIDER` to `fixture`. Then start the application:

```bash
npm run dev
```

Bearbet runs at [http://localhost:3000](http://localhost:3000). The local PostgreSQL container uses port `5432` and keeps its data in a Docker volume.

### Seed an administrator

Set `ADMIN_PASSWORD` in `.env.local`, then run:

```bash
npm run auth:seed-admin
```

The default local identity is `admin@bearbet.local` with username `admin`. The seed command creates the account or promotes and resets the matching account.

### Select a casino provider

`CASINO_PROVIDER` accepts:

- `fixture`, the self-contained and repeatable local path
- `bigbang`, the active external sandbox path, which also needs `BIGBANG_SANDBOX_KEY`
- `drakon`, the retained investigation adapter, which needs the Drakon server credentials and is not part of the release path

After configuring an external provider, synchronize its catalogue:

```bash
npm run catalogue:sync
```

All provider credentials stay on the server. `.env.example` documents the available variables with empty placeholders.

## Verification

With PostgreSQL running and `.env.local` configured:

```bash
npm test
npm run typecheck
npm run check
npm run build
git diff --check
```

Useful development commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on port 3000 |
| `npm run db:up` | Start local PostgreSQL |
| `npm run db:down` | Stop local PostgreSQL without deleting its volume |
| `npm run db:migrate` | Apply committed Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run catalogue:sync` | Synchronize the configured provider catalogue |
| `npm run auth:seed-admin` | Create or reset the review administrator |
| `npm run db:reset-review` | Reset review data when its confirmation variable is set |

## Known limits

- BigBang reconciliation is a session summary, not provider-confirmed per-round history.
- The tested BigBang sandbox supports only one safely reconciled active session because its balance appeared to be shared.
- Drakon launch and callback proof remains incomplete because the supplied integration did not produce a playable session.
- Profile editing, broader access and browser lifecycle coverage, targeted abuse protection, security headers, health checks, and automated end-to-end coverage remain in the release backlog.
- VIP, cashback, referrals, loyalty, two-factor authentication, and real payments are outside the MVP.

## Project documentation

The `.docs` folder keeps the assignment and implementation evidence separate from this reviewer-facing overview:

- [Task brief](.docs/task-brief.md)
- [Architecture](.docs/architecture.md)
- [Domain model](.docs/domain-model.md)
- [Delivery task list](.docs/master-task-list.md)
- [Implementation plan](.docs/implementation-plan.md)
- [BigBang sandbox findings](.docs/bigbang-sandbox-findings.md)
- [Drakon integration findings](.docs/drakon-v0-findings.md)
