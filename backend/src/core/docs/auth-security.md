# Auth Security — Tradeoffs & Known Limitations

## What is implemented

- **Refresh token rotation** — every `/auth/refresh` call deletes the old token and issues a new one. A stolen token can only be replayed once before it is rotated away.
- **Hashed token storage** — raw tokens are never stored. Only `SHA-256(token)` is persisted. A database leak does not expose usable tokens.
- **Short-lived access tokens** — access tokens expire quickly (see `jwt.utils.ts`). Refresh tokens carry the long-lived session.
- **Atomic compare-and-swap rotation** — rotation runs in a single transaction where `consumeRefreshToken` deletes the old row and returns its owner in one locked `DELETE ... RETURNING` statement, then a new token is inserted. Because the delete is the gate, of N concurrent refreshes carrying the same token exactly one succeeds; the rest see no row and are rejected. This removes the read-then-write (TOCTOU) gap, so concurrent refreshes cannot leave the user with two valid tokens or an orphaned one.
- **Secure resend / forgot-password flows** — `withTimingFloor` prevents timing-based account enumeration on both endpoints.
- **Cross-tab session sync** — logout and login propagate across tabs via a same-origin `BroadcastChannel` (`frontend/src/lib/auth-broadcast.ts`). Logging out in one tab clears every other tab's in-memory session and query cache (mounted guards then redirect protected pages); logging in shares the session so sibling tabs adopt it without each minting its own token (which would stampede `/auth/refresh`).

---

## Known limitation: no refresh token reuse detection

### What the gap is

If an attacker steals a refresh token before the legitimate client uses it, they can rotate it indefinitely. The legitimate client's next request will fail (their token is gone), but the attacker's rotated token remains valid. There is no mechanism that detects this or revokes the attacker's session.

### The full fix: family-based reuse detection

The OAuth 2.0 Security BCP describes a "refresh token family" approach:

1. Each login creates a `family_id` (UUID) stored on the `refresh_tokens` row.
2. On rotation, the new token inherits the same `family_id` and records the `previous_token_hash`.
3. If a token hash is not found in `refresh_tokens` (already rotated), the server checks whether it appears as a `previous_token_hash` anywhere in the same family.
4. If it does, a replay is detected. All tokens in that family are revoked. The user is forced to log in again.
5. Tokens in other families (other devices) are unaffected.

### Why it was not implemented

ProHire is a multi-session application (a user can be logged in on a laptop and a phone simultaneously). Family-based reuse detection is the correct approach for multi-session, but it requires:

- A `family_id` column on `refresh_tokens`
- A `previous_token_hash` column on `refresh_tokens`
- A partial index on `previous_token_hash`
- A new repository method to detect replay within a family
- Scoped revocation logic (revoke family, not all user tokens)

For a portfolio job board, this complexity is disproportionate. Token rotation alone is already better than many production systems. The limitation is documented here so it can be implemented if ProHire moves toward a production deployment.

### What would also be needed for full multi-session support

Beyond reuse detection, proper multi-session support requires:

- Named sessions per device (e.g., "Chrome on MacBook")
- A UI to list and revoke individual sessions
- Per-session `last_used_at` tracking

None of these are currently implemented. Sessions are functional but unmanaged.

---

## What a single-session design would look like (rejected)

Clearing all refresh tokens for a user on every login enforces one active session at a time. This simplifies reuse detection (no families needed — a replayed token always means revoke everything) but degrades UX for a job board where users legitimately switch between devices. This approach was considered and rejected.

---

## Known limitation: concurrent multi-tab refresh can log out one tab

### What the gap is

Two things guarantee correctness under concurrent refresh:

- **Client (per tab)** — `refreshSession` is single-flight, so a burst of 401s _within one tab_ triggers exactly one `POST /auth/refresh`.
- **Server** — atomic compare-and-swap rotation (`consumeRefreshToken`) guarantees that of N concurrent refreshes carrying the same token, exactly one wins; the rest are rejected with `401`.

The single-flight guard is per browser tab, but the refresh-token cookie is shared across all tabs. So when two tabs refresh within the same few milliseconds — most commonly on **browser session restore**, when several tabs bootstrap at once — both send the same token, the server rotates for the winner, and the losing tab receives a `401`. The client cannot tell "the token was rotated 20 ms ago by a sibling tab" from "the session is genuinely dead," so it treats the `401` as logout and redirects the losing tab to `/login`.

The session is **not** actually invalid — the cookie now holds the winner's freshly rotated token — so reloading the logged-out tab immediately logs back in.

### Why this is acceptable as-is

Authentication remains **correct and secure**: single-use rotation holds, no token is orphaned or duplicated, nothing leaks. This is purely a **UX defect** (a rare, self-correcting spurious logout), not a security hole.

### Options considered (and why deferred)

- **Client retries the `401`** — rejected. It overloads `401` (which legitimately also means expired / revoked / logged-out-elsewhere) and makes the client guess the backend's rejection reason. Wrong layer to own that decision.
- **Accepting grace window** — keep a rotated token valid for a few seconds. Rejected: it weakens single-use rotation and fights future reuse detection.
- **Signal-only rotated record (`409 CONCURRENT_REFRESH`)** — retain recently-rotated hashes so the server can answer "stale-but-valid, retry" vs. "dead, log out." Clean, but needs a migration + cleanup TTL.
- **Session/token-family model** — a `sessions` row with a rotating current-token pointer. The most robust option; it would also subsume logout-everywhere and reuse detection. But it is a substantial change (new table, migration, rotation refactor).

All of these solve a problem almost no user of a portfolio job board will hit. The proportionate decision is to leave the behavior documented and revisit **only if cross-tab / multi-device session management becomes a product requirement** — at which point the session-family model is the natural home for this fix, logout-everywhere, and reuse detection together.

---

## Known limitation: no transactional outbox for email

### What the gap is

In three flows — registration, resend verification, and forgot password — the sequence is:

1. Write to the database (user row + token, or token replacement) inside a transaction.
2. Enqueue an email via BullMQ **after** the transaction commits.

If the process crashes between step 1 and step 2, the database is in a valid state but the email is never enqueued. The user exists (or has a valid token) but never receives the email.

### The full fix: transactional outbox pattern

The outbox pattern eliminates the gap by writing the "email to send" as a row in an `outbox` table inside the same transaction as the domain writes. A separate poller reads the outbox and enqueues/sends the email. Because both writes are in the same transaction, they either both commit or both roll back — the email can never be lost.

This requires:
- An `outbox` table
- A background poller (separate worker or BullMQ repeatable job)
- Idempotency on the email worker side (the poller may deliver the same outbox row more than once)

### Why it was not implemented

The failure window is narrow (a process crash in the milliseconds between DB commit and `emailQueue.enqueue`). For the flows affected:

- **Registration** — the user can request a resend. The escape hatch exists by design.
- **Resend verification** — the endpoint itself is the escape hatch.
- **Forgot password** — the user can submit the form again.

The outbox pattern adds an `outbox` table, a poller, and deduplication logic for a failure mode that is rare and always user-recoverable. The complexity cost was judged disproportionate for a portfolio project.

### What is already mitigated

BullMQ itself provides at-least-once delivery with retries and a dead-letter queue once the job is enqueued. The gap is only between the DB commit and the enqueue call — not inside BullMQ.

---

## ~~Redis resend rate limit is not crash-safe~~ — resolved

The previous `INCR` + `EXPIRE` two-command pattern had a race condition: a crash between the two commands left the key without a TTL, permanently locking that user out of resend.

**Fixed** in `src/core/redis/rate-limit.ts` using a Lua script (`incrementWithTTL`). The increment and conditional TTL assignment execute as a single atomic Redis operation. The TTL is still only set on the first increment, preserving the original window semantics.
