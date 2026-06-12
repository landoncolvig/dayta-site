# Project History

## 2026-06-08 16:05 — Added /privacy and /terms pages for Intuit OAuth review

### Issue / Task
DAYTA-4 + DAYTA-5: needed real Privacy Policy and EULA pages at `daytanalytics.com/privacy` and `/terms` to submit on the Intuit Developer Portal App Assessment form (and equivalent fields for Clio / RingCentral) for the DeChant Law QBO Data Extraction app registration.

### Actions Taken
1. Confirmed live host = GitHub Pages serving from `landoncolvig/dayta-site` (not Hostinger / not Squarespace despite domain registrar). `~/Documents/dayta-site/` is the source of truth; `~/Documents/dayta-website/` is an older stub.
2. Asked Landon for state of incorporation → **Texas** (used in Terms governing-law clause).
3. Wrote two new pages as `privacy/index.html` and `terms/index.html` (folder form so extensionless `/privacy` and `/terms` URLs resolve regardless of Jekyll being on/off).
4. Both pages reuse the index.html design tokens inline (Fraunces / IBM Plex Sans / Plex Mono; paper `#F4EDDC`, ink `#0A0908`, accent `#1A3FFF`; SVG paper-grain overlay; sticky nav; black footer).
5. New layout primitive: sticky-TOC + prose column. `.toc` becomes a wrap on mobile.
6. Privacy content: who we are, what we collect, third-party OAuth data (called out QBO / Clio / RingCentral / GHL / GCP explicitly), how we use it, no-sale clause, sharing list (Stripe, Google Workspace, AI providers), GCP-US storage + Secret Manager, retention, user rights, no tracking pixels.
7. Terms content: acceptance, services, SOWs, acceptable use (incl. no PHI / PAN without separate BAA), third-party credentials, IP (Client Materials vs Deliverables vs Dayta Tools), confidentiality, fees (Stripe, 1.5%/mo late interest, suspend at 30d, taxes), AS-IS warranty disclaimer (uppercase block), liability cap = 12 months of fees paid, indemnification (mutual), termination, **Texas governing law + venue**, changes, misc (independent contractor, assignment, notices, force majeure, severability, entire agreement).
8. Added `/privacy` and `/terms` links to the main index.html footer for crawlability + Intuit-reviewer discovery.
9. Committed + pushed: cbbd306 "Add /privacy and /terms pages for Intuit / OAuth app review" → GitHub Pages rebuilt in ~30s, both URLs returning 200 (no-slash form 301-redirects to slash form — both work).
10. Closed DAYTA-4 + DAYTA-5 in Jira with comments linking the live URLs (per `feedback_jira_default_close` memory).

### Files Modified
- `~/Documents/dayta-site/privacy/index.html` (new, 333 lines)
- `~/Documents/dayta-site/terms/index.html` (new, 365 lines)
- `~/Documents/dayta-site/index.html` (footer: added Privacy + Terms links alongside the two email addresses)

### Key Findings
- GitHub Pages serves `/privacy/index.html` as both `/privacy` (301→) and `/privacy/` (200), so the cleaner Intuit-form URL `daytanalytics.com/privacy` works without trailing slash.
- The two existing `dayta-*` folders are easy to confuse: `dayta-site` is the live one (has CNAME + matches live HTML), `dayta-website` is an older drafting workspace.

### Outstanding
- Texas governing law is now baked into Terms — if Dayta Analytics LLC is ever re-domiciled, search for "State of Texas" in `terms/index.html` and swap.
- No real lawyer review on either doc. Boilerplate is reasonable for the Intuit App Assessment gate, but consider a lawyer pass before any high-stakes signature event.
- Other OAuth providers (Clio, RingCentral) will reuse these same two URLs when their app-review forms come due — no per-provider page needed.

---

## 2026-05-30 15:25 — Built daytanalytics.com Marketing Site + Card Restyle + DNS Cutover

### Issue / Task
Landon needed two artifacts before a networking event:
1. A mobile business card at `card.daytanalytics.com` with a QR-driven contact-save flow
2. A new marketing site at `daytanalytics.com` to replace the existing Hostinger Website Builder site, positioned around "AI legibility" / "scale with AI not headcount" with three concrete feature pillars

### Actions Taken

**Marketing site (`~/Documents/dayta-site/`):**
- Built single-page editorial site: cream paper bg (`#F4EDDC`), ink `#0A0908`, single electric blue accent `#1A3FFF`. Fraunces (display, variable italic) + IBM Plex Sans (body) + IBM Plex Mono (labels)
- Sections: hero ("Scale with AI. Not headcount.") → playbook story (3X rev / 6→1 team / 0 hires, full-bleed black section) → authority strip (Fortune 100 + Y-Combinator) → 3 numbered feature pillars (automated branded reports / AI anomaly monitoring / custom AI chat layer) → sample dashboard in browser-frame mock → 2 testimonials (Nick @ Zenith, Lindsay @ Mass Culture) as oversized pull quotes → founder section → lead form
- Lead capture form via Formsubmit.co → `landon@daytanalytics.com` (4 fields: Name / Email / Agency / What you're scaling). In-page success state via JS fetch interception
- Stripped em dashes from body copy per Landon's style preference
- Generated agency-grade sample dashboard via `wireframe-generator` skill (5 KPI tiles, multi-line spend/revenue/profit trend, donut channel attribution, funnel by channel, top campaigns table with sparklines)
- Mobile QA: discovered `.hero-meta` flex was pushing viewport-wider on small screens, fixed with flex-wrap + defensive overflow handling

**Card restyle (`~/Documents/landon-card/`):**
- Restyled the existing dark-theme contact card to match the marketing site (cream paper, Fraunces + IBM Plex, hairline rules). Content/structure preserved, aesthetic swapped
- Trimmed redundant copy: dropped "FOUNDER, EST. JAN 2024" eyebrow, brand meta text, button sublabels ("Adds to your phone instantly", "What we do"), footer signature
- Added desktop layout: hairline frame + 18px offset shadow + editorial corner marks at >=760px viewport, vertically centered. Mobile stays full-width single column

**DNS + Deploy:**
- New GitHub repos: `landoncolvig/dayta-site` and updated `landoncolvig/landon-card`. Both on GitHub Pages
- DNS cutover at Hostinger (`hpanel.hostinger.com`): deleted ALIAS `@ → daytanalytics.com.cdn.hstgr.net`, added 4 A records `@ → 185.199.108–111.153`, added CNAME `www → landoncolvig.github.io`. MX (Titan email) untouched
- HTTPS certs provisioned via Let's Encrypt, then enforced via Pages API for both apex and card
- Card cert was initially stuck — cleared/re-set cname via `gh api -X PUT` toggle, then empty commit to trigger fresh build

**Sample dashboard:**
- Built at `~/Documents/dashboard_wireframes/dayta-agency-sample-dashboard.html` per the wireframe-generator skill template (Inter + Chart.js + blue palette)
- Bug: sparkline canvases blew up to fill cards because raw `<canvas>` elements without position:relative wrappers caused Chart.js infinite-grow feedback loop. Fixed by wrapping each canvas in a fixed-height div
- Headless-rendered to PNG at 1760x1700 viewport @ 2x scale = `dashboard.png` (3520x3400)

### Files Created / Modified
- `~/Documents/dayta-site/index.html` (marketing site, ~1400 lines with inline CSS/JS)
- `~/Documents/dayta-site/logo.png`, `founder.jpg`, `dashboard.png`, `CNAME`
- `~/Documents/landon-card/index.html` (restyled card)
- `~/Documents/landon-card/logo.png` (added)
- `~/Documents/dashboard_wireframes/dayta-agency-sample-dashboard.html`
- New GitHub repos: `landoncolvig/dayta-site`, `landoncolvig/landon-card` (already existed)
- Memory entries added:
  - `reference_dayta_sandbox_owner.md` — `dayta-analytics-sandbox` GCP project owned by `colviglandon@gmail.com` (personal), not `admin@daytanalytics.com`
  - `reference_daytanalytics_dns_hostinger.md` — DNS lives at Hostinger (`ns1.dns-parking.com` resolves via `dns.hostinger.com`), Squarespace's DNS panel for the same domain silently doesn't apply

### Key Findings
1. **`dns-parking.com` is Hostinger's parking DNS, NOT Namecheap's** (despite the name). Confirmed via SOA referencing `dns.hostinger.com`. Cost ~30 min of debugging
2. **Squarespace's "Managed Domain" DNS panel is decorative if nameservers point elsewhere** — Landon was editing records in Squarespace that were never propagating
3. **Hostinger uses `ALIAS` records at apex** (CNAME flattening) instead of literal A records. `dig` shows the resolved A records but the panel only shows the ALIAS — the records I told him to "delete" weren't user-visible until I corrected the instructions
4. **Chart.js sparklines + flex parents + no fixed-height wrapper = infinite-grow loop**. The fix is always `<div style="position:relative;height:Npx"><canvas></canvas></div>`, not bare canvas with CSS height
5. **Headless Chrome `--window-size=390,N` doesn't reliably constrain CSS viewport** — Playwright captures at 1920px regardless of `--viewport`. Real mobile QA needed osascript to resize an actual Chrome window to 410x920 and `screencapture`

### Outstanding
- **Formsubmit activation pending**: first form submission to `landon@daytanalytics.com` will trigger Formsubmit's verification email. Landon needs to click "Activate" once. After that, leads land in his inbox immediately
- The old Hostinger Website Builder marketing site at `daytanalytics.com` is no longer served (DNS now points to GitHub Pages). The site content still exists in Hostinger — not deleted, just orphaned
- Lock screen wallpaper for the new card (cream/ink aesthetic) was not regenerated — current wallpaper still points at `card.daytanalytics.com` which is fine, just the visual style of the wallpaper PNG doesn't match the new card. Worth regenerating if Landon wants brand-consistent
- Live URLs: https://daytanalytics.com (apex + www), https://card.daytanalytics.com

---
## 2026-06-11 20:21 - Design Audit + Fixes Shipped (claude-fable-5 session)

### Issue
Landon asked for a design audit of daytanalytics.com with UI improvement suggestions, then said "Implement."

### Actions Taken
1. Audited live site via playwright scroll-capture (desktop 1600px + mobile 390px, 21 section shots) + two DOM probes to verify claims (computed colors, bounding boxes, transforms) instead of eyeballing
2. Audit found 3 bugs + 6 polish items; presented ranked list
3. Implemented 5 in index.html, verified locally (incl. JS-disabled render), shipped
4. Follow-up: testimonial upgrades from a LinkedIn screenshot Landon provided

### Files Modified
- `index.html` (only file) — commits `337d84d` (auto-sync grabbed the audit fixes), `3cc97d7` (testimonials)

### Changes Shipped
- **Mobile footer**: was cramming 4 links on one row (global `min-width:0` reset let flex anchors shrink under their glyphs → visual collision/clipping). Now wraps; stacks in a column ≤720px
- **Mobile menu**: nav links were `display:none` ≤720px with no replacement. Added Menu button + full-screen editorial overlay (numbered Fraunces anchors 01–04, CTA at bottom, Escape/link-click closes). Nav CTA shortens to "Start →" ≤480px
- **No-JS guard**: `.reveal{opacity:0}` hid the entire page if JS failed. Now scoped under `html.js` (class set by inline head script); reduced-motion override updated to match specificity
- **Dashboard frame**: removed resting `rotateX(2deg) rotateY(-3deg)` tilt + hover-flatten + perspective; flat with chrome and offset shadow
- **Mid-page CTA**: "Want this layer under your brand?" + btn-primary after the dashboard sample (`.work-cta`)
- **Testimonials**: "Lindsay — Mass Culture" was a MISSPELLING of Lindsey Holzberger (confirmed same person); swapped in her stronger Jan 2026 LinkedIn quote + role "eCommerce Growth & Revenue Ops · Mass Culture". Added third quote: David Joyner, "Customer Success Manager · Cox2M" (colleague-era rec, Nov 2023)

### Key Findings
- **This repo auto-syncs**: a git-sync job auto-committed + pushed my edits within minutes ("Auto-sync: 1 modified") — edits to this working tree go LIVE without an explicit commit. Treat the working tree as production
- 3 audit items dissolved on reading source (low-res screenshots had misled): stamp already reads "Volume 02 / Issue 05" (consistent with "Vol. 02"), hero lede already 22px desktop, blue dot is the systemwide `--accent` (#1A3FFF) used on all hovers/focus — left all three alone
- Already solid (verified): single h1, all alts present, no h-overflow, label contrast 6.1:1 AA, dark sections 15.7:1, title/meta strong
- Reusable tooling left in `~/.claude/skills/playwright-test/output/`: `scroll-audit.cjs` (scroll-triggered section capture), `dom-probe.cjs`, `verify-local.cjs`

### Outstanding
- Nick (Zenith) stays name+company only by Landon's choice
- "What partners say" header is slightly loose now that David (colleague, not client/partner) is included — Landon's call, flagged

---
## 2026-06-12 11:29 - Contact Card Unlink + "Dayta." Rebrand Shipped

### Issue
(1) Landon didn't want his phone number publicly reachable from the main site. (2) Approved logo refresh: "Dayta." Fraunces masthead (option 02 from comparison board), replacing the geometric sans PNG everywhere.

### Actions Taken
1. Removed "Contact card ↗" link from index.html; card.daytanalytics.com stays live (number intentionally kept for QR sharing) + added noindex/nofollow to landon-card (`b021c76`)
2. Generated outlined wordmark: Fraunces VF instanced (wght 600, opsz 144, SOFT 30), shaped with uharfbuzz (kerning), -0.035em tracking, glyphs → SVG paths via fontTools. Venv at /tmp (PEP 668 blocks user pip)
3. Site (`2675cce`): nav = live text wordmark (site already loads Fraunces), favicon = outlined Fraunces D data-URI, `brand/` = master SVGs (ink/paper/favicon), logo.png replaced
4. Proposals: replaced shared `~/Documents/proposals/dayta-logo.png` (60 HTMLs re-render with new mark; committed in proposals repo)
5. landon-card (`afc07a2`..`afce3c4`): logo.png + favicon swapped, .brand .logo 18→24px (new mark carries descender), live hash-verified
6. Brand pack → `~/Desktop/dayta-brand-pack/`: stripe-icon-512 / stripe-logo-1200 (uploaded by Landon; advised brand=#F4EDDC, accent=#1A3FFF — ink logo vanishes on the default #000000), linkedin-banner (center-weighted to clear avatar overlap) + 300px tile, lockscreen-dayta.png (source: mobile-card/lockscreen-dayta.html, reuses qr-card.png)
7. Security sidebar: fixed sql_str backslash escaping in ~/.claude/scripts/lsa_action_agent.py (`9f2706e8b`)

### Files Modified
- `index.html`, `logo.png`, `brand/*` (this repo); `landon-card/{index.html,logo.png}`; `proposals/dayta-logo.png`; `mobile-card/lockscreen-dayta.{html,png}`; `~/.claude/scripts/lsa_action_agent.py`

### Key Findings
- Playwright `omitBackground` element-screenshots can bake ancestor div backgrounds partially into "transparent" PNGs — rasterize SVGs on a bare transparent page
- LinkedIn personal banners get the avatar circle over the bottom-left; keep lockups center/right
- Old logos all recoverable via git history in each repo

### Outstanding
- Stripe brand/accent colors: advised values, Landon was mid-save (icon+logo confirmed uploaded)
- LinkedIn banner/logo staged only — public profile change needs Landon's go (li-exec can push banner)
- Lock-screen wallpaper delivered; Landon sets it on-phone
- lsa_action_agent.py: proper fix is parameterized BQ queries (flagged, not refactored)

---
