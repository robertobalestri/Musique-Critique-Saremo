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

export const analyzeFashion = async (
  images: File[],
  personaId: PersonaId,
  bio: string,
  artistName?: string
): Promise<AnalysisResponse> => {
  const ai = getModel();
  const persona = PERSONAS[personaId];
  if (!persona) throw new Error(`Critico fashion non trovato: ${personaId}`);

  /* Generiamo dinamicamente la sezione della rubrica basata sul JSON del critico */
  const rubricList = Object.entries(persona.rubric)
    .filter(([_, details]) => details.weight > 0)
    .map(([category, details]) => {
      const definition = RUBRIC_DEFINITIONS[category] || "Definizione estetica standard";
      return `    * **${category} (${details.weight} pti):**\n       - Concetto: ${definition}\n       - Lente Critica (${persona.name}): ${details.interpretation}`;
    })
    .join('\n');

  const systemInstruction = `
    Sei ${persona.name}.
    ${persona.traits}
    
    Il tuo compito è giudicare L'OUTFIT, IL LOOK e LO STILE dell'artista basandoti sulle immagini fornite.
    Non ti interessa la musica per ora, solo l'apparire.
    
    Il tuo output DEVE essere un singolo oggetto JSON valido conforme allo schema fornito.

    **Principi Fondamentali & Direttive:**
    1. **Obiettività Estetica (con Carattere):** Analisi basata sull'impatto visivo, ma col tono della tua "Persona".
    2. **Punteggio Calibrato:** Assegna i punti per ogni categoria con onestà e severità.
    3. **Sintesi Giornalistica:** Genera un breve riassunto ("voto + motivo") stile commento da red carpet o rivista di moda.

    **RUBRICA DI CRITICA FASHION (I PESI SONO SPECIFICI PER TE):**
    ${rubricList}

    Restituisci testo puro, senza formattazione markdown o simili. 
    Il calcolo del punteggio finale viene fatto in automatico: non scrivere il punteggio finale in nessuno dei tuoi commenti.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      musicalAnalysis: {
        type: Type.STRING,
        description: "Lascia vuoto o scrivi 'Non applicabile a critica visiva.'",
        nullable: true
      },
      lyricalAnalysis: { // We reuse the LyricalAnalysis structure for Fashion to keep types compatible
        type: Type.OBJECT,
        properties: {
          scorecard: {
            type: Type.ARRAY,
            description: "Un array contenente il punteggio e la giustificazione per ogni categoria fashion.",
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "Il nome della categoria di valutazione." },
                score: { type: Type.NUMBER, description: "Il punteggio assegnato per questa categoria." },
                maxScore: { type: Type.NUMBER, description: "Il punteggio massimo possibile per questa categoria." },
                justification: { type: Type.STRING, description: "Giustificazione dettagliata e caustica se necessario." }
              },
              required: ["category", "score", "maxScore", "justification"]
            }
          },
          penalties: { type: Type.NUMBER, description: "Punti dedotti per cadute di stile imperdonabili (0 se nessuna)." },
          journalisticSummary: { type: Type.STRING, description: "Una sintesi folgorante in 2 frasi sul look, stile commento spietato o esaltato." },
          interpretation: { type: Type.STRING, description: "Il testo di recensione completo sul loro stile." },
          areasForImprovement: {
            type: Type.STRING,
            description: "Lista puntata di suggerimenti su come migliorare il look o cosa non indossare MAI PIÙ."
          }
        },
        required: ["scorecard", "penalties", "journalisticSummary", "interpretation", "areasForImprovement"]
      }
    },
    required: ["lyricalAnalysis"]
  };

  const userPrompt = `
    Analizza il look di questo artista.
    ${artistName ? `Artista: ${artistName}` : ""}
    ${bio ? `Bio descrittiva o contesto: ${bio}` : ""}
    
    Cosa ne pensi del loro stile visivo basandoti sulle immagini?
  `;

  // Convert images to base64
  const imageParts = await Promise.all(images.map(async (file) => {
    const reader = new FileReader();
    return new Promise<any>((resolve) => {
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve({
          inlineData: {
            data: base64String.split(',')[1],
            mimeType: file.type || 'image/jpeg'
          }
        });
      };
      reader.readAsDataURL(file);
    });
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: userPrompt }, ...imageParts]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("Nessuna risposta dal modello");

    const rawResponse = JSON.parse(responseText);
    const fashionCritique = rawResponse.lyricalAnalysis;

    // Sanitize scorecard: Remove 0-weight categories and unknown categories
    fashionCritique.scorecard = fashionCritique.scorecard.filter((item: any) => {
      const rubricDetails = persona.rubric[item.category];
      return rubricDetails && rubricDetails.weight > 0;
    });

    const subtotal = fashionCritique.scorecard.reduce((acc: number, item: any) => acc + item.score, 0);
    const penalties = fashionCritique.penalties || 0;
    const finalScore = Math.max(0, Math.min(100, subtotal - penalties));

    const fullResponse: AnalysisResponse = {
      ...rawResponse,
      lyricalAnalysis: {
        ...fashionCritique,
        subtotal,
        finalScore,
        scoreLowerBound: 0,
        scoreUpperBound: 100
      }
    };

    return fullResponse;
  } catch (error) {
    console.error(`Errore analisi fashion (${persona.name}):`, error);
    throw error;
  }
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
  fashionContext?: string // NEW: Fashion critique context
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
    
    ${fashionContext ? `**NOTA SUL LOOK:**\n"${fashionContext}"\n(Usa questa info se pertinente alla tua critica, specialmente per valutare l' 'Immagine' o la 'Presence' se previsti, o per colorire la tua recensione. Se sei un purista della musica, potresti ignorarlo o disprezzarlo.)` : ""}
    
    ${!audioFile ? "**ATTENZIONE: Stai analizzando SOLO IL TESTO. Ignora le categorie puramente sonore della rubrica (o valutale in base alla metrica/ritmo del testo se possibile, o dai un voto neutro/intermedio se impossibile). Concentrati sulla lirica, il messaggio, la poetica.**" : ""}

    Il tuo output DEVE essere un singolo oggetto JSON valido conforme allo schema fornito.

    **Principi Fondamentali & Direttive:**
    1. **Obiettività Esperta (con Carattere):** Analisi basata su prove, ma col tono della tua "Persona".
    2. **Punteggio Calibrato:** Assegna i punti per ogni categoria con onestà.
    3. **Variazione Lessicale:** EVITA frasi fatte o ripetitive nei campi "interpretation". Sii creativo e specifico per questo brano.
    4. **Sintesi Giornalistica:** Genera un breve riassunto ("voto + motivo") stile trafiletto di rivista.

    **RUBRICA DI CRITICA (I PESI SONO SPECIFICI PER TE):**
    ${rubricList}
    
    Restituisci testo puro, senza formattazione markdown o simili. 
    Il calcolo del punteggio finale viene fatto in automatico: non scrivere il punteggio finale in nessuno dei tuoi commenti.
    Interpreta ma non riprotare mai i dati tecnici sull'audio forniti in input.
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
  history: DiscussionMessage[],
  currentSpeakerId: PersonaId,
  artistName: string,
  songTitle: string,
  previousCritique?: AnalysisResponse,
  fashionCritique?: string
): Promise<string> => {
  const ai = getModel();
  const persona = PERSONAS[currentSpeakerId];

  // Format the conversation history for the prompt
  const conversationHistoryText = history.length === 0
    ? "La discussione sta iniziando ora."
    : history.map(msg => `${PERSONAS[msg.personaId].name}: "${msg.text}"`).join("\n\n");

  let userContext = `BRANO: "${songTitle}" di ${artistName}\n`;

  if (previousCritique) {
    userContext += `IL TUO GIUDIZIO PRECEDENTE: Voto ${previousCritique.lyricalAnalysis.finalScore}/100. "${previousCritique.lyricalAnalysis.journalisticSummary}"\n`;
  } else {
    userContext += `(Non hai ancora analizzato formalmente questo brano, quindi basati sulla discussione in corso).\n`;
  }

  if (fashionCritique && persona.type === 'fashion') {
    userContext += `TUA ANALISI FASHION PRECEDENTE: "${fashionCritique}"\n\n`;
  } else if (fashionCritique) {
    userContext += `NOTA FASHION: "${fashionCritique}"\n(Puoi commentare questo se vuoi, o ignorarlo).\n`;
  }

  const systemPrompt = `
    Sei ${persona.name}.
    ${persona.traits}
    
    Stai partecipando a una tavola rotonda con altri critici musicali (e di stile).
    
    CONTESTO:
    ${userContext}
    
    STORICO DISCUSSIONE:
    ${conversationHistoryText}
    
    COMPITO:
    Rispondi all'ultimo commento o fai un'osservazione pertinente.
    - Mantieni RIGOROSAMENTE il tuo personaggio.
    - Sii breve e incisivo (max 2 frasi).
    - Se sei un critico musicale, parla di musica (testo, suono).
    - Se sei il Fashion Critic, parla SOLO di look, stile e presenza scenica, ignorando la musica o trattandola con sufficienza.

    Restituisci testo puro, senza formattazione markdown o simili.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: "Tocca a te. Intervieni." }] }],
      config: {
        systemInstruction: systemPrompt,
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