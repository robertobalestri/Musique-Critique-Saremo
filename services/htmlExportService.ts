import { AnalysisResponse, PersonaId } from '../types';
import { PERSONAS } from '../constants';

export const exportToHTML = (
    results: Record<string, AnalysisResponse>,
    synthesis: string | null,
    averageScore: number | null,
    metadata: { artistName: string; songTitle: string; isBand: boolean },
    filename: string,
    fashionCritique: string | null = null
) => {
    const personaIds = Object.keys(results) as PersonaId[];

    // Generate HTML Content
    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.songTitle ? `${metadata.songTitle} - ` : ''}Il Giudizio Universale - Report Analisi Musicale</title>
    <style>
        :root {
            --bg-dark: #0f172a;
            --bg-card: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --border-color: #334155;
            --accent-color: #8b5cf6;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-primary);
            margin: 0;
            padding: 40px 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 60px;
        }

        h1 {
            font-size: 3rem;
            background: linear-gradient(to right, #fcd34d, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }

        .metadata-hero {
            margin-bottom: 30px;
        }

        .metadata-title {
            font-size: 2.5rem;
            font-weight: 800;
            color: #fff;
            margin: 0;
            line-height: 1.2;
        }

        .metadata-artist {
            font-size: 1.5rem;
            color: #94a3b8;
            font-weight: 400;
            margin-top: 5px;
        }

        .tag-band {
            display: inline-block;
            font-size: 0.75rem;
            background-color: #334155;
            color: #e2e8f0;
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-left: 10px;
            vertical-align: middle;
        }

        .average-score {
            display: inline-flex;
            align-items: center;
            gap: 15px;
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid var(--border-color);
            padding: 15px 30px;
            border-radius: 50px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .average-score .value {
            font-size: 2.5rem;
            font-weight: 900;
        }

        .synthesis-card {
            background: linear-gradient(to bottom, #1f2937, #111827);
            border: 1px solid var(--border-color);
            padding: 40px;
            border-radius: 20px;
            margin: 40px auto;
            max-width: 800px;
            text-align: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .synthesis-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            opacity: 0.5;
        }

        .synthesis-text {
            font-family: 'Georgia', serif;
            font-style: italic;
            font-size: 1.25rem;
            color: #e2e8f0;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 25px;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .card:hover {
            transform: translateY(-5px);
            border-color: #64748b;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .card-header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
            margin-bottom: 15px;
        }

        .persona-name {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0;
        }

        .score {
            font-size: 3rem;
            font-weight: 800;
            margin: 10px 0;
        }

        .score span {
            font-size: 1rem;
            font-weight: 400;
            color: var(--text-secondary);
        }

        .summary {
            font-size: 0.9rem;
            color: #cbd5e1;
            font-style: italic;
            margin-bottom: 20px;
        }

        .click-hint {
            font-size: 0.8rem;
            color: var(--text-secondary);
            font-family: monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            z-index: 1000;
            overflow-y: auto;
            padding: 20px;
            box-sizing: border-box;
        }

        .modal.active {
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }

        .modal-content {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 40px;
            max-width: 900px;
            width: 100%;
            margin-top: 50px;
            position: relative;
             animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 2rem;
            cursor: pointer;
        }

        .detail-section {
            margin-bottom: 30px;
        }

        .detail-title {
            font-size: 1.1rem;
            font-weight: bold;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 5px;
        }

        .scorecard-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .scorecard-bar-container {
            flex-grow: 1;
            margin: 0 15px;
            background-color: rgba(255,255,255,0.1);
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
        }

        .scorecard-bar {
            height: 100%;
            background-color: var(--accent-color);
        }

    </style>
</head>
<body>

    <div class="container">
        <div class="header">
            <h1>Il Giudizio Universale</h1>
            
            ${(metadata.songTitle || metadata.artistName) ? `
            <div class="metadata-hero">
                <h2 class="metadata-title">${metadata.songTitle}</h2>
                <div class="metadata-artist">
                    ${metadata.artistName}
                    ${metadata.isBand ? '<span class="tag-band">BAND</span>' : ''}
                </div>
            </div>
            ` : ''}
            
            ${averageScore !== null ? `
            <div class="average-score">
                <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8;">Media Critica</span>
                <span class="value">${averageScore}</span>
                <span style="color: #64748b;">/100</span>
            </div>
            ` : ''}

            ${synthesis ? `
            <div class="synthesis-card">
                <h3 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; margin-bottom: 20px;">Verdetto Editoriale</h3>
                <p class="synthesis-text">"${synthesis}"</p>
            </div>
            ` : ''}

            ${fashionCritique ? `
            <div class="synthesis-card" style="border-color: rgba(236, 72, 153, 0.3); background: linear-gradient(to bottom, #1f1a20, #110e13);">
                <h3 style="color: #ec4899; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8rem; margin-bottom: 20px;">Critica Fashion / Look</h3>
                <p class="synthesis-text" style="color: #fce7f3;">${fashionCritique.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
        </div>

        <div class="grid">
            ${personaIds.map(id => {
        const result = results[id];
        const persona = PERSONAS[id];
        const color = persona.color.replace('text-', 'color: ').replace('text-gray-200', 'color: #e2e8f0'); // Simple conversion attempt, ideally use hex in constants

        // We embed the full data in a data attribute
        const safeData = JSON.stringify({
            name: persona.name,
            score: result.lyricalAnalysis.finalScore,
            summary: result.lyricalAnalysis.journalisticSummary,
            interpretation: result.lyricalAnalysis.interpretation,
            musicalAnalysis: result.musicalAnalysis,
            scorecard: result.lyricalAnalysis.scorecard,
            areas: result.lyricalAnalysis.areasForImprovement
        }).replace(/"/g, '&quot;');

        return `
                <div class="card" onclick="openModal(this)" data-details="${safeData}">
                    <div class="card-header">
                        <h3 class="persona-name" style="color: ${getDefaultColor(id)}">${persona.name}</h3>
                    </div>
                    <div class="score">
                        ${result.lyricalAnalysis.finalScore}<span>/100</span>
                    </div>
                    <p class="summary">"${result.lyricalAnalysis.journalisticSummary}"</p>
                    <div class="click-hint">Clicca per leggere tutto</div>
                </div>
              `;
    }).join('')}
        </div>
    </div>

    <!-- Modal Template -->
    <div id="detailModal" class="modal" onclick="if(event.target === this) closeModal()">
        <div class="modal-content">
            <button class="close-btn" onclick="closeModal()">&times;</button>
            <h2 id="modalTitle" style="font-size: 2rem; margin-bottom: 10px;"></h2>
            <div id="modalScore" style="font-size: 3rem; font-weight: 900; margin-bottom: 30px;"></div>
            
            <div class="detail-section">
                <div class="detail-title">Il Verdetto</div>
                <p id="modalInterpretation" style="font-family: 'Georgia', serif; font-size: 1.1rem; line-height: 1.8; font-style: italic; color: #e2e8f0;"></p>
            </div>

            <div class="detail-section">
                <div class="detail-title">Pagella</div>
                <div id="modalScorecard"></div>
            </div>

            <div class="detail-section">
                <div class="detail-title">Analisi Musicale</div>
                <p id="modalMusical" style="white-space: pre-line; color: #cbd5e1;"></p>
            </div>

             <div class="detail-section">
                <div class="detail-title">Aree di Miglioramento</div>
                <p id="modalAreas" style="white-space: pre-wrap; color: #cbd5e1;"></p>
            </div>

        </div>
    </div>

    <script>
        function openModal(card) {
            const data = JSON.parse(card.getAttribute('data-details'));
            
            document.getElementById('modalTitle').innerText = data.name;
            document.getElementById('modalTitle').style.color = getPersonColor(data.name);
            document.getElementById('modalScore').innerText = data.score + "/100";
            document.getElementById('modalInterpretation').innerText = '"' + data.interpretation + '"';
            document.getElementById('modalMusical').innerText = data.musicalAnalysis || "N/A";
            document.getElementById('modalAreas').innerText = data.areas;

            // Render Scorecard
            const scorecardEl = document.getElementById('modalScorecard');
            scorecardEl.innerHTML = data.scorecard.map(item => {
                const percentage = (item.score / item.maxScore) * 100;
                let barColor = '#ef4444'; // red
                if(percentage > 50) barColor = '#eab308'; // yellow
                if(percentage > 80) barColor = '#22c55e'; // green

                return \`
                    <div class="scorecard-item">
                        <div style="width: 30%; font-weight: bold;">\${item.category}</div>
                        <div class="scorecard-bar-container">
                            <div class="scorecard-bar" style="width: \${percentage}%; background-color: \${barColor}"></div>
                        </div>
                        <div style="width: 15%; text-align: right; font-family: monospace;">\${item.score}/\${item.maxScore}</div>
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; font-style: italic; margin-bottom: 15px;">\${item.justification}</div>
                \`;
            }).join('');

            document.getElementById('detailModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            document.getElementById('detailModal').classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        function getPersonColor(name) {
            // Simple mapping based on visual identity
            if(name.includes('Oldies')) return '#f59e0b';
            if(name.includes('Teen')) return '#ec4899';
            if(name.includes('Metal')) return '#ef4444';
            if(name.includes('Pop')) return '#d946ef';
            if(name.includes('Avant')) return '#8b5cf6';
            if(name.includes('Classico')) return '#fbbf24';
             if(name.includes('Techno')) return '#10b981';
            return '#f1f5f9';
        }
    </script>
</body>
</html>
  `;

    // Create Blob and Download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Helper for consistent colors in the grid
function getDefaultColor(id: string): string {
    switch (id) {
        case 'metal': return '#ef4444';
        case 'pop': return '#d946ef';
        case 'classicist': return '#fbbf24';
        case 'avantgarde': return '#8b5cf6';
        case 'teen': return '#ec4899';
        case 'oldies': return '#f59e0b';
        case 'techno': return '#10b981';
        case 'emo_dark': return '#6366f1';
        case 'cynic': return '#94a3b8';
        case 'sanremese': return '#3b82f6';
        default: return '#f1f5f9';
    }
}
