import React from 'react';
import { AnalysisResponse, PersonaId } from '../types';
import { PERSONAS } from '../constants';
import { Quote, Star, Share2, RefreshCw, AlertTriangle, TrendingUp, Music, FileText, Download } from 'lucide-react';
import { exportToCSV } from '../services/exportService';

interface CritiqueViewProps {
  result: AnalysisResponse;
  personaId: PersonaId;
  metadata: { artistName: string; songTitle: string; isBand: boolean };
  fashionCritique?: string | null;
  onReset: () => void;
}

const CritiqueView: React.FC<CritiqueViewProps> = ({ result, personaId, onReset, metadata, fashionCritique }) => {
  const persona = PERSONAS[personaId];
  const { lyricalAnalysis, musicalAnalysis } = result;

  // Function to render stars based on rating (0-100 normalized to 0-5)
  const renderStars = (score: number) => {
    const stars = [];
    const maxStars = 5;
    const normalizedRating = Math.round(score / 20 * 2) / 2; // Convert 0-100 to 0-5 with .5 precision

    for (let i = 1; i <= maxStars; i++) {
      if (i <= normalizedRating) {
        stars.push(<Star key={i} size={24} fill="currentColor" className={persona.color} />);
      } else if (i - 0.5 === normalizedRating) {
        stars.push(
          <div key={i} className="relative">
            <Star size={24} className="text-gray-700" />
            <div className="absolute top-0 left-0 w-1/2 overflow-hidden">
              <Star size={24} fill="currentColor" className={persona.color} />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} size={24} className="text-gray-700" />);
      }
    }
    return stars;
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-in slide-in-from-bottom-10 fade-in duration-500 pb-12">

      {/* Header Card: Final Score & Interpretation */}
      <div className="bg-dark-surface border border-gray-800 rounded-2xl overflow-hidden shadow-2xl mb-8 relative">
        <div className={`h-2 w-full bg-gradient-to-r ${personaId === 'metal' ? 'from-red-900 to-black' :
          personaId === 'pop' ? 'from-pink-500 to-purple-500' :
            personaId === 'classicist' ? 'from-amber-200 to-amber-600' :
              personaId === 'avantgarde' ? 'from-purple-600 to-indigo-900' :
                'from-gray-500 to-gray-800'
          }`} />

        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full bg-gray-900 border border-gray-800 ${persona.color}`}>
                <Quote size={40} />
              </div>
              <div>
                <h2 className={`text-3xl font-serif font-bold ${persona.color}`}>{persona.name}</h2>
                <p className="text-gray-400 text-sm">Giudizio Finale</p>
              </div>
            </div>

            {/* Score Header */}
            <div className="flex flex-col items-center mb-8 animate-in zoom-in duration-500">
              <div className={`text-6xl font-black ${persona.color} drop-shadow-2xl mb-2`}>
                {result.lyricalAnalysis.finalScore}
                <span className="text-2xl text-gray-500 font-medium">/100</span>
              </div>

              {/* Journalistic Summary */}
              {result.lyricalAnalysis.journalisticSummary && (
                <div className="max-w-xl text-center mt-2 mb-6">
                  <p className={`text-xl italic font-serif text-gray-300 leading-relaxed border-l-4 ${persona.color.replace('text-', 'border-')} pl-4`}>
                    "{result.lyricalAnalysis.journalisticSummary}"
                  </p>
                </div>
              )}

              {/* Categories Radar/Bar Chart Substitute (Simple Bars for now) */}
              <div className="w-full max-w-md space-y-2 mt-4">
                <div className="flex gap-1 mb-2 justify-center">
                  {renderStars(lyricalAnalysis.finalScore)}
                </div>
                <div className="text-sm text-gray-500 font-mono text-center">
                  Confidenza: {lyricalAnalysis.scoreLowerBound} - {lyricalAnalysis.scoreUpperBound}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 mb-6">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Il Verdetto</h3>
            <p className="text-xl md:text-2xl font-serif italic text-gray-200 leading-relaxed">
              "{lyricalAnalysis.interpretation}"
            </p>
          </div>

          {lyricalAnalysis.penalties > 0 && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/10 p-3 rounded-lg border border-red-900/30">
              <AlertTriangle size={18} />
              <span className="font-semibold">Penalità applicate: -{lyricalAnalysis.penalties} punti</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Musical Analysis Column */}
        <div className="space-y-8">
          {musicalAnalysis && (
            <section className="bg-dark-surface border border-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4 text-accent-primary">
                <Music size={24} />
                <h3 className="font-bold text-lg text-white">Analisi Musicale</h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-line leading-relaxed">
                {musicalAnalysis}
              </div>
            </section>
          )}

          <section className="bg-dark-surface border border-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4 text-green-400">
              <TrendingUp size={24} />
              <h3 className="font-bold text-lg text-white">Aree di Miglioramento</h3>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
              {lyricalAnalysis.areasForImprovement}
            </div>
          </section>
        </div>

        {/* Scorecard Column */}
        <div className="bg-dark-surface border border-gray-800 rounded-2xl p-6 shadow-lg h-fit">
          <div className="flex items-center gap-2 mb-6 text-accent-secondary">
            <FileText size={24} />
            <h3 className="font-bold text-lg text-white">Pagella Dettagliata</h3>
          </div>

          <div className="space-y-6">
            {lyricalAnalysis.scorecard.map((item, idx) => (
              <div key={idx} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-200">{item.category}</span>
                  <span className={`font-mono font-bold ${item.score / item.maxScore > 0.8 ? 'text-green-400' :
                    item.score / item.maxScore > 0.5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                    {item.score}/{item.maxScore}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-800 h-1.5 rounded-full mb-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.score / item.maxScore > 0.8 ? 'bg-green-500' :
                      item.score / item.maxScore > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 italic leading-snug">
                  {item.justification}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
            <span className="text-gray-400 uppercase tracking-widest text-xs">Subtotale</span>
            <span className="text-xl font-bold text-white">{lyricalAnalysis.subtotal}</span>
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center mt-12">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all hover:scale-105 font-medium shadow-lg"
        >
          <RefreshCw size={20} />
          Nuova Analisi
        </button>

        <button
          onClick={() => exportToCSV({ [personaId]: result }, null, null, metadata, `analisi_${persona.name.replace(/\s+/g, '_')}_${Date.now()}.csv`, fashionCritique)}
          className="flex items-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all hover:scale-105 font-medium shadow-lg"
        >
          <Download size={20} />
          Esporta CSV
        </button>

        <button className="flex items-center gap-2 px-8 py-4 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded-full transition-all hover:scale-105 font-medium">
          <Share2 size={20} />
          Condividi
        </button>
      </div>

    </div>
  );
};

export default CritiqueView;