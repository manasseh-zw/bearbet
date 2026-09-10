# Drakon V0 findings

Observed against a live self-registered Drakon agent during the Greenbear V0 proof. Credentials, callback keys, and session URLs are intentionally omitted.

## Proven behavior

- Authentication accepts `Bearer base64(agent_token:agent_secret)` and returns an access token.
- `/games/all` returned 15,383 real catalogue entries.
- A public callback endpoint works through an ngrok tunnel.
- Drakon appends `/drakon_api` to the Site Endpoint configured in its dashboard.
- Dashboard probes for `user_balance`, `transaction_bet`, `transaction_win`, and `refund` passed, and Drakon displayed `Integração aprovada!`.
- The prototype debits bets, credits wins, reverses compatible operations, and ignores identical callback retries.

## Undocumented live behavior

### Catalogue compatibility

Catalogue entries include `only_demo`, which the guide omits. In practice:

- `only_demo=1` is required for `mode=fun`.
- A fun-mode request for `only_demo=0` returns HTTP `422` with `FUN_MODE_NOT_AVAILABLE`.
- A client should filter the fun-mode catalogue and validate again before launch.

### Callback URL and credentials

- The dashboard adds `/drakon_api` to the configured endpoint.
- Dashboard callbacks include `agent_code`, `agent_token`, and `agent_secret_key` in JSON, although the guide documents no callback authentication fields.
- The V0 required an unguessable URL key and checked supplied agent credentials with timing-safe comparisons.
- The production authentication/signature contract still needs confirmation.

### Dashboard probes differ from gameplay rules

- Dashboard win and refund tests arrive as standalone operations with new rounds and no matching prior bet.
- The checker only requires a numeric `balance` response.
- The bet probe includes `bet`, `amount`, and `win: 0`; the win probe includes `win`, `amount`, and `bet: 0`.
- Select the monetary value according to `method`, rather than choosing the first generic amount field.
- Compatibility exceptions should be limited to authenticated `game=test_game` probes. Normal gameplay remains strict.

## Current launch blocker

Drakon returns HTTP `200` when it fails to create a playable session. A fresh fun-mode request for demo-compatible game `2108` returned a game object with `only_demo: 1`, followed by:

```json
{ "game_url": "https://gator.drakon.casino/game-error" }
```

The page reports `GAME_UNAVAILABLE`; the response gives no underlying error. The result remained after callback integration approval:

- Eight `only_demo=1` games across eight providers failed in fun mode.
- Real-mode games also failed.
- The dashboard Error Logs page remained empty.
- The dashboard showed zero platform and agent balance.
- The dashboard offered paid top-ups, but neither the guide nor dashboard states that fun mode requires funding.

This failure occurs before iframe navigation. Opening `/game-error` in a new tab shows the same problem; framing is not its cause. A real game URL is session-specific and cannot be constructed from the catalogue entry.

The evidence points to account-level provider/game enablement, test credit, or another undocumented launch prerequisite. Do not purchase credit merely to diagnose it without written confirmation.

## Campaign API investigation

- The agent can list 20 campaign vendors and retrieve USD campaign limits.
- Game `2108` returned valid campaign limits but still failed normal game launch.
- Free spins are assignments layered onto an existing launch. The documented campaign flow ends by launching the game normally.
- Creating a campaign is not a safe launch diagnostic because the API documents `AGENT_BALANCE_TOO_LOW`, provider-side processing, and agent business rules.

## Questions requiring Drakon or account-owner confirmation

1. Is agent balance required for `only_demo=1` games in fun mode?
2. Can the supplied agent receive sandbox credit and provider access?
3. Which provider and game ID are guaranteed to launch on an unfunded test agent?
4. Why does launch return HTTP `200` with `/game-error` instead of a structured error?
5. Is callback approval checked synchronously during launch?
6. Do production callbacks always contain the three agent credential fields used by the dashboard tester?

The task owner has offered an existing approved Drakon agent. Bearbet should use that account for final live verification while retaining a simulated provider for independent development.
