export type PersonaId = string;

export interface CriticPersona {
  id: PersonaId;
  name: string;
  subtitle: string; // NEW: Short description/title
  description: string;
  type: 'music' | 'fashion'; // NEW: Category
  icon: string;
  traits: string;
  color: string;
  rubric: Record<string, { weight: number; interpretation: string }>;
}

export interface AnalysisRequest {
  audioFile?: File; // Optional if text-only
  lyrics: string;   // Optional or required depending on mode
  bio: string;
  personaId: PersonaId;
}

export interface ScorecardItem {
  category: string;
  score: number;
  maxScore: number;
  justification: string;
}

export interface LyricalAnalysis {
  scorecard: ScorecardItem[];
  subtotal: number;
  penalties: number;
  finalScore: number;
  scoreLowerBound: number;
  scoreUpperBound: number;
  interpretation: string;
  journalisticSummary: string; // NEW: Sintesi stile giornalistico
  areasForImprovement: string;
}

export interface AnalysisResponse {
  musicalAnalysis?: string | null;
  lyricalAnalysis: LyricalAnalysis;
}

export interface FashionAnalysis {
  critique: string;
  score: number;
  comment: string;
}

export interface DiscussionMessage {
  personaId: PersonaId;
  text: string;
  timestamp: number;
}
