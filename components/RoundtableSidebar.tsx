import React, { useRef, useEffect } from 'react';
import { X, MessageSquare, Music, Shirt, Loader2, User } from 'lucide-react';
import { CriticPersona, DiscussionMessage } from '../types';

interface RoundtableSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeRoundtable: 'music' | 'fashion';
    onToggleRoundtable: (type: 'music' | 'fashion') => void;
    messages: DiscussionMessage[];
    isChatLoading: boolean;
    onGenerateTurn: () => void;
    personas: Record<string, CriticPersona>;
    hasContext: boolean;
}

const RoundtableSidebar: React.FC<RoundtableSidebarProps> = ({
    isOpen,
    onClose,
    activeRoundtable,
    onToggleRoundtable,
    messages,
    isChatLoading,
    onGenerateTurn,
    personas,
    hasContext
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isChatLoading]);

    // If closed on mobile, render nothing (or use CSS transition)
    // But for simple "overlay" logic:
    // We use fixed positioning.

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/95 backdrop-blur z-10 relative">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="text-indigo-400" size={24} />
                        <h2 className="text-xl font-bold text-white">Tavola Rotonda</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800">
                        <X size={24} />
                    </button>
                </div>

                {/* Toggle Controls */}
                <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => onToggleRoundtable('music')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeRoundtable === 'music'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <Music size={16} />
                            Musica
                        </button>
                        <button
                            onClick={() => onToggleRoundtable('fashion')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeRoundtable === 'fashion'
                                    ? 'bg-pink-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <Shirt size={16} />
                            Fashion
                        </button>
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-500">
                        {activeRoundtable === 'music'
                            ? "Il dibattito musicale tra i critici."
                            : "L'angolo dello stile con Celestino (e ospiti)."}
                    </p>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-13rem)]" ref={scrollRef}>
                    {!hasContext ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                            <MessageSquare size={48} className="mb-4 opacity-20" />
                            <p>Effettua prima un'analisi per avviare la discussione.</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                            <p>Nessun messaggio ancora.</p>
                            <p className="text-sm mt-2">Invita qualcuno a parlare!</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const persona = personas[msg.personaId];
                            const isFashion = activeRoundtable === 'fashion'; // Logic might differ if mixing types
                            // Actually, filter logic is in parent, so assume messages here are relevant or mixed?
                            // The parent handles *generating* new turns based on activeRoundtable, but messages state is shared?
                            // If messages state is shared, we might show mixed messages. 
                            // Usually we'd want separate chat histories or filter by type?
                            // For now simpler: ONE chat history array in App.tsx. 
                            // If specific roundtable is active, maybe we only show relevant messages?
                            // But user might switch back and forth. Let's show all messages for now, or filter if requested.
                            // *Checking requirement*: "Discussion history separate?" -> "Toggle to switch".
                            // If simple toggle, maybe just one list. Let's stick to showing all for simplicity unless filtered.

                            if (!persona) return null;

                            return (
                                <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${persona.color.replace('text-', 'bg-')} bg-opacity-20`}>
                                        <User size={14} className={persona.color} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <span className={`font-bold text-sm ${persona.color}`}>{persona.name}</span>
                                        </div>
                                        <div className="bg-gray-800 rounded-lg rounded-tl-none p-3 text-sm text-gray-300 shadow-sm border border-gray-700/50">
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {isChatLoading && (
                        <div className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-gray-800 shrink-0" />
                            <div className="bg-gray-800 rounded-lg p-3 h-10 w-24" />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-800 bg-gray-900 z-10">
                    <button
                        onClick={onGenerateTurn}
                        disabled={!hasContext || isChatLoading}
                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${!hasContext || isChatLoading
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : activeRoundtable === 'music'
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                            }`}
                    >
                        {isChatLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Sta scrivendo...
                            </>
                        ) : (
                            <>
                                <MessageSquare size={18} />
                                Genera Intervento
                            </>
                        )}
                    </button>
                </div>

            </div>
        </>
    );
};

export default RoundtableSidebar;
