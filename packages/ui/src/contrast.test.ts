/**
 * Contraste de la paleta, verificado de verdad.
 *
 * El test de `axe` **no** cubre esto: la regla de color-contrast necesita
 * canvas y jsdom no lo tiene, asi que la saltea en silencio. Sin este archivo,
 * "pasa axe" daria una sensacion de cobertura que no existe.
 *
 * Los valores se leen de `styles.css`, no se copian: una paleta duplicada en un
 * test es una paleta que un dia va a decir otra cosa que la que se ve.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// `import.meta.url` no es una URL de archivo bajo el entorno jsdom de Vitest.
const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

/** Extrae los tokens `--bs-*` del primer bloque que matchee el selector. */
function tokensOf(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No se encontro el selector ${selector} en styles.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);

  const out: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--bs-([\w-]+):\s*([^;]+);/g)) {
    if (name && value) out[name] = value.trim();
  }
  return out;
}

/** oklch(L% C H) -> sRGB con gamma, recortado al gamut. */
function oklchToSrgb(input: string): [number, number, number] {
  const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(input);
  if (!m) throw new Error(`No es un color oklch: ${input}`);
  const L = Number(m[1]) / 100;
  const C = Number(m[2]);
  const H = (Number(m[3]) * Math.PI) / 180;

  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];

  // Se recorta en el espacio con gamma, que es lo que realmente pinta la pantalla.
  return lin.map((v) => {
    const enc = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, enc));
  }) as [number, number, number];
}

/** Luminancia relativa segun WCAG 2.1. */
function luminance(color: string): number {
  const [r, g, b] = oklchToSrgb(color).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT = tokensOf(':root {');
const DARK = tokensOf(":root[data-theme='dark']");

/** Texto normal: AA pide 4.5. Elementos no textuales: 3. */
const TEXT_PAIRS: Array<[fg: string, bg: string]> = [
  ['ink-primary', 'surface-0'],
  ['ink-primary', 'surface-1'],
  ['ink-primary', 'surface-2'],
  ['ink-secondary', 'surface-0'],
  ['ink-secondary', 'surface-1'],
  // El hint de un campo es texto chico: no se le puede pedir menos que a AA.
  ['ink-muted', 'surface-1'],
  ['accent-ink', 'accent-base'],
  ['danger', 'danger-soft'],
  ['danger', 'surface-1'],
];

/**
 * `border-subtle` no esta aca a proposito: separa bloques, no delimita un
 * control. WCAG 1.4.11 aplica al limite de un componente, y ese limite lo pinta
 * `border-strong`, que es el que usan los inputs.
 */
const UI_PAIRS: Array<[fg: string, bg: string]> = [
  ['accent-base', 'surface-1'],
  ['border-strong', 'surface-1'],
  ['ruler-tick-strong', 'surface-1'],
];

describe.each([
  ['claro', LIGHT],
  ['oscuro', DARK],
])('contraste en tema %s', (_name, tokens) => {
  it.each(TEXT_PAIRS)('%s sobre %s cumple AA para texto (4.5:1)', (fg, bg) => {
    const fgValue = tokens[fg];
    const bgValue = tokens[bg];
    expect(fgValue, `falta el token --bs-${fg}`).toBeDefined();
    expect(bgValue, `falta el token --bs-${bg}`).toBeDefined();
    expect(ratio(fgValue!, bgValue!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s sobre %s cumple AA para no-texto (3:1)', (fg, bg) => {
    expect(ratio(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
