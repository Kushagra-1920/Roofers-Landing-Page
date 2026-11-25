# Summit Ridge Roofing
Preview: run `npx serve .` in this folder, or double-click `index.html`. Deploy: upload the folder to any static host. No build step.

## Customize
- **Find every client detail:** search `index.html` for `EDIT:`.
- **Phone, text number, address, hours, availability, video, manager photo:** the CONFIG block at the top of `js/main.js`. Every tel link and visible number reads from it. Replace the numbers in `index.html` too if you want the page to work without script, and `telephone` in the JSON-LD.
- **Find and replace across files:** `TX-000000`, `GL-0000000`, `office@summitridgeroofing.example`, `summitridgeroofing.example`, `Summit Ridge`, `Luis Ortega`, `Dwayne Carter`.
- **Pricing:** section `#pricing`. Change the text and the `data-min` / `data-max` dollars on each row (the bars are drawn from them).
- **Hail season headline:** runs about March to June. An off-season version is in the comment above the `h1`.
- **Colors and fonts:** the `:root` block and `@font-face` rules in `css/styles.css`. Two weights only (400 and 600).
- **Leads:** the form posts nothing until you connect it. Edit `SR.sendLead` in `js/form.js`. Delete both "This demo does not send data." lines afterwards.
- **Live sites:** delete `<div id="np-ribbon">` (marked REMOVE FOR LIVE SITES), update `robots.txt` and `sitemap.xml`.

## Photos, video and the manager
All photos are stand-ins. The "before" images are digitally aged copies, so replace every pair with client photos taken from one camera position. Credits for the stock photos are in the footer; remove that block once none remain.
- `images/hero-roof.webp` 1920x1080 and `hero-roof-960.webp` 960x540 (keep the left side calm behind the headline)
- `images/crew.webp` 1173x1400 · `images/projects/` `southlake` (lead pair, 1600x1200), `frisco` and `plano` (1200x900), each `-before.webp` and `-after.webp`
- `images/og-image.jpg` 1200x630 · `favicon.svg` 64x64
- Video: replace `videos/intro.mp4` (30 to 45 seconds), `images/video-poster.jpg` (1280x720) and `captions/intro.vtt`. The file shipped is a placeholder slideshow. If the video file is missing, the whole block hides itself.
- Manager: add `images/team/luis.jpg` (4:5), then set `pm.photo` in the CONFIG. Until then an "LO" monogram shows.

## How tracking works
`js/track.js` pushes every event to `window.dataLayer`. Nothing is sent anywhere by itself, and no personal details (name, phone) are included. Add `?debug=1` to the URL to see each event in the console.
- **Events:** `form_view`, `form_start`, `field_complete`, `form_submit`, `booking_submit`, `slot_selected`, `cta_click`, `call_click`, `text_click`, `directions_click`, `video_play`, `video_75pct`, `scroll_depth` (25, 50, 75, 100), `faq_open`.
- **Campaigns:** `utm_*`, `gclid` and `fbclid` are kept for the session and added to `form_submit` and `booking_submit`.
- **Google Tag Manager:** add its snippet; it reads `dataLayer` directly. Create a Custom Event trigger per event name, then a GA4 event tag.
- **GA4 without GTM:** after the gtag snippet, forward each event by wrapping `dataLayer.push` once: `const p = dataLayer.push.bind(dataLayer); dataLayer.push = (e) => { if (e && e.event) gtag('event', e.event, e); return p(e); };`
- **Meta Pixel:** call `fbq('track', 'Lead')` when `form_submit` or `booking_submit` fires, and `fbq('trackCustom', name, data)` for the rest.
- **Call tracking:** put the tracking number in `phone` in the CONFIG, or let your call-tracking script swap the text of elements marked `data-phone`.
