# Omentix Tech — Master Redesign Brief for Antigravity

Paste this whole file as your first message. It is written to be self-contained: everything you need to act — product truth, current technical reality, full history of what's already been tried, and the actual instruction — is in here. Read all of it before touching code, including Section 0. Section 0 is not throat-clearing; it's the reason this document exists instead of another round with the previous tool, and it directly shapes what you should do differently.

---

## 0. Read this first — the honest history

This is not a first pass. The user has been through multiple rounds on this exact site:

1. **A design-direction brief** (`CLAUDE-DESIGN-BRIEF.md`, still in this repo) was written for Claude Design to generate 2–3 genuinely different hero directions. Its own instruction to that tool: *"I'd rather reject something bold than accept something safe."*
2. **A prior one-shot master prompt** (`omentix-redesign-master-prompt (1).md`, still in this repo) was handed to a coding agent to execute a full redesign pass. What exists in the codebase right now — the oklch paper/ink/violet palette, the three named CustomEase curves, the film-grain overlay, the magnetic cursor, the halftone/ink-blot hero treatment — is the *result* of that pass. This is the current baseline, not a starting sketch.
3. **A session with Claude Code** (this repo's actual edit history) made two further narrowly-scoped passes on top of that baseline:
   - Swapped the typeface used on the three scroll-film service words (Web Development / App Development / AI Automation) — went through Sentient → a freeware font with a non-commercial license (rejected before shipping) → Zodiak for the film's headline lines + Bricolage Grotesque for the three service words specifically, scoped *only* inside the scroll-film section.
   - A "bolder" pass on the Contact section specifically: brought the hero's halftone-dot-field-plus-ink-blot texture onto the section (recolored for its dark background), added a margin coordinate rail matching the hero's, turned the email address into the section's one large-scale CTA with a hover decode/scramble effect, gave the footer's back-to-top link a real circular button.

**The user's verdict on all of it: not impressed, and they don't believe another round of this will get there.** That's why this brief exists — so you're not starting blind, and so you don't spend your first pass rediscovering the same ceiling.

**Why it probably plateaued — read this as a diagnostic, not an excuse.** Step 3's instruction set, both times, was explicitly an *amplification* methodology: touch only the named target, don't introduce colors/fonts/layout primitives the system doesn't already own, reuse what's already there "at full strength" rather than inventing anything new, keep everything else exactly as it was. That is a **preservation-biased** methodology by construction. It can make an existing system louder or more confident. It cannot make something feel new, because "feeling new" was explicitly out of scope every time. Two rounds of turning the same system up have now happened. If the user wanted the *volume* raised on the current design, that's already been tried twice.

**What this means for you:** do not default to another polish/amplification pass on the current system. For each section, ask "if there were no prior constraint, would I actually choose this palette / this type pairing / this layout paradigm / this motion language — or am I just inheriting it because it's already there?" Where the honest answer is "I'm just inheriting it," you have explicit permission below (Section 4) to replace it. The single highest-value thing you can do differently from the last two rounds is to actually exercise that permission on at least one or two axes (palette, type, or layout — not necessarily all three), not just on motion polish and one section's texture.

---

## 1. What Omentix actually is — product truth, do not alter

**Omentix Tech** — a small software studio in **Bhuj, Kutch, Gujarat, India**. Founded 2025. Three services: **Web Development · App Development · AI Automation**.

This is their portfolio site. Its job: make a prospective client think *"these people are genuinely creative and technically serious"* within five seconds. Premium independent studio — editorial, art-directed, confident. Must not read as a template or generic AI-generated SaaS.

Contact: `omentix.tech@gmail.com` · Instagram `@omentix.tech` · single scrolling page, not multi-page.

**Voice:** direct, specific, a little dry. Confident without hype. No "elevate your business," no "leverage," no "cutting-edge," no emoji. Concrete claims about real work only.

**Real content only** — every project, every claim below is real. Do not invent testimonials, client logos, metrics, team members, or response-time promises. If a section needs evidence you don't have, ask for it rather than fabricating it.

---

## 2. Current technical reality — verified this session, not assumed

**Stack:** vanilla HTML/CSS/JS. `index.html`, `style.css`, `main.js`. No framework, no build step, no package.json — it's a static site (dev-served via `http-server`, see `.claude/launch.json`). Any redesign should preserve this — don't introduce a build pipeline unless you have a concrete reason and flag it as a decision, not a silent addition.

**Libraries actually loaded** (verify each still resolves before relying on it — see the gotcha below):
- GSAP 3.12.5 core + ScrollTrigger — `cdnjs.cloudflare.com`
- CustomEase 3.12.7 — `cdn.jsdelivr.net/npm/gsap@3.12.7` — **working**, registered in `main.js` and used to define three named eases (`enter`/`hover`/`exit`) matching the CSS custom properties below
- SplitType 0.3.4 — `cdn.jsdelivr.net`
- Lenis 1.1.18 (smooth scroll) — `cdn.jsdelivr.net`

**Gotcha #1 — verified 404 this session:** `ScrambleTextPlugin` was referenced via `cdn.jsdelivr.net/npm/gsap@3.12.7/dist/ScrambleTextPlugin.min.js`. That URL 404s. It's a Club GreenSock-only bonus plugin — GSAP's 2024 licensing change made it *free to use*, but that does not mean it's mirrored on public unpkg/jsdelivr. The tag has been removed from `index.html` this session, and a small dependency-free scramble/decode implementation now lives in `main.js` (`scrambleTo()`, ~20 lines, character-substitution over `requestAnimationFrame`) if you want a reference or want to keep using it. **If you want any other Club-plugin-formerly (SplitText, MorphSVG, DrawSVG, Flip, Observer, Draggable, ScrollSmoother, Inertia), confirm the actual script resolves (200, real byte size, not a 404 HTML page) before writing code that depends on it. Don't assume "GSAP plugins are free now" means "every plugin is on every public CDN."**

**Gotcha #2 — verified this session:** Fontshare's `api.fontshare.com/v2/css?f[]=A&f[]=B&f[]=C...` endpoint silently drops every family after roughly the first one or two when several are combined in a single request — no error, it just serves a truncated stylesheet. Always issue one separate `<link>` per Fontshare family. This cost real time to debug; don't rediscover it.

**Fonts currently loaded and their actual scope:**
| Family | Source | Where it's actually used |
|---|---|---|
| Clash Display | Fontshare | site-wide display/headline face (`--display`) |
| Satoshi | Fontshare | site-wide body face (`--text`) |
| Sentient (italic) | Fontshare | the single italic accent word in the hero + body headings (`--accent`) |
| JetBrains Mono | Google Fonts | meta/index labels site-wide (`--mono`) |
| Zodiak | Fontshare | **scroll-film only** — the beat lines and their italic accent (`--film-display`, `--film-accent`) |
| Bricolage Grotesque | Google Fonts | **scroll-film only** — the three service words (`--node-font`) |

Nothing stops you from changing any of this. It's listed so you know what's real right now, not so you preserve it.

**Full current design tokens** (`style.css` `:root`, hex fallback shown; an `oklch()` block redefines the color tokens under `@supports`):
```css
--paper: #F3EADA;   --paper-2: #EADFC7;  --paper-3: #E2D5B8;
--ink:   #101024;   --ink-2:   #191934;  --ink-3:   #24244a;
--violet:   #6D28D9;  --violet-2: #8B5CF6;  --violet-3: #C9B6F7;
--hover: #8B5CF6;   --focus-ring: rgba(139,92,246,.5);  --disabled: #999;
--rule: rgba(16,16,36,.14);   --rule-2: rgba(16,16,36,.08);
--rule-inv: rgba(243,234,218,.16);  --rule-inv-2: rgba(243,234,218,.08);

--display: 'Clash Display', 'Times New Roman', serif;
--text:    'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--accent:  'Sentient', Georgia, serif;
--mono:    'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

--gut: clamp(1.25rem,4vw,3.5rem);   --sec: clamp(6rem,14vh,12rem);
/* --sp-xs through --sp-3xl: a clamp()-based spacing scale, xs=0.25rem..3xl=8rem */

--ease-enter: cubic-bezier(0.16,1,0.3,1);
--ease-hover: cubic-bezier(0.33,1,0.68,1);
--ease-exit:  cubic-bezier(0.7,0,0.84,0);
--dur-fast: .25s;  --dur-base: .45s;  --dur-slow: .8s;
```
This palette/type/motion system is a legitimate, already-formalized design system — not scattered magic numbers. Section 4 gives you permission to replace parts of it if the work is better served by something else; it is not asking you to preserve it out of inertia.

**Section order and the IDs/classes JS actually selects** — renaming any of these silently breaks `main.js` with no console error, so if you rename one, grep `main.js` for every reference and update it in the same pass:
`#nav` → `#hero` → `#story-section` (contains `#pinned-container`, `#sequence-video`, `#beat-1` through `#beat-5`) → `#work` (contains `#work-stage`, `.feat`, `.projects`/`.proj`) → `#contact` (contains `.foot`). Also load-bearing: `.magnetic`, `.navlink`, `[data-cursor]`, `[data-anim="chars"]`, `[data-anim="lines"]`, `.line`/`.line__in`, `[data-scramble-hover]`.

**The one genuinely hard constraint, carried forward from the prior brief because it's still true:** `#story-section`'s scroll-scrubbed video is a *real hand-drawn ink illustration asset* (`Video_Scrub_HQ_Desktop.mp4` / `_Mobile.mp4` — a root system growing into a tree, resolving into the Omentix logo mark), not something generated from CSS. `initFilm()` in `main.js` pins the section, binds scroll progress to the video's `currentTime`, and choreographs each beat's text on the same scrubbed timeline — including `ROOT_TIPS`, a coordinate map that hangs each of the three service-word tags off its matching root-tip position *inside the video frame*, recalculated on resize because the video is `object-fit:cover` and its on-screen position depends on viewport aspect ratio. **Restyling the text that sits on top of this (font, color, layout, timing choreography, even whether the words fade in before or after the roots visually form) is entirely fair game and arguably where this needs the most work.** Replacing the pin/scrub mechanism itself, or the video asset, is not something you can do in code — that requires new artwork. If you have a genuinely better idea for how this section works mechanically, propose it and ask, rather than silently ripping out a working, asset-backed system.

---

## 3. What exists today, section by section — evaluate each on its own merits

Don't assume any of this is good just because it's current. Section 0 already told you two amplification passes have been run against it and it still isn't landing.

**Nav** (`#nav`) — logo mark + "Omentix®" wordmark, three links (Work/Studio/Contact), a pill "Start a project" CTA with a small dot. Sticks on scroll (class toggle, no blur/morph currently).

**Hero** (`#hero`) — full-viewport. Status row: `● Available for new projects` (pulsing dot) / `Independent software studio` / `Est. 2025 — Bhuj → Everywhere`. Headline `We engineer digital *gravity*` set with a character-drop-in animation and a cursor-proximity "gravity" effect where nearby letters lean toward the pointer; an ink-stroke SVG underlines "gravity." Below: lede paragraph + "Start a project" button on the left, a plain numbered list of the three services (`01 Web Development` / `02 App Development` / `03 AI Automation`) center, a scroll cue on the right. Background: twelve hairline column rules, an animated halftone dot field, two turbulence-displaced violet "ink blot" SVGs, sideways-set real coordinates (`23.2419°N 69.6669°E`, Bhuj's actual location) in the margin. A marquee strip separates hero from the scroll film.

**Scroll film** (`#story-section`) — see the hard-constraint note above for the mechanism. Five beats: (01) origin line → (02) the three service words hanging off root-tips in the growing illustration → (03) a "three disciplines, one root system" line → the video dissolves into the static logo mark with the tagline `Innovate · Automate · Elevate`. This is very likely the single highest-leverage section to actually rethink typographically and choreographically — the previous brief flagged legibility-over-busy-artwork as the known problem here, and this session's font swap addressed *which* fonts, not whether the whole treatment (timing, scale, backing, how the words relate to the tips) is right.

**Work** (`#work`) — one featured case study (Trinetra Realty, a real live property platform, shown large with two screenshots in little browser-chrome frames) followed by two in-house product rows (TransitOps fleet management, CoreInventory warehouse management, each with three screenshots, alternating layout) and one "in development" placeholder card (Restaurant POS, no screenshots yet). A cursor-trail effect follows the mouse in this section's header. All screenshots are real dashboard UI, wide desktop-format, framed in small mock browser chrome.

**Contact + footer** (`#contact`) — dark surface. `(03) Contact` → `Let's build something *worth* keeping.` → lede paragraph → the email address set at near-headline scale with a hover scramble/decode effect as the primary CTA, Instagram as a small secondary link. Same halftone/ink-blot/rail treatment as the hero, recolored for dark ground. A reversed marquee (`Let's work together`), then a three-column footer (logo / location + services / copyright + circular back-to-top button).

---

## 4. The actual instruction

**No more amplification passes.** You have explicit permission — the permission the last two rounds didn't have — to replace, not just turn up, any of: the color system, the type pairing, the layout paradigm of any individual section, the motion vocabulary, the information architecture (what order things appear in, how much space each gets, whether "three services" needs to be a numbered list at all). The hand-drawn ink illustration in the scroll-film video, the real project content, and the product truth in Section 1 are the only things that must survive intact. Everything else is genuinely on the table.

That said, "replace everything" is not itself a direction — it's an absence of one, and absence of direction is exactly how you end up with competent-but-forgettable output, which is arguably what's already happened twice. So:

- Form an actual point of view about what this should be, and be able to say *why* in one sentence per major decision (palette, type, the scroll-film treatment, the work section's presentation, contact). "Because it's bolder" is not a reason. "Because a real estate agency and a fleet-management dashboard both need to look credible to a non-technical Gujarati small-business owner deciding who to trust with real money" is a reason.
- Where you're genuinely torn between two different directions for a section (this happened explicitly in the very first brief for the hero — "give me 2-3 genuinely different directions, I'd rather reject something bold than accept something safe"), that instinct was right and still applies. You don't have to present static comps first if you're confident enough to commit and ship — but if you're not confident, say so and show the alternative rather than quietly picking one and hoping.
- Do not mistake "louder" for "bolder." A different, well-chosen palette or type pairing executed quietly can be a much bigger, more legible act of confidence than more violet, more motion, or more texture layered onto the current system.

---

## 5. Hard constraints regardless of how far you take this

- Every fact in Section 1 (business name, location, services, contact details, project names/descriptions/links/tags) stays true. Rewrite the *presentation* of the copy if it serves the redesign; don't invent new claims.
- `prefers-reduced-motion` and the site's existing `file://`-protocol fallback (see `REDUCED`/`TOUCH` guards throughout `main.js`) must keep working and look intentional, not like a stripped-down afterthought.
- Whatever fonts you choose, self-host or CDN-link them properly (see Gotcha #1/#2 above), with `font-display: swap` and preconnects, matching the existing pattern — no invisible-text flash, no CLS from late-loading webfonts.
- Any new dependency (a GSAP plugin, a new library, WebGL/Three.js) must degrade gracefully on low-end mobile and must not block first paint. If you can't hit 60fps with it on mid-range mobile hardware, cut it rather than ship jank.
- Accessibility floor: visible focus states everywhere, real alt text on real screenshots (already present, preserve or improve), heading hierarchy that doesn't skip levels, color contrast that actually passes at the sizes you ship — check it manually, particularly for any light-on-dark or low-opacity text you introduce. (A design-lint tool was trialed at the project level earlier and has since been removed; there's no automated detector wired up here anymore.)
- Animate `transform`/`opacity` for anything that needs to hold 60fps; don't animate layout-triggering properties.

---

## 6. Anti-slop — do not do these

- Generic Inter/Poppins pairing with no typographic point of view
- Purple-to-blue gradient blobs multiplied across every section
- Gradient-clip text on headings (tested and rejected already on this project — a gradient fill on a heading's accent word made it disappear against the background at certain viewport widths; use a solid color for emphasis instead)
- The default icon-heading-paragraph 3-card grid for services
- Cookie-cutter blurred-pill glassmorphism navbar
- Everything centered and drop-shadowed
- The same fade-up-on-scroll applied uniformly to every element with no variation
- Rounded-pill badges/tags with no functional purpose
- Glitch/scramble text on more than one or two elements — it's seasoning, not a house style
- A colored border-left/right "side-tab" accent standing in for real hierarchy
- A kicker/eyebrow label above every heading by default — earn it or drop it
- Section numbers (01/02/03) reused everywhere out of habit rather than because the sequence itself carries information
- Cliché copy patterns ("Unlock your potential," "Take it to the next level," "elevate," "leverage," "cutting-edge") — don't touch existing copy register, don't introduce new copy in this register
- Stock rocket-ship/lightbulb/handshake illustration energy
- Fabricated metrics, testimonials, client logos, or response-time promises
- A WebGL effect included to prove you can, that doesn't serve the content or costs real performance

---

## 7. Deliverable

Complete, working `index.html` / `style.css` / `main.js` (or their replacements, if you restructure the project — flag it clearly if so). Along with the code, a short written summary covering:

1. What you changed and, section by section, *why* — the one-sentence reason per major decision from Section 4.
2. Anything from the current system (Section 2/3) you deliberately kept, and why you judged it was already right rather than just inherited.
3. Any new dependency you added and confirmation you verified it actually resolves (learn from Gotcha #1).
4. If you're presenting options rather than one committed direction for any section, say so explicitly and make the alternatives easy to compare (e.g. a toggle, or clearly labeled variants) rather than making the user reconstruct what changed by reading a diff.

The bar is not "better than before." Two rounds of "better than before" already happened and the user isn't satisfied. The bar is: does this feel like a genuinely different, deliberate piece of work, not the same site with the dial turned up one more notch.
