import React, { useState, useRef } from 'react';
import { Upload, FileText, Music, Users, X, Activity, AlignLeft, Camera, Image as ImageIcon, CheckCircle2, Youtube, Loader2, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { downloadYoutubeAudio } from '../api/youtube';

export interface AudioFileData {
  file: File;
  id: string;
  artistName: string;
  songTitle: string;
  isParseError: boolean;
  images: File[];
  lyrics: string;
  bio: string;
}

interface AnalysisFormProps {
  onAnalyze: (audios: AudioFileData[], analyzeAll: boolean, isBand: boolean, tag: string) => void;
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
  const [textOnlyBio, setTextOnlyBio] = useState('');
  const [textOnlyLyrics, setTextOnlyLyrics] = useState('');

  // Array of complex audio objects instead of a single File
  const [audioFilesData, setAudioFilesData] = useState<AudioFileData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isTextOnly, setIsTextOnly] = useState(false);

  // Shared metadata
  const [tag, setTag] = useState('');

  // Youtube Links
  const [youtubeLinks, setYoutubeLinks] = useState('');
  const [isProcessingYoutube, setIsProcessingYoutube] = useState(false);

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
        images: [],
        lyrics: '',
        bio: ''
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

  const updateAudioFileData = (id: string, field: keyof AudioFileData, value: any) => {
    setAudioFilesData(prev => prev.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value } as AudioFileData;
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
    setAudioFilesData(prev => {
      const filtered = prev.filter(item => item.id !== id);
      if (currentIndex >= filtered.length && filtered.length > 0) {
        setCurrentIndex(filtered.length - 1);
      } else if (filtered.length === 0) {
        setCurrentIndex(0);
      }
      return filtered;
    });
  };

  const copyToAll = (field: 'lyrics' | 'bio' | 'images') => {
    if (audioFilesData.length <= 1) return;
    const currentValue = audioFilesData[currentIndex][field];
    setAudioFilesData(prev => prev.map(item => ({ ...item, [field]: currentValue })));
    toast.success(`Copiato a tutti i brani!`);
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

  const handleAddYoutubeLinks = async () => {
    const urls = youtubeLinks.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (urls.length === 0) return;

    setIsProcessingYoutube(true);
    let successCount = 0;

    for (const url of urls) {
      try {
        const toastId = toast.loading(`Scaricando ${url.substring(0, 30)}...`);
        const result = await downloadYoutubeAudio(url);

        // Convert base64 to File
        const byteCharacters = atob(result.base64_audio);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mime_type });
        const ext = result.mime_type.split('/')[1] || 'mp3';
        const file = new File([blob], `${result.artist} - ${result.title}.${ext}`, { type: result.mime_type });

        const newAudioItem: AudioFileData = {
          file,
          id: Math.random().toString(36).substring(7),
          artistName: result.artist,
          songTitle: result.title,
          isParseError: (!result.artist || !result.title) ? true : false,
          images: [],
          lyrics: '',
          bio: ''
        };

        setAudioFilesData(prev => [...prev, newAudioItem]);
        successCount++;
        toast.success(`Aggiunto: ${result.artist} - ${result.title}`, { id: toastId });
      } catch (error: any) {
        console.error("Youtube error:", error);
        toast.error(`Errore con ${url}: ${error.message || 'Sconosciuto'}`);
      }
    }

    if (successCount === urls.length) {
      setYoutubeLinks(''); // Pulisci la casella di testo solo se tutti hanno successo
    } else if (successCount > 0) {
      toast.warning(`${successCount} su ${urls.length} link aggiunti con successo.`);
    }

    setIsProcessingYoutube(false);
  };

  const handleSubmit = (e: React.FormEvent, analyzeAll: boolean) => {
    e.preventDefault();

    if (isTextOnly) {
      if (!textOnlyLyrics.trim()) {
        toast.warning("Inserisci il testo per l'analisi testuale.");
        return;
      }
      const textAudioData: AudioFileData = {
        file: undefined as any,
        id: 'text-only',
        artistName: "Sconosciuto",
        songTitle: "Testo",
        isParseError: false,
        images: [],
        lyrics: textOnlyLyrics,
        bio: textOnlyBio
      };
      onAnalyze([textAudioData], analyzeAll, false, tag);
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

      onAnalyze(audioFilesData, analyzeAll, false, tag);
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
          <p className="text-lg font-medium text-gray-300">Carica Audio (Manuale)</p>
          <p className="text-sm text-gray-500 mt-2">
            {isTextOnly ? "Modalità Testo: Caricamento Audio Disabilitato" : "Trascina i tuoi file mp3 qui o clicca per selezionarli"}
          </p>
        </div>
      </div>

      {/* YouTube Import Area */}
      {!isTextOnly && (
        <div className="bg-dark-surface border border-gray-800 rounded-2xl p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Youtube className="text-red-500" size={24} />
            <h3 className="font-semibold text-gray-200">Importa da YouTube</h3>
          </div>
          <textarea
            value={youtubeLinks}
            onChange={(e) => setYoutubeLinks(e.target.value)}
            disabled={isProcessingYoutube}
            placeholder="Incolla qui i link YouTube (uno per riga)...&#10;In automatico l'IA cercherà di scaricare l'audio ed estrarre Titolo e Artista."
            className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-red-500 transition-colors h-24 resize-y mb-4"
          />
          <button
            type="button"
            onClick={handleAddYoutubeLinks}
            disabled={isProcessingYoutube || !youtubeLinks.trim()}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isProcessingYoutube || !youtubeLinks.trim()
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/50 hover:scale-[1.02]'
              }`}
          >
            {isProcessingYoutube ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Elaborazione Link in corso...
              </>
            ) : (
              <>
                <Youtube size={18} /> Scarica e Aggiungi alla Coda
              </>
            )}
          </button>
        </div>
      )}

      {/* Batch Files Carousel */}
      {!isTextOnly && audioFilesData.length > 0 && (
        <div className="bg-dark-surface rounded-xl p-0 border border-gray-800 overflow-hidden">
          {/* Header Carosello */}
          <div className="bg-gray-800/40 border-b border-gray-800 p-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2">
              <Music size={18} /> Brano {currentIndex + 1} di {audioFilesData.length}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
                disabled={currentIndex === 0}
                className="p-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Brano Precedente"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex(c => Math.min(audioFilesData.length - 1, c + 1))}
                disabled={currentIndex === audioFilesData.length - 1}
                className="p-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Brano Successivo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {(() => {
              const data = audioFilesData[currentIndex];
              if (!data) return null;

              return (
                <div key={data.id} className="space-y-6">
                  {/* File origin info & remove button */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-mono mb-1 select-all break-all">{data.file.name}</p>
                      {data.isParseError && <p className="text-xs font-bold text-red-400 mt-1">⚠ Dividi manualmente l'artista dal titolo.</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAudioFile(data.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors shrink-0 ml-4"
                      title="Rimuovi Brano"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Meta: Artist & Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 mt-2">Nome Artista</label>
                      <input
                        type="text"
                        value={data.artistName}
                        onChange={(e) => updateAudioFileData(data.id, 'artistName', e.target.value)}
                        placeholder="Nome Artista"
                        className={`w-full bg-dark-bg border rounded-lg p-3 text-sm outline-none transition-colors ${data.isParseError && !data.artistName ? 'border-red-500/50 text-red-200' : 'border-gray-700 text-gray-200 focus:border-indigo-500'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 mt-2">Titolo Brano</label>
                      <input
                        type="text"
                        value={data.songTitle}
                        onChange={(e) => updateAudioFileData(data.id, 'songTitle', e.target.value)}
                        placeholder="Titolo Brano"
                        className={`w-full bg-dark-bg border rounded-lg p-3 text-sm outline-none transition-colors ${data.isParseError && !data.songTitle ? 'border-red-500/50 text-red-200' : 'border-gray-700 text-gray-200 focus:border-indigo-500'}`}
                      />
                    </div>
                  </div>

                  {/* Specific Meta: Lyrics */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="inline-flex text-xs font-bold text-gray-400 uppercase tracking-widest gap-2 items-center">
                        <AlignLeft size={14} /> Testo / Lyrics
                      </label>
                      {audioFilesData.length > 1 && (
                        <button type="button" onClick={() => copyToAll('lyrics')} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-2 py-1 rounded">
                          <Copy size={12} /> Copia a Tutti
                        </button>
                      )}
                    </div>
                    <textarea
                      value={data.lyrics || ''}
                      onChange={(e) => updateAudioFileData(data.id, 'lyrics', e.target.value)}
                      placeholder="Incolla qui il testo di questo brano (opzionale)..."
                      className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-indigo-500 h-28 resize-y transition-all text-sm font-mono"
                    />
                  </div>

                  {/* Specific Meta: Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="inline-flex text-xs font-bold text-gray-400 uppercase tracking-widest gap-2 items-center">
                        <FileText size={14} /> Biografia / Contesto
                      </label>
                      {audioFilesData.length > 1 && (
                        <button type="button" onClick={() => copyToAll('bio')} className="text-xs flex items-center gap-1 text-accent-secondary hover:text-pink-300 transition-colors bg-accent-secondary/10 px-2 py-1 rounded">
                          <Copy size={12} /> Copia a Tutti
                        </button>
                      )}
                    </div>
                    <textarea
                      value={data.bio || ''}
                      onChange={(e) => updateAudioFileData(data.id, 'bio', e.target.value)}
                      placeholder="Contesto o nota biografica per questo brano..."
                      className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-accent-secondary h-20 resize-y transition-all text-sm"
                    />
                  </div>

                  {/* Specific Meta: Images */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="inline-flex text-xs font-bold text-gray-400 uppercase tracking-widest gap-2 items-center">
                        <Camera size={14} /> Immagini Moda
                      </label>
                      {audioFilesData.length > 1 && data.images.length > 0 && (
                        <button type="button" onClick={() => copyToAll('images')} className="text-xs flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors bg-pink-500/10 px-2 py-1 rounded">
                          <Copy size={12} /> Copia a Tutti
                        </button>
                      )}
                    </div>
                    {data.images.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        {data.images.map((img, idx) => (
                          <div key={idx} className="relative group rounded-md overflow-hidden border border-gray-600 w-20 h-20 shadow-lg">
                            <img src={URL.createObjectURL(img)} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImageForFile(data.id, idx)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <X className="text-white" size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label
                      htmlFor={`image-upload-${data.id}`}
                      className="inline-flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:text-white hover:border-pink-500 hover:bg-pink-500/10 cursor-pointer transition-all font-medium"
                    >
                      <ImageIcon size={16} />
                      Carica Foto (Look)
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
              );
            })()}
          </div>
        </div>
      )}

      {/* Text Only Inputs */}
      {isTextOnly && (
        <>
          <div className="bg-dark-surface rounded-xl p-6 border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)] mb-4">
            <div className="flex items-center gap-2 mb-4">
              <AlignLeft className="text-indigo-400" size={20} />
              <h3 className="font-semibold text-white">
                Testo / Lyrics <span className="text-xs text-indigo-400 ml-2 uppercase tracking-wider border border-indigo-500/30 px-2 py-0.5 rounded">Obbligatorio</span>
              </h3>
            </div>
            <textarea
              value={textOnlyLyrics}
              onChange={(e) => setTextOnlyLyrics(e.target.value)}
              placeholder="Incolla qui il testo della canzone per analizzarlo..."
              className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-40 resize-y transition-all placeholder-gray-600 font-mono text-sm leading-relaxed"
            />
          </div>
          <div className="bg-dark-surface rounded-xl p-6 border border-gray-800 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="text-accent-secondary" size={20} />
              <h3 className="font-semibold text-gray-200">Biografia Artista / Contesto</h3>
            </div>
            <textarea
              value={textOnlyBio}
              onChange={(e) => setTextOnlyBio(e.target.value)}
              placeholder="Racconta qualcosa sull'artista, sul brano o sul genere... (opzionale)"
              className="w-full bg-dark-bg border border-gray-700 rounded-lg p-4 text-gray-300 focus:outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary h-24 resize-none transition-all placeholder-gray-600"
            />
          </div>
        </>
      )}

      {/* Shared Metadata (Tag) */}
      <div className="bg-dark-surface rounded-xl p-6 border border-gray-800 space-y-4">
        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
          <FileText size={18} /> Metadati Condivisi
        </h3>
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="#Tag opzionale (es. Sanremo 2026, ...)"
          className="w-full bg-dark-bg border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-all placeholder-gray-600"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row justify-center gap-4">
        {allowSingle && (
          <button
            onClick={(e) => handleSubmit(e, false)}
            disabled={isLoading || (isTextOnly ? !textOnlyLyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect}
            className={`
              py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 w-full md:w-auto min-w-[200px]
              ${isLoading || (isTextOnly ? !textOnlyLyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect
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
            disabled={isLoading || (isTextOnly ? !textOnlyLyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect}
            className={`
              py-4 px-8 rounded-xl font-bold text-sm lg:text-base shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 w-full md:w-auto min-w-[200px]
              ${isLoading || (isTextOnly ? !textOnlyLyrics.trim() : audioFilesData.length === 0) || !isPasswordCorrect
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