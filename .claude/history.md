# Project History

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
