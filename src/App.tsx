import React, { useState } from 'react';
import { Menu, X, MessageSquare, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import RoundtableSidebar from './components/RoundtableSidebar';
import AuthModal from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import { useAnalysis } from './contexts/AnalysisContext';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { DashboardView } from './pages/DashboardView';
import HistoryView from './components/HistoryView';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
import { PERSONAS } from './constants';
import { generateDiscussionTurn } from './services/geminiService';
import { PersonaId, DiscussionMessage } from './types';

// Temporarily moved here for the roundtable chat since we removed it from global state
// To fully decouple, we should extract roundtable to a context, but we keep it here for now as a global overlay.
export default function App() {
  const { user } = useAuth();
  const {
    results,
    lastAnalysisRequest,
    resetAnalysis,
    setResults,
    setSynthesis,
    setAverageScore,
    setAverageAestheticScore,
    setMetadata,
    setLastAnalysisRequest,
    activeResultPersona,
    setActiveResultPersona
  } = useAnalysis();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Roundtable State
  const [isRoundtableOpen, setIsRoundtableOpen] = useState(false);
  const [activeRoundtable, setActiveRoundtable] = useState<'music' | 'fashion' | 'all'>('music');
  const [discussionMessages, setDiscussionMessages] = useState<Record<'music' | 'fashion' | 'all', DiscussionMessage[]>>({
    music: [],
    fashion: [],
    all: []
  });
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleAutoDiscussion = async (count: number) => {
    if (!lastAnalysisRequest) return;
    setIsChatLoading(true);
    try {
      const currentMode = activeRoundtable;
      let currentHistory = [...discussionMessages[currentMode]];
      let lastSpeakerId: PersonaId | null = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1].personaId : null;

      for (let i = 0; i < count; i++) {
        const availablePersonas = Object.values(PERSONAS).filter(p => {
          if (activeRoundtable === 'music') return (!p.type || p.type === 'music');
          if (activeRoundtable === 'fashion') return (p.type === 'fashion');
          return true;
        });

        const candidates = availablePersonas.filter(p => p.id !== lastSpeakerId);
        const pool = candidates.length > 0 ? candidates : availablePersonas;
        const randomPersona = pool[Math.floor(Math.random() * pool.length)];

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

        setDiscussionMessages(prev => ({
          ...prev,
          [currentMode]: [...prev[currentMode], newMessage]
        }));
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

  const handleNewAnalysis = () => {
    resetAnalysis();
    navigate('/');
    setIsSidebarOpen(false);
  };

  const handleShowHistory = () => {
    resetAnalysis();
    navigate('/history');
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 font-sans selection:bg-accent-primary selection:text-white flex overflow-hidden">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:block h-screen sticky top-0">
        <Sidebar
          onSelectCritic={(id) => {
            setActiveResultPersona(id);
            navigate('/dashboard');
          }}
          selectedCriticId={activeResultPersona !== 'ALL' ? activeResultPersona : null}
          onNewAnalysis={handleNewAnalysis}
          onShowHistory={handleShowHistory}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      </div>

      {/* Sidebar (Mobile Overlay) */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64">
            <Sidebar
              onSelectCritic={(id) => {
                setActiveResultPersona(id);
                navigate('/dashboard');
                setIsSidebarOpen(false);
              }}
              onNewAnalysis={handleNewAnalysis}
              onShowHistory={handleShowHistory}
              onOpenAuth={() => {
                setIsAuthModalOpen(true);
                setIsSidebarOpen(false);
              }}
            />
          </div>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
        </div>
      )}

      {/* Right Sidebar - Roundtable Overlay */}
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

        {/* Background decoration */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
        </div>

        {/* Desktop Roundtable Toggle */}
        {results && !isRoundtableOpen && (
          <button
            onClick={() => setIsRoundtableOpen(true)}
            className="hidden md:flex fixed top-4 right-4 z-50 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-lg items-center gap-2 transition-transform hover:scale-105"
          >
            <MessageSquare size={18} />
            <span className="font-bold">Tavola Rotonda</span>
          </button>
        )}

        {/* ROUTER OUTLET */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route
            path="/history"
            element={
              <div className="max-w-6xl mx-auto p-4 md:p-8 pb-20">
                <HistoryView
                  onBack={() => navigate('/')}
                  onViewAnalysis={(item: any) => {
                    setResults(item.results);
                    setSynthesis(item.synthesis || null);
                    setAverageScore(item.averageScore || null);
                    setAverageAestheticScore(item.averageAestheticScore || null);
                    setMetadata(item.metadata || null);
                    setLastAnalysisRequest({
                      artist: item.metadata?.artistName || '',
                      title: item.metadata?.songTitle || '',
                      bio: '',
                      lyrics: '',
                      fashionCritique: item.fashionCritique || undefined
                    });
                    setActiveResultPersona('ALL');
                    navigate('/dashboard');
                  }}
                />
              </div>
            }
          />
        </Routes>
      </div>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Global Audio Player */}
      {import.meta.env.VITE_ENABLE_AUDIO_STORAGE !== 'false' && <GlobalAudioPlayer />}
    </div>
  );
}