# ROADMAP — Google Play Store Deployment
## Football English Academy · Gaffer PRO

> **Status:** Pre-launch hardening phase  
> **Target:** Google Play Store (TWA via Bubblewrap)  
> **Host:** football-english.pages.dev (Cloudflare Pages)

---

## ✅ COMPLETED

| Task | Details | Effort |
|---|---|---|
| TWA project setup | Bubblewrap CLI, AGP 8.9.1, minSdk 24 | Done |
| Keystore & signing | `academia_release.jks`, SHA-256 fingerprint registered | Done |
| Asset Links | `assetlinks.json` deployed, verified at /.well-known/ | Done |
| Responsive modal fix | Sign In modal overflow on Android TWA (Nothing Phone) | Done |
| Splash Screen config | `twa-manifest.json` with `backgroundColor`, `splashScreenFadeOutDuration` | Done |
| Manifest icons split | `"purpose": "any"` + `"purpose": "maskable"` as separate entries | Done (this sprint) |
| Manifest color alignment | `background_color` → `#0f172a` matching twa-manifest (eliminates flash) | Done (this sprint) |
| Dark mode CSS | `@media (prefers-color-scheme: dark)` for all app UI components | Done (this sprint) |
| Network status banner | Inline offline detection → user-friendly banner in-app | Done (this sprint) |
| Offline page (SW) | `offline.html` cached at install; served on navigation failure | Done (this sprint) |
| Service Worker upgrade | v2: proper cache lifecycle, old cache eviction on activate | Done (this sprint) |
| Privacy Policy | `privacy.html` served at /privacy.html + `PRIVACY.md` in repo | Done (this sprint) |

---

## 🔄 IN PROGRESS / NEXT

### P0 — Play Store Blockers (Must ship)

| Task | Description | Effort |
|---|---|---|
| **192px icon** | Generate a 192x192 version of `icon-512.png` for broader PWA compatibility | 1h |
| **Play Store listing** | Screenshots (en), short/full description, content rating (E), category | 2h |
| **Privacy Policy URL** | Submit `https://football-english.pages.dev/privacy.html` in Play Console | 15min |
| **App signing transfer** | Upload keystore to Google Play App Signing or confirm self-managed | 30min |
| **AAB final build** | Rebuild APK/AAB with `./gradlew bundleRelease` after any manifest changes | 1h |

### P1 — Quality & Stability (Pre-launch recommended)

| Task | Description | Effort |
|---|---|---|
| **Offline content cache** | SW: pre-cache core lesson JSON files so lessons work offline | 3h |
| **LocalStorage persistence audit** | Confirm XP/streak survive TWA cold start and process kill | 1h |
| **Font preload** | Replace Google Fonts CDN with self-hosted Inter to avoid cold-start FOUC | 2h |
| **Icon from CDN → local** | Replace `img.icons8.com` links in `<head>` with local `icon-512.png` | 30min |
| **404 page** | Create `404.html` with brand styling and back-to-home link | 1h |
| **footer privacy link** | Add `<a href="/privacy.html">Privacy Policy</a>` in app footer | 15min |

### P2 — Enhancement (Post-launch)

| Task | Description | Effort |
|---|---|---|
| **Push notifications** | Leverage `enableNotifications: true` in twa-manifest; streak reminders | 1 week |
| **Server-side accounts** | Replace localStorage auth with real backend (Cloudflare Workers + KV) | 2 weeks |
| **In-app review prompt** | Trigger Google Play in-app review after user completes 3 lessons | 2h |
| **Lesson offline pack** | Allow users to "download" a lesson set for offline play | 1 week |
| **Paid tier enforcement** | Server-validate PRO status instead of local password | 1 week |
| **Analytics (privacy-first)** | Cloudflare Analytics or Plausible — zero PII, GDPR compliant | 2h |

---

## 🏗 TECHNICAL DEBT

| Item | Risk | Fix |
|---|---|---|
| Auth via `localStorage` password | Low security; fine for MVP | Replace with real backend (P2) |
| Icons served from `img.icons8.com` | CDN dependency, slow cold start | Self-host icons (P1) |
| `CACHE_NAME: gaffer-pro-v2` | Must bump version on each SW change | Add to release checklist |
| No `192x192` icon | Some browsers/Android versions prefer it | Generate and add (P0) |

---

## 📋 RELEASE CHECKLIST (before each Play Store submission)

- [ ] `appVersionCode` incremented in `twa-manifest.json` and `build.gradle`
- [ ] `CACHE_NAME` bumped in `sw.js`
- [ ] `./gradlew bundleRelease` builds without errors
- [ ] AAB signed with `academia_release.jks`
- [ ] Tested on physical Android device via TWA
- [ ] Offline banner tested by disabling Wi-Fi in-app
- [ ] Dark mode verified on Android system dark mode enabled

---

*Document maintained by: Álvaro Gómez · alvaroggcasarabonela@gmail.com*
