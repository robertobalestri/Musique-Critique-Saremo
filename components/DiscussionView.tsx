import React, { useState, useEffect, useRef } from 'react';
import { PersonaId, DiscussionMessage, AnalysisResponse } from '../types';
import { PERSONAS } from '../constants';
import { Play, Pause, RotateCcw, MessageSquare } from 'lucide-react';
import { generateDiscussionTurn } from '../services/geminiService';

interface DiscussionViewProps {
  results: Record<string, AnalysisResponse>;
}

const DiscussionView: React.FC<DiscussionViewProps> = ({ results }) => {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [turns, setTurns] = useState(5);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Available personas for the chat (only those who have results)
  const availablePersonas = Object.keys(results) as PersonaId[];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartDiscussion = async () => {
    setIsPlaying(true);
    let currentHistory = [...messages];
    
    // Create a loop for the number of turns requested
    for (let i = 0; i < turns; i++) {
        // Pick a random speaker who is NOT the last speaker
        let nextSpeakerId: PersonaId;
        if (currentHistory.length > 0) {
            const lastSpeaker = currentHistory[currentHistory.length - 1].personaId;
            const others = availablePersonas.filter(p => p !== lastSpeaker);
            nextSpeakerId = others[Math.floor(Math.random() * others.length)];
        } else {
            nextSpeakerId = availablePersonas[Math.floor(Math.random() * availablePersonas.length)];
        }

        // 1. Create a placeholder message to show loading animation
        const newMessage: DiscussionMessage = {
            personaId: nextSpeakerId,
            text: '', // Empty text triggers the "loading dots" animation
            timestamp: Date.now()
        };
        currentHistory.push(newMessage);
        setMessages([...currentHistory]); // Render the loading state

        try {
            // 2. Fetch the full response (Wait for it)
            // Pass history excluding the empty one we just added
            const fullText = await generateDiscussionTurn(
                nextSpeakerId, 
                currentHistory.slice(0, -1), 
                results[nextSpeakerId]
            );

            // 3. Update the message with the actual text
            currentHistory[currentHistory.length - 1].text = fullText;
            setMessages([...currentHistory]);
            
        } catch (e) {
            console.error("Chat error", e);
            currentHistory[currentHistory.length - 1].text = "Hmm, non so cosa dire...";
            setMessages([...currentHistory]);
        }
        
        // Small delay between turns for readability
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    setIsPlaying(false);
  };

  return (
    <div className="mt-12 bg-dark-surface border border-gray-800 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
      <div className="p-6 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <MessageSquare size={24} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">Tavola Rotonda</h3>
                <p className="text-sm text-gray-400">I critici discutono tra loro in tempo reale</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-gray-400">
                <label>Turni:</label>
                <select 
                    value={turns} 
                    onChange={(e) => setTurns(Number(e.target.value))}
                    disabled={isPlaying}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500"
                >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                </select>
             </div>
             
             {!isPlaying ? (
                 <button 
                    onClick={handleStartDiscussion}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-all"
                 >
                    <Play size={18} /> Avvia Dibattito
                 </button>
             ) : (
                 <button 
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg font-bold cursor-not-allowed"
                 >
                    <Pause size={18} /> In corso...
                 </button>
             )}
             
             <button 
                onClick={() => setMessages([])}
                disabled={isPlaying || messages.length === 0}
                className="p-2 text-gray-500 hover:text-white transition-colors"
                title="Reset Chat"
             >
                <RotateCcw size={18} />
             </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="h-[500px] overflow-y-auto p-6 space-y-4 bg-[#0f0f11] scroll-smooth"
      >
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                <MessageSquare size={48} className="mb-4" />
                <p>Nessuna discussione avviata.</p>
                <p className="text-sm">Premi "Avvia Dibattito" per far litigare i critici.</p>
            </div>
        ) : (
            messages.map((msg, idx) => {
                const persona = PERSONAS[msg.personaId];
                const isLeft = idx % 2 === 0; // Alternating sides
                
                return (
                    <div key={idx} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-800 border-2 ${persona.color.replace('text-', 'border-')} text-2xl`}>
                                <span className={`font-bold ${persona.color}`}>{persona.name.charAt(0)}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 mt-1 max-w-[60px] text-center leading-tight">{persona.name}</span>
                        </div>
                        
                        <div className={`flex-1 max-w-[80%] p-4 rounded-2xl ${isLeft ? 'bg-dark-surface rounded-tl-none' : 'bg-gray-800/50 rounded-tr-none'}`}>
                            {msg.text ? (
                                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                                    {msg.text}
                                </p>
                            ) : (
                                <div className="flex gap-1 h-5 items-center">
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default DiscussionView;