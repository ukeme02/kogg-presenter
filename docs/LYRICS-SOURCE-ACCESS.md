# Free lyrics and community resource access

Research checked 10 November 2026. This is an access plan, not an announcement of new integrations. No provider account, paid plan or partnership has been created. KOGG currently has adapters for LRCLIB, lyrics.ovh, Hymnary and hymnal.net.

## Recommended order

1. Strengthen the existing free APIs and show actual words before treating a song as presentation-ready.
2. Expand reviewed offline hymn packs using public-domain or explicitly permitted texts.
3. Request direct, no-fee permission from Christian songwriters and resource owners for optional song packs.
4. Add optional web discovery after choosing a search allowance. A search result is a link, not a full lyric import.
5. Pursue licensed catalogue integrations only after confirming developer access and church entitlements.

## Sources and what access requires

| Source | Free access verified | Next action for KOGG | Limit to account for |
| --- | --- | --- | --- |
| [LRCLIB](https://lrclib.net/docs) | Anonymous lyric API; no key required. | Identify KOGG in requests, respect rate limits and Retry-After. Optionally register KOGG at the [developer portal](https://lrclib.net/developers) for higher limits. | Mixed music catalogue; missing or incorrect versions are possible. API availability does not establish redistribution rights for every lyric. |
| [lyrics.ovh](https://github.com/NTag/lyrics.ovh) | Public artist/title lookup with no account or key in its documented request. | Retain as a fallback and check that the response actually contains words. | Its suggestions come from Deezer, separately from lyric retrieval. Its backend also uses LRCLIB, so the two are not fully independent catalogues. No service guarantee verified. |
| [Open Hymnal](https://openhymnal.org/OpenHymnalEaster2011.pdf) | Published collection includes freely distributable material with per-hymn terms. | Obtain the official source files, review the words and translation for each entry, retain required notices, then prepare an optional text-only pack. | Uses US copyright assumptions; it is not a blanket worldwide public-domain catalogue. The homepage timed out during this check, so bulk download availability is not confirmed. |
| [Hymnary](https://hymnary.org/copyright) | Publicly readable hymn resources; individual items identify their status. | Keep the existing public-domain-text check. Ask through [Hymnary feedback](https://www.hymnary.org/info/email.html?to=feedback) for a supported data feed/export, request limits and caching terms before scaling automated access. | Mixed rights. Hymnary cannot grant someone else's copyright permission. No open production API agreement was verified. |
| [hymnal.net](https://www.hymnal.net/en/faq) | Reading/search needs no account. Some downloads need a free verified account. | Ask through its contact route for permission and a supported way to retrieve text, cache it and offer optional packs. | Its permission to publish songs is not automatically KOGG's permission to redistribute them. Its [privacy page](https://www.hymnal.net/en/privacy) describes blocking scraping; do not increase automated traffic or bypass those blocks. |
| [Brave Search](https://api-dashboard.search.brave.com/documentation/resources/help-feedback) | Search plan has $5 monthly credit, equivalent to 1,000 search requests at the published rate; no standalone free plan. | Create a Search API account, supply a card, set prepay to $0 and avoid auto-reload for a zero-purchase setup. Verify the dashboard's spending controls, keep the key on the server, and add attribution. | The allowance is shared by the whole KOGG integration, not per church. It discovers links; it does not provide song reuse permission or guarantee importable words. |

Brave's [official announcement](https://brave.com/blog/most-powerful-search-api-for-ai/) specifies attribution for the free credits. Confirm current account terms during signup; no signup or card entry has been performed.

## Free partnership candidates, not approved catalogues

- **[Sovereign Grace Music](https://sovereigngracemusic.com/about/permissions/):** publishes a permissions contact, music@sovereigngrace.com. Request a no-fee text catalogue or limited pilot for KOGG. Their existing permissions cover particular uses, not a general app redistribution agreement; co-published songs may need another owner's approval.
- **[Worship Start](https://www.worshipstart.com/royaltyfreemusic):** free membership and donated music for church media make this a relevant outreach candidate. Contact hello@worshipstart.com about a lyric-only pack and attribution. Their page includes both commercial-use wording and a noncommercial Creative Commons notice; clarify the applicable licence and text redistribution rights in writing before importing a pack. No lyric API was verified.
- **Independent Christian artists and church songwriters:** invite original works whose owners can grant permission. Start with Nigerian/African worship and local languages. A contributor who merely knows or sings a song cannot grant its publishing rights. Record co-writers/publishers, approved text, territory, attribution, allowed uses and permission evidence.

## SongSelect, Musixmatch and LyricFind

[SongSelect](https://songselect.ccli.com/about/get) advertises free lyric access for Church Copyright License holders. Its [official public-domain account fact sheet](https://global.ccli.com/wp-content/uploads/songselect-fact-sheet-1.pdf) also describes a free public-domain account. Neither is a confirmed free developer connection for KOGG. Ask CCLI whether it currently accepts new integration partners, what approval costs, and which church licences are required before buying anything. New partner availability remains unconfirmed.

[LyricFind](https://www.lyricfind.com/products/lyric-display) offers a lyric-display enquiry route, but no free production entitlement was verified. A current official free production offering from Musixmatch could not be verified either. Treat both as enquiries, not free access we already possess. Do not obtain unofficial tokens or promise those catalogues in the UI.

## What to request from each partner

Describe KOGG Presenter as a lightweight browser and Windows church presentation tool developed by KOGG MEDIA (Africa), with online discovery, optional offline libraries and private schedule sync. Explain the proposed community area separately.

Request a written answer covering:

1. A no-fee partnership or a limited pilot, and which titles/versions it covers.
2. Full lyric text through a documented API or a maintained JSON/CSV/XML/text export.
3. Permission to search, display in churches, split into slides, retain attribution, save offline and sync privately across a user's devices.
4. Whether **public community redistribution** is allowed. Keep it separate from private church use.
5. Territories, duration, request/download limits, updates, correction/removal procedures and any church-level licence or reporting requirement.
6. How to credit the writer, publisher and source, and whether permission covers every co-owner.

A plain text export can be enough. Partners do not need to build an API for KOGG, and the app does not need audio files to display lyrics. On 10 November 2026, the owner authorised sending the prepared Sovereign Grace Music, Worship Start and hymnal.net requests from koggpresenter@gmail.com. All three were verified in Gmail Sent; responses and approvals remain pending. See LYRICS-PARTNERSHIP-REQUESTS.md.

## Community Bibles

For the proposed shared resource library, [BSB](https://berean.bible/terms.htm) is explicitly public domain and has [official downloads](https://berean.bible/downloads.htm). No paid access or mandatory licensing form is needed. [World English Bible](https://ebible.org/eng-web/copr.htm) is also public domain; preserve its name only for the unchanged text. Other [eBible translations](https://ebible.org/about.php) have their own permissions and download restrictions. Do not infer that NIV, NLT, NKJV or an Efik edition has the same terms. This research does not change KOGG's three default Base Bibles.

## Additional Bible and hymn access research — 10 November 2026

These are verified access routes and outreach candidates, not new active KOGG integrations. Update 12 November: all ten additional requests have been sent from koggpresenter@gmail.com, following the original three lyric-provider enquiries. eBible replied recommending USFX ZIP imports from https://eBible.org/find/ only where the individual translation licence is compatible; otherwise contact the copyright owner. We sent a thank-you reply. API.Bible has acknowledged receipt automatically, without granting access. See LYRICS-PARTNERSHIP-REQUESTS.md for messages and statuses. No provider accounts, subscriptions or agreements were created.

### Bible priorities

| Body / source | What it offers | Access route and next step |
| --- | --- | --- |
| [American Bible Society / API.Bible](https://www.api.bible/) | Current Starter plan: free, non-commercial, up to three licensed Bibles and 5,000 calls per month. Its catalogue includes NIV, NLT, NKJV, NASB, Amplified and The Message. | support@api.bible. Confirm KOGG's eligibility, specific editions, church projection and OBS use. Account/translation activation is still required. [Current policies](https://care.api.bible/article/396-licensing-policies-quick-reference) require copyright display, web usage reporting and refreshing cached content at least every 30 days. This is not indefinite offline bundling permission. Older documentation quoting 5,000 daily queries should not guide planning. |
| [Biblica / Open.Bible — Efik](https://preview.open.bible/bibles/biblica-open-efik-living-new-testament-1995) | Official product page lists the Open Efik Living New Testament 1995 under CC BY-SA, with USX, USFM and Word downloads. | Strong candidate for an optional Efik pack. Review the downloaded edition's exact notices, attribution and share-alike conditions before conversion. This is New Testament only, distinct from the full Bible Society of Nigeria edition. Use Open.Bible feedback for data questions. |
| [Bible Society of Nigeria](https://www.biblesociety-nigeria.org/download-install-and-read-the-bible-in-your-local-language/) | Confirms digital availability of Efik and other Nigerian-language Bibles through YouVersion. | info@biblesociety-nigeria.org, published in its [official Sower magazine](https://www.biblesociety-nigeria.org/wp-content/uploads/2024/11/Sower-Oct-Dec-2024.pdf). Request the full Efik edition, a maintained text export, no-fee ministry access, projection, offline use and private sync permissions. Free reading in another app does not establish KOGG access. |
| [eBible.org](https://www.ebible.org/about.php) | Freely distributable translations and structured/downloadable formats, with individual translation permissions. | [Official contact form](https://ebible.org/cgi-bin/contact.cgi). Request current machine-readable files and a permitted African-language shortlist. Check each edition's notice; not every hosted translation has unrestricted distribution. |
| [AO Lab — Free Use Bible API](https://bible.helloao.org/docs/) | Static JSON Bible API; advertises no key, no usage limit and storage/download without expiry. Individual texts retain their own licences. | Best low-friction technical candidate for optional open-licence Bible packs. Use its documentation and linked GitHub issue route. Review each translation, store only requested packs, preserve attribution and avoid importing audio. |
| [Faith Comes By Hearing / Bible Brain](https://www.faithcomesbyhearing.com/bible-brain/developer-documentation) | Bible text across many languages; its [developer licence](https://www.faithcomesbyhearing.com/bible-brain/license) states the API is provided without charge. | support@digitalbibleplatform.com. Apply for a key and request text-only church presentation access. Offline use is limited to content eligible through its download endpoint or a separate agreement; verify projection and private sync scope. |
| [YouVersion Platform](https://platform.youversion.com/) | Official free Bible tools for apps and websites. | [Developer documentation](https://developers.youversion.com/overview) and [support](https://platform.youversion.com/support). Confirm available translations, publisher approvals, projection, caching and offline rights before choosing it. Consumer app downloads are not developer permission. |

[Biblica's current permissions page](https://www.biblica.com/permissions/) also describes Express Licensing through API.Bible or YouVersion for qualifying non-commercial products without AI/ML features. Ask about KOGG's voice input and planned AI separately; do not assume a future AI assistant is covered. Standard full-text licensing requires a registered legal entity. This research neither establishes KOGG's legal status nor accepts any terms.

### Additional hymn partners

| Body / source | Opportunity | Contact and next step |
| --- | --- | --- |
| [Open Hymnal Project](https://openhymnal.org/OpenHymnalEaster2011.pdf) | Collection of public-domain and explicitly permitted hymns, with individual notices and ABC source formats. | brian.j.dumont@gmail.com, published in the official collection. Request the current source archive and a text-only pack route. The homepage timed out during this check; the published contact is from an older edition and has not been tested. Review jurisdiction and the words/translation separately from musical arrangements. |
| [Methodist Church — Singing the Faith Plus](https://www.methodist.org.uk/for-churches/resources/copyright-matters/) | Publishes hymns for free use by site users with appropriate copyright information. | stfplus@methodistchurch.org.uk, confirmed on its [copyright/contact page](https://www.methodist.org.uk/copyright-and-disclaimer/). Request permission for a defined KOGG text pack, offline saving and private sync; website-user permission does not automatically cover app redistribution or every song in the printed hymnbook. |
| [Praise Trust](https://www.praise.org.uk/answers-to-frequently-asked-questions) | Traditional and modern hymns, revised texts and a copyright administration service. | copyright@praise.org.uk. Request a no-fee pilot for texts it controls and a public-domain subset. Its current church-use conditions include relevant CCLI licences for protected words; a free KOGG catalogue agreement is not established. |

Recommended sequence: review the open Efik NT and AO Lab/eBible packs for lightweight offline expansion; pursue API.Bible for popular English editions; contact Bible Society of Nigeria for full Efik; then request text-only packs from Open Hymnal and Singing the Faith Plus. Keep optional additions out of the three default Base Bible downloads. No new provider code or content was deployed as part of this outreach research.

## Implementation follow-through

An anonymous-access spot check on 10 November returned lyric-bearing LRCLIB records for Way Maker / Sinach, You Are Great / Steve Crown, and Great Are You Lord / All Sons & Daughters. Exact lyrics.ovh lookups returned words for You Are Great and HTTP 404 for the other two. This is three examples, not a catalogue benchmark or a review of lyric accuracy. Only availability/count/timing metadata was retained in `work/free-lyrics-access-2026-11-10.json`. LRCLIB response times in this run ranged from 0.78 to 6.76 seconds, so timeout handling also needs attention; free access does not imply instant response.

- [x] Identify currently accessible free sources and the information needed for access requests.
- [x] Show provider results progressively using stable button nodes and indices; stale searches cannot replace output.
- [x] Add worship-first ranking while preserving a strict Christian-source option. Ranking is a hint, not a faith or rights verification.
- [x] Keep up to 60 successful source links as metadata (Base session storage; Local/Sync device storage). Recent full results are bounded, short-lived browser memory only.
- [x] Add private text-only song-pack import/export with credits and contributor-declared permissions. Import requires review; the declaration is not independent rights verification.
- [ ] Obtain and review additional authorised provider packs. Existing 300/262/562 hymn offerings are unchanged.
- [ ] Connect broader web discovery only after credentials and spending limits are configured.
- [ ] Confirm partner access in writing before activating additional catalogues.
- [ ] Design the community separately: reusable service styles, original/permitted song packs and church event listings, with review/report/removal controls. Public profiles or uploads must be deliberate; saved church libraries stay private.

Checked implementation items are part of the v130–v132 browser updates. Unchecked catalogue/community items remain pending. See FIX-PROGRESS.md for deployment verification. No provider agreement or account has been created.
