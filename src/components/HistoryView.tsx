import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ArrowLeft, Download, Tag, Activity, FileSpreadsheet, Filter, SortDesc, TrendingUp, Play } from 'lucide-react';
import { AnalysisResponse } from '../types';
import { exportToCSV } from '../services/exportService';
import { exportToHTML } from '../services/htmlExportService';
import { useAuth } from '../contexts/AuthContext';
import { usePersonas } from '../contexts/PersonaContext';
import { toast } from 'sonner';
import { usePlayer } from '../contexts/PlayerContext';
import { API_BASE_URL } from '../config';

interface HistoryItem {
    _id: string;
    results: Record<string, AnalysisResponse>;
    synthesis: string;
    averageScore: number | null;
    averageAestheticScore: number | null;
    metadata: {
        artistName: string;
        songTitle: string;
        isBand: boolean;
    };
    tag: string;
    fashionCritique?: string;
    audioUrl?: string;
    createdAt: string;
}

interface HistoryViewProps {
    onBack: () => void;
    onViewAnalysis: (item: HistoryItem) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack, onViewAnalysis }) => {
    const { token } = useAuth();
    const { playTrack } = usePlayer();
    const { personas: PERSONAS } = usePersonas();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 12;

    // Filters and Sorting States
    const [searchTag, setSearchTag] = useState('');
    const [minMusicScore, setMinMusicScore] = useState<number | ''>('');
    const [sortBy, setSortBy] = useState<string>('dateDesc');

    // Extract available unique tags from history
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        history.forEach(item => {
            if (item.tag) tags.add(item.tag);
        });
        return Array.from(tags).sort();
    }, [history]);

    const fetchHistory = async (pageNum: number, isInitial = false) => {
        if (!isInitial) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE_URL}/db/history?page=${pageNum}&limit=${limit}`, { headers });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.message || 'Impossibile caricare lo storico');
            }
            const data = await response.json();

            if (isInitial) {
                setHistory(data.data || []);
            } else {
                setHistory(prev => [...prev, ...(data.data || [])]);
            }
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchHistory(1, true);
    }, []);

    const handleLoadMore = () => {
        if (page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchHistory(nextPage, false);
        }
    };

    const getSafeFilename = (item: HistoryItem, ext: string) => {
        const artist = item.metadata?.artistName?.trim() || 'Artista_Sconosciuto';
        const title = item.metadata?.songTitle?.trim() || 'Brano_Sconosciuto';
        const safeArtist = artist.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
        return `${safeArtist}_${safeTitle}.${ext}`.toLowerCase();
    };

    // Helper function to extract individual critic scores
    const getCriticScore = (item: HistoryItem, criticId: string): number => {
        if (!item.results || !item.results[criticId]) return -1; // -1 for missing score for proper sort at the bottom
        return item.results[criticId].lyricalAnalysis?.finalScore || -1;
    };

    const filteredAndSortedHistory = useMemo(() => {
        let result = [...history];

        // 1. Filter by Tag
        if (searchTag.trim() !== '') {
            result = result.filter(item =>
                item.tag === searchTag
            );
        }

        // 2. Filter by Minimum Music Score
        if (minMusicScore !== '') {
            const min = Number(minMusicScore);
            result = result.filter(item =>
                item.averageScore !== null && item.averageScore >= min
            );
        }

        // 3. Sort Results
        result.sort((a, b) => {
            switch (sortBy) {
                case 'dateDesc':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'dateAsc':
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'musicScoreDesc':
                    return (b.averageScore || -1) - (a.averageScore || -1);
                case 'fashionScoreDesc':
                    return (b.averageAestheticScore || -1) - (a.averageAestheticScore || -1);
                // Individual Critics
                default: {
                    if (sortBy.startsWith('critic_')) {
                        const criticId = sortBy.replace('critic_', '');
                        return getCriticScore(b, criticId) - getCriticScore(a, criticId);
                    }
                    return 0;
                }
            }
        });

        return result;
    }, [history, searchTag, minMusicScore, sortBy]);

    const exportFilteredViewToCSV = () => {
        if (filteredAndSortedHistory.length === 0) {
            toast.warning("Nessun dato da esportare con i filtri attuali.");
            return;
        }

        const csvRows = [];
        // Intestazioni per la vista tabellare
        const headers = [
            'Data',
            'Artista',
            'Brano',
            'Voto Musicale Medio',
            'Voto Fashion Medio',
            'Tag'
        ];

        // Aggiungi colonne per i voti dei singoli critici analizzati nel primo pezzo per coerenza
        const criticIds = Object.keys(filteredAndSortedHistory[0]?.results || {});
        criticIds.forEach(id => headers.push(`Voto ${id}`));

        csvRows.push(headers.join(','));

        filteredAndSortedHistory.forEach(item => {
            const date = new Date(item.createdAt).toLocaleDateString();
            const artist = `"${(item.metadata?.artistName || '').replace(/"/g, '""')}"`;
            const title = `"${(item.metadata?.songTitle || '').replace(/"/g, '""')}"`;
            const musicScore = item.averageScore || '';
            const fashionScore = item.averageAestheticScore || '';
            const tag = `"${(item.tag || '').replace(/"/g, '""')}"`;

            const rowData = [date, artist, title, musicScore, fashionScore, tag];

            // Aggiungi i voti di ciascun critico
            criticIds.forEach(id => {
                rowData.push(item.results[id]?.lyricalAnalysis?.finalScore || '');
            });

            csvRows.push(rowData.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "classifica_generazioni.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors border border-gray-700"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-3xl font-bold text-white flex-1">Archivio Analisi</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <div className="flex-1 flex items-center gap-2 bg-dark-surface border border-gray-700 rounded-lg px-3 py-2 relative focus-within:ring-1 focus-within:ring-indigo-500">
                    <Tag size={16} className="text-gray-500" />
                    <select
                        value={searchTag}
                        onChange={(e) => setSearchTag(e.target.value)}
                        className="bg-transparent border-none outline-none text-white text-sm appearance-none flex-1 pr-6 cursor-pointer"
                    >
                        <option value="" className="bg-gray-800 text-white">Tutti i Tag</option>
                        {availableTags.map(tag => (
                            <option key={tag} value={tag} className="bg-gray-800 text-white">{tag}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-dark-surface border border-gray-700 rounded-lg px-3 py-2 w-32 focus-within:ring-1 focus-within:ring-indigo-500">
                    <TrendingUp size={16} className="text-gray-500" />
                    <input
                        type="number"
                        placeholder="Voto Min"
                        value={minMusicScore}
                        onChange={(e) => setMinMusicScore(e.target.value)}
                        className="bg-transparent border-none outline-none text-white w-full text-sm"
                        min="0"
                        max="10"
                    />
                </div>

                <div className="flex items-center gap-2 bg-dark-surface border border-gray-700 rounded-lg px-3 py-2 relative">
                    <SortDesc size={16} className="text-gray-500" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent border-none outline-none text-white text-sm appearance-none flex-1 pr-6 cursor-pointer"
                    >
                        <option value="dateDesc" className="bg-gray-800 text-white">Più Recenti</option>
                        <option value="dateAsc" className="bg-gray-800 text-white">Meno Recenti</option>
                        <option value="musicScoreDesc" className="bg-gray-800 text-white">Voto Medio Musicale (Max)</option>
                        <option value="fashionScoreDesc" className="bg-gray-800 text-white">Voto Fashion (Max)</option>
                        <option disabled className="bg-gray-800 text-gray-500">──────────</option>
                        {(Object.values(PERSONAS) as import('../types').CriticPersona[]).map(p => (
                            <option key={`critic-${p.id}`} value={`critic_${p.id}`} className="bg-gray-800 text-white">
                                Ordina per Voto {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={exportFilteredViewToCSV}
                    className="flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-lg"
                    title="Esporta Classifica Attuale"
                >
                    <FileSpreadsheet size={16} />
                    <span className="hidden lg:inline text-sm">Esporta Vista</span>
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-indigo-500" size={40} />
                    <p className="text-gray-400">Caricamento storico...</p>
                </div>
            ) : error ? (
                <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-6 rounded-xl text-center">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 text-sm bg-red-900/50 hover:bg-red-800/80 px-4 py-2 rounded-lg transition-colors">
                        Riprova
                    </button>
                </div>
            ) : filteredAndSortedHistory.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-700 bg-gray-900/20 rounded-2xl">
                    <p className="text-gray-400 text-lg">Nessuna analisi corrisponde ai filtri impostati.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedHistory.map((item) => (
                        <div key={item._id} className="bg-dark-surface border border-gray-800 rounded-xl p-6 hover:border-gray-500 transition-all shadow-lg group flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Activity size={64} className="text-indigo-400" />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white truncate max-w-[200px]" title={item.metadata?.songTitle || 'Sconosciuto'}>
                                        {item.metadata?.songTitle || 'Sconosciuto'}
                                    </h3>
                                    <p className="text-gray-400 text-sm truncate max-w-[200px]" title={item.metadata?.artistName || 'Artista'}>
                                        {item.metadata?.artistName || 'Sconosciuto'}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    {item.averageScore !== null && (
                                        <div className="flex flex-col items-end">
                                            <div className="text-2xl font-black text-amber-500 leading-none">
                                                {item.averageScore}
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Musica</div>
                                        </div>
                                    )}

                                    {item.averageAestheticScore !== null && (
                                        <div className="flex flex-col items-end mt-3">
                                            <div className="text-lg font-bold text-pink-400 leading-none">
                                                {item.averageAestheticScore}
                                            </div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Fashion</div>
                                        </div>
                                    )}

                                    {sortBy.startsWith('critic_') && (
                                        <div className="flex flex-col items-end mt-3 border-t border-gray-700/50 pt-2">
                                            <div className="text-sm font-bold text-indigo-400 leading-none">
                                                {getCriticScore(item, sortBy.replace('critic_', '')) !== -1
                                                    ? getCriticScore(item, sortBy.replace('critic_', ''))
                                                    : '-'}
                                            </div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">
                                                Voto {PERSONAS[sortBy.replace('critic_', '')]?.name || 'Critico'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {item.tag && (
                                <div className="mb-4 inline-flex items-center gap-1.5 bg-indigo-900/30 text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded text-xs font-mono self-start relative z-10">
                                    <Tag size={12} /> {item.tag}
                                </div>
                            )}

                            <div className="text-xs text-gray-500 mt-auto pt-4 border-t border-gray-800 flex justify-between items-center relative z-10">
                                <span>{new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.audioUrl && import.meta.env.VITE_ENABLE_AUDIO_STORAGE !== 'false' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playTrack(
                                                    item.audioUrl!,
                                                    item.metadata?.songTitle || '',
                                                    item.metadata?.artistName || '',
                                                    true
                                                );
                                            }}
                                            className="p-1.5 flex items-center bg-gray-800 hover:bg-indigo-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                                            title="Riproduci Audio"
                                        >
                                            <Play size={14} />
                                            <span className="text-[10px] ml-1">Play</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            exportToCSV(
                                                item.results,
                                                item.synthesis,
                                                item.averageScore,
                                                item.metadata,
                                                getSafeFilename(item, 'csv'),
                                                item.fashionCritique,
                                                item.averageAestheticScore
                                            );
                                        }}
                                        className="p-1.5 flex items-center bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                                        title="Esporta CSV"
                                    >
                                        <Download size={14} />
                                        <span className="text-[10px] ml-1">CSV</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            exportToHTML(
                                                item.results,
                                                item.synthesis,
                                                item.averageScore,
                                                item.metadata,
                                                getSafeFilename(item, 'html'),
                                                item.fashionCritique,
                                                item.averageAestheticScore
                                            );
                                        }}
                                        className="p-1.5 flex items-center bg-gray-800 hover:bg-indigo-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                                        title="Esporta HTML"
                                    >
                                        <Download size={14} />
                                        <span className="text-[10px] ml-1">HTML</span>
                                    </button>
                                    <button
                                        onClick={() => onViewAnalysis(item)}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                                    >
                                        Vedi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && !error && page < totalPages && filteredAndSortedHistory.length > 0 && (
                <div className="flex justify-center mt-12 pb-8">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors flex items-center gap-2 border border-gray-700 disabled:opacity-50"
                    >
                        {isLoadingMore ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Activity size={18} />}
                        {isLoadingMore ? 'Caricamento...' : 'Carica Altri Risultati'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HistoryView;
