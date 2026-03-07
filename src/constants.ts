import { CriticPersona, PersonaId } from './types';

// PERSONAS is now populated dynamically by PersonaContext at app startup.
// We keep it exported as a global record for backwards compatibility
// with components/services that don't hook into React context (e.g., exportService).
export const PERSONAS: Record<PersonaId, CriticPersona> = {};
