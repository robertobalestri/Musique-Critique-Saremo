import { AnalysisResponse, PersonaId } from '../types';
import { PERSONAS } from '../constants';

export const exportToCSV = (
    results: Record<string, AnalysisResponse>,
    synthesis: string | null,
    averageScore: number | null,
    metadata: { artistName: string; songTitle: string; isBand: boolean },
    filename: string = 'analisi_musicale.csv'
) => {
    if (!results) return;

    // List of standard categories to ensure column order
    const standardCategories = [
        'Tema e Concetto',
        'Immaginario e Linguaggio',
        'Narrativa e Struttura',
        'Voce e Punto di Vista',
        'Autenticità Emotiva e Impatto',
        'Prosodia e Cantabilità',
        'Rima e Tecnica Poetica',
        'Originalità e Rischio',
        'Coesione ed Economia',
        'Memorabilità e Hook'
    ];

    // Helper to map incoming category names to standard ones if needed
    // (Currently assuming exact matches or partial matches)
    const normalizeCategory = (cat: string) => {
        return standardCategories.find(sc => cat.includes(sc)) || cat;
    };


    // 1. Define Columns (Headers)
    const headers = [
        'ID',
        'Artista',
        'Brano',
        'Media Critica',
        'Verdetto Editoriale (Caporedattore)',
        'Critico',
        'Voto Finale / 100',
        'Sintesi Giornalistica',
        'Interpretazione Estesa',
        'Analisi Musicale',
        'Aree di Miglioramento',
        'Penalità',
        // Dynamic Rubric Columns: Vote and Comment for each category
        ...standardCategories.flatMap(cat => [`Rubrica: ${cat} - Voto`, `Rubrica: ${cat} - Commento`])
    ];

    // 2. Build Data Rows
    const rows = Object.entries(results).map(([personaId, analysis], index) => {
        const persona = PERSONAS[personaId as PersonaId];
        const lyrical = analysis.lyricalAnalysis;

        // Map scorecard items for easy access
        const scorecardMap: Record<string, { score: string; comment: string }> = {};

        lyrical.scorecard.forEach(item => {
            const normalizedCat = normalizeCategory(item.category);
            scorecardMap[normalizedCat] = {
                score: `${item.score}/${item.maxScore}`,
                comment: (item.justification || '').replace(/"/g, '""')
            };
        });

        // Helper to safely quote strings for CSV
        const q = (str: string | null | undefined | number) => {
            if (str === null || str === undefined) return '""';
            return `"${String(str).replace(/"/g, '""')}"`;
        };

        return headers.map(header => {
            // -- Metadata --
            if (header === 'ID') return index + 1;
            if (header === 'Artista') return q(metadata.artistName);
            if (header === 'Brano') return q(metadata.songTitle);
            if (header === 'Media Critica') return averageScore !== null ? averageScore : '""';
            if (header === 'Verdetto Editoriale (Caporedattore)') return q(synthesis);

            // -- Critic Data --
            if (header === 'Critico') return q(persona.name);
            if (header === 'Voto Finale / 100') return lyrical.finalScore;
            if (header === 'Sintesi Giornalistica') return q(lyrical.journalisticSummary);
            if (header === 'Interpretazione Estesa') return q(lyrical.interpretation);
            if (header === 'Analisi Musicale') return q(analysis.musicalAnalysis);
            if (header === 'Aree di Miglioramento') return q(lyrical.areasForImprovement);
            if (header === 'Penalità') return lyrical.penalties;

            // -- Rubric Data --
            if (header.startsWith('Rubrica:')) {
                // Extract category name from header "Rubrica: [Category] - [Type]"
                const match = header.match(/Rubrica: (.+) - (Voto|Commento)/);
                if (match) {
                    const category = match[1];
                    const type = match[2];
                    const data = scorecardMap[category];

                    if (!data) return '""'; // Category not found for this critic

                    if (type === 'Voto') return `"${data.score}"`;
                    if (type === 'Commento') return `"${data.comment}"`;
                }
            }

            return '""';
        }).join(',');
    });

    // 3. Join CSV Content
    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    // 4. Create Blob and Download
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
