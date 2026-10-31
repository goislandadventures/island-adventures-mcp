# Island Adventures — SBA VetCert launch staging

**Status: NOT CERTIFIED / NOT APPROVED. Do not publish.**
Candor Multimedia, LLC (DBA Island Adventures) is pursuing SBA Veteran Small Business Certification (VetCert). Its SAM.gov CAGE review was pending as of 2026-10-30. This is *not* an SBA approval.

## Official SBA asset
- Source: https://legacy.sba.gov/brand/for-partners/sba-certified-businesses
- Exact official icon archive: https://legacy.sba.gov/sites/default/files/2024-05/decals-and-icons.zip
- Run `sh prelaunch/vetcert/fetch-official-icons.sh` from the repository root on an internet-connected machine to retrieve and inspect the official archive.
- Do **not** invent, redraw, recolor, or substitute the generic SBA agency logo for its VetCert badge.
- Distinguish VOSB from SDVOSB. Select the **Veteran-Owned Small Business (VOSB)** badge only upon confirming that exact category in the SBA approval.
- Official SBA guidance permits eligible certified firms to use the icon on their own websites and social media profiles, but not in paid ads, promotional materials, or anything implying SBA endorsement. Remove immediately if status lapses.

## Production deployment guardrail
Nothing in this staging branch should be merged or published until a dated SBA VetCert approval letter is confirmed AND the public SBA Small Business Search record matches Candor Multimedia, LLC. A SAM.gov veteran-owned self-identification or CAGE code alone is insufficient.

## Cloudflare site
Live goislandadventures.com is served by the Cloudflare Worker `island-adventures-site-production`, **not by this GitHub repository**. This GitHub staging branch has no production deployment linkage. Implement changes in the Cloudflare site's source/deployment process separately, after approval, validating changes on `island-adventures-site-staging` first.

## Placement plan, after approval
1. Website footer (site-wide): small exact SBA-approved VetCert icon beside a brief, factual `SBA-Certified Veteran-Owned Small Business` line, linked to the firm's *actual* SBA verification listing. Keep booking CTA visually primary.
2. About/Captain Jim section: icon alongside US Air Force veteran-owner bio, with a sentence clarifying VetCert verifies qualifying ownership/control; it does *not* mean SBA endorses the charter service.
3. Homepage owner trust row: optional single factual link to the About section; avoid an extra prominent badge beside the hero booking CTA.
4. Service pages (snorkeling, sandbar, sunset, custom, groups): reuse only the restrained site-wide footer element; do not duplicate the badge in pricing tables or paid-ads hero sections.
5. Blog: publish the drafted announcement with a real boat/captain photo, *not* a badge used as a promotional post image. Link to About and one appropriate booking page.
6. Google Business Profile Update: publish the drafted factual certification announcement, using a real trip image rather than the certification icon; link to the published blog or appropriate private-charter page. Do not present certification as safety certification or government endorsement.
7. Structured data: retain accurate `LocalBusiness` and relevant owner information. Add only genuinely verifiable certification claims once certified; avoid unrecognized pseudo-schema properties and keyword stuffing.

## SEO, AEO, performance and conversion QA
- Keep blog canonical, title, metadata and sitemap accurate; add to `/blog/` index once only.
- Do not create duplicate city/service landing pages; avoid unearned government endorsement claims.
- No new large image libraries; serve 1 responsive optimized SVG/PNG icon with dimensions, lazy-loading below fold, alt text.
- Test mobile/desktop navigation, footer, existing animations, buttons and WaveRez conversion flow before deployment.
- Confirm no deterioration to Core Web Vitals, indexing, existing FAQ/schema, or booking conversion events.
- Recheck SBA badge permission whenever certification status changes.

## Publication checklist
- [ ] SAM.gov entity active and CAGE issued
- [ ] SBA VetCert approval issued (VOSB, not a mere self-attestation)
- [ ] SBA Small Business Search entry verified, with exact firm name / UEI
- [ ] Exact permitted badge file downloaded and checked
- [ ] Cloudflare staging deployed, full regression checks passed
- [ ] Live footer and About published
- [ ] Blog published and indexed
- [ ] GBP Update published manually or through supported GBP workflow
- [ ] Verify live website and booking flow
