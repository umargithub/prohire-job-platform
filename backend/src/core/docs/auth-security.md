# Auth Security — Tradeoffs & Known Limitations

## What is implemented

- **Refresh token rotation** — every `/auth/refresh` call deletes the old token and issues a new one. A stolen token can only be replayed once before it is rotated away.
- **Hashed token storage** — raw tokens are never stored. Only `SHA-256(token)` is persisted. A database leak does not expose usable tokens.
- **Short-lived access tokens** — access tokens expire quickly (see `jwt.utils.ts`). Refresh tokens carry the long-lived session.
- **Atomic compare-and-swap rotation** — rotation runs in a single transaction where `consumeRefreshToken` deletes the old row and returns its owner in one locked `DELETE ... RETURNING` statement, then a new token is inserted. Because the delete is the gate, of N concurrent refreshes carrying the same token exactly one succeeds; the rest see no row and are rejected. This removes the read-then-write (TOCTOU) gap, so concurrent refreshes cannot leave the user with two valid tokens or an orphaned one.
- **Secure resend / forgot-password flows** — `withTimingFloor` prevents timing-based account enumeration on both endpoints.
- **Cross-tab session sync** — logout and login propagate across tabs via a same-origin `BroadcastChannel` (`frontend/src/lib/auth-broadcast.ts`). Logging out in one tab clears every other tab's in-memory session and query cache (mounted guards then redirect protected pages); logging in shares the session so sibling tabs adopt it without each minting its own token (which would stampede `/auth/refresh`).
- **Refresh failure is classified by cause** — the 401 response interceptor (`frontend/src/lib/api.ts`) only tears down the session (clear + redirect to `/login`) when the refresh call itself returns **401/403** (the session is genuinely dead). Network errors, timeouts, and **5xx** are treated as transient: the still-valid session is kept and the failing request is simply rejected, so a brief backend blip does not log everyone out. See the design note below for the deliberate consequence.

### Design note: transient vs. terminal refresh failure

Because refresh failures are classified by status, a **persistent** `5xx` on `/auth/refresh` leaves the user in a degraded-but-logged-in state: their queries keep failing and they are **not** redirected to `/login`. This is intentional — a `5xx` is a server fault, and logging the user out neither fixes it nor helps them. Recovery is automatic: once the backend heals, a valid refresh token resumes the session; if the token was actually expired, the refresh returns `401` and the user is then redirected. The bootstrap path (`AuthProvider`) still clears on any failure, because at startup there is no in-memory session to preserve.

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

### Why the client cannot fix this

The tempting client-side fix is "on a `401` from `/auth/refresh`, retry the refresh once." It is **rejected**, and understanding why frames where the real fix lives.

A `401` from `/auth/refresh` is ambiguous by construction — the backend collapses several unrelated situations into one status code:

| Cause | Cookie state | Retry helps? |
|---|---|---|
| Sibling tab rotated the token (this race) | cookie already holds the fresh token | **Yes** |
| Refresh token expired | stale, nothing rotated it | No — re-presents the same dead token |
| User logged out / session deleted | gone server-side | No — fights a deliberate action |
| Token revoked (e.g. revoke-all on password reset) | intentionally killed | No — actively wrong |
| Tampered / invalid token | invalid | No |

Only the first row benefits. In every other row the retry re-presents the *same* stale cookie, gets `401` again, and logs out anyway — a wasted round trip in which the client second-guessed a definitive backend answer it has no way to interpret. Worse, it is fragile against future hardening: once **reuse detection** exists (see the reuse-detection limitation above), presenting an already-consumed token is treated as theft and revokes the whole family — so a blind client retry would trip the alarm and nuke every session. The client cannot distinguish these cases, so it must not guess. **The ambiguity has to be resolved on the backend.**

### Backend fix options (where the fix belongs)

Two clean server-side approaches, either of which removes the guesswork:

1. **Grace window (simplest).** On rotation, keep accepting the immediately-preceding token for a short interval (~5–10s). The losing tab's stale token is then honored, the server returns a fresh token instead of `401`, and **the race never surfaces** — no client change at all. Cost: a small relaxation of strict single-use rotation for that window, and it must be reconciled with reuse detection (a token used inside its grace window is legitimate; outside it is a replay). Needs a `previous_token_hash` + `rotated_at` (or a short-lived record) and cleanup.

2. **Disambiguated response (`409 CONCURRENT_REFRESH` / `TOKEN_ROTATED`).** Retain recently-rotated token hashes so the server can distinguish "stale-but-just-rotated → retry" from "genuinely dead → log out," and return a distinct code for the former. The client then retries *only* on that explicit signal — no guessing, because the server states which case it is. Cost: a migration for the rotated-hash record plus a cleanup TTL.

3. **Session / token-family model (most robust).** A `sessions` row with a rotating current-token pointer and a `family_id`. This subsumes this fix, logout-everywhere, **and** reuse detection in one model, and is the natural home if multi-device session management becomes a requirement. Cost: substantial — new table, migration, rotation refactor.

Note options 2 and 3 build directly on the same `previous_token_hash` / family machinery described in the reuse-detection limitation above — so if that is ever implemented, this fix comes almost for free alongside it.

### Decision

All of these solve a problem almost no user of a portfolio job board will hit. The proportionate decision is to leave the behavior documented and revisit **only if cross-tab / multi-device session management becomes a product requirement** — at which point the session-family model (option 3) is the natural home for this fix, logout-everywhere, and reuse detection together. If a lighter standalone fix is ever wanted sooner, the grace window (option 1) is the least-effort correct choice. In all cases the fix is server-side; a client retry is never the answer.

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
