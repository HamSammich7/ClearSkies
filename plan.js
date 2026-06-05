export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { location, equipment, date, difficulty } = req.body;

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
`OFF THE MAP MODE: You must select exactly 3 objects from this list that are visible tonight — NGC 6992, NGC 7331, NGC 891, NGC 4565, IC 1805, IC 1848, NGC 2403, NGC 7789, NGC 6946, NGC 6888, NGC 3628, NGC 7380. No other objects. Check visibility for each and pick the 3 highest in the sky tonight.`}

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
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': process.env.GEMINI_API_KEY
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
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
        if (!data.candidates || !data.candidates[0]) {
            console.error('Unexpected Gemini response:', JSON.stringify(data));
            return res.status(500).json({ error: 'Invalid response from Gemini', raw: data });
        }
        const result = data.candidates[0].content.parts[0].text;
        res.status(200).json({ result });

    } catch (error) {
        console.error('Error details:', error);
        res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
}