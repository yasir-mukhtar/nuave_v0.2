# Nuave report playbook

> Status: **Approved** by the founder on 2026-10-27 (Spec 021 B-02;
> [decision](../../DECISION_LOG.md#2026-10-27--report-playbook-approved)). The
> report writer reads it from Spec 021 PR 6 (Part B) on.
> Sources checked: 2026-10-27. Each rule names its source; re-check them
> before each yearly review or when a source changes.

## What this is for

The report writer reads this page with every audit. It sets out how ChatGPT
and Google's AI Overview choose which clinics to name, and what a clinic can
do about it. It is not a ranking formula. Neither Google nor OpenAI publishes
one, and nothing here may be presented as one.

Three rules for the writer:

1. **Facts come from the answers.** What ChatGPT and Google said about this
   clinic, its competitors and the sites they cited comes only from the saved
   answers and the code-made counts. This page never supplies facts about a
   clinic.
2. **Advice comes from this page.** Recommendations may be confident and
   specific when this page supports them. Advice this page does not support
   is not given.
3. **No causes.** No sentence says *why* this clinic got its result ("because
   your profile has few reviews"). The writer may say what the answers show
   and what generally helps (decision 2026-10-26).

## How Google's AI Overview picks its sources

- A page can be shown as a link in AI Overviews only if it is **indexed and
  eligible to appear in Search with a snippet**. There are **no extra
  technical requirements, no special optimisation and no special schema.org
  markup** for AI Overviews. Ordinary search best practice applies.
  ([Google: AI features and your website][g-ai])
- Google's own advice for these features: let Googlebot crawl (in robots.txt
  and at the host or CDN), link important pages from other pages on the site,
  keep important content **as text**, support it with good images, make any
  structured data match the visible text, and **keep the Business Profile
  current**. ([Google: AI features and your website][g-ai])
- For health topics Google asks for content that is "highly accurate and
  consistent with established expert consensus", says trust matters most, and
  asks whether it is clear who wrote a page and whether that person is a
  demonstrable expert. ([Google: helpful, reliable, people-first
  content][g-helpful])

## How Google ranks local businesses

- Local results are mainly based on **relevance** (how well the Business
  Profile matches the search), **distance** and **prominence** (how well known
  the business is, including links to it and its reviews). "More reviews and
  positive ratings can help." "There's no way to request or pay for a better
  local ranking." ([Google Business Profile: local ranking][g-local])
- Google's tips: verify the profile; keep address, hours, category and
  attributes complete and correct; reply to reviews; add photos and videos.
  ([Google Business Profile: local ranking][g-local])

## How ChatGPT finds clinics

- ChatGPT answers with web search when it needs current or local
  information. It may use an approximate location from the user's IP
  address, and it sends searches to **third-party search providers (OpenAI
  names Bing) and specialised data providers**. ([OpenAI: Searching the web
  with ChatGPT][oa-search]; [OpenAI: ChatGPT search for Enterprise and
  Edu][oa-ent])
- Any public website can appear in ChatGPT search. Summaries and snippets
  need **OAI-SearchBot** to be allowed in robots.txt. ([OpenAI: Publishers and
  developers FAQ][oa-pub])
- **OpenAI does not publish where its local business listings come from.**
  Third-party write-ups name Bing, Yelp, Foursquare or Mapbox and disagree
  with one another. The writer never names a listing source as the one
  ChatGPT uses.

## What a clinic can do

Each item says what to do, why, and how the clinic can check it. The writer
picks the items the answers make relevant and writes them for this clinic.

1. **Answer patients' questions in text, one treatment per page.** Say what
   the treatment is, who it suits, how it is done, how long it takes, the
   price range, risks and aftercare, and who performs it. *Why:* AI Overviews
   cite indexed pages with text they can quote ([g-ai]); ChatGPT search
   reads public pages ([oa-pub]). *Check:* the page opens without a login and
   the text is not inside an image.
2. **Show who the doctors are.** Name each doctor on the pages they treat,
   with their specialty and registration (STR/SIP), and link to a page about
   them. *Why:* health content should show who wrote or reviewed it and that
   they are experts ([g-helpful]). *Check:* each treatment page names a
   doctor, and the doctor's page exists.
3. **Complete and verify the Google Business Profile.** Category, hours,
   address, phone, services, photos and a short description; reply to
   reviews. *Why:* [g-local]; Google names the Business Profile in its AI
   features advice ([g-ai]). *Check:* the profile shows "verified" and has
   no missing fields.
4. **Ask real patients for honest reviews, and reply to them.** Never pay
   for or reward reviews, never ask only happy patients, never write reviews
   for the clinic. *Why:* reviews count towards prominence ([g-local]);
   incentives, selective asking and fake reviews break Google's rules and
   those reviews are removed ([g-reviews]). *Check:* new reviews arrive each
   month, and every review has a reply.
5. **Be listed, correctly, on the sites the answers cite.** When ChatGPT or
   Google cites directories or health portals for a topic, the clinic should
   have an accurate listing there, with the same name, address and hours as
   its own site and Business Profile. *Why:* both sources name and cite
   businesses from public pages ([g-ai], [oa-pub]). *Check:* use the cited
   domains in this report; the facts match on every listing.
6. **Let the search crawlers in.** robots.txt and any bot protection must
   allow Googlebot, Bingbot and OAI-SearchBot. *Why:* [g-ai], [oa-pub],
   [oa-search]. *Check:* the site's robots.txt; Search Console's URL
   Inspection.
7. **Keep a Bing Places listing as well.** *Why:* ChatGPT sends searches to
   Bing ([oa-search]). This is an indirect step; do not present it as
   ChatGPT's listing source. *Check:* the listing exists and matches the
   Google profile.
8. **Measure.** Google counts AI Overview clicks in Search Console under the
   "Web" search type ([g-ai]); ChatGPT adds `utm_source=chatgpt.com` to
   links it sends ([oa-pub]). *Check:* both appear in the clinic's analytics.
9. **Re-audit after about eight weeks** with the same ten questions, so the
   result can be compared (Spec 021 Penutup). Pages are re-read over days to
   months ([g-ai]).

## What the writer never advises

- Paying for placement, or anything that claims to "guarantee" being named.
  Google says there is no way to pay for local ranking ([g-local]).
- Fake, paid, rewarded or selectively requested reviews ([g-reviews]).
- Special AI files or markup as a fix. Google says none is needed ([g-ai]).
- Advertising that breaks Indonesia's rules on health service advertising
  (Permenkes 1787/2010): no superlatives such as "terbaik" or "satu-satunya",
  no comparisons with other clinics, no patient testimonials in the clinic's
  advertising, and no claims for unproven treatments ([permenkes]). Genuine
  reviews that patients post themselves on Google are not the clinic's
  advertising.
- Medical claims, results or promises about treatments.
- Dates for when AI will start naming the clinic.

## Sources

- [Google: AI features and your website][g-ai]
- [Google: creating helpful, reliable, people-first content][g-helpful]
- [Google Business Profile: tips to improve your local ranking][g-local]
- [Google: prohibited and restricted content (reviews)][g-reviews]
- [OpenAI: Searching the web with ChatGPT][oa-search] and [ChatGPT search for
  Enterprise and Edu][oa-ent]. These name Bing and "specialized data
  providers". **Read through search results only:** the pages refused a
  direct fetch from Nuave's build machine. Confirm before approval.
- [OpenAI: Publishers and developers FAQ][oa-pub]. Read through search
  results only; confirm before approval.
- [Permenkes 1787/MENKES/PER/XII/2010 tentang Iklan dan Publikasi Pelayanan
  Kesehatan][permenkes]. **The official text could not be opened from the
  build machine**; the points above come from secondary summaries. Confirm
  the wording, and that the regulation is still in force, before approval.

[g-ai]: https://developers.google.com/search/docs/appearance/ai-features
[g-helpful]: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
[g-local]: https://support.google.com/business/answer/7091
[g-reviews]: https://support.google.com/contributionpolicy/answer/7400114
[oa-search]: https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt
[oa-ent]: https://help.openai.com/en/articles/10093903-chatgpt-search-for-enterprise-and-edu
[oa-pub]: https://help.openai.com/en/articles/12627856-publishers-and-developers-faq
[permenkes]: https://www.peraturan.go.id/files/bn673-2010.pdf
