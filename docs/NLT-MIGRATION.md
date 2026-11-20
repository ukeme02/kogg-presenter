# NLT replacement — activation checklist

Status, 20 November 2026: application details finalized and standard NLT confirmed selected on the free Starter plan; replacement NOT connected or tested in KOGG yet.

Tyndale announces retirement on 1 January 2027 at https://api.nlt.to/. API.Bible lists standard NLT under its Starter offering: https://api.bible/bibles and https://api.bible/. The signed-in plan was verified at $0 with CSB, NIV and standard NLT selected (3 of 3 additional translations). No paid upgrade or new publisher agreement was accepted.

Account setup progress:

- Saved application: KOGG Presenter, KOGG MEDIA (Africa), https://kogg-presenter.pages.dev.
- Saved types: Website, Desktop App, Cross Platform. Category: Church service/mass use. Audience: Church congregation. Purpose: Education.
- Standard NLT edition ID observed in the account: `d6e14a625393b4da-01`. Selection persisted after saving the plan. This does not prove the production application can fetch NLT yet.
- Logo upload remains pending. Use `icons/icon-512.png`; TinyFish's available browser tools could not upload the file. Do not describe the logo as uploaded.
- The separate DBL API key field says "Not Authorized" and is empty. This is not evidence of a pending API.Bible approval: DBL keys connect content separately licensed through DBL (https://care.library.bible/article/196-api-bible). Ordinary API.Bible authentication still needs verification with the application's API key (https://docs.api.bible/quick-start/authentication/).
- No API secret was retrieved, stored, committed or deployed during form completion. No end-to-end NLT fetch test has run.
- Browser verification runs: `edb0ef43-400b-457c-8deb-40c053d3b1e2` (form), `2007f29f-4970-41c2-852f-1b391982b64c` (saved plan).

Implementation gates before activating managed access:

- Confirm standard NLT edition ID, church projection/OBS and Windows hybrid coverage with the provider. Do not substitute NLTUK or NLTCE silently.
- Store the managed API key only in Cloudflare server secrets; never commit it or include it in installers. Fetch only requested chapters through a bounded server endpoint.
- Preserve copyright and required attribution on projected text.
- Implement required anonymous FUMS view reporting, including a bounded retry queue for offline views. Official guide: https://care.api.bible/article/417-understanding-fums.
- Keep NLT text out of the default offline bundle. Any permitted device cache needs a last-refresh time and the provider's 30-day expiry behaviour. Official guide: https://care.api.bible/article/401-caching-content.
- Review schedules, output snapshots and Sync exports so licensed content is not inadvertently redistributed as an unrestricted Bible pack. Prefer saved references plus licensed fetch on the receiving device.
- Validate using KOGG's actual approved access before describing NLT replacement as ready.

The existing legacy connection has a retirement guard and session-only chapter cache. This is not completion of the managed migration. Open Base Bibles remain independent of provider account setup.
