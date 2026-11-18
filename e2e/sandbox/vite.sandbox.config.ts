// Vite para el sandbox E2E aislado: misma aplicacion en :5177, con /api hacia el backend del sandbox (:9097 por defecto).
// Uso (desde Havita-Frontend): npx vite --config e2e/sandbox/vite.sandbox.config.ts
import path from 'node:path';
import base from '../../vite.config';

const apiTarget = process.env.SANDBOX_API_TARGET ?? 'http://localhost:9097';

export default {
  ...base,
  root: path.resolve(import.meta.dirname, '..', '..'),
  server: {
    ...base.server,
    port: Number(process.env.SANDBOX_VITE_PORT ?? 5177),
    strictPort: true,
    proxy: { '/api': { target: apiTarget, changeOrigin: false } },
  },
};
