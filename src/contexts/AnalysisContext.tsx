import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AnalysisResponse, PersonaId, DiscussionMessage } from '../types';

interface AnalysisState {
    results: Record<string, AnalysisResponse> | null;
    audioAnalysisReport: string | null;
    synthesis: string | null;
    averageScore: number | null;
    averageAestheticScore: number | null;
    metadata: { artistName: string; songTitle: string; isBand: boolean };
    lastAnalysisRequest: {
        artist: string;
        title: string;
        lyrics?: string;
        bio: string;
        fashionCritique?: string;
    } | null;
    // Use strictly a URL instead of a File object so it persists after reloads/Blob uploads
    audioUrl: string | null;
    activeResultPersona: PersonaId | 'ALL';
}

interface AnalysisContextType extends AnalysisState {
    setResults: (results: Record<string, AnalysisResponse> | null) => void;
    setAudioAnalysisReport: (report: string | null) => void;
    setSynthesis: (synthesis: string | null) => void;
    setAverageScore: (score: number | null) => void;
    setAverageAestheticScore: (score: number | null) => void;
    setMetadata: (metadata: { artistName: string; songTitle: string; isBand: boolean }) => void;
    setLastAnalysisRequest: (req: AnalysisState['lastAnalysisRequest']) => void;
    setAudioUrl: (url: string | null) => void;
    resetAnalysis: () => void;
    isSynthesizing: boolean;
    setIsSynthesizing: (val: boolean) => void;
    setActiveResultPersona: (id: PersonaId | 'ALL') => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [results, setResults] = useState<Record<string, AnalysisResponse> | null>(null);
    const [audioAnalysisReport, setAudioAnalysisReport] = useState<string | null>(null);
    const [synthesis, setSynthesis] = useState<string | null>(null);
    const [averageScore, setAverageScore] = useState<number | null>(null);
    const [averageAestheticScore, setAverageAestheticScore] = useState<number | null>(null);
    const [metadata, setMetadata] = useState({ artistName: '', songTitle: '', isBand: false });
    const [lastAnalysisRequest, setLastAnalysisRequest] = useState<AnalysisState['lastAnalysisRequest']>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [activeResultPersona, setActiveResultPersona] = useState<PersonaId | 'ALL'>('ALL');

    // Load from LocalStorage on mount
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
                if (parsed.audioUrl) setAudioUrl(parsed.audioUrl);
                if (parsed.activeResultPersona) setActiveResultPersona(parsed.activeResultPersona);
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Sync to LocalStorage
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
            audioUrl,
            activeResultPersona
        };
        localStorage.setItem('saremo_analysis_state', JSON.stringify(stateToSave));
    }, [results, audioAnalysisReport, synthesis, averageScore, averageAestheticScore, metadata, lastAnalysisRequest, audioUrl, activeResultPersona, isInitialized]);

    const resetAnalysis = () => {
        setResults(null);
        setAudioAnalysisReport(null);
        setSynthesis(null);
        setIsSynthesizing(false);
        setAverageScore(null);
        setAverageAestheticScore(null);
        setLastAnalysisRequest(null);
        setAudioUrl(null);
        setActiveResultPersona('ALL');
        localStorage.removeItem('saremo_analysis_state');
    };

    return (
        <AnalysisContext.Provider
            value={{
                results, setResults,
                audioAnalysisReport, setAudioAnalysisReport,
                synthesis, setSynthesis,
                averageScore, setAverageScore,
                averageAestheticScore, setAverageAestheticScore,
                metadata, setMetadata,
                lastAnalysisRequest, setLastAnalysisRequest,
                audioUrl, setAudioUrl,
                isSynthesizing, setIsSynthesizing,
                activeResultPersona, setActiveResultPersona,
                resetAnalysis
            }}
        >
            {children}
        </AnalysisContext.Provider>
    );
};

export const useAnalysis = () => {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
};
