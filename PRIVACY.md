# Privacy Policy — Football English Academy

**This file is a technical summary for developers.** The authoritative, user-facing
policy (bilingual EN/ES, with a rights-request form and a working "delete my
account" button) is served live at `/privacy.html` — always edit that file as
the source of truth and keep this summary in sync with it.

**Effective date:** 24 July 2026 (Resend/Pexels disclosures added same day)

## Legal basis

Drafted against Regulation (EU) 2016/679 (GDPR), Spanish Organic Law 3/2018
(LOPDGDD), and the Spanish e-commerce act (LSSI-CE) for the cookies section.
Data controller: Álvaro Gómez Gómez (individual, Casarabonela, Málaga, Spain).

## What's actually collected (verified against the current codebase)

| Data | Where it lives | Notes |
|---|---|---|
| Email, password hash, display name, avatar URL | D1 `users` table | Password: PBKDF2-HMAC-SHA256, 100k iterations, per-user salt |
| Google account id / email / name / picture | D1 `users` table | Only if signing in via Google OAuth |
| XP, msgs, streak, completed lessons | D1 `users` / `completed_lessons` | Guests: same shape, `localStorage` only, never sent to us |
| Session token (hashed) | D1 `sessions` | Cookie is `HttpOnly; Secure; SameSite=Lax`, 30-day TTL |
| OAuth CSRF state | Cookie only, not persisted | 10-minute TTL |
| Password-reset token (hashed) | D1 `password_resets` | 1h TTL, deleted on use or on next reset request; cleaned up on account deletion too |
| Device id (`client_id`) | Browser `localStorage` | Random UUID, not a cookie, used for chat free-limit + VIP device binding |
| Chat message text | Never stored by us | Forwarded live to DeepSeek to generate a reply, not persisted server-side |
| IP address | Transient, Cloudflare Worker rate-limit keys (Durable Object) | 48h TTL, genuinely auto-deleted via a DO `alarm()` that calls `storage.deleteAll()` — added 2026-07-24, previously the entry just went unread after expiry without being erased |
| Payment details | Never received | Handled entirely by Stripe Payment Links |

## Third-party processors / recipients

- **Cloudflare** (Pages, Workers, D1, KV) — hosting/infrastructure processor.
- **Google** — only for Google Sign-In.
- **Stripe** — payment processing, independent controller for payment data.
- **DeepSeek** — AI chat replies. Based outside the EEA, **no EU adequacy
  decision** — flagged explicitly in the live policy, with a recommendation
  not to share personal/sensitive data in chat.
- **Resend** — transactional email (password-reset links only). US-based.
- **Pexels** — direct video CDN for some lessons (IP exposure, no account data shared).
- Font Awesome (cdnjs), Google Fonts, jsdelivr — static asset CDNs.
- YouTube embed code path exists in `app.js` but is unused by any current
  lesson — disclosed pre-emptively in the live policy in case it's ever
  activated (sets its own tracking cookies, would need a fresh look then).

## User rights mechanism ("protest" channel, per user request)

`/privacy.html` §8 provides:
1. A bilingual rights-request form (access/rectification/erasure/restriction/
   portability/objection/withdraw consent/general complaint) that builds a
   pre-filled `mailto:` to `alvaroggcasarabonela@gmail.com` — no backend
   dependency, always works as long as the user has any mail client.
2. A **working self-service "Delete my account" button**, calling the real
   `POST /api/auth/delete` endpoint (`functions/api/auth/delete.js`), which
   deletes the user's rows from `completed_lessons`, `sessions`,
   `password_resets`, and `users` in one batch, then clears the session
   cookie. Requires an active session.
3. A direct link to the AEPD (Spanish DPA) complaint channel.

## Maintenance notes

- If a new third-party processor is added (new CDN, new payment provider,
  new AI backend, analytics, etc.), it **must** be added to `/privacy.html`
  Section 4 before shipping.
- If `SESSION_TTL_SECONDS`, `PBKDF2_ITERATIONS`, or any KV/D1 retention
  constant changes in the code, mirror the new numbers into Section 5/6/9 of
  `/privacy.html`.
- The children's-privacy age threshold (14) is specific to Spain (LOPDGDD
  Art. 7) — don't revert it to the US COPPA-style "13" figure used in the
  old version of this policy, that was a legal inaccuracy for this
  jurisdiction.
