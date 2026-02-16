import { AnalysisResponse, PersonaId } from '../types';
import { PERSONAS } from '../constants';

export const exportToCSV = (results: Record<string, AnalysisResponse>, filename: string = 'analisi_musicale.csv') => {
    if (!results) return;

    // 1. Definiamo le colonne (Header)
    const headers = [
        'Critico',
        'Voto Finale / 100',
        'Sintesi Giornalistica',
        'Interpretazione Estesa',
        'Penalità',
        // Colonne Dinamiche per la Rubrica (useremo l'unione di tutte le categorie possibili)
        'Rubrica: Tema e Concetto',
        'Rubrica: Immaginario e Linguaggio',
        'Rubrica: Narrativa e Struttura',
        'Rubrica: Voce e Punto di Vista',
        'Rubrica: Autenticità Emotiva',
        'Rubrica: Prosodia e Cantabilità',
        'Rubrica: Rima e Tecnica',
        'Rubrica: Originalità e Rischio',
        'Rubrica: Coesione ed Economia',
        'Rubrica: Memorabilità e Hook'
    ];

    /* Mapping helper per normalizzare i nomi delle categorie se necessario */
    const categoryMap: Record<string, string> = {
        'Tema e Concetto': 'Rubrica: Tema e Concetto',
        'Immaginario e Linguaggio': 'Rubrica: Immaginario e Linguaggio',
        'Narrativa e Struttura': 'Rubrica: Narrativa e Struttura',
        'Voce e Punto di Vista': 'Rubrica: Voce e Punto di Vista',
        'Autenticità Emotiva e Impatto': 'Rubrica: Autenticità Emotiva',
        'Prosodia e Cantabilità': 'Rubrica: Prosodia e Cantabilità',
        'Rima e Tecnica Poetica': 'Rubrica: Rima e Tecnica',
        'Originalità e Rischio': 'Rubrica: Originalità e Rischio',
        'Coesione ed Economia': 'Rubrica: Coesione ed Economia',
        'Memorabilità e Hook': 'Rubrica: Memorabilità e Hook'
    };


    // 2. Costruiamo le righe di dati
    const rows = Object.entries(results).map(([personaId, analysis]) => {
        const persona = PERSONAS[personaId as PersonaId];
        const lyrical = analysis.lyricalAnalysis;

        // Prepariamo un oggetto per le categorie della rubrica
        const rubricScores: Record<string, string> = {};
        lyrical.scorecard.forEach(item => {
            // Cerchiamo una corrispondenza parziale o esatta
            const mappedHeader = Object.keys(categoryMap).find(key => item.category.includes(key));
            if (mappedHeader) {
                rubricScores[categoryMap[mappedHeader]] = `${item.score}/${item.maxScore}`;
            } else {
                // Fallback per categorie non mappate standard
                rubricScores[item.category] = `${item.score}/${item.maxScore}`;
            }
        });

        // Costruiamo la riga ordinata secondo gli headers
        return headers.map(header => {
            if (header === 'Critico') return `"${persona.name}"`;
            if (header === 'Voto Finale / 100') return lyrical.finalScore;
            if (header === 'Sintesi Giornalistica') return `"${(lyrical.journalisticSummary || '').replace(/"/g, '""')}"`;
            if (header === 'Interpretazione Estesa') return `"${(lyrical.interpretation || '').replace(/"/g, '""')}"`;
            if (header === 'Penalità') return lyrical.penalties;

            // Se è una colonna della rubrica
            if (header.startsWith('Rubrica:')) {
                return rubricScores[header] ? `"${rubricScores[header]}"` : '""';
            }

            return '""';
        }).join(',');
    });

    // 3. Uniamo tutto in una stringa CSV
    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    // 4. Creiamo il Blob e scateniamo il download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
