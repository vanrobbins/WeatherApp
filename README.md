# Cirro

[Web4 Link](https://in-info-web4.luddy.indianapolis.iu.edu/~vanrobbi/N423/Cirro/)

A weather app that answers one question: **is it going to rain, and when does it stop?**

Native JavaScript, Sass with BEM, no framework and no bundler. Works on desktop
and mobile, installs to a phone home screen, and needs no API key.

```bash
npm install
npm run build      # compile Sass -> css/main.css
npm run serve      # http://localhost:3000
```

ES modules need `http://`, not `file://` — opening `index.html` directly will
appear broken. Use `npm run serve`.

| Script          | Does                     |
| --------------- | ------------------------ |
| `npm run build` | Compile Sass, compressed |
| `npm run dev`   | Recompile Sass on change |
| `npm run serve` | Static server            |
| `npm test`      | Vitest, 47 tests         |

## Data

[Open-Meteo](https://open-meteo.com) — no API key, no signup, free for
non-commercial use. Two endpoints: forecast and geocoding.

Precipitation resolves to **15-minute steps**, so the app says "rain stops in
about 30 minutes" rather than claiming a precision the data doesn't have. The
`minutely_15` block covers 12 hours ahead, which is the rain-chance strip.

Everything is fetched in metric and converted in `util/format.js`, so switching
units is a pure re-render and never triggers a network request.

## Structure

```
src/js/
  api/     weather-api · geocoding · geolocation
  data/    store · prefs · rain · locations-repo · merge-locations
  ui/      router · render-forecast · render-landing · render-settings
           render-signin · search-box · toast
  util/    format · wmo · icons · dom
src/scss/
  abstracts/  tokens · mixins        (emit no CSS)
  base/       reset · theme · typography · motion
  layout/     app-shell · header
  components/ one file per BEM block
```

Data flows one way: `api → store → ui`. Nothing in `ui/` fetches; nothing in
`api/` touches the DOM.

## Design

Built to the **Cirro** design system: two grounds, one ink family, one accent.
Radius zero, no shadows, underline means input. Amber marks sunlight and nothing
else. Every colour is a CSS custom property in `src/scss/base/_theme.scss` —
light and dark are one swap.

Contrast is verified, not assumed: ink 16.8:1, muted ink 4.56:1 (both pass
WCAG AA). The quiet ink at 3.44:1 is used only for data tints and icons, never
body text.

## Status

See [STATUS.md](STATUS.md) for what works, what's verified, and what's next.
