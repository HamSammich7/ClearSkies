export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { location, equipment, date, difficulty } = req.body;

    const prompt = `You are a precise astrophotography planning tool. Generate a session plan with exactly 3 deep-sky targets. Never suggest the Moon or Sun as targets.
Location: ${location}
Equipment: ${equipment} telescope with a beginner DSLR camera shooting in RAW
Date: ${date}
Rules:
- Only suggest targets realistically visible from the given location on the given date
- Prioritize targets well-suited to the season and latitude
- Never include the Moon or planets as targets, only deep-sky objects
- Be concise and direct, no conversational filler or AI-sounding commentary
- Do not use markdown symbols like ** or * in your response, use plain text formatting only
- Give each target a specific peak visibility window based on when it's highest, not the same generic window for all targets
- Vary the recommended frame count based on target brightness and size, not a fixed number for all targets
- Vary the shutter speed based on target brightness: brighter targets like clusters use 30-60s, faint nebulae and galaxies use 90-120s
- Audience tier: ${difficulty}.
  If showpiece: suggest the most iconic, visually stunning Messier objects that are well-placed tonight. These should be objects that make a first-time viewer say "wow" — M42, M13, M57, M31, M45, M51 type targets. Bright, famous, can't-miss.
  If deep_sky: suggest lesser-known Messier objects and brighter NGC targets that most casual observers haven't imaged. Avoid the 15 most common showpiece objects. These should reward a bit more patience and darker skies.
  If off_the_map: suggest unusual targets from this list of underappreciated objects — NGC 6992 (Eastern Veil Nebula), NGC 7331, NGC 891, NGC 4565, IC 1805 (Heart Nebula), IC 1848 (Soul Nebula), NGC 2403, NGC 7789 (Caroline's Rose), NGC 6946 (Fireworks Galaxy), NGC 5128 (Centaurus A), Sh2-132, NGC 7380 (Wizard Nebula), NGC 6888 (Crescent Nebula), NGC 3628 (Hamburger Galaxy). Pick 3 from this list that are actually visible from the given location and date. If none are visible pick the least common targets possible.
- CRITICAL: All 3 targets must be different object types — do not suggest two galaxies, two clusters, or two nebulae. Pick one from each category where possible.
For each target provide exactly this structure:
TARGET 1: [Name and Messier/NGC designation]
Type: [nebula / galaxy / cluster]
Visibility window: [time range in local time]
Difficulty: [Easy / Medium / Hard]
Through your scope: [one sentence describing exactly what it will visually look like, specific and vivid — no instructional language like "look for" or "identify"]
Camera settings: ISO [value] | Shutter [value] | Shoot RAW | Aim for [number] frames
TARGET 2: [same structure]
TARGET 3: [same structure]
End with one line: Best conditions note: [one sentence about tonight specifically - darkness window, moon interference, or transparency]`;

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