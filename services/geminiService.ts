import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PERSONAS } from '../constants';
import { RUBRIC_DEFINITIONS } from '../data/rubricDefinitions';
import { PersonaId, AnalysisResponse, DiscussionMessage } from '../types';

const getModel = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("API Key mancante (VITE_GEMINI_API_KEY)");
  }
  return new GoogleGenAI({ apiKey });
};

// Convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/mp3;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getMimeType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'mp3') return 'audio/mp3';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'm4a') return 'audio/m4a';
  if (ext === 'aac') return 'audio/aac';
  return 'audio/mp3'; // Default fallback
};

export const analyzeSong = async (
  audioFile: File | undefined,
  bio: string,
  personaId: PersonaId,
  audioFeatures?: string, // New parameter (optional)
  lyrics?: string, // New parameter (optional)
  artistName?: string,
  songTitle?: string,
  isBand?: boolean
): Promise<AnalysisResponse> => {
  const ai = getModel();
  const persona = PERSONAS[personaId];

  let audioBase64: string | null = null;
  let mimeType: string | null = null;

  if (audioFile) {
    audioBase64 = await fileToGenerativePart(audioFile);
    mimeType = getMimeType(audioFile);
  }

  /* Generiamo dinamicamente la sezione della rubrica basata sul JSON del critico */
  const rubricList = Object.entries(persona.rubric)
    .filter(([_, details]) => details.weight > 0)
    .map(([category, details]) => {
      const definition = RUBRIC_DEFINITIONS[category] || "Definizione non disponibile";
      return `    * **${category} (${details.weight} pti):**\n       - Definizione Standard: ${definition}\n       - Lente Critica (${persona.name}): ${details.interpretation}`;
    })
    .join('\n');

  const systemInstructionText = `
    Sei un critico musicale esperto e perspicace. Nello specifico, incarni questa personalità:
    
    NOME: ${persona.name}
    DESCRIZIONE: ${persona.description}
    TRATTI: ${persona.traits}

    La tua funzione è applicare la rubrica di valutazione fornita con obiettività (filtrata attraverso la tua personalità), equità e profonda conoscenza musicale.

    
    ${audioFeatures ? "**DATI TECNICI AUDIO (SOLO PER TUO RIFERIMENTO):**\n **ISTRUZIONE CRITICA SUI DATI TECNICI:**Usa questi dati per *informare* la tua analisi, ma **NON CITARE MAI I NUMERI ESPLICITAMENTE**." + audioFeatures : ""}
    
    
    ${!audioFile ? "**ATTENZIONE: Stai analizzando SOLO IL TESTO. Ignora le categorie puramente sonore della rubrica (o valutale in base alla metrica/ritmo del testo se possibile, o dai un voto neutro/intermedio se impossibile). Concentrati sulla lirica, il messaggio, la poetica.**" : ""}

    Il tuo output DEVE essere un singolo oggetto JSON valido conforme allo schema fornito.

    **Principi Fondamentali & Direttive:**
    1. **Obiettività Esperta (con Carattere):** Analisi basata su prove, ma col tono della tua "Persona".
    2. **Punteggio Calibrato:** Assegna i punti per ogni categoria con onestà.
    3. **Variazione Lessicale:** EVITA frasi fatte o ripetitive nei campi "interpretation". Sii creativo e specifico per questo brano.
    4. **Sintesi Giornalistica:** Genera un breve riassunto ("voto + motivo") stile trafiletto di rivista.

    **RUBRICA DI CRITICA (I PESI SONO SPECIFICI PER TE):**
    ${rubricList}

    **INTEPRETAZIONE PUNTEGGI:**
    * **90–100:** Capolavoro.
    * **80–89:** Eccellente.
    * **70–79:** Forte.
    * **60–69:** Buono ma imperfetto.
    * **50–59:** Accettabile.
    * **40–49:** Debole.
    * **39 o meno:** Povero/Non funzionale.
  `;

  // ... (Response Schema remains same) ...
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      musicalAnalysis: {
        type: Type.STRING,
        description: "Una critica severa e oggettiva della musica (melodia, armonia, ritmo, produzione). SE NON HAI AUDIO: Scrivi 'Analisi musicale non disponibile per mancanza di audio.'",
        nullable: true
      },
      lyricalAnalysis: {
        type: Type.OBJECT,
        properties: {
          scorecard: {
            type: Type.ARRAY,
            description: "Un array contenente il punteggio e la giustificazione per ogni categoria lirica.",
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "Il nome della categoria di valutazione." },
                score: { type: Type.NUMBER, description: "Il punteggio assegnato per questa categoria." },
                maxScore: { type: Type.NUMBER, description: "Il punteggio massimo possibile per questa categoria." },
                justification: { type: Type.STRING, description: "Giustificazione dettagliata." }
              },
              required: ["category", "score", "maxScore", "justification"]
            }
          },
          penalties: { type: Type.NUMBER, description: "Punti dedotti (0 se nessuna)." },
          journalisticSummary: { type: Type.STRING, description: "Una sintesi folgorante del verdetto in 2 frasi, stile 'Rolling Stone' o trafiletto di giornale. Efficace e diretta." },
          interpretation: { type: Type.STRING, description: "Il testo di interpretazione esteso." },
          areasForImprovement: {
            type: Type.STRING,
            description: "Lista puntata di suggerimenti in markdown."
          }
        },
        required: ["scorecard", "penalties", "journalisticSummary", "interpretation", "areasForImprovement"]
      }
    },
    required: ["lyricalAnalysis"]
  };

  const userPrompt = `
    Analizza questo brano musicale.
    
    ${songTitle && artistName ? `BRANO: "${songTitle}" di ${artistName} (${isBand ? 'Band' : 'Solista'})` : ''}

    ${lyrics ? `TESTO / LYRICS:\n"${lyrics}"\n` : ""}
    
    BIOGRAFIA ARTISTA / INFO CONTESTUALI:
    "${bio}"
    
    ${!audioFile ? "(NOTA: Non è stato fornito alcun file audio. Basa la tua analisi ESCLUSIVAMENTE sul testo fornito.)" : ""}
  `;

  try {
    const requestParts: any[] = [{ text: userPrompt }];

    if (audioBase64 && mimeType) {
      requestParts.push({
        inlineData: {
          mimeType: mimeType,
          data: audioBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: requestParts
      },
      config: {
        systemInstruction: systemInstructionText,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Nessuna risposta dal modello");

    const rawResponse = JSON.parse(responseText);

    // Calculate scores programmatically
    const lyrical = rawResponse.lyricalAnalysis;

    // Sanitize scorecard: Remove 0-weight categories and unknown categories
    lyrical.scorecard = lyrical.scorecard.filter((item: any) => {
      const rubricDetails = persona.rubric[item.category];
      return rubricDetails && rubricDetails.weight > 0;
    });

    const subtotal = lyrical.scorecard.reduce((acc: number, item: any) => acc + item.score, 0);
    const penalties = lyrical.penalties || 0;
    const finalScore = Math.max(0, Math.min(100, subtotal - penalties));

    // Construct the full AnalysisResponse
    const fullResponse: AnalysisResponse = {
      ...rawResponse,
      lyricalAnalysis: {
        ...lyrical,
        subtotal,
        finalScore,
        scoreLowerBound: 0, // Fallbacks for types if needed
        scoreUpperBound: 100
      }
    };

    return fullResponse;

  } catch (error) {
    console.error("Errore durante l'analisi:", error);
    throw error;
  }
};

/**
 * Generates a discussion turn (NON-STREAMING).
 */
export const generateDiscussionTurn = async (
  currentSpeakerId: PersonaId,
  history: DiscussionMessage[],
  previousCritique: AnalysisResponse
): Promise<string> => {
  const ai = getModel();
  const persona = PERSONAS[currentSpeakerId];

  // Format the conversation history for the prompt
  const conversationHistoryText = history.length === 0
    ? "La discussione sta iniziando ora."
    : history.map(msg => `${PERSONAS[msg.personaId].name}: "${msg.text}"`).join("\n\n");

  const systemPrompt = `
    Sei ${persona.name}.
    ${persona.traits}
    
    Stai partecipando a una tavola rotonda con altri critici musicali per discutere di un brano che avete appena ascoltato.
    
    IL TUO GIUDIZIO PRECEDENTE SUL BRANO:
    Voto: ${previousCritique.lyricalAnalysis.finalScore}/100
    Analisi: ${previousCritique.musicalAnalysis || "N/A"}
    
    CONTESTO DISCUSSIONE:
    ${conversationHistoryText}
    
    COMPITO:
    Rispondi al commento precedente o fai un'osservazione.
    - Mantieni il personaggio.
    - Interagisci con gli altri.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Tocca a te. Rispondi.",
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2048,
      }
    });

    return response.text || "...";
  } catch (error) {
    console.error("Errore chat:", error);
    return "...";
  }
};

/**
 * Generates an editorial synthesis of all reviews.
 */
export const synthesizeReviews = async (
  results: Record<string, AnalysisResponse>
): Promise<string> => {
  const ai = getModel();

  const reviewsText = Object.entries(results).map(([personaId, res]) => {
    const persona = PERSONAS[personaId as PersonaId];
    return `
    CRITICO: ${persona.name}
    VOTO: ${res.lyricalAnalysis.finalScore}/100
    SINTESI: "${res.lyricalAnalysis.journalisticSummary}"
    `;
  }).join("\n\n");

  const systemPrompt = `
    Sei il Caporedattore di una prestigiosa rivista musicale.
    
    Il tuo compito è leggere le recensioni del tuo staff (che hanno personalità molto diverse) e scrivere un "Verdetto Editoriale" conclusivo.
    
    Tono: Autorevole, giornalistico, ficcante e creativo. Non devi essere neutrale, devi tirare le somme.
    
    OUTPUT RICHIESTO:
    Scrivi DIRETTAMENTE il testo del verdetto (senza prefissi come "Ecco il verdetto:" o "VERDETTO EDITORIALE:").
    Restituisci testo puro, senza formattazione markdown o simili.
    
    ECCO LE RECENSIONI DELLO STAFF:
    ${reviewsText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Scrivi il verdetto.",
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "Verdetto non disponibile.";
  } catch (error) {
    console.error("Errore sintesi:", error);
    return "Impossibile generare la sintesi editoriale.";
  }
};