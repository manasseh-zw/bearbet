# Bearbet domain model

Status: the identity, player, wallet, and welcome-credit model is implemented. Money, wagering, and withdrawal rules are locked. Catalogue, gameplay, bonus, withdrawal, and admin-audit entities remain planned.

## Required player journey

### 1. Create an account

The visitor registers with username, email, password, first name, last name, date of birth, country, and currency.

Better Auth creates the user, credential account, and session records. Bearbet then provisions the player, wallet, and `$1,000.00` welcome credit in one retry-safe database transaction.

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

Better Auth owns identity. Bearbet stores casino participation in a separate one-to-one `player` table. Do not call the Bearbet table `account`, because Better Auth already uses that name for credential and OAuth provider accounts.

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

The Better Auth user model contains:

- email and email-verification state
- required display name
- normalized unique username and display username from the username plugin
- role and banned state from the admin plugin

The Bearbet player model contains first name, last name, date of birth, and ISO country code. The wallet owns the selected ISO currency code because currency constrains every balance. Better Auth's required `name` is derived from first and last name during registration. In product language, `banned` maps to `suspended`; an unbanned user is `active`.

Public registration must never accept role, banned state, wallet balance, or email-verification status from the browser.

## Core entities

### User

Authentication identity, role, status, and registration metadata. Better Auth owns the table and its generated schema.

### Account

Better Auth's credential or OAuth-provider link. An email/password user has a credential account containing the password hash. This is not the Bearbet player profile.

### Player

The casino-domain extension of a Better Auth user. Its `userId` is both its primary key and foreign key, which enforces the one-to-one relationship without another identifier. Administrators do not need a player record unless they also participate as players.

### Wallet

One wallet per player for the MVP. It contains:

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
  ├── sessions and credential accounts
  └── 0 or 1 player
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

- No second profile or domain account table beside `player`.
- No transaction-history table. Query the ledger.
- No bet-history table. Query rounds and provider operations.
- No balance-history table. The ledger already records before and after balances.
- No wagering-progress table initially. Store progress on the bonus award.
- No repository interfaces around Drizzle without a concrete reason.

## Settled identity and wallet choices

- Users can sign in with username or email.
- Usernames are immutable.
- One player has one wallet for the MVP.
- The wallet stores cash, bonus, and reserved cash as integer minor units.
- Currency is selected during registration and cannot change after wallet creation.
- Better Auth owns identity, sessions, credentials, roles, and banned state. Bearbet owns the player and wallet.
- Player provisioning and the `$1,000.00` welcome credit are retry-safe and covered by an integration test.

## Settled gameplay, bonus, and withdrawal rules

- Eligible bets spend bonus before cash. Ineligible bets spend cash only.
- Only the bonus-funded portion of an eligible bet advances wagering.
- Wins return to their funding buckets. Mixed wins use the original stake ratio, rounded down for bonus with the remainder assigned to cash.
- Refunds restore the original stake buckets and reverse the matching wagering contribution.
- Completed awards convert remaining bonus funds to cash once. Expired or cancelled awards forfeit the remainder. Empty awards become exhausted.
- One player may have one active bonus award in the MVP.
- Playable and provider-reported balance is cash plus bonus. Reserved cash is excluded.
- Withdrawals reserve cash on request, consume the reserve on approval, and release it on rejection.
- Wallet currency is immutable. The MVP accepts USD, ZAR, and GBP and performs no conversion.
- Registration requires the player to be at least 18 years old.
