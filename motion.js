// The fish is painted head-right. All coordinates below are texture coordinates.
// One phase turn is a ten-second loop. Integer harmonics keep every wave periodic.
export const LOOP_SECONDS = 10;
export const COLS = 72;
export const ROWS = 36;
export const TAU = Math.PI * 2;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function smoothstep(lo, hi, value) {
  const t = clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

export function startsPlaying(prefersReducedMotion) {
  return !prefersReducedMotion;
}

export function deformPoint(u, v, phase, current = 1) {
  const tail = 1 - smoothstep(0.13, 0.60, u);
  const headAnchor = 1 - smoothstep(0.73, 0.91, u);
  const across = v - 0.5;
  const edge = smoothstep(0.09, 0.40, Math.abs(across));
  const pectoral = Math.exp(-Math.pow((u - 0.76) / 0.15, 2)) * edge;
  // A travelling wave bends the spine. It grows toward the tail; the face is anchored.
  const spine = headAnchor * (0.012 + 0.112 * tail) * Math.sin(phase * 2 - u * 7.4);
  // Tail lobes billow separately. This is a deformation field, not a rigid image translate.
  const tailBillow = tail * edge * 0.045 * Math.sin(phase * 3 - u * 10 + across * 8);
  const fin = pectoral * 0.048 * Math.sin(phase * 2 + across * 5 + u * 4);
  const dx = current * (tail * edge * 0.020 * Math.sin(phase * 2 + v * 9) + pectoral * 0.018 * Math.sin(phase * 2 + v * 7));
  const dy = current * (spine + tailBillow + fin);
  return { x: u - 0.5 + dx, y: v - 0.5 + dy };
}

export function makeGrid() {
  const uv = new Float32Array((COLS + 1) * (ROWS + 1) * 2);
  const positions = new Float32Array(uv.length);
  let at = 0;
  for (let row = 0; row <= ROWS; row++) {
    for (let col = 0; col <= COLS; col++) {
      uv[at++] = col / COLS;
      uv[at++] = row / ROWS;
    }
  }
  const indices = new Uint16Array(COLS * ROWS * 6);
  at = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const a = row * (COLS + 1) + col, b = a + 1, c = a + COLS + 1, d = c + 1;
      indices.set([a, c, b, b, c, d], at);
      at += 6;
    }
  }
  return { uv, positions, indices };
}
