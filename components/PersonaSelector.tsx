import React from 'react';
import { PERSONAS } from '../constants';
import { PersonaId } from '../types';
import { BookOpen, Frown, Sparkles, Zap, Skull, CheckCircle, Scroll, Mic2, Moon, Star, Cpu, Smartphone, Radio } from 'lucide-react';

interface PersonaSelectorProps {
  selectedPersona: PersonaId;
  onSelect: (id: PersonaId) => void;
}

const IconMap = {
  BookOpen, // Classicist (Legacy)
  Frown,    // Cynic
  Sparkles, // Pop (Legacy)
  Zap,      // Avantgarde
  Skull,    // Metal
  Scroll,   // Traditionalist
  Mic2,     // Sanremese
  Moon,     // Emo Dark
  Star,     // Pop
  Cpu,      // Techno
  Smartphone, // Teen
  Radio     // Oldies
};

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ selectedPersona, onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {(Object.values(PERSONAS) as any[]).map((persona) => {
        const IconComponent = IconMap[persona.icon as keyof typeof IconMap];
        const isSelected = selectedPersona === persona.id;

        return (
          <button
            key={persona.id}
            onClick={() => onSelect(persona.id)}
            className={`
              relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center text-center h-full
              ${isSelected
                ? `bg-dark-surface border-${persona.color.split('-')[1]}-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] scale-105 z-10`
                : 'bg-dark-surface/50 border-gray-800 hover:border-gray-600 hover:bg-dark-surface'}
            `}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 text-green-500">
                <CheckCircle size={16} />
              </div>
            )}

            <div className={`mb-3 p-3 rounded-full bg-gray-900 ${isSelected ? persona.color : 'text-gray-500'}`}>
              <IconComponent size={24} />
            </div>

            <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
              {persona.name}
            </h3>

            <p className="text-xs text-gray-500 line-clamp-3">
              {persona.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;