import React, { useState, useRef } from 'react';
import { Upload, FileText, Music, Users, X, Activity, AlignLeft, Camera, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export interface AudioFileData {
  file: File;
  id: string;
  artistName: string;
  songTitle: string;
  isParseError: boolean;
  images: File[]; // <- NUOVO CAMPO
}

interface AnalysisFormProps {
  onAnalyze: (audios: AudioFileData[], bio: string, analyzeAll: boolean, lyrics: string, fallbackArtistName: string, fallbackSongTitle: string, isBand: boolean, tag: string) => void;
  onAudioAnalysis: (audio: File) => void;
  isLoading: boolean;
  allowSingle?: boolean;
  allowAll?: boolean;
  singleCriticName?: string;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({
  onAnalyze,
  onAudioAnalysis,
  isLoading,
  allowSingle = true,
  allowAll = true,
  singleCriticName
}) => {
  const [bio, setBio] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Array of complex audio objects instead of a single File
  const [audioFilesData, setAudioFilesData] = useState<AudioFileData[]>([]);

  const [isTextOnly, setIsTextOnly] = useState(false);

  // Shared metadata
  const [tag, setTag] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const determineMetadataFromName = (filename: string): { artist: string, title: string, error: boolean } => {
    // Rimuove estensione
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt.includes('-')) {
      const parts = nameWithoutExt.split('-');
      // Assume il primo pezzo è artista, il resto è titolo
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join('-').trim(),
        error: false
      };
    }
    return {
      artist: '',
      title: nameWithoutExt.trim(),
      error: true
    };
  };

  const processIncomingFiles = (newFiles: File[]) => {
    let hasTooLarge = false;
    let hasInvalid = false;

    const validAudioFiles = newFiles.filter(file => {
      if (file.size > 100 * 1024 * 1024) {
        hasTooLarge = true;
        return false;
      }

      const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
      const hasAudioType = file.type.startsWith('audio/');
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!hasAudioType && !hasValidExtension) {
        hasInvalid = true;
        return false;
      }
      return true;
    });

    if (hasTooLarge) toast.error('Attenzione: alcuni file grandi (>100MB) sono stati ignorati.');
    if (hasInvalid) toast.error('Attenzione: alcuni file non audio sono stati ignorati.');

    const newAudioData: AudioFileData[] = validAudioFiles.map(file => {
      const parsed = determineMetadataFromName(file.name);
      return {
        file,
        id: Math.random().toString(36).substring(7),
        artistName: parsed.artist,
        songTitle: parsed.title,
        isParseError: parsed.error,
        images: []
      };
    });

    if (newAudioData.length > 0) {
      setAudioFilesData(prev => [...prev, ...newAudioData]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(Array.from(e.target.files));
    }
  };

  const updateAudioFileData = (id: string, field: 'artistName' | 'songTitle', value: string) => {
    setAudioFilesData(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value };
        // Rimuoviamo l'errore se l'utente digita entrambi
        if (newItem.artistName.trim() !== '' && newItem.songTitle.trim() !== '') {
          newItem.isParseError = false;
        }
        return newItem;
      }
      return item;
    }));
  };

  const removeAudioFile = (id: string) => {
    setAudioFilesData(prev => prev.filter(item => item.id !== id));
  };

  const handleImageChangeForFile = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = (Array.from(e.target.files) as File[]).filter(file => file.type.startsWith('image/'));
      setAudioFilesData(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, images: [...item.images, ...newImages] };
        }
        return item;
      }));
    }
  };

  const removeImageForFile = (id: string, indexToRemove: number) => {
    setAudioFilesData(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, images: item.images.filter((_, i) => i !== indexToRemove) };
      }
      return item;
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files) as File[];
      const audios = droppedFiles.filter(f => f.type.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'].some(ext => f.name.toLowerCase().endsWith(ext)));

      if (audios.length > 0 && !isTextOnly) processIncomingFiles(audios);
    }
  };

  const handleSubmit = (e: React.FormEvent, analyzeAll: boolean) => {
    e.preventDefault();

    if (isTextOnly) {
      if (!lyrics.trim()) {
        toast.warning("Inserisci il testo per l'analisi testuale.");
        return;
      }
      onAnalyze([], bio, analyzeAll, lyrics, "", "", false, tag);
    } else {
      if (audioFilesData.length === 0) {
        toast.warning("Carica almeno un file audio.");
        return;
      }

      const hasErrors = audioFilesData.some(a => a.artistName.trim() === '' || a.songTitle.trim() === '');
      if (hasErrors) {
        toast.error("Controlla le righe rosse: tutti i brani necessitano di un Artista e Titolo validi.");
        return;
      }

      onAnalyze(audioFilesData, bio, analyzeAll, lyrics, "", "", false, tag);
    }
  };

  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const REQUIRED_PASSWORD = process.env.PASSWORD || import.meta.env?.VITE_PASSWORD;
  const isPasswordCorrect = !!user || !REQUIRED_PASSWORD || password === REQUIRED_PASSWORD;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Password Protection */}
      {REQUIRED_PASSWORD && !user && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 bg-red-900/30 rounded-lg">
            <div className="text-red-400 font-bold text-xl">🔒</div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-red-300 uppercase tracking-widest mb-1">
              Password Accesso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci password per abilitare l'analisi..."
              className="w-full bg-dark-bg border border-red-900/50 rounded-lg p-2 text-white focus:outline-none focus:border-red-500 transition-all font-mono"
            />
          </div>
        </div>
      )}

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
                if (e.target.checked) setAudioFilesData([]);
              }}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </div>
        </label>
      </div>

      {/* Audio Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 relative
          ${isTextOnly ? 'opacity-50 grayscale border-gray-800' : 'cursor-pointer border-gray-700 hover:border-gray-500 hover:bg-dark-surface'}
        `}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !isTextOnly && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac"
          className="hidden"
          multiple
          disabled={isTextOnly}
        />

        <div className="flex flex-col items-center">
          <Upload className="text-gray-500 mb-4" size={40} />
          <p className="text-lg font-medium text-gray-300">Carica Audio (Singolo o Batch Multiplo)</p>
          <p className="text-sm text-gray-500 mt-2">
            {isTextOnly ? "Modalità Testo: Caricamento Audio Disabilitato" : "Trascina i tuoi brani qui o clicca per selezionarli"}
          </p>
        </div>
      </div>

      {/* Batch Files List */}
      {!isTextOnly && audioFilesData.length > 0 && (
        <div className="bg-dark-surface rounded-xl p-4 border border-gray-800 space-y-3">
          <h3 className="font-semibold text-gray-200 flex items-center gap-2 mb-3">
            <Music size={18} /> Coda di Analisi ({audioFilesData.length})
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {audioFilesData.map((data, index) => (
              <div
                key={data.id}
                className={`p-4 rounded-xl border relative transition-colors ${data.isParseError ? 'bg-red-900/10 border-red-500/50' : 'bg-gray-900/50 border-gray-700'}`}
              >
                <button
                  type="button"
                  onClick={() => removeAudioFile(data.id)}
                  className="absolute top-3 right-3 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>

                <div className="mb-3 pr-8">
                  <p className="text-xs text-gray-500 font-mono mb-1 select-all">{data.file.name}</p>
                  {data.isParseError && <p className="text-xs font-bold text-red-400 mb-2">⚠ Dividi manualmente l'artista dal titolo.</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={data.artistName}
                    onChange={(e) => updateAudioFileData(data.id, 'artistName', e.target.value)}
                    placeholder="Nome Artista"
                    className={`w-full bg-dark-bg border rounded-lg p-2.5 text-sm outline-none transition-colors ${data.isParseError && !data.artistName ? 'border-red-500/50 text-red-200' : 'border-gray-700 text-gray-200 focus:border-indigo-500'}`}
                  />
                  <input
                    type="text"
                    value={data.songTitle}
                    onChange={(e) => updateAudioFileData(data.id, 'songTitle', e.target.value)}
                    placeholder="Titolo Brano"
                    className={`w-full bg-dark-bg border rounded-lg p-2.5 text-sm outline-none transition-colors ${data.isParseError && !data.songTitle ? 'border-red-500/50 text-red-200' : 'border-gray-700 text-gray-200 focus:border-indigo-500'}`}
                  />
                </div>

                {/* Per-Song Image Upload Area */}
                <div className="mt-4 pt-4 border-t border-gray-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="text-pink-400" size={16} />
                    <h4 className="text-sm font-medium text-gray-300">
                      Foto (Critica di Moda)
                    </h4>
                  </div>

                  {data.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {data.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-md overflow-hidden border border-gray-700 w-16 h-16">
                          <img src={URL.createObjectURL(img)} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImageForFile(data.id, idx)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X className="text-white" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label
                    htmlFor={`image-upload-${data.id}`}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-gray-600 rounded-lg text-xs text-gray-400 hover:text-white hover:border-pink-500 hover:bg-pink-500/10 cursor-pointer transition-all font-medium"
                  >
                    <ImageIcon size={14} />
                    Aggiungi Foto Brano
                    <input
                      id={`image-upload-${data.id}`}
                      type="file"
                      onChange={(e) => handleImageChangeForFile(data.id, e)}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}




      {/* Shared Metadata (Tag / Bio) */}
      <div className="bg-dark-surface rounded-xl p-6 border border-gray-800 space-y-4">
        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
          <FileText size={18} /> Metadati Condivisi (per tutto il Batch)
        </h3>
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="#Tag opzionale (es. Album 2026, Sanremo, ...)"
          className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-gray-300 focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Note biografe condivise o contesto generico (opzionale)..."
          className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary h-24 resize-none transition-all placeholder-gray-600"
        />
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
      <div className="flex flex-col md:flex-row justify-center gap-4">
        {allowSingle && (
          <button
            onClick={(e) => handleSubmit(e, false)}
            disabled={isLoading || (isTextOnly ? !lyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect}
            className={`
              py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 w-full md:w-auto min-w-[200px]
              ${isLoading || (isTextOnly ? !lyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-200'}
            `}
          >
            {isLoading ? 'Analisi...' : (singleCriticName ? `Giudica con ${singleCriticName}` : 'Giudica con Selezionato')}
          </button>
        )}

        {allowAll && (
          <button
            onClick={(e) => handleSubmit(e, true)}
            disabled={isLoading || (isTextOnly ? !lyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect}
            className={`
              py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 w-full md:w-auto min-w-[200px]
              ${isLoading || (isTextOnly ? !lyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect
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
        )}

        {/* Technical Analysis - Only visible if single audio exists */}
        <button
          type="button"
          onClick={() => audioFilesData.length === 1 && onAudioAnalysis(audioFilesData[0].file)}
          disabled={audioFilesData.length !== 1 || isLoading || isTextOnly || !isPasswordCorrect}
          className={`
            py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 border-2 w-full md:w-auto min-w-[200px]
            ${audioFilesData.length !== 1 || isLoading || isTextOnly || !isPasswordCorrect
              ? 'border-gray-800 text-gray-600 cursor-not-allowed opacity-50'
              : 'border-blue-500 text-blue-400 hover:bg-blue-500/10'}
          `}
        >
          <Activity size={20} />
          Analisi Tecnica (Singolo)
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;