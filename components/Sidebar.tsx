import React from 'react';
import { PERSONAS } from '../constants';
import { PersonaId } from '../types';
import * as Icons from 'lucide-react';

interface SidebarProps {
    onSelectCritic: (id: PersonaId) => void;
    selectedCriticId?: PersonaId | null; // Optional highlighting
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectCritic, selectedCriticId }) => {
    return (
        <aside className="w-full md:w-64 bg-dark-surface border-r border-gray-800 flex flex-col h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    I Nostri Critici
                </h2>
                <p className="text-xs text-gray-500 mt-2">Seleziona un esperto per conoscerlo meglio.</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {Object.values(PERSONAS).map((persona) => {
                    // Dynamic Icon
                    const IconComponent = (Icons as any)[persona.icon] || Icons.User;

                    return (
                        <button
                            key={persona.id}
                            onClick={() => onSelectCritic(persona.id)}
                            className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group
                ${selectedCriticId === persona.id
                                    ? 'bg-indigo-900/30 border border-indigo-500/30 text-white'
                                    : 'hover:bg-gray-800/50 text-gray-400 hover:text-white border border-transparent'}
              `}
                        >
                            <div className={`
                p-2 rounded-md transition-colors 
                ${selectedCriticId === persona.id ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-gray-800 group-hover:bg-gray-700'}
              `}>
                                <IconComponent size={18} className={selectedCriticId === persona.id ? 'text-white' : persona.color} />
                            </div>

                            <div>
                                <div className={`font-semibold text-sm ${persona.color}`}>{persona.name}</div>
                                {/* Optional: Tiny description or role if needed, kept minimal for sidebar */}
                            </div>
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800 text-center">
                <p className="text-xs text-gray-600">© 2024 Saremo</p>
            </div>
        </aside>
    );
};

export default Sidebar;
