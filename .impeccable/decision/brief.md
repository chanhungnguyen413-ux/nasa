# Dashboard surface (src/App.jsx)

Scope: the single-page dashboard. Visitor mode: **Operate**. The presenter drives the demo for hackathon judges, on desktop/projector and phone equally.
Task: read 3 field readings, open the irrigation advice, click a term to learn it, and switch VI/EN.
Content: soil moisture 35% (low), NDVI 0.68 (good), drought risk Medium–High, a 7-day trend, per-plot readings on the farm map, and a data-source strip (SMAP, MODIS). Every number is labelled as simulated.
Memorable moment: the illustrated farm plan, with the advice panel flagging plot B and a 45-minute block drawn on the evening timeline.

## Direction contract

THESIS: The dashboard *is* the farm. An illustrated top-down plan of paddies, canal and tree line carries the readings on wooden field signs. It refuses the category default of a KPI-card grid floating on a gradient.

OWN-WORLD: Daylight paddy greens (#3F8F3A, #7CB342) on a pale leaf ground (#EAF3E3), canal blue (#2E86C1) for all water, earth brown (#8D6E4A) for dykes, posts and ink accents, and sun amber (#F2B134) for caution only. Plots are soft rounded polygons with dyke outlines. Signs are cream-free: white boards with a brown post. Moisture gets a stipple pattern as well as a tint.

STORY: Judges see a farm, then read that plot B is dry, tap "Irrigation advice", and understand: NASA satellite data became "drip irrigate 45 min at 18:00". Terms open plain explanations.

FIRST VIEWPORT: A top bar with the title, a "simulated data" chip and the VI/EN toggle. Below it, a full-width farm plan (about 55% of the viewport height) with 4 plots, canal and signs. Under the plan: a row of 3 readings and the primary advice button, full width on mobile and at the right on desktop.

FORM: Farm From Above. Grounded candidate 1 of the safer-register lineup. Seed key 265b333a.

Signature interaction: tapping the advice button grows the water line along the canal into plot B, then opens the advice panel with the evening timeline block. Motion: one orchestrated flow, disabled under reduced-motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
