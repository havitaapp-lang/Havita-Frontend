/** Etiqueta de una unidad: el número completo (p. ej. «Torre 1-Piso 5-Apto 2») y el nombre si aporta algo. */
export const unitLabel = (p: { number?: string; name?: string }) =>
  p.name && p.number && p.name !== p.number ? `${p.number} · ${p.name}` : p.number || p.name || '';

/** Estado del backend (ACTIVE/INACTIVE) mostrado en español. */
export const statusLabel = (status?: string) =>
  status === 'ACTIVE' ? 'Activo' : status === 'INACTIVE' ? 'Inactivo' : status || '';
