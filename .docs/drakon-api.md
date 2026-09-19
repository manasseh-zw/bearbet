# Drakon integration reference

> Historical reference only. Drakon is not an active Bearbet delivery
> dependency. The current playable path uses the fixture simulator plus the
> authenticated BigBang bridge.

Normalized from `drakon_api_integration_en_v1.pdf`. Base URL:

```text
https://gator.drakon.casino/api/v1
```

This file describes the published contract. Verified differences in the live system are recorded separately in `drakon-v0-findings.md`.

## Authentication

`POST /auth/authentication`

Send:

```http
Authorization: Bearer <base64(agent_token:agent_secret)>
Accept: application/json
```

Successful response:

```json
{ "access_token": "..." }
```

Use the returned token on protected requests:

```http
Authorization: Bearer <access_token>
```

Cache the token server-side and refresh it after an authorization failure. Never expose agent credentials or access tokens to the browser.

## Providers and games

### Provider catalogue

`GET /games/provider`

Response:

```json
{
  "status": true,
  "providers": [
    { "code": "evolution", "name": "Evolution", "rtp": 95 }
  ]
}
```

### Game catalogue

`GET /games/all`

Response fields include:

| Field | Required | Meaning |
| --- | --- | --- |
| `game_id` | Yes | Provider-facing launch identifier |
| `game_code` | No | Game code when supplied |
| `game_name` | Yes | Display name |
| `provider_game` | Yes | Provider name/code |
| `rtp` | No | Reported return-to-player value |
| `banner` | No | Artwork URL |

The live API adds fields not shown in the guide. Normalize provider data at the integration boundary and keep the raw provider payload out of application code.

## Game launch

`GET /games/game_launch`

Required query parameters:

| Field | Value |
| --- | --- |
| `agent_code` | Code issued by Drakon |
| `agent_token` | Token issued by Drakon |
| `game_id` | ID returned by `/games/all` |
| `currency` | Player wallet currency, such as `USD` |
| `lang` | Session language, such as `en` |
| `user_id` | Stable Bearbet user identifier |
| `user_name` | Player display name |
| `type` | Always `CHARGED` |
| `mode` | `real` or `fun` |

Expected response:

```json
{ "game_url": "https://play.example.com/session/abc123" }
```

Open that session URL in an iframe, redirect, or new tab as the provider permits. A URL that points to Drakon's `/game-error` route is not a successful session even if the HTTP response is `200`.

## External wallet webhook

Bearbet exposes one low-latency `POST` endpoint. Drakon selects the operation using `method`.

Supported methods:

- `account_details`
- `user_balance`
- `transaction_bet`
- `transaction_win`
- `refund`

The callback must avoid external network calls and slow database work. Keep indexed lookups for users, wallets, provider transaction IDs, sessions, and rounds.

### `account_details`

Request:

```json
{ "method": "account_details", "user_id": "12345" }
```

Success:

```json
{
  "email": "user@example.com",
  "name_jogador": "John Silva",
  "date": "2026-03-25T10:00:00Z"
}
```

Unknown user:

```json
{ "status": false, "error": "INVALID_USER" }
```

### `user_balance`

Request:

```json
{ "method": "user_balance", "user_id": "12345" }
```

Success:

```json
{ "status": 1, "balance": 1500.75 }
```

Unknown user:

```json
{ "status": 0, "error": "INVALID_USER" }
```

### `transaction_bet`

Required fields are `user_id`, `transaction_id`, `session_id`, `round_id`, `game`, and `bet`.

```json
{
  "method": "transaction_bet",
  "user_id": "12345",
  "transaction_id": "bet_987654",
  "session_id": "sess_001",
  "round_id": "round_1001",
  "game": "51096",
  "bet": 100
}
```

Debit the wallet once and return the updated balance:

```json
{ "status": true, "balance": 1400.75 }
```

Published errors include `NO_BALANCE` and `DOUBLED_BET`.

### `transaction_win`

Required fields are `user_id`, `transaction_id`, `session_id`, `round_id`, `game`, `bet`, and `win`.

```json
{
  "method": "transaction_win",
  "user_id": "12345",
  "transaction_id": "win_987655",
  "session_id": "sess_001",
  "round_id": "round_1001",
  "game": "51096",
  "bet": 100,
  "win": 250
}
```

Credit only the `win` value; the bet was handled previously. Return the new balance. Published errors include `NO_AMOUNT` and `INVALID_TRANSACTION`.

### `refund`

Required fields are `user_id`, `transaction_id`, `session_id`, `round_id`, `game`, and `amount`.

```json
{
  "method": "refund",
  "user_id": "12345",
  "transaction_id": "ref_987656",
  "session_id": "sess_001",
  "round_id": "round_1001",
  "game": "51096",
  "amount": 100
}
```

- Reversing a bet credits the player.
- Reversing a win debits the player.
- Apply each reversal once.
- A refund may reuse the original bet's `transaction_id`.
- Locate the original using user, round, operation type, and amount; prefer a compatible win, then a bet, as directed by the guide.

## Idempotency and persistence

- Treat bets, wins, and refunds as idempotent.
- Store provider transaction ID, round ID, type, complete financial fingerprint, and original response.
- An identical retry returns consistently without moving money again.
- Do not assume that `transaction_id` is globally unique across operation types.
- The guide recommends `UNIQUE(transaction_id, type)` plus an index on `(user_id, round_id, type)`.
- Use a database transaction and wallet row lock or equivalent atomic update for every balance movement.

Use fixed-precision database values or integer minor units. Do not calculate money with JavaScript floating-point values.

## Published error codes

| Code | Meaning |
| --- | --- |
| `INVALID_USER` | User missing or has no active wallet |
| `NO_BALANCE` | Insufficient balance for a bet |
| `DOUBLED_BET` | Bet already registered |
| `NO_AMOUNT` | Missing or invalid win/refund amount |
| `INVALID_TRANSACTION` | No compatible transaction for the round |

## Published operational flow

1. Authenticate.
2. Synchronize providers and games.
3. Open a game through `/games/game_launch`.
4. Receive callbacks.
5. Respond to account and balance reads in real time.
6. record bets, wins, and refunds.

The guide recommends hosting callback infrastructure near France, using fast indexed storage, monitoring latency and errors, and avoiding proxies or application work that delays callbacks. Bearbet should keep HTTPS in production even though the guide contains an unusual suggestion to use direct HTTP for latency.

## Campaign/free-spin note

The separate campaign API creates and manages promotional free-spin assignments. It does not create an alternative playable session: after assignment, the user still launches the game through the normal game-launch flow. Campaign creation can be rejected for insufficient agent balance or provider configuration, so it is not a substitute for test-agent game access.
