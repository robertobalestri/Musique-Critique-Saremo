
import React from 'react';
import { Activity, Zap, Volume2, Sun, Waves, Music2 } from 'lucide-react';

interface AudioFeatureViewProps {
  report: string;
  onClose: () => void;
}

const AudioFeatureView: React.FC<AudioFeatureViewProps> = ({ report, onClose }) => {
  // Parser updated to handle the specific format with tabs or variable spacing
  const parseReport = (text: string) => {
    // Split into blocks separated by double newlines or empty lines
    const sections = text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    const title = sections[0];

    // Skip title, process data blocks
    const dataPoints = sections.slice(1).map(section => {
      const lines = section.split('\n').filter(l => l.trim().length > 0);

      // Line 0: "Tempo:" or "Tempo: \t"
      const name = lines[0].replace(':', '').trim();

      let numericValue = 'N/A';
      let numericUnit = '';
      let categoryValue = 'N/A';

      // Find lines starting with - Numeric and - Category
      const numericLine = lines.find(l => l.trim().startsWith('- Numeric:'));
      const categoryLine = lines.find(l => l.trim().startsWith('- Category:'));

      if (numericLine) {
        // Format: "- Numeric: \t 103,41 \t BPM"
        const parts = numericLine.replace('- Numeric:', '').trim().split(/\s+/); // split by whitespace/tabs
        if (parts.length > 0) {
          numericValue = parts[0];
          if (parts.length > 1) numericUnit = parts.slice(1).join(' ');
        }
      }

      if (categoryLine) {
        // Format: "- Category: \t Mid"
        categoryValue = categoryLine.replace('- Category:', '').trim();
      }

      return {
        name,
        value: numericValue,
        unit: numericUnit,
        category: categoryValue
      };
    });

    return { title, dataPoints };
  };

  const { title, dataPoints } = parseReport(report);

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('tempo')) return <Activity className="text-blue-400" />;
    if (n.includes('energy') || n.includes('loudness')) return <Zap className="text-yellow-400" />;
    if (n.includes('dynamic')) return <Waves className="text-cyan-400" />;
    if (n.includes('brightness') || n.includes('frequency')) return <Sun className="text-orange-400" />;
    if (n.includes('texture') || n.includes('roughness')) return <Volume2 className="text-red-400" />;
    return <Music2 className="text-purple-400" />;
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in zoom-in duration-300 mb-12">
      <div className="bg-dark-surface border border-gray-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
              <Activity /> Analisi Tecnica Audio
            </h2>
            <p className="text-gray-400 text-sm font-mono">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            Chiudi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {dataPoints.map((item, idx) => (
            <div
              key={idx}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all group flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider leading-tight max-w-[70%]">{item.name}</h3>
                  <div className="p-1.5 bg-gray-800 rounded-md group-hover:bg-gray-700 transition-colors">
                    {getIcon(item.name)}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-mono text-white font-bold">{item.value}</span>
                  <span className="text-xs text-gray-500">{item.unit}</span>
                </div>
              </div>

              <div className="mt-auto pt-2 border-t border-gray-800/50">
                <span className={`text-xs px-2 py-1 rounded-md border 
                      ${item.category.includes('High') || item.category.includes('Bright') ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                    item.category.includes('Low') || item.category.includes('Dark') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-gray-800 text-gray-300 border-gray-700'}`}>
                  {item.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            Powered by Meyda & Web Audio Beat Detector
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioFeatureView;
