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

  // overflow:hidden only stops the user scrolling — Lenis scrolls in code, so
  // a wheel over the preloader would still move the page hidden behind it
  if (document.body.classList.contains('is-loading')) lenis.stop();
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

  /* A plain scroll check, not a ScrollTrigger onUpdate: a refresh (every
     browser zoom step triggers one) rewinds the scroll to 0 to measure, and
     the trigger could be left thinking the page was at the top — the pill
     dropped away mid-page, leaving light nav text on the cream sections. */
  const nav = $('#nav');
  if (nav){
    const stick = () => nav.classList.toggle('is-stuck', window.scrollY > 80);
    window.addEventListener('scroll', stick, { passive: true });
    ScrollTrigger.addEventListener('refresh', stick);
    stick();
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
  // built behind the preloader, started by revealSite()
  const tl = gsap.timeline({ paused: true, onComplete: initHeroGravity });

  if (REDUCED){
    gsap.set([chars, '.hero__row', '.hero__lede'], { opacity: 1, y: 0 });
    if (stroke) gsap.set(stroke, { strokeDashoffset: 0 });
    return tl;
  }

  gsap.set(chars, { yPercent: 118, rotate: 5, opacity: 0 });
  gsap.set('.hero__row--top > *', { yPercent: 100, opacity: 0 });
  gsap.set('.hero__row--bottom > *', { y: 26, opacity: 0 });
  gsap.set('.hero__item', { y: 14, opacity: 0 });
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
    }, '-=.7');

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
   instead of a tall empty box. The screenshots are the same files as the
   work section's own, which the preloader fetches and decodes up front.
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

  build();

  let idx = 0, z = 1, last = null;

  const spawn = (x, y) => {
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
          scheduleRefresh();
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
   7b · THE DOCKET — work order → mailto
   ──────────────────────────────────────
   The site is a static file (it gets opened straight off the disk, see the
   note at the foot of index.html), so there is no endpoint to post to. The
   docket composes the enquiry into a mail draft and hands it to whatever
   client the visitor has. That means the page never learns whether the mail
   was actually sent — which is exactly why the confirmation says "filed"
   and not "received". Don't upgrade that wording without a real backend.

   To move to one later, replace handOff() and nothing else.
   ========================================================================== */
const DOCKET_TO = 'omentix.tech@gmail.com';

/* OMX·YYMMDD·NNN — the date is the useful half, the suffix just keeps two
   enquiries filed on the same day from carrying the same number. */
function docketNumber(){
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `OMX·${stamp}·${String(Math.floor(Math.random() * 900) + 100)}`;
}

/* Leader dots so the draft reads like the printed form it came from. */
function docketLine(label, value){
  const dots = '.'.repeat(Math.max(2, 22 - label.length));
  return `${label} ${dots} ${value}`;
}

function handOff({ no, scope, budget, timeline, name, email, brief }){
  const body = [
    'OMENTIX — WORK ORDER',
    no,
    '',
    docketLine('01 Scope',    scope.length ? scope.join(', ') : '—'),
    docketLine('02 Budget',   budget   || '—'),
    docketLine('03 Timeline', timeline || '—'),
    docketLine('04 Name',     name),
    docketLine('05 Email',    email),
    '',
    '06 Brief',
    brief || '—',
    '',
  ].join('\r\n');

  window.location.href = `mailto:${DOCKET_TO}`
    + `?subject=${encodeURIComponent(`Work order ${no} — ${name}`)}`
    + `&body=${encodeURIComponent(body)}`;
}

function initDocket(){
  const form = $('#docket');
  if (!form) return;

  const wrap    = form.closest('.docket__wrap');
  const filed   = $('[data-docket-filed]', wrap);
  const errorEl = $('[data-docket-error]', form);
  const stamp   = $('.docket__stamp', form);
  const no      = docketNumber();

  $('[data-docket-no]', form).textContent = no;

  /* ---- stamp chips ---- */
  const groups = $$('.docket__chips', form);
  groups.forEach((group) => {
    const multi = group.hasAttribute('data-multi');
    const chips = $$('.chip', group);
    chips.forEach((chip) => {
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => {
        const on = chip.getAttribute('aria-pressed') === 'true';
        if (!multi) chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', String(!on));
      });
    });
  });

  const picked = (key) => $$(`[data-chips="${key}"] .chip[aria-pressed="true"]`, form)
    .map((c) => c.dataset.value);

  /* ---- validation: only the two fields a reply actually needs ---- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const clear = (input) => {
    input.removeAttribute('aria-invalid');
    input.closest('.docket__row').removeAttribute('data-invalid');
  };
  const flag = (input, message) => {
    input.setAttribute('aria-invalid', 'true');
    input.closest('.docket__row').setAttribute('data-invalid', '');
    errorEl.textContent = message;
    errorEl.hidden = false;
    input.focus();
    return false;
  };

  $$('.docket__input', form).forEach((input) => {
    input.addEventListener('input', () => {
      clear(input);
      if (!$$('.docket__row[data-invalid]', form).length) errorEl.hidden = true;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name  = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const brief = form.elements.brief.value.trim();

    errorEl.hidden = true;
    $$('.docket__row[data-invalid]', form).forEach((r) => r.removeAttribute('data-invalid'));

    if (!name)              return flag(form.elements.name,  'Line 04 — we need a name to write back to.');
    if (!EMAIL.test(email)) return flag(form.elements.email, 'Line 05 — that address doesn’t look right.');

    handOff({ no, scope: picked('scope'), budget: picked('budget')[0],
              timeline: picked('timeline')[0], name, email, brief });

    form.hidden = true;
    filed.hidden = false;
    filed.focus();

    if (!REDUCED) {
      gsap.fromTo($('.docket__filed-stamp', filed),
        { scale: 1.7, opacity: 0, rotate: -26 },
        { scale: 1, opacity: .92, rotate: -8, duration: .7, ease: EASE_ENTER });
    }
  });

  $('[data-docket-again]', wrap).addEventListener('click', () => {
    filed.hidden = true;
    form.hidden = false;
    // the magnetic hover leaves a transform behind on a button that was
    // hidden mid-hover; put it back on its mark
    gsap.set(stamp, { x: 0, y: 0 });
    form.elements.name.focus();
  });

  /* ---- reveal ---- */
  if (!REDUCED) {
    gsap.from(wrap, {
      y: 40, opacity: 0, duration: .9, ease: EASE_ENTER,
      scrollTrigger: { trigger: wrap, start: 'top 86%' },
    });
  }
}

/* ==========================================================================
   8 · THE SCROLL FILM — root-film.js, scrubbed by the pin
   The film draws itself and places its own copy (beats, service tags, the
   closing mark); all this side does is pin the stage and hand it a 0–1
   progress. Where WebGL is missing the section keeps its static mark
   (.story without .has-film, see style.css).
   ========================================================================== */
let film = null;

function initFilm(){
  if (film) return;
  const section = $('#story-section');
  const stage   = $('#pinned-container');
  if (!section || !stage || typeof createRootFilm !== 'function') return;

  try {
    film = createRootFilm(stage, { reduced: REDUCED });
  } catch (err){
    console.warn('[omentix] root film unavailable —', err);
    return;
  }
  section.classList.add('has-film');

  // reduced motion: the closing mark, drawn once, nothing pinned
  if (REDUCED){ film.setProgress(1); return; }

  heroHandoff(section);   // has to exist before the film's pin is measured

  const scrub = { p: 0 };
  film.setProgress(0);
  gsap.to(scrub, {
    p: 1, ease: 'none',
    onUpdate: () => film.setProgress(scrub.p),
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=900%',        // seven chapters — about nine screens of scroll
      pin: stage,
      scrub: .35,
      anticipatePin: 1,
    },
  });
}

/* The hand-off between the two tubes. The hero holds while its copy lifts
   away, its CRT is crushed to a line and then to a dot (crt-warp.js
   setCollapse), and the hero fades out leaving that dot burning dead centre
   — exactly where the film opens on its seed, which then powers its own
   screen on (root-film.js). The two backgrounds were always going to differ;
   this makes the change read as one set switching off and the next one
   switching on.

   The film section is pulled up under the hero by the hero's own height, so
   the film's pin starts on the very scroll position where the hero's ends. */
const HANDOFF = '+=110%';

function heroHandoff(section){
  const hero = $('.hero');
  if (!hero) return;
  const tube = window.heroTube;

  const overlap = () => { section.style.marginTop = `${-hero.offsetHeight}px`; };
  overlap();
  ScrollTrigger.addEventListener('refreshInit', overlap);

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: hero, start: 'top top', end: HANDOFF, pin: true, scrub: .35, anticipatePin: 1 },
  });

  // 1 · the copy lifts away, top row first, the headline a line at a time
  const lift = [
    ['.hero__row--top', 0],
    ...$$('.hero__title .line').map((el, i) => [el, 1 + i]),
    ['.hero__stroke', 2],
    ['.hero__row--bottom', 3],
  ];
  lift.forEach(([target, i]) => {
    tl.to(target, { y: -(70 + i * 16), opacity: 0, duration: .22, ease: 'power2.in' }, i * .04);
  });
  tl.to('.hero__rail', { opacity: 0, duration: .2 }, 0);

  // 2 · the tube switches off: picture → line → dot
  if (tube && tube.setCollapse){
    const off = { k: 0 };
    tl.to(off, { k: 1, duration: .74, onUpdate: () => tube.setCollapse(off.k) }, .16);
  }

  // 3 · the hero lets go; the dot is left on the film's seed
  tl.to(hero, { opacity: 0, duration: .12 }, .88);
}

/* ==========================================================================
   9 · PRELOADER — nothing is shown until everything is ready
   The curtain only lifts once the fonts and every image are in and decoded,
   all the heavy setup — text splitting, the film's pin, the refresh that
   measures it — has run behind the loader, and the film has compiled its
   shaders and drawn a frame. The intro then plays on an idle main thread
   instead of sharing it with that work.
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
let revealing = false;
let prepared  = false;
let introTl   = null;

/* Everything that measures or rebuilds the page, run once while the loader
   still covers it. SplitType freezes line breaks at measure time, so this has
   to wait for the webfonts and full layout — boot() makes sure of that. */
function prepareSite(){
  if (prepared) return;
  prepared = true;
  initReveals();
  initShotTilt();
  initWorkTrail();
  initContactScramble();
  initFilm();
  placeHeroStroke();
  introTl = heroIntro();
}

const once = (target, type) => new Promise((resolve) => target.addEventListener(type, resolve, { once: true }));

// capped by a timeout: rAF never fires in a background tab
const nextFrames = (n) => new Promise((resolve) => {
  const done = setTimeout(resolve, 250);
  const step = () => {
    if (--n > 0) return requestAnimationFrame(step);
    clearTimeout(done);
    resolve();
  };
  requestAnimationFrame(step);
});

/* hard fallback — skips the choreography and just shows the site */
function forceReveal(){
  if (siteShown) return;
  siteShown = true;

  prepareSite();
  if (introTl) introTl.kill();

  const loader  = $('#preloader');
  const curtain = $('.curtain');
  if (loader)  loader.style.display  = 'none';
  if (curtain) curtain.style.display = 'none';
  document.body.classList.remove('is-loading');
  if (lenis) lenis.start();

  gsap.set('.hero__row--top > *, .hero__row--bottom > *, .hero__item, .nav > *',
           { opacity: 1, y: 0, yPercent: 0 });
  const chars = $$('.hero__title .char');
  if (chars.length) gsap.set(chars, { opacity: 1, yPercent: 0, rotate: 0 });

  placeHeroStroke();
  const stroke = $('.hero__stroke path');
  if (stroke) gsap.set(stroke, { strokeDashoffset: 0 });
  initHeroGravity();

  ScrollTrigger.refresh();
}

function revealSite(){
  if (siteShown || revealing) return;
  revealing = true;

  const tl = gsap.timeline({ onComplete: () => { siteShown = true; } });

  tl.to('.loader__inner', { y: -30, opacity: 0, duration: .6, ease: EASE_EXIT })
    .set('#preloader', { display: 'none' })
    .to('.curtain span', {
      yPercent: -101,
      duration: 1.1,
      ease: 'expo.inOut',
      stagger: { each: .07, from: 'start' },
    }, '-=.1')
    .set('.curtain', { display: 'none' })
    // the page is already measured, and the reserved scrollbar gutter means
    // unlocking scroll changes no widths — nothing needs refreshing here
    .add(() => {
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
    })
    .add(introTl.paused(false), '-=.55');
}

async function boot(){
  // the intro is choreographed from the top of the page
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const pageReady = (document.readyState === 'complete' ? Promise.resolve() : once(window, 'load'))
    .then(() => (document.fonts ? document.fonts.ready : null));

  // Reduced motion: no loader choreography, straight to a static page.
  if (REDUCED){
    setProgress(100);
    $('#preloader').style.display = 'none';
    $('.curtain').style.display = 'none';
    document.body.classList.remove('is-loading');
    await pageReady;
    prepareSite();
    ScrollTrigger.refresh();
    return;
  }

  // watchdog: whatever happens, never leave someone staring at a loader
  setTimeout(() => {
    if (!siteShown && !revealing) forceReveal();
  }, 20000);

  // the counter eases between real milestones rather than jumping to them
  const shown = { v: 0 };
  const report = (pct) => gsap.to(shown, {
    v: pct, duration: .5, ease: 'power2.out', overwrite: true,
    onUpdate: () => setProgress(shown.v),
  });
  report(12);

  await pageReady;                       // scripts, stylesheets, fonts
  report(45);

  // every image on the page decoded, not just fetched, so nothing pops in
  // or costs a frame the first time it scrolls into view
  await Promise.all($$('img').map((img) => (img.decode ? img.decode().catch(() => {}) : null)));
  if (siteShown) return;                 // the watchdog got there first
  report(72);

  prepareSite();
  ScrollTrigger.refresh();
  $$('.trail__img').forEach((img) => img.decode && img.decode().catch(() => {}));
  if (film) film.warm();                 // shader compiles land here, not on first scroll
  report(92);

  // let that layout, its first paint and the GPU uploads land first
  await nextFrames(3);
  gsap.killTweensOf(shown);
  setProgress(100);

  // setTimeout, not gsap.delayedCall — the GSAP ticker stops with rAF in
  // background tabs, which would strand the visitor on the preloader.
  setTimeout(revealSite, 350);
}

/* ==========================================================================
   10 · RESIZE AND BROWSER ZOOM
   A zoom step is a resize: the page reflows to a new height and the film's
   pin grows or shrinks with the viewport. ScrollTrigger's refresh keeps the
   old scroll offset in pixels, which on the reflowed page is somewhere else
   entirely — zooming dropped people a section, or a whole film beat, away
   from where they were. So remember what was on screen, as a position inside
   the block at the top of the viewport, and put that back after the refresh.
   ========================================================================== */
ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });  // resize is handled below

const ANCHOR_SEL = 'section, .shead, .feat, .proj, .docket__wrap, .contact__main';
let anchor = null;
let holdAnchor = false;   // from the first resize until the page is put back
let anchorTimer, refreshTimer;

function takeAnchor(){
  if (holdAnchor) return;
  let best = null;
  // later in document order = more deeply nested, so the most specific wins
  for (const el of $$(ANCHOR_SEL)){
    const r = el.getBoundingClientRect();
    if (r.top <= 0 && r.bottom > 0 && r.height) best = { el, frac: -r.top / r.height };
  }
  anchor = best;
}

function restoreAnchor(){
  if (!anchor || !anchor.el.isConnected) return;
  const r = anchor.el.getBoundingClientRect();
  const y = Math.round(window.scrollY + r.top + anchor.frac * r.height);
  if (Math.abs(y - window.scrollY) < 2) return;
  if (lenis){
    lenis.resize();   // its own re-measure is debounced — without this it clamps to the old page height
    lenis.scrollTo(y, { immediate: true, force: true });
  }
  else window.scrollTo(0, y);
  ScrollTrigger.update();
}

/* one refresh for everything that needs one — a resize, a zoom step, a
   SplitType re-wrap — with the reader put back where they were */
function scheduleRefresh(){
  holdAnchor = true;
  clearTimeout(anchorTimer);
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    ScrollTrigger.refresh();
    restoreAnchor();
    holdAnchor = false;
  }, 180);
}

window.addEventListener('scroll', () => {
  clearTimeout(anchorTimer);
  anchorTimer = setTimeout(takeAnchor, 120);   // once the scroll settles
}, { passive: true });

window.addEventListener('resize', () => {
  placeHeroStroke();
  scheduleRefresh();
});

/* ==========================================================================
   INIT
   ========================================================================== */
initSmoothScroll();
initAnchors();
initCursor();
initMagnetic();
initChrome();
initDocket();
boot();
