import React, { useState, useRef } from 'react';
import { Upload, FileText, Music, Users, X, Activity, AlignLeft, CheckCircle2, Image as ImageIcon, Camera } from 'lucide-react';

interface AnalysisFormProps {
  onAnalyze: (audio: File | undefined, bio: string, analyzeAll: boolean, lyrics: string, artistName: string, songTitle: string, isBand: boolean) => void;
  onAudioAnalysis: (audio: File) => void;
  isLoading: boolean;
  allowSingle?: boolean;
  allowAll?: boolean;
  singleCriticName?: string; // Optional name to show on the button
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
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [isBand, setIsBand] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const audio = droppedFiles.find(f => f.type.startsWith('audio/'));
      const droppedImages = droppedFiles.filter(f => f.type.startsWith('image/'));

      if (audio && !isTextOnly) validateAndSetFile(audio);
      if (droppedImages.length > 0) setImages(prev => [...prev, ...droppedImages]);
    }
  };

  const handleSubmit = (e: React.FormEvent, analyzeAll: boolean) => {
    e.preventDefault();

    if (isTextOnly) {
      if (!lyrics.trim()) {
        alert("Inserisci il testo per l'analisi testuale.");
        return;
      }
      onAnalyze(undefined, bio, analyzeAll, lyrics, artistName, songTitle, isBand, images);
    } else {
      if (!audioFile) {
        alert("Carica un file audio.");
        return;
      }
      onAnalyze(audioFile, bio, analyzeAll, lyrics, artistName, songTitle, isBand, images);
    }
  };

  const [password, setPassword] = useState('');
  const REQUIRED_PASSWORD = process.env.PASSWORD;
  const isPasswordCorrect = !REQUIRED_PASSWORD || password === REQUIRED_PASSWORD;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Password Protection (Only if configured) */}
      {REQUIRED_PASSWORD && (
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
                if (e.target.checked) setAudioFile(null); // Optional: Clear audio when switching to text only
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
          ${audioFile ? 'border-accent-primary bg-accent-primary/10' : ''}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          // Allow drag even if text only, for IMAGES
        }}
        onDrop={handleDrop}
        onClick={(e) => {
          // If clicking the container, trigger audio if not present, or ignore?
          // Actually let's keep audio trigger on main, relying on explicit buttons usually better but keeping simple.
          if (!isTextOnly && !audioFile) fileInputRef.current?.click();
        }}
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
              <X size={12} /> Rimuovi Audio
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="text-gray-500 mb-4" size={40} />
            <p className="text-lg font-medium text-gray-300">Carica Audio</p>
            <p className="text-sm text-gray-500 mt-2">
              {isTextOnly ? "Modalità Testo: Caricamento Audio Disabilitato" : "Trascina audio qui o clicca"}
            </p>
          </div>
        )}
      </div>

      {/* Image Upload Area (Always active, for fashion critic) */}
      <div className="bg-dark-surface rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="text-pink-400" size={20} />
            <h3 className="font-semibold text-gray-200">Look & Immagine (Opzionale)</h3>
          </div>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
          >
            <Camera size={14} /> Aggiungi Foto
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>

        {images.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-700">
                <img src={URL.createObjectURL(img)} alt="upload" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-0 right-0 p-1 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-20 h-20 flex items-center justify-center border border-dashed border-gray-600 rounded-lg text-gray-500 hover:text-white hover:border-gray-400 transition-colors"
            >
              +
            </button>
          </div>
        ) : (
          <div
            onClick={() => imageInputRef.current?.click()}
            className="border border-dashed border-gray-700 rounded-lg p-6 text-center text-gray-500 hover:bg-gray-800/50 hover:border-pink-500/50 hover:text-pink-400 transition-all cursor-pointer"
          >
            <p className="text-sm">Trascina qui le foto dell'artista o del concerto.</p>
            <p className="text-xs mt-1 opacity-70">Celestino Svolazzetti giudicherà l'outfit.</p>
          </div>
        )}
      </div>

      {/* NEW Metadata Inputs */}
      <div className="bg-dark-surface rounded-xl p-6 border border-gray-800 space-y-4">
        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
          <Music size={18} /> Dettagli Brano
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Nome Artista / Band"
            className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-gray-300 focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
          />
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Titolo Canzone"
            className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-gray-300 focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
          />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isBand}
              onChange={(e) => setIsBand(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
            />
            <span className="text-sm text-gray-400">È una Band / Gruppo?</span>
          </label>
        </div>
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
            disabled={isLoading || (isTextOnly ? !lyrics.trim() : !audioFile) || !isPasswordCorrect}
            className={`
              py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 w-full md:w-auto min-w-[200px]
              ${isLoading || (isTextOnly ? !lyrics.trim() : !audioFile) || !isPasswordCorrect
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
            disabled={isLoading || (isTextOnly ? !lyrics.trim() : !audioFile) || !isPasswordCorrect}
            className={`
              py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 w-full md:w-auto min-w-[200px]
              ${isLoading || (isTextOnly ? !lyrics.trim() : !audioFile) || !isPasswordCorrect
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

        {/* Technical Analysis - Only visible if audio exists */}
        <button
          type="button"
          onClick={() => audioFile && onAudioAnalysis(audioFile)}
          disabled={!audioFile || isLoading || isTextOnly || !isPasswordCorrect}
          className={`
            py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 border-2 w-full md:w-auto min-w-[200px]
            ${!audioFile || isLoading || isTextOnly || !isPasswordCorrect
              ? 'border-gray-800 text-gray-600 cursor-not-allowed opacity-50'
              : 'border-blue-500 text-blue-400 hover:bg-blue-500/10'}
          `}
        >
          <Activity size={20} />
          Analisi Tecnica
        </button>
      </div>
    </div>
  );
};

export default AnalysisForm;