/**
 * iOS amplía la página al enfocar un campo con letra < 16px y no la devuelve al cerrar el teclado. Se evita con CSS
 * (src/index.css), solo en iOS y sin bloquear el zoom manual. Estas pruebas protegen la regla y el viewport; el tamaño
 * computado en un iPhone se mide con la auditoría de Playwright (ver tasks/IOS_INPUT_ZOOM_REPORT.md).
 */
import { describe, expect, it } from 'vitest';

// Vitest procesa los .css (un import ?raw llega vacío): se leen del disco. La prueba corre en Node; el tsconfig de la
// app no carga los tipos de Node (para no cambiar tipos globales del código), así que solo se declara lo necesario.
declare const process: { cwd(): string };
const fsModule = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ fsModule)) as { readFileSync(path: string, enc: string): string };
const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
const html = readFileSync(`${process.cwd()}/index.html`, 'utf8');

const iosBlock = (() => {
  const start = css.indexOf('@supports (-webkit-touch-callout: none)');
  if (start < 0) return '';
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  return '';
})();

describe('zoom automático de iOS al enfocar campos', () => {
  it('existe la regla solo para iOS y cubre input, textarea, select y contenteditable', () => {
    expect(iosBlock).not.toBe('');
    for (const sel of ['input:not(', 'textarea', 'select', '[contenteditable]']) expect(iosBlock).toContain(sel);
  });

  it('excluye casillas, radios y botones (no son campos de texto)', () => {
    for (const t of ['checkbox', 'radio', 'button', 'submit', 'hidden', 'file']) expect(iosBlock).toContain(`[type="${t}"]`);
  });

  it('mínimo de 16px respetando tamaños mayores (max) y las clases pequeñas de Tailwind', () => {
    expect(iosBlock).toMatch(/font-size:\s*max\(16px,\s*1em\)/);
    expect(iosBlock).toMatch(/--text-xs:\s*max\(16px,/);
    expect(iosBlock).toMatch(/--text-sm:\s*max\(16px,/);
    expect(iosBlock).toMatch(/--text-base:\s*max\(16px,/);
  });

  it('sin !important: una clase de tamaño mayor sigue mandando', () => {
    expect(iosBlock).not.toContain('!important');
  });

  it('está dentro de la capa base (las utilidades de Tailwind tienen prioridad)', () => {
    const before = css.slice(0, css.indexOf('@supports (-webkit-touch-callout: none)'));
    expect(before.lastIndexOf('@layer base')).toBeGreaterThan(before.lastIndexOf('}\n\n'));
  });

  it('el viewport no bloquea el zoom manual (accesibilidad)', () => {
    const viewport = html.match(/<meta[^>]+name="viewport"[^>]*>/)?.[0] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
    expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(\.0+)?\b/);
  });
});
