export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { location, equipment, date, difficulty } = req.body;

    const offTheMapTargets = [
        'NGC 6992 (Eastern Veil Nebula)',
        'NGC 6888 (Crescent Nebula)',
        'IC 1805 (Heart Nebula)',
        'IC 1848 (Soul Nebula)',
        'NGC 7380 (Wizard Nebula)',
        'NGC 2244 (Rosette Nebula)',
        'NGC 7293 (Helix Nebula)',
        'NGC 2359 (Thor\'s Helmet)',
        'NGC 6543 (Cat\'s Eye Nebula)',
        'NGC 7662 (Blue Snowball Nebula)',
        'NGC 1499 (California Nebula)',
        'NGC 6826 (Blinking Planetary)',
        'IC 5146 (Cocoon Nebula)',
        'NGC 7331 (Deer Lick Galaxy)',
        'NGC 891 (Silver Sliver Galaxy)',
        'NGC 4565 (Needle Galaxy)',
        'NGC 3628 (Hamburger Galaxy)',
        'NGC 2403',
        'NGC 4631 (Whale Galaxy)',
        'NGC 4656 (Hockey Stick Galaxy)',
        'NGC 6503',
        'NGC 2683',
        'NGC 7814',
        'NGC 7479',
        'NGC 7789 (Caroline\'s Rose)',
        'NGC 869 and NGC 884 (Double Cluster)',
        'NGC 752',
        'NGC 457 (Owl Cluster)',
        'NGC 6939',
        'NGC 6946 (Fireworks Galaxy)'
    ];

    let selectedTargets = null;

    if (difficulty === 'off_the_map') {
        const selectionPrompt = `You are an astronomy visibility calculator.

Location: ${location}
Date: ${date}

Here is a list of deep sky objects:
${offTheMapTargets.join('\n')}

Return exactly 3 objects from this list that will be best positioned for observation from the given location on the given date based on the season and latitude. Return ONLY the 3 object names, one per line, nothing else.`;

        try {
            const selectionResponse = await fetch(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: selectionPrompt }],
                        max_tokens: 100
                    })
                }
            );

            const selectionData = await selectionResponse.json();
            selectedTargets = selectionData.choices[0].message.content.trim();
            console.log('Stage 1 selected targets:', selectedTargets);

        } catch (error) {
            console.error('Stage 1 selection failed:', error);
        }
    }

    const prompt = `You are a precise astrophotography planning tool. Your target selection is determined entirely by the audience tier specified below — read that section first before selecting any targets.

Location: ${location}
Equipment: ${equipment} telescope with a beginner DSLR camera shooting in RAW
Date: ${date}

AUDIENCE TIER — READ THIS FIRST:
${difficulty === 'showpiece' ?
`SHOWPIECE MODE: Suggest the 3 most iconic, visually stunning Messier objects visible tonight. M42, M13, M57, M31, M45, M51 type targets. Bright, famous, can't-miss objects that make a first-time viewer say wow.`
: difficulty === 'deep_sky' ?
`DEEP SKY MODE: Suggest 3 lesser-known Messier objects or brighter NGC targets most casual observers haven't imaged. Avoid M13, M42, M57, M31, M45, M51, M27, M81, M82. Reward patience and darker skies.`
:
`OFF THE MAP MODE: You MUST describe exactly these 3 targets and no others:
${selectedTargets}

Do not substitute or add any other objects. Format each one exactly as specified below.`}

AFTER selecting targets based on the tier above, apply these rules:
- Only suggest targets realistically visible from the given location on the given date
- Never include the Moon or planets, only deep-sky objects
- Be concise and direct, no conversational filler or AI-sounding commentary
- No markdown symbols in your response, plain text only
- Give each target a specific peak visibility window based on when it's highest
- Vary frame count based on target brightness and size
- Vary shutter speed: brighter targets like clusters use 30-60s, faint nebulae and galaxies use 90-120s
- All 3 targets must be different object types where possible

For each target provide exactly:
TARGET 1: [Name and designation]
Type: [nebula / galaxy / cluster]
Visibility window: [time range in local time]
Difficulty: [Easy / Medium / Hard]
Through your scope: [one sentence, specific and vivid, no instructional language]
Camera settings: ISO [value] | Shutter [value] | Shoot RAW | Aim for [number] frames

TARGET 2: [same structure]
TARGET 3: [same structure]

Best conditions note: [one sentence about tonight]`;

    try {
        const makeRequest = async () => {
            return await fetch(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 1000
                    })
                }
            );
        };

        let response = await makeRequest();

        if (response.status === 503) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            response = await makeRequest();
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0]) {
            console.error('Unexpected Groq response:', JSON.stringify(data));
            return res.status(500).json({ error: 'Invalid response from Groq', raw: data });
        }
        const result = data.choices[0].message.content;
        res.status(200).json({ result });

    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
}