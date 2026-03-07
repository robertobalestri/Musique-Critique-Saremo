import { PersonaId, AnalysisResponse, DiscussionMessage } from '../types';
import { API_BASE_URL } from '../config';

// Helper to convert File to base64 dict for the backend
const fileToBase64Dict = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const data = base64String.split(',')[1];
      resolve({ data, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeFashion = async (
  images: File[],
  personaId: PersonaId,
  bio: string,
  artistName?: string
): Promise<AnalysisResponse> => {
  const imageParts = await Promise.all(images.map(fileToBase64Dict));

  const response = await fetch(`${API_BASE_URL}/analyze/fashion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: imageParts,
      personaId,
      bio,
      artistName
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Errore dal server: ${err}`);
  }

  return response.json();
};

export const analyzeSong = async (
  audioFile: File | undefined,
  bio: string,
  personaId: PersonaId,
  audioFeatures?: string,
  lyrics?: string,
  artistName?: string,
  songTitle?: string,
  isBand?: boolean,
  fashionContext?: string
): Promise<AnalysisResponse> => {
  let audioData = null;
  if (audioFile) {
    audioData = await fileToBase64Dict(audioFile);
  }

  const response = await fetch(`${API_BASE_URL}/analyze/song`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioData,
      bio,
      personaId,
      audioFeatures,
      lyrics,
      artistName,
      songTitle,
      isBand,
      fashionContext
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Errore dal server: ${err}`);
  }

  return response.json();
};

export const generateDiscussionTurn = async (
  history: DiscussionMessage[],
  currentSpeakerId: PersonaId,
  artistName: string,
  songTitle: string,
  previousCritique?: AnalysisResponse,
  fashionCritique?: string
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/analyze/discussion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      history,
      currentSpeakerId,
      artistName,
      songTitle,
      previousCritique,
      fashionCritique
    }),
  });

  if (!response.ok) {
    console.error("Errore chat API");
    return "...";
  }

  const data = await response.json();
  return data.text;
};

export const synthesizeReviews = async (
  results: Record<string, AnalysisResponse>
): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/analyze/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ results }),
  });

  if (!response.ok) {
    console.error("Errore sintesi API");
    return "Impossibile generare la sintesi editoriale.";
  }

  const data = await response.json();
  return data.text;
};