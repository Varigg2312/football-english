# ROADMAP — Google Play Store Deployment
## Football English Academy · Gaffer PRO

> **Status:** Pre-launch — app content & web shell ready, Play Console steps pending
> **Target:** Google Play Store (TWA via Bubblewrap), package `com.footballenglish.academy`
> **Host:** football-english.pages.dev (Cloudflare Pages + Pages Functions + D1)
> **Last reviewed:** 2026-09-27

---

## ✅ DONE

| Area | Details |
|---|---|
| TWA project | Bubblewrap, AGP, minSdk 24, **targetSdk 36** (Play requirement since 31 Aug 2026), v2.0.1 / versionCode 3 |
| Signing & Asset Links | `academia_release.jks` (alias `android`), SHA-256 `BB:78:…:23:E9` in `/.well-known/assetlinks.json` |
| Server-side accounts | D1 + PBKDF2 (100k) + HttpOnly session cookie; Google sign-in; password reset by email; account deletion |
| Paid tier | Stripe Payment Link → Worker webhook → PRO code (KV), validated server-side per device |
| Progress sync | XP / streak / completed lessons stored per account (`/api/auth/progress`, additive for lessons) |
| Content | 17 lessons Rookie → World Class (incl. VAR, formations, pressing, transfers, commentary), 82 terms with Spanish glosses and audio |
| Navigation | Lesson catalogue, vocabulary bank, real routes `/lessons`, `/lessons/<id>`, `/vocabulary` (Android shortcuts work) |
| Offline | SW precache of shell + `lessons.json`; app routes work offline; `offline.html` actually served (redirect fix) |
| 404 page | `404.html` (branded, bilingual) |
| i18n | EN/ES for app, offline page, PRO unlocked page, reset password |
| Accessibility | Focus-visible, skip link, dialogs with focus trap/Escape, ≥48px touch targets, reduced motion, AA contrast pass |
| Manifest | `id`, `scope`, description, shortcuts, separate `any` / `maskable` icons, theme colour aligned |
| Legal | Privacy policy + terms (EN/ES), AI Act art. 50 notice, LOPDGDD 14+ |

---

## 🔄 NEXT

### P0 — Play Store blockers

| Task | Owner | Notes |
|---|---|---|
| Release AAB | Vari | Create `keystore/signing.properties` from the template, then `./gradlew bundleRelease` |
| Regenerate launcher icons from the maskable icon | Vari/Claude | `twa-manifest.json` now points to `icon-512-maskable.png`; mipmaps still come from the old icon (needs `bubblewrap update` — review diff, it can rewrite `build.gradle`) |
| Store listing | Vari | Phone screenshots (catalogue, lesson, quiz, vocabulary, chat), short/full description EN+ES, category Education, content rating questionnaire |
| Data safety form | Vari | Email, progress, device id, IP (anti-abuse), chat text → DeepSeek; matches `privacy.html` |
| Privacy Policy URL | Vari | `https://football-english.pages.dev/privacy.html` |

### P1 — Recommended before launch

| Task | Notes |
|---|---|
| Deploy Worker update | Chat memory (last 6 turns) + Stripe `payment_status` / signature-age checks — code ready in `worker/`, needs `wrangler deploy` **and** the privacy text change (chat context) |
| PRO linked to the account | Today PRO is a code in localStorage (3 devices). Proposal: `users.pro_until` + webhook stores customer email → needs D1 migration + privacy/terms update |
| Self-host Inter + Font Awesome | Removes 3rd-party requests and FOUC on cold start |
| Streak reminders (notifications) | TWA notification delegation is enabled; needs Web Push + a consent step |

### P2 — Post-launch

| Task | Notes |
|---|---|
| Spaced-repetition vocabulary review | Build on the vocabulary bank + server progress |
| More lessons (Legend tier) | Keep the `meaning_es` gloss on every term |
| In-app review prompt | After 3 completed lessons |
| Privacy-first analytics | Cloudflare Web Analytics (no cookies) — update privacy policy |

---

## 📋 RELEASE CHECKLIST (each Play Store submission)

- [ ] `versionCode` / `versionName` bumped in **both** `app/build.gradle` and `twa-manifest.json`
- [ ] `./gradlew test bundleRelease` builds without errors
- [ ] AAB signed with `academia_release.jks` (never regenerate the keystore or change `packageId`)
- [ ] `https://football-english.pages.dev/.well-known/assetlinks.json` still lists the release fingerprint
- [ ] Tested on a physical device: launch, shortcuts (Lessons / Vocabulary), offline, dark mode, sign-in
- [ ] Browser console clean on the live site (no CSP errors, no 404s)

*`sw.js` `CACHE_NAME` is regenerated automatically by the pre-commit hook — don't bump it by hand.*

---

*Document maintained by: Álvaro Gómez · alvaroggcasarabonela@gmail.com*
