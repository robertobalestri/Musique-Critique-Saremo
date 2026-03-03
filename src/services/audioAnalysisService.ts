
import { analyze } from 'web-audio-beat-detector';

// Global Meyda from CDN
declare var Meyda: any;

// --- Helpers ---
const calculateMean = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const calculatePercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[index] || sorted[sorted.length - 1];
};

const getCategory = (val: number, rules: { threshold: number, label: string }[], defaultLabel: string) => {
    for (const rule of rules) {
        if (val < rule.threshold) return rule.label;
    }
    return defaultLabel;
};

/**
 * Main analysis function using Meyda & Web Audio Beat Detector
 */
export const extractAudioFeatures = async (file: File): Promise<string> => {
    try {
        if (typeof Meyda === 'undefined') {
            throw new Error("Meyda library not loaded");
        }

        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // Analyze a representative middle section (max 2 mins)
        const duration = rawData.length;
        const analyzeDuration = Math.min(duration, sampleRate * 120);
        const startOffset = Math.floor((duration - analyzeDuration) / 2);

        const safeStart = Math.max(0, startOffset);
        const safeEnd = Math.min(duration, safeStart + analyzeDuration);
        const channelData = rawData.subarray(safeStart, safeEnd);

        // --- 1. BPM Detection ---
        let bpm = 0;
        try {
            // Create a new AudioBuffer for the detector
            const slicedBuffer = audioContext.createBuffer(1, channelData.length, sampleRate);
            slicedBuffer.copyToChannel(channelData, 0);

            bpm = await analyze(slicedBuffer);
        } catch (e) {
            console.warn("Beat detection failed, defaulting to 0", e);
        }

        // --- 2. Spectral Analysis (Meyda) ---
        const bufferSize = 4096;
        const rmsValues: number[] = [];
        const zcrValues: number[] = [];
        const centroidValues: number[] = [];
        const rolloffValues: number[] = [];

        Meyda.bufferSize = bufferSize;
        Meyda.sampleRate = sampleRate;
        Meyda.windowingFunction = "hanning";

        // Calculate Bin Width for Centroid conversion (Bin Index -> Hz)
        const binWidth = sampleRate / bufferSize;

        // Loop through data in chunks
        for (let i = 0; i < channelData.length; i += bufferSize) {
            if (i + bufferSize > channelData.length) break;

            const frame = channelData.subarray(i, i + bufferSize);

            const features = Meyda.extract(
                ['rms', 'zcr', 'spectralCentroid', 'spectralRolloff'],
                frame
            );

            if (features) {
                // RMS
                rmsValues.push(features.rms);

                // Only collect spectral data if there is signal (RMS > threshold)
                if (features.rms > 0.002) {
                    zcrValues.push(features.zcr);

                    if (typeof features.spectralCentroid === 'number') {
                        // Centroid in Meyda is a bin index. Convert to Hz.
                        centroidValues.push(features.spectralCentroid * binWidth);
                    }
                    if (typeof features.spectralRolloff === 'number') {
                        // Rolloff in Meyda is usually already in Hz.
                        rolloffValues.push(features.spectralRolloff);
                    }
                }
            }
        }

        // Calcola la media quadratica (Root Mean Square) dei valori RMS dei frame
        const calculateRMS = (arr: number[]) => {
            if (arr.length === 0) return 0;
            const squares = arr.reduce((sum, val) => sum + (val * val), 0);
            return Math.sqrt(squares / arr.length);
        };

        // ...

        // --- Post-Processing Stats ---
        const rmsMean = calculateRMS(rmsValues);
        const p95 = calculatePercentile(rmsValues, 0.95);
        const p5 = calculatePercentile(rmsValues, 0.05);
        const dynamicContrast = p95 - p5;

        // ZCR normalization
        const zcrNormValues = zcrValues.map(z => z / bufferSize);
        const zcrMean = calculateMean(zcrNormValues);

        const centroidMean = calculateMean(centroidValues);
        const rolloffMean = calculateMean(rolloffValues);

        // Helper: Convert linear amplitude to dBFS
        const toDB = (amp: number) => (20 * Math.log10(amp)).toFixed(1);

        // Formatting Helpers
        // Improved: No decimals for Hz > 100, 2 decimals for small numbers (RMS, ZCR)
        const fmt = (n: number) => {
            if (n > 100) return n.toLocaleString('it-IT', { maximumFractionDigits: 0 });
            return n.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        };
        const fmtBPM = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 0 });

        return `
Dati Tecnici Audio Estratti (Meyda + BeatDetector):

Tempo:
- Numeric: ${bpm > 0 ? fmtBPM(bpm) : 'N/A'} BPM
- Category: ${getCategory(bpm, [{ threshold: 85, label: 'Lento (Ballad)' }, { threshold: 115, label: 'Mid-Tempo' }, { threshold: 140, label: 'Up-Tempo' }], 'Fast/Energetic')}

Energy Level (RMS):
- Numeric: ${fmt(rmsMean)} (${toDB(rmsMean)} dB)
- Category: ${getCategory(rmsMean, [{ threshold: 0.1, label: 'Bassa (Dinamico/Soft)' }, { threshold: 0.25, label: 'Moderata (Standard)' }, { threshold: 0.4, label: 'Alta (Loud)' }], 'Molto Alta (Hyper-Compressed)')}

Dynamic Contrast:
- Numeric: ${fmt(dynamicContrast)}
- Category: ${getCategory(dynamicContrast, [{ threshold: 0.05, label: 'Compressed' }, { threshold: 0.15, label: 'Balanced' }], 'High Range')}

Brightness (Centroid):
- Numeric: ${fmt(centroidMean)} Hz
- Category: ${getCategory(centroidMean, [{ threshold: 2000, label: 'Dark/Warm' }, { threshold: 4000, label: 'Neutral' }, { threshold: 6000, label: 'Bright' }], 'Very Bright')}

High-Freq Content (Rolloff):
- Numeric: ${fmt(rolloffMean)} Hz
- Category: ${getCategory(rolloffMean, [{ threshold: 8000, label: 'Muffled' }, { threshold: 14000, label: 'Standard' }, { threshold: 18000, label: 'Hi-Fi' }], 'Airy/Crisp')}

Texture (Roughness/ZCR):
- Numeric: ${fmt(zcrMean)}
- Category: ${getCategory(zcrMean, [{ threshold: 0.03, label: 'Smooth' }, { threshold: 0.08, label: 'Textured' }], 'Noisy/Distorted')}
`.trim();

    } catch (e) {
        console.error("Meyda analysis failed:", e);
        return `Errore analisi tecnica: ${(e as any).message}`;
    }
};
