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
- ISO country picker with flag search and provider-supported account currencies
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

## Architecture and engineering

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

### Code boundaries

Routes own URL behavior, authentication guards, loaders, and page composition. React components own presentation and interaction. Browser requests reach typed TanStack server functions, which validate their input and add trusted session data before calling a domain service.

The domain services under `src/server/domains` own wallet, gameplay, bonus, withdrawal, catalogue, engagement, and admin rules. They call Drizzle directly and open the transaction around the complete business action. Provider code, database setup, email, and blob storage stay under `src/server/infra`.

Portable Zod schemas live under `src/lib/schemas`. The browser can use them for form feedback, but the server parses every request again. User IDs, roles, balances, account status, and audit fields never come from browser input.

### Identity and authorization

Better Auth owns users, credentials, sessions, verification records, roles, and suspended state. Bearbet extends a user with a one-to-one player record and one wallet. Public registration cannot choose a role, account status, starting balance, or email-verification state.

Route guards improve navigation, but they are not the security boundary. Every protected server function reads a fresh session and checks the player's status, ownership, or admin role. Sensitive admin mutations repeat the active-admin check inside the database transaction so a status change cannot race the operation.

### Wallet and ledger

Bearbet stores money as integer minor units. A balance of $1,000.00 is `100000`, so wallet arithmetic never depends on floating point values.

Each wallet has cash, bonus, and reserved-cash buckets. The current balance is the fast projection. Immutable ledger entries are the audit record. A domain service locks or atomically updates the wallet and writes the corresponding ledger entries in the same PostgreSQL transaction. If either write fails, neither survives.

Withdrawals demonstrate the bucket model. A request moves cash into reserved cash. Approval consumes the reserve, while rejection returns it to cash. Gameplay records the cash and bonus portions of every stake so wins and refunds can return money to the correct buckets.

The application does not keep separate transaction-history or bet-history tables. Transaction history reads the ledger. Bet history groups game rounds and their provider operations. This avoids a second copy of financial state drifting away from the source records.

### Idempotency and concurrency

Every money-changing command carries an idempotency key. Bearbet stores the key with a fingerprint of the normalized request and the original result.

- A retry with the same key and fingerprint returns the stored result without moving money again.
- Reusing the key with different input is rejected as a conflict.
- Provider operations use the integration provider, operation type, and external transaction ID as their unique identity.
- Refunds point to the operation they reverse and cannot exceed its unrefunded amount.

Wallet debits serialize at the database layer, so two concurrent requests cannot both spend the same balance. The same pattern protects withdrawal decisions, game launches, bonus completion, and BigBang reconciliation. The test suite covers duplicate operations, conflicting retries, concurrent debits, and repeated callback delivery.

### Bonus accounting

Eligible games spend bonus funds before cash. Ineligible games spend cash only. Only the bonus-funded part of an eligible stake advances wagering progress.

For a mixed stake, Bearbet stores the cash and bonus portions. Wins return in the same ratio, rounded to whole minor units. Refunds restore the original buckets and reverse the matching wagering contribution. When a player reaches the wagering target, the service converts the remaining bonus to cash once. Expiry and cancellation forfeit the remaining bonus instead.

One active award per player keeps the aggregate bonus balance attributable to one rule set. Each award snapshots its definition, so an administrator can edit a future offer without changing an award a player already accepted.

### Catalogue and provider boundary

The application depends on a small normalized provider contract for catalogue sync and game launch. Provider payloads do not leak into the wallet or gameplay domains.

Catalogue sync upserts provider games, marks missing games unavailable, and preserves Bearbet-owned curation such as enabled, featured, popular, and new flags. Public catalogue reads use PostgreSQL rather than calling the provider on every request. Search is paginated and backed by trigram indexes for names, content providers, and categories.

The fixture and BigBang adapters implement the active contract. The Drakon adapter remains in the codebase as integration evidence, but the release does not depend on it.

## Integration issues and trade-offs

### Drakon

The assignment supplied Drakon as the expected provider. Authentication and catalogue retrieval worked. The callback URL also passed direct dashboard probes. Playable launches did not work: each tested launch ended on Drakon's `/game-error` page.

That left no real game session and no provider-originated financial callback to verify. Treating the adapter as complete would have hidden the main missing proof, so Drakon was removed from the release path.

### BigBang

BigBang provided the missing playable experience. Bearbet can synchronize its Standard catalogue, create a provider player, receive a signed launch URL, and run the game in an iframe.

Its sandbox introduced a different problem. Test spins changed the balance held by BigBang, but BigBang sent no `user_data`, `balance_change`, or round webhook request to Bearbet. Direct probes to the same public callback URLs succeeded, so the receiver and tunnel were reachable. The sandbox also appeared to expose one shared provider balance rather than an isolated balance for each Bearbet player.

Standard games report a net round movement, while Bearbet's money engine records separate bet, win, and refund operations. Without genuine callbacks, splitting a net change into those operations would require guessing.

### Registration country and currency

Registration accepts the active ISO country list and uses a searchable flag picker. Account currency remains limited to the currencies currently enabled by registration (`USD`, `ZAR`, and `GBP`); adding more currency choices requires the corresponding provider and gameplay support.

### The hybrid path

The submission uses two gameplay paths because each proves a different part of the system.

1. The fixture simulator proves Bearbet-owned money movement. It runs through the production gameplay, wallet, bonus, history, and ledger services. Outcomes are deterministic and repeatable.
2. BigBang proves a real external catalogue and signed playable session.

For BigBang, Bearbet stores the provider balance immediately before launch. It allows one active BigBang session at a time because the sandbox balance appears to be shared. When the player closes the session, Bearbet reads the final balance and calculates `final balance - launch balance`.

Only that delta enters Bearbet as one idempotent `provider_reconciliation` operation. The application never copies BigBang's absolute synthetic balance. It also does not manufacture per-round bets, wins, or refunds. If the final balance cannot be read, the reconciliation stays pending instead of estimating a result.

This is an honest sandbox compromise, not a production seamless-wallet design. The fixture is the authoritative proof for exact per-round accounting. BigBang is the authoritative proof for external game launch.

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

The review reset preserves existing administrators by default. To start with a completely empty identity table before seeding a new administrator, set `RESET_DATABASE_PRESERVE_ADMINS=false` for that run.

### Select a casino provider

`CASINO_PROVIDER` accepts:

- `fixture`, the self-contained and repeatable local path
- `bigbang`, the active external sandbox path, which also needs `BIGBANG_SANDBOX_KEY`
- `drakon`, the retained investigation adapter, which needs the Drakon server credentials and is not part of the release path

After configuring an external provider, synchronize its catalogue:

```bash
npm run catalogue:sync
```

After the catalogue is available, seed the three active review bonuses and
resolve their thumbnails from the Vercel Blob store:

```bash
npm run bonuses:seed-review
```

The bonus seed is safe to rerun. It updates the three named definitions and
does not remove other definitions or player awards.

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
| `npm run bonuses:seed-review` | Seed the active review bonus definitions and Blob thumbnails |

## Known limits

- BigBang reconciliation is a session summary, not provider-confirmed per-round history.
- The tested BigBang sandbox supports only one safely reconciled active session because its balance appeared to be shared.
- Drakon launch and callback proof remains incomplete because the supplied integration did not produce a playable session.
- Profile editing, broader access and browser lifecycle coverage, targeted abuse protection, security headers, health checks, and automated end-to-end coverage remain in the release backlog.
- VIP, cashback, referrals, loyalty, two-factor authentication, and real payments are outside the MVP.
