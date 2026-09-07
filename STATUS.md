# Status — 2026-09-06

## Now

**All 10 steps done.** Firebase auth + Firestore sync are wired and verified live
against project `n423-van`, and the step-8 polish pass is complete: Lighthouse
**98 / 100 / 100 / 100** (Perf / A11y / Best Practices / SEO).

The app runs end to end as a guest and as a signed-in user: live weather, all
four screens, search, saved places that sync across devices, units, themes.

A second design pass (step 9) re-pulled the canvas through the design MCP and
closed nine gaps against it — the hourly rain-chance bars, the daily range bars
and the `.label` rule being the ones you can see from across the room. Step 10
then removed the last page container (screens are the page now, not a 1180px
card inside it), made sign-in a full-bleed takeover, built the board's
weather-matched transition into it, fixed the theme toggle, and made a day in
the forecast open its own 24 hours.

## Working

- [x] 0. Design intake — Cirro canvas unpacked, tokens extracted and verified
- [x] 1. Scaffold — Sass compiles clean, zero warnings
- [x] 2. Weather path — live Open-Meteo data on screen
- [x] 3. Hourly + 5-day forecast + minute-level rain bars
- [x] 4. Search + geolocation — combobox, keyboard operable
- [x] 5. Prefs + saved places (guest) — units, clock, theme, motion, panels
- [x] 6. Firebase auth — email/password + Google, verified live
- [x] 7. Firestore sync + merge — saved-place sync round-trip verified live
- [x] 8. Polish — Lighthouse 98/100/100/100, geolocation on gesture, self-hosted fonts
- [x] 9. Design fidelity — board re-imported and diffed, nine divergences closed
- [x] 10. Shell, sign-in takeover, weather transitions, day view, theme toggle

## Verified

Everything below was observed, not assumed. Run 2026-09-05.

**Automated**
- `npm test` → **47/47 passing** (format 17, rain 11, merge-locations 10, wmo 6,
  icon-coverage 3).
- `npm run build` → **compiles clean, zero warnings**, confirming no partial fell
  back to deprecated `@import`.
- All 19 JS modules pass `node --check`.

**In a real browser (Chromium, live API)**
- Forecast renders: reading, condition, rain claim, **12 hourly cells, 48 rain
  bars, 5 day rows, 18 weather SVGs**, metrics line.
- **No horizontal page scroll at 320 / 375 / 768 / 1440px.**
- **Zero console errors, zero failed requests** on every screen.
- Search "Bloomington" → 8 results; ArrowDown moves selection; Enter selects,
  loads that city, adds a place tab and writes to localStorage.
- No-match search shows "Nothing found for …" rather than throwing — the
  `results ?? []` guard exercised against the live API.
- **Unit switch to Imperial made 0 network requests** (counted in the browser)
  and still re-rendered every value. The fetch-metric-convert-locally design
  verified where it matters.
- Preference survived a reload. Theme toggle writes `data-theme`.
- Sign-in panel shows a live reading.

**Design fidelity**
- Contrast measured with the WCAG formula against `#faf8f5`:
  ink **16.84:1** ✓, ink-muted **4.56:1** ✓, ink-quiet **3.44:1** ✗ for body
  text — and the canvas already forbids it there. Dark: ink 16.29:1 ✓,
  sun on night ground 9.53:1 ✓.
  The canvas annotates ink as 14.8:1 and muted as 4.9:1; the real figures are
  16.84 and 4.56. Both still pass.

**API facts confirmed live**
- Every `current=` field name is accepted (one bad name 400s the whole request).
- `minutely_15` returns 48 steps × 15 min = 12 hours.
- Geocoding no-match omits `results` entirely: `{"generationtime_ms":0.43}`.

## Bugs found by verification and fixed

Worth recording, because none of these were visible from the code alone:

1. **Clock preference was dead.** Default is 24h; the UI rendered "4:00 AM".
   `formatClock`/`formatHour` ignored the setting entirely. Now threaded
   through, with tests pinning both clocks.
2. **A focus ring boxed the hero temperature.** The router focuses screen
   headings so screen readers announce navigation; Chrome matched
   `:focus-visible` on that programmatic focus and drew a full-width outline.
   Suppressed for `[tabindex="-1"]` targets only.
3. **The dry rain strip looked broken** — 48 near-invisible bars and no text.
   Given a visible floor and an explicit "Nothing falling in this window."
4. **The night crescent read as a stem** poking out of the cloud. Repositioned
   to where the sun disc sits in the day variant.
5. **Sign-in panel repeated itself**: "Partly cloudy. No rain… Partly cloudy."
6. **Mobile header wrapped** "Sign in" onto two lines at 390px.
7. **Hourly strip broke the gutter** — bleeding both edges pulled the first cell
   out of alignment. Now bleeds right only, so the last cell clips as a scroll
   affordance.

## Divergences from the canvas — deliberate

- **Alert switches omitted.** The canvas draws seventeen switches including
  rain-start lead time, severe alerts and a daily digest. Those need push
  notifications and a scheduler a static app cannot provide. Ten switches that
  work, rather than seventeen where seven do nothing.
- **"Pricing" / "Upgrade" / "Free plan · 4 of 4 places used" dropped.** There is
  no paid tier. The settings footer states the real account state instead.
- **"Radar" nav dropped** — no radar data source.
- **Mobile navigation is a bottom tab bar.** The canvas specifies this ("8H bars
  · tab bar"); the header has no room for it at 390px.
- **5 forecast days**, per the forecast artboard. (The settings artboard says
  "7-day range bars" — an internal inconsistency in the canvas. The screen the
  user actually sees wins.)
- **Rain phrasing is hedged.** The mockup reads "Stops in 35 minutes"; the data
  is 15-minute resolution, so the app says "about 30 minutes".

## Step 8 — polish pass (2026-09-06)

Lighthouse, mobile emulation, headless Chromium against the live app:

| Category | Before | After |
|---|---|---|
| Performance | 86 | **98** |
| Accessibility | 100 | **100** |
| Best Practices | 92 | **100** |
| SEO | 100 | **100** |

FCP 2.9s → **1.2s**, CLS 0.006/(0.49 mid-pass) → **0**, TBT **0ms**. Changes:

- **Geolocation on a user gesture, never on load.** Booting no longer prompts;
  it only auto-locates a user who already granted permission (reads silently).
  Everyone else gets a "Use my location" button in search. Fixes the Lighthouse
  `geolocation-on-start` flag and the iOS-Safari rejection of unprompted
  requests — the real-device concern. `permissionState()` added to geolocation.js.
- **Firebase lazy-loaded** (`data/cloud-repo.js` split from `locations-repo.js`;
  `auth-service` dynamically imported). A guest downloads **0** Firebase bytes;
  the SDK loads only on an existing session or when sign-in is opened. Removed
  ~134KB from the guest boot path (verified: 0 firebasejs requests on boot).
- **Self-hosted fonts** (`fonts/`, `base/_fonts.scss`) with the two critical
  woff2 preloaded — no third-party request, no render-blocking stylesheet,
  `font-display: optional`. Only the latin subset ships; Jakarta is one variable
  file for the whole 300–700 range.
- **Favicon + 180×180 apple-touch-icon** — kills the `favicon.ico` 404 (the lone
  console error) and gives a proper home-screen icon.
- **CLS → 0**: `main` reserves `100svh` so the footer starts below the fold and
  doesn't ride up on the empty/loading state; `svh` (not `dvh`) so the mobile
  URL bar doesn't resize it mid-scroll.

Not chased: `unminified-javascript` — inherent to the no-bundler design.

## Known issues / pending

- **Google sign-in not automatable** — verified email/password + Firestore sync
  live end to end; the Google popup needs a real account, so give "Continue with
  Google" one manual click. If it errors: enable the Google provider, and add
  `localhost` to Authentication → Settings → Authorized domains.
- **Real-device geolocation** — the gesture flow is verified with a mocked
  position in Chromium; a physical-phone tap is the last unautomated check.
- A test user (`cirro-test-…@example.com`) and its Firestore doc exist in the
  project from E2E runs — harmless; delete from Authentication → Users and the
  `users` collection to tidy up.
- `WeatherApp` is a git **submodule** of the parent `N423` repo. No git commands
  have been run, per the working agreement.

## Step 9 — design-fidelity pass (2026-09-06)

Re-imported `Cirro Final Board.dc.html` through the claude_design MCP and
diffed it against the local unpack: **byte-identical across all 11 sections**,
so the board has not moved since intake and every gap below was ours.

Nine divergences found by reading sections 03–11 (the spec sections the first
intake never mined) against the running app:

**Missing components**
- **`.label` had no CSS rule at all.** The mixin existed and eight elements in
  `index.html` already carried `class="label"`, but nothing emitted it — so the
  board's most repeated element (mono, uppercase, tracked, muted) rendered as
  sentence-case sans everywhere: the place line, all four section headings, the
  field labels, the footer.
- **Hourly cells had no rain-chance bar.** The board draws temperature, a
  ramp-coloured bar and the hour, captioned "NEXT 12 HOURS · RAIN CHANCE"; the
  app drew a second weather icon there instead. `precipitation_probability` was
  already being fetched, so this cost no request.
- **Daily rows had no range bar** — and `showRanges` ("Daily range bars") was a
  switch wired to nothing. The bar is the week's shape; without it the list is a
  label and two numbers.
- **No live ring.** `$motion` already declared `'live-ring': 2.4s` and nothing
  used it. It now sits against the rain claim — the one line that goes stale on
  its own.
- **Landing had no proof strip.** The board puts twelve bars and an axis under
  the live reading; that is the argument for the product.

**Token-level**
- **The switch was square.** The board draws it as a 38×21 pill on an 11px
  radius with a round 15px knob — the one documented exception to "radius zero".
- **Segmented options were the 10px/400 label token**; the board sets them one
  step up at mono 11px/500 in every settings row.
- **Rain intensity was binary.** Every wet bar was ink, so a drizzle and a
  downpour drew identically. Now stepped through the four-value data ramp.
- **Keyframes had drifted** from board section 09: `om-fall` travels to +14px
  (not +6), `om-rise` starts at `scaleY(.05)` (not 0 — a bar at zero height is
  invisible on frame 1, which is how the dry strip came to look broken), and
  `om-flash` is the board's two-strike curve rather than a four-dip flicker.

**Bugs this pass surfaced**
1. **`el()` silently dropped every custom property.** `Object.assign` onto a
   `CSSStyleDeclaration` writes a plain JS property and never reaches the inline
   style, so `--i` had never staggered a single bar. Now routed through
   `setProperty`; the range bar's `--from`/`--width` depend on it.
2. **`li { max-width: 28em }`** from the type layer was squeezing every day row
   into 448px of a 1004px list — invisible while the row was a label and two
   numbers, fatal once it had to hold a range bar.
3. The rain axis defaulted to `order: 0` and painted above its own bars.

**Also**
- Sign-in follows the board: "Continue with Google" is an underlined link beside
  "Forgot password", not a second filled-weight button competing with Sign in;
  "New here? Create an account" pairs on one line, top-right on desktop. The
  night panel now runs the full 660px with the board's three-part split — mark,
  reading, measured line — instead of floating as a card.
- The password rule runs under the whole row including SHOW, per the board.
- "Amber reserved for sun" is a stated rule, not a switch that can only be on;
  it is marked ALWAYS rather than left as an empty control slot.

**Verified in Chromium against the live API**
- Hourly: 12 cells desktop / **8 mobile** with the caption switching to match,
  all bars sharing a baseline, ramp spanning r1–r4.
- Daily: 5 range bars, ink / quiet / **amber on the clear day** — the only
  non-icon place the canvas spends the accent.
- Accessible names computed from the tree, not guessed: "NEXT 12 HOURS · RAIN
  CHANCE" at 1280, "NEXT 8 HOURS · RAIN CHANCE" at 390 (the unused count span is
  `display:none`, so it is excluded from the name); each cell reads
  "19° at 03, 40% chance of rain, light rain".
- Dark theme inverts the ramp and keeps the switch knob visible (the board's
  `#fff` knob would vanish on the near-white "on" track, so it rides `--ground`).
- **No horizontal scroll at 320 / 375 / 768 / 1440.** Zero console errors, zero
  failed requests. `npm test` **49/49**, `npm run build` clean.

### Divergences from the board, deliberate
Both of the divergences recorded here after step 9 were closed in step 10: the
sign-in panel is now full-bleed with no header, and no active state anywhere
uses an underline.

## Step 10 — shell, sign-in, transitions, day view (2026-09-06)

### The page is the page

`.screen`, the header and the footer each carried `max-width: 1180px` with auto
margins, so the canvas's **artboard width had become a container**: every screen
was a 1180px card centred in the viewport with paper showing down both sides —
screens inside screens. But 1180 is the width of the design's *viewport*, and 88
is its page gutter, so the scale is now expressed as the ratio it always was
(88/1180 = 7.46vw, 104/1180 = 8.81vw) and simply keeps holding above 1180. The
hero reading rides the same curve instead of jumping 110 -> 168 at one
breakpoint. No page container remains anywhere in the stylesheet.

### Sign-in is the whole window

The board's sign-in artboard has no header, no footer and no tab bar, and the
night panel runs flush to all four edges — which is why the mark sits *inside*
the panel. The router now writes the route to `body[data-route]`, the shell
hides its own chrome on that screen, and the panel is full-bleed with the mark
as the way back out. The global footer's attribution moves into the form column
so it isn't lost.

### The move that carries you into sign in

Board section 11 built its whole transition set around one journey, and the app
had implemented none of it — `$motion` even declared a `transition: 1.2s` token
that nothing referenced. Four opaque-sheet moves, never a cross-fade:

| Condition | Move | Direction |
|---|---|---|
| Thunderstorm | `flash` | does not travel; a beat, then a cut |
| Wind >= 25 km/h | `gust` | enters from the right, nine ink streaks raking ahead |
| Any precipitation | `fall` | comes down behind a curtain of drops |
| Clear or partly, by day | `iris` | opens from `circle(… at 76% 26%)` — where the sun sits |

`main` gained `overflow-x: clip` so a sheet waiting off-screen to the right
cannot widen the document — the no-horizontal-scroll invariant still holds at
every width. The board's Motion rows now exist and control it: **Weather-matched
transitions**, with **Move** (Live / Gust / Fall / Iris / Flash) and **Length**
(0.8 / 1.2 / 1.8s) as dependents that indent 26px and dim to 40% when the parent
is off — the section-08 pattern the app had CSS for but never used.

It fires on entry to sign-in only, which is the journey the board describes.

### Theme toggle

Three separate faults, all real:
- It **cycled light -> dark -> system**. "System" is where a theme comes from,
  not a third appearance, so the button now asks for the opposite of what is on
  screen — from 'system' that means committing to the opposite of whatever the
  OS is currently giving. Settings keeps the three-way choice.
- The **icon never changed**: a hardcoded moon. It now shows what a click gets
  you — moon on light, sun on dark — with the label to match. Drawn in ink, not
  amber: this sun is a UI affordance, not sunlight.
- **'system' never tracked the OS.** A `matchMedia` listener now keeps the icon
  honest when the OS flips with the app open.

### A day opens its own 24 hours

Clicking a day in the forecast list turns the hourly strip into that day,
midnight to midnight, with the caption following ("WED 9 · 24 HOURS · RAIN
CHANCE"); clicking it again returns the rolling next-twelve. The whole row is
the button, and its accessible name is assembled from the parts that are
otherwise silent: "Wed 9, overcast, 12° to 19°. Show its 24 hours." Twenty-four
columns scroll inside the strip on a phone — the page still never scrolls
sideways — and every third hour is labelled. The hero icon follows the open day
too, so the big picture and the strip describe the same day; closing the day
returns it to the condition outside right now.

### "Why is the sun never displayed"

The machinery was fine — `clear`, `partly` and `showers` each carry ten
amber-stroked elements, and `describe(0, day)` returns `clear`. It was the data:
Bristol's five days were `[51, 53, 3, 3, 51]` (drizzle and overcast, no clear
code at all) at 03:00 with `is_day: 0`.

But the question found a real bug next door. Codes 80–82 (showers) draw a **sun
disc** — the break in the cloud is what makes them showers — yet were marked
`dayNight: false`, so a 3am shower rendered an amber sun in a night sky. They
now have a `showers-night` variant, which `icon-coverage.test.js` verifies.

### Navigation reads by weight, not by rule

Underlines are gone from every "where am I" mark. Active nav, the active place
tab, the active bottom tab and the highlighted search result are ink at weight
600 against muted 400; the settings segmented keeps the board's 500. Nothing in
this design has pills, fills or boxes, and it now has no underlines either
except on actual links.

### Removing a place

The header tabs carried a small × beside each city — a destructive control a few
pixels from the thing you tap constantly to switch places. Removed. Saved places
are now managed in a **Saved places** group in settings, with a Remove control
per row and an empty state. Verified end to end: added Lisbon and Reykjavik
through the real search, removed Lisbon, confirmed only Reykjavik survives in
`localStorage`.

### Verified

Chromium, live API, after every change above:
- Screens span the viewport at 390 / 1180 / 1440 / **2200** with x=0 and no
  horizontal scroll at any of them, gutters scaling as one expression.
- Theme toggle over four clicks: dark -> light -> dark -> light, icon and label
  tracking every flip.
- Day selection: 12 cells -> 24, caption and `aria-pressed` following, back to
  12 on a second click.
- Sign-in: `header/footer/tab-bar` all `display: none`, panel at x=0 y=0
  520x900, mark linking home.
- Transition mid-flight: `data-move=gust`, `cover-right 1.2s`, leading edge
  present, document still 1280 wide; fully cleaned up afterwards.
- Dependents dim to 0.4 and indent 26px when their parent switch goes off.
- `npm test` **49/49**, `npm run build` clean, all 21 modules parse, zero
  console errors, zero failed requests.

## Architecture notes

Auth/Firestore layer:
- `auth/firebase.js` — pinned v10 modular SDK from the gstatic CDN, one init.
- `auth/auth-service.js` — email/Google/reset/sign-out, Firebase codes mapped to
  sentences via a typed `AuthError`. Dynamically imported.
- `data/cloud-repo.js` — Firestore `users/{uid}` doc holding `places` + `prefs`.
  Split from `locations-repo.js` (guest/localStorage) so the boot path is
  Firebase-free; dynamically imported.
- `ui/auth-form.js` — the sign-in form's behaviour (mode toggle, validation,
  reveal, forgot-password); lazy-imports the auth service.
- `main.js` — `handleAuth` is the one place sign-in/out is handled; unions guest
  places into the account with the tested `mergeLocations`. `ensureAuth()` loads
  Firebase on demand (existing session, or opening the sign-in screen).
