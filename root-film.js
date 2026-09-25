/* ==========================================================================
   OMENTIX TECH — Root Film
   The scroll film, rendered live: a phosphor tree grows, its roots break a
   ground grid and bloom into the three service nodes, sap runs down into
   them, and everything dissolves into a core that settles as logo.svg.
   Replaces the 57MB frame-by-frame video.

   Plain script reading the global THREE (r159, loaded for crt-warp.js), for
   the same reason as crt-warp.js: module scripts are blocked when index.html
   is opened straight off the disk.

     const film = createRootFilm(stageEl, { reduced });
     film.setProgress(0…1);   // main.js drives this from the pinned ScrollTrigger
     film.warm();             // compile shaders + draw once, behind the preloader

   The stage supplies its own overlay copy: .film-beat[data-in][data-out],
   three .film-tag (Web / App / AI, in that order) and one .film-word.
   ========================================================================== */

(function (global){
'use strict';

function createRootFilm(stage, { reduced = false } = {}){
  if (!global.THREE) throw new Error('root-film.js: three.js has to load first');
  const REDUCED = reduced;

  /* Phones get a lighter build of the same film: 1x render scale instead of
     up to 1.6x, no MSAA, about half the particles and tube segments. On top
     of that, a governor trims the render scale further if a device still
     can't hold its frame rate, and gives it back when it can. */
  const LITE = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 768;
  const Q = LITE
    ? { dpr: 1, seg: .55, rad: .7, parts: .45, samples: 0, orb: 2 }
    : { dpr: 1.6, seg: 1, rad: 1, parts: 1, samples: 4, orb: 3 };
  const qs = (n) => Math.max(4, Math.round(n * Q.seg));
  const qr = (n) => Math.max(5, Math.round(n * Q.rad));
  let renderScale = 1;

  const canvas = document.createElement('canvas');
  canvas.className = 'film__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);

  /* ---- maths ------------------------------------------------------------ */
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => { const c = 1.9; return t <= 0 ? 0 : 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const bump = (p, a, b) => { const t = seg(p, a, b); return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI); };
  function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const T3 = global.THREE;
  // Colours below are given as numbers, which three takes as working-space
  // values untouched, and everything renders to an offscreen target first,
  // so the page-wide ColorManagement setting (crt-warp.js relies on it) stays as is.
  const V = (x, y, z) => new T3.Vector3(x, y, z);

  function bez(P, t, out = new T3.Vector3()){
    const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return out.set(
      a * P[0].x + b * P[1].x + c * P[2].x + d * P[3].x,
      a * P[0].y + b * P[1].y + c * P[2].y + d * P[3].y,
      a * P[0].z + b * P[1].z + c * P[2].z + d * P[3].z);
  }
  function bezTan(P, t){
    const u = 1 - t;
    const v = new T3.Vector3();
    for (let k = 0; k < 3; k++){
      const w = k === 0 ? 3 * u * u : k === 1 ? 6 * u * t : 3 * t * t;
      v.addScaledVector(new T3.Vector3().subVectors(P[k + 1], P[k]), w);
    }
    return v.normalize();
  }

  /* ======================================================================
     THE MARK — logo.svg, mapped into the scene around the hub
     ====================================================================== */
  const HUB = V(0, .35, 0);
  const SC = .016;
  const logoAt = (x, y) => V(HUB.x + (x - 100) * SC, HUB.y - (y - 100) * SC, 0);
  const SPOKE_R = 4 * SC;
  const FORK = V(0, 1.15, 0);

  /* ======================================================================
     THE TREE — every branch is a cubic curve with a grow window, a
     dissolve window, and (for the seven that survive) a spoke of the mark
     ====================================================================== */
  const R = rng(20250919);
  const branches = [];
  const add = (b) => {
    b.Q = b.Q || [HUB.clone(), HUB.clone(), HUB.clone(), HUB.clone()];
    b.spokeR = b.spokeR || 0;
    b.len = b.P[0].distanceTo(b.P[3]);
    const dir = new T3.Vector3().subVectors(b.P[3], b.P[0]).normalize();
    b.ref = Math.abs(dir.z) < .8 ? V(0, 0, 1) : V(1, 0, 0);
    branches.push(b);
    return b;
  };
  const spokeQ = (to) => [HUB.clone(), HUB.clone().lerp(to, 1 / 3), HUB.clone().lerp(to, 2 / 3), to.clone()];

  // trunk
  const trunk = add({ P: [V(0, 0, 0), V(.06, .4, .03), V(-.07, .8, -.04), FORK.clone()],
    r0: .13, r1: .075, win: [.005, .07, 2, 3], depth: 0, kind: 0, bud: 0, segs: qs(40), rad: qr(12) });

  // canopy: the four limbs that become the upper spokes, plus two that only live in 3D
  const LIMBS = [
    { tip: V(-1.7, 2.55, .55), c1: V(-.2, .6, .12), c2: V(.55, -.45, -.1), L: [60, 70], r: 14 },
    { tip: V(.15, 3.35, -.35), c1: V(.05, .7, -.05), c2: V(-.2, -.7, .1),  L: [100, 40], r: 15 },
    { tip: V(1.45, 2.85, -.55), c1: V(.25, .55, -.1), c2: V(-.45, -.5, .15), L: [160, 60], r: 14 },
    { tip: V(1.95, 1.9, .4),  c1: V(.4, .3, .1),   c2: V(-.6, -.15, 0),   L: [170, 110], r: 13 },
    { tip: V(-.55, 2.45, -1.55), c1: V(-.05, .5, -.2), c2: V(.2, -.5, .45) },
    { tip: V(.65, 2.25, 1.45),  c1: V(.1, .45, .2),   c2: V(-.2, -.45, -.45) },
  ];
  const mainLimbs = [];
  LIMBS.forEach((l, i) => {
    const P = [FORK.clone(), FORK.clone().add(l.c1), l.tip.clone().add(l.c2), l.tip.clone()];
    const g0 = .035 + i * .012;
    const b = add({ P, r0: .065, r1: .028, win: [g0, g0 + .075, l.L ? 2 : .625, l.L ? 3 : .67],
      depth: 1, kind: 1, bud: .095, segs: qs(36), rad: qr(10) });
    if (l.L){
      b.Q = spokeQ(logoAt(...l.L)); b.spokeR = SPOKE_R; b.logoR = l.r * SC; mainLimbs.push(b);
    }
    sprout(b, 2, 3, { up: .6, lenK: .5, bud: .062, maxDepth: 3 });
  });

  // roots: three main paths that bloom into the services, plus five that don't
  const ROOTS = [
    { tip: V(-2.25, -1.95, .75), c1: V(-.1, -.5, .05), c2: V(.75, .5, -.2), L: [50, 130], r: 14, win: [.18, .42] },
    { tip: V(.15, -2.8, -.5),    c1: V(.05, -.7, 0),   c2: V(-.2, .8, .1),  L: [100, 170], r: 16, win: [.19, .44] },
    { tip: V(2.25, -1.85, -.3),  c1: V(.15, -.45, -.05), c2: V(-.8, .4, 0), L: [150, 160], r: 15, win: [.2, .43] },
    { tip: V(-1.1, -1.4, -1.6),  c1: V(-.1, -.4, -.2), c2: V(.3, .4, .5),   win: [.21, .4] },
    { tip: V(1.0, -1.5, 1.7),    c1: V(.1, -.4, .2),   c2: V(-.3, .4, -.5), win: [.22, .41] },
    { tip: V(-.3, -1.9, 1.9),    c1: V(0, -.5, .2),    c2: V(.1, .5, -.6),  win: [.24, .42] },
    { tip: V(.6, -1.7, -1.9),    c1: V(0, -.5, -.2),   c2: V(-.2, .5, .6),  win: [.23, .41] },
    { tip: V(-2.3, -.9, -.4),    c1: V(-.3, -.2, 0),   c2: V(.7, .1, 0),    win: [.25, .4] },
  ];
  const mainRoots = [];
  ROOTS.forEach((r) => {
    const o = V(0, -.02, 0);
    const P = [o.clone(), o.clone().add(r.c1), r.tip.clone().add(r.c2), r.tip.clone()];
    const b = add({ P, r0: r.L ? .095 : .06, r1: r.L ? .032 : .016,
      win: [r.win[0], r.win[1], r.L ? 2 : .62 + R() * .03, r.L ? 3 : .67 + R() * .02],
      depth: 1, kind: 2, bud: r.L ? .06 : .03, segs: qs(40), rad: qr(10) });
    if (r.L){ b.Q = spokeQ(logoAt(...r.L)); b.spokeR = SPOKE_R; b.logoR = r.r * SC; mainRoots.push(b); }
    sprout(b, 2, r.L ? 4 : 3, { up: -.85, lenK: .42, bud: .026, maxDepth: 3 });
  });

  function sprout(parent, depth, count, o){
    for (let k = 0; k < count; k++){
      const t = lerp(.3, .86, (k + R() * .8) / count);
      const A = bez(parent.P, t);
      const tan = bezTan(parent.P, t);
      let out = V(A.x, 0, A.z);
      if (out.length() < .05) out = V(R() - .5, 0, R() - .5);
      out.normalize();
      const dir = tan.clone().multiplyScalar(.5)
        .addScaledVector(out, .75)
        .add(V(0, o.up, 0))
        .add(V(R() - .5, R() - .5, R() - .5).multiplyScalar(1.3))
        .normalize();
      const len = parent.len * o.lenK * (.75 + R() * .5);
      const P3 = A.clone().addScaledVector(dir, len);
      const P1 = A.clone().addScaledVector(tan, len * .28).addScaledVector(dir, len * .12);
      const P2 = P3.clone().addScaledVector(dir, -len * .38).add(V(0, (o.up > 0 ? -.12 : .1) * len, 0));
      const g0 = parent.win[0] + (parent.win[1] - parent.win[0]) * t * .85;
      const g1 = g0 + (depth === 2 ? .05 : .04) * (.8 + R() * .4);
      const d0 = .66 - depth * .03 + R() * .02;
      const rAt = lerp(parent.r0, parent.r1, t);
      const child = add({ P: [A, P1, P2, P3], r0: rAt * .72, r1: rAt * .26,
        win: [g0, g1, d0, d0 + .04], depth, kind: parent.kind,
        bud: depth === 2 ? o.bud : o.bud * .62, segs: qs(depth === 2 ? 22 : 14), rad: qr(depth === 2 ? 8 : 6) });
      if (depth < o.maxDepth) sprout(child, depth + 1, 2, { ...o, lenK: o.lenK * .95 });
    }
  }

  /* CPU mirror of the vertex shader's morph, for buds, service nodes, tags */
  const ST = { p: 0, straight: 0, pull: 0, resolve: 0 };
  const _c = [V(0, 0, 0), V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)];
  function growOf(b){
    const g = smooth(seg(ST.p, b.win[0], b.win[1]));
    const die = smooth(seg(ST.p, b.win[2], b.win[3]));
    return { g, die, gr: g * (1 - die) };
  }
  function contract(v){ return v.sub(HUB).multiplyScalar(1 - .42 * ST.pull).add(HUB); }
  function morphed(b){
    _c[0].copy(b.P[0]); _c[3].copy(b.P[3]);
    _c[1].copy(b.P[1]).lerp(new T3.Vector3().lerpVectors(b.P[0], b.P[3], 1 / 3), ST.straight);
    _c[2].copy(b.P[2]).lerp(new T3.Vector3().lerpVectors(b.P[0], b.P[3], 2 / 3), ST.straight);
    for (let i = 0; i < 4; i++){ contract(_c[i]); _c[i].lerp(b.Q[i], ST.resolve); }
    return _c;
  }

  /* ======================================================================
     RENDERER
     ====================================================================== */
  // throws when WebGL is unavailable — the caller keeps the static fallback
  const renderer = new T3.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(new T3.Color(.071, .067, .094), 1);
  const hdr = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const rt = new T3.WebGLRenderTarget(4, 4, {
    type: hdr ? T3.HalfFloatType : T3.UnsignedByteType,
    samples: renderer.capabilities.isWebGL2 ? Q.samples : 0,
    generateMipmaps: true,
    minFilter: T3.LinearMipmapLinearFilter,
    magFilter: T3.LinearFilter,
  });

  const scene = new T3.Scene();
  const camera = new T3.PerspectiveCamera(42, 1, .05, 80);
  const world = new T3.Group();
  scene.add(world);

  const U = {
    uP: { value: 0 }, uTime: { value: 0 }, uStraight: { value: 0 }, uPull: { value: 0 },
    uResolve: { value: 0 }, uHub: { value: HUB }, uPulse: { value: 0 }, uDpr: { value: 1 },
    uH: { value: 1 },
  };

  /* ---- the hero's plasma, as the far background ------------------------- */
  const plasma = new T3.Mesh(new T3.PlaneGeometry(2, 2), new T3.ShaderMaterial({
    uniforms: { uTime: U.uTime, uDim: { value: .5 }, uOpen: { value: 1 } },
    depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, .9999, 1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uDim, uOpen;
      float plasma(vec2 uv, float t){
        uv = (uv - .5) * (2.5 / 2.2) + .5;
        uv *= vec2(80., 24.); uv = ceil(uv); uv /= vec2(80., 24.);
        float f = .7 * sin(.5 * uv.x + t / 5.) + 3. * sin(1.6 * uv.y + t / 5.);
        f += sin(10. * (uv.y * sin(t / 2.) + uv.x * cos(t / 5.)) + t / 2.);
        float cx = uv.x + .5 * sin(t / 2.), cy = uv.y + .5 * cos(t / 4.);
        f += .4 * sin(sqrt(100. * cx * cx + 100. * cy * cy + 1.) + t);
        f += .9 * sin(sqrt(75. * cx * cx + 25. * cy * cy + 1.) + t);
        f -= 1.4 * sin(sqrt(256. * cx * cx + 25. * cy * cy + 1.) + t);
        f += .3 * sin(.5 * uv.y + uv.x + sin(t));
        return floor(3. * (.5 + .499 * sin(f * 1.07))) / 3.;
      }
      void main(){
        float s = plasma(vUv, uTime * .35);
        vec3 bg = vec3(.071, .067, .094);
        vec3 c = mix(bg, vec3(.43, .16, .85) * (.3 + s * .7), s * .82);
        c = mix(bg, c, uDim);
        // power-on, the hero's power-off run backwards: a line opens out of
        // the seed, then the picture opens up and down from the line
        float w = smoothstep(0., .4, uOpen), v = smoothstep(.35, 1., uOpen);
        vec2 d = abs(vUv - .5);
        float inside = step(d.x, .5 * w) * step(d.y, .5 * v * v + .002);
        float line = exp(-d.y * 260.) * step(d.x, .5 * w) * (1. - v) * step(.001, uOpen);
        gl_FragColor = vec4(mix(vec3(.02, .018, .03), c, inside) + vec3(.9, .7, 1.4) * line, 1.);
      }`,
  }));
  plasma.frustumCulled = false;
  plasma.renderOrder = -10;
  scene.add(plasma);

  /* ---- branches: one merged mesh, grown and morphed on the GPU ----------- */
  function buildTubes(){
    let nv = 0, ni = 0;
    branches.forEach((b) => { nv += (b.segs + 1) * b.rad; ni += b.segs * b.rad * 6; });
    const A = (n) => new Float32Array(nv * n);
    const pos = A(3), ta = A(2), ref = A(3), rr = A(4), win = A(4);
    const P = [A(3), A(3), A(3), A(3)], Q = [A(3), A(3), A(3), A(3)];
    const idx = new Uint32Array(ni);
    let v = 0, ii = 0;
    branches.forEach((b) => {
      const base = v;
      for (let i = 0; i <= b.segs; i++){
        for (let j = 0; j < b.rad; j++){
          ta[v * 2] = i / b.segs; ta[v * 2 + 1] = j / b.rad * Math.PI * 2;
          for (let k = 0; k < 4; k++){ b.P[k].toArray(P[k], v * 3); b.Q[k].toArray(Q[k], v * 3); }
          b.P[0].toArray(pos, v * 3);
          b.ref.toArray(ref, v * 3);
          rr[v * 4] = b.r0; rr[v * 4 + 1] = b.r1; rr[v * 4 + 2] = b.spokeR; rr[v * 4 + 3] = b.kind;
          win[v * 4] = b.win[0]; win[v * 4 + 1] = b.win[1]; win[v * 4 + 2] = b.win[2]; win[v * 4 + 3] = b.win[3];
          v++;
        }
      }
      for (let i = 0; i < b.segs; i++){
        for (let j = 0; j < b.rad; j++){
          const a = base + i * b.rad + j, bb = base + i * b.rad + (j + 1) % b.rad;
          const c = a + b.rad, d = bb + b.rad;
          idx[ii++] = a; idx[ii++] = c; idx[ii++] = bb;
          idx[ii++] = bb; idx[ii++] = c; idx[ii++] = d;
        }
      }
    });
    const g = new T3.BufferGeometry();
    g.setAttribute('position', new T3.BufferAttribute(pos, 3));
    g.setAttribute('aTA', new T3.BufferAttribute(ta, 2));
    g.setAttribute('aRef', new T3.BufferAttribute(ref, 3));
    g.setAttribute('aR', new T3.BufferAttribute(rr, 4));
    g.setAttribute('aWin', new T3.BufferAttribute(win, 4));
    for (let k = 0; k < 4; k++){
      g.setAttribute('p' + k, new T3.BufferAttribute(P[k], 3));
      g.setAttribute('q' + k, new T3.BufferAttribute(Q[k], 3));
    }
    g.setIndex(new T3.BufferAttribute(idx, 1));
    return g;
  }

  const MORPH_GLSL = `
    uniform float uP, uStraight, uPull, uResolve;
    uniform vec3 uHub;
    vec3 bz(vec3 a, vec3 b, vec3 c, vec3 d, float t){ float u = 1. - t; return u*u*u*a + 3.*u*u*t*b + 3.*u*t*t*c + t*t*t*d; }
    vec3 bzd(vec3 a, vec3 b, vec3 c, vec3 d, float t){ float u = 1. - t; return 3.*u*u*(b-a) + 6.*u*t*(c-b) + 3.*t*t*(d-c); }
    vec3 contractV(vec3 v){ return uHub + (v - uHub) * (1. - .42 * uPull); }
    float sm(float t){ return t*t*(3.-2.*t); }
  `;

  const tubeMat = new T3.ShaderMaterial({
    uniforms: { ...U, uCore: { value: new T3.Color(.3, .12, .72) }, uRim: { value: new T3.Color(1.05, .82, 1.6) } },
    side: T3.DoubleSide,
    vertexShader: `
      attribute vec2 aTA; attribute vec3 aRef; attribute vec4 aR, aWin;
      attribute vec3 p0, p1, p2, p3, q0, q1, q2, q3;
      varying vec3 vN, vV; varying float vT, vKind;
      ${MORPH_GLSL}
      void main(){
        float g = sm(clamp((uP - aWin.x) / (aWin.y - aWin.x), 0., 1.));
        float die = sm(clamp((uP - aWin.z) / (aWin.w - aWin.z), 0., 1.));
        float gr = g * (1. - die);
        vec3 a = p0, d = p3;
        vec3 b = mix(p1, mix(p0, p3, 1./3.), uStraight);
        vec3 c = mix(p2, mix(p0, p3, 2./3.), uStraight);
        a = mix(contractV(a), q0, uResolve); b = mix(contractV(b), q1, uResolve);
        c = mix(contractV(c), q2, uResolve); d = mix(contractV(d), q3, uResolve);
        float t = aTA.x * gr;
        vec3 C = bz(a, b, c, d, t);
        vec3 T = normalize(bzd(a, b, c, d, t) + vec3(1e-5));
        vec3 N = normalize(cross(T, aRef));
        vec3 B = cross(T, N);
        float r = mix(aR.x, aR.y, t);
        r *= clamp((gr - t) * 16. + .2, 0., 1.);
        r = mix(r, aR.z, uResolve);
        if (gr < .0005) r = 0.;
        vec3 n = N * cos(aTA.y) + B * sin(aTA.y);
        vec4 w = modelMatrix * vec4(C + n * r, 1.);
        vN = normalize(mat3(modelMatrix) * n);
        vV = cameraPosition - w.xyz;
        vT = aTA.x; vKind = aR.w;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uCore, uRim; uniform float uResolve, uPulse;
      varying vec3 vN, vV; varying float vT, vKind;
      void main(){
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        float f = pow(1. - abs(dot(n, normalize(vV))), 2.2);
        vec3 core = mix(uCore, uRim * .62, uResolve * .85);
        vec3 col = mix(core, uRim * 1.7, f) + uRim * .08;
        col *= 1. + uPulse * 1.6;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const tubes = new T3.Mesh(buildTubes(), tubeMat);
  tubes.frustumCulled = false;
  world.add(tubes);

  /* ---- glowing orbs: buds, hub, service cores --------------------------- */
  const orbMat = (core, rim, k = 1) => new T3.ShaderMaterial({
    uniforms: { uCore: { value: core }, uRim: { value: rim }, uK: { value: k }, uPulse: U.uPulse },
    vertexShader: `
      varying vec3 vN, vV;
      void main(){
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
        #endif
        vec4 w = m * vec4(position, 1.);
        vN = normalize(mat3(m) * normal); vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 uCore, uRim; uniform float uK, uPulse;
      varying vec3 vN, vV;
      void main(){
        float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 1.6);
        vec3 col = mix(uCore, uRim, f) * uK * (1. + uPulse * 1.4);
        gl_FragColor = vec4(col, 1.);
      }`,
  });

  const budBranches = branches.filter((b) => b.bud > 0);
  const buds = new T3.InstancedMesh(new T3.IcosahedronGeometry(1, Q.orb),
    orbMat(new T3.Color(2.2, 1.9, 2.8), new T3.Color(.75, .42, 1.6)), budBranches.length + 1);
  buds.frustumCulled = false;
  world.add(buds);

  const hubOrb = new T3.Mesh(new T3.IcosahedronGeometry(1, Q.orb + 1), orbMat(new T3.Color(2.4, 2.1, 3), new T3.Color(.8, .45, 1.7)));
  world.add(hubOrb);

  // the mark's one outer link, top node → top-right node
  const linkA = logoAt(100, 40), linkB = logoAt(160, 60);
  const linkGeo = new T3.CylinderGeometry(1, 1, 1, 20, 1, true); linkGeo.translate(0, .5, 0);
  const link = new T3.Mesh(linkGeo, orbMat(new T3.Color(.62, .46, 1.05), new T3.Color(1.05, .82, 1.6)));
  link.position.copy(linkA);
  link.quaternion.setFromUnitVectors(V(0, 1, 0), linkB.clone().sub(linkA).normalize());
  world.add(link);

  // settle shockwave
  const wave = new T3.Mesh(new T3.RingGeometry(.97, 1, 160),
    new T3.MeshBasicMaterial({ color: new T3.Color(1.6, 1.1, 2.6), transparent: true, blending: T3.AdditiveBlending, depthWrite: false }));
  wave.position.copy(HUB);
  world.add(wave);

  /* ---- the three service nodes ------------------------------------------ */
  const GLYPHS = {
    code: [[[-.05, .12], [-.17, 0], [-.05, -.12]], [[.05, .12], [.17, 0], [.05, -.12]]],
    app: [(() => {
      const pts = [], h = .12, c = .045;
      for (let q = 0; q < 4; q++){
        const cx = (q === 0 || q === 3 ? 1 : -1) * (h - c), cy = (q < 2 ? 1 : -1) * (h - c);
        for (let s = 0; s <= 4; s++){ const a = q * Math.PI / 2 + s / 4 * Math.PI / 2; pts.push([cx + Math.cos(a) * c, cy + Math.sin(a) * c]); }
      }
      pts.push(pts[0]); return pts;
    })()],
    ai: [
      Array.from({ length: 7 }, (_, k) => { const a = Math.PI / 6 + k * Math.PI / 3; return [Math.cos(a) * .1, Math.sin(a) * .1]; }),
      ...[Math.PI / 2, -Math.PI / 6, Math.PI * 7 / 6].map((a) => [[Math.cos(a) * .14, Math.sin(a) * .14], [Math.cos(a) * .2, Math.sin(a) * .2]]),
    ],
  };
  const glyphMat = new T3.MeshBasicMaterial({ color: new T3.Color(2.2, 1.85, 3) });
  const services = mainRoots.map((b, i) => {
    const g = new T3.Group();
    const shell = new T3.LineSegments(new T3.EdgesGeometry(new T3.IcosahedronGeometry(.36, 1)),
      new T3.LineBasicMaterial({ color: new T3.Color(.9, .62, 1.7), transparent: true, opacity: .85, blending: T3.AdditiveBlending, depthWrite: false }));
    const core = new T3.Mesh(new T3.IcosahedronGeometry(.25, 3), orbMat(new T3.Color(.05, .03, .1), new T3.Color(.9, .55, 1.8)));
    const ring = new T3.Mesh(new T3.TorusGeometry(.5, .006, 6, 120),
      new T3.MeshBasicMaterial({ color: new T3.Color(1.2, .8, 2.2), transparent: true, blending: T3.AdditiveBlending, depthWrite: false }));
    ring.rotation.set(1.1 + i * .3, .4 * i, 0);
    const glyph = new T3.Group();
    GLYPHS[['code', 'app', 'ai'][i]].forEach((line) => {
      const path = new T3.CurvePath();
      for (let k = 0; k < line.length - 1; k++){
        path.add(new T3.LineCurve3(V(line[k][0], line[k][1], 0), V(line[k + 1][0], line[k + 1][1], 0)));
      }
      glyph.add(new T3.Mesh(new T3.TubeGeometry(path, line.length * 8, .011, 6, false), glyphMat));
    });
    g.add(core, shell, ring, glyph);
    world.add(g);
    return { g, shell, ring, glyph, branch: b };
  });

  /* ---- particles --------------------------------------------------------- */
  const dotFrag = `
    varying float vA; varying vec3 vC;
    void main(){
      vec2 c = gl_PointCoord - .5; float d = dot(c, c);
      float a = smoothstep(.25, 0., d);
      gl_FragColor = vec4(vC * a * vA, 1.);
    }`;
  const pointMat = (vertexShader, extra = {}) => new T3.ShaderMaterial({
    uniforms: { ...U, ...extra }, vertexShader, fragmentShader: dotFrag,
    transparent: true, depthWrite: false, blending: T3.AdditiveBlending,
  });
  const pointsOf = (attrs, count, mat) => {
    const g = new T3.BufferGeometry();
    g.setAttribute('position', new T3.BufferAttribute(new Float32Array(count * 3), 3));
    Object.entries(attrs).forEach(([k, [arr, n]]) => g.setAttribute(k, new T3.BufferAttribute(arr, n)));
    const pts = new T3.Points(g, mat);
    pts.frustumCulled = false;
    return pts;
  };
  const SIZE_GLSL = `gl_PointSize = size * uDpr * uH / (-mv.z * 900.);`;

  // dust in the tube
  {
    const n = Math.round(2200 * Q.parts), a = new Float32Array(n * 3), r = new Float32Array(n);
    for (let i = 0; i < n; i++){
      a[i * 3] = (R() - .5) * 16; a[i * 3 + 1] = -5 + R() * 11; a[i * 3 + 2] = (R() - .5) * 14 - 1;
      r[i] = R();
    }
    world.add(pointsOf({ aHome: [a, 3], aRnd: [r, 1] }, n, pointMat(`
      uniform float uTime, uDpr, uH, uResolve; attribute vec3 aHome; attribute float aRnd;
      varying float vA; varying vec3 vC;
      void main(){
        vec3 p = aHome + vec3(sin(uTime * .07 + aRnd * 40.) * .4, sin(uTime * .05 + aRnd * 17.) * .5, cos(uTime * .06 + aRnd * 23.) * .4);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float size = 18. + aRnd * 26.;
        ${SIZE_GLSL}
        gl_Position = projectionMatrix * mv;
        vA = (.25 + .75 * pow(.5 + .5 * sin(uTime * (.6 + aRnd) + aRnd * 60.), 3.)) * .5 * (1. - uResolve * .6);
        vC = mix(vec3(.55, .35, 1.), vec3(1., .9, 1.2), step(.93, aRnd));
      }`)));
  }

  // leaf clusters at every canopy tip — they dissolve into the core
  {
    const tips = branches.filter((b) => b.kind === 1 && b.depth >= 1);
    const per = Math.round(42 * Q.parts), n = tips.length * per;
    const anc = new Float32Array(n * 3), off = new Float32Array(n * 3), win = new Float32Array(n * 4), rnd = new Float32Array(n);
    let i = 0;
    tips.forEach((b) => {
      const s = b.depth === 1 ? .3 : b.depth === 2 ? .22 : .16;
      for (let k = 0; k < per; k++, i++){
        b.P[3].toArray(anc, i * 3);
        const v = V(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(Math.pow(R(), .6) * s);
        v.y *= .8;
        v.toArray(off, i * 3);
        win[i * 4] = b.win[1] - .01; win[i * 4 + 1] = b.win[1] + .035 + R() * .02;
        win[i * 4 + 2] = .565 + R() * .07; win[i * 4 + 3] = .07 + R() * .05;
        rnd[i] = R();
      }
    });
    world.add(pointsOf({ aAnc: [anc, 3], aOff: [off, 3], aWin: [win, 4], aRnd: [rnd, 1] }, n, pointMat(`
      uniform float uP, uTime, uDpr, uH, uPull; uniform vec3 uHub;
      attribute vec3 aAnc, aOff; attribute vec4 aWin; attribute float aRnd;
      varying float vA; varying vec3 vC;
      void main(){
        float show = smoothstep(aWin.x, aWin.y, uP);
        float k = clamp((uP - aWin.z) / aWin.w, 0., 1.); k = k * k * (3. - 2. * k);
        vec3 home = aAnc + aOff * (.85 + .15 * sin(uTime * 1.3 + aRnd * 20.));
        vec3 p = mix(home, uHub, k);
        float sw = sin(k * 3.1416) * (.35 + aRnd * .6);
        float an = aRnd * 6.2832 + k * 4.;
        p += vec3(cos(an), sin(an * .7) * .5, sin(an)) * sw;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float size = (26. + aRnd * 40.) * (1. + k * .6);
        ${SIZE_GLSL}
        gl_Position = projectionMatrix * mv;
        vA = show * (1. - smoothstep(.85, 1., k)) * (.55 + .45 * sin(uTime * 2. + aRnd * 30.));
        vC = mix(vec3(.62, .32, 1.35), vec3(1.5, 1.2, 2.), k + step(.9, aRnd) * .6);
      }`)));
  }

  // sap: pulses running down the canopy, the trunk and the roots
  {
    const lines = branches.filter((b) => b.depth <= 1);
    const per = LITE ? 8 : 12, n = lines.length * per;
    const P = [0, 1, 2, 3].map(() => new Float32Array(n * 3));
    const ph = new Float32Array(n * 4), win = new Float32Array(n * 4);
    let i = 0;
    lines.forEach((b) => {
      for (let k = 0; k < per; k++, i++){
        for (let q = 0; q < 4; q++) b.P[q].toArray(P[q], i * 3);
        ph[i * 4] = k / per + R() * .05;
        ph[i * 4 + 1] = .18 + R() * .1;
        ph[i * 4 + 2] = b.kind === 2 ? 1 : -1;
        ph[i * 4 + 3] = R();
        win.set(b.win, i * 4);
      }
    });
    world.add(pointsOf({ p0: [P[0], 3], p1: [P[1], 3], p2: [P[2], 3], p3: [P[3], 3], aPh: [ph, 4], aWin: [win, 4] }, n, pointMat(`
      uniform float uTime, uDpr, uH;
      attribute vec3 p0, p1, p2, p3; attribute vec4 aPh, aWin;
      varying float vA; varying vec3 vC;
      ${MORPH_GLSL}
      void main(){
        float g = sm(clamp((uP - aWin.x) / (aWin.y - aWin.x), 0., 1.));
        float t = fract(aPh.x + uTime * aPh.y);
        if (aPh.z < 0.) t = 1. - t;
        vec3 b = mix(p1, mix(p0, p3, 1./3.), uStraight), c = mix(p2, mix(p0, p3, 2./3.), uStraight);
        vec3 p = bz(contractV(p0), contractV(b), contractV(c), contractV(p3), t * g);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float size = 60. + aPh.w * 50.;
        ${SIZE_GLSL}
        gl_Position = projectionMatrix * mv;
        float on = smoothstep(.44, .5, uP) * (1. - smoothstep(.66, .72, uP));
        vA = on * sin(fract(aPh.x + uTime * aPh.y) * 3.1416) * g;
        vC = vec3(1.6, 1.25, 2.4);
      }`)));
  }

  /* ---- the ground: a phosphor grid that splits when the roots break it --- */
  const ground = new T3.Mesh(new T3.PlaneGeometry(40, 40, 1, 1), new T3.ShaderMaterial({
    uniforms: { ...U, uCrack: { value: 0 }, uRipple: { value: 0 }, uRippleA: { value: 0 }, uFade: { value: 1 } },
    transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide,
    extensions: { derivatives: true },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uCrack, uRipple, uRippleA, uFade, uTime;
      varying vec3 vW;
      void main(){
        vec2 g = vW.xz / .5;
        vec2 gd = abs(fract(g - .5) - .5) / fwidth(g);
        float line = 1. - min(min(gd.x, gd.y), 1.);
        float r = length(vW.xz);
        float fade = exp(-r * r * .03);
        float a = atan(vW.z, vW.x);
        float crack = smoothstep(.06, 0., abs(sin(a * 3. + sin(r * 5.) * .5 + .4))) * step(r, uCrack) * exp(-r * .5);
        float ring = exp(-pow((r - uRipple) * 7., 2.)) * uRippleA;
        float base = exp(-r * r * 5.);
        vec3 col = vec3(.5, .3, 1.) * line * .32 * fade
                 + vec3(1.4, 1., 2.4) * (crack * 1.3 + ring * fade * 1.2)
                 + vec3(.9, .6, 1.6) * base * .35;
        gl_FragColor = vec4(col * uFade, 1.);
      }`,
  }));
  ground.rotation.x = -Math.PI / 2;
  world.add(ground);

  /* ======================================================================
     POST — the CRT glass: mip-chain bloom, fringing, scanlines, curvature
     ====================================================================== */
  const post = new T3.Mesh(new T3.PlaneGeometry(2, 2), new T3.ShaderMaterial({
    uniforms: { tScene: { value: rt.texture }, uTime: U.uTime, uAberr: { value: .002 }, uGlitch: { value: 0 }, uFlash: { value: 0 }, uBloom: { value: .6 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tScene; uniform float uTime, uAberr, uGlitch, uFlash, uBloom;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 c = vUv * 2. - 1.;
        c *= 1. + dot(c, c) * .03;
        vec2 uv = c * .5 + .5;
        if (uGlitch > 0.){
          float row = floor(uv.y * 44.); float h = hash(vec2(row, floor(uTime * 20.)));
          uv.x += (h - .5) * .035 * uGlitch * step(.82, h);
        }
        vec2 d = uv - .5;
        float ab = uAberr * (.5 + 3.5 * dot(d, d)) + uGlitch * .006;
        vec3 col;
        col.r = texture2D(tScene, uv + d * ab * 4.).r;
        col.g = texture2D(tScene, uv).g;
        col.b = texture2D(tScene, uv - d * ab * 4.).b;
        vec3 bl = texture2D(tScene, uv, 2.).rgb * .3 + texture2D(tScene, uv, 3.5).rgb * .45
                + texture2D(tScene, uv, 5.).rgb * .6 + texture2D(tScene, uv, 6.5).rgb * .55;
        col += bl * uBloom;
        col = 1. - exp(-col * 1.08);
        col *= .86 + .14 * sin(gl_FragCoord.y * 1.5708);
        col += (hash(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .04;
        col *= mix(.3, 1., smoothstep(1.3, .35, length(d * vec2(1.05, 1.))));
        vec2 e = step(vec2(0.), uv) * step(uv, vec2(1.));
        col *= e.x * e.y;
        col += uFlash * vec3(.45, .3, .8);
        gl_FragColor = vec4(col, 1.);
      }`,
    depthTest: false, depthWrite: false,
  }));
  post.frustumCulled = false;
  const postScene = new T3.Scene();
  postScene.add(post);
  const postCam = new T3.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ======================================================================
     CAMERA — one continuous flight, keyed to scroll
     ====================================================================== */
  const CAM = [
    // opens dead on the seed, where the hero's dot went out
    { p: 0,   pos: [0, .25, 4.2],    at: [0, 0, 0] },
    { p: .055, pos: [0, .3, 4.3],    at: [0, .05, 0] },
    { p: .08, pos: [1.7, 1.9, 5.6],  at: [0, 1.3, 0] },
    { p: .17, pos: [4.2, 2.8, 4.4],  at: [0, 1.6, 0] },
    { p: .25, pos: [3.4, .55, 5.0],  at: [0, .15, 0] },
    { p: .33, pos: [1.9, -1.25, 5.8], at: [0, -.9, 0] },
    { p: .43, pos: [-1.8, -1.7, 7.9], at: [-1.65, -1.45, 0] },
    { p: .53, pos: [-4.8, -1.1, 5.2], at: [-.3, -1.3, 1.1] },
    { p: .63, pos: [-3.6, 1.7, 6.8], at: [0, .15, 0] },
    { p: .73, pos: [-1.3, .9, 8.3],  at: [0, .3, 0] },
    { p: .84, pos: [0, .2, 7.2],     at: [0, .1, 0] },
    { p: .94, pos: [0, -.1, 6.7],    at: [0, -.1, 0] },
    { p: 1,   pos: [0, -.1, 6.5],    at: [0, -.1, 0] },
  ];
  const cr = (a, b, c, d, t) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  function camAt(p, key){
    let i = 0;
    while (i < CAM.length - 2 && p > CAM[i + 1].p) i++;
    const k0 = CAM[Math.max(0, i - 1)], k1 = CAM[i], k2 = CAM[i + 1], k3 = CAM[Math.min(CAM.length - 1, i + 2)];
    const u = seg(p, k1.p, k2.p);
    return [0, 1, 2].map((j) => cr(k0[key][j], k1[key][j], k2[key][j], k3[key][j], u));
  }

  /* ======================================================================
     FRAME
     ====================================================================== */
  const dummy = new T3.Object3D();
  const tmp = new T3.Vector3();
  const tagEls = [...stage.querySelectorAll('.film-tag')];
  const beats = [...stage.querySelectorAll('.film-beat')];
  const word = stage.querySelector('.film-word');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e) => { pointer.tx = e.clientX / innerWidth - .5; pointer.ty = e.clientY / innerHeight - .5; };
  if (!REDUCED) addEventListener('pointermove', onPointer, { passive: true });

  let W = 1, H = 1;
  function resize(){
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const dpr = Math.min(devicePixelRatio || 1, Q.dpr) * renderScale;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    rt.setSize(Math.round(W * dpr), Math.round(H * dpr));
    camera.aspect = W / H;
    // keep the whole tree in frame on a portrait screen
    camera.fov = W / H >= 1 ? 42 : 2 * Math.atan(Math.tan(21 * Math.PI / 180) / Math.max(.5, W / H) * .78) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    U.uDpr.value = dpr;
    U.uH.value = H;
  }
  const resizeObserver = new ResizeObserver(() => { resize(); if (REDUCED) renderFrame(); });
  resizeObserver.observe(stage);

  function update(p, time){
    ST.p = p;
    ST.pull = ease(seg(p, .6, .8));
    ST.straight = ease(seg(p, .66, .8));
    ST.resolve = ease(seg(p, .8, .93));
    const pulse = bump(p, .925, .985);

    U.uP.value = p; U.uTime.value = time;
    U.uPull.value = ST.pull; U.uStraight.value = ST.straight; U.uResolve.value = ST.resolve;
    U.uPulse.value = pulse * .8;

    // buds, with the seed at the base
    let n = 0;
    budBranches.forEach((b) => {
      const { g, die, gr } = growOf(b);
      const C = morphed(b);
      bez(C, gr, tmp);
      let r = b.bud * smooth(seg(g, .82, 1)) * (1 - die);
      if (b.logoR) r = lerp(r, b.logoR, ST.resolve);
      dummy.position.copy(tmp);
      dummy.scale.setScalar(Math.max(r, 1e-5));
      dummy.updateMatrix();
      buds.setMatrixAt(n++, dummy.matrix);
    });
    dummy.position.set(0, 0, 0);
    dummy.scale.setScalar(Math.max(1e-5, (.09 + .02 * Math.sin(time * 2.4)) * (1 - seg(p, .18, .3))));
    dummy.updateMatrix();
    buds.setMatrixAt(n++, dummy.matrix);
    buds.instanceMatrix.needsUpdate = true;

    // the core the dissolve feeds, which becomes the hub
    const hubR = Math.max(.15 * ease(seg(p, .58, .76)), 18 * SC * ease(seg(p, .8, .92)));
    hubOrb.position.copy(HUB);
    hubOrb.scale.setScalar(Math.max(1e-5, hubR * (1 + .06 * Math.sin(time * 3) * (1 - ST.resolve))));

    const lk = ease(seg(p, .87, .96));
    link.scale.set(SPOKE_R, Math.max(1e-5, linkA.distanceTo(linkB) * lk), SPOKE_R);
    link.visible = lk > 0;

    const wk = seg(p, .925, .995);
    wave.visible = wk > 0 && wk < 1;
    wave.scale.setScalar(.4 + ease(wk) * 5.5);
    wave.material.opacity = (1 - wk) * .9;

    // service nodes bloom at the root tips, then give way to the mark
    services.forEach((s, i) => {
      const b = s.branch;
      const { gr } = growOf(b);
      bez(morphed(b), gr, tmp);
      s.g.position.copy(tmp);
      const k = easeOutBack(seg(p, .42 + i * .018, .5 + i * .018)) * (1 - ease(seg(p, .6, .67)));
      s.g.scale.setScalar(Math.max(1e-5, k));
      s.g.visible = k > .001;
      s.shell.rotation.set(time * .21 + i, time * .33, 0);
      s.ring.rotation.z = time * .5 * (i % 2 ? -1 : 1);
      s.glyph.quaternion.copy(camera.quaternion);
    });

    // ground
    const gm = ground.material.uniforms;
    gm.uCrack.value = ease(seg(p, .15, .22)) * 2.6;
    gm.uRipple.value = seg(p, .16, .32) * 9;
    gm.uRippleA.value = 1 - seg(p, .16, .32);
    gm.uFade.value = Math.min(1 - seg(p, .6, .74), seg(p, .03, .1));
    ground.visible = gm.uFade.value > 0;

    plasma.material.uniforms.uDim.value = lerp(.75, .32, ST.resolve);
    plasma.material.uniforms.uOpen.value = ease(seg(p, 0, .07));

    // the mark turns once it has settled, so it reads as an object
    world.rotation.y = Math.sin(time * .45) * .32 * ease(seg(p, .95, 1));

    // camera flight + a little parallax from the pointer
    pointer.x += (pointer.tx - pointer.x) * .05;
    pointer.y += (pointer.ty - pointer.y) * .05;
    const cp = camAt(p, 'pos'), ca = camAt(p, 'at');
    const drift = REDUCED ? 0 : 1;
    camera.position.set(cp[0] + pointer.x * .6 * drift + Math.sin(time * .2) * .15 * drift * (1 - ST.resolve),
                        cp[1] - pointer.y * .4 * drift, cp[2]);
    camera.lookAt(ca[0], ca[1], ca[2]);

    // glass
    const pm = post.material.uniforms;
    pm.uGlitch.value = REDUCED ? 0 : bump(p, .165, .2) * .9 + bump(p, .925, .945) * .6;
    pm.uAberr.value = .0022 + bump(p, .6, .78) * .004;
    pm.uFlash.value = bump(p, .925, .96) * .35;
    pm.uBloom.value = .6 + pulse * .6;

    placeHtml(p);
  }

  function placeHtml(p){
    beats.forEach((b) => {
      const a = +b.dataset.in, z = +b.dataset.out;
      const o = a === 0 ? 1 - seg(p, z - .03, z) : Math.min(seg(p, a, a + .03), 1 - seg(p, z - .03, z));
      b.style.opacity = o;
      b.style.visibility = o > 0 ? 'visible' : 'hidden';
      b.style.transform = `translateY(${(1 - o) * 14}px)`;
    });

    services.forEach((s, i) => {
      const el = tagEls[i];
      const a = seg(p, .45 + i * .018, .5 + i * .018) * (1 - seg(p, .56, .6));
      el.style.opacity = a;
      el.style.visibility = a > 0 ? 'visible' : 'hidden';
      if (a <= 0) return;
      s.g.getWorldPosition(tmp);
      const top = tmp.clone().add(V(0, -.42, 0)).project(camera);
      el.style.transform = `translate(${(top.x * .5 + .5) * W}px, ${(-top.y * .5 + .5) * H}px) translateX(-50%)`;
    });

    const wa = ease(seg(p, .9, .97));
    if (word){
      word.style.opacity = wa;
      word.style.visibility = wa > 0 ? 'visible' : 'hidden';
      word.style.transform = `translateX(-50%) translateY(${(1 - wa) * 16}px)`;
    }
  }

  /* ======================================================================
     LOOP — only while the stage is on screen
     ====================================================================== */
  function renderFrame(){
    update(progress, REDUCED ? 8 : time);
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  let progress = 0, time = 0, last = performance.now(), raf = 0, visible = false;
  let avg = 1 / 60, since = 0, calm = 0, warmUp = 0;

  function govern(dt){
    // skip the first seconds on screen (shader compiles, first uploads)
    if ((warmUp += dt) < 2.5) return;
    avg += (dt - avg) * .08;
    if ((since += dt) < 1) return;
    since = 0;
    if (avg > 1 / 45 && renderScale > .5){
      renderScale = Math.max(.5, renderScale * .85); calm = 0; resize();
    } else if (avg < 1 / 57 && renderScale < 1 && ++calm >= 4){
      renderScale = Math.min(1, renderScale / .85); calm = 0; resize();
    }
  }

  function loop(now){
    raf = requestAnimationFrame(loop);
    const dt = (now - last) / 1000;
    last = now;
    if (!visible || document.hidden) return;
    time += Math.min(dt, .05);
    govern(Math.min(dt, .2));
    renderFrame();
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && REDUCED) renderFrame();
  });
  visibilityObserver.observe(stage);

  resize();
  if (!REDUCED) raf = requestAnimationFrame(loop);

  return {
    canvas,
    setProgress(p){
      progress = clamp01(p);
      if (REDUCED) renderFrame();
    },
    // compile every program and draw one frame, so none of that lands on
    // the first scroll into the section
    warm(){
      renderer.compile(scene, camera);
      renderFrame();
    },
    destroy(){
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      removeEventListener('pointermove', onPointer);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      rt.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

global.createRootFilm = createRootFilm;

})(window);
