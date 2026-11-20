# NLT replacement — activation checklist

Status, 20 November 2026: account setup in progress; replacement NOT activated.

Tyndale announces retirement on 1 January 2027 at https://api.nlt.to/. API.Bible lists standard NLT under its Starter offering: https://api.bible/bibles and https://api.bible/. The signup form currently shows $0. The owner must finish password/CAPTCHA and accept the account terms.

Implementation gates before activating managed access:

- Confirm standard NLT edition ID, church projection/OBS and Windows hybrid coverage with the provider. Do not substitute NLTUK or NLTCE silently.
- Store the managed API key only in Cloudflare server secrets; never commit it or include it in installers. Fetch only requested chapters through a bounded server endpoint.
- Preserve copyright and required attribution on projected text.
- Implement required anonymous FUMS view reporting, including a bounded retry queue for offline views. Official guide: https://care.api.bible/article/417-understanding-fums.
- Keep NLT text out of the default offline bundle. Any permitted device cache needs a last-refresh time and the provider's 30-day expiry behaviour. Official guide: https://care.api.bible/article/401-caching-content.
- Review schedules, output snapshots and Sync exports so licensed content is not inadvertently redistributed as an unrestricted Bible pack. Prefer saved references plus licensed fetch on the receiving device.
- Validate using KOGG's actual approved access before describing NLT replacement as ready.

The existing legacy connection has a retirement guard and session-only chapter cache. This is not completion of the managed migration. Open Base Bibles remain independent of provider account setup.
