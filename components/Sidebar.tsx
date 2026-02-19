import React from 'react';
import { PERSONAS } from '../constants';
import { PersonaId } from '../types';
import * as Icons from 'lucide-react';

interface SidebarProps {
    onSelectCritic: (id: PersonaId) => void;
    selectedCriticId?: PersonaId | null; // Optional highlighting
    onNewAnalysis: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectCritic, selectedCriticId, onNewAnalysis }) => {
    return (
        <aside className="w-full md:w-64 bg-dark-surface border-r border-gray-800 flex flex-col h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-800 space-y-4">
                <button
                    onClick={onNewAnalysis}
                    className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-700 text-sm font-bold"
                >
                    <Icons.RotateCcw size={16} />
                    Nuova Analisi
                </button>
                <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        I Nostri Critici
                    </h2>
                    <p className="text-xs text-gray-500 mt-2">Seleziona un esperto per conoscerlo meglio.</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                {/* Music Critics Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                        I Nostri Critici Musicali
                    </h3>
                    <div className="space-y-1">
                        {Object.values(PERSONAS)
                            .filter(p => !p.type || p.type === 'music')
                            .map((persona) => {
                                const IconComponent = (Icons as any)[persona.icon] || Icons.User;
                                const isSelected = selectedCriticId === persona.id;
                                return (
                                    <button
                                        key={persona.id}
                                        onClick={() => onSelectCritic(persona.id)}
                                        className={`
                                            w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group
                                            ${isSelected
                                                ? 'bg-indigo-900/30 border border-indigo-500/30 text-white'
                                                : 'hover:bg-gray-800/50 text-gray-400 hover:text-white border border-transparent'}
                                        `}
                                    >
                                        <div className={`
                                            p-1.5 rounded-md transition-colors 
                                            ${isSelected ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-gray-800 group-hover:bg-gray-700'}
                                        `}>
                                            <IconComponent size={16} className={isSelected ? 'text-white' : persona.color} />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <div className={`font-semibold text-sm ${persona.color} truncate`}>{persona.name}</div>
                                            <div className="text-xs text-gray-500 truncate">{persona.subtitle}</div>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Fashion Critics Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2 border-t border-gray-800 pt-4">
                        I Nostri Critici Fashion
                    </h3>
                    <div className="space-y-1">
                        {Object.values(PERSONAS)
                            .filter(p => p.type === 'fashion')
                            .map((persona) => {
                                const IconComponent = (Icons as any)[persona.icon] || Icons.User;
                                const isSelected = selectedCriticId === persona.id;
                                return (
                                    <button
                                        key={persona.id}
                                        onClick={() => onSelectCritic(persona.id)}
                                        className={`
                                            w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group
                                            ${isSelected
                                                ? 'bg-pink-900/30 border border-pink-500/30 text-white' // Specific styling for fashion selection? or keep consistent? Let's keep consistent but maybe slight pink hint
                                                : 'hover:bg-gray-800/50 text-gray-400 hover:text-white border border-transparent'}
                                        `}
                                    >
                                        <div className={`
                                            p-1.5 rounded-md transition-colors 
                                            ${isSelected ? 'bg-pink-600 shadow-lg shadow-pink-500/20' : 'bg-gray-800 group-hover:bg-gray-700'}
                                        `}>
                                            <IconComponent size={16} className={isSelected ? 'text-white' : persona.color} />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <div className={`font-semibold text-sm ${persona.color} truncate`}>{persona.name}</div>
                                            <div className="text-xs text-gray-500 truncate">{persona.subtitle}</div>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            </nav>

            <div className="p-4 border-t border-gray-800 text-center">
                <p className="text-xs text-gray-600">© 2024 Saremo</p>
            </div>
        </aside>
    );
};

export default Sidebar;
