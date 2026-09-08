/* ==========================================================================
   OMENTIX TECH — Motion layer
   Lenis (smooth scroll) · GSAP + ScrollTrigger + CustomEase + ScrambleText
   SplitType (line masks) · custom char splitter (display type)

   Design DNA — Motion Language
   Three signature eases applied consistently:
     enter  → cubic-bezier(0.16, 1, 0.3, 1)   — entrances, reveals
     hover  → cubic-bezier(0.33, 1, 0.68, 1)   — interactive feedback
     exit   → cubic-bezier(0.7, 0, 0.84, 0)    — exits, dismissals
   Timing: fast 0.25s · base 0.45s · slow 0.8s
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* register bonus plugins only if loaded */
if (typeof CustomEase !== 'undefined') {
  gsap.registerPlugin(CustomEase);
  CustomEase.create('enter', '0.16, 1, 0.3, 1');
  CustomEase.create('hover', '0.33, 1, 0.68, 1');
  CustomEase.create('exit',  '0.7, 0, 0.84, 0');
}
if (typeof ScrambleTextPlugin !== 'undefined') {
  gsap.registerPlugin(ScrambleTextPlugin);
}

/* fallback ease names when CustomEase isn't available */
const EASE_ENTER = typeof CustomEase !== 'undefined' ? 'enter' : 'power3.out';
const EASE_HOVER = typeof CustomEase !== 'undefined' ? 'hover' : 'power2.out';
const EASE_EXIT  = typeof CustomEase !== 'undefined' ? 'exit'  : 'power2.in';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = window.matchMedia('(hover: none), (pointer: coarse)').matches;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ==========================================================================
   1 · SMOOTH SCROLL
   Lenis drives the real window scroll, so ScrollTrigger pinning still works.
   Tuned for a fluid, unhurried feel that matches the Design DNA.
   ========================================================================== */
let lenis = null;

function initSmoothScroll(){
  if (REDUCED || typeof Lenis === 'undefined') return;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.4,
    wheelMultiplier: 0.9,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* anchor links routed through Lenis so they ease instead of jumping */
function initAnchors(){
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ==========================================================================
   2 · TYPE SPLITTING
   Custom splitter: walks text nodes so nested <em> / <br> survive intact
   (SplitType flattens them, which would kill the Sentient italic accents).
   ========================================================================== */
function splitChars(el){
  // guard: never split the same element twice (nested spans collapse glyph widths)
  if (el.dataset.split === 'done') return $$('.char', el);
  el.dataset.split = 'done';

  const chars = [];

  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE){
        const text = child.textContent;
        if (!text.trim() && !text.includes(' ')) return;

        const frag = document.createDocumentFragment();
        // keep words unbreakable so lines wrap naturally
        text.split(/(\s+)/).forEach((chunk) => {
          if (!chunk) return;
          if (/^\s+$/.test(chunk)){ frag.appendChild(document.createTextNode(chunk)); return; }

          const word = document.createElement('span');
          word.className = 'word';
          word.style.display = 'inline-block';
          word.style.whiteSpace = 'nowrap';

          Array.from(chunk).forEach((ch) => {
            const s = document.createElement('span');
            s.className = 'char';
            s.style.display = 'inline-block';
            s.textContent = ch;
            word.appendChild(s);
            chars.push(s);
          });
          frag.appendChild(word);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR'){
        walk(child);
      }
    });
  };

  walk(el);
  return chars;
}

/* ==========================================================================
   3 · CUSTOM CURSOR + MAGNETIC ELEMENTS
   ========================================================================== */
function initCursor(){
  const cursor = $('.cursor');
  if (!cursor || TOUCH || REDUCED){ if (cursor) cursor.remove(); return; }

  const dot   = $('.cursor__dot');
  const ring  = $('.cursor__ring');
  const label = $('.cursor__label');

  const dotX  = gsap.quickTo(dot,  'x', { duration: .16, ease: 'power3' });
  const dotY  = gsap.quickTo(dot,  'y', { duration: .16, ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: .5, ease: EASE_ENTER });
  const ringY = gsap.quickTo(ring, 'y', { duration: .5, ease: EASE_ENTER });

  window.addEventListener('mousemove', (e) => {
    gsap.to(cursor, { opacity: 1, duration: .3, overwrite: 'auto' });
    dotX(e.clientX);  dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
  }, { passive: true });

  document.addEventListener('mouseleave', () => gsap.to(cursor, { opacity: 0, duration: .3 }));

  // hoverable targets grow the ring; data-cursor writes a label inside it
  $$('a, button, [data-cursor], .proj__shots').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-active');
      label.textContent = el.dataset.cursor || '';
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-active');
      label.textContent = '';
    });
  });
}

function initMagnetic(){
  if (TOUCH || REDUCED) return;

  $$('.magnetic').forEach((el) => {
    const strength = 0.32;
    const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: EASE_ENTER });
    const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: EASE_ENTER });

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width  / 2)) * strength);
      yTo((e.clientY - (r.top  + r.height / 2)) * strength);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* ==========================================================================
   4 · CHROME — scroll progress, sticky nav
   ========================================================================== */
function initChrome(){
  const bar = $('.progress__bar');
  if (bar){
    gsap.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: .3 },
    });
  }

  const nav = $('#nav');
  if (nav){
    ScrollTrigger.create({
      start: 'top -80',
      end: 'max',
      onUpdate: (self) => nav.classList.toggle('is-stuck', self.scroll() > 80),
    });
  }
}

/* ==========================================================================
   5 · MOUSE-REACTIVE TILT ON SCREENSHOTS
   Subtle perspective shift on .shot frames — 3-5° max, only on desktop.
   ========================================================================== */
function initShotTilt(){
  if (TOUCH || REDUCED) return;

  $$('.shot').forEach((shot) => {
    const maxTilt = 3; // degrees

    shot.style.transformStyle = 'preserve-3d';
    shot.style.perspective = '800px';

    shot.addEventListener('mousemove', (e) => {
      const r = shot.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5; // -0.5 to 0.5
      const y = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(shot, {
        rotateY: x * maxTilt,
        rotateX: -y * maxTilt,
        duration: 0.4,
        ease: EASE_HOVER,
        overwrite: 'auto',
      });
    });

    shot.addEventListener('mouseleave', () => {
      gsap.to(shot, {
        rotateY: 0, rotateX: 0,
        duration: 0.6,
        ease: EASE_ENTER,
        overwrite: 'auto',
      });
    });
  });
}

/* ==========================================================================
   6 · HERO — "digital gravity"
   ========================================================================== */

/* The ink stroke under "gravity" is one absolutely-positioned SVG. Rather than
   guess its offsets in CSS (the italic is a different family at a different
   optical size), measure the word and hand the numbers to CSS. */
function placeHeroStroke(){
  const title = $('.hero__title');
  if (!title) return;
  const svg = $('.hero__stroke', title);
  const em  = $('em', title);
  if (!svg || !em) return;

  const t = title.getBoundingClientRect();
  const e = em.getBoundingClientRect();
  if (!e.width) return;

  /* sit clear of the descenders in "gravity" — under the word, not through it */
  svg.style.setProperty('--sx', (e.left   - t.left - e.width * .005) + 'px');
  svg.style.setProperty('--sy', (e.bottom - t.top  - e.height * .13) + 'px');
  svg.style.setProperty('--sw', (e.width * .98) + 'px');
  svg.style.setProperty('--sh', Math.max(9, e.height * .085) + 'px');
}

/* Letters fall in from above their mask and settle, then the ink stroke draws
   under the italic. The motion *is* the headline: weight pulling into place. */
function heroIntro(){
  const title = $('.hero__title');
  if (!title) return gsap.timeline();

  const chars = [];
  $$('.line__in', title).forEach((line) => chars.push(...splitChars(line)));
  placeHeroStroke();

  const stroke = $('.hero__stroke path', title);
  const tl = gsap.timeline({ onComplete: initHeroGravity });

  if (REDUCED){
    gsap.set([chars, '.hero__row', '.hero__lede', '.marquee--seam'], { opacity: 1, y: 0 });
    if (stroke) gsap.set(stroke, { strokeDashoffset: 0 });
    return tl;
  }

  gsap.set(chars, { yPercent: 118, rotate: 5, opacity: 0 });
  gsap.set('.hero__row--top > *', { yPercent: 100, opacity: 0 });
  gsap.set('.hero__row--bottom > *', { y: 26, opacity: 0 });
  gsap.set('.hero__item', { y: 14, opacity: 0 });
  gsap.set('.marquee--seam', { yPercent: 100, opacity: 0 });
  gsap.set('.nav > *', { y: -18, opacity: 0 });

  tl.to('.hero__row--top > *', {
      yPercent: 0, opacity: 1, duration: 1, stagger: .08, ease: EASE_ENTER,
    })
    .to(chars, {
      yPercent: 0, rotate: 0, opacity: 1,
      duration: 1.15,
      stagger: { each: .022, from: 'start' },
      ease: 'expo.out',
    }, '-=.7')
    .to('.nav > *', {
      y: 0, opacity: 1, duration: .9, stagger: .07, ease: EASE_ENTER,
    }, '-=.9')
    .to('.hero__row--bottom > *', {
      y: 0, opacity: 1, duration: 1, stagger: .1, ease: EASE_ENTER,
    }, '-=.75')
    .to('.hero__item', {
      y: 0, opacity: 1, duration: .7, stagger: .08, ease: EASE_ENTER,
    }, '-=.7')
    .to('.marquee--seam', {
      yPercent: 0, opacity: 1, duration: 1, ease: EASE_ENTER,
    }, '-=.85');

  if (stroke){
    tl.to(stroke, {
      strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut',
    }, '-=1.15');
  }

  return tl;
}

/* Cursor gravity: every letter of the headline leans toward the pointer with a
   quadratic falloff, so nearby glyphs move a lot and distant ones barely stir —
   mass, not magnetism. Rects are cached and only re-measured when they can
   actually have moved. */
let gravityOn = false;
function initHeroGravity(){
  if (gravityOn || TOUCH || REDUCED) return;

  const hero  = $('.hero');
  const title = $('.hero__title');
  if (!hero || !title) return;

  const chars = $$('.char', title);
  if (!chars.length) return;
  gravityOn = true;

  const RADIUS = 240;   // px of influence
  const PULL   = 14;    // px at dead centre — kept under a glyph's side bearing
                        // so neighbouring letters lean without colliding

  const glyphs = chars.map((el) => ({
    el,
    cx: 0, cy: 0,
    x: gsap.quickTo(el, 'x',      { duration: .8, ease: 'power3' }),
    y: gsap.quickTo(el, 'y',      { duration: .8, ease: 'power3' }),
    r: gsap.quickTo(el, 'rotate', { duration: .9, ease: 'power3' }),
  }));

  let dirty = true;
  const measure = () => {
    glyphs.forEach((g) => {
      const b = g.el.getBoundingClientRect();
      g.cx = b.left + b.width  / 2;
      g.cy = b.top  + b.height / 2;
    });
    dirty = false;
  };

  const soil = () => { dirty = true; };
  window.addEventListener('scroll', soil, { passive: true });
  window.addEventListener('resize', soil);

  window.addEventListener('mousemove', (e) => {
    // headline off-screen — nothing to pull
    if (hero.getBoundingClientRect().bottom < 0) return;
    if (dirty) measure();

    for (let i = 0; i < glyphs.length; i++){
      const g  = glyphs[i];
      const dx = e.clientX - g.cx;
      const dy = e.clientY - g.cy;
      const d  = Math.hypot(dx, dy);

      if (d > RADIUS || d < 0.001){ g.x(0); g.y(0); g.r(0); continue; }

      const f = (1 - d / RADIUS) ** 2;
      g.x(dx / d * PULL * f * .55);
      g.y(dy / d * PULL * f * .9);
      g.r(dx / d * 3.5 * f);
    }
  }, { passive: true });
}

/* ==========================================================================
   6b · WORK TRAIL — project screenshots spawn along the cursor's path
   Progressive enhancement: the stage layout is switched on from here, so a
   touch device or a reduced-motion visitor keeps the plain section header
   instead of a tall empty box. The screenshots are heavy (~4.7MB total), so
   the nodes are only built once the section is one viewport away.
   ========================================================================== */
function initWorkTrail(){
  const stage = $('#work-stage');
  const layer = stage && $('.trail', stage);
  if (!stage || !layer || TOUCH || REDUCED) return;

  const SRCS = [
    'assets/work/trinetra-1.png',  'assets/work/transport-1.png',
    'assets/work/inventory-1.png', 'assets/work/trinetra-2.png',
    'assets/work/transport-3.png', 'assets/work/inventory-2.png',
    'assets/work/transport-2.png', 'assets/work/inventory-3.png',
  ];
  const GAP  = 118;   // px of cursor travel between spawns
  const HOLD = .85;   // seconds a frame stays before it fades

  stage.classList.add('is-stage');

  /* one node per source — reusing a node for a different src would flash while
     the new file decodes */
  let nodes = [];
  const build = () => {
    if (nodes.length) return;
    nodes = SRCS.map((src) => {
      const img = document.createElement('img');
      img.className = 'trail__img';
      img.alt = '';
      img.decoding = 'async';
      img.src = src;
      layer.appendChild(img);
      return img;
    });
  };

  /* hold the 4.7MB of screenshots back until the section is one viewport away */
  ScrollTrigger.create({ trigger: stage, start: 'top bottom+=100%', once: true, onEnter: build });

  let idx = 0, z = 1, last = null;

  const spawn = (x, y) => {
    build();   // safety net if the cursor arrives before the trigger fires
    const el = nodes[idx++ % nodes.length];
    gsap.killTweensOf(el);
    gsap.set(el, {
      xPercent: -50, yPercent: -50, x, y,
      rotate: gsap.utils.random(-10, 10),
      scale: .84, opacity: 0, zIndex: ++z,
    });
    gsap.to(el, { opacity: 1, scale: 1, duration: .45, ease: EASE_ENTER });
    gsap.to(el, { opacity: 0, scale: .95, duration: .7, ease: EASE_EXIT, delay: HOLD });
  };

  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (last && Math.hypot(x - last.x, y - last.y) < GAP) return;
    last = { x, y };

    stage.classList.add('is-touched');
    spawn(x, y);
  }, { passive: true });

  stage.addEventListener('mouseleave', () => { last = null; }, { passive: true });
}

/* ==========================================================================
   7 · SECTION REVEALS
   ========================================================================== */
function initReveals(){
  if (REDUCED) return;

  // display headings — char cascade
  $$('[data-anim="chars"]').forEach((el) => {
    const chars = splitChars(el);
    gsap.set(chars, { yPercent: 60, opacity: 0 });
    gsap.to(chars, {
      yPercent: 0, opacity: 1,
      duration: .95, ease: EASE_ENTER,
      stagger: { each: .016 },
      scrollTrigger: { trigger: el, start: 'top 84%' },
    });
  });

  // ScrambleText on the work section title — one-time seasoning effect
  const workTitle = $('.shead__title');
  if (workTitle && typeof ScrambleTextPlugin !== 'undefined') {
    const originalText = workTitle.textContent;
    ScrollTrigger.create({
      trigger: workTitle,
      start: 'top 84%',
      once: true,
      onEnter: () => {
        // small delay so the char reveal starts first, then scramble layers on
        gsap.to(workTitle, {
          duration: 1.4,
          scrambleText: {
            text: originalText,
            chars: 'upperCase',
            speed: 0.4,
            revealDelay: 0.3,
          },
          delay: 0.5,
        });
      },
    });
  }

  // body copy — line masks via SplitType.
  // SplitType freezes line breaks at measure time, so a split taken before the
  // element has its final width bakes in wrong wraps permanently (and never
  // reflows on resize). Rebuild from the original markup whenever width changes.
  $$('[data-anim="lines"]').forEach((el) => {
    if (typeof SplitType === 'undefined') return;

    const original = el.innerHTML;

    const build = () => {
      el.innerHTML = original;
      const split = new SplitType(el, { types: 'lines' });
      split.lines.forEach((l) => {
        const wrap = document.createElement('span');
        wrap.style.display = 'block';
        wrap.style.overflow = 'hidden';
        l.parentNode.insertBefore(wrap, l);
        wrap.appendChild(l);
        l.style.display = 'block';
      });
      return split.lines;
    };

    let lines = build();
    gsap.set(lines, { yPercent: 105 });
    let tween = gsap.to(lines, {
      yPercent: 0, duration: 1, ease: EASE_ENTER, stagger: .09,
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });

    // Re-wrap whenever the element's own width actually changes. Watching the
    // element (not the window) also self-heals the case where it was measured
    // at zero width — hidden container, background tab — and only gets real
    // dimensions later.
    if (typeof ResizeObserver !== 'undefined'){
      let lastW = Math.round(el.getBoundingClientRect().width);
      let timer;
      new ResizeObserver(() => {
        const w = Math.round(el.getBoundingClientRect().width);
        if (Math.abs(w - lastW) < 8) return;
        lastW = w;
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (tween){
            if (tween.scrollTrigger) tween.scrollTrigger.kill();
            tween.kill();
            tween = null;
          }
          lines = build();
          gsap.set(lines, { yPercent: 0 });   // reveal already played
          ScrollTrigger.refresh();
        }, 180);
      }).observe(el);
    }
  });

  // work: featured panel — rise in with clip
  $$('.feat').forEach((el) => {
    gsap.from(el, {
      y: 60, opacity: 0, duration: 1.1, ease: EASE_ENTER,
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  // work: project rows — varied entry per row
  $$('.proj').forEach((el, i) => {
    const direction = i % 2 === 0 ? { x: -40, y: 30 } : { x: 40, y: 30 };
    gsap.from(el, {
      ...direction, opacity: 0, duration: 1.1, ease: EASE_ENTER,
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  // screenshots — clip-path mask reveal + stagger
  $$('.feat__shots, .proj__shots').forEach((group) => {
    const shots = $$('.shot, .soon', group);
    shots.forEach((shot, i) => {
      const img = shot.querySelector('img');
      if (img) {
        gsap.set(img, { clipPath: 'inset(0 100% 0 0)' });
        gsap.to(img, {
          clipPath: 'inset(0 0% 0 0)',
          duration: 1,
          ease: EASE_ENTER,
          delay: i * 0.12,
          scrollTrigger: { trigger: shot, start: 'top 88%' },
        });
      }
      // the frame itself still slides up
      gsap.from(shot, {
        y: 40, opacity: 0, duration: .9, ease: EASE_ENTER,
        stagger: .1,
        delay: i * 0.08,
        scrollTrigger: { trigger: group, start: 'top 88%' },
      });
    });
  });

  // contact CTAs
  gsap.from('.contact__main > *', {
    y: 30, opacity: 0, duration: .9, ease: EASE_ENTER, stagger: .1,
    scrollTrigger: { trigger: '.contact__main', start: 'top 90%' },
  });
}

/* Email link decodes in from noise on hover — the section's one signature
   move. Self-contained (no ScrambleTextPlugin: that CDN URL 404s, it's a
   Club GreenSock-only bonus plugin that was never actually reachable here —
   the work-title "seasoning" effect guarded by the same typeof check has
   silently never fired). Letters scramble and lock in left-to-right;
   punctuation stays put so the address never looks broken mid-decode. */
const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function scrambleTo(el, finalText, duration = 600){
  const stable = (ch) => !/[a-z0-9]/i.test(ch);
  const start = performance.now();
  let raf;

  (function step(now){
    const p = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < finalText.length; i++){
      const ch = finalText[i];
      const revealAt = i / finalText.length;
      out += (stable(ch) || p > revealAt) ? ch : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    el.textContent = out;
    if (p < 1) raf = requestAnimationFrame(step);
  })(start);

  return () => cancelAnimationFrame(raf);
}

function initContactScramble(){
  if (REDUCED) return;

  $$('[data-scramble-hover]').forEach((el) => {
    const label = $('.contact__email-text', el) || el;
    const original = label.textContent;
    let cancel;

    el.addEventListener('mouseenter', () => {
      if (cancel) cancel();
      cancel = scrambleTo(label, original, 600);
    });
    el.addEventListener('mouseleave', () => {
      if (cancel) cancel();
      label.textContent = original;
    });
  });
}

/* ==========================================================================
   8 · THE SCROLL FILM — video scrub + beat choreography
   ================================================================= ======== */
/* Where each root tip's violet cluster sits inside the FILM FRAME, as a
   fraction of the video's own width/height. Measured off the frames that play
   while beat (02) is up: the roots are still growing, so each tip travels — the
   left one climbs 7% of the frame height across the beat. `from` is its
   position as the beat fades in, `to` as it fades out; the tags lerp between
   them on the same scrub so a stem never detaches from its cluster. */
const ROOT_TIPS = {
  'node--l': { from: [0.231, 0.666], to: [0.226, 0.592] },
  'node--c': { from: [0.491, 0.867], to: [0.499, 0.800] },
  'node--r': { from: [0.737, 0.609], to: [0.768, 0.599] },
};

let tipK = 0;                       // 0 → 1 across beat (02)
const nodeBox = new WeakMap();      // cached tag sizes; re-measured on resize

/* The film is object-fit:cover, so where the artwork lands on screen depends
   on the viewport's aspect ratio: on a wide screen the frame is scaled to the
   width and cropped top and bottom. Redo that maths here so each tag hangs off
   its own root tip on any screen instead of drifting away from it.
   Called with a number on every scrub tick, and bare on init/resize. */
function placeNodes(k){
  const stage = $('#pinned-container');
  const video = $('#sequence-video');
  if (!stage || !video || !video.videoWidth) return;

  if (typeof k === 'number') tipK = k;
  else $$('.node').forEach((el) => nodeBox.set(el, { w: el.offsetWidth, h: el.offsetHeight }));

  const sw = stage.clientWidth, sh = stage.clientHeight;
  const scale = Math.max(sw / video.videoWidth, sh / video.videoHeight);
  const dw = video.videoWidth * scale, dh = video.videoHeight * scale;
  const ox = (sw - dw) / 2, oy = (sh - dh) / 2;   // negative on the cropped axis
  const PAD = 20;

  $$('.node').forEach((el) => {
    const key = Object.keys(ROOT_TIPS).find((c) => el.classList.contains(c));
    if (!key) return;

    // below 821px the tags stack into a plain list — leave them to the CSS
    if (getComputedStyle(el).position !== 'absolute'){
      el.style.removeProperty('--nx');
      el.style.removeProperty('--ny');
      gsap.set(el, { xPercent: 0 });
      return;
    }

    const { from, to } = ROOT_TIPS[key];
    const nx = from[0] + (to[0] - from[0]) * tipK;
    const ny = from[1] + (to[1] - from[1]) * tipK;

    const box = nodeBox.get(el) || { w: el.offsetWidth, h: el.offsetHeight };
    const w = box.w, h = box.h;
    const tipX = ox + nx * dw;
    const tipY = oy + ny * dh;

    /* Hang the tag below its tip when there's room. The centre root ends near
       the bottom of the frame, so on most screens there isn't — that one flips
       above its tip and grows its stem downward instead. */
    const below = tipY + h + PAD <= sh;
    el.classList.toggle('is-above', !below);

    const x = gsap.utils.clamp(w / 2 + PAD, sw - w / 2 - PAD, tipX);
    const y = gsap.utils.clamp(PAD, sh - h - PAD, below ? tipY : tipY - h);

    el.style.setProperty('--nx', x + 'px');
    el.style.setProperty('--ny', y + 'px');
    gsap.set(el, { xPercent: -50 });
  });
}

function initFilm(video){
  const stage = '#story-section';

  // beats start hidden; each is revealed on its slice of the scrub
  gsap.set('.beat', { opacity: 0 });
  gsap.set('.beat__idx, .beat__line', { y: 34 });
  gsap.set('.node', { y: 30, opacity: 0 });
  placeNodes();
  gsap.set('.beat--final > *', { y: 26, opacity: 0 });

  // video scrubbing
  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: '+=420%',
    pin: '#pinned-container',
    scrub: .35,
    anticipatePin: 1,
    animation: gsap.to(video, { currentTime: video.duration || 1, ease: 'none' }),
  });

  // text choreography on the same timeline
  const tl = gsap.timeline({
    scrollTrigger: { trigger: stage, start: 'top top', end: '+=420%', scrub: .35 },
  });

  // (01) origin
  tl.to('#beat-1', { opacity: 1, duration: .05 }, .04)
    .to('#beat-1 .beat__idx, #beat-1 .beat__line', { y: 0, duration: .06, stagger: .015 }, .05)
    .to('#beat-1', { opacity: 0, duration: .04 }, .17)
    .to('#beat-1 .beat__line', { y: -30, duration: .04 }, .17);

  // (02) the three disciplines — the root tips grow into their violet
  // clusters first; only once each cluster has landed does its word fade in
  // beneath it, so the labels read as naming something already there.
  const tip = { k: 0 };
  tl.to('#beat-2', { opacity: 1, duration: .05 }, .26)
    .to(tip, {
      k: 1, duration: .08, ease: 'none',
      onUpdate: () => placeNodes(tip.k),
    }, .27)
    .to('#beat-2 .node', { opacity: 1, y: 0, duration: .05, stagger: .015 }, .35)
    .to('#beat-2', { opacity: 0, duration: .04 }, .45)
    .to('#beat-2 .node', { y: -26, duration: .04, stagger: .012 }, .45);

  // (03) method
  tl.to('#beat-3', { opacity: 1, duration: .05 }, .52)
    .to('#beat-3 .beat__idx, #beat-3 .beat__line', { y: 0, duration: .06, stagger: .015 }, .53)
    .to('#beat-3', { opacity: 0, duration: .04 }, .66)
    .to('#beat-3 .beat__line', { y: -30, duration: .04 }, .66);

  // (05) the mark — video dissolves into the logo
  tl.to('#sequence-video', { opacity: 0, duration: .06 }, .93)
    .to('.story__vignette', { opacity: 0, duration: .06 }, .93)
    .to('#beat-5', { opacity: 1, duration: .05 }, .93)
    .to('.beat--final > *', { y: 0, opacity: 1, duration: .06, stagger: .015 }, .94);

  ScrollTrigger.refresh();
}

/* reduced-motion / no-video fallback: show the final mark, skip the film */
function filmFallback(){
  gsap.set('.beat--final', { opacity: 1 });
  gsap.set('.beat--final > *', { opacity: 1, y: 0 });
}

/* ==========================================================================
   9 · PRELOADER — real download progress, then the curtain lifts
   ========================================================================== */
function setProgress(pct){
  const t = $('#progress-text');
  const b = $('#progress-bar');
  if (t) t.textContent = String(Math.round(pct)).padStart(2, '0');
  if (b) b.style.transform = `scaleX(${pct / 100})`;
}

/* Reveal is guarded by flags + a watchdog: requestAnimationFrame is paused in
   background tabs, so a purely tween-driven reveal can hang the preloader
   forever. These make sure the site always ends up visible. */
let siteShown = false;
let filmReady = false;

function startFilm(video){
  if (filmReady) return;
  filmReady = true;
  if (video && video.duration) initFilm(video);
  else filmFallback();
}

/* hard fallback — skips the choreography and just shows the site */
function forceReveal(video){
  if (siteShown) return;
  siteShown = true;

  const loader  = $('#preloader');
  const curtain = $('.curtain');
  if (loader)  loader.style.display  = 'none';
  if (curtain) curtain.style.display = 'none';
  document.body.classList.remove('is-loading');

  gsap.set('.hero__row--top > *, .hero__row--bottom > *, .hero__item, .marquee--seam, .nav > *',
           { opacity: 1, y: 0, yPercent: 0 });
  const chars = $$('.hero__title .char');
  if (chars.length) gsap.set(chars, { opacity: 1, yPercent: 0, rotate: 0 });

  placeHeroStroke();
  const stroke = $('.hero__stroke path');
  if (stroke) gsap.set(stroke, { strokeDashoffset: 0 });
  initHeroGravity();

  startFilm(video);
  ScrollTrigger.refresh();
}

function revealSite(video){
  if (siteShown) return;

  const tl = gsap.timeline({
    onComplete: () => {
      siteShown = true;
      document.body.classList.remove('is-loading');
      ScrollTrigger.refresh();
    },
  });

  tl.to('.loader__inner', { y: -30, opacity: 0, duration: .6, ease: EASE_EXIT })
    .set('#preloader', { display: 'none' })
    .to('.curtain span', {
      yPercent: -101,
      duration: 1.1,
      ease: 'expo.inOut',
      stagger: { each: .07, from: 'start' },
    }, '-=.1')
    .set('.curtain', { display: 'none' })
    .add(heroIntro(), '-=.55');

  tl.add(() => startFilm(video), '-=1.2');
}

function boot(){
  const video    = $('#sequence-video');
  const isMobile = window.innerWidth < 768;
  const src      = isMobile ? 'Video_Scrub_HQ_Mobile.mp4' : 'Video_Scrub_HQ_Desktop.mp4';

  // Reduced motion: no film at all, straight to a static page.
  if (REDUCED){
    setProgress(100);
    $('#preloader').style.display = 'none';
    $('.curtain').style.display = 'none';
    document.body.classList.remove('is-loading');
    filmFallback();
    return;
  }

  // setTimeout, not gsap.delayedCall — the GSAP ticker stops with rAF in
  // background tabs, which would strand the visitor on the preloader.
  const start = () => {
    if (video.dataset.ready) return;
    video.dataset.ready = '1';
    video.pause();
    setProgress(100);
    setTimeout(() => revealSite(video), 350);
  };

  const fail = (why) => {
    console.warn('[omentix] film unavailable —', why);
    setProgress(100);
    setTimeout(() => revealSite(null), 200);
  };

  // watchdog: whatever happens, never leave someone staring at a loader
  setTimeout(() => {
    if (!siteShown) forceReveal(video.duration ? video : null);
  }, 12000);

  video.addEventListener('loadedmetadata', start);
  video.addEventListener('error', () => fail('video error'));

  // file:// blocks XHR — load the video directly and fake the progress bar
  if (window.location.protocol === 'file:'){
    gsap.to({ v: 0 }, {
      v: 92, duration: 1.6, ease: 'power1.out',
      onUpdate() { setProgress(this.targets()[0].v); },
    });
    video.src = src;
    video.load();
    if (video.readyState >= 1) start();
    return;
  }

  // http(s): stream the file so the counter reflects a real download
  const xhr = new XMLHttpRequest();
  xhr.open('GET', src, true);
  xhr.responseType = 'blob';

  const shown = { v: 0 };
  xhr.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const pct = (e.loaded / e.total) * 96;      // leave headroom for decode
    gsap.to(shown, {
      v: pct, duration: .4, ease: 'power2.out', overwrite: true,
      onUpdate: () => setProgress(shown.v),
    });
  };

  xhr.onload = function(){
    if (this.status !== 200) return fail('http ' + this.status);
    video.src = URL.createObjectURL(this.response);
    video.load();
    if (video.readyState >= 1) start();
  };

  xhr.onerror = () => fail('network');
  xhr.send();
}

/* ==========================================================================
   10 · DEBOUNCED ScrollTrigger.refresh() ON RESIZE
   ========================================================================== */
let resizeTimer;
window.addEventListener('resize', () => {
  placeHeroStroke();
  placeNodes();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
});

/* ==========================================================================
   INIT
   ========================================================================== */
initSmoothScroll();
initAnchors();
initCursor();
initMagnetic();
initChrome();

/* Line splitting must wait for BOTH the webfonts and full layout: SplitType
   freezes line breaks at measure time, so measuring early bakes in wrong wraps. */
function whenSettled(fn){
  const run = () => setTimeout(fn, 0);
  const afterFonts = () => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    else run();
  };
  if (document.readyState === 'complete') afterFonts();
  else window.addEventListener('load', afterFonts, { once: true });
}

whenSettled(() => {
  initReveals();
  initShotTilt();
  initWorkTrail();
  initContactScramble();
  placeHeroStroke();
  ScrollTrigger.refresh();
});

window.addEventListener('load', () => ScrollTrigger.refresh());
boot();
