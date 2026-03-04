import React, { useState } from 'react';
import { Headphones } from 'lucide-react';
import AnalysisForm from '../components/AnalysisForm';
import { useAnalysis } from '../contexts/AnalysisContext';
import { useNavigate } from 'react-router-dom';
import { PERSONAS } from '../constants';
import { extractAudioFeatures } from '../services/audioAnalysisService';
import { analyzeSong, analyzeFashion, synthesizeReviews } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { upload } from '@vercel/blob/client';
import { AudioFileData } from '../components/AnalysisForm';

async function calculateSHA256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const Home: React.FC = () => {
    const { token, user } = useAuth();
    const { playTrack } = usePlayer();
    const navigate = useNavigate();
    const {
        setResults,
        setAudioAnalysisReport,
        setMetadata,
        setLastAnalysisRequest,
        setAverageScore,
        setAverageAestheticScore,
        setSynthesis,
        setIsSynthesizing
    } = useAnalysis();

    const [isLoading, setIsLoading] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number, total: number, itemName: string } | null>(null);

    const handleAnalyze = async (
        audios: AudioFileData[], // <- Modificato per ricevere l'array
        bio: string,
        analyzeAll: boolean,
        lyrics: string,
        // (artistName e songTitle singoli da text-mode)
        fallbackArtistName: string,
        fallbackSongTitle: string,
        isBand: boolean,
        tag: string
    ) => {
        if (!user) {
            const anonCount = parseInt(Cookies.get('saremo_anon_count') || '0', 10);
            if (anonCount >= 3) {
                toast.error('Registrati per continuare a generare analisi!');
                return;
            }
            Cookies.set('saremo_anon_count', (anonCount + 1).toString(), { expires: 365 });
        }

        setIsLoading(true);
        setResults(null);
        setAudioAnalysisReport(null);

        try {
            const isBatch = audios.length > 1;
            const itemsToProcess = audios.length > 0 ? audios : [{
                file: undefined as any,
                artistName: fallbackArtistName,
                songTitle: fallbackSongTitle,
                id: 'text-only',
                isParseError: false,
                images: []
            }];

            if (isBatch) setBatchProgress({ current: 0, total: itemsToProcess.length, itemName: '' });

            for (let i = 0; i < itemsToProcess.length; i++) {
                const currentItem = itemsToProcess[i];
                const currentAudio = currentItem.file;
                const currentArtist = currentItem.artistName;
                const currentTitle = currentItem.songTitle;
                const currentImages = currentItem.images || [];

                if (isBatch) {
                    setBatchProgress({ current: i + 1, total: itemsToProcess.length, itemName: currentTitle });
                }

                setMetadata({ artistName: currentArtist, songTitle: currentTitle, isBand });

                const newResults: Record<string, any> = {};
                let fashionContextResult = "";

                if (analyzeAll) {
                    // 0. Analyze Fashion FIRST (Applicato a ogni brano per ora per semplicità, 
                    // se le immagini sono condivise riutilizziamo il risultato se lo calcolassimo prima,
                    // ma l'API accetta i nomi, quindi lo ricalcoliamo per avere critiche contestualizzate al brano, 
                    // oppure lo calcoliamo una volta). 
                    // Per ora manteniamo il calcolo per iterazione. Data l'implementazione base di Saremo, 
                    // è una scelta accettabile.
                    if (currentImages && currentImages.length > 0) {
                        try {
                            const fashionPersonas = Object.values(PERSONAS).filter(p => p.type === 'fashion');
                            const fashionPromises = fashionPersonas.map(async (p) => {
                                try {
                                    const critique = await analyzeFashion(currentImages, p.id, bio, currentArtist);
                                    return { id: p.id, name: p.name, critique };
                                } catch (e) {
                                    console.warn(`Fashion analysis failed for ${p.name}`, e);
                                    return null;
                                }
                            });

                            const fashionResults = await Promise.all(fashionPromises);

                            fashionResults.forEach(res => {
                                if (res) {
                                    newResults[res.id] = res.critique;
                                    fashionContextResult += `${res.name} (Voto ${res.critique.lyricalAnalysis.finalScore}/100): "${res.critique.lyricalAnalysis.journalisticSummary}"\n\n`;
                                }
                            });
                        } catch (e) {
                            console.warn("Fashion analysis failed", e);
                        }
                    }

                    // 1. Extract Audio Features
                    let audioContextReport = "Analisi solo testuale (Audio non fornito).";
                    if (currentAudio) {
                        try {
                            audioContextReport = await extractAudioFeatures(currentAudio);
                        } catch (e) {
                            console.warn("Audio analysis context failed", e);
                            audioContextReport = "Analisi tecnica fallita.";
                        }
                    }

                    const safeAudio = currentAudio || undefined;

                    setLastAnalysisRequest({
                        artist: currentArtist,
                        title: currentTitle,
                        lyrics,
                        bio,
                        fashionCritique: fashionContextResult || undefined
                    });

                    // 2. Music Analysis
                    const musicPersonas = Object.values(PERSONAS).filter(p => !p.type || p.type === 'music');
                    const promises = musicPersonas.map(persona => {
                        return analyzeSong(safeAudio, bio, persona.id, audioContextReport, lyrics, currentArtist, currentTitle, isBand, fashionContextResult || undefined)
                            .then(res => ({ id: persona.id, data: res }))
                            .catch(e => null);
                    });

                    const responses = await Promise.all(promises);

                    let successCount = 0;
                    responses.forEach(r => {
                        if (r) {
                            newResults[r.id] = r.data;
                            successCount++;
                        }
                    });

                    if (successCount === 0 && Object.keys(newResults).length === 0) {
                        toast.error(`Analisi fallita per ${currentTitle}. Vado avanti.`);
                        continue; // Salta al prossimo brano
                    }

                    // Calculate Averages
                    const musicScores = Object.entries(newResults)
                        .filter(([id]) => PERSONAS[id].type !== 'fashion')
                        .map(([_, r]) => r.lyricalAnalysis.finalScore);

                    let extractedAvgScore: number | null = null;
                    if (musicScores.length > 0) {
                        const avg = musicScores.reduce((a, b) => a + b, 0) / musicScores.length;
                        extractedAvgScore = Math.round(avg * 10) / 10;
                        setAverageScore(extractedAvgScore);
                    }

                    const fashionScores = Object.entries(newResults)
                        .filter(([id]) => PERSONAS[id].type === 'fashion')
                        .map(([_, r]) => r.lyricalAnalysis.finalScore);

                    let extractedAvgAestheticScore: number | null = null;
                    if (fashionScores.length > 0) {
                        const avgF = fashionScores.reduce((a, b) => a + b, 0) / fashionScores.length;
                        extractedAvgAestheticScore = Math.round(avgF * 10) / 10;
                        setAverageAestheticScore(extractedAvgAestheticScore);
                    }

                    setResults(newResults);

                    // Start playing the local file immediately (solo se non è batch, altrimenti casinò)
                    if (!isBatch && currentAudio && import.meta.env.VITE_ENABLE_AUDIO_STORAGE !== 'false') {
                        const localUrl = URL.createObjectURL(currentAudio);
                        playTrack(localUrl, currentTitle, currentArtist);
                    }

                    // Trigger Editor Synthesis (only visual in single, but needed for save in batch)
                    setIsSynthesizing(true);
                    let synthesisText = "";
                    try {
                        synthesisText = await synthesizeReviews(newResults);
                        setSynthesis(synthesisText);
                    } finally {
                        setIsSynthesizing(false);
                    }

                    // Save to MongoDB
                    try {
                        let audioUrl = null;
                        let audioHash = null;

                        if (currentAudio) {
                            try {
                                audioHash = await calculateSHA256(currentAudio);

                                // Skip Blob upload if storage is disabled via ENV
                                if (import.meta.env.VITE_ENABLE_AUDIO_STORAGE === 'false') {
                                    console.log("Audio storage disabled via ENV. Skipping Blob upload.");
                                } else {
                                    // Check if file is already on Vercel Blob
                                    const checkRes = await fetch('/api/checkAudioHash', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ audioHash })
                                    });

                                    const checkData = await checkRes.json();

                                    if (checkData.exists && checkData.audioUrl) {
                                        audioUrl = checkData.audioUrl;
                                        console.log("Audio deduplicato! Uso l'URL esistente:", audioUrl);
                                    } else {
                                        if (!isBatch) toast.info("Upload in corso (salvataggio audio storico)...");
                                        const blobResult = await upload(currentAudio.name, currentAudio, {
                                            access: 'public',
                                            handleUploadUrl: '/api/uploadToken',
                                        });
                                        audioUrl = blobResult.url;
                                    }
                                }
                            } catch (blobError) {
                                console.warn("Upload audio fallito (l'analisi verrà comunque salvata)", blobError);
                                if (!isBatch) toast.warning("Audio o hash fallito, il player storico potrebbe non avere la traccia.");
                            }
                        }

                        const reqBody = {
                            results: newResults,
                            synthesis: synthesisText,
                            averageScore: extractedAvgScore,
                            averageAestheticScore: extractedAvgAestheticScore,
                            metadata: { artistName: currentArtist, songTitle: currentTitle, isBand },
                            tag,
                            fashionCritique: fashionContextResult || undefined,
                            audioUrl: audioUrl,
                            audioHash: audioHash // we save the hash to use it for future deduplications
                        };

                        const headers: HeadersInit = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;

                        const saveResponse = await fetch('/api/saveAnalysis', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(reqBody)
                        });

                        if (!saveResponse.ok) {
                            console.error(`Failed to save analysis for ${currentTitle}.`);
                        }
                    } catch (e) {
                        console.error(`Error saving analysis for ${currentTitle}:`, e);
                    }

                } else {
                    toast.error("La modalità singola è deprecata in questa vista.");
                    break;
                }
            } // fine for loop (batch)

            // Redirect alla fine
            if (isBatch) {
                toast.success("Analisi Batch completata!");
                navigate('/history');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            console.error(err);
            toast.error("Si è verificato un errore critico durante l'elaborazione.");
        } finally {
            setIsLoading(false);
            setBatchProgress(null);
        }
    };

    const handleAudioAnalysis = async (audio: File) => {
        setIsLoading(true);
        try {
            const report = await extractAudioFeatures(audio);
            setAudioAnalysisReport(report);
            navigate('/dashboard');
        } catch (err) {
            toast.error("Errore durante l'analisi tecnica dell'audio.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-20">
            <header className="pt-8 pb-8 text-center px-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
                        <Headphones className="text-white" size={28} />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Il Circolo dei Critici Musicali di Saremo
                    </h1>
                </div>
                <p className="text-gray-500 max-w-md mx-auto">
                    Carica il tuo brano e fatti giudicare spietatamente dai nostri critici artificiali.
                </p>
            </header>

            <main className="container mx-auto">
                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-bold text-white mb-4">Il Giudizio Universale</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Ottieni un'analisi completa e simultanea da tutti i critici del circolo.
                        </p>
                    </div>

                    {batchProgress && (
                        <div className="mb-8 p-4 bg-indigo-900/40 border border-indigo-500/50 rounded-xl max-w-2xl mx-auto animate-in fade-in text-center">
                            <p className="font-bold text-indigo-300 mb-2">Analisi Batch in corso ({batchProgress.current} / {batchProgress.total})</p>
                            <div className="w-full bg-gray-800 rounded-full h-2.5 mb-2 mt-2">
                                <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-400">Elaborando: {batchProgress.itemName}</p>
                        </div>
                    )}

                    <AnalysisForm
                        onAnalyze={handleAnalyze as any} // Cast as any per superare l'errore type durante refactor
                        onAudioAnalysis={handleAudioAnalysis}
                        isLoading={isLoading}
                        allowSingle={false}
                        allowAll={true}
                    />
                </section>
            </main>

            <footer className="text-center text-gray-600 text-sm mt-20">
                <p>Powered by Gemini Multimodal API</p>
            </footer>
        </div>
    );
};
