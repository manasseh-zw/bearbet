# Bearbet MVP task brief

Normalized from `TEST-BREIF-CASINO.pdf`. This document captures the requested product without the PDF's repeated explanations.

## Product

Build a modern casino-only demo platform with original Bearbet branding. Stake is the main experience reference: dark presentation, compact navigation, prominent wallet balance, large game artwork, fast browsing, and responsive layouts. Winly365 is an additional reference for a conventional casino lobby with search, providers, categories, promotions, account access, and support entry points.

The product must not copy either reference's branding, assets, or proprietary interface. Sportsbook, esports, and other non-casino products are outside scope.

All money is virtual:

- No payment gateway or payment API.
- No real deposits, withdrawals, bets, or financial transactions.
- New users receive a $1,000 demo cash balance.
- Cash and bonus balances remain separate.

## Required end-to-end experience

```text
Register → Login → Receive $1,000 → Browse/Search Casino → Launch Game
→ Bet → Win or Lose → Wallet Updates → Activate Bonus → Complete Wagering
→ View Bet and Transaction History
```

An administrator must be able to manage users, demo balances, bonuses, games, transactions, and simulated withdrawals.

## Architecture

```text
Browser → Bearbet backend → provider boundary → fixture simulator or BigBang
                                      ↑
                         provider-specific callbacks (when available)
```

- Sensitive provider credentials remain on the server.
- Bearbet owns users, wallets, bonuses, wagering progress, transactions, favourites, and recently played games.
- Keep the casino integration behind a provider boundary so the fixture and BigBang paths can evolve without rebuilding the product.
- Persist gameplay operations idempotently so callback retries cannot move money twice.

### Superseding provider decision

The original brief assumed Drakon as the external provider. That integration was
tested but is not usable for the current delivery: playable launches repeatedly
ended at the provider's `/game-error` page even after callback probes passed.
The implementation decision now supersedes that assumption:

- The deterministic fixture simulator is the canonical Bearbet wallet, bonus,
  immutable-ledger, and per-round history demonstration.
- BigBang is the genuine playable-provider path. Its authenticated bridge stores
  the provider balance baseline after launch and reconciles only the final
  session delta at explicit close.
- BigBang sandbox callbacks remain capture-only when they are absent or do not
  expose a compatible per-round contract. They must not be used to invent
  Bearbet bet, win, or refund operations.
- Drakon code and findings remain historical evidence only and are not a release
  dependency.

## Functional requirements

### Authentication and profile

- Register, log in, log out, reset password, change password, and maintain a session.
- Registration fields: username, email, password, first name, last name, date of birth, country, and currency.
- Email verification may be simulated.
- Profile displays personal details, status, registration date, cash balance, bonus balance, and total balance.
- Initial roles are `user` and `admin`; 2FA can follow the MVP.

### Demo wallet

- Keep separate cash and bonus balances.
- Credit every new user with $1,000 cash.
- Allow test top-ups of $100, $500, $1,000, or $10,000.
- Record demo deposits as completed transactions.
- Simulated withdrawals begin as pending; an admin approves or rejects them.
- Validate withdrawable cash before creating a withdrawal.
- Admins can add or remove demo funds with an auditable adjustment.

### Casino lobby and catalogue

- Synchronize games from the configured provider rather than hardcoding them. The active external catalogue is BigBang; the fixture catalogue remains the deterministic fallback.
- Store provider game ID, name, provider, category where available, thumbnail, status, and launch metadata.
- Support search by name, provider, and category.
- Present useful sections such as featured, popular, new, categories, favourites, and recently played.
- Categories depend on provider data and may include slots, live casino, blackjack, roulette, baccarat, crash, dice, mines, game shows, table games, and other.
- Game cards show artwork, name, provider, favourite control, and play action.

### Game launch and gameplay

When Play is selected:

1. Require an authenticated, active user.
2. Check the applicable wallet balance.
3. create or validate a provider session using Bearbet's user ID.
4. Open the returned game URL.
5. Process bets, wins, and refunds through Bearbet's wallet.
6. Update wagering progress for qualifying bets.
7. Record the session and all financial operations.
8. Show a useful error when the provider cannot launch the game.

### Transactions and history

Supported ledger types include bet, win, refund, demo deposit, demo withdrawal, bonus credit, bonus conversion, and manual adjustment.

Each operation should record:

- Internal ID and provider transaction ID.
- User, currency, type, amount, status, and timestamp.
- Balance before and after.
- Game, session, and round identifiers when applicable.
- Source or actor for administrative operations.

Bet history shows game, date, bet, win, net result, round, provider transaction IDs, and status. Transaction history includes wallet, gameplay, bonus, and administrative movements with basic filters.

### Bonuses and wagering

Initial bonus types are welcome, simulated deposit, and promotional bonuses. A bonus configuration supports amount, wagering multiplier, required wager, expiration, eligible games or categories, simulated minimum deposit, and maximum award.

Track required, completed, and remaining wagering; progress percentage; eligibility; expiration; and status. Every qualifying bet advances progress. When complete, apply the configured conversion rule and record the conversion.

### Favourites and recently played

- Users can add, remove, and view favourite games.
- Store recently played games per user.
- These are P1 according to the supplied priority list.

### Admin

Users:

- List and search users; inspect profiles and balances.
- Add or remove demo funds and assign bonuses.
- Suspend or activate accounts.

Games:

- View synchronized games.
- Enable or disable, categorize, feature, or unfeature games locally.

Bonuses:

- Create and edit configurations.
- Activate or deactivate them.
- Configure value, wagering multiplier, expiration, and eligible games.

Operations:

- Inspect transactions, bets, wins, deposits, withdrawals, and adjustments.
- Approve or reject simulated withdrawals.

## Security, errors, and operations

- Hash passwords and use secure sessions.
- Validate all inputs and authorize every user/admin action.
- Apply rate limits where abuse matters.
- Authenticate callbacks and keep provider credentials server-only.
- Never expose secrets or internal provider responses to users.
- Handle provider downtime, unavailable games, insufficient balance, invalid sessions, duplicate operations, timeouts, and network errors.
- Log authentication, launches, wallet changes, provider callbacks and errors, bonuses, and admin actions without credentials or sensitive payloads.

## Priorities from the assignment

### P0

- Registration/login and profile.
- Cash and bonus wallets with demo funding.
- Provider-boundary catalogue and launch handling, with the fixture simulator proving bet, win, refund, and wallet behavior and BigBang supplying genuine playable sessions.
- Bonus and wagering systems.
- Search, categories, transaction history, and bet history.
- Admin panel, responsive UI, basic security, and error handling.

### P1

- Favourites and recently played.
- Notifications and advanced filters.
- 2FA, user limits, VIP, cashback, referral, and loyalty systems.

## Required integration proof

Before treating the provider integration as complete, prove:

```text
Provider authentication → Catalogue → Display games → Launch one game
→ Identify Bearbet player → Playable provider session or fixture round
→ Wallet/history proof → Persist transaction evidence
```

The technical evidence should identify endpoints, authentication, launch and
player identity, wallet callbacks where they exist, transaction behavior, and
provider limitations. BigBang evidence and the authenticated hybrid bridge are
the active external-provider proof; the Greenbear V0 and Drakon findings are
archival investigation records.

## Definition of done

The user flow above works from registration through gameplay, bonus wagering, and history. The admin flow supports user, wallet, bonus, game, transaction, and withdrawal management. The UI is responsive and presentable, all funds remain virtual, and provider credentials remain on the backend.
