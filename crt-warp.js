/* ==========================================================================
   OMENTIX TECH — CRT Warp
   Vanilla port of React Bits' <CRTWarp /> background
   (reactbits.dev/backgrounds/crt-warp · dependency: three).

   The shaders are upstream's, verbatim. Only the React wrapper is replaced:
   props become an options object, the prop effect becomes set(), unmount
   becomes destroy(). Two additions the site needs:
     · colours accept any CSS colour — including the oklch() tokens in
       style.css — so the background is inked from the design system
     · `eventTarget` lets the pointer warp listen on a parent, because here
       the canvas sits underneath the hero's content and never gets the events
   ========================================================================== */

import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uBackgroundColor;
uniform float uCurvature;
uniform float uScanlineStrength;
uniform float uScanlineFrequency;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uBloom;
uniform float uBloomRadius;
uniform float uNoise;
uniform float uVignette;
uniform float uBrightness;
uniform float uPixelation;
uniform float uRgbShift;
uniform vec2 uPointer;
uniform float uMouseStrength;
uniform float uMouseReact;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 crtCurve(vec2 uv, float radius) {
  vec2 p = (uv - 0.5) * 2.0;
  float safeRadius = max(radius, 1.415);
  float cornerScale = safeRadius / sqrt(max(safeRadius * safeRadius - 2.0, 0.001));
  p = safeRadius * p / sqrt(max(safeRadius * safeRadius - dot(p, p), 0.001));
  p /= cornerScale;
  return p * 0.5 + 0.5;
}

float referencePlasma(vec2 uv, float t) {
  float frequencyScale = max(uWaveFrequency / 2.2, 0.001);
  uv = (uv - 0.5) * frequencyScale + 0.5;

  float scanline = 0.5 - 0.5 * cos(uv.y * 3.14159265 * uScanlineFrequency);
  scanline = mix(1.0, scanline, uScanlineStrength);

  uv *= vec2(80.0, 24.0);
  uv = ceil(uv);
  uv /= vec2(80.0, 24.0);

  float amplitude = uWaveAmplitude / 0.28;
  float field = 0.0;
  field += 0.7 * sin(0.5 * uv.x + t / 5.0);
  field += 3.0 * sin(1.6 * uv.y + t / 5.0);
  field += sin(10.0 * (uv.y * sin(t / 2.0) + uv.x * cos(t / 5.0)) + t / 2.0);

  float cx = uv.x + 0.5 * sin(t / 2.0);
  float cy = uv.y + 0.5 * cos(t / 4.0);
  field += 0.4 * sin(sqrt(100.0 * cx * cx + 100.0 * cy * cy + 1.0) + t);
  field += 0.9 * sin(sqrt(75.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  field -= 1.4 * sin(sqrt(256.0 * cx * cx + 25.0 * cy * cy + 1.0) + t);
  field += 0.3 * sin(0.5 * uv.y + uv.x + sin(t));

  return scanline * floor(3.0 * (0.5 + 0.499 * sin(field * amplitude))) / 3.0;
}

void main() {
  vec2 uv = vUv;
  if (uPixelation > 1.001) {
    vec2 cells = max(uResolution / uPixelation, vec2(1.0));
    uv = (floor(uv * cells) + 0.5) / cells;
  }

  float curveRadius = 1.1 + 0.42 / max(uCurvature, 0.001);
  if (uMouseReact > 0.5) {
    curveRadius *= exp(-uPointer.y * uMouseStrength * 0.4);
  }
  vec2 curvedUv = crtCurve(uv, curveRadius);
  if (uMouseReact > 0.5) {
    curvedUv.x -= uPointer.x * uMouseStrength * 0.035;
  }

  float signal = referencePlasma(curvedUv, uTime);
  float radius = 0.01 * uBloomRadius;
  float glow = signal * 0.2;
  glow += referencePlasma(curvedUv + vec2(radius, 0.0), uTime) * 0.12;
  glow += referencePlasma(curvedUv - vec2(radius, 0.0), uTime) * 0.12;
  glow += referencePlasma(curvedUv + vec2(0.0, radius), uTime) * 0.12;
  glow += referencePlasma(curvedUv - vec2(0.0, radius), uTime) * 0.12;
  glow += referencePlasma(curvedUv + vec2(radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv - vec2(radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv + vec2(radius, -radius), uTime) * 0.08;
  glow += referencePlasma(curvedUv + vec2(-radius, radius), uTime) * 0.08;

  float redSignal = referencePlasma(curvedUv + vec2(uRgbShift, 0.0), uTime);
  float blueSignal = referencePlasma(curvedUv - vec2(uRgbShift, 0.0), uTime);
  vec3 channelSignal = vec3(redSignal, signal, blueSignal);
  vec3 waveColor = uColor * (0.3 + signal * 0.7 + glow * uBloom * 0.65);
  waveColor += (channelSignal - signal) * 0.42;

  float edge = clamp(1.0 - dot(vUv - 0.5, vUv - 0.5) * 2.0, 0.0, 1.0);
  float edgeFade = mix(1.0, smoothstep(0.0, 1.0, edge), uVignette);
  float waveMask = clamp(signal * 0.82 + glow * 0.52, 0.0, 1.0) * edgeFade;

  float grain = hash21(gl_FragCoord.xy + vec2(fract(uTime) * 173.0));
  waveColor = max(waveColor * uBrightness, vec3(0.0));
  vec3 color = mix(uBackgroundColor, waveColor, waveMask);
  color += (grain - 0.5) * uNoise;
  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

export const DEFAULT_PROPS = {
  color: '#c755f7',
  backgroundColor: '#05010a',
  speed: 0.5,
  curvature: 0.25,
  scanlineStrength: 0.25,
  scanlineFrequency: 200,
  waveAmplitude: 0.3,
  waveFrequency: 2.5,
  bloom: 1.5,
  bloomRadius: 1,
  noise: 0.1,
  vignette: 0,
  brightness: 1.25,
  pixelation: 1,
  rgbShift: 0.015,
  mouseReact: true,
  mouseStrength: 0.5,
  dpr: 1,
  fps: 30,
  paused: false,
};

/* Resolve any colour the browser can paint — hex, rgb(), oklch() — to sRGB
   0–1 by filling one pixel and reading it back. */
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

function toRGB(css){
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';   // an unparseable colour leaves this in place
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/* A ShaderMaterial writes gl_FragColor straight to the canvas with no output
   transform, so the uniform has to carry the sRGB numbers untouched. Letting
   three convert them to linear renders every colour a shade darker — on a
   dark screen nobody sees it, on paper it leaves a visible edge where the
   canvas meets the page. */
function setColor(target, css){
  const [r, g, b] = toRGB(css);
  target.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

export default function createCRTWarp(container, initial = {}, { eventTarget = container } = {}){
  const props = { ...DEFAULT_PROPS, ...initial };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uSpeed: { value: 0.5 },
      uColor: { value: new THREE.Color() },
      uBackgroundColor: { value: new THREE.Color() },
      uCurvature: { value: 0.25 },
      uScanlineStrength: { value: 0.25 },
      uScanlineFrequency: { value: 200 },
      uWaveAmplitude: { value: 0.3 },
      uWaveFrequency: { value: 2.5 },
      uBloom: { value: 1.5 },
      uBloomRadius: { value: 1 },
      uNoise: { value: 0.1 },
      uVignette: { value: 0 },
      uBrightness: { value: 1.25 },
      uPixelation: { value: 1 },
      uRgbShift: { value: 0.015 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 0.5 },
      uMouseReact: { value: 1 },
    },
  });
  const { uniforms } = material;

  scene.add(new THREE.Mesh(geometry, material));

  // throws when WebGL is unavailable — callers keep their fallback on catch
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  let visible = true;
  const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  visibilityObserver.observe(container);

  const pointerTo = new THREE.Vector2(0, 0);
  const pointer = new THREE.Vector2(0, 0);
  const clock = new THREE.Clock();
  let frame = 0;
  let lastFrame = 0;

  const render = (now) => {
    frame = requestAnimationFrame(render);
    if (!visible || document.hidden) return;
    const interval = 1000 / Math.max(1, props.fps);
    if (now - lastFrame < interval) return;
    lastFrame = now - ((now - lastFrame) % interval);
    const delta = Math.min(clock.getDelta(), 0.1);
    if (!props.paused) uniforms.uTime.value += delta * uniforms.uSpeed.value;
    pointer.lerp(pointerTo, 0.08);
    uniforms.uPointer.value.copy(pointer);
    renderer.render(scene, camera);
    // the buffer is blank until now — let CSS fade the layer up
    if (!container.classList.contains('is-live')) container.classList.add('is-live');
  };

  const set = (next = {}) => {
    Object.assign(props, next);
    setColor(uniforms.uColor.value, props.color);
    setColor(uniforms.uBackgroundColor.value, props.backgroundColor);
    uniforms.uSpeed.value = props.speed;
    uniforms.uCurvature.value = props.curvature;
    uniforms.uScanlineStrength.value = props.scanlineStrength;
    uniforms.uScanlineFrequency.value = props.scanlineFrequency;
    uniforms.uWaveAmplitude.value = props.waveAmplitude;
    uniforms.uWaveFrequency.value = props.waveFrequency;
    uniforms.uBloom.value = props.bloom;
    uniforms.uBloomRadius.value = props.bloomRadius;
    uniforms.uNoise.value = props.noise;
    uniforms.uVignette.value = props.vignette;
    uniforms.uBrightness.value = props.brightness;
    uniforms.uPixelation.value = props.pixelation;
    uniforms.uRgbShift.value = props.rgbShift;
    uniforms.uMouseReact.value = props.mouseReact ? 1 : 0;
    uniforms.uMouseStrength.value = props.mouseStrength;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, props.dpr));
    resize();
  };

  set();
  render(0);

  const onPointerMove = (event) => {
    const rect = container.getBoundingClientRect();
    pointerTo.set(
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
    );
  };
  const onPointerLeave = () => pointerTo.set(0, 0);
  eventTarget.addEventListener('pointermove', onPointerMove, { passive: true });
  eventTarget.addEventListener('pointerleave', onPointerLeave);

  const destroy = () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    eventTarget.removeEventListener('pointermove', onPointerMove);
    eventTarget.removeEventListener('pointerleave', onPointerLeave);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    container.classList.remove('is-live');
  };

  return { set, destroy, canvas: renderer.domElement };
}
