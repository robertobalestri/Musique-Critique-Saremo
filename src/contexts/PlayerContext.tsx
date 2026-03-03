import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PlayerState {
    audioUrl: string | null;
    trackName: string | null;
    artistName: string | null;
    autoPlay: boolean;
}

interface PlayerContextType {
    playerState: PlayerState;
    playTrack: (url: string, title: string, artist: string, autoPlay?: boolean) => void;
    stopPlayback: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [playerState, setPlayerState] = useState<PlayerState>({
        audioUrl: null,
        trackName: null,
        artistName: null,
        autoPlay: false,
    });

    const playTrack = (url: string, title: string, artist: string, autoPlay = false) => {
        setPlayerState({
            audioUrl: url,
            trackName: title,
            artistName: artist,
            autoPlay,
        });
    };

    const stopPlayback = () => {
        setPlayerState({
            audioUrl: null,
            trackName: null,
            artistName: null,
            autoPlay: false,
        });
    };

    return (
        <PlayerContext.Provider value={{ playerState, playTrack, stopPlayback }}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};
