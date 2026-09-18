# BigBang sandbox findings

Observed on 2026-09-17 with a BearBet BigBang sandbox key. Credentials and signed game URLs are intentionally omitted.

## Proven behavior

- `GET /api/v1/games?type=standard&limit=9` returned a usable Standard catalogue with IDs, display titles, providers, game types, and artwork.
- `POST /api/v1/users/create` accepted a BearBet-owned player ID and returned a sandbox USD player.
- `POST /api/v1/games/launch` for that player returned a signed session URL.
- The returned URL loaded a playable BigBang game in an iframe and in a browser tab.
- BearBet has a temporary public route at `/bigbang-sandbox`. It lists nine sandbox games, creates a fresh demo URL server-side, and embeds it in an iframe. It does not read or change the BearBet database or wallet.
- `CASINO_PROVIDER=BIGBANG` is accepted. The BigBang adapter can synchronize the Standard catalogue and create a provider player plus a non-demo sandbox launch URL through the shared `CasinoProvider` contract.

## Verified contract

BigBang's public documentation is at <https://api.bigbangcasino.bet/docs/>.

- The REST base is `https://api.bigbangcasino.bet/api/v1`.
- A sandbox key has the `ek_test_` prefix, costs nothing, has an automatic virtual balance, and is limited to Standard games.
- The game catalogue comes from `GET /games`; a launch is created by `POST /games/launch`.
- A non-demo launch requires a provider player created through `POST /users/create`. Demo launch uses `demo: true` and does not require a player.
- BigBang can run in managed-wallet or seamless-wallet mode. Seamless mode uses a `user_data` balance-read URL and a `balance_change` URL configured in its dashboard.
- `balance_change` signs `username + amount + game + game_category + transaction_id` with HMAC-SHA256 keyed by the API key. It retries the same transaction ID, so a receiver must be idempotent.

## Sandbox limits

The working iframe proof does not prove BearBet money movement.

- Demo launches have no wallet callbacks.
- Sandbox callbacks carry `sandbox: true`. BigBang's documentation says receivers should return the synthetic balance and skip real balance changes.
- Standard games report one net round movement. BearBet's current gameplay engine records separate bet, win, and refund operations, so it cannot safely infer a stake and settlement from that net callback.
- Separate `bet`, `win`, and `refund` movements are documented for Premium games. Sandbox keys cannot launch Premium games.

## Remaining integration work

Bearbet now exposes separate `user_data` and `balance_change` routes. The balance-change boundary limits request size, validates the documented HMAC, parses signed decimal amounts into integer minor units, and rejects live money changes until the financial mapping is complete. Sandbox callbacks return the synthetic balance without touching Bearbet funds. A public ngrok probe confirmed both routes return successful responses, but a provider-originated callback still needs to be captured.

1. Capture BigBang-originated sandbox callbacks and verify the observed payload, signature string representation, player identity, retry behavior, and event types.
2. Persist duplicate callback responses by `transaction_id` before enabling live money changes.
3. Decide on the live contract before connecting monetary callbacks. Standard games provide signed balance deltas with `round` metadata; Premium can provide separate bet, win, and refund events. A live seamless-wallet key or provider confirmation is needed before Bearbet changes its round model.
4. Synchronize the BigBang catalogue into PostgreSQL, expose it in the normal lobby, and replace the throwaway launcher with the persisted Bearbet game-session UI.
5. Add provider-originated proof that a real callback produces one correct wallet operation, ledger movement, round result, and history entry.

Do not use sandbox callbacks to alter BearBet balances. The fixture provider remains the repeatable, database-backed demo for the current project.
