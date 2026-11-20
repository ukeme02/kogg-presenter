# NLT replacement — activation checklist

Status, 20 November 2026: v139 is live with managed NLT and anonymous usage reporting verified on the public site. Windows and OBS 0.1.2-preview installers are published.

Tyndale announces retirement on 1 January 2027 at https://api.nlt.to/. API.Bible lists standard NLT under its Starter offering: https://api.bible/bibles and https://api.bible/. The signed-in plan was verified at $0 with CSB, NIV and standard NLT selected (3 of 3 additional translations). No paid upgrade or new publisher agreement was accepted.

Account setup progress:

- Saved application: KOGG Presenter, KOGG MEDIA (Africa), https://kogg-presenter.pages.dev.
- Saved types: Website, Desktop App, Cross Platform. Category: Church service/mass use. Audience: Church congregation. Purpose: Education.
- Standard NLT edition ID: `d6e14a625393b4da-01`. Production chapter fetching and projection are verified.
- Logo upload remains pending. Use `icons/icon-512.png`; TinyFish's available browser tools could not upload the file. Do not describe the logo as uploaded.
- The separate DBL API key field says "Not Authorized" and is empty. DBL keys connect content separately licensed through DBL (https://care.library.bible/article/196-api-bible); they are not required for this verified NLT connection. Ordinary API.Bible authentication is verified with the application's key (https://docs.api.bible/quick-start/authentication/).
- Following form completion, the authorized app key was transferred in memory into the Cloudflare production secret `API_BIBLE_KEY`. It is absent from repository files, browser code and installers. Real NLT John 3 and Psalm 119 requests returned 200; all 176 Psalm 119 verses parsed without shifted numbering.
- Browser verification runs: `edb0ef43-400b-457c-8deb-40c053d3b1e2` (form), `2007f29f-4970-41c2-852f-1b391982b64c` (saved plan).

Implementation and operational limits:

- Fixed standard NLT edition `d6e14a625393b4da-01`; no arbitrary URL, edition or whole-Bible endpoint. Validated USFM chapter bounds, bounded responses, ten-second provider timeout, approved web/localhost origins, sanitized errors and a per-IP/per-method/per-running-instance 60-request/minute guard. This guard is not a global distributed quota; the provider's free monthly allowance still applies.
- Edge cache refreshes after 14 days and changes namespace when the secret rotates. Browser chapter cache is memory-only. The offline worker bypasses API routes; no NLT text is bundled or downloaded as an offline pack.
- Provider copyright is shown on projection independently of the optional reference label. Expired output snapshots blank rather than showing stale text. Search results carry attribution and exclude expired chapters.
- Anonymous view reports use random device/session identifiers and provider tokens. Server-signed receipts prevent submitting arbitrary tokens; no key, email, user identity or verse text is sent in reporting requests. Reports survive reload, retry after failures/reconnection, and are bounded to 500 pending records per origin with a visible operator storage warning if full. Receipts expire after 30 days. Reporting does not block projection. Official guide: https://care.api.bible/article/417-understanding-fums.
- Service/plan persistence, backups and Sync retain NLT verse references, not licensed text/tokens. Presentation fetches the current item on demand; a slow/failed fetch preserves newer/current output. Rehearsal shows a reference card with an online-access notice. This is not a promise that an unfetched NLT service works offline.
- Real isolated Edge checks: Quick Jump, large readable projection, copyright, reference-only saved plan, reload/replay, expiry blanking, acknowledged FUMS requests, and operator widths 390/768/1440. Evidence: `work/v139-nlt-browser.json` and screenshots. Provider usage limits and availability remain external dependencies.
- Self-hosted deployments must configure their own server secret and endpoint/origin policy; no KOGG key is distributed with the web ZIP. Windows/OBS local clients use the fixed KOGG endpoint and allowed localhost origins.

The legacy parser and retirement guard remain for compatibility tests, but the current app configures managed NLT. Open Base Bibles remain independent of provider connectivity. The optional API.Bible application-logo upload is still a manual dashboard task and does not block verified NLT requests.

Production verification: deployment https://324363bf.kogg-presenter.pages.dev, source `c25f3be` (implementation `668802f`). All 12 checked public assets match release bytes. Fresh Edge on the canonical public site fetched Genesis 1 and John 3 (200), projected John 3:16 with publisher attribution, and acknowledged both anonymous view reports (204), with no browser script errors or direct provider/key requests. Desktop CORS succeeds; unrelated origins are rejected. The first deployment exposed Cloudflare's unsupported `redirect: error` mode; both server requests now use `manual` and reject redirects without forwarding credentials. Regression coverage includes redirects for fetching and reporting. Final suite: 376 passed, zero failures/skips. See `verification/v139-production.json` and https://developers.cloudflare.com/workers/runtime-apis/request/.
