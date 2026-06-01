const imageDatabase = {
    'M13': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Messier_13_Hubble_WikiSky.jpg/600px-Messier_13_Hubble_WikiSky.jpg',
    'M57': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Ring_Nebula.jpg/600px-Ring_Nebula.jpg',
    'M27': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Dumbbell_Nebula.jpg/600px-Dumbbell_Nebula.jpg',
    'M31': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg/600px-Andromeda_Galaxy_%28with_h-alpha%29.jpg',
    'M42': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg/600px-Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg',
    'M51': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/M51_whirlpool_galaxy_black_hole.jpg/600px-M51_whirlpool_galaxy_black_hole.jpg',
    'M101': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/M101_hires_STScI-PRC2006-10a.jpg/600px-M101_hires_STScI-PRC2006-10a.jpg',
    'M81': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Messier_81_HST.jpg/600px-Messier_81_HST.jpg',
    'M82': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/M82_HST_ACS_2006-14-a-large_web.jpg/600px-M82_HST_ACS_2006-14-a-large_web.jpg',
    'M45': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pleiades_large.jpg/600px-Pleiades_large.jpg',
    'M44': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Praesaepe_%28Beehive_Cluster%29.jpg/600px-Praesaepe_%28Beehive_Cluster%29.jpg',
    'M35': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/M35_Gemini.jpg/600px-M35_Gemini.jpg',
    'M36': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Messier36.jpg/600px-Messier36.jpg',
    'M37': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Messier37.jpg/600px-Messier37.jpg',
    'NGC7000': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/North_America_Nebula_GALEX_WikiSky.jpg/600px-North_America_Nebula_GALEX_WikiSky.jpg'
};

async function getImage(targetText) {
    for (const [key, url] of Object.entries(imageDatabase)) {
        if (targetText.toUpperCase().includes(key)) {
            return url;
        }
    }

    const firstLine = targetText.split('\n')[0].trim();

    try {
        const nasaResponse = await fetch(
            `https://images-api.nasa.gov/search?q=${encodeURIComponent(firstLine)}&media_type=image`
        );
        const nasaData = await nasaResponse.json();

        if (nasaData.collection.items.length > 0) {
            return nasaData.collection.items[0].links[0].href;
        }
    } catch (error) {
        console.log('NASA API fallback failed:', error);
    }

    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crab_Nebula.jpg/600px-Crab_Nebula.jpg';
}

async function planMyNight() {
    const location = document.getElementById('location').value;
    const equipment = document.getElementById('equipment').value;
    const date = document.getElementById('date').value;

    if (!location || !date) {
        document.getElementById('results-section').innerHTML =
            '<p style="color: #ff6b6b;">Please enter your location and date.</p>';
        return;
    }

    document.getElementById('results-section').innerHTML =
        '<p style="color: #8888aa;">Scanning the skies...</p>';

    try {
        const response = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, equipment, date })
        });

        const data = await response.json();
        const result = data.result;

        const targets = result.split(/TARGET \d+:/).filter(t => t.trim());

        const conditionsMatch = result.match(/Best conditions note:(.*)/i);
        const conditionsNote = conditionsMatch ? conditionsMatch[1].trim() : '';

        const imagePromises = targets.map(target => getImage(target));
        const images = await Promise.all(imagePromises);

        let cardsHTML = '<h2 style="color: #7eb8f7; margin-bottom: 24px; letter-spacing: 2px;">TONIGHT\'S PLAN</h2>';
        cardsHTML += '<div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px;">';

        targets.forEach((target, index) => {
            const imageUrl = images[index];
            cardsHTML += `
                <div style="
                    background-color: #0d0d2b;
                    border: 1px solid #2a2a5a;
                    border-radius: 12px;
                    padding: 20px;
                    flex: 1;
                    min-width: 260px;
                    max-width: 340px;
                    line-height: 1.8;
                ">
                    <img src="${imageUrl}" alt="Target image" style="
                        width: 100%;
                        height: 160px;
                        object-fit: cover;
                        border-radius: 8px;
                        margin-bottom: 14px;
                    "/>
                    <p style="color: #7eb8f7; font-weight: bold; margin-bottom: 8px;">TARGET ${index + 1}</p>
                    <p style="white-space: pre-wrap; color: #e0e0e0; font-size: 0.9rem;">${target.trim()}</p>
                </div>
            `;
        });

        cardsHTML += '</div>';

        if (conditionsNote) {
            cardsHTML += `
                <div style="
                    background-color: #0d0d2b;
                    border: 1px solid #2a2a5a;
                    border-radius: 8px;
                    padding: 14px 20px;
                    color: #8888aa;
                    font-size: 0.9rem;
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