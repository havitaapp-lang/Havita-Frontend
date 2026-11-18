import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Fase 2 / P7-G — misma configuracion que playwright.config.ts, pero para las pruebas de poderes (P6/P7) en Chromium,
 * Firefox y WebKit contra el SANDBOX aislado (requirePhase6: E2E_SANDBOX=1 y E2E_PHASE6=1). Sin el proyecto «setup»
 * (las pruebas de P6/P7 inician sesion por si mismas). No cambia la configuracion habitual.
 */
const viewport = { width: 1366, height: 860 };

export default defineConfig({
  ...base,
  // P8-A: también la citofonía (tests/phase8a), en el mismo sandbox aislado.
  // P8-B: también la recuperación de llamadas y el enlace del aviso push (tests/phase8b).
  testMatch: /phase(6|7|8a|8b)\/.*\.spec\.ts/,
  reporter: [['list'], ['json', { outputFile: 'test-results/multibrowser.json' }]],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport } },
  ],
});
