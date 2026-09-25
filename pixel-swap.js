/* ==========================================================================
   PIXEL SWAP — React Bits' pixel-swap, ported to a plain script
   ─────────────────────────────────────────────────────────────
   Same algorithm as the original component (grid build, pattern ordering,
   window/content inverse keyframes), with the React parts taken out: state
   lives in a closure and the two contents are markup you write yourself.

   Every pixel is a clipped window onto its own clone of the incoming layer,
   counter-transformed about the pixel's own centre so the revealed content
   never drifts or scales while the window spins and grows.

   One change from upstream worth knowing about: upstream absolutely
   positions both layers and needs an aspect-ratio to give the box a height.
   Headlines don't have an aspect ratio — they have whatever height the type
   wraps to — so here the layers are grid items stacked in one cell and the
   container takes the height of the taller one. Both layers stretch to fill
   that cell, and clones are pinned to it at full width and height to match.

   Usage:
     <div class="pixel-swap" data-pixel-swap>
       <div class="pixel-swap__layer">…first…</div>
       <div class="pixel-swap__layer">…second…</div>
     </div>
     createPixelSwap(el, { pattern:'spiral', pixelSize:24, duration:900, pixelSpin:70 });
   ========================================================================== */
(function (global) {
  'use strict';

  const MAX_PIXELS = 220;      // the grid stays bounded however small pixelSize gets
  const KEYFRAME_STEPS = 14;

  const PATTERNS = {
    random: () => null,
    center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
    edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
    'left-to-right': (x) => x,
    'right-to-left': (x) => 1 - x,
    'top-to-bottom': (_x, y) => y,
    'bottom-to-top': (_x, y) => 1 - y,
    diagonal: (x, y) => (x + y) / 2,
    spiral: (x, y) => {
      const angle = (Math.atan2(y - 0.5, x - 0.5) + Math.PI) / (Math.PI * 2);
      const radius = Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2;
      return (angle + radius) % 1;
    },
  };

  const EASINGS = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const noise = (seed) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  function makeEasing(value) {
    const match = /cubic-bezier\(([^)]+)\)/.exec(value);
    const points = match ? match[1].split(',').map(Number) : EASINGS[value];
    if (!points || points.length !== 4 || points.some(Number.isNaN)) return makeEasing('ease');

    const [x1, y1, x2, y2] = points;
    if (x1 === y1 && x2 === y2) return (progress) => progress;

    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    return (progress) => {
      let t = progress;
      for (let i = 0; i < 5; i += 1) {
        const slope = (3 * ax * t + 2 * bx) * t + cx;
        if (!slope) break;
        t -= (((ax * t + bx) * t + cx) * t - progress) / slope;
      }
      t = clamp(t, 0, 1);
      return ((ay * t + by) * t + cy) * t;
    };
  }

  /* Pixels grow slightly past their own box so gaps and rounded corners close
     completely by the end. The overlap is invisible because every pixel shows
     the same content locked to the same origin. */
  function coverScale(size, gap, radius) {
    const p = clamp(radius, 0, 50) / 100;
    const corner = Math.SQRT1_2 / (Math.SQRT2 * (0.5 - p) + p);
    return ((size + gap) / size) * Math.max(1, corner);
  }

  function buildGrid({ width, height, pixelSize, gap, pattern, randomness }) {
    let size = pixelSize;
    let columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
    let rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));

    if (columns * rows > MAX_PIXELS) {
      size = Math.ceil(size * Math.sqrt((columns * rows) / MAX_PIXELS));
      columns = Math.max(1, Math.ceil((width + gap) / (size + gap)));
      rows = Math.max(1, Math.ceil((height + gap) / (size + gap)));
    }

    // Overhang the box so edge pixels stay square instead of being cut short.
    const stride = size + gap;
    const originX = (width - (columns * stride - gap)) / 2;
    const originY = (height - (rows * stride - gap)) / 2;
    const order = PATTERNS[pattern] || PATTERNS.random;
    const mix = clamp(randomness, 0, 1);
    const pixels = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const x = columns <= 1 ? 0.5 : column / (columns - 1);
        const y = rows <= 1 ? 0.5 : row / (rows - 1);
        const base = order(x, y);
        const random = noise(index + 1);

        pixels.push({
          id: index,
          left: originX + column * stride,
          top: originY + row * stride,
          offset: base === null ? random : base * (1 - mix) + random * mix,
        });
      }
    }

    return { pixels, size, gap, width, height };
  }

  /* One shared pair of keyframe lists for the whole grid: the window
     transform and its exact inverse, so revealed content never drifts. */
  function buildKeyframes({ ease, startScale, endScale, spin, fade }) {
    const windowFrames = [];
    const contentFrames = [];

    for (let step = 0; step <= KEYFRAME_STEPS; step += 1) {
      const progress = step / KEYFRAME_STEPS;
      const eased = ease(progress);
      const scale = startScale + (endScale - startScale) * eased;
      const angle = spin * (1 - eased);

      windowFrames.push({
        offset: progress,
        opacity: fade ? Math.min(1, eased * 1.6) : 1,
        transform: `rotate(${angle}deg) scale(${scale})`,
      });
      contentFrames.push({
        offset: progress,
        transform: `scale(${1 / scale}) rotate(${-angle}deg)`,
      });
    }

    return { window: windowFrames, content: contentFrames };
  }

  const DEFAULTS = {
    pixelSize: 64,
    gap: 0,
    pixelRadius: 0,
    pixelSpin: 0,
    pixelScale: 0.35,
    fade: true,
    duration: 1400,
    pixelDuration: 450,
    pattern: 'random',
    randomness: 0,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    trigger: 'hover',
    initialActive: false,
    onComplete: null,
  };

  function createPixelSwap(container, options = {}) {
    const props = { ...DEFAULTS, ...options };
    const layers = Array.from(container.children).filter((el) =>
      el.classList.contains('pixel-swap__layer'));
    if (layers.length < 2) return null;

    let shownActive = !!props.initialActive;
    let animations = [];
    let gridHost = null;
    let timer = 0;
    let busy = false;
    let box = { width: 0, height: 0 };

    const showLayer = (index) => {
      layers.forEach((layer, i) => {
        const on = i === index;
        layer.dataset.visible = String(on);
        layer.style.zIndex = on ? '2' : '1';
        layer.setAttribute('aria-hidden', String(!on));
      });
    };
    showLayer(shownActive ? 1 : 0);

    const measure = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      box = { width, height };
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);

    function stop() {
      animations.forEach((animation) => animation.cancel());
      animations = [];
      if (gridHost) { gridHost.remove(); gridHost = null; }
      if (timer) { clearTimeout(timer); timer = 0; }
    }

    function swap(to) {
      if (busy || to === shownActive) return;
      measure();

      const grid = buildGrid({
        width: box.width,
        height: box.height,
        pixelSize: Math.max(8, Math.round(props.pixelSize)),
        gap: Math.max(0, Math.round(props.gap)),
        pattern: props.pattern,
        randomness: props.randomness,
      });

      const source = layers[to ? 1 : 0];
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      // No grid, or motion turned down: cut straight to the other layer.
      if (!grid.pixels.length || reduced) {
        shownActive = to;
        showLayer(to ? 1 : 0);
        container.dataset.active = String(shownActive);
        if (props.onComplete) props.onComplete(to);
        return;
      }

      busy = true;
      container.dataset.transitioning = 'true';

      const total = Math.max(200, props.duration);
      const pixelMs = clamp(props.pixelDuration, 60, total);
      const spread = Math.max(0, total - pixelMs);
      const endScale = coverScale(grid.size, grid.gap, props.pixelRadius);
      const keyframes = buildKeyframes({
        ease: makeEasing(props.easing),
        startScale: clamp(props.pixelScale, 0.05, 1) * endScale,
        endScale,
        spin: props.pixelSpin,
        fade: props.fade,
      });

      gridHost = document.createElement('div');
      gridHost.className = 'pixel-swap__grid';
      gridHost.setAttribute('aria-hidden', 'true');

      grid.pixels.forEach((pixel) => {
        const pixelElement = document.createElement('div');
        pixelElement.className = 'pixel-swap__pixel';
        pixelElement.style.left = `${pixel.left}px`;
        pixelElement.style.top = `${pixel.top}px`;
        pixelElement.style.width = `${grid.size}px`;
        pixelElement.style.height = `${grid.size}px`;
        pixelElement.style.borderRadius = `${clamp(props.pixelRadius, 0, 50)}%`;

        // Clone the rendered layer rather than rebuilding the content once
        // per pixel: same visual result, a fraction of the cost.
        const content = document.createElement('div');
        content.className = 'pixel-swap__pixel-content';
        content.style.left = `${-pixel.left}px`;
        content.style.top = `${-pixel.top}px`;
        content.style.width = `${grid.width}px`;
        content.style.height = `${grid.height}px`;
        // Counter-transform about the pixel's centre, not the content's, so
        // the two transforms cancel to an exact identity at every frame.
        content.style.transformOrigin =
          `${pixel.left + grid.size / 2}px ${pixel.top + grid.size / 2}px`;

        const clone = source.cloneNode(true);
        clone.dataset.visible = 'true';
        clone.removeAttribute('aria-hidden');
        clone.removeAttribute('id');
        // The layers are grid items in the real box; inside the clone there is
        // no grid, so pin it to the top-left at full width to match.
        clone.style.position = 'absolute';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.zIndex = '2';
        content.appendChild(clone);
        pixelElement.appendChild(content);
        gridHost.appendChild(pixelElement);

        const timing = {
          duration: pixelMs,
          delay: pixel.offset * spread,
          easing: 'linear',
          fill: 'both',
        };
        animations.push(
          pixelElement.animate(keyframes.window, timing),
          content.animate(keyframes.content, timing),
        );
      });

      container.appendChild(gridHost);

      timer = setTimeout(() => {
        stop();
        shownActive = to;
        busy = false;
        showLayer(to ? 1 : 0);
        container.dataset.active = String(shownActive);
        delete container.dataset.transitioning;
        if (props.onComplete) props.onComplete(to);
      }, total);
    }

    const toggle = () => swap(!shownActive);

    if (props.trigger === 'click') {
      container.addEventListener('click', toggle);
      container.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
      if (!container.hasAttribute('role')) container.setAttribute('role', 'button');
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
    } else if (props.trigger === 'hover') {
      container.addEventListener('mouseenter', () => swap(true));
      container.addEventListener('mouseleave', () => swap(false));
      container.addEventListener('focus', () => swap(true));
      container.addEventListener('blur', () => swap(false));
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
    }

    container.dataset.active = String(shownActive);

    return {
      toggle,
      swap,
      isActive: () => shownActive,
      destroy() {
        stop();
        resizeObserver.disconnect();
      },
    };
  }

  global.createPixelSwap = createPixelSwap;
})(window);
