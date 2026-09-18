# BigBang sandbox findings

Observed on 2026-09-17 with a BearBet BigBang sandbox key. Credentials and signed game URLs are intentionally omitted.

## Proven behavior

- `GET /api/v1/games?type=standard&limit=9` returned a usable Standard catalogue with IDs, display titles, providers, game types, and artwork.
- `POST /api/v1/users/create` accepted a BearBet-owned player ID and returned a sandbox USD player.
- `POST /api/v1/games/launch` for that player returned a signed session URL.
- The returned URL loaded a playable BigBang game in an iframe and in a browser tab.
- BearBet has a temporary public route at `/bigbang-sandbox`. It lists nine sandbox games, creates an isolated provider-side player, launches a non-demo sandbox session, and embeds it in an iframe so genuine Wallet RGS callbacks can be captured. It does not read or change the BearBet database or wallet.
- `CASINO_PROVIDER=BIGBANG` is accepted. The BigBang adapter can synchronize the Standard catalogue and create a provider player plus a non-demo sandbox launch URL through the shared `CasinoProvider` contract.

## Verified contract

BigBang's public documentation is at <https://api.bigbangcasino.bet/docs/>.

- The REST base is `https://api.bigbangcasino.bet/api/v1`.

## Event-webhook fallback

Provider-originated seamless wallet callbacks did not reach the configured public
receiver during repeated sandbox rounds, even though direct probes through the
same ngrok tunnel succeeded. BearBet therefore has a capture-only
`POST /api/bigbang/webhook` route for the separate event webhook stream. It records
`session.started`, `round.completed`, and `session.ended` payloads without changing
wallet funds.

BigBang documents HMAC-SHA256 webhook signing but does not document the exact
canonical input. The route must remain capture-only until a genuine event exposes
the payload and signature placement. After that evidence is recorded, add signature
verification and map `round.completed` into an idempotent reconciliation command.

## Fresh tunnel validation

On 2026-09-18, the original Vite process and ngrok tunnel were stopped. A new
process and tunnel were started at `https://a3e8-197-221-251-233.ngrok-free.app`.
Vite initially rejected that hostname with HTTP 403 before routing requests, so the
development server now allows `.ngrok-free.app` hosts. Direct local and public
probes then returned HTTP 200.

The dashboard webhook, `user_data`, and `balance_change` URLs were replaced with
the new tunnel and persisted. A fresh non-demo sandbox session launched and a $1.50
spin changed the BigBang player balance to $99,998.50. The new tunnel recorded no
provider-originated wallet or event webhook request. Only the manual probes were
received. This rules out the old tunnel as the cause and leaves the BigBang wallet
mode or provider-side callback dispatch as the remaining issue.
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

## Wallet callback capture result

On 2026-09-18, BearBet repeated the sandbox test with an append-only receiver capture and browser-controlled gameplay:

- The dashboard retained the current ngrok `user_data` and `balance_change` URLs, and the configured `ek_test_` key matched BearBet's key.
- Both callback URLs returned HTTP `200` through ngrok immediately before the game test.
- BearBet created player `bearbet-sandbox-d40e3bf0-dd35-4a15-bb2a-83bb0e9a6d00`, launched Amusnet game `333854` without `demo: true`, and completed a 1.50 USD spin.
- BigBang's player API reported the provider-held balance changed from 100000.00 to 99998.50 USD.
- BigBang sent no `user_data` or `balance_change` request. BearBet's receiver file and ngrok inspector both recorded zero provider callbacks for the player.
- BearBet repeated the test with a previously unknown `bearbet-seamless-*` token and deliberately skipped `POST /users/create` in case explicit player creation selected managed-wallet mode. BigBang still auto-created the provider player, processed the 1.50 USD debit in its own wallet, and sent zero callbacks.

This contradicts the dashboard statement that sandbox wallet callbacks fire with `sandbox: true`. The tested sandbox session used BigBang's managed synthetic wallet even though Wallet RGS URLs were saved. Treat sandbox Wallet RGS support as a provider-side blocker until BigBang fixes or explains the account configuration. Do not redesign BearBet's money engine around the documented callback shape without provider-originated evidence.

## Hybrid submission plan

The submission should present two complementary paths rather than pretending the
BigBang sandbox is BearBet's authoritative wallet:

1. The fixture simulator remains the canonical BearBet wallet demonstration. It
   exercises the real gameplay service, wallet policy, immutable ledger, round
   history, bonus rules, retries, and insufficient-funds behavior. Its outcomes
   are fully reconcilable because BearBet owns every movement.
2. BigBang remains the playable provider demonstration. It supplies a genuine
   catalogue, signed game session, and provider-managed virtual balance. The UI
   must label this path as a provider sandbox and must not claim that each spin
   produced a BearBet ledger operation.

The provider balance update can still make the hybrid experience more realistic,
but only as an explicit session-level reconciliation:

- At launch, create an authenticated BearBet-to-BigBang player mapping and store
  the provider balance snapshot for that session.
- At an explicit session close/reconcile action, fetch the same provider
  player's current balance and calculate `netDelta = final - initial`.
- If the sandbox reconciliation feature is enabled, apply only that delta to a
  dedicated, idempotent BearBet reconciliation operation. Never copy the
  provider's absolute `100000.00` synthetic balance into the BearBet wallet.
- Show the delta as a session summary and label it asynchronous. It is not a
  per-round bet/win history and cannot prove real-time insufficient-funds
  enforcement.
- If a session is abandoned or the final balance cannot be fetched, leave the
  reconciliation pending rather than guessing.

This bridge is safe only behind an authenticated player session, an explicit
sandbox flag, a stored baseline, and a unique reconciliation key. The current
public throwaway launcher intentionally has none of those properties, so it
must not mutate BearBet balances. Until that authenticated flow is implemented,
the fixture simulator is the wallet source of truth and BigBang is the gameplay
source of truth.

## Remaining integration work

Bearbet now exposes separate `user_data` and `balance_change` routes. The balance-change boundary limits request size, validates the documented HMAC, parses signed decimal amounts into integer minor units, and rejects live money changes until the financial mapping is complete. Sandbox callbacks return the synthetic balance without touching Bearbet funds. A public ngrok probe confirmed both routes return successful responses, but a provider-originated callback still needs to be captured.

1. Capture BigBang-originated sandbox callbacks and verify the observed payload, signature string representation, player identity, retry behavior, and event types.
2. Persist duplicate callback responses by `transaction_id` before enabling live money changes.
3. Decide on the live contract before connecting monetary callbacks. Standard games provide signed balance deltas with `round` metadata; Premium can provide separate bet, win, and refund events. A live seamless-wallet key or provider confirmation is needed before Bearbet changes its round model.
4. Synchronize the BigBang catalogue into PostgreSQL, expose it in the normal lobby, and replace the throwaway launcher with the persisted Bearbet game-session UI. This authenticated hybrid bridge is now implemented; the configured sandbox catalogue currently imports 3,247 Standard games.
5. Add provider-originated proof that a real callback produces one correct wallet operation, ledger movement, round result, and history entry.

Do not use sandbox callbacks to alter BearBet balances. The fixture provider remains the repeatable, database-backed demo for the current project.

## Authenticated hybrid bridge status

The normal player route now uses BigBang when `CASINO_PROVIDER=bigbang`. It
creates the provider player with the signed-in BearBet user ID, stores the
signed launch URL and provider session ID, and captures the managed sandbox
balance before play. Ending the iframe session fetches the provider balance and
applies only `final - launch` as one idempotent `provider_reconciliation`
operation when the key is a sandbox key. The provider's absolute synthetic
balance is never copied into the BearBet wallet, and the existing public
`/bigbang-sandbox` route remains capture-only.
