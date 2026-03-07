import { API_BASE_URL } from '../config';

interface YoutubeDownloadResponse {
    base64_audio: string;
    mime_type: string;
    title: string;
    artist: string;
}

export const downloadYoutubeAudio = async (url: string): Promise<YoutubeDownloadResponse> => {
    const response = await fetch(`${API_BASE_URL}/youtube/download`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to download YouTube audio');
    }

    return await response.json();
};
