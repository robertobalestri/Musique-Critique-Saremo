import React, { useState } from 'react';
import { useAnalysis } from '../contexts/AnalysisContext';
import { PERSONAS } from '../constants';
import { Loader2, Scissors, RotateCcw, Download, ArrowLeft } from 'lucide-react';
import { exportToCSV } from '../services/exportService';
import { exportToHTML } from '../services/htmlExportService';
import AudioFeatureView from '../components/AudioFeatureView';
import CritiqueView from '../components/CritiqueView';
import { useNavigate } from 'react-router-dom';
import { PersonaId } from '../types';

export const DashboardView: React.FC = () => {
    const {
        results,
        audioAnalysisReport,
        synthesis,
        isSynthesizing,
        averageScore,
        averageAestheticScore,
        metadata,
        lastAnalysisRequest,
        activeResultPersona,
        setActiveResultPersona,
        resetAnalysis
    } = useAnalysis();

    const navigate = useNavigate();

    if (audioAnalysisReport) {
        return (
            <AudioFeatureView
                report={audioAnalysisReport}
                onClose={() => {
                    resetAnalysis();
                    navigate('/');
                }}
            />
        );
    }

    if (!results) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400">Nessuna analisi attiva. Torna alla home.</p>
                <button onClick={() => navigate('/')} className="mt-4 text-indigo-400 hover:underline">Vai alla Home</button>
            </div>
        );
    }

    const personaIds = (Object.keys(results) as PersonaId[]).filter(id => PERSONAS[id]);
    const isMultiMode = personaIds.length > 1;

    if (activeResultPersona !== 'ALL' && results[activeResultPersona] && PERSONAS[activeResultPersona]) {
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-in slide-in-from-right-8 fade-in">
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
                    metadata={metadata}
                    fashionCritique={lastAnalysisRequest?.fashionCritique}
                    onReset={() => {
                        resetAnalysis();
                        navigate('/');
                    }}
                />
            </div>
        );
    }

    const musicIds = personaIds.filter(id => PERSONAS[id].type !== 'fashion');
    const fashionIds = personaIds.filter(id => PERSONAS[id].type === 'fashion');

    const getSafeFilename = (ext: string) => {
        const artist = metadata.artistName.trim() || 'Artista_Sconosciuto';
        const title = metadata.songTitle.trim() || 'Brano_Sconosciuto';
        const safeArtist = artist.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        return `${safeArtist}_${safeTitle}.${ext}`.toLowerCase();
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-10 fade-in duration-500 space-y-12">
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
                    onClick={() => {
                        resetAnalysis();
                        navigate('/');
                    }}
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
