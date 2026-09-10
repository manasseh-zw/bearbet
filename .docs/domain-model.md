# Bearbet domain model

Status: initial proposal for review before the first migration.

## Required player journey

### 1. Create an account

The visitor registers with username, email, password, first name, last name, date of birth, country, and currency.

Better Auth creates the user, credential account, and session records. Bearbet provisions one wallet and records the `$1,000.00` welcome credit exactly once.

### 2. Sign in and manage the account

The user can sign in, sign out, reset or change the password, maintain a session, and view profile details. A suspended user cannot create a session or perform protected actions.

### 3. Browse the casino

The user browses synchronized games, searches by name or provider, and filters by category. Bearbet stores local availability and curation without changing the provider's source data.

### 4. Launch a game

Bearbet verifies the user, game, and playable balance. It creates a game session and asks the configured casino provider for a launch URL.

### 5. Play and update the wallet

The provider sends bets, wins, and refunds. Bearbet authenticates each callback, resolves the user, session, game, and round, records the provider operation, moves the wallet balance, and inserts ledger evidence in one database transaction.

An identical callback returns the original response without moving funds again.

### 6. Use a bonus

The user receives or activates a bonus award. Eligible bets advance its wagering total. The award completes, expires, or is cancelled according to its definition. A completed award converts funds once.

### 7. Review activity

Transaction history reads from wallet ledger entries. Bet history reads from game rounds and provider operations. These are views over existing facts, not additional duplicate entities.

### 8. Use demo funding

The user can create a demo top-up and request a simulated withdrawal. The wallet ledger records both. A withdrawal has its own lifecycle because an admin must approve or reject it.

## Required admin journey

An administrator can:

- Find users, inspect profiles and balances, suspend or activate accounts, adjust demo funds, and assign bonuses.
- Inspect synchronized games and change local status, category, and featured state.
- Create and update bonus definitions.
- Inspect wallet and gameplay activity.
- Approve or reject simulated withdrawals.

Admin is an application area, not a standalone data entity. Admin actions operate on the user, wallet, game, bonus, and withdrawal domains. Non-financial admin changes should also create audit records.

## Better Auth ownership

Use the Better Auth `user` table as the Bearbet user record. Do not add a separate `user_profile` table for the MVP.

Better Auth core owns:

- `user`
- `session`
- `account`
- `verification`

The username plugin can own normalized unique usernames. The admin plugin can own:

- `role`, with `user` as the default and `admin` for administrators
- `banned`
- `banReason`
- `banExpires`

Bearbet adds these fields to the Better Auth user model:

- `firstName`
- `lastName`
- `dateOfBirth`
- `country`, stored as an ISO country code
- `currency`, stored as an ISO currency code

Better Auth's required `name` field can be derived from first and last name. In product language, `banned` maps to the account status `suspended`; an unbanned user is `active`.

Public registration must never accept role, banned state, wallet balance, or email-verification status from the browser.

## Core entities

### User

Identity, profile, role, status, and registration metadata. Better Auth owns the table and Bearbet extends its supported user schema.

### Wallet

One wallet per user and currency for the MVP. Proposed fields include:

- `cashBalanceMinor`
- `bonusBalanceMinor`
- `reservedCashMinor`
- `currency`
- timestamps

Keeping cash, bonus, and reserved cash on one locked row makes balance checks and provider callbacks easier to transact safely. Money uses integer minor units.

### Ledger entry

An immutable record of every balance movement. It stores the affected balance bucket, signed amount, balance before and after, operation type, status, user, source, actor, related gameplay or bonus reference, and timestamp.

Types include welcome credit, demo top-up, bet, win, refund, withdrawal reserve, withdrawal release, bonus credit, bonus conversion, and admin adjustment.

### Game provider

The content vendor reported by the casino integration, such as Evolution. It supports provider filtering and provider-level metadata. Drakon itself is the integration provider, not necessarily the content vendor.

### Game

The normalized catalogue item. It stores the external game ID, integration provider, content provider, name, category, artwork, launch metadata, provider availability, local enabled state, featured state, and sync timestamps.

### Game session

A user's attempt to launch and play one game. It stores user, game, integration provider, mode, currency, external session ID when supplied, status, launch error code, and timestamps.

### Game round

Groups gameplay activity using the provider round ID, session, game, and user. Bet history can calculate total bet, total win, and net result from its operations.

### Provider operation

Stores a normalized bet, win, or refund callback. It contains provider transaction ID, operation type, fingerprint, amount, round, session, original operation for refunds, stored response, status, and timestamps.

The idempotency constraint is integration provider plus operation type plus external transaction ID. The fingerprint detects conflicting reuse of the same key.

### Bonus definition

Reusable bonus configuration: type, amount, wagering multiplier, required wager, expiry, eligibility, minimum simulated deposit, maximum award, conversion rule, and active state.

### Bonus award

A definition granted to one user. It snapshots the applicable rules and stores awarded amount, required wager, completed wager, remaining wager, status, activation, expiry, and completion timestamps.

Wagering progress can remain on this record for the MVP. Add a separate contribution table only if we need to explain exactly which bets contributed to progress.

### Withdrawal

The simulated withdrawal request and its pending, approved, or rejected lifecycle. It stores requested amount, reserved amount, user, reviewer, reason, and timestamps. Related ledger entries record the actual wallet movements.

### Admin audit entry

Records non-financial administrative actions such as suspending a user, changing a game, or editing a bonus. Financial admin adjustments already have ledger evidence but may also reference the audit entry.

## Relationships

```text
Better Auth user
  ├── sessions and accounts
  ├── 1 wallet
  │     └── many ledger entries
  ├── many game sessions
  │     └── many game rounds
  │           └── many provider operations
  │                 └── related ledger entries
  ├── many bonus awards
  │     └── related ledger entries
  └── many withdrawals
        └── related ledger entries

game provider ──< games ──< game sessions
bonus definition ──< bonus awards
admin user ──< admin audit entries
```

## Models we should not duplicate

- No separate profile table unless Better Auth additional fields become limiting.
- No transaction-history table. Query the ledger.
- No bet-history table. Query rounds and provider operations.
- No balance-history table. The ledger already records before and after balances.
- No wagering-progress table initially. Store progress on the bonus award.
- No repository interfaces around Drizzle without a concrete reason.

## Decisions needed before schema implementation

1. Can users sign in with username as well as email? Recommended: yes, use Better Auth's username plugin.
2. Is username immutable? Recommended: yes for the MVP because it may appear in provider identity and audit records.
3. What minimum age does registration enforce? Recommended: 18, while keeping the policy isolated for later country-specific rules.
4. Can a user change currency after the wallet exists? Recommended: no.
5. Does one wallet row hold cash, bonus, and reserved balances? Recommended: yes for the MVP.
6. Which balance funds a bet, and where are wins returned? This requires worked examples before finalizing wallet and bonus fields.
7. Does every eligible bet advance wagering, or only bets funded by bonus balance?
8. What happens to remaining bonus funds when wagering completes or expires?

## First schema slice

Do not model every P0 table at once. The first migration should prove account creation and ownership with:

1. Better Auth `user`, `session`, `account`, and `verification` tables.
2. Better Auth username and admin plugin fields.
3. Bearbet user fields on the Better Auth user table.
4. `wallet`.
5. `ledger_entry`.

The first verified flow is:

```text
Register → user created → wallet provisioned → welcome ledger entry inserted
→ session survives restart → profile and balances load → suspended user is rejected
```

Once that passes under retry and concurrency tests, add catalogue and gameplay entities for the simulator slice.
