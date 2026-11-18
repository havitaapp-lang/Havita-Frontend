/**
 * Synthetic, collision-free test data. Every record created by the suite carries the E2E- prefix
 * and an @example.test address (RFC 2606 reserved domain), so it can never be mistaken for a real resident.
 */
const runId = Date.now().toString(36).toUpperCase();
let seq = 0;

export function uniqueTag(label: string): string {
  seq += 1;
  return `E2E-${label}-${runId}${seq}`;
}

export function syntheticResident(label: string, overrides: Partial<SyntheticResident> = {}): SyntheticResident {
  const tag = uniqueTag(label);
  const digits = String(Math.floor(1_000_000 + Math.random() * 8_999_999));
  return {
    tag,
    name: `${tag} Persona Prueba`,
    email: `${tag.toLowerCase()}@example.test`,
    phone: `300${digits}`,
    ...overrides,
  };
}

export interface SyntheticResident {
  tag: string;
  name: string;
  email: string;
  phone: string;
}
