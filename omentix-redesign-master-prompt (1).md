# Redesign Brief — Omentix Tech Portfolio (One-Shot Master Prompt)

Execute this as a single, complete pass. Don't ship a partial or "safe" version and wait for follow-up — treat the checklists below as your own QA gate before you consider this done.

---

## 0. Before you touch code — ground yourself

GSAP (which this project already uses) became 100% free in late 2024, including every formerly paid "Club GSAP" plugin — SplitText, MorphSVG, ScrollSmoother, CustomEase, Flip, Draggable, ScrambleTextPlugin, Observer, Inertia, and the rest. There's no license restriction stopping you from using any of them, including commercially.

If you have shell/tool access, install GreenSock's official skill package first so you're working from grounded, current GSAP API knowledge instead of guessing:
```
npx skills add https://github.com/greensock/gsap-skills
```
It's explicitly built to work with agentic coding tools like you. Use it.

---

## 1. Project context

Single-page agency portfolio: `index.html`, `style.css`, `main.js`. Vanilla JS, no framework, no build step. Stack in use: GSAP 3 + ScrollTrigger, Lenis (smooth scroll), a hand-rolled character-splitter (`splitChars`) for text reveals. Current design tokens: paper/ink palette (`--paper #F3EADA`, `--ink #101024`, `--violet #6D28D9`), type stack Clash Display / Satoshi / Sentient / JetBrains Mono, SVG-filter film grain, custom magnetic cursor.

Sections, in order: sticky `.nav`, `.hero`, `#story-section` (pinned scroll-scrubbed video with 5 text beats), `.work` (one featured case study + product rows + a "coming soon" card), `.contact` + footer.

The business: Omentix Tech, a small dev/AI-automation studio in Bhuj, India. The site needs to read as premium and technically credible — this is the thing that sells the work.

---

## 2. CRITICAL constraints — read this section twice

These are not suggestions. Violating any of them breaks the site or the client relationship this represents:

- **`#story-section` / `#pinned-container` / `#sequence-video` and the entire `initFilm()` scrub timeline in `main.js` already work and must stay functionally and timing-wise identical** — the pin, the scrub-to-video-currentTime binding, the beat-by-beat opacity/`y` choreography, the video-to-logo dissolve, the ScrollTrigger `start`/`end`/`scrub` values. **The only permitted change inside this section is typography** — `font-family`/weight/tracking/size on `.beat__line`, `.beat__idx`, `.node__title`, `.node__desc`, `.final__word`, `.final__tag`. Whatever font(s) you choose must still work with `splitChars` (real webfont text nodes, not icon fonts).
- Do not rename or remove any ID/class that `main.js` selects: `#hero`, `#story-section`, `#pinned-container`, `#beat-1` through `#beat-5`, `#sequence-video`, `#work`, `#contact`, `.magnetic`, `.navlink`, `[data-cursor]`, `[data-anim]`, `.line`/`.line__in`. Renaming any of these silently breaks the JS with no console error.
- Do not change copy, links, email, Instagram handle, or the case-study/project content.
- The `prefers-reduced-motion` fallback and the `file://` protocol fallback in `main.js` must keep working and must be equally polished — not a degraded afterthought.

---

## 3. Step one: define the Design DNA, then apply it everywhere

Before writing implementation CSS, lock a small, explicit design system and hold to it — this is what separates "premium" from "a pile of nice effects." Define, in a comment block at the top of `style.css` or a short `DESIGN.md`:

- **Mood** — 3–5 adjectives that describe the feel (e.g. precise, warm, confident, unhurried — pick your own, don't copy these).
- **Color system** — keep or evolve the paper/ink/violet idea, but formalize it: base tokens, one accent used with intent, semantic tokens (hover, focus, disabled). Consider `oklch()` for the palette so gradients and hover-state interpolation stay perceptually smooth instead of muddy.
- **Type system** — explicit roles (display / body / mono-meta / accent-italic), a fluid type scale via `clamp()` extended to every text element (not just headings), and a clear weight strategy.
- **Spacing/rhythm scale** — one consistent scale, not ad hoc `rem` values scattered per component.
- **Motion language** — pick 2–3 signature easing curves (define them once, as CSS custom properties and/or a GSAP `CustomEase`, e.g. one for entrances, one for hovers, one for exits) and reuse them everywhere instead of the current mix of bespoke cubic-beziers. Define timing tokens (fast/base/slow) too.
- **Texture & depth strategy** — the grain and browser-chrome-framed screenshots (`.shot`) are genuinely good, distinctive choices. Keep and sharpen them rather than replacing with generic glassmorphism or drop shadows.

Every component you build should be traceable back to these tokens. No one-off magic numbers.

---

## 4. Technical toolkit — what to use and how

**GSAP plugins now available to you (all free):**
- `SplitText` — consider it as a more robust, more accessible replacement for the hand-rolled `splitChars`, *only for text outside `#story-section`* (leave the scroll-film's text logic alone per the hard constraint above, unless you're purely swapping fonts). It ships with accessibility handling for screen readers baked in.
- `CustomEase` — use it to formalize the signature eases from your Design DNA.
- `ScrollSmoother` — GSAP's own smooth-scroll solution, built to integrate natively with ScrollTrigger pinning. Evaluate it against the current Lenis setup: if it produces measurably smoother pin behavior around `#story-section` with no regression, prefer it; otherwise keep Lenis and tune its `duration`/`easing`/`touchMultiplier` instead. Don't run both.
- `Flip` — useful for layout-transition moments (e.g. a project-card filter/reorder interaction) without hand-rolling FLIP math.
- `ScrambleTextPlugin` — a tasteful decode/glitch-in effect, used on maybe one or two headings max. This is a seasoning, not a house style — overuse of scramble/glitch text reads as a template effect, not craft.
- `Observer` / `Draggable` — only if a specific interaction genuinely calls for gesture handling (e.g. a draggable gallery in the work section).

**Three.js — optional, additive, used for 1–2 signature moments only, not site-wide:**
- A subtle shader-driven grain or gradient-mesh background behind the hero that responds gently to cursor position, as a living upgrade to the current static SVG-filter grain — OR
- A lightweight WebGL treatment of the final logo mark (`#final-logo`) that reacts to scroll velocity as it settles.
Whichever you choose: lazy-load the WebGL bundle so it never blocks first paint, degrade gracefully to the current CSS/SVG version on low-end devices, older browsers, or `prefers-reduced-motion`, and don't let it touch the scroll-film's own logic. If you can't implement it without risking jank on mid-range mobile hardware, skip it — a fast, tasteful site beats a heavy, impressive-on-paper one.

**Modern CSS to lean on:**
- `oklch()` / `color-mix()` for palette and hover-state interpolation.
- `clamp()` fluid type and spacing everywhere, not just in the current handful of places.
- `backdrop-filter` for one or two deliberate "glass" moments (e.g. the sticky nav on scroll) — not scattered across every card.
- `clip-path` / `mask-image` for image and section reveal transitions.
- `mix-blend-mode` for texture layering (already used for grain — extend the idea thoughtfully, don't overdo it).
- CSS scroll-driven animations (`animation-timeline: scroll()`) as a progressive enhancement for simple parallax/reveal effects that don't need GSAP's precision — reduces JS overhead where it's not needed.
- Container queries for any component (like project cards) that should adapt to its own container rather than the viewport.

---

## 5. Anti-slop checklist — do not do these

- Generic Inter/Poppins pairing with no typographic point of view
- Purple-to-blue gradient blobs multiplied across every section (one aura effect exists already — don't repeat the same trick everywhere)
- The default icon-heading-paragraph 3-card grid for services
- Cookie-cutter blurred-pill glassmorphism navbar
- Everything centered and drop-shadowed
- The same fade-up-on-scroll applied uniformly to every single element with no variation
- Rounded-pill badges/tags scattered with no functional purpose
- Glitch/scramble text effects on more than a couple of elements
- Cliché copy patterns ("Unlock your potential," "Take it to the next level") — don't touch existing copy or introduce new copy in this register
- Stock rocket-ship/lightbulb/handshake illustration energy
- A WebGL effect included just to prove you can, that doesn't serve the content or costs real performance

---

## 6. Section-by-section direction

**Nav** — Keep the magnetic CTA and link structure. Consider a nav bar that subtly morphs (size, blur, or background opacity) on scroll rather than a hard on/off toggle. If you add an underline/reveal on hover, make it feel drawn, not just opacity-faded.

**Hero** — The kinetic character-drop headline is a strong idea; refine its easing and stagger rhythm rather than replacing the concept. This is the best candidate for the optional Three.js/shader background treatment described above, if you pursue it. Keep the scroll cue but make its motion feel considered rather than a generic bounce.

**Work section** — This is the section with the most room to feel more editorial: consider an asymmetric/bento-style arrangement for the product rows instead of the current alternating-flip layout, subtle mouse-reactive tilt on the `.shot` screenshot frames (a few degrees of perspective, nothing gimmicky), and a more choreographed reveal per project rather than a single reused reveal pattern. Keep the browser-chrome framing device — it's a good, specific choice.

**Contact / footer** — This is the closing statement; it should feel confident and a little quieter than the hero, not louder. Keep the magnetic buttons and fill-sweep, refine their timing to match your signature eases. The marquee is fine — make sure its speed and easing match the rest of the motion language rather than running on its own rhythm.

---

## 7. Micro-interactions expected across the whole site

- Every interactive element (links, buttons, project cards, footer links) has a deliberate hover/focus state — not just an opacity or underline default
- Cursor label/state changes meaningfully depending on what's under it (partially exists — extend the idea consistently)
- Image/screenshot reveals use a mask or clip-path transition, not a plain fade
- Section transitions and reveals are choreographed with varied timing/direction per element, not one reveal pattern copy-pasted everywhere
- Custom scrollbar (if you style one) matches the palette
- Focus states are visible and match the design language (this is also an accessibility requirement, not optional)

---

## 8. Smoothness & performance mandate

- Tune whichever smooth-scroll solution you land on (Lenis or ScrollSmoother) for a noticeably more fluid, less "sticky" feel than the current default
- Standardize on your 2–3 signature easing curves everywhere — audit and replace the current mix of ad hoc cubic-beziers
- Animate only `transform`/`opacity` — never layout-triggering properties — to hold 60fps
- Test and tune touch-scroll feel on mobile specifically, not only desktop
- Debounce `ScrollTrigger.refresh()` calls on resize
- Optimize images: proper `srcset`/responsive sizing, modern formats (WebP/AVIF) where feasible, lazy-loading offscreen assets
- Keep Core Web Vitals in mind — no layout shift from web font loading (the current `font-display`/preconnect setup is a reasonable start; make sure any new fonts follow the same pattern)
- Reduced-motion and low-end-device fallbacks must remain fully functional and visually complete, not a stripped-down afterthought

---

## 9. Final self-check before you call this done

- [ ] Scroll-film behavior (`#story-section`) is pixel-for-pixel unchanged except for its typography
- [ ] No ID/class referenced by `main.js` was renamed or removed
- [ ] All copy, links, and project content are untouched
- [ ] Every item in the anti-slop checklist is absent from the final result
- [ ] Color, type, spacing, and motion all trace back to the Design DNA tokens — no stray one-off values
- [ ] Any WebGL/Three.js addition degrades gracefully and doesn't block first paint
- [ ] Reduced-motion and `file://` fallbacks still work and look intentional
- [ ] Mobile touch-scroll and tap targets feel as considered as desktop

## 10. Deliverable

Complete, updated `index.html`, `style.css`, and `main.js`. Include a short written summary of: the Design DNA you defined, which GSAP plugins/Three.js (if any) you used and why, and the signature easing curves you standardized on.
