import React, { useRef, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { X, Music2 } from 'lucide-react';

const GlobalAudioPlayer: React.FC = () => {
    const { playerState, stopPlayback } = usePlayer();
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && playerState.audioUrl && playerState.autoPlay) {
            audioRef.current.play().catch(e => console.warn("Auto-play prevented", e));
        }
    }, [playerState.audioUrl, playerState.autoPlay]);

    if (!playerState.audioUrl) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 p-4 z-50 animate-in slide-in-from-bottom flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">

            <div className="flex-1 w-full md:w-1/3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 animate-[pulse_2s_ease-in-out_infinite]">
                    <Music2 size={20} className="text-indigo-400" />
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                    <div className="text-white font-bold truncate text-sm">
                        {playerState.trackName || 'Brano Sconosciuto'}
                    </div>
                    <div className="text-indigo-400 text-xs truncate">
                        {playerState.artistName || 'Artista Sconosciuto'}
                    </div>
                </div>
            </div>

            <div className="flex-[2] w-full md:w-1/2 flex items-center gap-4">
                <audio
                    ref={audioRef}
                    src={playerState.audioUrl}
                    controls
                    className="w-full h-10 rounded-full overflow-hidden outline-none bg-gray-800"
                    controlsList="nodownload"
                />
                <button
                    onClick={stopPlayback}
                    className="p-2 text-gray-400 hover:text-white hover:bg-red-900/30 rounded-full transition-colors flex-shrink-0 border border-transparent hover:border-red-900/50"
                    title="Chiudi Player"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default GlobalAudioPlayer;
