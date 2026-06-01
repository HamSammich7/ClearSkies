export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { location, equipment, date } = req.body;

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
For each target provide exactly this structure:
TARGET 1: [Name and Messier/NGC designation]
Type: [nebula / galaxy / cluster]
Visibility window: [time range in local time]
Difficulty: [Easy / Medium / Hard]
Through your scope: [one sentence, specific and visual]
Camera settings: ISO [value] | Shutter [value] | Shoot RAW | Aim for [number] frames
TARGET 2: [same structure]
TARGET 3: [same structure]
End with one line: Best conditions note: [one sentence about tonight specifically - darkness window, moon interference, or transparency]`;

    try {
        const response = await fetch(
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

        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        res.status(200).json({ result });

    } catch (error) {
        res.status(500).json({ error: 'Something went wrong' });
    }
}
