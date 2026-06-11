async function getImage(targetText, usedUrls = []) {
    const firstLine = targetText.split('\n')[0].trim();
    
    const searchTerms = [
        firstLine.match(/M\d+/)?.[0],
        firstLine.match(/NGC\s?\d+/)?.[0],
        firstLine.match(/IC\s?\d+/)?.[0],
        firstLine
    ].filter(Boolean);

    const badKeywords = ['astronaut', 'engineer', 'scientist', 'president',
        'administrator', 'center', 'facility', 'staff', 'team', 'crew',
        'launch', 'rocket', 'shuttle', 'station', 'satellite', 'portrait'];

    for (const term of searchTerms) {
        try {
            const nasaResponse = await fetch(
                `https://images-api.nasa.gov/search?q=${encodeURIComponent(term)}&media_type=image`
            );
            const nasaData = await nasaResponse.json();

            if (nasaData.collection.items.length > 0) {
                for (const item of nasaData.collection.items) {
                    const title = (item.data?.[0]?.title || '').toLowerCase();
                    const description = (item.data?.[0]?.description || '').toLowerCase();
                    const isBad = badKeywords.some(word => title.includes(word));
                    const href = item.links?.[0]?.href;
                    const isAstronomy = title.includes('galaxy') ||
                        title.includes('nebula') ||
                        title.includes('cluster') ||
                        title.includes('star') ||
                        title.includes('ngc') ||
                        title.includes('ic ') ||
                        description.includes('telescope') ||
                        description.includes('observatory');

                    if (!isBad && href && !usedUrls.includes(href) && isAstronomy) {
                        usedUrls.push(href);
                        return href;
                    }
                }
            }
        } catch (error) {
            console.log('NASA search failed for term:', term);
        }
    }

    return 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg';
}

let selectedDifficulty = 'showpiece';

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedDifficulty = this.dataset.value;
    });
});

async function planMyNight() {
    const location = document.getElementById('location').value;
    const equipment = document.getElementById('equipment').value;
    const date = document.getElementById('date').value;

    if (!location || !date) {
        document.getElementById('results-section').innerHTML =
            '<p style="color: #ff6b6b;">Please enter your location and date.</p>';
        return;
    }

    document.getElementById('results-section').innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 24px;">
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <style>
                .star { fill: #4ade80; opacity: 0; animation: starAppear 0.3s ease forwards; }
                .line { stroke: #4ade80; stroke-width: 1; opacity: 0; animation: lineAppear 0.4s ease forwards; }
                @keyframes starAppear { to { opacity: 1; } }
                @keyframes lineAppear { to { opacity: 0.3; } }
            </style>
            <!-- Stars -->
            <circle class="star" cx="100" cy="30" r="2.5" style="animation-delay: 0.0s"/>
            <circle class="star" cx="160" cy="70" r="2" style="animation-delay: 0.2s"/>
            <circle class="star" cx="140" cy="140" r="2.5" style="animation-delay: 0.4s"/>
            <circle class="star" cx="60" cy="150" r="2" style="animation-delay: 0.6s"/>
            <circle class="star" cx="40" cy="80" r="2.5" style="animation-delay: 0.8s"/>
            <circle class="star" cx="100" cy="100" r="1.5" style="animation-delay: 1.0s"/>
            <circle class="star" cx="130" cy="55" r="1.5" style="animation-delay: 1.2s"/>
            <circle class="star" cx="75" cy="60" r="1.5" style="animation-delay: 1.4s"/>
            <!-- Constellation lines -->
            <line class="line" x1="100" y1="30" x2="160" y2="70" style="animation-delay: 0.3s"/>
            <line class="line" x1="160" y1="70" x2="140" y2="140" style="animation-delay: 0.5s"/>
            <line class="line" x1="140" y1="140" x2="60" y2="150" style="animation-delay: 0.7s"/>
            <line class="line" x1="60" y1="150" x2="40" y2="80" style="animation-delay: 0.9s"/>
            <line class="line" x1="40" y1="80" x2="100" y2="30" style="animation-delay: 1.1s"/>
            <line class="line" x1="100" y1="30" x2="100" y2="100" style="animation-delay: 1.3s"/>
            <line class="line" x1="160" y1="70" x2="130" y2="55" style="animation-delay: 1.5s"/>
            <line class="line" x1="40" y1="80" x2="75" y2="60" style="animation-delay: 1.7s"/>
        </svg>
        <p style="color: #4ade80; font-family: Orbitron, sans-serif; font-size: 0.75rem; letter-spacing: 4px; margin: 0; animation: pulse 1.5s ease-in-out infinite;">SCANNING THE SKIES</p>
    </div>
    <style>
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    </style>
`;

    try {
        const response = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, equipment, date, difficulty: selectedDifficulty })
        });

        const data = await response.json();
        const result = data.result;

        if (!result) {
            document.getElementById('results-section').innerHTML =
                '<p style="color: #ff6b6b;">Could not generate a plan. Please try again.</p>';
            return;
        }

        const targets = result.split(/TARGET \d+:/)
            .filter(t => t.trim())
            .map(t => t.replace(/Best conditions note:.*/is, '').trim());

        const conditionsMatch = result.match(/Best conditions note:(.*)/i);
        const conditionsNote = conditionsMatch ? conditionsMatch[1].trim() : '';

        const usedUrls = [];
        const images = [];
        for (const target of targets) {
            const img = await getImage(target, usedUrls);
            images.push(img);
        }

        let cardsHTML = '<h2 style="color: #4ade80; margin-bottom: 24px; letter-spacing: 4px; font-family: Orbitron, sans-serif; font-size: 1.2rem;">TONIGHT\'S PLAN</h2>';
        cardsHTML += '<div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px;">';

        targets.forEach((target, index) => {
            const imageUrl = images[index];
            cardsHTML += `
                <div class="target-card">
                    <img src="${imageUrl}" alt="Target image"/>
                    <p class="target-label">TARGET ${index + 1}</p>
                    <p class="target-text">${target.trim()}</p>
                </div>
            `;
        });

        cardsHTML += '</div>';

        if (conditionsNote) {
            cardsHTML += `
                <div style="
                    background-color: #0d0d2b;
                    border: 1px solid #1e1e3a;
                    border-radius: 8px;
                    padding: 14px 20px;
                    color: #666688;
                    font-family: Rajdhani, sans-serif;
                    font-size: 1rem;
                ">
                    Best conditions note: ${conditionsNote}
                </div>
            `;
        }

        document.getElementById('results-section').innerHTML = cardsHTML;

    } catch (error) {
        document.getElementById('results-section').innerHTML =
            '<p style="color: #ff6b6b;">Something went wrong. Please try again.</p>';
        console.error(error);
    }
}

document.getElementById('plan-button').addEventListener('click', planMyNight);