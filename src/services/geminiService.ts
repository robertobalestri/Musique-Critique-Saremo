import { PersonaId, AnalysisResponse, DiscussionMessage } from '../types';
import { API_BASE_URL } from '../config';

// Helper to convert AudioBuffer to WAV ArrayBuffer
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const wavLength = buffer.length * blockAlign;
  const bufferByteLength = 44 + wavLength;
  const arrayBuffer = new ArrayBuffer(bufferByteLength);
  const view = new DataView(arrayBuffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + wavLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, wavLength, true);

  let offset = 44;
  const channelData = buffer.getChannelData(0); // Only Mono supported for compression

  for (let i = 0; i < buffer.length; i++) {
    let sample = channelData[i];
    sample = Math.max(-1, Math.min(1, sample)); // clamp
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return arrayBuffer;
};

// Helper arrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Advanced Helper to compress and slice the File before sending, avoiding gigantic Base64 strings (Render OOM / 502 issues)
const fileToBase64Dict = async (file: File): Promise<{ data: string; mimeType: string }> => {
  try {
    // Avoid compressing Fashion Images (which also use this temporarily, or they use their own loop)
    if (!file.type.startsWith('audio/')) {
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
    }

    const TARGET_SAMPLE_RATE = 16000; // 16kHz Mono

    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const FULL_DURATION = decodedBuffer.duration;
    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, TARGET_SAMPLE_RATE * FULL_DURATION, TARGET_SAMPLE_RATE);

    // Create buffer source
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);

    // Start at 0, process everything
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();

    // We now have a compressed 16kHz Mono Float32Array. Convert to WAV 16bit.
    const wavArrayBuffer = audioBufferToWav(renderedBuffer);
    const base64Wav = arrayBufferToBase64(wavArrayBuffer);

    return { data: base64Wav, mimeType: 'audio/wav' };

  } catch (error) {
    console.warn("Audio compression failed, falling back to full original file base64. BEWARE OOM.", error);
    // Fallback to original
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
  }
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

export const analyzeSongBatch = async (
  audioFile: File | undefined,
  bio: string,
  personaIds: PersonaId[],
  audioFeatures?: string,
  lyrics?: string,
  artistName?: string,
  songTitle?: string,
  isBand?: boolean,
  fashionContext?: string
): Promise<Record<PersonaId, AnalysisResponse>> => {
  let audioData = null;
  if (audioFile) {
    audioData = await fileToBase64Dict(audioFile);
  }

  const response = await fetch(`${API_BASE_URL}/analyze/song-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioData,
      bio,
      personaIds,
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