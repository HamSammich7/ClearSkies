async function getImage(targetText) {
    const firstLine = targetText.split('\n')[0].trim();
    
    const searchTerms = [
        firstLine.match(/M\d+/)?.[0],
        firstLine.match(/NGC\s?\d+/)?.[0],
        firstLine
    ].filter(Boolean);

    for (const term of searchTerms) {
        try {
            const nasaResponse = await fetch(
                `https://images-api.nasa.gov/search?q=${encodeURIComponent(term)}&media_type=image`
            );
            const nasaData = await nasaResponse.json();

            if (nasaData.collection.items.length > 0) {
                const items = nasaData.collection.items;
                for (const item of items) {
                    if (item.links && item.links[0] && item.links[0].href) {
                        return item.links[0].href;
                    }
                }
            }
        } catch (error) {
            console.log('NASA search failed for term:', term);
        }
    }

    return 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~thumb.jpg';
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