# football-gaffer-api

Cloudflare Worker behind the "Gaffer" chat coach and the PRO paywall (Stripe)
for `football-english.pages.dev`.

## Deploy

```
cd worker
npx wrangler deploy
```

Requires `npx wrangler login` once (OAuth to the Cloudflare account that owns
`football-english.pages.dev`).

## Secrets

Not stored in this repo — set once per environment with:

```
npx wrangler secret put SYSTEM_KEY            # DeepSeek API key
npx wrangler secret put STRIPE_WEBHOOK_SECRET  # Stripe webhook signing secret
```

## Endpoints

- `POST /` — chat, requires `X-Client-Id`; free trial limited to 10 lifetime
  messages per client + 30/day per IP; VIP (`X-Vip-Code`) bypasses the limit.
- `POST /stripe-webhook` — Stripe `checkout.session.completed`, HMAC-verified.
- `POST /redeem` — `{ session_id }` → PRO code, polled by `pro-unlocked.html`.
- `POST /verify-vip` — `{ code, clientId }` → binds up to 3 devices per code.
  Rate-limited to 30 requests/hour/IP to prevent code brute-forcing.
- `GET /health` — pings DeepSeek without spending tokens; returns 503 if the
  upstream key/account is broken (e.g. out of balance). Meant for uptime
  monitoring, not the app itself.
