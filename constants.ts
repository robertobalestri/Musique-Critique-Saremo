import { CriticPersona, PersonaId } from './types';
import { BookOpen, Frown, Sparkles, Zap, Skull } from 'lucide-react';

// Load personas dynamically from JSON files in the biographies folder (and subfolders)
const personaFiles = import.meta.glob('./biographies/**/*.json', { eager: true });

export const PERSONAS: Record<PersonaId, CriticPersona> = {};

Object.values(personaFiles).forEach((module: any) => {
  // Il modulo importato è il JSON stesso
  // Esempio: module.default se si usasse import(), ma con eager: true e .json, 
  // Vite potrebbe restituire l'oggetto direttamente o nel default export.
  // Solitamente con eager: true su JSON, il contenuto è in module o module.default.
  // Facciamo un check sicuro.
  const personaData = module.default || module;

  if (personaData && personaData.id) {
    PERSONAS[personaData.id as PersonaId] = personaData as CriticPersona;
  }
});
