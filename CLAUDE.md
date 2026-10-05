# TapShelf (nfc-tap-project)

## Source of truth

**[`docs/PRD-v4.md`](docs/PRD-v4.md) is the product spec and build plan.** Read it at the start of every session. It covers:
- every spec'd feature
- the build order, with the status of each step (§7)
- features built after v3 (§10)
- places where the spec and code disagree (§11)
- known gaps (§12)
- parked features: still wanted, not now (§16)
- the working protocol (§15)

**Current priority:** Phase 5 (staff logins, training view, manager roles) is complete. The next planned feature is weekly staff training quizzes (not started; open questions in [`docs/staff-experience.md`](docs/staff-experience.md)). Ask before starting new work.

Don't use `~/Downloads/nfc-product-prd-v3.docx` or any other local copy. They are superseded. If a local file disagrees with `docs/PRD-v4.md`, the repo file wins.

Code comments and tests cite **v3** section numbers. The v4 equivalents:

| v3 | v4 |
|---|---|
| §7.2 + §13.6 (data model) | §6.3 |
| §8 + §13.7 (build plan) | §7 |
| §4.x (features) | §5.x |

## Working rules

**The full development protocol is [`docs/claude-code-prompt.md`](docs/claude-code-prompt.md). Read it at session start alongside the PRD.** The list below is only a summary.

- **State the scope:** open each session by naming the Phase / Step (or §10 area) you're working on. Don't build ahead of it.
- **Engineering bar:** TDD, SOLID, KISS, YAGNI.
- **Keep the PRD current:** when a step or feature lands, update its status in `docs/PRD-v4.md`.
- **Running docs:** log new deferrals in `DEFERRED.md` and new human tasks in `ACTION_ITEMS.md`.
- **Edge middleware:** `middleware.ts` runs on the edge. Use the Web Crypto API (`crypto.randomUUID()`), never `node:crypto`.
- **No PII in `tap_events`:** only the anonymous `session_id` cookie.
- **Commands:** `corepack pnpm install`, `db:up`, `db:migrate`, `test`, `typecheck`
