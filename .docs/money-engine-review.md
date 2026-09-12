# Money engine review

Review date: 2026-09-12. Scope: wallet, bonus, gameplay, simulator, withdrawals, Drakon callback wiring, schema constraints, and existing policy and integration tests. Production code was not changed.

## Findings

### P1: Late wins recreate cancelled bonus funds

`gameplay.service.ts`, `recordWin`, credits the original bonus share and updates the original award without checking its status. Cancellation is allowed while bets remain unsettled. A subsequent win therefore credits bonus funds to a cancelled award, and finalization ignores that terminal award.

PostgreSQL reproduction: activate 10,000 bonus, bet 4,000, cancel, then settle an 8,000 win. Expected bonus balance: 0. Actual: 8,000. A new award activated between cancellation and settlement makes this worse: the old award is assigned the aggregate wallet bonus balance, mixing award ownership.

Small fix: define cancellation with outstanding bets explicitly. Either reject cancellation until settlement, or lock the original award and apply a terminal-state allocation rule to late wins. Preserve the cash-funded share and record the forfeited bonus share in the operation evidence. Never assign a terminal award the current aggregate bonus balance.

### P1: Capped wagering cannot be reversed exactly

`bonus.policy.ts`, `advanceWagering`, discards contributions above the target. `recordRefund` then subtracts the full refunded bonus portion from that capped value. The individual policies pass their tests but their composition loses qualifying wagering.

PostgreSQL reproduction: a 20,000 target, three 8,000 qualifying bets, and a 2,000 refund leave 22,000 net qualifying stakes. Displayed/stored capped progress should remain 20,000. Actual: 18,000. The first bet wins 20,000 before the later bets, supplying sufficient bonus funds without editing database progress.

Small fix: derive capped progress from the persisted bet contributions minus refunded bonus amounts while holding the wallet lock. The existing provider operations contain this evidence; a new wagering table is unnecessary. Alternatively retain uncapped progress and cap only its presentation, which also requires updating the database check constraint. Add reversal coverage across several bets and refunds before choosing the implementation.

### P1: Standalone bonus settlement bypasses the wallet serialization boundary

`bonus.service.ts`, `settleBonusAward`, counts unsettled bets before taking either lock. Its transaction then locks the award and later the wallet. Gameplay locks wallet then award.

Static concurrency finding, not reproduced by the two regression tests: settlement can count zero while a new bet is uncommitted, wait for its award update, then evaluate the updated award with the stale zero count and convert with an outstanding bet. The opposite lock ordering can also deadlock when settlement holds the award while gameplay holds the wallet.

Small fix: resolve the award's player, lock that wallet first, reread/lock the award, and count unsettled bets under those locks. Use that order everywhere. Consolidate the two copies of unsettled-bet counting so lifecycle decisions use one definition. A concurrency test should coordinate transactions explicitly rather than rely on timing sleeps.

### P2: Drakon callbacks cannot qualify category/provider restricted bonuses

`src/routes/api/drakon/$key.ts` supplies only `integrationProvider`. `processProviderCallback` passes absent category/provider fields into `recordBet`, and `isGameEligible` cannot match those restrictions. The simulator can pass both fields, so its category-based integration coverage does not verify the live callback path.

Small fix: resolve trusted game metadata by the callback's game ID before eligibility evaluation. Keep mutable enrichment metadata out of the provider payload fingerprint, so catalogue edits cannot turn an identical callback into a conflicting retry. Test a normalized callback through this path with a category-restricted award.

## Smaller improvements

- `recordRefund` never updates round status. A fully refunded simulator round remains open; `gameRound` even defines a `refunded` state that is never assigned here. Recompute round status after refunds, using the same settlement definition as win handling.
- `simulateGameRound` validates a missing win amount after recording the bet. Validate the complete simulation request before the first mutation, so malformed demo input cannot leave a debited, unsettled round.
- Gameplay fingerprints serialize the caller's entire object. Explicitly serialize a fixed set of normalized provider fields, as the wallet fingerprint already does. This avoids property insertion order or enrichment data changing retry identity.
- Suspension enforcement currently lives in gameplay and admin withdrawal review. Top-up, bonus activation, and withdrawal request do not enforce player suspension themselves. Before exposing those services through player endpoints, test authenticated ownership, suspension, and fresh-session requirements at those boundaries. This review does not claim those unimplemented endpoints are already exploitable.

## Patterns to keep

- One wallet row serializes multi-bucket mutations. Balance updates and ordered ledger evidence share a transaction.
- Integer minor units and BigInt intermediate proportional arithmetic avoid floating-point allocation errors.
- Persisted original allocations and refund totals preserve full-refund bucket conservation and reject over-refunds.
- Stored responses and unique operation keys prevent repeated callbacks from moving funds twice.
- Award rule snapshots, the partial unique index for one active award, and one-deposit/one-award constraints support the application rules.
- Withdrawal reservation separates spendable cash from pending payouts. Review locks and immutable financial evidence make double-review handling straightforward.
- The simulator calls production gameplay services. Keep it that way and expand lifecycle-interleaving coverage.
- Direct Drizzle services and small pure policy functions suit this MVP. No repository layer or generic workflow engine is needed.

## Verification and retained reproductions

Ran `npm test` against local PostgreSQL with the two new assertions enabled normally: 44 passed, 2 failed. Both failures expose existing production behavior. They are retained in `gameplay.service.test.ts` with explicit Node test TODO reasons, so they still execute and report their failing assertions without making this review-only commit fail the standard suite. They are not fixes or passing correctness evidence. Remove the TODO markers when fixing the corresponding bugs.

Final checks: `npm test` reports 44 passed and 2 TODO; `npm run typecheck`, `npm run check`, and `npm run build` pass. No migrations were needed or applied. Dependencies were restored with `npm ci` from the committed package-lock after an initial pnpm invocation created temporary package-manager files; those files were removed and no dependency changes are included.

Prioritize the three P1 fixes, then callback eligibility wiring. Review findings remain open; the existing green checks do not establish lifecycle correctness.
