import React, { useState } from 'react';
import { PersonaId, AnalysisResponse } from './types';
import { PERSONAS } from './constants';
import PersonaSelector from './components/PersonaSelector';
import AnalysisForm from './components/AnalysisForm';
import CritiqueView from './components/CritiqueView';
import DiscussionView from './components/DiscussionView';

import { analyzeSong, synthesizeReviews } from './services/geminiService';
import { extractAudioFeatures } from './services/audioAnalysisService';
import { exportToCSV } from './services/exportService';
import AudioFeatureView from './components/AudioFeatureView';
import { Headphones, Grid, User, Music, Share2, Download, RotateCcw } from 'lucide-react';

function App() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('traditionalist');
  // Store results keyed by PersonaId
  const [results, setResults] = useState<Record<string, AnalysisResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioAnalysisReport, setAudioAnalysisReport] = useState<string | null>(null);

  // New State for Synthesis
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [averageScore, setAverageScore] = useState<number | null>(null);


  // State to toggle between single result view (if multiple exist)
  const [activeResultPersona, setActiveResultPersona] = useState<PersonaId | 'ALL'>('ALL');

  const handleAnalyze = async (audio: File | undefined, bio: string, analyzeAll: boolean, lyrics: string) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setAudioAnalysisReport(null);

    try {
      // 1. Extract Audio Features first (for context) - only if audio exists
      let audioContextReport = "Analisi solo testuale (Audio non fornito).";
      if (audio) {
        try {
          audioContextReport = await extractAudioFeatures(audio);
        } catch (e) {
          console.warn("Audio analysis context failed", e);
          audioContextReport = "Analisi tecnica fallita.";
        }
      }

      const safeAudio = audio || undefined; // Ensure undefined if null

      if (analyzeAll) {
        // Parallel requests
        const promises = Object.values(PERSONAS).map(persona =>
          analyzeSong(safeAudio, bio, persona.id, audioContextReport, lyrics)
            .then(res => ({ id: persona.id, data: res }))
            .catch(e => {
              console.error(`Error analyzing with ${persona.name}`, e);
              return null;
            })
        );

        const responses = await Promise.all(promises);

        const newResults: Record<string, AnalysisResponse> = {};
        let successCount = 0;

        responses.forEach(r => {
          if (r) {
            newResults[r.id] = r.data;
            successCount++;
          }
        });

        if (successCount === 0) throw new Error("Tutte le analisi sono fallite.");

        // Calculate Average Score
        const scores = Object.values(newResults).map(r => r.lyricalAnalysis.finalScore);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        setAverageScore(Math.round(avg * 10) / 10); // Round to 1 decimal

        setResults(newResults);
        setActiveResultPersona('ALL');

        // Trigger Editor Synthesis
        synthesizeReviews(newResults).then(text => setSynthesis(text));

      } else {
        // Single request
        const response = await analyzeSong(safeAudio, bio, selectedPersona, audioContextReport, lyrics);
        setResults({ [selectedPersona]: response });
        setActiveResultPersona(selectedPersona);
      }
    } catch (err) {
      console.error(err);
      setError("Si è verificato un errore durante l'analisi. Riprova più tardi o controlla la tua chiave API.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioAnalysis = async (audio: File) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setAudioAnalysisReport(null);

    try {
      const report = await extractAudioFeatures(audio);
      setAudioAnalysisReport(report);
    } catch (err) {
      console.error(err);
      setError("Errore durante l'analisi tecnica dell'audio.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAnalysis = () => {

    setResults(null);
    setAudioAnalysisReport(null);
    setSynthesis(null);
    setAverageScore(null);
    setError(null);

    setActiveResultPersona('ALL');
  };

  // Helper to determine what to render
  const renderResults = () => {
    if (audioAnalysisReport) {
      return (
        <AudioFeatureView
          report={audioAnalysisReport}
          onClose={resetAnalysis}
        />
      );
    }

    if (!results) return null;

    const personaIds = Object.keys(results) as PersonaId[];
    const isMultiMode = personaIds.length > 1;

    // View specific persona result
    if (activeResultPersona !== 'ALL' && results[activeResultPersona]) {
      return (
        <div className="space-y-6">
          {isMultiMode && (
            <button
              onClick={() => setActiveResultPersona('ALL')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              ← Torna alla Panoramica
            </button>
          )}
          <CritiqueView
            result={results[activeResultPersona]}
            personaId={activeResultPersona as PersonaId}
            onReset={resetAnalysis}
          />
        </div>
      );
    }

    // View 'Dashboard' for multiple results
    return (
      <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 space-y-12">

        {/* Editorial Header */}
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">
            Il Giudizio Universale
          </h2>

          {averageScore !== null && (
            <div className="inline-flex items-center gap-3 bg-gray-800/50 border border-gray-700 px-6 py-3 rounded-full backdrop-blur-sm">
              <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Media Critica</span>
              <div className="text-3xl font-black text-white">{averageScore}</div>
              <span className="text-gray-500 text-sm">/100</span>
            </div>
          )}

          {synthesis && (
            <div className="max-w-3xl mx-auto mt-6 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 p-8 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
              <h3 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-4 flex justify-center items-center gap-2">
                <span className="w-8 h-[1px] bg-amber-500/50"></span>
                Verdetto Editoriale
                <span className="w-8 h-[1px] bg-amber-500/50"></span>
              </h3>
              <p className="text-xl font-serif italic text-gray-200 leading-relaxed">
                "{synthesis}"
              </p>
            </div>
          )}
        </div>

        {/* Grid of Mini Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {personaIds.map(id => {
            const result = results[id];
            const persona = PERSONAS[id];
            return (
              <div
                key={id}
                onClick={() => setActiveResultPersona(id)}
                className="bg-dark-surface border border-gray-800 rounded-xl p-6 hover:border-gray-500 cursor-pointer transition-all hover:-translate-y-1 shadow-lg group relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${persona.color.replace('text-', 'bg-')}`}></div>
                <h3 className={`font-bold text-lg mb-2 ${persona.color}`}>{persona.name}</h3>
                <div className="text-4xl font-bold text-white mb-2">
                  {result.lyricalAnalysis.finalScore}
                  <span className="text-sm text-gray-500 font-normal">/100</span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-3 italic">"{result.lyricalAnalysis.interpretation}"</p>
                <div className="mt-4 text-xs font-mono text-gray-600 group-hover:text-gray-300">Clicca per dettagli</div>
              </div>
            );
          })}
        </div>

        {/* The Discussion Component */}
        <DiscussionView results={results} />

        <div className="flex justify-center gap-4 mt-12">
          <button
            onClick={resetAnalysis}
            className="px-6 py-3 border border-gray-700 text-gray-300 rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={18} /> Nuova Analisi
          </button>

          <button
            onClick={() => results && exportToCSV(results, `analisi_musicale_${Date.now()}.csv`)}
            className="px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download size={18} /> Esporta CSV
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans selection:bg-accent-primary selection:text-white pb-20">

      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="pt-12 pb-8 text-center px-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Headphones className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Il Circolo dei Critici Musicali di Saremo
          </h1>
        </div>
        <p className="text-gray-500 max-w-md mx-auto">
          Carica il tuo brano e fatti giudicare spietatamente (o amabilmente) dai nostri critici artificiali.
        </p>
      </header>

      <main className="container mx-auto px-4">
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {!results && !audioAnalysisReport ? (
          <>
            <section className="mb-12">
              <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center justify-center gap-2">
                <User size={16} /> 1. Scegli il tuo Critico (per analisi singola)
              </h2>
              <PersonaSelector
                selectedPersona={selectedPersona}
                onSelect={setSelectedPersona}
              />
            </section>

            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-gray-500 mb-6 flex items-center justify-center gap-2">
                <Music size={16} /> 2. Carica Musica & Info
              </h2>
              <AnalysisForm
                onAnalyze={handleAnalyze}
                onAudioAnalysis={handleAudioAnalysis}
                isLoading={isLoading}
              />
            </section>
          </>
        ) : (
          renderResults()
        )}
      </main>

      <footer className="text-center text-gray-600 text-sm mt-20">
        <p>Powered by Gemini Multimodal API</p>
      </footer>
    </div>
  );
}

export default App;