---
name: NASA Adapting Farms
description: NASA Earth-observation data turned into plain irrigation advice, presented as a lime-and-moss agritech landing page with the working dashboard built into it.
colors:
  lime-100: "#eef9d9"
  lime-300: "#cff08a"
  lime-400: "#b8e55a"
  lime-500: "#a3d63f"
  moss-50: "#eef4ef"
  moss-100: "#dde9df"
  moss-700: "#1f6b3c"
  moss-800: "#155030"
  moss-900: "#0f3d24"
  moss-950: "#0b2e1b"
  ground: "#f3f5f1"
  surface-white: "#ffffff"
  line: "#e2e8e1"
  ink: "#10231a"
  muted: "#5a6b61"
  water-100: "#dcecf7"
  water-300: "#8cc0e3"
  water-500: "#2e86c1"
  water-700: "#1b5a86"
  sun-100: "#fdf1d3"
  sun-400: "#f2b134"
  sun-700: "#7f5306"
  clay-100: "#f6ddd2"
  clay-700: "#8f2f14"
  field-good: "#7ccf45"
  field-low: "#bfd154"
  field-very-low: "#dccb8c"
  canopy-dense: "#3fae4a"
  canopy-mid: "#9fd55a"
  drought-2: "#c9cf52"
  drought-4: "#e07b2a"
  drought-5: "#d9552f"
  dry-stipple: "#5b4527"
typography:
  display:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 2.6rem + 1.9vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  stat:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  headline:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  statement:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  title-lg:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.4
  card-label:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
  lead:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-sm:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  button:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
  label:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
  label-sm:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.4
  caption:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
rounded:
  md: "8px"
  focus: "12px"
  inner: "16px"
  card: "24px"
  panel: "28px"
  frame: "32px"
  full: "9999px"
spacing:
  hair: "4px"
  tight: "8px"
  snug: "12px"
  gap: "16px"
  card: "20px"
  panel: "24px"
  panel-wide: "28px"
  gutter: "20px"
  gutter-wide: "32px"
  section: "80px"
  section-wide: "96px"
components:
  button-primary:
    backgroundColor: "{colors.lime-400}"
    textColor: "{colors.moss-950}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.lime-300}"
  button-dark:
    backgroundColor: "{colors.moss-900}"
    textColor: "{colors.surface-white}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-dark-hover:
    backgroundColor: "{colors.moss-800}"
  button-ghost:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  button-outline-on-dark:
    textColor: "{colors.surface-white}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
  segmented:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "4px"
  segmented-option:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  segmented-option-active:
    backgroundColor: "{colors.moss-900}"
    textColor: "{colors.surface-white}"
  select:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "8px 36px 8px 40px"
  card:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  card-dark:
    backgroundColor: "{colors.moss-900}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.panel}"
    padding: "24px"
  advice-tile:
    backgroundColor: "{colors.lime-400}"
    textColor: "{colors.moss-950}"
    rounded: "{rounded.card}"
    padding: "20px"
  advice-tile-hover:
    backgroundColor: "{colors.lime-300}"
  advice-panel-head:
    backgroundColor: "{colors.moss-950}"
    textColor: "{colors.surface-white}"
    typography: "{typography.title-lg}"
    padding: "28px 32px"
  advice-panel-head-fine:
    backgroundColor: "{colors.moss-800}"
  stat-band:
    backgroundColor: "{colors.moss-950}"
    textColor: "{colors.surface-white}"
    typography: "{typography.stat}"
  badge-good:
    backgroundColor: "{colors.lime-100}"
    textColor: "{colors.moss-900}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  badge-warn:
    backgroundColor: "{colors.sun-100}"
    textColor: "{colors.sun-700}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  badge-bad:
    backgroundColor: "{colors.clay-100}"
    textColor: "{colors.clay-700}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  pill-simulated:
    backgroundColor: "{colors.sun-100}"
    textColor: "{colors.sun-700}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  tag-what-if:
    backgroundColor: "{colors.sun-100}"
    textColor: "{colors.sun-700}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  hero-chip:
    textColor: "{colors.surface-white}"
    rounded: "{rounded.full}"
    padding: "8px 20px 8px 8px"
  popover-term:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: "20px"
    width: "320px"
  input-chat:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
    height: "48px"
  bubble-user:
    backgroundColor: "{colors.moss-900}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.card}"
    padding: "10px 16px"
  bubble-assistant:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
---

# Design System: NASA Adapting Farms

> **Scope.** This file describes the current visual system: the redesign that ships as `index.html`. It is built from `site/template.html` and `site/styles.css` by `npm run build`. It replaces the earlier "Farm From Above" system (illustrated plan, white signboards, canal-blue actions). That earlier React app has been removed; the only surface is `index.html`, built from `site/`. Don't bring back its tokens (leaf-*, canal-*, earth-*).

## Overview

**Creative North Star: "The Live Field Brochure"**

This is a premium agritech landing page whose product actually runs on the page. It uses the full grammar of a marketing site: a full-bleed aerial hero, a stat band, a statement paragraph, a photo carousel, a dark forecast section, stories and a photo CTA. The working dashboard sits inside that sequence instead of being described and linked elsewhere. The world is vibrant field lime against deep moss, laid on a pale green-grey ground with white cards. Lime is the colour you press. Moss is the colour of depth: the hero overlay, the stat band, the forecast section and the dark "digital farm" map.

Shapes are soft and generous. Every control is a pill, and cards run 24 to 32px. Headlines are big and set in Be Vietnam Pro 800 with tight tracking, and body text drops back to a muted green-grey. Photography is verified Unsplash aerial paddies and fields, and every photo sits on a moss fallback so the page holds its colour when an image fails. Motion is fade-and-rise on reveal, hover lifts of 2 to 4px, and one signature sequence on the farm map, where a glowing water line runs from the gate into a plot.

The world was pinned by the user to the NEOFARM reference, so it did not come from a concept roll. The build honours that pin: lime and moss on light grey, pills, a moss stat band, grid and carousel sections, and fade/slide motion.

**Key Characteristics:**
- Landing-page grammar that carries the live product: hero → stats → statement → dashboard → solutions → forecast → water → stories → CTA.
- Lime pills for primary actions, moss for depth, white cards on a pale ground.
- Dark moss "digital farm" map with glossy plots, floating white data chips and a breathing lime selection ring.
- Water blue appears only where water is shown.
- One family, Be Vietnam Pro, in heavy weights, with tabular figures for every changing number.
- Everything pressable is a pill. Cards are 24px, dark panels 28px and photo frames 32px.
- A single ease-out-expo curve drives every entrance. Reduced motion turns it all off.

## Colors

The palette is a sunlit field: saturated lime against deep moss, over a cool green-grey ground. Water blue, sun amber and clay each have a narrow job.

### Primary
- **Field Lime** (lime-400): the colour of action. It fills primary pills ("Hợp tác / Partnership", "See today's advice"), the advice tile in the readings row, the mobile advice button, the floating assistant button, the play button, icon discs, the logo disc, the active language option, the selected-plot ring and disc, the canal-gate marker, the "water" action chip on each plot, and range-slider fills. It is also the text-selection highlight. Text on lime is always Moss Night.
- **Lime Glow** (lime-300): the hover fill for every lime pill and tile. On dark sections it is the accent text colour: "Hôm nay:" in the hero chip, slider values, the NDVI line and its labels in the week chart, and the what-if result heading.
- **Lime Spark** (lime-500): the 3px keyboard focus ring, the hover underline on explainable terms, and bullet dots in popovers.
- **Lime Wash** (lime-100): the good badge, the "done" and "scheduled" chips, reason icon discs in the advice panel, the past-day notice under the map and the share-card water line.

### Secondary
- **Moss Night** (moss-950): the stat band, the forecast section, the water-savings panel, the head of the advice panel (water and wait), hero gradient overlays, scrims (60% share, 40% assistant), text on lime, and the unselected plot disc on the map.
- **Deep Moss** (moss-900): the map frame, dark cards in the forecast section, the dark pill button (schedule, print, ask the assistant), the solid-nav contact pill, the active segmented option, user chat bubbles, step-number discs, the timeline watering block, the mobile theme colour and the map's ground.
- **Forest** (moss-800): hover for dark pills, the head of the advice panel when no watering is needed, the farm parcel on the map and photo fallbacks.
- **Pine** (moss-700): focus and hover borders on light controls (select, ghost pill, story cards, carousel arrow), the NDVI icon, the scrollbar thumb, the text caret, and green text such as "≈ 40% saved" and source lines.
- **Moss Mist** (moss-50) and **Moss Pale** (moss-100): hover grounds for ghost icons, the empty-log note and the QR placeholder (moss-50); the off-track of light sliders and gauges (moss-100). On dark sections moss-100 at 70% sets small notes.

### Tertiary
- **Water** (water-500, water-300, water-100, water-700): the moisture gauge fill, the drip bar in the water comparison, water in the tank, the canal (a water-700 → water-500 → water-700 gradient), the ditch, the flowing water line (water-300 with a glow), ripples, rain streaks, the sheen on a watered plot, forecast rain bars and the forecast half of the week chart (water-500 at 12%).
- **Sun** (sun-400, sun-100, sun-700): uncertainty and caution. It covers the simulated-data pill, the warn badge, the what-if tag and its dashed outline, the illustrative-stories label, the sample tag, the drought icon and the middle drought step. Sun-400 also colours the clear-day weather glyph.
- **Clay** (clay-100, clay-700): the bad badge only. Clay-100 also shades the hot-midday band in the timeline.

### Neutral
- **Field Ground** (ground): the page, the share dialog, the assistant drawer, the chat input, and story cards at rest.
- **Card White** (surface-white): cards, the solutions and stories sections, the solid nav at 90% with blur, the map's control band, popovers, the CTA card and the footer.
- **Hairline** (line): every 1px border and divider on light surfaces.
- **Ink** (ink): primary text. It is a green-black, never neutral.
- **Muted** (muted): secondary text, lead paragraphs, descriptions, axis labels and idle segmented options (5.2:1 on ground).

### Field Condition Scale (map data only)
These colours are used only in the map, the legend and the drought gauge. Moisture: **Field Good** (field-good) when moisture meets the need, **Field Low** (field-low) with sparse stipple, and **Field Very Low** (field-very-low) with dense stipple. The stipple dots are **Dry Stipple** (dry-stipple). NDVI: **Canopy Dense** (canopy-dense) above 0.65, **Canopy Mid** (canopy-mid) from 0.55, and Field Very Low below that. Drought runs in five steps: Field Good, **Drought 2** (drought-2), sun-400, **Drought 4** (drought-4) and **Drought 5** (drought-5). Steps 4 and 5 carry a 45° white hatch.

### Named Rules
**The Lime Is Pressable Rule.** A lime fill means you can press it or it is selected. Text on lime is always Moss Night, never white.

**The Water Stays Blue Rule.** Water blue marks water only: the canal, rain, measured moisture fills, the flow line and the watered sheen. It never marks an action, a selection or focus. Recommended watering is an action, so it takes lime. The lime moisture bars in the week chart are recorded drift, not precedent.

**The Amber Means Unsure Rule.** Sun amber marks simulated, sample, illustrative or hypothetical content and caution. What-if states add a dashed sun-400 edge. Amber never fills a primary action.

**The Tint Plus Texture Rule.** On the map, condition is never shown by colour alone. Dry is stippled and severe drought is hatched, and the legend swatches repeat the same textures.

## Typography

**Display Font:** Be Vietnam Pro (with ui-sans-serif, system-ui, sans-serif). The fonts are inlined into the single-file build.
**Body Font:** Be Vietnam Pro.

**Character:** One humanist sans with full Vietnamese diacritics carries both languages at equal quality. Headlines are extra-bold and tightly tracked. Body copy relaxes into regular weight in Muted, so the headline does the shouting and the paragraph does the explaining.

### Hierarchy
- **Display** (800; 2.6rem on phones, 3.75rem at 640px, 4.5rem at 1024px, 3rem on short screens; 1.05): the hero headline only, white on the photo, max about 42rem wide.
- **Stat** (800; 3rem to 3.75rem, tabular): the stat band numbers. The unit follows at 1.875 to 2.25rem/700 in lime-400.
- **Headline** (800; 2.25rem, then 3rem at 640px): every section h2.
- **Statement** (700; 1.7rem, then 2.25rem; 1.3 to 1.25): the mission paragraph whose words darken as it scrolls into view. The second clause lands in Muted.
- **Figure** (800, 3rem, 1, tabular): reading values. The unit sits at 1.5rem/700 in Muted. Word-valued readings (drought level) drop to 1.5rem.
- **Title Large** (800, 1.5rem, then 1.875rem in the advice head; 1.375): the advice headline, dark-card titles and the share title.
- **Title** (800, 1.125rem): advice subsections ("Why?", "What to do", "Timeline"), solution-card titles and the log title (1.25rem).
- **Card Label** (700, 15px): reading-card headers with a 20px icon.
- **Lead** (400, 1.125rem, 1.625, Muted or white/70–80): the sentence under every section headline.
- **Body** (400, 1rem, 1.625): advice reasons, steps and summary (max 70ch). Story quotes run at 17px, and carousel descriptions and chat at 15px.
- **Body Small** (400, 14px): reading descriptions, popover text and source metadata.
- **Button** (700, 15px): pill buttons. Nav links are 14px/600, and the language switch and map pills 13px/700.
- **Label** (700, 14px): badges, segmented options, selects and preset chips.
- **Caption** (700, 12px): what-if and sample tags, chart ticks and timeline hours (500).

### Named Rules
**The Tabular Figures Rule.** Every number that can change sets tabular figures: stats, readings, times, m³, dates, chart labels and map chips. Decimal commas follow the language, so Vietnamese shows 0,68.

**The Twelve-Pixel Floor Rule.** Text drawn inside the map never renders below 12px on screen. When the map is drawn small, the data chips scale up (to 1.45× wide, 2.1× on phones) and drop their secondary line instead of letting text shrink.

**The Sentence Case Rule.** Headlines, labels and pills are set in sentence case with normal or tight tracking. The only uppercase is the two-letter language codes.

## Layout

The page is a vertical story of full-bleed bands and contained sections. Content sits in a centred 1152px column with 20px gutters on phones and 32px from 640px.

- **Nav:** fixed and transparent over the hero, with white text. After 40px of scroll it turns white/90 with backdrop blur and the card shadow, and the text turns Ink and Muted. It holds the logo disc, section links (1024px and up), the VI/EN switch and a Contact pill (640px and up).
- **Hero:** a full-bleed photo under four moss layers (a flat 35% and a left-to-right and top-to-bottom gradient). Content is bottom-aligned, with a minimum height of 600px, or `100svh − 212px` at 640px and up so the stat band peeks above the fold. The headline, lead and pill pair sit at the left, and the glass advice chip and round scroll arrow sit on a row below them.
- **Stat band:** Moss Night, four stats in two columns (four at 1024px), 36px vertical padding.
- **Sections:** 80px vertical padding, rising to 96px at 640px (112px for the statement). Every section opens with Headline + Lead at a max of 42rem, with controls or carousel arrows aligned to the right.
- **Dashboard:** a 28px map frame, then a readings row (one column, then two at 640px, then four at 1024px, 16px gaps) whose fourth cell is the lime advice tile. The advice panel inserts full-width below, splitting 1.1fr / 1fr at 1024px when there is a watering plan.
- **Solutions carousel:** a horizontal snap row of 300px cards (78vw on phones) that bleeds past the container, with 20px gaps and no visible scrollbar.
- **Forecast:** a full-width week-chart card, then two dark photo cards side by side at 1024px.
- **Stories:** three columns from 768px.
- **Mobile:** below 640px the advice tile and floating assistant button give way to a fixed bottom bar (white/95, blur, safe-area aware) holding the lime advice pill and a moss assistant pill. The footer reserves 112px of bottom padding for it.

Breakpoints are 640px, 768px and 1024px. There is also a `max-height: 780px` adjustment for projectors and short laptops. Sections scroll into view with an 84px top margin.

## Elevation & Depth

Depth is a hybrid of tone and two soft, moss-tinted shadows. Light cards sit on the ground with Card at rest and rise to Lift on hover (with a 4px translate). Dark sections get depth from tone alone (moss-950 band, moss-900 card) rather than shadow. Glass (white/10 over blur) appears only on the hero chip and on outline pills over photos. Inside the map, plots get a soft blurred drop shadow, a top-left gloss and a hairline white inner edge, which gives them their "glossy tile" feel.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(11 46 27 / 0.05), 0 8px 24px -12px rgb(11 46 27 / 0.18)`): resting cards, the map frame, the advice tile, map pills, the solid nav, the slider thumb and carousel arrow discs.
- **Lift** (`box-shadow: 0 2px 4px rgb(11 46 27 / 0.06), 0 22px 40px -18px rgb(11 46 27 / 0.35)`): hovered cards, the open advice panel, popovers, dialogs, the drawer, the CTA card and the floating assistant button.

### Named Rules
**The Moss Shadow Rule.** UI shadows are tinted from Moss Night, never neutral black. They only use Card or Lift.

**The Lift On Hover Rule.** Interactive cards and pills rise on hover: 2px for pills and chips, 4px for cards, with the shadow stepping from Card to Lift.

## Shapes

The shapes are soft, round and generous. Nothing in the UI has a square corner.

- **Pills (9999px):** every button, segmented switch, select, badge, tag, map pill, legend swatch, icon disc, gauge track and the logo mark.
- **Cards (24px):** reading cards, popovers, carousel photos, the share print card, the QR tile and chat bubbles (with one 8px corner as a tail).
- **Panels (28px):** the map frame, the advice panel, the dark forecast cards, the water panel, the log card, story cards and the share dialog.
- **Frames (32px):** the photo CTA block and the assistant drawer's leading edge.
- **Inner (16px) and small (8px):** the timeline track, the what-if result link and the empty-log note; the timeline watering block.
- **Map geometry:** 26px-radius plots, a 36px-radius parcel, pill-shaped chips and labels, and round gate markers.
- **Line language:** a dotted 2px underline marks a term that explains itself. A dashed stroke or outline marks a hypothetical or a threshold (the what-if outline, the crop-need line, the "today" divider).

### Named Rules
**The Pill Controls Rule.** If it can be pressed, it is a pill or sits in one.

**The Dashed Means What-If Rule.** Dashed strokes are reserved for hypotheticals and thresholds. Solid strokes are measured fact.

## Components

### Buttons
Buttons are confident and tactile: a lime pill to commit, a moss pill for the second action, and a white or glass pill for the third.
- **Shape:** fully rounded, padding 12px × 20px, Button type, with an optional 16px lucide icon and an 8px gap.
- **Primary (lime):** Field Lime fill, Moss Night label. Hover moves to Lime Glow and rises 2px over 300ms.
- **Dark:** Deep Moss fill, white label. Hover moves to Forest. Used for schedule, print and ask the assistant.
- **Ghost:** white fill, Hairline border and Ink label. Hover changes the border to Pine. Used for share and copy.
- **Outline on dark or photo:** a white/60 border, white label and a white/10 hover. Its siblings on dark cards are the preset chips (white/25 border, lime border on hover, lime fill when pressed).
- **Round icon buttons:** 40 to 48px discs. Carousel arrows (outline and lime), the scroll arrow, play and send.
- **Focus:** a global 3px Lime Spark outline with a 3px offset.

### Chips and Badges
- **Status badge:** a pill (4px × 12px, 14px/700) with a 16px icon. Good is Lime Wash with Deep Moss and a check. Warn is Sun Wash with Sun Deep and a triangle. Bad is Clay Wash with Clay Deep and a circle-alert.
- **Map pills:** 13px/700 with the Card shadow. The simulated pill is amber with a flask icon. The live pill is white/95 with Deep Moss text and a satellite icon.
- **What-if and sample tags:** 12px/700 amber pills. What-if tags carry a dashed sun-400 border.
- **Term chip (dark sections):** a white/20 border on white/5, turning to a lime border on hover.

### Cards / Containers
- **Light card:** Card White, 24px (28px for the log), 1px Hairline, Card shadow, 20px padding (24px for larger cards). Hover rises 4px onto Lift.
- **Dark card:** Deep Moss, 28px, no border or shadow, a 208px photo header that scales to 105% on hover, and 24 to 28px padding.
- **Story card:** Field Ground with a Hairline border at rest. Hover turns it white with a Pine border and Lift.
- **Reading card anatomy:** a 20px icon and explainable term title, then the Figure with a status badge aligned to its baseline, then a 10px pill gauge, then a Body Small sentence. The moisture gauge is water-500 on moss-100 with a Moss Night need tick. The NDVI gauge is a soil-to-canopy gradient with a white-ringed Moss Night knob. The drought gauge is five pill steps, with future steps at 25%.

### Inputs / Fields
- **Select:** a white pill with a Hairline border, a 16px Pine leading icon and a Muted chevron. Hover and focus-within change the border to Pine.
- **Segmented switch:** a white pill track with a 4px inset. The active option is Deep Moss with white text (lime with Moss Night text for the nav language switch).
- **Range slider:** a 28px hit area and an 8px pill track, filled lime up to the thumb over moss-100 (white/15 on dark). The thumb is a Deep Moss disc with a 4px lime ring and the Card shadow.
- **Chat input:** a Field Ground textarea with a Hairline border and 24px radius, 48px minimum. Focus changes the border to Pine. The send button is a 48px lime disc that turns Hairline when disabled.

### Navigation
The logo is a 36px lime disc holding a sprout, followed by a 15px/800 wordmark. Links are 14px/600 pills. The language switch is a bordered pill group. Everything recolours when the nav goes solid.

### Hero Advice Chip (signature)
A glass pill (white/10, white/25 border, backdrop blur) holding a 40px lime icon disc and today's advice in one 15px/600 line, with "Today:" in Lime Glow. It opens the advice panel and rises 2px on hover.

### Digital Farm Map (signature)
A single SVG scene on Deep Moss with a faint dot survey grid, a blue canal with drifting ripples and a moss name pill, a lime gate marker, a Forest parcel, low-contrast canopy circles at the edges and a Moss Night vignette.
- **Plots:** glossy 26px-radius tiles tinted by the active layer (moisture, NDVI, drought), with a crop texture, condition stipple or hatch, a soft drop shadow, a top-left gloss and a white inner edge.
- **Data chips:** white pills floating on each plot, holding the plot letter in a disc (Moss Night, or lime when selected), the value at 25px/800 Ink and a secondary line at 14px/600 Muted. Below the chip is the action chip: lime with a drop icon for water ("18:00 · 45′"), water-300 for wait, and white for fine.
- **Selection:** a 5px lime ring with a soft glow that breathes in stroke opacity every 2.4s.
- **Water flow:** "Gợi ý tưới tiêu" draws a 9px glowing water-300 line from the gate into the plot over 1100ms. White dashes then run along it, and a blue streaked sheen fades onto the plot after 700ms.
- **Rain:** when 10mm or more is due within 48 hours, a Moss Night dim and falling water-300 streaks appear.
- **What-if:** the frame gains a dashed sun-400 outline.
- **Control band:** a white strip under the map with the lime play disc, the day slider, the day label and the textured legend.

### Advice Panel
A 28px white panel with the Lift shadow that rises in over 600ms. The head is Moss Night (Forest for "fine") and holds a 48px lime icon disc, the Title Large headline in white, the summary, a white/30 outline share pill and a close button. The body has "Why?" reasons with Lime Wash icon discs, numbered steps in Deep Moss discs with lime numerals, and the day timeline (tinted bands from 5:00 to 23:00, a Deep Moss watering block and a Deep Moss pill label). Water comparison bars follow (water-500 drip against the flood bar). The dark schedule pill turns into a Lime Wash "scheduled" chip with an undo link.

### Stat Band and Statement
Stat numbers count up on reveal, with lime units and white/moss-100 labels. In the statement paragraph each word moves from ink at 22% to full Ink (or Muted for the second clause) as the paragraph scrolls, and a 2.4em pill photo is set inline between the clauses.

### Week Chart
Dark, inside a Deep Moss card. The measured side has moisture bars (lime below the crop need, white/35 at or above it), a lime-300 NDVI line with Moss Night dots and lime-outlined value pills, and a dashed sun-100 need line. A dashed white "today" divider separates it from the forecast side, which has weather glyphs, maximum temperatures and water-300 rain bars on a faint blue ground.

### Dialogs
- **Share sheet:** a Field Ground dialog, 28px, on a 60% Moss Night scrim. It holds a white print card (the only thing that prints) and a QR tile.
- **Assistant drawer:** slides in from the right, 440px (full width on phones), Field Ground with a 32px leading radius. User bubbles are Deep Moss and answers are white with Hairline and Card. Each answer says whether it came from the AI or is a sample.
- **Term popover:** white, 24px, 320px wide, Lift. It docks as a bottom sheet on phones.

### Motion
One curve drives every entrance: ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Reveal:** rise 24px and fade over 900ms, staggered by 80 to 180ms.
- **Hero photo:** zooms from 1.08 over 2.4s.
- **Advice panel:** rises 16px over 600ms.
- **Popover:** pops in 6px over 260ms.
- **Drawer:** slides 48px over 480ms.
- **Scrim:** fades over 300ms.
- **Hovers:** 300ms.

Reduced motion removes every animation and transition and shows the statement fully lit.

## Do's and Don'ts

### Do:
- **Do** put primary actions on Field Lime pills with Moss Night text, and hover to Lime Glow with a 2px rise.
- **Do** use Moss Night and Deep Moss for depth: overlays, bands, dark sections and the map.
- **Do** keep water blue for water only, and let recommended watering read as a lime action.
- **Do** mark anything simulated, sample, illustrative or hypothetical in amber (sun-100 with sun-700), with a dashed sun-400 edge for what-if.
- **Do** set every changing number with tabular figures and keep map text at 12px or larger by scaling the chips.
- **Do** use only the Card and Lift shadows on UI, stepping to Lift with a 4px rise on hover.
- **Do** make every explainable term a dotted-underline button with an info icon that opens a plain-language popover.
- **Do** set every photo on a moss fallback and credit it in the footer.

### Don't:
- **Don't** put white text on lime, or use lime for text on light grounds.
- **Don't** use water blue for actions, selection or focus, and don't introduce a new hue for water.
- **Don't** use amber as decoration or as a primary action fill.
- **Don't** use square corners or small radii on controls. If it can be pressed, it is a pill.
- **Don't** use neutral grey or black for UI text, borders or shadows. Ink is green-black, and shadows are moss-tinted.
- **Don't** add a second typeface, uppercase labels or letter-spaced kickers above headlines.
- **Don't** present stories, partners or pilots as real. Stories carry the illustrative label, and there is no NASA insignia or implied affiliation.
- **Don't** reintroduce the removed design's tokens (leaf, canal, earth).
