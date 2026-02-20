import React, { useState, useEffect } from 'react';
import { Menu, X, Scissors, MessageSquare, Headphones, Download, RotateCcw, User, Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RoundtableSidebar from './components/RoundtableSidebar';
import AnalysisForm from './components/AnalysisForm';
import CritiqueView from './components/CritiqueView';
import CriticProfile from './components/CriticProfile';
import AudioFeatureView from './components/AudioFeatureView';
import { analyzeSong, generateDiscussionTurn, analyzeFashion, synthesizeReviews } from './services/geminiService';
import { extractAudioFeatures } from './services/audioAnalysisService';
import { exportToHTML } from './services/htmlExportService';
import { exportToCSV } from './services/exportService';
import { PersonaId, AnalysisResponse, DiscussionMessage } from './types';
import { PERSONAS } from './constants';

function App() {
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('traditionalist');
  // Store results keyed by PersonaId
  const [results, setResults] = useState<Record<string, AnalysisResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioAnalysisReport, setAudioAnalysisReport] = useState<string | null>(null);
  // BETTER: Switch to fashionCritiques. -> REMOVED
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [averageAestheticScore, setAverageAestheticScore] = useState<number | null>(null); // NEW
  const [metadata, setMetadata] = useState({ artistName: '', songTitle: '', isBand: false });

  // State to toggle between single result view (if multiple exist)
  // Roundtable State
  const [isRoundtableOpen, setIsRoundtableOpen] = useState(false);
  const [activeRoundtable, setActiveRoundtable] = useState<'music' | 'fashion' | 'all'>('music');
  const [discussionMessages, setDiscussionMessages] = useState<Record<'music' | 'fashion' | 'all', DiscussionMessage[]>>({
    music: [],
    fashion: [],
    all: []
  });
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);


  // Analysis Context for Chat
  const [lastAnalysisRequest, setLastAnalysisRequest] = useState<{
    artist: string;
    title: string;
    lyrics?: string;
    bio: string;
    fashionCritique?: string;
  } | null>(null);

  const [activeResultPersona, setActiveResultPersona] = useState<PersonaId | 'ALL'>('ALL');

  // NEW Navigation State
  // NEW Navigation State
  // NEW Navigation State
  const [viewingCritic, setViewingCritic] = useState<PersonaId | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [viewMode, setViewMode] = useState<'HOME' | 'SINGLE'>('HOME');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('saremo_analysis_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.results) setResults(parsed.results);
        if (parsed.audioAnalysisReport) setAudioAnalysisReport(parsed.audioAnalysisReport);
        if (parsed.synthesis) setSynthesis(parsed.synthesis);
        if (parsed.averageScore) setAverageScore(parsed.averageScore);
        if (parsed.averageAestheticScore) setAverageAestheticScore(parsed.averageAestheticScore);
        if (parsed.metadata) setMetadata(parsed.metadata);
        if (parsed.lastAnalysisRequest) setLastAnalysisRequest(parsed.lastAnalysisRequest);
        // Backward compatibility check for array vs object
        if (parsed.discussionMessages) {
          if (Array.isArray(parsed.discussionMessages)) {
            setDiscussionMessages({ music: parsed.discussionMessages, fashion: [], all: [] });
          } else {
            setDiscussionMessages(parsed.discussionMessages);
          }
        }

        // Restore view mode if there were results
        if (parsed.results || parsed.audioAnalysisReport) {
          setViewMode('HOME');
          setActiveResultPersona('ALL');
        }
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save state to local storage whenever relevant state changes
  useEffect(() => {
    if (!isInitialized) return;

    const stateToSave = {
      results,
      audioAnalysisReport,
      synthesis,
      averageScore,
      averageAestheticScore,
      metadata,
      lastAnalysisRequest,
      discussionMessages
    };
    localStorage.setItem('saremo_analysis_state', JSON.stringify(stateToSave));
  }, [results, audioAnalysisReport, synthesis, averageScore, averageAestheticScore, metadata, lastAnalysisRequest, discussionMessages, isInitialized]);

  const handleAnalyze = async (
    audio: File | undefined,
    bio: string,
    analyzeAll: boolean,
    lyrics: string,
    artistName: string,
    songTitle: string,
    isBand: boolean,
    images: File[] // NEW
  ) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setAudioAnalysisReport(null);
    setMetadata({ artistName, songTitle, isBand });

    try {
      const newResults: Record<string, AnalysisResponse> = {};
      let fashionContextResult = "";

      if (analyzeAll) {
        // 0. Analyze Fashion FIRST to build context for music critics
        if (images && images.length > 0) {
          try {
            const fashionPersonas = Object.values(PERSONAS).filter(p => p.type === 'fashion');
            const fashionPromises = fashionPersonas.map(async (p) => {
              try {
                const critique = await analyzeFashion(images, p.id, bio, artistName);
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
                // Build simple summary for music context
                fashionContextResult += `${res.name} (Voto ${res.critique.lyricalAnalysis.finalScore}/100): "${res.critique.lyricalAnalysis.journalisticSummary}"\n\n`;
              }
            });
          } catch (e) {
            console.warn("Fashion analysis failed", e);
          }
        }

        // 1. Extract Audio Features
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

        // Save context for chat
        setLastAnalysisRequest({
          artist: artistName,
          title: songTitle,
          lyrics,
          bio,
          fashionCritique: fashionContextResult || undefined
        });

        // 2. Music Analysis
        const musicPersonas = Object.values(PERSONAS).filter(p => !p.type || p.type === 'music');
        const promises = musicPersonas.map(persona => {
          return analyzeSong(safeAudio, bio, persona.id, audioContextReport, lyrics, artistName, songTitle, isBand, fashionContextResult || undefined)
            .then(res => ({ id: persona.id, data: res }))
            .catch(e => {
              console.error(`Error analyzing with ${persona.name}`, e);
              return null;
            });
        }).filter(p => p !== null);

        const responses = await Promise.all(promises);

        let successCount = 0;
        responses.forEach(r => {
          if (r) {
            newResults[r.id] = r.data;
            successCount++;
          }
        });

        if (successCount === 0 && Object.keys(newResults).length === 0) {
          throw new Error("Tutte le analisi sono fallite.");
        }

        // Calculate Average Scores separately
        const musicScores = Object.entries(newResults)
          .filter(([id]) => PERSONAS[id].type !== 'fashion')
          .map(([_, r]) => r.lyricalAnalysis.finalScore);
        if (musicScores.length > 0) {
          const avg = musicScores.reduce((a, b) => a + b, 0) / musicScores.length;
          setAverageScore(Math.round(avg * 10) / 10);
        } else {
          setAverageScore(null);
        }

        const fashionScores = Object.entries(newResults)
          .filter(([id]) => PERSONAS[id].type === 'fashion')
          .map(([_, r]) => r.lyricalAnalysis.finalScore);
        if (fashionScores.length > 0) {
          const avgF = fashionScores.reduce((a, b) => a + b, 0) / fashionScores.length;
          setAverageAestheticScore(Math.round(avgF * 10) / 10);
        } else {
          setAverageAestheticScore(null);
        }

        setResults(newResults);
        setActiveResultPersona('ALL');
        setViewMode('HOME');

        // Trigger Editor Synthesis using all results
        setIsSynthesizing(true);
        synthesizeReviews(newResults)
          .then(text => setSynthesis(text))
          .finally(() => setIsSynthesizing(false));

      } else {
        // Single request (Handle properly if fashion or music)
        const persona = PERSONAS[selectedPersona];
        let response: AnalysisResponse;

        if (persona.type === 'fashion') {
          response = await analyzeFashion(images, selectedPersona, bio, artistName);
        } else {
          // 1. Extract Audio Features
          let audioContextReport = "Analisi solo testuale (Audio non fornito).";
          if (audio) {
            try {
              audioContextReport = await extractAudioFeatures(audio);
            } catch (e) {
              audioContextReport = "Analisi tecnica fallita.";
            }
          }
          response = await analyzeSong(audio || undefined, bio, selectedPersona, audioContextReport, lyrics, artistName, songTitle, isBand, undefined);
        }

        setResults({ [selectedPersona]: response });
        setActiveResultPersona(selectedPersona);
        setViewMode('SINGLE');
      }

      // Auto-open Roundtable after successful analysis
      setIsRoundtableOpen(true);

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
    setIsSynthesizing(false);
    setAverageScore(null);
    setAverageAestheticScore(null);
    setError(null);
    setActiveResultPersona('ALL');
    setDiscussionMessages({ music: [], fashion: [], all: [] }); // Reset all histories
    setLastAnalysisRequest(null);
    localStorage.removeItem('saremo_analysis_state');
  };

  const handleAutoDiscussion = async (count: number) => {
    if (!lastAnalysisRequest) return;
    setIsChatLoading(true);

    try {
      const currentMode = activeRoundtable;
      let currentHistory = [...discussionMessages[currentMode]];
      let lastSpeakerId: PersonaId | null = currentHistory.length > 0 ? currentHistory[currentMode][currentHistory[currentMode].length - 1].personaId : null;

      for (let i = 0; i < count; i++) {
        // Filter personas based on active roundtable
        const availablePersonas = Object.values(PERSONAS).filter(p => {
          if (activeRoundtable === 'music') return (!p.type || p.type === 'music');
          if (activeRoundtable === 'fashion') return (p.type === 'fashion');
          return true; // 'all' includes everyone
        });

        // Exclude last speaker if possible
        const candidates = availablePersonas.filter(p => p.id !== lastSpeakerId);
        // Fallback to all if candidates empty (shouldn't happen with >1 critic)
        const pool = candidates.length > 0 ? candidates : availablePersonas;

        const randomPersona = pool[Math.floor(Math.random() * pool.length)];

        // Generate turn using CURRENT history (not state, which is stale in loop)
        const turn = await generateDiscussionTurn(
          currentHistory,
          randomPersona.id,
          lastAnalysisRequest.artist,
          lastAnalysisRequest.title,
          results ? results[randomPersona.id] : undefined,
          activeRoundtable === 'fashion' ? (lastAnalysisRequest.fashionCritique) : undefined
        );

        const newMessage: DiscussionMessage = {
          personaId: randomPersona.id,
          text: turn,
          timestamp: Date.now()
        };

        currentHistory = [...currentHistory, newMessage];
        lastSpeakerId = randomPersona.id;

        // Update state progressively for specific mode
        setDiscussionMessages(prev => ({
          ...prev,
          [currentMode]: [...prev[currentMode], newMessage]
        }));

        // Small delay purely for UX pacing? No, let's keep it fast but await.
      }

    } catch (e) {
      console.error("Error generating chat:", e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearRoundtable = () => {
    setDiscussionMessages(prev => ({
      ...prev,
      [activeRoundtable]: []
    }));
  };

  const getSafeFilename = (ext: string) => {
    const artist = metadata.artistName.trim() || 'Artista_Sconosciuto';
    const title = metadata.songTitle.trim() || 'Brano_Sconosciuto';
    const safeArtist = artist.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    return `${safeArtist}_${safeTitle}.${ext}`.toLowerCase();
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

    // Filter out any IDs that might be in localStorage but no longer exist in code
    const personaIds = (Object.keys(results) as PersonaId[]).filter(id => PERSONAS[id]);
    const isMultiMode = personaIds.length > 1;

    // View specific persona result
    if (activeResultPersona !== 'ALL' && results[activeResultPersona] && PERSONAS[activeResultPersona]) {
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

          {/* Back to Home for Single View Mode */}
          {viewMode === 'SINGLE' && !isMultiMode && (
            <button
              onClick={() => {
                resetAnalysis();
                setViewMode('HOME');
                setSelectedPersona('ALL');
              }}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-4 transition-colors font-medium"
            >
              ← Torna alla Homepage del Circolo
            </button>
          )}
          <CritiqueView
            result={results[activeResultPersona]}
            personaId={activeResultPersona as PersonaId}
            metadata={metadata}
            fashionCritique={lastAnalysisRequest?.fashionCritique}
            onReset={resetAnalysis}
          />
        </div>
      );
    }

    const musicIds = personaIds.filter(id => PERSONAS[id].type !== 'fashion');
    const fashionIds = personaIds.filter(id => PERSONAS[id].type === 'fashion');

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
              <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Media Critica Musicale</span>
              <div className="text-3xl font-black text-white">{averageScore}</div>
              <span className="text-gray-500 text-sm">/100</span>
            </div>
          )}

          {(synthesis || isSynthesizing) && (
            <div className="max-w-3xl mx-auto mt-6 bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 p-8 rounded-2xl shadow-xl relative overflow-hidden min-h-[160px] flex flex-col justify-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
              <h3 className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-4 flex justify-center items-center gap-2">
                <span className="w-8 h-[1px] bg-amber-500/50"></span>
                Verdetto Editoriale
                <span className="w-8 h-[1px] bg-amber-500/50"></span>
              </h3>

              {isSynthesizing ? (
                <div className="flex flex-col items-center justify-center gap-3 animate-pulse">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <p className="text-gray-400 italic text-sm">Il Caporedattore sta riassumendo i giudizi...</p>
                </div>
              ) : (
                <p className="text-xl font-serif italic text-gray-200 leading-relaxed text-center">
                  "{synthesis}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Music Critics Grid */}
        {musicIds.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white border-b border-gray-800 pb-2">Critici Musicali</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {musicIds.map(id => {
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
                    <p className="text-xs text-gray-400 italic">"{result.lyricalAnalysis.journalisticSummary}"</p>
                    <div className="mt-4 text-xs font-mono text-gray-600 group-hover:text-gray-300">Clicca per dettagli</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fashion Critics Grid */}
        {fashionIds.length > 0 && (
          <div className="space-y-6 mt-12 bg-gray-900/40 p-6 rounded-2xl border border-pink-900/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <Scissors className="text-pink-500" size={28} />
                <h3 className="text-2xl font-bold text-pink-100">Angolo dello Stile</h3>
              </div>
              {averageAestheticScore !== null && (
                <div className="inline-flex items-center gap-2 bg-pink-900/20 border border-pink-900/50 px-4 py-2 rounded-full">
                  <span className="text-pink-400 uppercase text-xs font-bold tracking-wider">Aesthetic Score</span>
                  <div className="text-xl font-black text-pink-100">{averageAestheticScore}</div>
                  <span className="text-pink-500/70 text-sm">/100</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {fashionIds.map(id => {
                const result = results[id];
                const persona = PERSONAS[id];
                return (
                  <div
                    key={id}
                    onClick={() => setActiveResultPersona(id)}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-pink-500/50 cursor-pointer transition-all hover:-translate-y-1 shadow-lg group relative overflow-hidden backdrop-blur-sm"
                  >
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${persona.color.replace('text-', 'bg-')}`}></div>
                    <h3 className={`font-bold text-lg mb-2 ${persona.color}`}>{persona.name}</h3>
                    <div className="text-4xl font-bold text-white mb-2">
                      {result.lyricalAnalysis.finalScore}
                      <span className="text-sm text-gray-500 font-normal">/100</span>
                    </div>
                    <p className="text-xs text-gray-400 italic">"{result.lyricalAnalysis.journalisticSummary}"</p>
                    <div className="mt-4 text-xs font-mono text-pink-900 group-hover:text-pink-400 transition-colors">Esplora Look</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-12">
          <button
            onClick={resetAnalysis}
            className="px-6 py-3 border border-gray-700 text-gray-300 rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={18} /> Nuova Analisi
          </button>

          <button
            onClick={() => results && exportToCSV(
              results,
              synthesis,
              averageScore,
              metadata,
              getSafeFilename('csv'),
              lastAnalysisRequest?.fashionCritique,
              averageAestheticScore
            )}
            className="px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download size={18} /> Esporta CSV
          </button>

          <button
            onClick={() => results && exportToHTML(
              results,
              synthesis,
              averageScore,
              metadata,
              getSafeFilename('html'),
              lastAnalysisRequest?.fashionCritique,
              averageAestheticScore
            )}
            className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Download size={18} /> Esporta HTML
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans selection:bg-accent-primary selection:text-white flex overflow-hidden">

      {/* Sidebar (Desktop) */}
      <div className="hidden md:block h-screen sticky top-0">
        <Sidebar
          onSelectCritic={setViewingCritic}
          selectedCriticId={viewingCritic}
          onNewAnalysis={resetAnalysis}
        />
      </div>

      {/* Sidebar (Mobile Overlay) */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64">
            <Sidebar onSelectCritic={(id) => {
              setViewingCritic(id);
              setIsSidebarOpen(false);
            }}
              onNewAnalysis={() => {
                resetAnalysis();
                setIsSidebarOpen(false);
              }}
            />
          </div>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* Right Sidebar - Roundtable (Mobile Overlay or Desktop without Results) */}
      <div className={results ? "md:hidden" : ""}>
        <RoundtableSidebar
          isOpen={isRoundtableOpen}
          onClose={() => setIsRoundtableOpen(false)}
          activeRoundtable={activeRoundtable}
          onToggleRoundtable={setActiveRoundtable}
          messages={discussionMessages[activeRoundtable]}
          isChatLoading={isChatLoading}
          onGenerateTurn={handleAutoDiscussion}
          onClearChat={handleClearRoundtable}
          personas={PERSONAS}
          hasContext={!!lastAnalysisRequest}
          variant="overlay"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-y-auto relative w-full">

        {/* Mobile Header Toggle */}
        <div className="md:hidden p-4 flex items-center justify-between border-b border-gray-800 bg-dark-bg/95 backdrop-blur sticky top-0 z-30">
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Saremo AI</span>
          <div className="flex gap-2">
            <button onClick={() => setIsRoundtableOpen(!isRoundtableOpen)} className="p-2 text-gray-400">
              <MessageSquare size={20} />
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400">
              {isSidebarOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Desktop Right Sidebar Toggle (Absolute positioned) - Show only if NO results (i.e. Home) but context exists? 
            actually if no results, we might not want it at all on desktop? 
            Original code showed it ONLY if results. 
            Now we show sidebar STATICALLY if results. 
            So we fully remove this floating toggler for desktop results.
        */}

        {/* Background decoration */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
        </div>

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
              Carica il tuo brano e fatti giudicare spietatamente (o amabilmente) dai nostri critici artificiali.
            </p>
          </header>

          <main className="container mx-auto">
            {error && (
              <div className="max-w-2xl mx-auto mb-8 bg-red-900/20 border border-red-900/50 text-red-200 p-4 rounded-lg text-center">
                {error}
              </div>
            )}

            {!results && !audioAnalysisReport ? (
              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">

                {/* VIEW MODE HANDLING */}
                {viewMode === 'SINGLE' && selectedPersona !== 'ALL' ? (
                  // SINGLE CRITIC MODE (Activated after selecting 'Testa' from profile or clicking a critic in sidebar)
                  <div className="space-y-6">
                    <button
                      onClick={() => {
                        setViewMode('HOME');
                        setSelectedPersona('ALL'); // Reset selected persona when going back to home
                      }}
                      className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors mb-4"
                    >
                      ← Torna alla Homepage del Circolo
                    </button>

                    <div className="bg-dark-surface border border-gray-800 rounded-xl p-6 mb-8 flex items-center gap-4">
                      <div className={`p-4 rounded-full bg-gray-900 ${PERSONAS[selectedPersona].color}`}>
                        <User size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Analisi Singola: {PERSONAS[selectedPersona].name}</h2>
                        <p className="text-gray-400 text-sm">Questo critico analizzerà il tuo brano secondo i suoi canoni specifici.</p>
                      </div>
                    </div>

                    <AnalysisForm
                      onAnalyze={handleAnalyze}
                      onAudioAnalysis={handleAudioAnalysis}
                      isLoading={isLoading}
                      allowSingle={true}
                      allowAll={false}
                      singleCriticName={PERSONAS[selectedPersona].name}
                    />
                  </div>
                ) : (
                  // HOME MODE (Default)
                  <>
                    <div className="text-center mb-12">
                      <h2 className="text-2xl font-bold text-white mb-4">Il Giudizio Universale</h2>
                      <p className="text-gray-400 max-w-2xl mx-auto">
                        Ottieni un'analisi completa e simultanea da tutti i critici del circolo, con un verdetto editoriale finale.
                      </p>
                    </div>

                    <AnalysisForm
                      onAnalyze={handleAnalyze}
                      onAudioAnalysis={handleAudioAnalysis}
                      isLoading={isLoading}
                      allowSingle={false}
                      allowAll={true}
                    />
                  </>
                )}

              </section>
            ) : (
              renderResults()
            )}
          </main>

          <footer className="text-center text-gray-600 text-sm mt-20">
            <p>Powered by Gemini Multimodal API</p>
          </footer>
        </div>
      </div>

      {/* Right Sidebar - Static Column (Desktop Only, When Results Exist) */}
      {results && (
        <div className="hidden md:block w-96 shrink-0 h-screen sticky top-0 bg-gray-900 border-l border-gray-800 z-10">
          <RoundtableSidebar
            isOpen={true} // Static mode ignores this, but prop required
            onClose={() => { }} // No-op
            activeRoundtable={activeRoundtable}
            onToggleRoundtable={setActiveRoundtable}
            messages={discussionMessages[activeRoundtable]}
            isChatLoading={isChatLoading}
            onGenerateTurn={handleAutoDiscussion}
            onClearChat={handleClearRoundtable}
            personas={PERSONAS}
            hasContext={!!lastAnalysisRequest}
            variant="static"
          />
        </div>
      )}

      {/* Critic Profile Modal */}
      {viewingCritic && (
        <CriticProfile
          persona={PERSONAS[viewingCritic]}
          onClose={() => setViewingCritic(null)}
          onTest={() => {
            setSelectedPersona(viewingCritic);
            setViewMode('SINGLE');
            setViewingCritic(null);
            // Optional: reset results if any to show the form again
            if (results) resetAnalysis();
          }}
        />
      )}

    </div>
  );
}

export default App;