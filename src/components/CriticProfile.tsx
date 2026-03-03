import React from 'react';
import { CriticPersona } from '../types';
import * as Icons from 'lucide-react';
import { X, Play, Quote } from 'lucide-react';

interface CriticProfileProps {
    persona: CriticPersona;
    onClose: () => void;
    onTest: () => void;
}

const CriticProfile: React.FC<CriticProfileProps> = ({ persona, onClose, onTest }) => {
    const IconComponent = (Icons as any)[persona.icon] || Icons.User;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-dark-surface border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Image/Color Area */}
                <div className={`h-32 w-full bg-gradient-to-r ${persona.color.replace('text-', 'from-').replace('400', '900/50')} to-transparent relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-4">
                        <button
                            onClick={onClose}
                            className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <IconComponent className="absolute -bottom-6 right-8 text-white/10 rotate-12" size={120} />
                </div>

                {/* Content */}
                <div className="p-8 -mt-12 relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-dark-surface rounded-2xl shadow-xl border border-gray-700">
                            <IconComponent size={40} className={persona.color} />
                        </div>
                        <div>
                            <h2 className={`text-3xl font-bold ${persona.color}`}>{persona.name}</h2>
                            <p className="text-gray-400 text-sm">Il Critico Musicale</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <Quote className="text-gray-600 mb-2" size={20} />
                            <p className="text-gray-200 italic leading-relaxed text-lg">
                                "{persona.description}"
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Personalità & Tratti</h3>
                            <p className="text-gray-300 leading-relaxed text-sm">
                                {persona.traits}
                            </p>
                        </div>

                        {persona.rubric && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Criteri di Giudizio</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(persona.rubric).map(([key, value]) => (
                                        <div key={key} className="bg-dark-bg p-3 rounded-lg border border-gray-800 text-sm animate-in fade-in duration-500">
                                            <span className="font-semibold text-gray-300 block mb-1">{key}</span>
                                            <span className="text-xs text-gray-500">{(value as any).interpretation}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 mt-6 border-t border-gray-800 flex justify-end gap-4">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-medium"
                            >
                                Chiudi
                            </button>
                            <button
                                onClick={onTest}
                                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2"
                            >
                                <Play size={18} fill="currentColor" />
                                Testa {persona.name}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CriticProfile;
