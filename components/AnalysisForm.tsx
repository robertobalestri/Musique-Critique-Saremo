import React, { useState, useRef } from 'react';
import { Upload, FileText, Music, Users, X, Activity, AlignLeft, CheckCircle2 } from 'lucide-react';

interface AnalysisFormProps {
  onAnalyze: (audio: File | undefined, bio: string, analyzeAll: boolean, lyrics: string) => void;
  onAudioAnalysis: (audio: File) => void;
  isLoading: boolean;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({ onAnalyze, onAudioAnalysis, isLoading }) => {
  const [bio, setBio] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTextOnly, setIsTextOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    // 100MB limit
    if (file.size > 100 * 1024 * 1024) {
      alert('Il file è troppo grande (Max 100MB). Prova a comprimerlo o usa un file più corto.');
      return;
    }

    // Check mime type or extension
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    const hasAudioType = file.type.startsWith('audio/');
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (hasAudioType || hasValidExtension) {
      setAudioFile(file);
    } else {
      alert('Per favore carica un file audio valido (MP3, WAV, M4A, ecc).');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent, analyzeAll: boolean) => {
    e.preventDefault();

    if (isTextOnly) {
      if (!lyrics.trim()) {
        alert("Inserisci il testo per l'analisi testuale.");
        return;
      }
      onAnalyze(undefined, bio, analyzeAll, lyrics);
    } else {
      if (!audioFile) {
        alert("Carica un file audio.");
        return;
      }
      onAnalyze(audioFile, bio, analyzeAll, lyrics);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Mode Toggle */}
      <div className="flex justify-end">
        <label className="flex items-center gap-3 cursor-pointer group">
          <span className={`text-sm font-medium transition-colors ${isTextOnly ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
            Analisi Solo Testuale
          </span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isTextOnly}
              onChange={(e) => {
                setIsTextOnly(e.target.checked);
                if (e.target.checked) setAudioFile(null); // Optional: Clear audio when switching to text only
              }}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </div>
        </label>
      </div>

      {/* Audio Upload Area (Conditional opacity) */}
      <div
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
          ${isTextOnly ? 'opacity-40 grayscale pointer-events-none' : 'cursor-pointer'}
          ${audioFile ? 'border-accent-primary bg-accent-primary/10' : 'border-gray-700 hover:border-gray-500 hover:bg-dark-surface'}
        `}
        onDragOver={(e) => !isTextOnly && e.preventDefault()}
        onDrop={(e) => !isTextOnly && handleDrop(e)}
        onClick={() => !isTextOnly && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
          className="hidden"
          disabled={isTextOnly}
        />

        {audioFile ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="bg-accent-primary p-3 rounded-full mb-3 shadow-lg shadow-accent-primary/20">
              <Music className="text-white" size={32} />
            </div>
            <p className="font-semibold text-white text-lg">{audioFile.name}</p>
            <p className="text-sm text-gray-400 mt-1">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAudioFile(null);
              }}
              className="mt-4 px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full text-xs flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Rimuovi
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="text-gray-500 mb-4" size={40} />
            <p className="text-lg font-medium text-gray-300">Carica la tua canzone</p>
            <p className="text-sm text-gray-500 mt-2">
              {isTextOnly ? "Disabilitato in modalità testo" : "Trascina qui il file o clicca per selezionare (MP3, WAV)"}
            </p>
          </div>
        )}
      </div>

      {/* Lyrics Input */}
      <div className={`bg-dark-surface rounded-xl p-6 border transition-colors ${isTextOnly ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-gray-800'}`}>
        <div className="flex items-center gap-2 mb-4">
          <AlignLeft className={isTextOnly ? "text-indigo-400" : "text-gray-500"} size={20} />
          <h3 className={`font-semibold ${isTextOnly ? "text-white" : "text-gray-400"}`}>
            Testo / Lyrics {isTextOnly && <span className="text-xs text-indigo-400 ml-2 uppercase tracking-wider border border-indigo-500/30 px-2 py-0.5 rounded">Obbligatorio</span>}
          </h3>
        </div>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={isTextOnly ? "Incolla qui il testo della canzone per analizzarlo..." : "Incolla qui il testo (opzionale, aiuta la comprensione)..."}
          className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-40 resize-y transition-all placeholder-gray-600 font-mono text-sm leading-relaxed"
        />
      </div>

      {/* Bio Input */}
      <div className="bg-dark-surface rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="text-accent-secondary" size={20} />
          <h3 className="font-semibold text-gray-200">Biografia Artista / Contesto</h3>
        </div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Racconta qualcosa sull'artista, sul brano o sul genere..."
          className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary h-24 resize-none transition-all placeholder-gray-600"
        />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={(e) => handleSubmit(e, false)}
          disabled={isLoading || (isTextOnly ? !lyrics.trim() : !audioFile)}
          className={`
            py-4 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
            ${isLoading || (isTextOnly ? !lyrics.trim() : !audioFile)
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-white text-black hover:bg-gray-200'}
          `}
        >
          {isLoading ? 'Analisi...' : 'Giudica con Selezionato'}
        </button>

        <button
          onClick={(e) => handleSubmit(e, true)}
          disabled={isLoading || (isTextOnly ? !lyrics.trim() : !audioFile)}
          className={`
            py-4 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
            ${isLoading || (isTextOnly ? !lyrics.trim() : !audioFile)
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 hover:shadow-accent-primary/25'}
          `}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analisi...
            </>
          ) : (
            <>
              <Users size={20} />
              Giudizio Universale
            </>
          )}
        </button>

        {/* Technical Analysis - Only visible if audio exists */}
        <button
          type="button"
          onClick={() => audioFile && onAudioAnalysis(audioFile)}
          disabled={!audioFile || isLoading || isTextOnly}
          className={`
            py-4 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 border-2
            ${!audioFile || isLoading || isTextOnly
              ? 'border-gray-800 text-gray-600 cursor-not-allowed opacity-50'
              : 'border-blue-500 text-blue-400 hover:bg-blue-500/10'}
          `}
        >
          <Activity size={20} />
          Analisi Tecnica (No AI)
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;